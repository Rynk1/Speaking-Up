import { db } from '../database/db';
import { logger } from '../shared/logger';
import { eventBus } from '../events/eventBus';
import { EmailAdapter } from './adapters/EmailAdapter';
import { WebhookAdapter } from './adapters/WebhookAdapter';
import { SmsAdapter } from './adapters/SmsAdapter';
import { InstitutionNotificationAdapter, AlertDeliveryResult } from './adapters/types';

export class InstitutionAlertService {
  private static emailAdapter = new EmailAdapter();
  private static webhookAdapter = new WebhookAdapter();
  private static smsAdapter = new SmsAdapter();

  /**
   * Dispatches an alert to a tagged institution using data-driven channel resolution & idempotency constraints
   */
  public static async dispatchAlert(postId: string, institutionId: string): Promise<AlertDeliveryResult> {
    const now = new Date().toISOString();
    const idempotencyKey = `alert-${postId}-${institutionId}`;

    // Check if idempotency key already exists in alert_attempts
    const existingAttempt = db.prepare('SELECT * FROM alert_attempts WHERE idempotency_key = ?').get(idempotencyKey) as any;
    if (existingAttempt && existingAttempt.status === 'DELIVERED') {
      logger.info(`Alert already delivered for idempotency key ${idempotencyKey}`);
      return {
        status: 'DELIVERED',
        deliveryId: existingAttempt.id,
        responsePayload: existingAttempt.response_payload
      };
    }

    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(postId) as any;
    if (!post) {
      throw new Error(`Report ${postId} not found`);
    }

    const inst = db.prepare('SELECT * FROM institutions WHERE id = ?').get(institutionId) as any;
    if (!inst) {
      throw new Error(`Institution ${institutionId} not found`);
    }

    // Resolve channel from `institution_channels` or fallback to `institutions` table default
    let channel = db.prepare(`
      SELECT * FROM institution_channels
      WHERE institution_id = ? AND enabled = 1
      ORDER BY priority ASC LIMIT 1
    `).get(institutionId) as any;

    let channelType: 'EMAIL' | 'WEBHOOK' | 'SMS' | 'WHATSAPP' = 'EMAIL';
    let endpoint = '';

    if (channel) {
      channelType = channel.channel_type;
      endpoint = channel.endpoint;
    } else {
      // Fallback to default configured on institution record
      if (inst.alert_method === 'DIRECT_API') {
        channelType = 'WEBHOOK';
        endpoint = inst.official_website ? `${inst.official_website.replace(/\/$/, '')}/api/speakup-webhook` : 'https://api.gov.gh/police/alerts';
      } else if (inst.alert_method === 'OFFICIAL_EMAIL') {
        channelType = 'EMAIL';
        const emailList = JSON.parse(inst.email_channels_json || '[]');
        endpoint = emailList[0] || `alerts@${inst.short_name.toLowerCase().replace(/\s+/g, '')}.gov.gh`;
      } else if (inst.alert_method === 'NONE') {
        // Explicit NOT_CONFIGURED status
        const notConfiguredMsg = 'No direct communication channel configured; public tag active';

        db.prepare(`
          INSERT INTO post_institution_tags (id, post_id, institution_id, institution_name, short_name, acronym, alert_requested, alert_status, alert_method_used, delivery_timestamp, created_at)
          VALUES (?, ?, ?, ?, ?, ?, 1, 'NOT_CONFIGURED', ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET alert_status = 'NOT_CONFIGURED', alert_method_used = excluded.alert_method_used
        `).run(`tag-${Date.now()}`, postId, inst.id, inst.official_name, inst.short_name, inst.acronym, notConfiguredMsg, now, now);

        db.prepare("UPDATE posts SET accountability_status = 'ROUTED' WHERE id = ?").run(postId);

        eventBus.emitReportEvent({
          reportId: postId,
          eventType: 'ALERT_FAILED',
          actorType: 'SYSTEM',
          institutionId: inst.id,
          metadata: { status: 'NOT_CONFIGURED', reason: notConfiguredMsg }
        });

        return {
          status: 'NOT_CONFIGURED',
          errorMessage: notConfiguredMsg
        };
      }
    }

    // Select adapter based on resolved channelType
    let adapter: InstitutionNotificationAdapter = this.emailAdapter;
    if (channelType === 'WEBHOOK') adapter = this.webhookAdapter;
    else if (channelType === 'SMS') adapter = this.smsAdapter;

    // Get public projection text
    const projectionRow = db.prepare('SELECT text FROM submission_public_projections WHERE submission_id = ?').get(postId) as any;
    const publicText = projectionRow ? projectionRow.text : post.content;

    const payload = {
      alertId: `alt-${Date.now()}`,
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
      idempotencyKey
    };

    // Log attempt start
    const attemptId = `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    db.prepare(`
      INSERT INTO alert_attempts (id, idempotency_key, post_id, institution_id, channel_id, channel_type, recipient, status, attempt_number, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'ATTEMPTING', 1, ?, ?)
      ON CONFLICT(idempotency_key) DO UPDATE SET status = 'ATTEMPTING', updated_at = excluded.updated_at
    `).run(attemptId, idempotencyKey, postId, inst.id, channel?.id || null, channelType, endpoint, now, now);

    const result = await adapter.sendAlert(payload);

    // Record final result in DB
    db.prepare(`
      UPDATE alert_attempts
      SET status = ?, response_payload = ?, error_message = ?, updated_at = ?
      WHERE idempotency_key = ?
    `).run(result.status, result.responsePayload || null, result.errorMessage || null, new Date().toISOString(), idempotencyKey);

    const tagStatus = result.status;
    const alertMethodUsed = `${channelType} dispatch to ${endpoint}`;

    db.prepare(`
      INSERT INTO post_institution_tags (id, post_id, institution_id, institution_name, short_name, acronym, alert_requested, alert_status, alert_method_used, delivery_timestamp, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET alert_status = excluded.alert_status, alert_method_used = excluded.alert_method_used, delivery_timestamp = excluded.delivery_timestamp
    `).run(`tag-${Date.now()}`, postId, inst.id, inst.official_name, inst.short_name, inst.acronym, tagStatus, alertMethodUsed, now, now);

    db.prepare('UPDATE institutions SET active_mentions_count = active_mentions_count + 1 WHERE id = ?').run(inst.id);

    const accountabilityStatus = tagStatus === 'DELIVERED' ? 'ALERT_DELIVERED' : tagStatus === 'SENT' ? 'ALERT_SENT' : 'ROUTED';
    db.prepare('UPDATE posts SET accountability_status = ? WHERE id = ?').run(accountabilityStatus, postId);

    eventBus.emitReportEvent({
      reportId: postId,
      eventType: tagStatus === 'DELIVERED' ? 'ALERT_DELIVERED' : tagStatus === 'SENT' ? 'ALERT_SENT' : 'ALERT_FAILED',
      actorType: 'SYSTEM',
      institutionId: inst.id,
      metadata: { status: tagStatus, method: alertMethodUsed, recipient: endpoint }
    });

    return result;
  }
}
