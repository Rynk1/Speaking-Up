import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../server/app';
import { db, initDatabase } from '../server/db';
import { seedDatabaseIfEmpty } from '../server/seedDatabase';
import { config } from '../server/config';

describe('Admin Dashboard & Platform Management Test Suite', () => {
  let app: any;
  let adminToken: string;
  let citizenToken: string;

  beforeAll(async () => {
    initDatabase();
    await seedDatabaseIfEmpty();
    app = createApp();

    // Generate test JWT tokens
    adminToken = jwt.sign(
      { id: 'admin-user-1', email: 'admin@gov.gh', name: 'System Admin', role: 'ADMIN' },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    citizenToken = jwt.sign(
      { id: 'citizen-user-1', email: 'citizen@test.com', name: 'Kofi Citizen', role: 'CITIZEN' },
      config.jwtSecret,
      { expiresIn: '1h' }
    );
  });

  it('1. Role-Based Access Control: Denies non-admin access to admin endpoints (403)', async () => {
    const res = await request(app)
      .get('/api/admin/overview')
      .set('Authorization', `Bearer ${citizenToken}`);

    expect(res.status).toBe(403);
  });

  it('2. Admin Overview: Returns platform health and summary metrics', async () => {
    const res = await request(app)
      .get('/api/admin/overview')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalUsers');
    expect(res.body).toHaveProperty('totalPosts');
    expect(res.body).toHaveProperty('pendingAbuse');
    expect(res.body.systemHealth).toBe('HEALTHY');
  });

  it('3. User Management: Lists users and allows role elevation & verification toggle', async () => {
    // List users
    const listRes = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body)).toBe(true);

    const testUser = listRes.body[0];
    expect(testUser).toBeDefined();

    // Toggle verification
    const verifyRes = await request(app)
      .put(`/api/admin/users/${testUser.id}/verify`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isVerified: true });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.isVerified).toBe(true);

    // Update role
    const roleRes = await request(app)
      .put(`/api/admin/users/${testUser.id}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'MODERATOR' });

    expect(roleRes.status).toBe(200);
    expect(roleRes.body.role).toBe('MODERATOR');
  });

  it('4. Content Moderation: Fetches all posts and updates post moderation status', async () => {
    const postsRes = await request(app)
      .get('/api/admin/posts')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(postsRes.status).toBe(200);
    expect(Array.isArray(postsRes.body)).toBe(true);

    const testPost = postsRes.body[0];
    expect(testPost).toBeDefined();

    const modRes = await request(app)
      .put(`/api/admin/posts/${testPost.id}/moderation`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ moderationStatus: 'held', reportLifecycleStatus: 'MODERATION_REVIEW' });

    expect(modRes.status).toBe(200);
    expect(modRes.body.moderationStatus).toBe('held');

    // Restore status to approved so other test suites pass cleanly
    await request(app)
      .put(`/api/admin/posts/${testPost.id}/moderation`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ moderationStatus: 'approved', reportLifecycleStatus: 'PUBLISHED' });
  });

  it('5. State Agency Management: Allows adding/updating state public institutions', async () => {
    const instRes = await request(app)
      .post('/api/admin/institutions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        officialName: 'Ministry of Roads and Highways Ghana',
        shortName: 'Ministry of Roads',
        acronym: 'MRH',
        mandate: 'Road construction and infrastructure maintenance',
        category: 'GOVERNMENT',
        alertMethod: 'OFFICIAL_EMAIL'
      });

    expect(instRes.status).toBe(201);
    expect(instRes.body.success).toBe(true);
  });

  it('6. Job Queue & Audit Trail: Fetches queued jobs, allows retry, and returns audit logs', async () => {
    // Insert a dummy failed job
    const dummyJobId = `job-test-${Date.now()}`;
    db.prepare(`
      INSERT INTO jobs (id, type, payload_json, status, priority, attempts, max_attempts, available_at, created_at, updated_at)
      VALUES (?, 'DISPATCH_ALERT', '{}', 'FAILED', 1, 5, 5, ?, ?, ?)
    `).run(dummyJobId, new Date().toISOString(), new Date().toISOString(), new Date().toISOString());

    // Fetch jobs
    const jobsRes = await request(app)
      .get('/api/admin/jobs')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(jobsRes.status).toBe(200);
    expect(Array.isArray(jobsRes.body)).toBe(true);

    // Retry job
    const retryRes = await request(app)
      .post(`/api/admin/jobs/${dummyJobId}/retry`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(retryRes.status).toBe(200);
    expect(retryRes.body.success).toBe(true);

    // Audit logs
    const auditRes = await request(app)
      .get('/api/admin/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(auditRes.status).toBe(200);
    expect(Array.isArray(auditRes.body)).toBe(true);
  });
});
