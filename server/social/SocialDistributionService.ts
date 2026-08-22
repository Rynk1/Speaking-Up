import { db } from '../database/db';
import { SocialPlatform, CreatorContext, SocialSharePackage, CreatorPack, CreatorProfile } from './types';
import { PLATFORM_CAPABILITIES, getPlatformCapabilities } from './PlatformCapabilityRegistry';
import { SocialContentBuilder } from './SocialContentBuilder';
import { CreatorPackService } from './CreatorPackService';
import { ShareLinkService } from './ShareLinkService';
import { ShareAnalyticsService } from './ShareAnalyticsService';

export class SocialDistributionService {
  /**
   * Prepares a Level 1 / Level 2 social share package for a given post/response
   */
  static async prepareSharePackage(params: {
    postId: string;
    responseId?: string;
    platform: SocialPlatform;
    creatorContext?: CreatorContext;
    creatorId?: string;
    userId?: string;
  }): Promise<Partial<SocialSharePackage>> {
    const postRow = db.prepare('SELECT * FROM posts WHERE id = ?').get(params.postId) as any;
    if (!postRow) {
      throw new Error('Civic report post not found');
    }

    const tagsRows = db.prepare('SELECT * FROM post_institution_tags WHERE post_id = ?').all(params.postId) as any[];
    const mediaRows = db.prepare('SELECT * FROM media WHERE post_id = ?').all(params.postId) as any[];

    const post = {
      ...postRow,
      institutionTags: tagsRows.map(t => ({ shortName: t.short_name, acronym: t.acronym, institutionId: t.institution_id })),
      media: mediaRows
    };

    let response = null;
    if (params.responseId) {
      const r = db.prepare('SELECT * FROM institution_responses WHERE id = ?').get(params.responseId) as any;
      if (r) {
        response = {
          id: r.id,
          postId: r.post_id,
          institutionId: r.institution_id,
          institutionName: r.institution_name || r.institutionName,
          institutionLogo: r.institution_logo || r.institutionLogo,
          responseType: r.response_type || r.responseType,
          message: r.message,
          statementTitle: r.statement_title || r.statementTitle,
          fullStatement: r.full_statement || r.fullStatement,
          referenceNumber: r.reference_number || r.referenceNumber,
          resolutionStatus: r.resolution_status || r.resolutionStatus,
          responderName: r.responder_name || r.responderName,
          responderTitle: r.responder_title || r.responderTitle,
          official: Boolean(r.official),
          verified: Boolean(r.verified),
          createdAt: r.created_at
        };
      }
    }

    // Generate tracking short link
    const linkInfo = ShareLinkService.generateReferralCode(
      params.postId,
      params.responseId,
      params.creatorId,
      params.platform,
      'social-share'
    );

    const pkg = await SocialContentBuilder.buildPackage(
      params.platform,
      post,
      response,
      linkInfo.shortUrl,
      params.creatorContext || 'general'
    );

    // Save package in database cache
    const packageId = `pkg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO social_share_packages (id, post_id, response_id, platform, creator_context, package_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(packageId, params.postId, params.responseId || null, params.platform, params.creatorContext || 'general', JSON.stringify(pkg), now);

    return {
      id: packageId,
      ...pkg
    };
  }

  /**
   * Generates Level 2 Creator Pack
   */
  static async getCreatorPack(params: {
    postId: string;
    responseId?: string;
    creatorId?: string;
    creatorContext?: CreatorContext;
  }): Promise<CreatorPack> {
    const postRow = db.prepare('SELECT * FROM posts WHERE id = ?').get(params.postId) as any;
    if (!postRow) {
      throw new Error('Civic report post not found');
    }

    const tagsRows = db.prepare('SELECT * FROM post_institution_tags WHERE post_id = ?').all(params.postId) as any[];
    const mediaRows = db.prepare('SELECT * FROM media WHERE post_id = ?').all(params.postId) as any[];

    const post = {
      ...postRow,
      institutionTags: tagsRows.map(t => ({ shortName: t.short_name, acronym: t.acronym, institutionId: t.institution_id })),
      media: mediaRows
    };

    let response = null;
    if (params.responseId) {
      const r = db.prepare('SELECT * FROM institution_responses WHERE id = ?').get(params.responseId) as any;
      if (r) {
        response = {
          id: r.id,
          postId: r.post_id,
          institutionId: r.institution_id,
          institutionName: r.institution_name || r.institutionName,
          institutionLogo: r.institution_logo || r.institutionLogo,
          responseType: r.response_type || r.responseType,
          message: r.message,
          statementTitle: r.statement_title || r.statementTitle,
          fullStatement: r.full_statement || r.fullStatement,
          referenceNumber: r.reference_number || r.referenceNumber,
          resolutionStatus: r.resolution_status || r.resolutionStatus,
          responderName: r.responder_name || r.responderName,
          responderTitle: r.responder_title || r.responderTitle,
          official: Boolean(r.official),
          verified: Boolean(r.verified),
          createdAt: r.created_at
        };
      }
    }

    return CreatorPackService.buildCreatorPack(
      post,
      response,
      params.creatorId,
      params.creatorContext || 'general'
    );
  }

  /**
   * Creator Profile management
   */
  static registerCreatorProfile(params: {
    userId: string;
    creatorName: string;
    handle: string;
    primaryPlatform: string;
    platformLinks?: Record<string, string>;
  }): CreatorProfile {
    const creatorId = `creator-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO creator_profiles (id, user_id, creator_name, handle, primary_platform, platform_links_json, is_verified_creator, total_shares, total_clicks, total_conversions, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, 0, 0, 0, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        creator_name = excluded.creator_name,
        handle = excluded.handle,
        primary_platform = excluded.primary_platform,
        platform_links_json = excluded.platform_links_json,
        updated_at = excluded.updated_at
    `).run(
      creatorId,
      params.userId,
      params.creatorName,
      params.handle,
      params.primaryPlatform || 'YOUTUBE',
      JSON.stringify(params.platformLinks || {}),
      now,
      now
    );

    const row = db.prepare('SELECT * FROM creator_profiles WHERE user_id = ?').get(params.userId) as any;
    return {
      id: row.id,
      userId: row.user_id,
      creatorName: row.creator_name,
      handle: row.handle,
      primaryPlatform: row.primary_platform,
      platformLinks: JSON.parse(row.platform_links_json || '{}'),
      isVerifiedCreator: Boolean(row.is_verified_creator),
      totalShares: row.total_shares,
      totalClicks: row.total_clicks,
      totalConversions: row.total_conversions,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  static getCreatorProfileByUserId(userId: string): CreatorProfile | null {
    const row = db.prepare('SELECT * FROM creator_profiles WHERE user_id = ?').get(userId) as any;
    if (!row) return null;
    return {
      id: row.id,
      userId: row.user_id,
      creatorName: row.creator_name,
      handle: row.handle,
      primaryPlatform: row.primary_platform,
      platformLinks: JSON.parse(row.platform_links_json || '{}'),
      isVerifiedCreator: Boolean(row.is_verified_creator),
      totalShares: row.total_shares,
      totalClicks: row.total_clicks,
      totalConversions: row.total_conversions,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
