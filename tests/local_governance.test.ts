import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../server/app';
import { db, initDatabase } from '../server/database/db';
import { seedDatabaseIfEmpty, seedCoordinationHierarchy } from '../server/seedDatabase';
import { CoordinationService } from '../server/modules/coordination/CoordinationService';
import { InstitutionalInboxService } from '../server/modules/institutional-inbox/InstitutionalInboxService';
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
});
