import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../server/app';
import { db, initDatabase } from '../server/database/db';
import { seedDatabaseIfEmpty, seedCoordinationHierarchy } from '../server/seedDatabase';
import { CoordinationService } from '../server/modules/coordination/CoordinationService';
import { config } from '../server/config';

const app = createApp();

describe('Inter-Institutional Coordination & Delegation Workflow', () => {
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
  const citizenToken = jwt.sign(
    { id: 'user-current', email: 'citizen@speakup.gh', name: 'Kofi Mensah', handle: 'kofi_speakup', role: 'CITIZEN' },
    config.jwtSecret,
    { expiresIn: '1h' }
  );

  let reportId: string;

  beforeAll(async () => {
    initDatabase();
    await seedDatabaseIfEmpty();

    // Ensure the institution representatives required by the hierarchy exist
    const now = new Date().toISOString();
    for (const u of [
      { id: 'user-inst-police', email: 'police.desk@police.gov.gh', name: 'Ghana Police Service Desk', handle: 'ghana_police_desk' },
      { id: 'user-inst-nadmo', email: 'desk@nadmo.gov.gh', name: 'NADMO Operations Desk', handle: 'nadmo_desk' }
    ]) {
      db.prepare(`
        INSERT OR REPLACE INTO users (id, email, password_hash, name, handle, role, is_verified, followers_count, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'INSTITUTION_REP', 1, 0, ?, ?)
      `).run(u.id, u.email, 'test-hash', u.name, u.handle, now, now);
    }

    seedCoordinationHierarchy();

    // A citizen report tagged to the Ghana Police Service in Accra
    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        title: `Coordination test flooding report ${Date.now()}`,
        content: 'Persistent flooding is blocking the main Accra corridor and endangering commuters.',
        category: 'Flooding & Drainage',
        urgency: 'HIGH',
        severity: 'SEVERE',
        location: { region: 'Greater Accra', district: 'Accra Metropolitan' },
        institutionTags: [{ institutionId: 'ghana-police-service' }]
      });
    reportId = res.body.id;
  });

  it('1. Seeds a data-backed desk hierarchy for institutions', async () => {
    const res = await request(app).get('/api/institutions/ghana-police-service/desks');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(2);

    const levels = res.body.map((d: any) => d.level);
    expect(levels).toContain('NATIONAL');
    expect(levels).toContain('REGIONAL');

    // Contract shape expected by the frontend HierarchyDesksView
    const desk = res.body[0];
    expect(desk).toHaveProperty('name');
    expect(desk).toHaveProperty('code');
    expect(desk).toHaveProperty('level');
    expect(desk).toHaveProperty('institution_id');
  });

  it('2. Resolves the most specific desk by district then region then national', () => {
    const districtDesk = CoordinationService.resolveDeskForLocation('ghana-police-service', {
      region: 'Greater Accra',
      district: 'Accra Metropolitan'
    });
    expect(districtDesk).toBeTruthy();
    expect(districtDesk.level).toBe('DISTRICT');

    const regionalDesk = CoordinationService.resolveDeskForLocation('ghana-police-service', {
      region: 'Greater Accra',
      district: 'Unknown District'
    });
    expect(regionalDesk).toBeTruthy();
    expect(regionalDesk.level).toBe('REGIONAL');

    const nationalDesk = CoordinationService.resolveDeskForLocation('ghana-police-service', {});
    expect(nationalDesk).toBeTruthy();
    expect(nationalDesk.level).toBe('NATIONAL');
  });

  it('3. Report creation assigns ownership, resolves a desk and notifies the institution', () => {
    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(reportId) as any;
    expect(post.owner_institution_id).toBe('ghana-police-service');
    expect(post.owner_desk_id).toBeTruthy();
    expect(post.workflow_stage).toBe('ROUTED');

    const inboxItem = db.prepare('SELECT * FROM institutional_inbox_items WHERE post_id = ?').get(reportId) as any;
    expect(inboxItem).toBeTruthy();
    expect(inboxItem.desk_id).toBeTruthy();
    expect(inboxItem.due_at).toBeTruthy();
  });

  it('4. Creates a delegation that lands on the target institution desk queue', async () => {
    const res = await request(app)
      .post('/api/institutions/ghana-police-service/delegations')
      .set('Authorization', `Bearer ${policeToken}`)
      .send({
        postId: reportId,
        toInstitutionId: 'nadmo-ghana',
        delegationType: 'TRANSFER',
        actionRequired: 'ACTION',
        priority: 'URGENT',
        reason: 'Flooding response is a NADMO mandate; transferring coordination lead.',
        instructions: 'Please deploy the metropolitan disaster response desk.'
      });

    expect(res.status).toBe(201);
    expect(res.body.delegation.id).toBeTruthy();
    expect(res.body.delegation.status).toBe('PENDING');
    expect(res.body.delegation.toInstitutionId).toBe('nadmo-ghana');

    // The receiving institution now has a routed follow-up inbox item
    const inboxItem = db.prepare("SELECT * FROM institutional_inbox_items WHERE delegation_id = ?").get(res.body.delegation.id) as any;
    expect(inboxItem).toBeTruthy();
    expect(inboxItem.institution_id).toBe('nadmo-ghana');

    // Ownership is handed over for action-bearing transfers
    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(reportId) as any;
    expect(post.owner_institution_id).toBe('nadmo-ghana');
  });

  it('5. Delegations are visible to the receiving institution', async () => {
    const res = await request(app)
      .get('/api/institutions/nadmo-ghana/delegations?direction=INCOMING')
      .set('Authorization', `Bearer ${nadmoToken}`);

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.items[0].to_institution_id).toBe('nadmo-ghana');
  });

  it('6. Accepting a delegation advances the work item to ACCEPTED', async () => {
    const incoming = await request(app)
      .get('/api/institutions/nadmo-ghana/delegations?direction=INCOMING&status=PENDING')
      .set('Authorization', `Bearer ${nadmoToken}`);
    const delegationId = incoming.body.items[0].id;

    const res = await request(app)
      .post(`/api/delegations/${delegationId}/transition`)
      .set('Authorization', `Bearer ${nadmoToken}`)
      .send({ status: 'ACCEPTED', note: 'Accepted and deploying field team.' });

    expect(res.status).toBe(200);
    expect(res.body.delegation.status).toBe('ACCEPTED');

    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(reportId) as any;
    expect(post.workflow_stage).toBe('ACCEPTED');
  });

  it('7. Completing a delegation resolves the report and closes the loop', async () => {
    const incoming = await request(app)
      .get('/api/institutions/nadmo-ghana/delegations?direction=INCOMING&status=ACCEPTED')
      .set('Authorization', `Bearer ${nadmoToken}`);
    const delegationId = incoming.body.items[0].id;

    const res = await request(app)
      .post(`/api/delegations/${delegationId}/transition`)
      .set('Authorization', `Bearer ${nadmoToken}`)
      .send({ status: 'COMPLETED', note: 'Drainage cleared.' });

    expect(res.status).toBe(200);
    expect(res.body.delegation.status).toBe('COMPLETED');

    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(reportId) as any;
    expect(post.workflow_stage).toBe('RESOLVED');
    expect(post.resolved_at).toBeTruthy();
  });

  it('8. Invalid delegation transitions are rejected', async () => {
    const res = await request(app)
      .post('/api/delegations/does-not-exist/transition')
      .set('Authorization', `Bearer ${nadmoToken}`)
      .send({ status: 'ACCEPTED' });

    expect(res.status).toBe(404);
  });

  it('9. Workload endpoint reports stages, desks and overdue work', async () => {
    const res = await request(app)
      .get('/api/institutions/nadmo-ghana/workload')
      .set('Authorization', `Bearer ${nadmoToken}`);

    expect(res.status).toBe(200);
    expect(res.body.institutionId).toBe('nadmo-ghana');
    expect(typeof res.body.total).toBe('number');
    expect(Array.isArray(res.body.byDesk)).toBe(true);
    expect(typeof res.body.overdueItems).toBe('number');
  });

  it('10. Admin coordination oversight is protected and reports platform routing', async () => {
    const denied = await request(app)
      .get('/api/admin/coordination')
      .set('Authorization', `Bearer ${citizenToken}`);
    expect(denied.status).toBe(403);

    const adminToken = jwt.sign(
      { id: 'admin-1', email: 'admin@gov.gh', name: 'Admin', role: 'ADMIN' },
      config.jwtSecret,
      { expiresIn: '1h' }
    );
    const allowed = await request(app)
      .get('/api/admin/coordination')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(allowed.status).toBe(200);
    expect(allowed.body.summary).toHaveProperty('pendingDelegations');
    expect(allowed.body.summary).toHaveProperty('overdueItems');
    expect(Array.isArray(allowed.body.byInstitution)).toBe(true);
  });

  it('11. Institution scope is enforced for cross-institution access', async () => {
    // A NADMO representative must not read the Police Service workload
    const denied = await request(app)
      .get('/api/institutions/ghana-police-service/workload')
      .set('Authorization', `Bearer ${nadmoToken}`);
    expect(denied.status).toBe(403);

    const allowed = await request(app)
      .get('/api/institutions/nadmo-ghana/workload')
      .set('Authorization', `Bearer ${nadmoToken}`);
    expect(allowed.status).toBe(200);
  });

  it('12. SLA sweep warns and escalates overdue work items', () => {
    // Force an inbox item past its deadline
    const overdueItem = db.prepare('SELECT * FROM institutional_inbox_items WHERE institution_id = ? LIMIT 1')
      .get('nadmo-ghana') as any;
    expect(overdueItem).toBeTruthy();
    db.prepare('UPDATE institutional_inbox_items SET due_at = ?, sla_notified_at = NULL, action_state = ? WHERE id = ?')
      .run(new Date(Date.now() - 60 * 60 * 1000).toISOString(), 'NEW', overdueItem.id);

    const result = CoordinationService.runSlaSweep();
    expect(result.overdueItems).toBeGreaterThanOrEqual(1);

    const after = db.prepare('SELECT item_priority, sla_notified_at FROM institutional_inbox_items WHERE id = ?')
      .get(overdueItem.id) as any;
    expect(after.item_priority).toBe('EMERGENCY');
    expect(after.sla_notified_at).toBeTruthy();
  });

  it('13. Desk officer assignment attaches an official to a desk', async () => {
    const desks = await request(app).get('/api/institutions/nadmo-ghana/desks');
    const nationalDesk = desks.body.find((d: any) => d.level === 'NATIONAL');
    expect(nationalDesk).toBeTruthy();

    const res = await request(app)
      .post(`/api/institutions/nadmo-ghana/desks/${nationalDesk.id}/officers`)
      .set('Authorization', `Bearer ${nadmoToken}`)
      .send({ userId: 'user-inst-nadmo', role: 'DESK_LEAD', isPrimary: true });

    expect(res.status).toBe(201);
    expect(res.body.officerId).toBeTruthy();

    const officers = await request(app)
      .get(`/api/institutions/nadmo-ghana/desks/${nationalDesk.id}/officers`)
      .set('Authorization', `Bearer ${nadmoToken}`);
    expect(officers.status).toBe(200);
    expect(officers.body.some((o: any) => o.user_id === 'user-inst-nadmo')).toBe(true);
  });

  it('14. Every desk-bearing institution has a seeded representative account', () => {
    const institutions = db.prepare(`
      SELECT DISTINCT institution_id FROM institution_desks
    `).all() as any[];

    expect(institutions.length).toBeGreaterThan(1);

    for (const { institution_id } of institutions) {
      const rep = db.prepare(`
        SELECT u.id FROM users u
        WHERE u.id IN (SELECT user_id FROM institution_users WHERE institution_id = ?)
      `).get(institution_id) as any;
      expect(rep, `missing representative for ${institution_id}`).toBeTruthy();
    }
  });

  it('15. Delegation creation notifies the receiving desk officials', async () => {
    const res = await request(app)
      .post('/api/institutions/ghana-police-service/delegations')
      .set('Authorization', `Bearer ${policeToken}`)
      .send({
        toInstitutionId: 'nadmo-ghana',
        postId: reportId,
        delegationType: 'TRANSFER',
        reason: 'Flood response falls under NADMO mandate'
      });

    expect(res.status).toBe(201);
    expect(res.body.delegation.notifiedOfficers).toBeGreaterThanOrEqual(1);

    const notified = db.prepare(`
      SELECT COUNT(*) as c FROM notifications
      WHERE user_id = 'user-inst-nadmo' AND type = 'DELEGATION_RECEIVED'
    `).get() as any;
    expect(notified.c).toBeGreaterThanOrEqual(1);
  });

  it('16. SLA sweep endpoint is restricted to administrators', async () => {
    const denied = await request(app)
      .post('/api/admin/coordination/run-sla-sweep')
      .set('Authorization', `Bearer ${policeToken}`);
    expect(denied.status).toBe(403);

    const adminToken = jwt.sign(
      { id: 'admin-1', email: 'admin@gov.gh', name: 'Admin', role: 'ADMIN' },
      config.jwtSecret,
      { expiresIn: '1h' }
    );
    const allowed = await request(app)
      .post('/api/admin/coordination/run-sla-sweep')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(allowed.status).toBe(200);
    expect(allowed.body.success).toBe(true);
  });

  it('17. Desks are linked into a parent chain for escalation', () => {
    const policeDesks = db.prepare('SELECT * FROM institution_desks WHERE institution_id = ?').all('ghana-police-service') as any[];
    const national = policeDesks.find((d) => d.level === 'NATIONAL');
    const regional = policeDesks.find((d) => d.level === 'REGIONAL');
    const district = policeDesks.find((d) => d.level === 'DISTRICT');

    expect(national).toBeTruthy();
    expect(regional.parent_desk_id).toBe(national.id);
    if (district) {
      expect(district.parent_desk_id).toBe(regional.id);
    }

    // Escalation target from a district desk is its regional parent
    if (district) {
      const target = CoordinationService.resolveEscalationTarget('ghana-police-service', district.id);
      expect(target.id).toBe(regional.id);
    }
    // Escalation target from the national desk falls back to itself (top of ladder)
    const top = CoordinationService.resolveEscalationTarget('ghana-police-service', national.id);
    expect(top.id).toBe(national.id);
  });

  it('18. Internal handoff moves ownership and mirrors back to the source desk', async () => {
    const desks = await request(app).get('/api/institutions/ghana-police-service/desks');
    const national = desks.body.find((d: any) => d.level === 'NATIONAL');
    const regional = desks.body.find((d: any) => d.level === 'REGIONAL');
    expect(national).toBeTruthy();
    expect(regional).toBeTruthy();

    // Find the inbox item created for the citizen report at the Police national desk
    const item = db.prepare('SELECT * FROM institutional_inbox_items WHERE post_id = ? AND mirror_of_item_id IS NULL')
      .get(reportId) as any;
    expect(item).toBeTruthy();

    // Move it to the regional desk
    const res = await request(app)
      .post('/api/institutions/ghana-police-service/desks/handoff')
      .set('Authorization', `Bearer ${policeToken}`)
      .send({ inboxItemId: item.id, toDeskId: regional.id, reason: 'Regional desk owns corridor operations.' });

    expect(res.status).toBe(201);
    expect(res.body.handoff.toDeskId).toBe(regional.id);
    expect(res.body.handoff.notifiedOfficers).toBeGreaterThanOrEqual(1);

    const after = db.prepare('SELECT * FROM institutional_inbox_items WHERE id = ?').get(item.id) as any;
    expect(after.desk_id).toBe(regional.id);

    // A read-only mirror exists for the source desk
    const mirror = db.prepare('SELECT * FROM institutional_inbox_items WHERE mirror_of_item_id = ?').get(item.id) as any;
    expect(mirror).toBeTruthy();
    expect(mirror.institution_id).toBe('ghana-police-service');
  });

  it('19. Mirrors are read-only and stay in sync with the source state', async () => {
    const source = db.prepare('SELECT * FROM institutional_inbox_items WHERE post_id = ? AND mirror_of_item_id IS NULL')
      .get(reportId) as any;
    const mirror = db.prepare('SELECT * FROM institutional_inbox_items WHERE mirror_of_item_id = ?').get(source.id) as any;
    expect(mirror).toBeTruthy();

    // Acting on the mirror is rejected
    const denied = await request(app)
      .post(`/api/institutions/ghana-police-service/inbox/${mirror.id}/transition`)
      .set('Authorization', `Bearer ${policeToken}`)
      .send({ targetState: 'UNDER_REVIEW' });
    expect(denied.status).toBe(500);

    // Acting on the source propagates to the mirror
    const ok = await request(app)
      .post(`/api/institutions/ghana-police-service/inbox/${source.id}/transition`)
      .set('Authorization', `Bearer ${policeToken}`)
      .send({ targetState: 'UNDER_REVIEW' });
    expect(ok.status).toBe(200);

    const mirrorAfter = db.prepare('SELECT action_state FROM institutional_inbox_items WHERE id = ?').get(mirror.id) as any;
    expect(mirrorAfter.action_state).toBe('UNDER_REVIEW');
  });

  it('20. Assigning an officer attaches an official and notifies them', async () => {
    const item = db.prepare('SELECT * FROM institutional_inbox_items WHERE post_id = ? AND mirror_of_item_id IS NULL')
      .get(reportId) as any;

    const res = await request(app)
      .post(`/api/institutions/ghana-police-service/inbox/${item.id}/assign`)
      .set('Authorization', `Bearer ${policeToken}`)
      .send({ officerUserId: 'user-inst-police', notes: 'Please coordinate with the regional desk.' });

    expect(res.status).toBe(200);
    expect(res.body.assignment.officerUserId).toBe('user-inst-police');

    const after = db.prepare('SELECT * FROM institutional_inbox_items WHERE id = ?').get(item.id) as any;
    expect(after.assigned_officer_user_id).toBe('user-inst-police');
    expect(after.assigned_at).toBeTruthy();

    const notified = db.prepare(`
      SELECT COUNT(*) as c FROM notifications
      WHERE user_id = 'user-inst-police' AND type = 'WORK_ITEM_ASSIGNED'
    `).get() as any;
    expect(notified.c).toBeGreaterThanOrEqual(1);

    // An officer from another institution cannot be assigned
    const foreign = await request(app)
      .post(`/api/institutions/ghana-police-service/inbox/${item.id}/assign`)
      .set('Authorization', `Bearer ${policeToken}`)
      .send({ officerUserId: 'user-inst-nadmo' });
    expect(foreign.status).toBe(400);
  });

  it('21. Escalation climbs the desk ladder and alerts oversight at level 2', async () => {
    const desks = await request(app).get('/api/institutions/ghana-police-service/desks');
    const national = desks.body.find((d: any) => d.level === 'NATIONAL');

    // Ensure an admin exists to receive oversight alerts
    const now = new Date().toISOString();
    db.prepare(`
      INSERT OR REPLACE INTO users (id, email, password_hash, name, handle, role, is_verified, followers_count, created_at, updated_at)
      VALUES ('admin-1', 'admin@gov.gh', 'hash', 'Platform Admin', 'platform_admin', 'ADMIN', 1, 0, ?, ?)
    `).run(now, now);

    const item = db.prepare('SELECT * FROM institutional_inbox_items WHERE post_id = ? AND mirror_of_item_id IS NULL')
      .get(reportId) as any;

    // Move the item to the national desk so the only escalation path is a specialist/self
    db.prepare('UPDATE institutional_inbox_items SET desk_id = ?, escalation_level = 1 WHERE id = ?').run(national.id, item.id);

    // Level 1 -> 2 via explicit specialist target if available, otherwise the national desk is top.
    const specialist = desks.body.find((d: any) => d.level === 'SPECIALIST');
    if (specialist) {
      const res = await request(app)
        .post(`/api/institutions/ghana-police-service/inbox/${item.id}/escalate`)
        .set('Authorization', `Bearer ${policeToken}`)
        .send({ reason: 'Needs specialist intervention.', toDeskId: specialist.id });

      expect(res.status).toBe(200);
      expect(res.body.escalation.escalationLevel).toBe(2);
      expect(res.body.escalation.oversightNotified).toBeGreaterThanOrEqual(1);

      const oversight = db.prepare(`
        SELECT COUNT(*) as c FROM notifications
        WHERE user_id = 'admin-1' AND type = 'WORK_ITEM_ESCALATED_OVERSIGHT'
      `).get() as any;
      expect(oversight.c).toBeGreaterThanOrEqual(1);
    } else {
      const res = await request(app)
        .post(`/api/institutions/ghana-police-service/inbox/${item.id}/escalate`)
        .set('Authorization', `Bearer ${policeToken}`)
        .send({ reason: 'Top of ladder.' });
      expect([200, 400]).toContain(res.status);
    }
  });

  it('22. SLA sweep auto-escalates breached work up the ladder and is idempotent', () => {
    const item = db.prepare('SELECT * FROM institutional_inbox_items WHERE post_id = ? AND mirror_of_item_id IS NULL')
      .get(reportId) as any;

    // Put the item on a district/regional desk with a breached deadline
    const desks = db.prepare('SELECT * FROM institution_desks WHERE institution_id = ?').all('ghana-police-service') as any[];
    const regional = desks.find((d) => d.level === 'REGIONAL');
    const national = desks.find((d) => d.level === 'NATIONAL');

    db.prepare(`
      UPDATE institutional_inbox_items
      SET desk_id = ?, due_at = ?, sla_notified_at = NULL, escalation_level = 0,
          action_state = 'NEW', mirror_of_item_id = NULL
      WHERE id = ?
    `).run(regional.id, new Date(Date.now() - 3600_000).toISOString(), item.id);

    const before = (db.prepare('SELECT COUNT(*) as c FROM coordination_delegations').get() as any).c;
    const sweep = CoordinationService.runSlaSweep();
    expect(sweep.ladderEscalations).toBeGreaterThanOrEqual(1);

    const after = db.prepare('SELECT * FROM institutional_inbox_items WHERE id = ?').get(item.id) as any;
    expect(after.escalation_level).toBeGreaterThanOrEqual(1);
    expect(after.desk_id).toBe(national.id);

    const delegationsAfter = (db.prepare('SELECT COUNT(*) as c FROM coordination_delegations').get() as any).c;
    expect(delegationsAfter).toBeGreaterThan(before);

    // Second immediate sweep must not escalate again (fresh SLA window + dedupe)
    const sweep2 = CoordinationService.runSlaSweep();
    expect(sweep2.ladderEscalations).toBe(0);
  });

  it('23. Publishing an official response advances the institution inbox work item', async () => {
    // A fresh tagged report so this test owns its inbox item
    const created = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        title: `Response loop test ${Date.now()}`,
        content: 'Refuse has not been collected on this stretch for two weeks.',
        category: 'Sanitation & Waste',
        urgency: 'HIGH',
        severity: 'SEVERE',
        location: { region: 'Greater Accra', district: 'Accra Metropolitan' },
        institutionTags: [{ institutionId: 'ghana-police-service' }]
      });
    const postId = created.body.id || created.body.post?.id;

    const before = db.prepare('SELECT * FROM institutional_inbox_items WHERE post_id = ? AND mirror_of_item_id IS NULL')
      .get(postId) as any;
    expect(before.action_state).toBe('NEW');

    const resp = await request(app)
      .post(`/api/posts/${postId}/response`)
      .set('Authorization', `Bearer ${policeToken}`)
      .send({
        institutionId: 'ghana-police-service',
        responseType: 'ACTION_TAKEN',
        message: 'A cleanup team has been dispatched and the site cleared.'
      });
    expect(resp.status).toBe(201);

    const after = db.prepare('SELECT * FROM institutional_inbox_items WHERE post_id = ? AND mirror_of_item_id IS NULL')
      .get(postId) as any;
    expect(after.action_state).toBe('ACTION_REPORTED');

    const post = db.prepare('SELECT accountability_status FROM posts WHERE id = ?').get(postId) as any;
    expect(post.accountability_status).toBe('ACTION_IN_PROGRESS');
  });

  const adminToken = jwt.sign(
    { id: 'admin-1', email: 'admin@gov.gh', name: 'Admin', role: 'ADMIN' },
    config.jwtSecret,
    { expiresIn: '1h' }
  );

  it('24. Opening a joint case binds several institutions with a lead and notified participants', async () => {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT OR REPLACE INTO users (id, email, password_hash, name, handle, role, is_verified, followers_count, created_at, updated_at)
      VALUES ('admin-1', 'admin@gov.gh', 'hash', 'Platform Admin', 'platform_admin', 'ADMIN', 1, 0, ?, ?)
    `).run(now, now);

    const res = await request(app)
      .post('/api/admin/coordination/cases')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Odawna flooding — coordinated multi-agency response',
        summary: 'Drainage, policing and disaster response all have a role in clearing the corridor.',
        priority: 'URGENT',
        region: 'Greater Accra',
        district: 'Accra Metropolitan',
        leadInstitutionId: 'ghana-police-service',
        participants: [{ institutionId: 'nadmo-ghana', role: 'SUPPORTING', responsibility: 'Deploy disaster response desk' }]
      });

    expect(res.status).toBe(201);
    const caseRow = res.body.case;
    expect(caseRow.id).toBeTruthy();
    expect(caseRow.status).toBe('OPEN');
    expect(caseRow.lead_institution_id).toBe('ghana-police-service');

    // Both institutions are participants; the lead is marked LEAD
    const participants = db.prepare('SELECT * FROM coordination_case_participants WHERE case_id = ?').all(caseRow.id) as any[];
    expect(participants.length).toBe(2);
    const lead = participants.find((p) => p.institution_id === 'ghana-police-service');
    expect(lead.role).toBe('LEAD');
    const supporting = participants.find((p) => p.institution_id === 'nadmo-ghana');
    expect(supporting.role).toBe('SUPPORTING');
    expect(supporting.status).toBe('INVITED');

    // The lead is notified, and the event trail records creation
    const events = db.prepare('SELECT * FROM coordination_case_events WHERE case_id = ?').all(caseRow.id) as any[];
    expect(events.some((e) => e.event_type === 'CASE_CREATED')).toBe(true);
  });

  it('25. A participant accepts then completes its part; the case becomes ACTIVE', async () => {
    const caseRow = db.prepare("SELECT * FROM coordination_cases WHERE title LIKE 'Odawna%' LIMIT 1").get() as any;
    expect(caseRow).toBeTruthy();

    const accept = await request(app)
      .post(`/api/joint-cases/${caseRow.id}/respond`)
      .set('Authorization', `Bearer ${nadmoToken}`)
      .send({ status: 'ACCEPTED', note: 'NADMO taking the disaster response lead.' });
    expect(accept.status).toBe(200);
    expect(accept.body.status).toBe('ACCEPTED');

    const afterAccept = db.prepare('SELECT status FROM coordination_cases WHERE id = ?').get(caseRow.id) as any;
    expect(afterAccept.status).toBe('ACTIVE');

    const complete = await request(app)
      .post(`/api/joint-cases/${caseRow.id}/respond`)
      .set('Authorization', `Bearer ${nadmoToken}`)
      .send({ status: 'COMPLETED', note: 'Corridor cleared.' });
    expect(complete.status).toBe(200);

    const participant = db.prepare('SELECT * FROM coordination_case_participants WHERE case_id = ? AND institution_id = ?')
      .get(caseRow.id, 'nadmo-ghana') as any;
    expect(participant.status).toBe('COMPLETED');
    expect(participant.completed_at).toBeTruthy();
  });

  it('26. A non-participant institution cannot read a joint case', async () => {
    const caseRow = db.prepare("SELECT * FROM coordination_cases WHERE title LIKE 'Odawna%' LIMIT 1").get() as any;
    const outsiderToken = jwt.sign(
      { id: 'user-inst-outsider', email: 'outsider@agency.gov.gh', name: 'Outsider', role: 'INSTITUTION_REP', institutionId: 'ghana-water-company' },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    const denied = await request(app)
      .get(`/api/joint-cases/${caseRow.id}`)
      .set('Authorization', `Bearer ${outsiderToken}`);
    expect(denied.status).toBe(403);

    const allowed = await request(app)
      .get(`/api/joint-cases/${caseRow.id}`)
      .set('Authorization', `Bearer ${nadmoToken}`);
    expect(allowed.status).toBe(200);
    expect(allowed.body.participants.length).toBe(2);
  });

  it('27. Resolving a joint case notifies participants and the reporter, and marks the report resolved', async () => {
    // Attach a fresh report to the case so the citizen notification has a target
    const created = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        title: `Joint case linked report ${Date.now()}`,
        content: 'Standing water continues to threaten the Odawna corridor.',
        category: 'Flooding & Drainage',
        urgency: 'HIGH',
        severity: 'SEVERE',
        location: { region: 'Greater Accra', district: 'Accra Metropolitan' },
        institutionTags: [{ institutionId: 'ghana-police-service' }]
      });
    const postId = created.body.id || created.body.post?.id;

    const opened = await request(app)
      .post('/api/admin/coordination/cases')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: `Joint resolve test ${Date.now()}`,
        postId,
        priority: 'URGENT',
        region: 'Greater Accra',
        district: 'Accra Metropolitan',
        leadInstitutionId: 'ghana-police-service',
        participants: [{ institutionId: 'nadmo-ghana' }]
      });
    const caseId = opened.body.case.id;

    const resolved = await request(app)
      .post(`/api/admin/coordination/cases/${caseId}/resolve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ resolutionSummary: 'Corridor drained and reopened by joint task force.' });

    expect(resolved.status).toBe(200);
    expect(resolved.body.case.status).toBe('RESOLVED');
    expect(resolved.body.case.resolution_summary).toContain('reopened');

    const post = db.prepare('SELECT workflow_stage, accountability_status FROM posts WHERE id = ?').get(postId) as any;
    expect(post.workflow_stage).toBe('RESOLVED');
    expect(post.accountability_status).toBe('RESOLVED');

    // A citizen-facing notification was queued for the reporter
    const citizenNotice = db.prepare(`
      SELECT COUNT(*) as c FROM notifications WHERE post_id = ? AND type LIKE 'REPORT_%'
    `).get(postId) as any;
    expect(citizenNotice.c).toBeGreaterThanOrEqual(1);
  });

  it('28. Failed alert deliveries can be listed and re-dispatched by an administrator', async () => {
    // Force a tag into a FAILED state with a matching attempt row
    const tag = db.prepare('SELECT * FROM post_institution_tags LIMIT 1').get() as any;
    expect(tag).toBeTruthy();
    const key = `alert-${tag.post_id}-${tag.institution_id}`;
    db.prepare("UPDATE post_institution_tags SET alert_status = 'FAILED' WHERE id = ?").run(tag.id);
    db.prepare(`
      INSERT INTO alert_attempts (id, idempotency_key, post_id, institution_id, channel_type, recipient, status, attempt_number, retry_count, error_message, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'EMAIL', 'desk@gov.gh', 'FAILED', 1, 0, 'SMTP timeout', ?, ?)
      ON CONFLICT(idempotency_key) DO UPDATE SET status = 'FAILED', error_message = 'SMTP timeout', updated_at = excluded.updated_at
    `).run(`att-test-${tag.id}`, key, tag.post_id, tag.institution_id, new Date().toISOString(), new Date().toISOString());

    const listDenied = await request(app)
      .get('/api/admin/alerts/failed')
      .set('Authorization', `Bearer ${policeToken}`);
    expect(listDenied.status).toBe(403);

    const list = await request(app)
      .get('/api/admin/alerts/failed')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(list.status).toBe(200);
    expect(list.body.items.some((i: any) => i.tag_id === tag.id)).toBe(true);

    const redispatchDenied = await request(app)
      .post(`/api/admin/alerts/${tag.id}/redispatch`)
      .set('Authorization', `Bearer ${policeToken}`);
    expect(redispatchDenied.status).toBe(403);

    const redispatch = await request(app)
      .post(`/api/admin/alerts/${tag.id}/redispatch`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(redispatch.status).toBe(200);
    expect(redispatch.body.previousStatus).toBe('FAILED');
    expect(redispatch.body.status).toBeTruthy();

    // The attempt records that a retry was pushed
    const attempt = db.prepare('SELECT retry_count FROM alert_attempts WHERE idempotency_key = ?').get(key) as any;
    expect(attempt.retry_count).toBeGreaterThanOrEqual(1);

    // The action is captured in the immutable audit trail
    const audit = db.prepare("SELECT COUNT(*) as c FROM audit_logs WHERE event_type = 'ALERT_REDISPATCHED' AND target_id = ?")
      .get(tag.id) as any;
    expect(audit.c).toBeGreaterThanOrEqual(1);

    // The audit trail endpoint surfaces the privileged action to oversight
    const trail = await request(app)
      .get('/api/admin/audit-trail?eventType=ALERT_REDISPATCHED')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(trail.status).toBe(200);
    expect(trail.body.items.some((e: any) => e.target_id === tag.id)).toBe(true);

    const trailDenied = await request(app)
      .get('/api/admin/audit-trail')
      .set('Authorization', `Bearer ${citizenToken}`);
    expect(trailDenied.status).toBe(403);
  });

  it('29. The unified operations queue merges live work from every source', async () => {
    const res = await request(app)
      .get('/api/admin/coordination/queue?limit=200')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);

    // Every item is derived from a real record: its id is namespaced by source.
    const prefixFor: Record<string, string> = {
      INBOX_ITEM: 'inbox',
      DELEGATION: 'delegation',
      JOINT_CASE: 'case',
      ALERT: 'alert',
      ABUSE_REPORT: 'abuse',
      MODERATION: 'moderation'
    };
    for (const item of res.body.items) {
      expect(prefixFor[item.source]).toBeTruthy();
      expect(item.id.startsWith(`${prefixFor[item.source]}:`)).toBe(true);
      expect(typeof item.severity).toBe('string');
      expect(['BREACHED', 'URGENT', 'DUE_SOON', 'ON_TRACK', 'INFO']).toContain(item.severity);
    }

    // The queue must be ordered by severity: no BREACHED item appears after a lower rank.
    const rank: Record<string, number> = { BREACHED: 0, URGENT: 1, DUE_SOON: 2, ON_TRACK: 3, INFO: 4 };
    const severities = res.body.items.map((i: any) => rank[i.severity]);
    const sorted = [...severities].sort((a, b) => a - b);
    expect(severities).toEqual(sorted);

    // Summary counts must reconcile with the returned items.
    const summary = res.body.summary;
    expect(summary.total).toBeGreaterThanOrEqual(res.body.items.length);
    const summed = ['BREACHED', 'URGENT', 'DUE_SOON', 'ON_TRACK', 'INFO'].reduce(
      (acc, k) => acc + (summary[k] || 0),
      0
    );
    expect(summed).toBe(summary.total);
  });

  it('30. The queue surfaces the routed inbox item created for the seeded report', async () => {
    const res = await request(app)
      .get('/api/admin/coordination/queue?source=INBOX_ITEM&limit=200')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.items.every((i: any) => i.source === 'INBOX_ITEM')).toBe(true);

    const item = res.body.items.find((i: any) => i.postId === reportId);
    expect(item).toBeTruthy();
    expect(item.institutionId).toBe('ghana-police-service');
    expect(item.dueAt).toBeTruthy();
  });

  it('31. Queue severity filtering returns only the requested band', async () => {
    const res = await request(app)
      .get('/api/admin/coordination/queue?severity=URGENT&limit=200')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.items.every((i: any) => i.severity === 'URGENT')).toBe(true);
  });

  it('32. The operations queue is denied to citizens and granted to moderators', async () => {
    const denied = await request(app)
      .get('/api/admin/coordination/queue')
      .set('Authorization', `Bearer ${citizenToken}`);
    expect(denied.status).toBe(403);

    const moderatorToken = jwt.sign(
      { id: 'mod-1', email: 'mod@gov.gh', name: 'Moderator', role: 'MODERATOR' },
      config.jwtSecret,
      { expiresIn: '1h' }
    );
    const allowed = await request(app)
      .get('/api/admin/coordination/queue')
      .set('Authorization', `Bearer ${moderatorToken}`);
    expect(allowed.status).toBe(200);
  });
});
