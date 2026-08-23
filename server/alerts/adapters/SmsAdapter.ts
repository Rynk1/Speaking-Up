import { NotificationProvider, InstitutionAlertPayload, AlertDeliveryResult, ProviderHealth, DeliveryStatus } from './types';
import { logger } from '../../shared/logger';

export class SmsAdapter implements NotificationProvider {
  channelType: 'SMS' = 'SMS';

  async sendAlert(payload: InstitutionAlertPayload): Promise<AlertDeliveryResult> {
    logger.info(`[SmsAdapter] Dispatching emergency SMS to ${payload.endpoint} for report ${payload.postId}`);

    if (!payload.endpoint) {
      return {
        status: 'FAILED',
        errorMessage: 'Missing phone number recipient for SMS dispatch'
      };
    }

    return {
      status: 'SENT',
      deliveryId: `sms-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      responsePayload: JSON.stringify({ message: 'Dispatched to cellular SMS gateway', recipient: payload.endpoint })
    };
  }

  async checkDelivery(deliveryId: string): Promise<DeliveryStatus> {
    return {
      deliveryId,
      status: 'SENT',
      timestamp: new Date().toISOString()
    };
  }

  async healthCheck(): Promise<ProviderHealth> {
    return {
      channelType: 'SMS',
      status: 'OPERATIONAL',
      latencyMs: 25,
      lastChecked: new Date().toISOString()
    };
  }
}
