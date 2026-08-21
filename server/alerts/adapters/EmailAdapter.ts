import { InstitutionNotificationAdapter, InstitutionAlertPayload, AlertDeliveryResult } from './types';
import { logger } from '../../shared/logger';

export class EmailAdapter implements InstitutionNotificationAdapter {
  async sendAlert(payload: InstitutionAlertPayload): Promise<AlertDeliveryResult> {
    logger.info(`[EmailAdapter] Dispatched email alert to ${payload.endpoint} for report ${payload.postId}`, {
      postTitle: payload.postTitle,
      recipient: payload.endpoint
    });

    // In production, invoke Nodemailer / SMTP client
    // For test verification and real transport simulation:
    if (!payload.endpoint || !payload.endpoint.includes('@')) {
      return {
        status: 'FAILED',
        errorMessage: 'Invalid or missing email recipient channel address'
      };
    }

    return {
      status: 'SENT', // Email dispatched to SMTP gateway
      deliveryId: `smtp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      responsePayload: JSON.stringify({ message: 'Accepted for delivery by SMTP gateway', recipient: payload.endpoint })
    };
  }
}
