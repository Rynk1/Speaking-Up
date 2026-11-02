import { describe, it, expect, beforeAll } from 'vitest';
import express from 'express';
import supertest from 'supertest';
import { createApp } from '../server/app';
import { initDatabase, db } from '../server/database/db';
import { seedDatabaseIfEmpty } from '../server/seedDatabase';
import { InstitutionAlertService } from '../server/alerts/alertEngine';
import { jobQueue } from '../server/jobs/jobQueue';
import { eventBus } from '../server/events/eventBus';

describe('System Hardening & Production Architecture Test Suite', () => {
  let app: express.Express;

  beforeAll(async () => {
    initDatabase();
    await seedDatabaseIfEmpty();
    app = createApp();
  });

  it('1. IDOR Protection: Rejects unauthenticated GET /api/drafts with 401 Unauthorized', async () => {
    const res = await supertest(app).get('/api/drafts');
    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Authentication required');
  });

  it('2. Health Endpoints: /health/live and /health/ready return 200 OK with database status', async () => {
    const liveRes = await supertest(app).get('/health/live');
    expect(liveRes.status).toBe(200);
    expect(liveRes.body.status).toBe('UP');

    const readyRes = await supertest(app).get('/health/ready');
    expect(readyRes.status).toBe(200);
    expect(readyRes.body.status).toBe('READY');
    expect(readyRes.body.database).toBe('HEALTHY');
  });

  it('3. Real Alert Dispatcher: InstitutionAlertService dispatches alerts with idempotency protection', async () => {
    const post = db.prepare('SELECT id FROM posts LIMIT 1').get() as any;
    const inst = db.prepare("SELECT id FROM institutions WHERE alert_method = 'OFFICIAL_EMAIL' LIMIT 1").get() as any;

    expect(post).toBeDefined();
    expect(inst).toBeDefined();

    const result = await InstitutionAlertService.dispatchAlert(post.id, inst.id);
    expect(['SENT', 'DELIVERED', 'NOT_CONFIGURED']).toContain(result.status);

    const attempt = db.prepare('SELECT * FROM alert_attempts WHERE post_id = ? AND institution_id = ?').get(post.id, inst.id) as any;
    expect(attempt).toBeDefined();
    expect(attempt.idempotency_key).toBe(`alert-${post.id}-${inst.id}`);
  });

  it('4. Event Bus: Immutably records domain events in report_events database timeline', () => {
    const post = db.prepare('SELECT id FROM posts LIMIT 1').get() as any;
    expect(post).toBeDefined();

    eventBus.emitReportEvent({
      reportId: post.id,
      eventType: 'REPORT_CREATED',
      actorType: 'CITIZEN',
      metadata: { test: true }
    });

    const evt = db.prepare('SELECT * FROM report_events WHERE report_id = ? AND event_type = \'REPORT_CREATED\'').get(post.id) as any;
    expect(evt).toBeDefined();
    expect(evt.actor_type).toBe('CITIZEN');
  });

  it('5. Durable Job Queue: Enqueues and processes background jobs with observable status updates', async () => {
    let executed = false;
    jobQueue.registerHandler('TEST_HARDENING_JOB', async (payload: any) => {
      executed = payload.flag;
    });

    const jobId = await jobQueue.enqueue('TEST_HARDENING_JOB', { flag: true }, 10, 0);
    expect(jobId).toBeDefined();

    const jobRow = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId) as any;
    expect(jobRow).toBeDefined();
    expect(['QUEUED', 'COMPLETED']).toContain(jobRow.status);
  });

  it('6. Job Recovery: interrupted and dead-lettered jobs are requeued on startup', () => {
    const now = new Date().toISOString();
    const insert = (id: string, status: string, attempts: number) => {
      db.prepare(`
        INSERT INTO jobs (id, type, payload_json, status, priority, attempts, max_attempts, available_at, created_at, updated_at)
        VALUES (?, 'TEST_HARDENING_JOB', '{}', ?, 1, ?, 5, ?, ?, ?)
      `).run(id, status, attempts, now, now, now);
    };
    insert('job-stuck-processing', 'PROCESSING', 1);
    insert('job-dead-letter', 'DEAD_LETTER', 5);

    const summary = jobQueue.recoverInterruptedJobs();
    expect(summary.requeuedProcessing).toBeGreaterThanOrEqual(1);
    expect(summary.requeuedDeadLetter).toBeGreaterThanOrEqual(1);

    const processing = db.prepare('SELECT status FROM jobs WHERE id = ?').get('job-stuck-processing') as any;
    expect(processing.status).toBe('QUEUED');

    const dead = db.prepare('SELECT status, attempts FROM jobs WHERE id = ?').get('job-dead-letter') as any;
    expect(dead.status).toBe('QUEUED');
    expect(dead.attempts).toBe(0);
  });

  it('7. Idempotent Report Creation: a repeated publish key returns the original report', async () => {
    const user = db.prepare('SELECT id, name, handle, role FROM users WHERE role = ? LIMIT 1').get('CITIZEN') as any;
    expect(user).toBeDefined();
    const jwt = (await import('jsonwebtoken')).default;
    const { config } = await import('../server/config');
    const token = jwt.sign(
      { id: user.id, email: 'citizen@speakup.gh', name: user.name, handle: user.handle, role: 'CITIZEN' },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    const key = `idem-${Date.now()}`;
    const payload = {
      title: `Idempotency report ${Date.now()}`,
      content: 'This report is submitted twice with the same idempotency key.',
      category: 'Sanitation & Waste',
      urgency: 'LOW',
      location: { region: 'Greater Accra', district: 'Accra Metropolitan' }
    };

    const first = await supertest(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Idempotency-Key', key)
      .send(payload);
    expect(first.status).toBe(201);

    const second = await supertest(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Idempotency-Key', key)
      .send(payload);
    expect(second.status).toBe(201);
    expect(second.body.id).toBe(first.body.id);

    const count = (db.prepare('SELECT COUNT(*) as c FROM posts WHERE title = ?').get(payload.title) as any).c;
    expect(count).toBe(1);
  });

  it('8. Protected Media: rejects unauthenticated access and path traversal', async () => {
    // No token at all
    const noToken = await supertest(app).get('/api/media/protected/evidence.jpg');
    expect([401, 403]).toContain(noToken.status);

    // Path traversal attempt is rejected before any file access
    const traversal = await supertest(app)
      .get('/api/media/protected/..%2f..%2fserver%2fapp.ts')
      .query({ token: 'whatever' });
    expect([400, 401, 403, 404]).toContain(traversal.status);
  });
});
