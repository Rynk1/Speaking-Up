import { db } from '../../database/db';
import { OutboxService } from '../../infrastructure/events/OutboxService';
import { AuditService } from '../audit/AuditService';
import { logger } from '../../shared/logger';

export type AlertState =
  | 'QUEUED'
  | 'SENT'
  | 'DELIVERED'
  | 'OPENED'
  | 'ACKNOWLEDGED'
  | 'RESPONDED'
  | 'ACTION_REPORTED'
  | 'RESOLVED'
  | 'FAILED';

export interface AlertTransitionInput {
  alertId: string;
  targetState: AlertState;
  channel?: string;
  externalMessageId?: string;
  errorMessage?: string;
  actorId?: string;
  notes?: string;
}

export class AlertStateMachine {
  /**
   * Enqueues an institutional delivery alert with idempotency
   */
  public static queueAlert(postId: string, institutionId: string, channel: string = 'IN_APP', priority: string = 'ELEVATED'): string {
    const idempotencyKey = `alert-${postId}-${institutionId}-${channel}-${Date.now()}`;
    const deliveryId = `deliv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO institution_deliveries (
        id, post_id, institution_id, channel, status, idempotency_key, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'QUEUED', ?, ?, ?)
    `).run(deliveryId, postId, institutionId, channel, idempotencyKey, now, now);

    // Record alert attempt
    const attemptId = `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    db.prepare(`
      INSERT INTO alert_attempts (id, delivery_id, channel, status, idempotency_key, created_at)
      VALUES (?, ?, ?, 'QUEUED', ?, ?)
    `).run(attemptId, deliveryId, channel, idempotencyKey, now);

    OutboxService.enqueueEvent('institution.alert.queued', 'ALERT', deliveryId, {
      deliveryId,
      postId,
      institutionId,
      channel,
      priority
    });

    return deliveryId;
  }

  /**
   * Advances the delivery alert state through the state machine
   */
  public static transitionAlert(input: AlertTransitionInput): any {
    const alert = db.prepare('SELECT * FROM institution_deliveries WHERE id = ?').get(input.alertId) as any;
    if (!alert) {
      throw new Error(`Delivery alert ${input.alertId} not found`);
    }

    const beforeState = alert.status;
    const now = new Date().toISOString();

    const deliveredAt = input.targetState === 'DELIVERED' ? now : alert.delivered_at;
    const openedAt = input.targetState === 'OPENED' ? now : alert.opened_at;
    const acknowledgedAt = input.targetState === 'ACKNOWLEDGED' ? now : alert.acknowledged_at;

    db.prepare(`
      UPDATE institution_deliveries
      SET status = ?, delivered_at = COALESCE(?, delivered_at),
          opened_at = COALESCE(?, opened_at),
          acknowledged_at = COALESCE(?, acknowledged_at),
          error_message = ?, updated_at = ?
      WHERE id = ?
    `).run(input.targetState, deliveredAt, openedAt, acknowledgedAt, input.errorMessage || null, now, input.alertId);

    // Record attempt entry
    const attemptId = `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    db.prepare(`
      INSERT INTO alert_attempts (id, delivery_id, channel, status, idempotency_key, error_message, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      attemptId,
      input.alertId,
      input.channel || alert.channel,
      input.targetState,
      `${input.alertId}-${input.targetState}-${Date.now()}`,
      input.errorMessage || null,
      now
    );

    AuditService.log({
      eventType: `ALERT_${input.targetState}`,
      userId: input.actorId,
      actorType: 'SYSTEM',
      institutionId: alert.institution_id,
      targetType: 'ALERT',
      targetId: input.alertId,
      beforeState: { status: beforeState },
      afterState: { status: input.targetState },
      reason: input.notes || `Alert progressed to ${input.targetState}`
    });

    OutboxService.enqueueEvent(`institution.alert.${input.targetState.toLowerCase()}`, 'ALERT', input.alertId, {
      alertId: input.alertId,
      postId: alert.post_id,
      institutionId: alert.institution_id,
      beforeState,
      targetState: input.targetState
    });

    return {
      alertId: input.alertId,
      status: input.targetState,
      updatedAt: now
    };
  }
}
