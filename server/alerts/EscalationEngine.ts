import { db } from '../database/db';
import { logger } from '../shared/logger';
import { eventBus } from '../events/eventBus';

export interface EscalationCheckResult {
  checkedCount: number;
  escalatedCount: number;
  escalations: any[];
}

export class EscalationEngine {
  // Default SLA thresholds in minutes per priority level
  private static DEFAULT_SLA_MINUTES: Record<string, number> = {
    CRITICAL: 30,  // 30 minutes
    HIGH: 120,     // 2 hours
    NORMAL: 1440   // 24 hours
  };

  /**
   * Scans unacknowledged alerts and auto-escalates overdue items based on institutional SLA policies
   */
  public static checkAndEscalateOverdueAlerts(): EscalationCheckResult {
    const now = new Date();
    const nowIso = now.toISOString();

    // Query unacknowledged alerts that are still in UNOPENED or VIEWED state
    const pendingAlerts = db.prepare(`
      SELECT a.*, p.title as post_title, p.urgency as post_urgency, p.created_at as post_created_at, i.official_name, i.sla_policy_json, i.escalation_policy_json
      FROM alerts a
      JOIN posts p ON a.post_id = p.id
      JOIN institutions i ON a.institution_id = i.id
      WHERE a.awareness_status IN ('UNOPENED', 'VIEWED')
        AND a.id NOT IN (SELECT alert_id FROM alert_escalations WHERE status = 'PENDING')
    `).all() as any[];

    let escalatedCount = 0;
    const escalations: any[] = [];

    for (const alt of pendingAlerts) {
      const urgency = alt.urgency || alt.post_urgency || 'NORMAL';
      let slaThresholdMins = this.DEFAULT_SLA_MINUTES[urgency] || 1440;

      // Override with institution custom SLA if configured
      if (alt.sla_policy_json) {
        try {
          const customSla = JSON.parse(alt.sla_policy_json);
          if (customSla[urgency]) {
            slaThresholdMins = customSla[urgency];
          }
        } catch {
          // Fallback to default
        }
      }

      const alertCreatedAt = new Date(alt.created_at);
      const elapsedMins = Math.floor((now.getTime() - alertCreatedAt.getTime()) / (1000 * 60));

      if (elapsedMins >= slaThresholdMins) {
        // Escalate alert
        const escalationId = `esc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const targetRole = urgency === 'CRITICAL' ? 'EXECUTIVE_OBSERVER' : 'REGIONAL_OFFICER';
        const reason = `No institutional acknowledgement recorded within SLA window (${elapsedMins}m elapsed vs ${slaThresholdMins}m standard).`;

        db.prepare(`
          INSERT INTO alert_escalations (id, alert_id, post_id, institution_id, escalation_level, escalated_to_role, reason, status, created_at)
          VALUES (?, ?, ?, ?, 1, ?, ?, 'PENDING', ?)
        `).run(escalationId, alt.id, alt.post_id, alt.institution_id, targetRole, reason, nowIso);

        // Update post accountability status with defensible factual statement
        db.prepare(`
          UPDATE posts SET accountability_status = 'AWAITING_ACKNOWLEDGEMENT' WHERE id = ?
        `).run(alt.post_id);

        eventBus.emitReportEvent({
          reportId: alt.post_id,
          eventType: 'ALERT_ESCALATED',
          actorType: 'SYSTEM',
          institutionId: alt.institution_id,
          metadata: {
            alertId: alt.id,
            slaMinutes: slaThresholdMins,
            elapsedMinutes: elapsedMins,
            escalatedToRole: targetRole,
            factualStatus: 'No institutional acknowledgement recorded.'
          }
        });

        escalatedCount++;
        escalations.push({
          escalationId,
          alertId: alt.id,
          postId: alt.post_id,
          institutionName: alt.official_name,
          urgency,
          elapsedMins,
          slaThresholdMins
        });

        logger.info(`[EscalationEngine] Escalated alert ${alt.id} for report ${alt.post_id} to ${targetRole}`);
      }
    }

    return {
      checkedCount: pendingAlerts.length,
      escalatedCount,
      escalations
    };
  }

  /**
   * Returns factual, legally defensible public status timeline text for a report
   */
  public static getDefensiblePublicTimeline(postId: string): any {
    const post = db.prepare('SELECT id, accountability_status, created_at FROM posts WHERE id = ?').get(postId) as any;
    if (!post) return null;

    const alertAttempts = db.prepare('SELECT * FROM alert_attempts WHERE post_id = ? ORDER BY created_at DESC').all(postId) as any[];
    const alertRow = db.prepare('SELECT * FROM alerts WHERE post_id = ? ORDER BY created_at DESC LIMIT 1').get(postId) as any;
    const responses = db.prepare('SELECT * FROM institution_responses WHERE post_id = ? ORDER BY created_at DESC').all(postId) as any[];

    const latestAttempt = alertAttempts[0];

    return {
      reportId: postId,
      accountabilityStatus: post.accountability_status,
      latestDeliveryAttempt: latestAttempt ? {
        channelType: latestAttempt.channel_type,
        status: latestAttempt.status,
        timestamp: latestAttempt.created_at,
        recipient: latestAttempt.recipient
      } : null,
      awarenessStatus: alertRow ? alertRow.awareness_status : 'UNOPENED',
      acknowledgedAt: alertRow ? alertRow.acknowledged_at : null,
      officialResponsesCount: responses.length,
      publicStatement: alertRow?.awareness_status === 'ACKNOWLEDGED'
        ? `Acknowledged by institution at ${alertRow.acknowledged_at}`
        : latestAttempt?.status === 'DELIVERED' || latestAttempt?.status === 'SENT'
        ? `Alert delivered to registered channel at ${latestAttempt.created_at}. Awaiting institutional acknowledgement.`
        : 'Report registered and queued for routing.'
    };
  }
}
