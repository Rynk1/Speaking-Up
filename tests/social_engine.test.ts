import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../server/app';
import { db, initDatabase } from '../server/database/db';
import { SocialDistributionService } from '../server/social/SocialDistributionService';
import { ShareLinkService } from '../server/social/ShareLinkService';
import { ShareAnalyticsService } from '../server/social/ShareAnalyticsService';
import { PLATFORM_CAPABILITIES } from '../server/social/PlatformCapabilityRegistry';

const app = createApp();

describe('SpeakUp Social Distribution & Creator Amplification Engine (SSDE) Test Suite', () => {
  let testPostId: string;
  let testResponseId: string;

  beforeAll(() => {
    initDatabase();

    const now = new Date().toISOString();
    testPostId = `post-ssde-${Date.now()}`;
    testResponseId = `resp-ssde-${Date.now()}`;

    // Ensure test user exists
    const testUserId = `user-ssde-${Date.now()}`;
    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, handle, role, is_verified, created_at, updated_at)
      VALUES (?, ?, 'hash', 'Kwame Citizen', ?, 'CITIZEN', 1, ?, ?)
      ON CONFLICT DO NOTHING
    `).run(testUserId, `kwame_${Date.now()}@speakup.gh`, `@kwame_${Date.now()}`, now, now);

    // Seed test post
    db.prepare(`
      INSERT INTO posts (id, title, content, author_id, author_name, author_handle, category, urgency, region, district, confirmations_count, created_at, updated_at)
      VALUES (?, 'Bridge Collapse Hazard in Kumasi', 'Main commercial bridge support structure has cracked threatening commuters.', ?, 'Kwame Citizen', '@kwame_gh', 'Infrastructure & Roads', 'CRITICAL', 'Ashanti', 'Kumasi Metropolitan', 12, ?, ?)
    `).run(testPostId, testUserId, now, now);

    // Ensure test institution exists
    db.prepare(`
      INSERT INTO institutions (id, official_name, short_name, acronym, mandate, category, jurisdiction, alert_method, created_at)
      VALUES ('ghana-highway-authority', 'Ghana Highway Authority', 'GHA', 'GHA', 'Roads', 'ROADS_HIGHWAYS', 'NATIONAL', 'OFFICIAL_EMAIL', ?)
      ON CONFLICT DO NOTHING
    `).run(now);

    // Seed test institution tag
    db.prepare(`
      INSERT INTO post_institution_tags (id, post_id, institution_id, institution_name, short_name, acronym, alert_status, created_at)
      VALUES (?, ?, 'ghana-highway-authority', 'Ghana Highway Authority', 'GHA', 'GHA', 'SENT', ?)
    `).run(`tag-ssde-${Date.now()}`, testPostId, now);

    // Seed test official response
    db.prepare(`
      INSERT INTO institution_responses (id, post_id, institution_id, institution_name, response_type, message, statement_title, reference_number, responder_name, responder_title, official, verified, created_at)
      VALUES (?, ?, 'ghana-highway-authority', 'Ghana Highway Authority', 'ACTION_TAKEN', 'Emergency engineering team dispatched to inspect structural damage.', 'Immediate Bridge Safety Inspection Directive', 'GHA/REF/2026/08', 'Ing. Samuel Mensah', 'Chief Bridge Engineer', 1, 1, ?)
    `).run(testResponseId, testPostId, now);
  });

  it('1. Platform Capabilities Registry provides accurate support flags per platform', () => {
    expect(PLATFORM_CAPABILITIES.whatsapp.supportsImage).toBe(true);
    expect(PLATFORM_CAPABILITIES.youtube.displayName).toContain('YouTube');
    expect(PLATFORM_CAPABILITIES.tiktok.supportsDirectPublish).toBe(true);
    expect(PLATFORM_CAPABILITIES.x.maxCharacterLimit).toBe(280);
    expect(PLATFORM_CAPABILITIES.instagram.aspectRatios).toContain('9:16');
  });

  it('2. SocialDistributionService prepares Level 1 platform packages with legal disclosures', async () => {
    const pkg = await SocialDistributionService.prepareSharePackage({
      postId: testPostId,
      responseId: testResponseId,
      platform: 'youtube',
      creatorContext: 'reaction'
    });

    expect(pkg.headline).toContain('Ghana Highway Authority');
    expect(pkg.caption).toContain('Speak Up Ghana');
    expect(pkg.pinnedComment).toContain('Original report');
    expect(pkg.shortUrl).toContain('/s/');
    expect(pkg.disclosures?.citizenAllegationNote).toBeDefined();
    expect(pkg.disclosures?.officialStatusNote).toContain('GHA/REF/2026/08');
  });

  it('3. CreatorPackService builds Level 2 Creator Packs with scripts, quote cards, and file bundles', async () => {
    const pack = await SocialDistributionService.getCreatorPack({
      postId: testPostId,
      responseId: testResponseId,
      creatorContext: 'news'
    });

    expect(pack.headline).toContain('OFFICIAL STATEMENT');
    expect(pack.suggestedNarrationScript).toContain('[INTRO HOOK]');
    expect(pack.quoteCardContent.institution).toBe('Ghana Highway Authority');
    expect(pack.hashtags).toContain('#SpeakUpGhana');
    expect(pack.files.some(f => f.filename === 'README.txt')).toBe(true);
    expect(pack.files.some(f => f.filename === 'suggested-script.txt')).toBe(true);
    expect(pack.disclosures.creatorCommentaryDisclaimer).toContain('CREATOR COMMENTARY NOTICE');
  });

  it('4. ShareLinkService and ShareAnalyticsService track clicks and compile metrics', () => {
    const linkInfo = ShareLinkService.generateReferralCode(testPostId, testResponseId, 'creator-1', 'tiktok', 'test-campaign');
    expect(linkInfo.code.length).toBeGreaterThan(3);

    ShareAnalyticsService.recordShareEvent({
      postId: testPostId,
      responseId: testResponseId,
      creatorId: 'creator-1',
      platform: 'tiktok',
      contentType: 'CREATOR_PACK',
      referralCode: linkInfo.code
    });

    ShareAnalyticsService.recordClickEvent({
      referralCode: linkInfo.code,
      postId: testPostId,
      responseId: testResponseId,
      creatorId: 'creator-1',
      platform: 'tiktok',
      ipAddress: '127.0.0.1'
    });

    const metrics = ShareAnalyticsService.getPostShareAnalytics(testPostId);
    expect(metrics.totalShares).toBeGreaterThanOrEqual(1);
    expect(metrics.totalClicks).toBeGreaterThanOrEqual(1);
    expect(metrics.topPlatforms.some(p => p.platform === 'tiktok')).toBe(true);
  });

  it('5. REST Endpoints: /api/social/prepare, /api/social/creator-pack, /api/social/analytics and /s/:code redirect', async () => {
    // Test prepare endpoint
    const prepareRes = await request(app)
      .post('/api/social/prepare')
      .send({ postId: testPostId, platform: 'whatsapp', creatorContext: 'reaction' });

    expect(prepareRes.status).toBe(200);
    expect(prepareRes.body.caption).toContain('Bridge Collapse Hazard');
    expect(prepareRes.body.shortUrl).toBeDefined();

    // Test creator pack endpoint
    const packRes = await request(app)
      .post('/api/social/creator-pack')
      .send({ postId: testPostId, creatorContext: 'investigation' });

    expect(packRes.status).toBe(200);
    expect(packRes.body.suggestedNarrationScript).toBeDefined();

    // Test short URL redirect
    const code = prepareRes.body.shortUrl.split('/s/')[1];
    const redirectRes = await request(app).get(`/s/${code}`);
    expect(redirectRes.status).toBe(302);
    expect(redirectRes.header.location).toContain(`/app/post/${testPostId}`);

    // Test analytics endpoint
    const analyticsRes = await request(app).get(`/api/social/analytics/${testPostId}`);
    expect(analyticsRes.status).toBe(200);
    expect(analyticsRes.body.postId).toBe(testPostId);
  });
});
