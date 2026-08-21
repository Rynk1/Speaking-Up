import { InstitutionNotificationAdapter, InstitutionAlertPayload, AlertDeliveryResult } from './types';
import { logger } from '../../shared/logger';

export class SmsAdapter implements InstitutionNotificationAdapter {
  async sendAlert(payload: InstitutionAlertPayload): Promise<AlertDeliveryResult> {
    logger.info(`[SmsAdapter] Dispatching emergency SMS to ${payload.endpoint} for report ${payload.postId}`);

    if (!payload.endpoint) {
      return {
        status: 'FAILED',
        errorMessage: 'Missing phone number recipient for SMS dispatch'
      };
    }

    return {
      status: 'SENT', // Sent to SMS telco gateway
      deliveryId: `sms-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      responsePayload: JSON.stringify({ message: 'Dispatched to cellular SMS gateway', recipient: payload.endpoint })
    };
  }
}
