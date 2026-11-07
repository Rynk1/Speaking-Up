import { db } from '../database/db';
import { logger } from '../shared/logger';
import { eventBus } from '../events/eventBus';
import { InstitutionRoutingService } from '../services/InstitutionRoutingService';
import { ChannelHealthMonitor } from './ChannelHealthMonitor';
import { InstitutionRegistryService } from '../modules/institutions/InstitutionRegistryService';
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
   * Main entry point to orchestrate alert dispatch for a post or civic issue cluster.
   *
   * When `deskId` is supplied the alert is addressed to that specific sub-unit:
   * its own line is preferred over the institution's, so an MMDA desk is reached
   * on the number it actually answers. The idempotency key includes the desk so a
   * desk alert and an institution alert for the same report never collide.
   */
  public static async orchestrateAlert(postId: string, institutionId: string, options: { force?: boolean; deskId?: string } = {}): Promise<AlertDeliveryResult> {
    const now = new Date().toISOString();
    const deskId = options.deskId || null;
    const idempotencyKey = `alert-${postId}-${institutionId}${deskId ? `-${deskId}` : ''}`;

    // 1. Idempotency Check — unless the caller explicitly forces a re-dispatch
    // (operator-driven retry of a FAILED delivery).
    const existingAttempt = db.prepare('SELECT * FROM alert_attempts WHERE idempotency_key = ?').get(idempotencyKey) as any;
    if (!options.force && existingAttempt && (existingAttempt.status === 'DELIVERED' || existingAttempt.status === 'SENT')) {
      logger.info(`[AlertOrchestrator] Alert already delivered for ${idempotencyKey}`);
      return {
        status: existingAttempt.status as any,
        deliveryId: existingAttempt.id,
        responsePayload: existingAttempt.response_payload
      };
    }

    // A forced retry records the attempt so operators can audit how many times a
    // delivery was pushed.
    const retryCount = options.force ? (existingAttempt?.retry_count || 0) + 1 : 0;

    // 2. Fetch Post & Institution Records
    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(postId) as any;
    if (!post) throw new Error(`Report ${postId} not found`);

    const inst = db.prepare('SELECT * FROM institutions WHERE id = ?').get(institutionId) as any;
    if (!inst) throw new Error(`Institution ${institutionId} not found`);

    const desk = deskId
      ? db.prepare('SELECT * FROM institution_desks WHERE id = ? AND institution_id = ?').get(deskId, institutionId) as any
      : null;

    // 3. Determine Priority Tier
    let priorityTier = 'TIER_1_IMMEDIATE';
    if (post.urgency === 'CRITICAL' || post.severity === 'EMERGENCY') {
      priorityTier = 'TIER_3_CRITICAL';
    } else if (post.urgency === 'HIGH') {
      priorityTier = 'TIER_2_HIGH';
    }

    // 4. Resolve Channel with Fallback. A desk resolves its own line first so the
    // MMDA sub-unit is reached directly rather than through head office.
    let channel = desk ? this.resolveDeskChannel(institutionId, desk) : null;
    if (!channel) channel = ChannelHealthMonitor.resolveOperationalChannel(institutionId);
    let channelType: 'EMAIL' | 'WEBHOOK' | 'SMS' | 'WHATSAPP' | 'PUSH' = 'EMAIL';
    let endpoint = '';

    if (channel) {
      channelType = channel.channel_type;
      endpoint = channel.endpoint;
    } else if (desk?.contact_phone) {
      // A desk with a phone but no channel row is still reachable: SMS is the
      // lowest-common-denominator field channel for MMDA officers.
      channelType = 'SMS';
      endpoint = desk.contact_phone;
    } else {
      // Fallback based on institution record defaults. Never invent an
      // endpoint: an alert must fail closed as NOT_CONFIGURED rather than
      // report a fabricated delivery address as success.
      const waList = JSON.parse(inst.whatsapp_channels_json || '[]');
      const emailList = JSON.parse(inst.email_channels_json || '[]');

      if (inst.alert_method === 'DIRECT_API' && inst.official_website) {
        channelType = 'WEBHOOK';
        endpoint = `${inst.official_website.replace(/\/$/, '')}/api/speakup-webhook`;
      } else if (inst.alert_method === 'WHATSAPP_LINE' && waList[0]) {
        channelType = 'WHATSAPP';
        endpoint = waList[0];
      } else if (inst.alert_method === 'OFFICIAL_EMAIL' && emailList[0]) {
        channelType = 'EMAIL';
        endpoint = emailList[0];
      } else {
        const notConfiguredMsg = desk
          ? `No communication channel configured for desk ${desk.name}; public tag active`
          : 'No direct communication channel configured; public tag active';
        db.prepare(`
          INSERT INTO post_institution_tags (id, post_id, institution_id, institution_name, short_name, acronym, alert_requested, alert_status, alert_method_used, delivery_timestamp, created_at)
          VALUES (?, ?, ?, ?, ?, ?, 1, 'NOT_CONFIGURED', ?, ?, ?)
          ON CONFLICT(post_id, institution_id) DO UPDATE SET alert_status = 'NOT_CONFIGURED', alert_method_used = excluded.alert_method_used
        `).run(`tag-${postId}-${inst.id}`, postId, inst.id, inst.official_name, inst.short_name, inst.acronym, notConfiguredMsg, now, now);

        db.prepare("UPDATE posts SET accountability_status = 'ROUTED' WHERE id = ?").run(postId);
        InstitutionRegistryService.reconcileReachCounters(inst.id);

        return { status: 'NOT_CONFIGURED', errorMessage: notConfiguredMsg };
      }
    }

    // Get public projection text
    const projectionRow = db.prepare('SELECT text FROM submission_public_projections WHERE submission_id = ?').get(postId) as any;
    const publicText = projectionRow ? projectionRow.text : post.content;

    // 5. Build Core Alert Record in DB
    const alertId = `alt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    db.prepare(`
      INSERT INTO alerts (id, post_id, cluster_id, institution_id, desk_id, channel_type, priority_tier, urgency, awareness_status, transport_status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'UNOPENED', 'SENDING', ?, ?)
    `).run(alertId, postId, post.issue_cluster_id || null, inst.id, desk?.id || null, channelType, priorityTier, post.urgency || 'NORMAL', now, now);

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
      INSERT INTO alert_attempts (id, idempotency_key, post_id, institution_id, channel_id, channel_type, recipient, status, attempt_number, retry_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'ATTEMPTING', ?, ?, ?, ?)
      ON CONFLICT(idempotency_key) DO UPDATE SET status = 'ATTEMPTING', retry_count = excluded.retry_count, updated_at = excluded.updated_at
    `).run(attemptId, idempotencyKey, postId, inst.id, channel?.id || null, channelType, endpoint, (existingAttempt?.attempt_number || 0) + 1, retryCount, now, now);

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
      ON CONFLICT(post_id, institution_id) DO UPDATE SET alert_status = excluded.alert_status, alert_method_used = excluded.alert_method_used, delivery_timestamp = excluded.delivery_timestamp
    `).run(`tag-${postId}-${inst.id}`, postId, inst.id, inst.official_name, inst.short_name, inst.acronym, result.status, alertMethodUsed, now, now);

    // Counters are derived from tag/response history so retries and repeated
    // dispatches never inflate reach.
    InstitutionRegistryService.reconcileReachCounters(inst.id);

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
   * Resolves the best channel for a specific desk. A desk may carry its own
   * phone (SMS/WhatsApp) or email; if it has none, the caller falls back to the
   * institution's channel. Prefers an operational row, then degraded.
   */
  private static resolveDeskChannel(institutionId: string, desk: any): any | null {
    if (!desk) return null;

    const byPhone = db.prepare(`
      SELECT * FROM institution_channels
      WHERE institution_id = ? AND enabled = 1 AND channel_type IN ('SMS', 'WHATSAPP')
        AND (endpoint = ? OR (region IS NOT NULL AND region = ?))
      ORDER BY priority ASC
    `).all(institutionId, desk.contact_phone || '', desk.region || '') as any[];
    if (byPhone.length > 0) {
      return byPhone.find((c) => c.health_status === 'OPERATIONAL') || byPhone[0];
    }

    if (desk.contact_email) {
      const byEmail = db.prepare(`
        SELECT * FROM institution_channels
        WHERE institution_id = ? AND enabled = 1 AND channel_type = 'EMAIL' AND endpoint = ?
        ORDER BY priority ASC LIMIT 1
      `).get(institutionId, desk.contact_email) as any;
      if (byEmail) return byEmail;
    }

    return null;
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
