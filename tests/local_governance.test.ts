import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../server/app';
import { db, initDatabase } from '../server/database/db';
import { seedDatabaseIfEmpty, seedCoordinationHierarchy } from '../server/seedDatabase';
import { CoordinationService } from '../server/modules/coordination/CoordinationService';
import { InstitutionalInboxService } from '../server/modules/institutional-inbox/InstitutionalInboxService';
import { MMDA_REGIONS, GHANA_MMDA_BY_REGION } from '../shared/ghanaMmda';
import { config } from '../server/config';

const app = createApp();

const token = (id: string, role: string, institutionId?: string, name = 'Desk Officer') =>
  jwt.sign({ id, email: `${id}@speakup.gov.gh`, name, handle: id, role, institutionId }, config.jwtSecret, { expiresIn: '1h' });

describe('Local Governance: national → regional → MMDA desk elevation', () => {
  const policeToken = token('user-inst-police', 'INSTITUTION_REP', 'ghana-police-service', 'GPS Desk');
  const ghsToken = token('user-inst-ghs', 'INSTITUTION_REP', 'ghs-health', 'GHS Desk');
  const citizenToken = token('user-current', 'CITIZEN', undefined, 'Kofi Mensah');
  const outsiderToken = token('user-inst-epa', 'INSTITUTION_REP', 'epa-ghana', 'EPA Desk');

  beforeAll(async () => {
    initDatabase();
    await seedDatabaseIfEmpty();

    const now = new Date().toISOString();
    for (const u of [
      { id: 'user-inst-police', institutionId: 'ghana-police-service', name: 'Ghana Police Desk' },
      { id: 'user-inst-ghs', institutionId: 'ghs-health', name: 'Ghana Health Service Desk' },
      { id: 'user-inst-epa', institutionId: 'epa-ghana', name: 'EPA Desk' }
    ]) {
      db.prepare(`
        INSERT OR REPLACE INTO users (id, email, password_hash, name, handle, role, is_verified, followers_count, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'INSTITUTION_REP', 1, 0, ?, ?)
      `).run(u.id, `${u.id}@speakup.gov.gh`, 'test-hash', u.name, u.id, now, now);
    }

    seedCoordinationHierarchy();
  });

  it('1. Seeded metropolitan desks carry the MMDA tier and a supervisory parent', () => {
    const desks = CoordinationService.listDesks('ghana-police-service');
    const levels = desks.map((d: any) => d.level);
    expect(levels).toContain('METROPOLITAN');

    const metro = desks.find((d: any) => d.level === 'METROPOLITAN');
    expect(metro.mmda_code).toBeTruthy();
    // Metropolitan sits under the regional command, which sits under national.
    const parent = desks.find((d: any) => d.id === metro.parent_desk_id);
    expect(parent?.level).toBe('REGIONAL');
    expect(parent?.parent_desk_id).toBeTruthy();
  });

  it('2. Local-tier resolution prefers the most specific standing desk', () => {
    const desk = CoordinationService.resolveDeskForLocation('ghana-police-service', {
      region: 'Greater Accra',
      district: 'Accra Metropolitan'
    });
    expect(desk?.level).toBe('METROPOLITAN');

    const regional = CoordinationService.resolveDeskForLocation('ghana-police-service', {
      region: 'Greater Accra',
      district: 'Nowhere District'
    });
    expect(regional?.level).toBe('REGIONAL');
  });

  it('3. An ON_CALL desk that is not mobilised is skipped in favour of the regional desk', () => {
    // GHS has an on-call Accra Metropolitan desk with no mmda_code set.
    const notMobilised = CoordinationService.resolveDeskForLocation('ghs-health', {
      region: 'Greater Accra',
      district: 'Accra Metropolitan'
    });
    expect(notMobilised?.level).toBe('REGIONAL');

    // Once mobilised (mmda_code assigned), it becomes the primary desk.
    const ghsDesk = CoordinationService.listDesks('ghs-health')
      .find((d: any) => d.district === 'Accra Metropolitan') as any;
    db.prepare('UPDATE institution_desks SET mmda_code = ? WHERE id = ?').run('AMA', ghsDesk.id);

    const mobilised = CoordinationService.resolveDeskForLocation('ghs-health', {
      region: 'Greater Accra',
      district: 'Accra Metropolitan'
    });
    expect(mobilised?.id).toBe(ghsDesk.id);

    db.prepare('UPDATE institution_desks SET mmda_code = NULL WHERE id = ?').run(ghsDesk.id);
  });

  it('4. Report creation routes to the local desk and fans out to the supervisory chain', async () => {
    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        title: `Local governance routing report ${Date.now()}`,
        content: 'Uncollected refuse is piling up at the Accra Metropolitan market and blocking the access road.',
        category: 'Sanitation & Waste',
        urgency: 'HIGH',
        severity: 'SEVERE',
        location: { region: 'Greater Accra', district: 'Accra Metropolitan' },
        institutionTags: [{ institutionId: 'ghana-police-service' }]
      });
    expect(res.status).toBe(201);
    const postId = res.body.id;

    const item = db.prepare(`
      SELECT * FROM institutional_inbox_items WHERE post_id = ? AND institution_id = 'ghana-police-service'
    `).get(postId) as any;
    expect(item).toBeTruthy();

    const routes = InstitutionalInboxService.listRoutes(item.id);
    const primary = routes.find((r) => r.routing_role === 'PRIMARY');
    expect(primary?.desk_level).toBe('METROPOLITAN');

    // The regional and national desks are informed as supporting sub-units.
    const supportingLevels = routes.filter((r) => r.routing_role === 'SUPPORTING').map((r) => r.desk_level);
    expect(supportingLevels).toContain('REGIONAL');
    expect(supportingLevels).toContain('NATIONAL');
  });

  it('5. Coverage reports standing, on-call and gap districts for a region', async () => {
    const res = await request(app)
      .get('/api/institutions/ghana-police-service/routing-coverage?region=Greater%20Accra')
      .set('Authorization', `Bearer ${policeToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.localDesks)).toBe(true);
    expect(res.body.coveredDistricts).toContain('Accra Metropolitan');
    expect(res.body.nationalDesk?.level).toBe('NATIONAL');
    expect(res.body.regionalDesk?.level).toBe('REGIONAL');
  });

  it('6. A national desk mobilises a local desk for a gap district and adopts its backlog', async () => {
    // A report lands on the regional desk because the district has no local desk yet.
    const district = `Ga East Municipal ${Date.now()}`;
    const report = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        title: `Mobilisation test report ${Date.now()}`,
        content: 'A broken drainage culvert is flooding the school compound in the district.',
        category: 'Flooding & Drainage',
        urgency: 'URGENT',
        severity: 'SEVERE',
        location: { region: 'Greater Accra', district },
        institutionTags: [{ institutionId: 'ghana-police-service' }]
      });
    expect(report.status).toBe(201);

    const before = db.prepare(`
      SELECT i.id, d.level FROM institutional_inbox_items i
      JOIN institution_desks d ON d.id = i.desk_id
      WHERE i.post_id = ? AND i.institution_id = 'ghana-police-service'
    `).get(report.body.id) as any;
    expect(before.level).toBe('REGIONAL');

    // The institution mobilises a local desk for the district.
    const mobilise = await request(app)
      .post('/api/institutions/ghana-police-service/desks/mobilise')
      .set('Authorization', `Bearer ${policeToken}`)
      .send({ region: 'Greater Accra', district, level: 'MUNICIPAL', coverageMode: 'STANDING' });
    expect(mobilise.status).toBe(201);
    expect(mobilise.body.created).toBe(true);
    expect(mobilise.body.adoptedItemIds).toContain(before.id);

    // The new desk is linked under the regional command.
    const newDesk = CoordinationService.listDesks('ghana-police-service')
      .find((d: any) => d.district === district) as any;
    expect(newDesk.level).toBe('MUNICIPAL');
    const parent = db.prepare('SELECT level FROM institution_desks WHERE id = ?').get(newDesk.parent_desk_id) as any;
    expect(parent.level).toBe('REGIONAL');

    // The report has been re-homed onto the new local desk.
    const after = db.prepare('SELECT desk_id FROM institutional_inbox_items WHERE id = ?').get(before.id) as any;
    expect(after.desk_id).toBe(newDesk.id);

    // Exactly one desk owns the work: the old regional PRIMARY became SUPPORTING.
    const routes = InstitutionalInboxService.listRoutes(before.id);
    const primaries = routes.filter((r) => r.routing_role === 'PRIMARY');
    expect(primaries).toHaveLength(1);
    expect(primaries[0].desk_id).toBe(newDesk.id);
  });

  it('7. Mobilising is scoped to the acting institution and validated', async () => {
    const forbidden = await request(app)
      .post('/api/institutions/ghana-police-service/desks/mobilise')
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send({ region: 'Greater Accra', district: 'Some District' });
    expect([403, 404]).toContain(forbidden.status);

    const badRequest = await request(app)
      .post('/api/institutions/ghana-police-service/desks/mobilise')
      .set('Authorization', `Bearer ${policeToken}`)
      .send({ region: 'Greater Accra' });
    expect(badRequest.status).toBe(400);
  });

  it('8. The routing trail is exposed per work item and scoped', async () => {
    const item = db.prepare(`
      SELECT id FROM institutional_inbox_items WHERE institution_id = 'ghana-police-service' LIMIT 1
    `).get() as any;

    const res = await request(app)
      .get(`/api/institutions/ghana-police-service/inbox/${item.id}/routes`)
      .set('Authorization', `Bearer ${policeToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);

    const missing = await request(app)
      .get('/api/institutions/ghana-police-service/inbox/does-not-exist/routes')
      .set('Authorization', `Bearer ${policeToken}`);
    expect(missing.status).toBe(404);
  });

  it('9. The MMDA reference registry is exposed for the rollout picker', async () => {
    const res = await request(app)
      .get('/api/reference/mmda')
      .set('Authorization', `Bearer ${policeToken}`);
    expect(res.status).toBe(200);
    expect(res.body.regions).toContain('Greater Accra');
    expect(res.body.byRegion['Greater Accra'].some((a: any) => a.code === 'GAR-AMA')).toBe(true);

    const scoped = await request(app)
      .get('/api/reference/mmda?region=Ashanti')
      .set('Authorization', `Bearer ${policeToken}`);
    expect(scoped.status).toBe(200);
    expect(scoped.body.assemblies.some((a: any) => a.code === 'ASH-KMA')).toBe(true);

    const unauth = await request(app).get('/api/reference/mmda');
    expect(unauth.status).toBe(401);
  });

  it('10. National rollout provisions national → regional → MMDA in one action', async () => {
    const res = await request(app)
      .post('/api/institutions/ghs-health/desks/provision')
      .set('Authorization', `Bearer ${ghsToken}`)
      .send({ regions: [{ region: 'Ashanti', mmdaCodes: ['ASH-KMA', 'ASH-OMA'], coverageMode: 'STANDING' }] });

    expect(res.status).toBe(201);
    expect(res.body.created).toBeGreaterThan(0);

    const desks = CoordinationService.listDesks('ghs-health');
    const metro = desks.find((d: any) => d.mmda_code === 'ASH-KMA');
    expect(metro?.level).toBe('METROPOLITAN');
    expect(metro?.region).toBe('Ashanti');
    // The new local desk hangs off the Ashanti regional desk.
    const parent = desks.find((d: any) => d.id === metro?.parent_desk_id);
    expect(parent?.level).toBe('REGIONAL');
    expect(parent?.region).toBe('Ashanti');
    // Unticked assemblies in the region are not created.
    expect(desks.some((d: any) => d.mmda_code === 'ASH-BOK')).toBe(false);
  });

  it('11. Rollout is idempotent — re-running only reports skips', async () => {
    const first = await request(app)
      .post('/api/institutions/ghs-health/desks/provision')
      .set('Authorization', `Bearer ${ghsToken}`)
      .send({ regions: [{ region: 'Ashanti', mmdaCodes: ['ASH-KMA'], coverageMode: 'STANDING' }] });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post('/api/institutions/ghs-health/desks/provision')
      .set('Authorization', `Bearer ${ghsToken}`)
      .send({ regions: [{ region: 'Ashanti', mmdaCodes: ['ASH-KMA'], coverageMode: 'STANDING' }] });
    expect(second.status).toBe(201);
    expect(second.body.created).toBe(0);
    expect(second.body.skipped).toBeGreaterThan(0);

    // No duplicate desk was created for the same assembly.
    const count = db.prepare(`
      SELECT COUNT(*) AS n FROM institution_desks WHERE institution_id = 'ghs-health' AND mmda_code = 'ASH-KMA'
    `).get() as any;
    expect(count.n).toBe(1);
  });

  it('12. Rollout is scoped to the acting institution and validated', async () => {
    const forbidden = await request(app)
      .post('/api/institutions/ghana-police-service/desks/provision')
      .set('Authorization', `Bearer ${ghsToken}`)
      .send({ regions: [{ region: 'Volta' }] });
    expect([403, 404]).toContain(forbidden.status);

    const empty = await request(app)
      .post('/api/institutions/ghs-health/desks/provision')
      .set('Authorization', `Bearer ${ghsToken}`)
      .send({ regions: [] });
    expect(empty.status).toBe(400);
  });

  it('14. The routing chain cascades downward so local MMDA desks are informed', async () => {
    const district = 'Accra Metropolitan';
    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        title: `Cascade awareness report ${Date.now()}`,
        content: 'Illegal dumping is recurring behind the Accra Metropolitan assembly offices.',
        category: 'Sanitation & Waste',
        urgency: 'NORMAL',
        severity: 'MODERATE',
        location: { region: 'Greater Accra', district },
        institutionTags: [{ institutionId: 'ghana-police-service' }]
      });
    expect(res.status).toBe(201);

    const item = db.prepare(`
      SELECT * FROM institutional_inbox_items WHERE post_id = ? AND institution_id = 'ghana-police-service'
    `).get(res.body.id) as any;
    expect(item).toBeTruthy();

    const routes = InstitutionalInboxService.listRoutes(item.id);
    // The accountable desk owns the work exactly once.
    expect(routes.filter((r) => r.routing_role === 'PRIMARY')).toHaveLength(1);
    // The supervisory chain above is kept aware...
    const supporting = routes.filter((r) => r.routing_role === 'SUPPORTING').map((r) => r.desk_level);
    expect(supporting).toContain('REGIONAL');
    expect(supporting).toContain('NATIONAL');
    // ...and any sibling local desk in the region is informed (FYI), never a second owner.
    for (const r of routes.filter((x) => x.routing_role === 'INFORMED')) {
      expect(['METROPOLITAN', 'MUNICIPAL', 'DISTRICT']).toContain(r.desk_level);
      expect(r.desk_id).not.toBe(item.desk_id);
    }
  });

  it('15. An MMDA desk with a phone is alerted directly on that line', async () => {
    const desk = CoordinationService.listDesks('ghana-police-service')
      .find((d: any) => d.level === 'METROPOLITAN') as any;
    expect(desk).toBeTruthy();

    // Give the desk a field number but no channel row, to prove the SMS fallback.
    db.prepare('UPDATE institution_desks SET contact_phone = ? WHERE id = ?').run('+233200000001', desk.id);

    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        title: `Desk alert reach report ${Date.now()}`,
        content: 'Streetlights are out along the main road in the Accra Metropolitan area.',
        category: 'Security & Safety',
        urgency: 'HIGH',
        severity: 'SEVERE',
        location: { region: 'Greater Accra', district: 'Accra Metropolitan' },
        institutionTags: [{ institutionId: 'ghana-police-service' }]
      });
    expect(res.status).toBe(201);

    // The background worker is not started under test, so exercise the real
    // dispatch path directly, exactly as the worker would.
    const { InstitutionAlertService } = await import('../server/alerts/alertEngine');
    await InstitutionAlertService.dispatchAlert(res.body.id, 'ghana-police-service', desk.id);

    const alert = db.prepare(`
      SELECT * FROM alerts WHERE post_id = ? AND institution_id = 'ghana-police-service' AND desk_id = ?
    `).get(res.body.id, desk.id) as any;
    expect(alert).toBeTruthy();
    expect(alert.channel_type).toBe('SMS');
  });

  it('16. Admin coordination analytics expose the national supervision picture', async () => {
    const adminToken = token('admin-user-1', 'ADMIN', undefined, 'System Admin');
    const res = await request(app)
      .get('/api/admin/coordination/analytics')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);

    expect(res.body.funnel).toBeTruthy();
    expect(Array.isArray(res.body.funnel.regions)).toBe(true);
    expect(res.body.funnel.totals).toHaveProperty('reported');

    expect(res.body.backlog).toBeTruthy();
    expect(Array.isArray(res.body.backlog.tiers)).toBe(true);

    expect(res.body.coverage.totals.total).toBe(261);

    expect(res.body.delegations).toBeTruthy();
    expect(typeof res.body.delegations.acceptanceRate).toBe('number');
  });

  it('17. A multi-agency report auto-opens a joint coordination case, idempotently', async () => {
    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        title: `Joint response report ${Date.now()}`,
        content: 'A burst water main is flooding the road and the school; multiple agencies are needed.',
        category: 'Flooding & Drainage',
        urgency: 'CRITICAL',
        severity: 'EMERGENCY',
        location: { region: 'Greater Accra', district: 'Accra Metropolitan' },
        institutionTags: [
          { institutionId: 'ghana-police-service' },
          { institutionId: 'ghs-health' }
        ]
      });
    expect(res.status).toBe(201);

    const cases = db.prepare('SELECT * FROM coordination_cases WHERE post_id = ?').all(res.body.id) as any[];
    expect(cases).toHaveLength(1);
    expect(cases[0].status).not.toBe('CLOSED');

    const participants = db.prepare('SELECT * FROM coordination_case_participants WHERE case_id = ?').all(cases[0].id) as any[];
    const institutionIds = participants.map((p) => p.institution_id);
    expect(institutionIds).toContain('ghana-police-service');
    expect(institutionIds).toContain('ghs-health');

    // Re-running the auto-open for the same report must not create a second case.
    const { JointCaseService } = await import('../server/modules/coordination/JointCaseService');
    const again = JointCaseService.autoOpenForReport({
      postId: res.body.id,
      institutionIds: ['ghana-police-service', 'ghs-health'],
      title: 'Re-run'
    });
    expect(again?.created).toBe(false);
    expect(again?.caseId).toBe(cases[0].id);
  });

  it('18. Advancing a work item keeps its linked delegation in step', async () => {
    const desk = CoordinationService.listDesks('ghana-police-service')
      .find((d: any) => d.level === 'METROPOLITAN') as any;
    const item = db.prepare(`
      SELECT * FROM institutional_inbox_items
      WHERE institution_id = 'ghana-police-service' AND action_state = 'NEW'
        AND mirror_of_item_id IS NULL
      ORDER BY created_at DESC LIMIT 1
    `).get() as any;
    expect(item).toBeTruthy();

    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO coordination_delegations
        (id, post_id, from_institution_id, to_institution_id, delegation_type, status, priority, reason, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'ESCALATION', 'PENDING', 'ELEVATED', 'test', ?, ?)
    `).run('del-projection-test', item.post_id, 'ghs-health', 'ghana-police-service', now, now);
    db.prepare('UPDATE institutional_inbox_items SET delegation_id = ? WHERE id = ?').run('del-projection-test', item.id);

    const step = (targetState: string, notes?: string) =>
      request(app)
        .post(`/api/institutions/ghana-police-service/inbox/${item.id}/transition`)
        .set('Authorization', `Bearer ${policeToken}`)
        .send({ targetState, notes });

    // NEW -> ACKNOWLEDGED accepts the delegation.
    expect((await step('ACKNOWLEDGED')).status).toBe(200);
    let delegation = db.prepare('SELECT * FROM coordination_delegations WHERE id = ?').get('del-projection-test') as any;
    expect(delegation.status).toBe('ACCEPTED');

    // Walk the legal path to RESOLVED and watch the delegation complete.
    expect((await step('UNDER_REVIEW')).status).toBe(200);
    expect((await step('PUBLIC_RESPONSE')).status).toBe(200);
    expect((await step('RESOLVED', 'Resolved and verified on site.')).status).toBe(200);

    delegation = db.prepare('SELECT * FROM coordination_delegations WHERE id = ?').get('del-projection-test') as any;
    expect(delegation.status).toBe('COMPLETED');
    expect(delegation.completed_at).toBeTruthy();
  });

  it('13. The MMDA registry is the complete 261-assembly national register', () => {
    expect(MMDA_REGIONS).toHaveLength(16);

    const all = MMDA_REGIONS.flatMap((r) => GHANA_MMDA_BY_REGION[r]);
    expect(all).toHaveLength(261);

    // Codes are unique and non-empty across the whole register.
    const codes = all.map((a) => a.code);
    expect(new Set(codes).size).toBe(261);

    // 13 metropolitan assemblies: the six original metros plus the 2024 upgrades.
    const metros = all.filter((a) => a.tier === 'METROPOLITAN').map((a) => a.name);
    expect(metros).toHaveLength(13);
    for (const expected of [
      'Accra Metropolitan', 'Tema Metropolitan', 'Kumasi Metropolitan',
      'Tamale Metropolitan', 'Cape Coast Metropolitan', 'Sekondi Takoradi Metropolitan',
      'Sunyani Metropolitan', 'Techiman Metropolitan', 'Gomoa East Metropolitan',
      'Kpone-Katamanso Metropolitan', 'New Juaben South Metropolitan',
      'Wa Metropolitan', 'Ho Metropolitan'
    ]) {
      expect(metros).toContain(expected);
    }

    // Every entry carries a usable name and a valid tier.
    for (const a of all) {
      expect(a.name.length).toBeGreaterThan(3);
      expect(['METROPOLITAN', 'MUNICIPAL', 'DISTRICT']).toContain(a.tier);
    }
  });
});
