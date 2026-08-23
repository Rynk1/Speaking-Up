import { db } from '../database/db';
import { logger } from '../shared/logger';
import { eventBus } from '../events/eventBus';
import { InstitutionRoutingService } from '../services/InstitutionRoutingService';
import { ChannelHealthMonitor } from './ChannelHealthMonitor';
import { EmailAdapter } from './adapters/EmailAdapter';
import { SmsAdapter } from './adapters/SmsAdapter';
import { WhatsAppAdapter } from './adapters/WhatsAppAdapter';
import { WebhookAdapter } from './adapters/WebhookAdapter';
import { PushAdapter } from './adapters/PushAdapter';
import { InstitutionAlertPayload, AlertDeliveryResult, NotificationProvider } from './adapters/types';

export class AlertOrchestrator {
  private static providers: Record<string, NotificationProvider> = {
    EMAIL: new EmailAdapter(),
    SMS: new SmsAdapter(),
    WHATSAPP: new WhatsAppAdapter(),
    WEBHOOK: new WebhookAdapter(),
    PUSH: new PushAdapter()
  };

  /**
   * Main entry point to orchestrate alert dispatch for a post or civic issue cluster
   */
  public static async orchestrateAlert(postId: string, institutionId: string): Promise<AlertDeliveryResult> {
    const now = new Date().toISOString();
    const idempotencyKey = `alert-${postId}-${institutionId}`;

    // 1. Idempotency Check
    const existingAttempt = db.prepare('SELECT * FROM alert_attempts WHERE idempotency_key = ?').get(idempotencyKey) as any;
    if (existingAttempt && (existingAttempt.status === 'DELIVERED' || existingAttempt.status === 'SENT')) {
      logger.info(`[AlertOrchestrator] Alert already delivered for ${idempotencyKey}`);
      return {
        status: existingAttempt.status as any,
        deliveryId: existingAttempt.id,
        responsePayload: existingAttempt.response_payload
      };
    }

    // 2. Fetch Post & Institution Records
    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(postId) as any;
    if (!post) throw new Error(`Report ${postId} not found`);

    const inst = db.prepare('SELECT * FROM institutions WHERE id = ?').get(institutionId) as any;
    if (!inst) throw new Error(`Institution ${institutionId} not found`);

    // 3. Determine Priority Tier
    let priorityTier = 'TIER_1_IMMEDIATE';
    if (post.urgency === 'CRITICAL' || post.severity === 'EMERGENCY') {
      priorityTier = 'TIER_3_CRITICAL';
    } else if (post.urgency === 'HIGH') {
      priorityTier = 'TIER_2_HIGH';
    }

    // 4. Resolve Channel with Fallback
    const channel = ChannelHealthMonitor.resolveOperationalChannel(institutionId);
    let channelType: 'EMAIL' | 'WEBHOOK' | 'SMS' | 'WHATSAPP' | 'PUSH' = 'EMAIL';
    let endpoint = '';

    if (channel) {
      channelType = channel.channel_type;
      endpoint = channel.endpoint;
    } else {
      // Fallback based on institution record defaults
      if (inst.alert_method === 'DIRECT_API') {
        channelType = 'WEBHOOK';
        endpoint = inst.official_website ? `${inst.official_website.replace(/\/$/, '')}/api/speakup-webhook` : 'https://api.gov.gh/alerts';
      } else if (inst.alert_method === 'WHATSAPP_LINE') {
        channelType = 'WHATSAPP';
        const waList = JSON.parse(inst.whatsapp_channels_json || '[]');
        endpoint = waList[0] || '+233241234567';
      } else if (inst.alert_method === 'OFFICIAL_EMAIL') {
        channelType = 'EMAIL';
        const emailList = JSON.parse(inst.email_channels_json || '[]');
        endpoint = emailList[0] || `alerts@${inst.short_name.toLowerCase().replace(/\s+/g, '')}.gov.gh`;
      } else if (inst.alert_method === 'NONE') {
        const notConfiguredMsg = 'No direct communication channel configured; public tag active';
        db.prepare(`
          INSERT INTO post_institution_tags (id, post_id, institution_id, institution_name, short_name, acronym, alert_requested, alert_status, alert_method_used, delivery_timestamp, created_at)
          VALUES (?, ?, ?, ?, ?, ?, 1, 'NOT_CONFIGURED', ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET alert_status = 'NOT_CONFIGURED', alert_method_used = excluded.alert_method_used
        `).run(`tag-${Date.now()}`, postId, inst.id, inst.official_name, inst.short_name, inst.acronym, notConfiguredMsg, now, now);

        db.prepare("UPDATE posts SET accountability_status = 'ROUTED' WHERE id = ?").run(postId);

        return { status: 'NOT_CONFIGURED', errorMessage: notConfiguredMsg };
      }
    }

    // Get public projection text
    const projectionRow = db.prepare('SELECT text FROM submission_public_projections WHERE submission_id = ?').get(postId) as any;
    const publicText = projectionRow ? projectionRow.text : post.content;

    // 5. Build Core Alert Record in DB
    const alertId = `alt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    db.prepare(`
      INSERT INTO alerts (id, post_id, cluster_id, institution_id, priority_tier, urgency, awareness_status, transport_status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'UNOPENED', 'SENDING', ?, ?)
    `).run(alertId, postId, post.issue_cluster_id || null, inst.id, priorityTier, post.urgency || 'NORMAL', now, now);

    const payload: InstitutionAlertPayload = {
      alertId,
      postId,
      postTitle: post.title,
      category: post.category,
      urgency: post.urgency,
      severity: post.severity,
      region: post.region,
      district: post.district,
      landmark: post.landmark || undefined,
      publicProjectionText: publicText,
      createdTimestamp: now,
      institutionId: inst.id,
      institutionName: inst.official_name,
      channelType,
      endpoint,
      secretKey: channel?.secret_key || undefined,
      idempotencyKey,
      amplificationCount: post.reposts_count || 0,
      confirmationCount: post.confirmations_count || 1,
      reportUrl: `https://speakup.gh/a/${postId.replace(/^post-/, 'GH-').toUpperCase()}`
    };

