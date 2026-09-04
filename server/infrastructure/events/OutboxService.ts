import { db } from '../../database/db';
import { logger } from '../../shared/logger';
import { eventBus } from '../../events/eventBus';

export interface OutboxEventRecord {
  id: string;
  eventId: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, any>;
  status: 'PENDING' | 'PUBLISHED' | 'FAILED';
  attemptCount: number;
  lastError?: string;
  createdAt: string;
  processedAt?: string;
}

export class OutboxService {
  private static isProcessing = false;
  private static intervalTimer: NodeJS.Timeout | null = null;

  /**
   * Enqueues an event within the caller's transaction or standalone
   */
  public static enqueueEvent(
    eventType: string,
    aggregateType: string,
    aggregateId: string,
    payload: Record<string, any>
  ): string {
    const now = new Date().toISOString();
    const eventId = `evt-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const outboxId = `outbox-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    db.prepare(`
      INSERT INTO outbox_events (id, event_id, event_type, aggregate_type, aggregate_id, payload_json, status, attempt_count, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'PENDING', 0, ?)
    `).run(outboxId, eventId, eventType, aggregateType, aggregateId, JSON.stringify(payload), now);

    logger.info(`Outbox Event Queued: ${eventType}`, { eventId, aggregateType, aggregateId });

    // Schedule immediate asynchronous outbox flush
    setImmediate(() => this.processOutboxBatch());
    return eventId;
  }

  /**
   * Starts background outbox publisher worker
   */
  public static startOutboxWorker(pollIntervalMs: number = 2000): void {
    if (this.intervalTimer) return;
    this.intervalTimer = setInterval(() => this.processOutboxBatch(), pollIntervalMs);
    logger.info('Durable Outbox event dispatcher started.');
  }

  /**
   * Stops background outbox publisher
   */
  public static stopOutboxWorker(): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }

  /**
   * Dispatches pending events to the real-time event bus
   */
  public static async processOutboxBatch(): Promise<number> {
    if (this.isProcessing) return 0;
    this.isProcessing = true;

    let processedCount = 0;
    try {
      const pendingRows = db.prepare(`
        SELECT * FROM outbox_events
        WHERE status = 'PENDING'
        ORDER BY created_at ASC
        LIMIT 20
      `).all() as any[];

      for (const row of pendingRows) {
        const now = new Date().toISOString();
        let payload: any = {};
        try {
          payload = JSON.parse(row.payload_json);
        } catch {}

        try {
          // Emit to application event bus & real-time SSE
          eventBus.emit(row.event_type, {
            id: row.event_id,
            aggregateType: row.aggregate_type,
            aggregateId: row.aggregate_id,
            payload,
            createdAt: row.created_at
          });
          eventBus.emit('*', {
            id: row.event_id,
            eventType: row.event_type,
            aggregateType: row.aggregate_type,
            aggregateId: row.aggregate_id,
            payload,
            createdAt: row.created_at
          });

          db.prepare(`
            UPDATE outbox_events
            SET status = 'PUBLISHED', processed_at = ?, attempt_count = attempt_count + 1
            WHERE id = ?
          `).run(now, row.id);

          processedCount++;
        } catch (dispatchErr: any) {
          logger.error(`Failed to dispatch outbox event ${row.id}: ${dispatchErr.message}`);
          db.prepare(`
            UPDATE outbox_events
            SET attempt_count = attempt_count + 1, last_error = ?, status = CASE WHEN attempt_count >= 5 THEN 'FAILED' ELSE 'PENDING' END
            WHERE id = ?
          `).run(dispatchErr.message, row.id);
        }
      }
    } catch (err: any) {
      logger.error(`Outbox batch processing error: ${err.message}`);
    } finally {
      this.isProcessing = false;
    }

    return processedCount;
  }
}
