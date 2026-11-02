import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../server/app';
import { db, initDatabase } from '../server/database/db';
import { seedDatabaseIfEmpty } from '../server/seedDatabase';
import { config } from '../server/config';
import {
  canTransitionWorkItem,
  canTransitionDelegation,
  canTransitionParticipant,
  canTransitionSituation,
  canTransitionAccountability,
  nextAccountabilityStatuses,
  evaluateWorkItemActions,
  checkCanResolve,
  checkCanHandoff,
  checkCanEscalate,
  checkCanAssign
} from '../shared/workflow';

const app = createApp();

describe('Unified workflow policy — pure rules', () => {
  it('work-item lifecycle is forward-only', () => {
    expect(canTransitionWorkItem('NEW', 'SEEN')).toBe(true);
    expect(canTransitionWorkItem('ACKNOWLEDGED', 'UNDER_REVIEW')).toBe(true);
    // The whole point: no short-circuiting the preceding step.
    expect(canTransitionWorkItem('NEW', 'UNDER_REVIEW')).toBe(false);
    expect(canTransitionWorkItem('NEW', 'RESOLVED')).toBe(false);
    // No going backwards.
    expect(canTransitionWorkItem('UNDER_REVIEW', 'ACKNOWLEDGED')).toBe(false);
    expect(canTransitionWorkItem('RESOLVED', 'SEEN')).toBe(false);
  });

  it('delegation, participant and situation transitions follow their maps', () => {
    expect(canTransitionDelegation('PENDING', 'ACCEPTED')).toBe(true);
    expect(canTransitionDelegation('COMPLETED', 'ACCEPTED')).toBe(false);
    expect(canTransitionParticipant('INVITED', 'ACCEPTED')).toBe(true);
    expect(canTransitionParticipant('COMPLETED', 'ACCEPTED')).toBe(false);
    expect(canTransitionSituation('REPORTED', 'VERIFYING')).toBe(true);
    expect(canTransitionSituation('REPORTED', 'RESOLVED')).toBe(false);
    expect(canTransitionSituation('CLOSED', 'REPORTED')).toBe(false);
  });

  it('accountability status only moves forward along the ladder', () => {
    expect(canTransitionAccountability('NOT_ROUTED', 'ACKNOWLEDGED')).toBe(true);
    expect(canTransitionAccountability('UNDER_REVIEW', 'RESPONDED')).toBe(true);
    // Un-resolving a closed report is refused.
    expect(canTransitionAccountability('RESOLVED', 'UNDER_REVIEW')).toBe(false);
    expect(canTransitionAccountability('CLOSED', 'RESPONDED')).toBe(false);
    // A no-op is not a transition.
    expect(canTransitionAccountability('RESOLVED', 'RESOLVED')).toBe(false);
    // Unknown statuses are rejected outright.
    expect(canTransitionAccountability('NOT_ROUTED', 'NONSENSE')).toBe(false);
    // The offered next steps never include an earlier stage.
    const next = nextAccountabilityStatuses('RESPONDED');
    expect(next).not.toContain('ACKNOWLEDGED');
    expect(next).toContain('RESOLVED');
  });

  it('a mirror can never be actioned', () => {
    const actions = evaluateWorkItemActions({ actionState: 'NEW', isMirror: true });
    expect(actions.every((a) => !a.enabled)).toBe(true);
    expect(actions.every((a) => a.reason?.includes('mirror'))).toBe(true);
    expect(checkCanHandoff({ actionState: 'NEW', isMirror: true }).ok).toBe(false);
    expect(checkCanResolve({ actionState: 'UNDER_REVIEW', isMirror: true }, true).ok).toBe(false);
  });

  it('resolution requires a real artefact, unless oversight supplies a reason', () => {
    expect(checkCanResolve({ actionState: 'UNDER_REVIEW' }, true).ok).toBe(false);
    expect(checkCanResolve({ actionState: 'UNDER_REVIEW', hasResponse: true }, true).ok).toBe(true);
    expect(checkCanResolve({ actionState: 'UNDER_REVIEW', hasAction: true }, true).ok).toBe(true);
    expect(checkCanResolve({ actionState: 'UNDER_REVIEW', isOversight: true }, true).ok).toBe(true);
    // Even oversight must record a reason.
    expect(checkCanResolve({ actionState: 'UNDER_REVIEW', isOversight: true }, false).ok).toBe(false);
    // A resolved item cannot be resolved again.
    expect(checkCanResolve({ actionState: 'RESOLVED', hasResponse: true }, true).ok).toBe(false);
  });

  it('escalation is blocked for a fresh item but a system actor may escalate anything', () => {
    expect(checkCanEscalate({ actionState: 'NEW' }).ok).toBe(false);
    expect(checkCanEscalate({ actionState: 'SEEN' }).ok).toBe(true);
    expect(checkCanEscalate({ actionState: 'NEW', isOversight: true }).ok).toBe(true);
    expect(checkCanEscalate({ actionState: 'NEW' }, { isSystem: true }).ok).toBe(true);
  });

  it('assignment is blocked once an item is resolved or awaiting the citizen', () => {
    expect(checkCanAssign({ actionState: 'NEW' }).ok).toBe(true);
    expect(checkCanAssign({ actionState: 'RESOLVED' }).ok).toBe(false);
    expect(checkCanAssign({ actionState: 'CITIZEN_FOLLOW_UP' }).ok).toBe(false);
  });
});

