import { NotificationProvider, InstitutionAlertPayload, AlertDeliveryResult, ProviderHealth, DeliveryStatus, DeliveryEvent } from './types';
import { logger } from '../../shared/logger';

export class WhatsAppAdapter implements NotificationProvider {
  channelType: 'WHATSAPP' = 'WHATSAPP';

  async sendAlert(payload: InstitutionAlertPayload): Promise<AlertDeliveryResult> {
    logger.info(`[WhatsAppAdapter] Dispatching concise WhatsApp alert to ${payload.endpoint} for report ${payload.postId}`);

    if (!payload.endpoint) {
      return {
        status: 'FAILED',
        errorMessage: 'Missing recipient phone number for WhatsApp dispatch'
      };
    }

    const reportRef = payload.postId.replace(/^post-/, 'GH-').toUpperCase();
    const amplifications = payload.amplificationCount || 0;
    const confirmations = payload.confirmationCount || 1;
    const reportUrl = payload.reportUrl || `https://speakup.gh/a/${reportRef}`;

    // Format concise WhatsApp Business API template
    const whatsappText =
      `*SPEAKUP CIVIC ALERT*\n\n` +
      `*Report Ref:* ${reportRef}\n` +
      `*Location:* ${payload.landmark ? payload.landmark + ', ' : ''}${payload.district}, ${payload.region}\n` +
      `*Category:* ${payload.category}\n` +
      `*Priority:* ${payload.urgency || 'HIGH'}\n\n` +
      `📢 ${confirmations} citizen confirmations & ${amplifications} amplifications on record.\n\n` +
      `*Open Institutional Report:*\n${reportUrl}\n\n` +
      `_Reply "ACK ${reportRef}" or tap [Acknowledge] below to record immediate receipt._`;

    const providerMsgId = `wamid.${Date.now()}.${Math.random().toString(36).substring(2, 8)}`;

    return {
      status: 'DELIVERED', // Simulated delivery receipt from WhatsApp Business API endpoint
      deliveryId: `wa-${Date.now()}`,
      providerMessageId: providerMsgId,
      responsePayload: JSON.stringify({
        message: 'Dispatched via WhatsApp Business API',
        recipient: payload.endpoint,
        formattedText: whatsappText,
        wamid: providerMsgId
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

  handleWebhook(payload: any): DeliveryEvent {
    // Parse incoming WhatsApp Business webhook
    const text = (payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body || payload?.text || payload?.command || '').trim();
    const buttonPayload = payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.interactive?.button_reply?.id || payload?.buttonId;

    let command: 'ACK' | 'ASSIGN' | 'RESPOND' | 'REQUEST_INFO' | undefined = undefined;
    let alertId: string | undefined = payload?.alertId;
    let postId: string | undefined = payload?.postId;

    const matchRef = text.match(/(?:ACK|ACKNOWLEDGE)\s+(GH-[\w\-]+|post-[\w\-]+)/i) || text.match(/^(GH-[\w\-]+|post-[\w\-]+)$/i);
    if (matchRef || text.toUpperCase().startsWith('ACK') || buttonPayload === 'BTN_ACKNOWLEDGE') {
      command = 'ACK';
      if (matchRef) {
        const extracted = matchRef[1] || matchRef[0];
        postId = extracted.toLowerCase().startsWith('gh-') ? extracted.replace(/^gh-/, 'post-').toLowerCase() : extracted;
      }
    } else if (text.toUpperCase().startsWith('ASSIGN') || buttonPayload === 'BTN_ASSIGN') {
      command = 'ASSIGN';
    } else if (text.toUpperCase().startsWith('RESPOND') || buttonPayload === 'BTN_RESPOND') {
      command = 'RESPOND';
    } else if (text.toUpperCase().startsWith('INFO') || buttonPayload === 'BTN_REQUEST_INFO') {
      command = 'REQUEST_INFO';
    }

    return {
      eventType: command ? 'INBOUND_COMMAND' : 'DELIVERY_RECEIPT',
      alertId,
      postId,
      command,
      commandPayload: { text, buttonPayload },
      rawPayload: payload
    };
  }

  async retry(alertId: string): Promise<AlertDeliveryResult> {
    return {
      status: 'SENT',
      deliveryId: `wa-retry-${Date.now()}`
    };
  }

  async healthCheck(): Promise<ProviderHealth> {
    return {
      channelType: 'WHATSAPP',
      status: 'OPERATIONAL',
      latencyMs: 45,
      lastChecked: new Date().toISOString()
    };
  }
}
