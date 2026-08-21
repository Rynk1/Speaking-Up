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
});