describe('Unified workflow policy — server enforcement', () => {
  const policeToken = jwt.sign(
    { id: 'user-inst-police', email: 'police.desk@police.gov.gh', name: 'GPS Desk', handle: 'ghana_police_desk', role: 'INSTITUTION_REP', institutionId: 'ghana-police-service' },
    config.jwtSecret,
    { expiresIn: '1h' }
  );
  const nadmoToken = jwt.sign(
    { id: 'user-inst-nadmo', email: 'desk@nadmo.gov.gh', name: 'NADMO Desk', handle: 'nadmo_desk', role: 'INSTITUTION_REP', institutionId: 'nadmo-ghana' },
    config.jwtSecret,
    { expiresIn: '1h' }
  );
  const adminToken = jwt.sign(
    { id: 'admin-policy', email: 'admin@gov.gh', name: 'Platform Admin', handle: 'platform_admin', role: 'ADMIN' },
    config.jwtSecret,
    { expiresIn: '1h' }
  );
  const citizenToken = jwt.sign(
    { id: 'user-current', email: 'citizen@speakup.gh', name: 'Kofi Mensah', handle: 'kofi_speakup', role: 'CITIZEN' },
    config.jwtSecret,
    { expiresIn: '1h' }
  );

  let reportId: string;
  let situationId: string;

  beforeAll(async () => {
    initDatabase();
    await seedDatabaseIfEmpty();

    const now = new Date().toISOString();
    for (const u of [
      { id: 'user-inst-police', email: 'police.desk@police.gov.gh', name: 'Ghana Police Service Desk', handle: 'ghana_police_desk' },
      { id: 'user-inst-nadmo', email: 'desk@nadmo.gov.gh', name: 'NADMO Operations Desk', handle: 'nadmo_desk' },
      { id: 'admin-policy', email: 'admin@gov.gh', name: 'Platform Admin', handle: 'platform_admin' }
    ]) {
      db.prepare(`
        INSERT OR REPLACE INTO users (id, email, password_hash, name, handle, role, is_verified, followers_count, created_at, updated_at)
        VALUES (?, ?, 'test-hash', ?, ?, ?, 1, 0, ?, ?)
      `).run(u.id, u.email, u.name, u.handle, u.id === 'admin-policy' ? 'ADMIN' : 'INSTITUTION_REP', now, now);
    }

    const created = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        title: `Workflow policy report ${Date.now()}`,
        content: 'Overflowing drains are flooding the school approach road every evening.',
        category: 'Flooding & Drainage',
        urgency: 'HIGH',
        severity: 'SEVERE',
        location: { region: 'Greater Accra', district: 'Accra Metropolitan' },
        institutionTags: [{ institutionId: 'ghana-police-service' }]
      });
    reportId = created.body.id || created.body.post?.id;

    situationId = `sit-policy-${Date.now()}`;
    db.prepare(`
      INSERT INTO civic_situations (
        id, title, summary, category, region, district, severity, urgency, status,
        first_reported_at, latest_activity_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'SEVERE', 'HIGH', 'REPORTED', ?, ?, ?, ?)
    `).run(situationId, 'Policy test situation', 'A clustered drainage failure.', 'Flooding & Drainage', 'Greater Accra', 'Accra Metropolitan', now, now, now, now);
    db.prepare(`
      INSERT INTO situation_institutions (situation_id, institution_id, role, jurisdiction_level, assigned_at)
      VALUES (?, 'ghana-police-service', 'PRIMARY', 'NATIONAL', ?)
    `).run(situationId, now);
  });

  it('a situation cannot jump straight to RESOLVED and is scoped to its institutions', async () => {
    const jumped = await request(app)
      .post(`/api/situations/${situationId}/status`)
      .set('Authorization', `Bearer ${policeToken}`)
      .send({ status: 'RESOLVED' });
    expect(jumped.status).toBe(409);
    expect(jumped.body.code).toBe('INVALID_TRANSITION');

    const forward = await request(app)
      .post(`/api/situations/${situationId}/status`)
      .set('Authorization', `Bearer ${policeToken}`)
      .send({ status: 'VERIFYING' });
    expect(forward.status).toBe(200);

    const row = db.prepare('SELECT status FROM civic_situations WHERE id = ?').get(situationId) as any;
    expect(row.status).toBe('VERIFYING');

    // A situation event and an audit record were written.
    const events = db.prepare('SELECT * FROM situation_events WHERE situation_id = ?').all(situationId) as any[];
    expect(events.some((e) => e.event_type === 'SITUATION_STATUS_VERIFYING')).toBe(true);

    // An institution with no role in the situation is refused.
    const outsider = await request(app)
      .post(`/api/situations/${situationId}/status`)
      .set('Authorization', `Bearer ${nadmoToken}`)
      .send({ status: 'ACTIVE_MONITORING' });
    expect(outsider.status).toBe(403);

    // Oversight may act.
    const oversight = await request(app)
      .post(`/api/situations/${situationId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ACTIVE_MONITORING' });
    expect(oversight.status).toBe(200);

    // Unknown situation.
    const missing = await request(app)
      .post('/api/situations/does-not-exist/status')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'VERIFYING' });
    expect(missing.status).toBe(404);
  });

  it('a report status cannot jump to RESOLVED without an artefact', async () => {
    const current = db.prepare('SELECT accountability_status FROM posts WHERE id = ?').get(reportId) as any;
    expect(current.accountability_status).not.toBe('RESOLVED');

    // From the very start, a claim of RESOLVED has no supporting artefact.
    const jumped = await request(app)
      .put(`/api/posts/${reportId}/status`)
      .set('Authorization', `Bearer ${policeToken}`)
      .send({ status: 'RESOLVED' });
    expect(jumped.status).toBe(409);
    expect(jumped.body.code).toBe('PREREQUISITE_UNMET');

    const forward = await request(app)
      .put(`/api/posts/${reportId}/status`)
      .set('Authorization', `Bearer ${policeToken}`)
      .send({ status: 'ACKNOWLEDGED' });
    expect(forward.status).toBe(200);

    const row = db.prepare('SELECT accountability_status FROM posts WHERE id = ?').get(reportId) as any;
    expect(row.accountability_status).toBe('ACKNOWLEDGED');

    // The ladder is forward-only: un-acknowledging is refused outright.
    const backwards = await request(app)
      .put(`/api/posts/${reportId}/status`)
      .set('Authorization', `Bearer ${policeToken}`)
      .send({ status: 'NOT_ROUTED' });
    expect(backwards.status).toBe(409);
    expect(backwards.body.code).toBe('INVALID_TRANSITION');

    // The edge to RESOLVED is legal, but there is still no response or recorded
    // action, so the substantive gate refuses the claim.
    const noArtefact = await request(app)
      .put(`/api/posts/${reportId}/status`)
      .set('Authorization', `Bearer ${policeToken}`)
      .send({ status: 'RESOLVED' });
    expect(noArtefact.status).toBe(409);
    expect(noArtefact.body.code).toBe('PREREQUISITE_UNMET');
  });

  it('a representative cannot change the status of a report not routed to them', async () => {
    const denied = await request(app)
      .put(`/api/posts/${reportId}/status`)
      .set('Authorization', `Bearer ${nadmoToken}`)
      .send({ status: 'UNDER_REVIEW' });
    expect(denied.status).toBe(403);
  });

  it('a representative cannot publish a response for another agency', async () => {
    const denied = await request(app)
      .post(`/api/posts/${reportId}/response`)
      .set('Authorization', `Bearer ${nadmoToken}`)
      .send({
        institutionId: 'ghana-police-service',
        responseType: 'ACKNOWLEDGEMENT',
        message: 'We are looking into this.'
      });
    expect(denied.status).toBe(403);
  });

  it('publishing an official response advances the linked civic situation', async () => {
    // The report was auto-linked to a civic situation when it was created; drive
    // that same situation and confirm the response advances it.
    const link = db.prepare('SELECT situation_id FROM situation_reports WHERE report_id = ?').get(reportId) as any;
    expect(link?.situation_id).toBeTruthy();

    db.prepare('UPDATE civic_situations SET status = ? WHERE id = ?').run('VERIFYING', link.situation_id);

    const resp = await request(app)
      .post(`/api/posts/${reportId}/response`)
      .set('Authorization', `Bearer ${policeToken}`)
      .send({
        institutionId: 'ghana-police-service',
        responseType: 'ACTION_TAKEN',
        message: 'Drainage crews have been deployed to the site.'
      });
    expect(resp.status).toBe(201);

    const situation = db.prepare('SELECT status FROM civic_situations WHERE id = ?').get(link.situation_id) as any;
    expect(situation.status).toBe('OFFICIAL_RESPONSE_ISSUED');

    const events = db.prepare('SELECT * FROM situation_events WHERE situation_id = ?').all(link.situation_id) as any[];
    expect(events.some((e) => e.event_type === 'SITUATION_STATUS_OFFICIAL_RESPONSE_ISSUED')).toBe(true);
  });
});
