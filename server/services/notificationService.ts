/**
 * Notification Service — Automated alerting via Slack & Discord webhooks
 *
 * Sends alerts on errors, health status changes, and operational events.
 * Includes deduplication (5-minute cooldown per alert type).
 */

import { logger } from '../lib/logger';

type Severity = 'critical' | 'error' | 'warning' | 'info';

interface AlertPayload {
  severity: Severity;
  title: string;
  message: string;
  context?: Record<string, unknown>;
}

/** Deduplication: track last alert time by key */
const alertCooldowns = new Map<string, number>();
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

function isDuplicate(key: string): boolean {
  const lastSent = alertCooldowns.get(key);
  if (lastSent && Date.now() - lastSent < COOLDOWN_MS) {
    return true;
  }
  alertCooldowns.set(key, Date.now());
  return false;
}

const SEVERITY_EMOJI: Record<Severity, string> = {
  critical: '🔴',
  error: '🟠',
  warning: '🟡',
  info: '🔵',
};

/**
 * Send a Slack webhook message.
 */
async function sendSlack(webhookUrl: string, payload: AlertPayload): Promise<boolean> {
  try {
    const emoji = SEVERITY_EMOJI[payload.severity];
    const contextLines = payload.context
      ? Object.entries(payload.context)
          .map(([k, v]) => `• *${k}:* ${String(v)}`)
          .join('\n')
      : '';

    const body = {
      text: `${emoji} *[${payload.severity.toUpperCase()}] ${payload.title}*`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${emoji} *[${payload.severity.toUpperCase()}] ${payload.title}*\n${payload.message}`,
          },
        },
        ...(contextLines
          ? [
              {
                type: 'section',
                text: { type: 'mrkdwn', text: contextLines },
              },
            ]
          : []),
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `_${new Date().toISOString()} | Product Content Studio_`,
            },
          ],
        },
      ],
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    return response.ok;
  } catch (error) {
    logger.error({ err: error }, 'Failed to send Slack alert');
    return false;
  }
}

/**
 * Send a Discord webhook message.
 */
async function sendDiscord(webhookUrl: string, payload: AlertPayload): Promise<boolean> {
  try {
    const emoji = SEVERITY_EMOJI[payload.severity];
    const colorMap: Record<Severity, number> = {
      critical: 0xff0000,
      error: 0xff8800,
      warning: 0xffcc00,
      info: 0x0088ff,
    };

    const fields = payload.context
      ? Object.entries(payload.context).map(([name, value]) => ({
          name,
          value: String(value),
          inline: true,
        }))
      : [];

    const body = {
      embeds: [
        {
          title: `${emoji} [${payload.severity.toUpperCase()}] ${payload.title}`,
          description: payload.message,
          color: colorMap[payload.severity],
          fields,
          footer: { text: 'Product Content Studio' },
          timestamp: new Date().toISOString(),
        },
      ],
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    return response.ok;
  } catch (error) {
    logger.error({ err: error }, 'Failed to send Discord alert');
    return false;
  }
}

/**
 * Send an alert notification to all configured channels.
 * Includes 5-minute deduplication per alert key.
 */
export async function notify(payload: AlertPayload): Promise<void> {
  const dedupeKey = `${payload.severity}:${payload.title}`;

  if (isDuplicate(dedupeKey)) {
    logger.debug({ dedupeKey }, 'Alert suppressed (cooldown active)');
    return;
  }

  logger.info({ severity: payload.severity, title: payload.title }, `Sending alert: ${payload.title}`);

  const promises: Promise<boolean>[] = [];

  const slackUrl = process.env['SLACK_ALERTS_WEBHOOK_URL'];
  if (slackUrl) {
    promises.push(sendSlack(slackUrl, payload));
  }

  const discordUrl = process.env['DISCORD_ALERTS_WEBHOOK_URL'];
  if (discordUrl) {
    promises.push(sendDiscord(discordUrl, payload));
  }

  if (promises.length === 0) {
    logger.debug('No alert channels configured (SLACK_ALERTS_WEBHOOK_URL / DISCORD_ALERTS_WEBHOOK_URL)');
    return;
  }

  const results = await Promise.allSettled(promises);
  const sent = results.filter((r) => r.status === 'fulfilled' && r.value).length;
  logger.info({ sent, total: results.length }, 'Alert dispatch complete');
}

/**
 * Convenience: notify on Gemini health status transitions.
 */
export async function notifyHealthTransition(
  service: string,
  previousStatus: string,
  newStatus: string,
  failureRate?: number,
): Promise<void> {
  const severity: Severity =
    newStatus === 'degraded'
      ? 'warning'
      : newStatus === 'down'
        ? 'critical'
        : newStatus === 'healthy'
          ? 'info'
          : 'warning';

  await notify({
    severity,
    title: `${service} status: ${previousStatus} → ${newStatus}`,
    message: `The ${service} service has transitioned from ${previousStatus} to ${newStatus}.`,
    context: {
      service,
      previousStatus,
      newStatus,
      ...(failureRate !== undefined ? { failureRate: `${(failureRate * 100).toFixed(1)}%` } : {}),
    },
  });
}

/**
 * Convenience: notify on unhandled errors (Sentry integration).
 */
export async function notifyError(error: Error, context?: Record<string, unknown>): Promise<void> {
  await notify({
    severity: 'error',
    title: error.name || 'Unhandled Error',
    message: error.message,
    context: {
      stack: error.stack?.split('\n')[1]?.trim() ?? 'N/A',
      ...context,
    },
  });
}
