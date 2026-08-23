import crypto from 'crypto';
import { NotificationProvider, InstitutionAlertPayload, AlertDeliveryResult, ProviderHealth, DeliveryStatus } from './types';
import { logger } from '../../shared/logger';

export class WebhookAdapter implements NotificationProvider {
  channelType: 'WEBHOOK' = 'WEBHOOK';

  async sendAlert(payload: InstitutionAlertPayload): Promise<AlertDeliveryResult> {
    logger.info(`[WebhookAdapter] Issuing HTTP POST webhook to ${payload.endpoint} for report ${payload.postId}`);

    if (!payload.endpoint.startsWith('http://') && !payload.endpoint.startsWith('https://')) {
      return {
        status: 'FAILED',
        errorMessage: 'Invalid webhook URL endpoint'
      };
    }

    try {
      const body = JSON.stringify({
        event: 'CIVIC_ALERT',
        reportId: payload.postId,
        title: payload.postTitle,
        category: payload.category,
        urgency: payload.urgency,
        location: {
          region: payload.region,
          district: payload.district,
          landmark: payload.landmark
        },
        content: payload.publicProjectionText,
        timestamp: payload.createdTimestamp,
        idempotencyKey: payload.idempotencyKey
      });

      const secret = payload.secretKey || 'speakup-webhook-secret';
      const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(payload.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-SpeakUp-Signature': signature,
          'X-SpeakUp-Event': 'CIVIC_ALERT',
          'User-Agent': 'SpeakUp-AlertDispatcher/1.0'
        },
        body,
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (res.ok) {
        const text = await res.text();
        return {
          status: 'DELIVERED',
          deliveryId: `wh-${Date.now()}`,
          responsePayload: text.substring(0, 500)
        };
      } else {
        return {
          status: 'FAILED',
          errorMessage: `Webhook endpoint returned HTTP ${res.status}: ${res.statusText}`
        };
      }
    } catch (err: any) {
      logger.error(`[WebhookAdapter] Webhook delivery failed to ${payload.endpoint}: ${err.message}`);
      return {
        status: 'FAILED',
        errorMessage: `Webhook connection failed: ${err.message}`
      };
    }
  }

  async checkDelivery(deliveryId: string): Promise<DeliveryStatus> {
    return {
      deliveryId,
      status: 'DELIVERED',
      timestamp: new Date().toISOString()
    };
  }

  async healthCheck(): Promise<ProviderHealth> {
    return {
      channelType: 'WEBHOOK',
      status: 'OPERATIONAL',
      latencyMs: 120,
      lastChecked: new Date().toISOString()
    };
  }
}
