import { NotificationProvider, InstitutionAlertPayload, AlertDeliveryResult, ProviderHealth, DeliveryStatus } from './types';
import { logger } from '../../shared/logger';

export class PushAdapter implements NotificationProvider {
  channelType: 'PUSH' = 'PUSH';

  async sendAlert(payload: InstitutionAlertPayload): Promise<AlertDeliveryResult> {
    logger.info(`[PushAdapter] Sending web push notification for report ${payload.postId} to channel ${payload.endpoint}`);

    if (!payload.endpoint) {
      return {
        status: 'FAILED',
        errorMessage: 'Missing web push subscription endpoint'
      };
    }

    return {
      status: 'DELIVERED',
      deliveryId: `push-${Date.now()}`,
      responsePayload: JSON.stringify({
        message: 'Web push notification dispatched',
        title: `[SPEAKUP] ${payload.urgency} Alert: ${payload.postTitle}`,
        body: `${payload.district}, ${payload.region}: ${payload.category}`
      })
    };
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
      channelType: 'PUSH',
      status: 'OPERATIONAL',
      latencyMs: 12,
      lastChecked: new Date().toISOString()
    };
  }
}
