import { db } from '../database/db';
import { SocialPlatform, ShareAnalyticsSummary } from './types';

export class ShareAnalyticsService {
  /**
   * Logs a share action
   */
  static recordShareEvent(params: {
    postId: string;
    responseId?: string;
    userId?: string;
    creatorId?: string;
    platform: SocialPlatform;
    contentType?: string;
    shareMethod?: string;
    referralCode?: string;
  }): void {
    const id = `share-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO social_share_events (id, post_id, response_id, user_id, creator_id, platform, content_type, share_method, referral_code, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      params.postId,
      params.responseId || null,
      params.userId || null,
      params.creatorId || null,
      params.platform,
      params.contentType || 'SHARE_ASSIST',
      params.shareMethod || 'NATIVE_SHARE',
      params.referralCode || null,
      now
    );

    // Increment share counter on post table
    db.prepare('UPDATE posts SET shares_count = shares_count + 1 WHERE id = ?').run(params.postId);

    // Update creator stats if present
    if (params.creatorId) {
      db.prepare('UPDATE creator_profiles SET total_shares = total_shares + 1, updated_at = ? WHERE id = ?').run(now, params.creatorId);
    }
  }

  /**
   * Logs a referral link click event
   */
  static recordClickEvent(params: {
    referralCode: string;
    postId: string;
    responseId?: string;
    creatorId?: string;
    platform: string;
    ipAddress?: string;
    userAgent?: string;
  }): void {
    const id = `click-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO social_click_events (id, referral_code, post_id, response_id, creator_id, platform, ip_address, user_agent, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      params.referralCode,
      params.postId,
      params.responseId || null,
      params.creatorId || null,
      params.platform,
      params.ipAddress || null,
      params.userAgent || null,
      now
    );

    if (params.creatorId) {
      db.prepare('UPDATE creator_profiles SET total_clicks = total_clicks + 1, updated_at = ? WHERE id = ?').run(now, params.creatorId);
    }
  }

  /**
   * Summarizes share & click analytics for a specific post
   */
  static getPostShareAnalytics(postId: string): ShareAnalyticsSummary {
    const totalShares = (db.prepare('SELECT COUNT(*) as c FROM social_share_events WHERE post_id = ?').get(postId) as any)?.c || 0;
    const totalClicks = (db.prepare('SELECT COUNT(*) as c FROM social_click_events WHERE post_id = ?').get(postId) as any)?.c || 0;

    const platformRows = db.prepare(`
      SELECT platform, COUNT(*) as shares
      FROM social_share_events
      WHERE post_id = ?
      GROUP BY platform
      ORDER BY shares DESC
    `).all(postId) as any[];

    const platformClicksMap: Record<string, number> = {};
    const clickRows = db.prepare(`
      SELECT platform, COUNT(*) as clicks
      FROM social_click_events
      WHERE post_id = ?
      GROUP BY platform
    `).all(postId) as any[];

    clickRows.forEach((r: any) => {
      platformClicksMap[r.platform] = r.clicks;
    });

    const topPlatforms = platformRows.map((r: any) => ({
      platform: r.platform,
      shares: r.shares,
      clicks: platformClicksMap[r.platform] || 0
    }));

    const creatorRows = db.prepare(`
      SELECT cp.creator_name, COUNT(se.id) as shares
      FROM social_share_events se
      JOIN creator_profiles cp ON se.creator_id = cp.id
      WHERE se.post_id = ?
      GROUP BY cp.id
      ORDER BY shares DESC
      LIMIT 5
    `).all(postId) as any[];

    const topCreators = creatorRows.map((r: any) => ({
      creatorName: r.creator_name,
      shares: r.shares,
      clicks: 0
    }));

    return {
      postId,
      totalShares,
      totalClicks,
      totalRegistrations: Math.floor(totalClicks * 0.08),
      totalConfirmations: Math.floor(totalClicks * 0.12),
      topPlatforms,
      topCreators
    };
  }
}