    // 6. Execute Dispatch with Provider
    const attemptId = `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    db.prepare(`
      INSERT INTO alert_attempts (id, idempotency_key, post_id, institution_id, channel_id, channel_type, recipient, status, attempt_number, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'ATTEMPTING', 1, ?, ?)
      ON CONFLICT(idempotency_key) DO UPDATE SET status = 'ATTEMPTING', updated_at = excluded.updated_at
    `).run(attemptId, idempotencyKey, postId, inst.id, channel?.id || null, channelType, endpoint, now, now);

    const provider = this.providers[channelType] || this.providers.EMAIL;
    const result = await provider.sendAlert(payload);

    // 7. Record Delivery Result
    db.prepare(`
      UPDATE alert_attempts
      SET status = ?, response_payload = ?, error_message = ?, provider_message_id = ?, updated_at = ?
      WHERE idempotency_key = ?
    `).run(result.status, result.responsePayload || null, result.errorMessage || null, result.providerMessageId || null, new Date().toISOString(), idempotencyKey);

    db.prepare(`
      UPDATE alerts SET transport_status = ?, updated_at = ? WHERE id = ?
    `).run(result.status, new Date().toISOString(), alertId);

    const alertMethodUsed = `${channelType} dispatch to ${endpoint}`;
    db.prepare(`
      INSERT INTO post_institution_tags (id, post_id, institution_id, institution_name, short_name, acronym, alert_requested, alert_status, alert_method_used, delivery_timestamp, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET alert_status = excluded.alert_status, alert_method_used = excluded.alert_method_used, delivery_timestamp = excluded.delivery_timestamp
    `).run(`tag-${Date.now()}`, postId, inst.id, inst.official_name, inst.short_name, inst.acronym, result.status, alertMethodUsed, now, now);

    db.prepare('UPDATE institutions SET active_mentions_count = active_mentions_count + 1 WHERE id = ?').run(inst.id);

    const accountabilityStatus = result.status === 'DELIVERED' ? 'ALERT_DELIVERED' : result.status === 'SENT' ? 'ALERT_SENT' : 'ROUTED';
    db.prepare('UPDATE posts SET accountability_status = ? WHERE id = ?').run(accountabilityStatus, postId);

    eventBus.emitReportEvent({
      reportId: postId,
      eventType: result.status === 'DELIVERED' ? 'ALERT_DELIVERED' : result.status === 'SENT' ? 'ALERT_SENT' : 'ALERT_FAILED',
      actorType: 'SYSTEM',
      institutionId: inst.id,
      metadata: { alertId, status: result.status, method: alertMethodUsed, recipient: endpoint }
    });

    return result;
  }

  /**
   * Handles inbound two-way interactive channel commands (e.g. WhatsApp ACK or button clicks)
   */
  public static handleInboundCommand(postId: string, institutionId: string, command: 'ACK' | 'ASSIGN' | 'RESPOND', officerName: string = 'Duty Officer'): any {
    const now = new Date().toISOString();

    if (command === 'ACK') {
      // Record immutable acknowledgement in database
      db.prepare(`
        UPDATE alerts
        SET awareness_status = 'ACKNOWLEDGED', acknowledged_at = ?
        WHERE post_id = ? AND institution_id = ?
      `).run(now, postId, institutionId);

      db.prepare("UPDATE posts SET accountability_status = 'ACKNOWLEDGED' WHERE id = ?").run(postId);

      eventBus.emitReportEvent({
        reportId: postId,
        eventType: 'INSTITUTION_ACKNOWLEDGED',
        actorType: 'INSTITUTION',
        institutionId,
        metadata: { officerName, channel: 'TWO_WAY_INTERACTIVE' }
      });

      return { success: true, status: 'ACKNOWLEDGED', time: now };
    }

    return { success: true, status: command };
  }
}
