export interface InstitutionAlertPayload {
  alertId: string;
  postId: string;
  postTitle: string;
  category: string;
  urgency: string;
  severity: string;
  region: string;
  district: string;
  landmark?: string;
  publicProjectionText: string;
  createdTimestamp: string;
  institutionId: string;
  institutionName: string;
  channelType: 'EMAIL' | 'WEBHOOK' | 'SMS' | 'WHATSAPP';
  endpoint: string;
  secretKey?: string;
  idempotencyKey: string;
}

export interface AlertDeliveryResult {
  status: 'SENT' | 'DELIVERED' | 'FAILED' | 'NOT_CONFIGURED';
  deliveryId?: string;
  responsePayload?: string;
  errorMessage?: string;
}

export interface InstitutionNotificationAdapter {
  sendAlert(payload: InstitutionAlertPayload): Promise<AlertDeliveryResult>;
}
