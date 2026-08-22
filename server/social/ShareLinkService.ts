import { db } from '../database/db';
import { SocialPlatform } from './types';

export class ShareLinkService {
  /**
   * Generates or retrieves a short referral tracking code for a post/response/creator/platform combo
   */
  static generateReferralCode(
    postId: string,
    responseId?: string,
    creatorId?: string,
    platform: SocialPlatform = 'whatsapp',
    campaign: string = 'creator-share'
  ): { code: string; shortUrl: string; canonicalUrl: string } {
    const baseUrl = process.env.PUBLIC_BASE_URL || 'https://speakup.gh';

    // Generate a deterministic short 6-char hash
    const rawInput = `${postId}_${responseId || ''}_${creatorId || 'anon'}_${platform}_${campaign}`;
    let hash = 0;
    for (let i = 0; i < rawInput.length; i++) {
      hash = (hash << 5) - hash + rawInput.charCodeAt(i);
      hash |= 0;
    }
    const code = Math.abs(hash).toString(36).slice(0, 6) || Math.random().toString(36).substring(2, 8);

    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO creator_referrals (code, creator_id, post_id, response_id, platform, campaign, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(code) DO UPDATE SET created_at = excluded.created_at
    `).run(code, creatorId || null, postId, responseId || null, platform, campaign, now);

    const shortUrl = `${baseUrl}/s/${code}`;
    const targetPath = responseId ? `/post/${postId}?responseId=${responseId}` : `/post/${postId}`;
    const canonicalUrl = `${baseUrl}${targetPath}`;

    return { code, shortUrl, canonicalUrl };
  }

  /**
   * Resolves a short referral code to target post and response
   */
  static resolveCode(code: string): { postId: string; responseId?: string; creatorId?: string; platform: string; campaign: string } | null {
    const row = db.prepare('SELECT * FROM creator_referrals WHERE code = ?').get(code) as any;
    if (!row) return null;
    return {
      postId: row.post_id,
      responseId: row.response_id || undefined,
      creatorId: row.creator_id || undefined,
      platform: row.platform,
      campaign: row.campaign
    };
  }
}
