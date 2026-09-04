import { db } from '../../database/db';
import { logger } from '../../shared/logger';

export interface AuditRecordInput {
  eventType: string;
  userId?: string;
  actorType?: 'CITIZEN' | 'INSTITUTION' | 'MODERATOR' | 'ADMIN' | 'SYSTEM';
  institutionId?: string;
  targetType?: string; // 'POST' | 'SITUATION' | 'RESPONSE' | 'ANNOUNCEMENT' | 'ALERT' | 'EVIDENCE' | 'USER'
  targetId?: string;
  beforeState?: Record<string, any> | null;
  afterState?: Record<string, any> | null;
  reason?: string;
  ipAddress?: string;
  metadata?: Record<string, any>;
}

export class AuditService {
  /**
   * Immutably records an audit trail event
   */
  public static log(input: AuditRecordInput): string {
    const auditId = `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const details = {
      ...(input.metadata || {}),
      institutionId: input.institutionId,
      targetType: input.targetType,
      targetId: input.targetId
    };

    try {
      db.prepare(`
        INSERT INTO audit_logs (
          id, event_type, user_id, actor_type, target_type, target_id,
          before_state_json, after_state_json, reason, details_json, ip_address, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        auditId,
        input.eventType,
        input.userId || null,
        input.actorType || 'SYSTEM',
        input.targetType || null,
        input.targetId || null,
        input.beforeState ? JSON.stringify(input.beforeState) : null,
        input.afterState ? JSON.stringify(input.afterState) : null,
        input.reason || null,
        JSON.stringify(details),
        input.ipAddress || null,
        now
      );

      logger.info(`Audit Log Recorded: ${input.eventType}`, {
        auditId,
        targetType: input.targetType,
        targetId: input.targetId,
        actorType: input.actorType
      });

      return auditId;
    } catch (err: any) {
      logger.error(`Failed to record audit log: ${err.message}`, { input });
      return auditId;
    }
  }

  /**
   * Retrieves audit records for a target or institution
   */
  public static getTargetAuditHistory(targetType: string, targetId: string, limit: number = 50): any[] {
    return db.prepare(`
      SELECT * FROM audit_logs
      WHERE target_type = ? AND target_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(targetType, targetId, limit) as any[];
  }

  /**
   * Retrieves audit records for an institution
   */
  public static getInstitutionAuditHistory(institutionId: string, limit: number = 50): any[] {
    return db.prepare(`
      SELECT * FROM audit_logs
      WHERE json_extract(details_json, '$.institutionId') = ?
         OR target_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(institutionId, institutionId, limit) as any[];
  }
}
