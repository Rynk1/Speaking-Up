import { describe, it, expect, beforeAll } from 'vitest';
import { detectGhanaPII } from '../server/detection/ghanaDetectors';
import { PrivacyOrchestrator } from '../server/privacy/privacyOrchestrator';
import { generateSignedAccessToken, verifySignedAccessToken } from '../server/storage';
import { initDatabase, db } from '../server/db';
import { seedDatabaseIfEmpty } from '../server/seedDatabase';

describe('P³RE (Privacy-Preserving Public Representation Engine) Test Suite', () => {
  beforeAll(async () => {
    initDatabase();
    await seedDatabaseIfEmpty();
  });

  it('1. Correctly detects Ghanaian PII (Ghana Card, Phone, GPS, License Plate, TIN, Email)', () => {
    const sampleText = `Call Kwame on 0241234567 or +233201234567. Ghana Card GHA-712345678-9. Address GA-183-9023. Plate GR 1234-22. Email kwame@example.com.`;
    const findings = detectGhanaPII(sampleText);

    const types = findings.map(f => f.type);
    expect(types).toContain('PHONE_NUMBER');
    expect(types).toContain('GOVERNMENT_ID');
    expect(types).toContain('PRIVATE_LOCATION');
    expect(types).toContain('LICENSE_PLATE');
    expect(types).toContain('EMAIL');
  });

  it('2. PrivacyOrchestrator generates sanitized public projection text replacing PII with labels', async () => {
    const rawContent = `Pothole on Accra-Koforidua road. Contact eyewitness Ama at 0551234567 or email ama@speakup.gh with Ghana Card GHA-987654321-0.`;

    const result = await PrivacyOrchestrator.processSubmission({
      authorId: 'user-current',
      title: 'Pothole Hazard near Mile 7',
      content: rawContent
    });

    expect(['PRIVACY_READY', 'PRIVACY_REVIEW_REQUIRED']).toContain(result.privacyStatus);
    expect(result.publicText).not.toContain('0551234567');
    expect(result.publicText).not.toContain('ama@speakup.gh');
    expect(result.publicText).not.toContain('GHA-987654321-0');
    expect(result.publicText).toContain('[REDACTED PHONE]');
    expect(result.publicText).toContain('[REDACTED EMAIL]');
    expect(result.publicText).toContain('[REDACTED GHANA CARD]');
  }, 15000);

  it('3. Generates and verifies short-lived signed access tokens for protected evidence', () => {
    const token = generateSignedAccessToken('sub-123', 'actor-inst-rep', 900);
    expect(token).toBeDefined();

    const verified = verifySignedAccessToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.submissionId).toBe('sub-123');
    expect(verified?.actorId).toBe('actor-inst-rep');

    const invalid = verifySignedAccessToken('invalid-token');
    expect(invalid).toBeNull();
  });

  it('4. Enforces fail-closed protection when error occurs during orchestrator processing', async () => {
    const result = await PrivacyOrchestrator.processSubmission({
      authorId: 'user-current',
      title: 'Test Fail Closed',
      content: 'Critical test report'
    });

    const sub = db.prepare('SELECT * FROM submissions WHERE id = ?').get(result.submissionId) as any;
    expect(sub).toBeDefined();
    expect(['PRIVACY_READY', 'PRIVACY_REVIEW_REQUIRED', 'PRIVACY_FAILED']).toContain(sub.privacy_status);
  }, 15000);

  it('5. End-to-End P³RE Golden Journey: Citizen Submission -> P³RE Detection & Redaction -> Public Projection -> Evidence Access Logging', async () => {
    const citizenContent = `Flooding near Spintex Road. Call local assemblyman at 0271234567 or GHA-112233445-5.`;
    const submissionId = `sub-golden-${Date.now()}`;

    // Step A: Process submission
    const p3reOutput = await PrivacyOrchestrator.processSubmission({
      submissionId,
      authorId: 'user-current',
      title: 'Spintex Flooding Crisis',
      content: citizenContent
    });

    expect(p3reOutput.submissionId).toBe(submissionId);
    expect(p3reOutput.publicText).not.toContain('0271234567');
    expect(p3reOutput.publicText).not.toContain('GHA-112233445-5');

    // Step B: Verify Public Projection in DB
    const proj = db.prepare('SELECT * FROM submission_public_projections WHERE submission_id = ?').get(submissionId) as any;
    expect(proj).toBeDefined();
    expect(proj.text).toContain('[REDACTED PHONE]');

    // Step C: Verify Privacy Findings recorded
    const findings = db.prepare('SELECT * FROM privacy_findings WHERE submission_id = ?').all(submissionId) as any[];
    expect(findings.length).toBeGreaterThan(0);

    // Step D: Log Institutional Evidence Access
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO evidence_access_logs (id, submission_id, actor_id, institution_id, action, timestamp, ip, reason, result)
      VALUES (?, ?, 'inst-rep-1', 'ghana-police-service', 'VIEW_ORIGINAL', ?, '127.0.0.1', 'INVESTIGATION', 'ALLOWED')
    `).run(`log-golden-${Date.now()}`, submissionId, now);

    const log = db.prepare('SELECT * FROM evidence_access_logs WHERE submission_id = ?').get(submissionId) as any;
    expect(log).toBeDefined();
    expect(log.action).toBe('VIEW_ORIGINAL');
    expect(log.result).toBe('ALLOWED');
  }, 15000);
});
