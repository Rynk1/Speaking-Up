import { EventEmitter } from 'events';
import { db } from '../database/db';
import { logger } from '../shared/logger';

export interface ReportEventPayload {
  reportId: string;
  eventType: string;
  actorType: 'CITIZEN' | 'INSTITUTION' | 'MODERATOR' | 'SYSTEM';
  actorId?: string;
  institutionId?: string;
  visibility?: 'public' | 'protected' | 'private';
  metadata?: Record<string, any>;
}

class EventBus extends EventEmitter {
  /**
   * Emits an event and immutably records it in the `report_events` database timeline
   */
  public emitReportEvent(payload: ReportEventPayload): void {
    const now = new Date().toISOString();
    const eventId = `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    try {
      db.prepare(`
        INSERT INTO report_events (id, report_id, event_type, actor_type, actor_id, institution_id, visibility, metadata_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        eventId,
        payload.reportId,
        payload.eventType,
        payload.actorType,
        payload.actorId || null,
        payload.institutionId || null,
        payload.visibility || 'public',
        JSON.stringify(payload.metadata || {}),
        now
      );

      logger.info(`Report Event Recorded: ${payload.eventType}`, {
        reportId: payload.reportId,
        institutionId: payload.institutionId
      });

      // Emit in-memory event for SSE / job workers
      this.emit(payload.eventType, { id: eventId, ...payload, createdAt: now });
      this.emit('*', { id: eventId, ...payload, createdAt: now });
    } catch (err: any) {
      logger.error(`Failed to record ReportEvent: ${err.message}`, { payload });
    }
  }
}

export const eventBus = new EventBus();
