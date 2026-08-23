import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../server/app';
import { db, initDatabase } from '../server/database/db';
import { seedDatabaseIfEmpty } from '../server/seedDatabase';
import { InstitutionRoutingService } from '../server/services/InstitutionRoutingService';
import { AlertOrchestrator } from '../server/alerts/AlertOrchestrator';
import { ChannelHealthMonitor } from '../server/alerts/ChannelHealthMonitor';
import { EscalationEngine } from '../server/alerts/EscalationEngine';
import { WhatsAppAdapter } from '../server/alerts/adapters/WhatsAppAdapter';

const app = createApp();

describe('Multi-Channel Institutional Alerting & Engagement Engine Test Suite', () => {
  let testPostId: string;
  let testInstId: string = 'ghana-police-service';

  beforeAll(async () => {
    initDatabase();
    await seedDatabaseIfEmpty();

    testPostId = `post-alert-test-${Date.now()}`;
    const now = new Date().toISOString();

    // Ensure test institution exists
    db.prepare(`
      INSERT INTO institutions (id, official_name, short_name, acronym, mandate, category, jurisdiction, alert_method, created_at)
      VALUES ('ghana-police-service', 'Ghana Police Service', 'Police', 'GPS', 'Law Enforcement', 'Public Safety & Security', 'NATIONAL', 'OFFICIAL_EMAIL', ?)
      ON CONFLICT DO NOTHING
    `).run(now);

    db.prepare(`
      INSERT INTO institutions (id, official_name, short_name, acronym, mandate, category, jurisdiction, alert_method, created_at)
      VALUES ('nadmo', 'National Disaster Management Organisation', 'NADMO', 'NADMO', 'Disaster & Flooding Response', 'Flooding & Drainage', 'NATIONAL', 'OFFICIAL_EMAIL', ?)
      ON CONFLICT DO NOTHING
    `).run(now);

    // Ensure test post exists
    db.prepare(`
      INSERT INTO posts (id, title, content, author_id, author_name, author_handle, category, urgency, region, district, created_at, updated_at)
      VALUES (?, 'Major Road Blockade on Kumasi Highway', 'Oil spill blocking all lanes near Suame roundabout.', 'user-current', 'Kofi Citizen', '@kofi', 'Infrastructure & Roads', 'CRITICAL', 'Ashanti', 'Kumasi Metropolitan', ?, ?)
    `).run(testPostId, now, now);
  });

  it('1. InstitutionRoutingService dynamically resolves candidates into tier categories', () => {
    const candidates = InstitutionRoutingService.resolveResponsibleInstitutions(
      'Flooding & Drainage',
      'Greater Accra',
      'Accra Metropolitan',
      'Severe Flooding near Odaw River',
      'Water levels rising fast into homes.'
    );

    expect(candidates.length).toBeGreaterThan(0);
    const primary = candidates.find(c => c.tier === 'PRIMARY');
    expect(primary).toBeDefined();
    expect(['NADMO', 'GPS', 'GHA', 'ECG', 'GWCL']).toContain(primary?.acronym);
  });

  it('2. WhatsAppAdapter formats concise alerts and parses inbound ACK commands', () => {
    const adapter = new WhatsAppAdapter();
    const event = adapter.handleWebhook({
      text: 'ACK GH-000124',
      alertId: 'alt-123'
    });

    expect(event.eventType).toBe('INBOUND_COMMAND');
    expect(event.command).toBe('ACK');
  });

  it('3. AlertOrchestrator dispatches alerts with multi-tier priority', async () => {
    const result = await AlertOrchestrator.orchestrateAlert(testPostId, testInstId);

    expect(['SENT', 'DELIVERED', 'FAILED', 'NOT_CONFIGURED']).toContain(result.status);

    // Verify alert attempt recorded
    const attempts = db.prepare('SELECT * FROM alert_attempts WHERE post_id = ?').all(testPostId) as any[];
    expect(attempts.length).toBeGreaterThan(0);
  });

  it('4. AlertOrchestrator handles inbound two-way interactive ACK commands', () => {
    const res = AlertOrchestrator.handleInboundCommand(testPostId, testInstId, 'ACK', 'Inspector Mensah');

    expect(res.success).toBe(true);
    expect(res.status).toBe('ACKNOWLEDGED');

    const post = db.prepare('SELECT accountability_status FROM posts WHERE id = ?').get(testPostId) as any;
    expect(post.accountability_status).toBe('ACKNOWLEDGED');
  });

  it('5. ChannelHealthMonitor checks health across channels and resolves operational fallback', async () => {
    const healthResults = await ChannelHealthMonitor.checkAllChannels();
    expect(healthResults.length).toBeGreaterThan(0);

    const resolved = ChannelHealthMonitor.resolveOperationalChannel(testInstId);
    expect(resolved).toBeDefined();
  });

  it('6. EscalationEngine generates defensible factual public status timelines', () => {
    const timeline = EscalationEngine.getDefensiblePublicTimeline(testPostId);

    expect(timeline).toBeDefined();
    expect(timeline.accountabilityStatus).toBe('ACKNOWLEDGED');
    expect(timeline.publicStatement).toContain('Acknowledged by institution');
  });

  it('7. REST API: Inbound WhatsApp webhook processes ACK command', async () => {
    const res = await request(app)
      .post('/api/alerts/webhook/whatsapp')
      .send({
        text: `ACK ${testPostId}`,
        institutionId: testInstId
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('SUCCESS');
    expect(res.body.reply).toContain('recorded as ACKNOWLEDGED');
  });
});
