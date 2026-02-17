/**
 * Push Notification Service — Web Push API Integration
 *
 * Sends push notifications to subscribed users via VAPID-authenticated Web Push.
 * Requires VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_EMAIL env vars.
 */

import { db } from '../db';
import { pushSubscriptions } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '../lib/logger';

interface PushKeys {
  p256dh: string;
  auth: string;
}

interface SubscriptionData {
  endpoint: string;
  keys: PushKeys;
}

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
}

let webpush: any = null;
let vapidConfigured = false;

/**
 * Lazily initialize web-push with VAPID keys.
 */
async function getWebPush(): Promise<any> {
  if (vapidConfigured) return webpush;
  vapidConfigured = true;

  const publicKey = process.env['VAPID_PUBLIC_KEY'];
  const privateKey = process.env['VAPID_PRIVATE_KEY'];
  const email = process.env['VAPID_EMAIL'];

  if (!publicKey || !privateKey || !email) {
    logger.debug({ module: 'Push' }, 'Web Push disabled (VAPID keys not set)');
    return null;
  }

  try {
    webpush = await import('web-push');
    webpush.setVapidDetails(`mailto:${email}`, publicKey, privateKey);
    logger.info({ module: 'Push' }, 'Web Push initialized with VAPID keys');
    return webpush;
  } catch {
    logger.debug({ module: 'Push' }, 'web-push not installed — push notifications disabled');
    return null;
  }
}

/**
 * Subscribe a user to push notifications.
 */
export async function subscribe(userId: string, subscription: SubscriptionData): Promise<void> {
  // Upsert: deactivate old subscription for same endpoint, insert new one
  await db
    .update(pushSubscriptions)
    .set({ isActive: false })
    .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, subscription.endpoint)));

  await db.insert(pushSubscriptions).values({
    userId,
    endpoint: subscription.endpoint,
    keys: subscription.keys,
    isActive: true,
  });

  logger.info({ userId }, 'Push subscription created');
}

/**
 * Unsubscribe a user from push notifications.
 */
export async function unsubscribe(userId: string, endpoint: string): Promise<void> {
  await db
    .update(pushSubscriptions)
    .set({ isActive: false })
    .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)));

  logger.info({ userId }, 'Push subscription deactivated');
}

/**
 * Send a push notification to a specific user (all active subscriptions).
 */
export async function sendNotification(
  userId: string,
  payload: NotificationPayload,
): Promise<{ sent: number; failed: number }> {
  const wp = await getWebPush();
  if (!wp) return { sent: 0, failed: 0 };

  const subscriptions = await db
    .select()
    .from(pushSubscriptions)
    .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.isActive, true)));

  let sent = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    try {
      const keys = sub.keys as PushKeys;
      await wp.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: keys.p256dh, auth: keys.auth },
        },
        JSON.stringify({
          title: payload.title,
          body: payload.body,
          icon: payload.icon || '/icons/icon-192.svg',
          badge: payload.badge || '/icons/icon-192.svg',
          data: { url: payload.url || '/' },
          tag: payload.tag,
        }),
      );
      sent++;
    } catch (error: any) {
      failed++;
      // If subscription expired (410 Gone), deactivate it
      if (error?.statusCode === 410) {
        await db.update(pushSubscriptions).set({ isActive: false }).where(eq(pushSubscriptions.id, sub.id));
        logger.info({ subId: sub.id }, 'Expired push subscription deactivated');
      } else {
        logger.error({ err: error, subId: sub.id }, 'Failed to send push notification');
      }
    }
  }

  return { sent, failed };
}

/**
 * Get the VAPID public key for client-side subscription.
 */
export function getVapidPublicKey(): string | null {
  return process.env['VAPID_PUBLIC_KEY'] ?? null;
}
