import { db } from '../database/db';
import { logger } from '../shared/logger';

export interface Job {
  id: string;
  type: string;
  payload: any;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'RETRYING' | 'DEAD_LETTER';
  priority: number;
  attempts: number;
  maxAttempts: number;
  availableAt: string;
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export type JobHandler = (payload: any, job: Job) => Promise<void>;

export class JobQueue {
  private handlers = new Map<string, JobHandler>();
  private isProcessing = false;
  private pollIntervalMs = 1000;
  private timer: NodeJS.Timeout | null = null;

  public registerHandler(type: string, handler: JobHandler): void {
    this.handlers.set(type, handler);
  }

  /**
   * Enqueues a durable job in the SQLite `jobs` table
   */
  public async enqueue(type: string, payload: any, priority: number = 1, delaySeconds: number = 0): Promise<string> {
    const now = new Date();
    const availableAt = new Date(now.getTime() + delaySeconds * 1000).toISOString();
    const jobId = `job-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const nowStr = now.toISOString();

    db.prepare(`
      INSERT INTO jobs (id, type, payload_json, status, priority, attempts, max_attempts, available_at, created_at, updated_at)
      VALUES (?, ?, ?, 'QUEUED', ?, 0, 5, ?, ?, ?)
    `).run(jobId, type, JSON.stringify(payload), priority, availableAt, nowStr, nowStr);

    logger.info(`Job Enqueued: ${type}`, { jobId, priority, delaySeconds });
    this.processNext();
    return jobId;
  }

  /**
   * Starts background worker loop
   */
  public startWorker(): void {
    if (this.timer) return;
    logger.info('Starting durable background job worker loop...');
    this.timer = setInterval(() => this.processNext(), this.pollIntervalMs);
  }

  /**
   * Stops background worker loop
   */
  public stopWorker(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Polls and processes pending QUEUED or RETRYING jobs
   */
  private async processNext(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const now = new Date().toISOString();
      const jobRow = db.prepare(`
        SELECT * FROM jobs
        WHERE status IN ('QUEUED', 'RETRYING')
          AND available_at <= ?
        ORDER BY priority DESC, created_at ASC
        LIMIT 1
      `).get(now) as any;

      if (!jobRow) {
        this.isProcessing = false;
        return;
      }

      const job: Job = {
        id: jobRow.id,
        type: jobRow.type,
        payload: JSON.parse(jobRow.payload_json),
        status: jobRow.status,
        priority: jobRow.priority,
        attempts: jobRow.attempts,
        maxAttempts: jobRow.max_attempts,
        availableAt: jobRow.available_at,
        startedAt: jobRow.started_at,
        completedAt: jobRow.completed_at,
        failedAt: jobRow.failed_at,
        lastError: jobRow.last_error,
        createdAt: jobRow.created_at,
        updatedAt: jobRow.updated_at
      };

      const handler = this.handlers.get(job.type);
      if (!handler) {
        logger.error(`No handler registered for job type: ${job.type}`, { jobId: job.id });
        db.prepare("UPDATE jobs SET status = 'DEAD_LETTER', last_error = 'No handler registered', updated_at = ? WHERE id = ?")
          .run(now, job.id);
        this.isProcessing = false;
        return;
      }

      // Mark as PROCESSING
      const startTime = Date.now();
      db.prepare("UPDATE jobs SET status = 'PROCESSING', started_at = ?, attempts = attempts + 1, updated_at = ? WHERE id = ?")
        .run(now, now, job.id);

      try {
        await handler(job.payload, job);

        const durationMs = Date.now() - startTime;
        const completedAt = new Date().toISOString();

        db.prepare("UPDATE jobs SET status = 'COMPLETED', completed_at = ?, updated_at = ? WHERE id = ?")
          .run(completedAt, completedAt, job.id);

        db.prepare("INSERT INTO job_attempts (id, job_id, attempt_number, duration_ms, created_at) VALUES (?, ?, ?, ?, ?)")
          .run(`att-${Date.now()}`, job.id, job.attempts + 1, durationMs, completedAt);

        logger.info(`Job Completed: ${job.type}`, { jobId: job.id, durationMs });
      } catch (err: any) {
        const durationMs = Date.now() - startTime;
        const failedAt = new Date().toISOString();
        const nextAttempts = job.attempts + 1;
        const errorMessage = err.message || String(err);

        db.prepare("INSERT INTO job_attempts (id, job_id, attempt_number, error_message, duration_ms, created_at) VALUES (?, ?, ?, ?, ?, ?)")
          .run(`att-${Date.now()}`, job.id, nextAttempts, errorMessage, durationMs, failedAt);

        if (nextAttempts >= job.maxAttempts) {
          db.prepare("UPDATE jobs SET status = 'DEAD_LETTER', failed_at = ?, last_error = ?, updated_at = ? WHERE id = ?")
            .run(failedAt, errorMessage, failedAt, job.id);
          logger.error(`Job Moved to DEAD_LETTER: ${job.type}`, { jobId: job.id, error: errorMessage });
        } else {
          // Exponential backoff
          const backoffDelaySec = Math.pow(2, nextAttempts) * 15;
          const nextAvailable = new Date(Date.now() + backoffDelaySec * 1000).toISOString();

          db.prepare("UPDATE jobs SET status = 'RETRYING', available_at = ?, last_error = ?, updated_at = ? WHERE id = ?")
            .run(nextAvailable, errorMessage, failedAt, job.id);
          logger.warn(`Job Scheduled for Retry (${nextAttempts}/${job.maxAttempts}): ${job.type}`, { jobId: job.id, nextAvailable });
        }
      }
    } catch (err: any) {
      logger.error(`Error in JobQueue worker execution loop: ${err.message}`);
    } finally {
      this.isProcessing = false;
    }
  }
}

export const jobQueue = new JobQueue();
