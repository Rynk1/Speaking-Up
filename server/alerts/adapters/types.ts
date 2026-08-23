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
  channelType: 'EMAIL' | 'WEBHOOK' | 'SMS' | 'WHATSAPP' | 'PUSH';
  endpoint: string;
  secretKey?: string;
  idempotencyKey: string;
  amplificationCount?: number;
  confirmationCount?: number;
  reportUrl?: string;
}

export interface AlertDeliveryResult {
  status: 'QUEUED' | 'SENDING' | 'SENT' | 'DELIVERED' | 'ACKNOWLEDGED' | 'FAILED' | 'RETRYING' | 'NOT_CONFIGURED' | 'EXPIRED' | 'SUPPRESSED';
  deliveryId?: string;
  responsePayload?: string;
  errorMessage?: string;
  providerMessageId?: string;
}

export interface ProviderHealth {
  channelType: 'EMAIL' | 'WEBHOOK' | 'SMS' | 'WHATSAPP' | 'PUSH';
  status: 'OPERATIONAL' | 'DEGRADED' | 'DOWN';
  latencyMs: number;
  lastChecked: string;
  details?: string;
}

export interface DeliveryStatus {
  deliveryId: string;
  status: 'SENT' | 'DELIVERED' | 'READ' | 'ACKNOWLEDGED' | 'FAILED';
  timestamp: string;
}

export interface DeliveryEvent {
  eventType: 'DELIVERY_RECEIPT' | 'READ_RECEIPT' | 'INBOUND_COMMAND';
  alertId?: string;
  postId?: string;
  command?: 'ACK' | 'ASSIGN' | 'RESPOND' | 'REQUEST_INFO';
  commandPayload?: any;
  rawPayload?: any;
}

export interface NotificationProvider {
  channelType: 'EMAIL' | 'WEBHOOK' | 'SMS' | 'WHATSAPP' | 'PUSH';
  sendAlert(payload: InstitutionAlertPayload): Promise<AlertDeliveryResult>;
  checkDelivery?(deliveryId: string): Promise<DeliveryStatus>;
  handleWebhook?(payload: unknown): DeliveryEvent;
  retry?(alertId: string): Promise<AlertDeliveryResult>;
  healthCheck(): Promise<ProviderHealth>;
}

export interface InstitutionNotificationAdapter extends NotificationProvider {}
