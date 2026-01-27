import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from '../lib/logger';

/**
 * Middleware to validate n8n webhook signatures using HMAC-SHA256
 *
 * This prevents unauthorized access to webhook endpoints by requiring
 * a valid signature in the x-n8n-signature header.
 *
 * @throws 401 if signature is missing, invalid, or doesn't match
 */
export function validateN8nWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const signature = req.headers['x-n8n-signature'];
    const secret = process.env.N8N_WEBHOOK_SECRET;

    // Check if signature header exists
    if (!signature || typeof signature !== 'string') {
      logger.warn(
        { module: 'WebhookAuth', headers: req.headers },
        'Missing x-n8n-signature header'
      );
      return res.status(401).json({
        error: 'Missing webhook signature',
        message: 'x-n8n-signature header is required'
      });
    }

    // Check if secret is configured
    if (!secret) {
      logger.error(
        { module: 'WebhookAuth' },
        'N8N_WEBHOOK_SECRET environment variable not configured'
      );
      return res.status(500).json({
        error: 'Server configuration error',
        message: 'Webhook secret not configured'
      });
    }

    // Compute expected signature from request body
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    // Ensure buffers are same length before comparing
    if (signatureBuffer.length !== expectedBuffer.length) {
      logger.warn(
        {
          module: 'WebhookAuth',
          signatureLength: signatureBuffer.length,
          expectedLength: expectedBuffer.length
        },
        'Signature length mismatch'
      );
      return res.status(401).json({
        error: 'Invalid webhook signature',
        message: 'Signature format is incorrect'
      });
    }

    // Timing-safe comparison
    if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
      logger.warn(
        { module: 'WebhookAuth', endpoint: req.path },
        'Invalid webhook signature - signature mismatch'
      );
      return res.status(401).json({
        error: 'Invalid webhook signature',
        message: 'Signature verification failed'
      });
    }

    // Signature is valid, proceed to next middleware
    logger.info(
      { module: 'WebhookAuth', endpoint: req.path },
      'Webhook signature validated successfully'
    );
    next();
  } catch (error: any) {
    logger.error(
      {
        module: 'WebhookAuth',
        err: error,
        endpoint: req.path
      },
      'Error during webhook signature validation'
    );
    return res.status(500).json({
      error: 'Signature validation error',
      message: 'An error occurred while validating the webhook signature'
    });
  }
}
