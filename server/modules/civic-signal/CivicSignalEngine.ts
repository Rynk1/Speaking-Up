import crypto from 'crypto';
import { db } from '../../database/db';
import { OutboxService } from '../../infrastructure/events/OutboxService';
import { logger } from '../../shared/logger';

export interface SignalComponents {
  publicInterestSignal: {
    amplifications: number;
    shares: number;
    views: number;
    velocityScore: number; // rate of amplification in last 6 hours
  };
  confirmationSignal: {
    firstHandConfirmations: number;
    localDistrictConfirmations: number;
    credibilityMultiplier: number;
  };
  evidenceSignal: {
    independentReportCount: number;
    verifiedMediaCount: number;
    communityUpdatesCount: number;
    hasInstitutionalAcknowledgement: boolean;
  };
  temporalSignal: {
    hoursElapsed: number;
    isPersistent: boolean;
    activityRecencyScore: number;
  };
  geographicSignal: {
    region: string;
    district: string;
    isHotspot: boolean;
    districtReportDensity: number;
  };
}

export interface CalculatedPriority {
  priorityScore: number; // 0 - 100
  priorityBand: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  priorityFactors: {
    severityWeight: number;
    confirmationWeight: number;
    evidenceWeight: number;
    geographicDensityWeight: number;
    temporalUrgencyWeight: number;
    publicInterestWeight: number;
    acknowledgementBonus: number;
  };
  priorityVersion: string;
  calculatedAt: string;
  components: SignalComponents;
}

export class CivicSignalEngine {
  public static readonly VERSION = 'v2.0';
  private static SALT = process.env.IP_HASH_SALT || 'speakup-civic-signal-engine-2026';

  public static hashIp(ip: string): string {
    return crypto.createHash('sha256').update(`${ip}-${this.SALT}`).digest('hex');
  }

  /**
   * Computes independent signals and server-authoritative explainable Priority Score for a post
   */
  public static calculatePriority(postId: string): CalculatedPriority {
    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(postId) as any;
    if (!post) {
      throw new Error(`Post ${postId} not found for signal calculation.`);
    }

    const now = Date.now();
    const createdAtTime = new Date(post.created_at).getTime();
    const hoursElapsed = Math.max(0.1, (now - createdAtTime) / (1000 * 3600));

    // 1. Gather raw counts
    const confirmations = db.prepare('SELECT * FROM confirmations WHERE post_id = ?').all(postId) as any[];
    const amplifications = db.prepare('SELECT * FROM amplifications WHERE post_id = ?').all(postId) as any[];
    const evidenceItems = db.prepare('SELECT * FROM community_evidence WHERE post_id = ?').all(postId) as any[];
    const mediaItems = db.prepare('SELECT * FROM media WHERE post_id = ?').all(postId) as any[];
    const responses = db.prepare('SELECT * FROM institution_responses WHERE post_id = ?').all(postId) as any[];

    // 2. Geographic density: count reports in same district in last 7 days
    const sevenDaysAgo = new Date(now - 7 * 24 * 3600 * 1000).toISOString();
    const districtDensityRow = db.prepare(`
      SELECT COUNT(*) as count FROM posts
      WHERE district = ? AND region = ? AND created_at >= ?
    `).get(post.district, post.region, sevenDaysAgo) as any;
    const districtReportDensity = districtDensityRow?.count || 1;

    // 3. Signal Components
    // A. Public-interest amplification (never proof of truth, measures spread)
    const ampCount = amplifications.length || post.reposts_count || 0;
    const shareCount = post.shares_count || 0;
    const viewsCount = post.views_count || 1;
    const velocityScore = Math.min(1.0, (ampCount + shareCount * 1.5) / Math.max(1, hoursElapsed));

    // B. First-hand confirmation (Seen Too)
    const firstHandConfirmations = confirmations.length || post.confirmations_count || 0;
    // Confirmations from the same geographic region get higher weight
    const localConfirmations = Math.floor(firstHandConfirmations * 0.7);
    const credibilityMultiplier = post.is_verified_citizen ? 1.2 : 1.0;

    // C. Evidence signal
    const verifiedMediaCount = mediaItems.length;
    const communityUpdatesCount = evidenceItems.length;
    const hasInstitutionalAcknowledgement = responses.length > 0 || post.accountability_status === 'ACKNOWLEDGED';

    // D. Temporal signal
    const isPersistent = hoursElapsed > 24 && (communityUpdatesCount > 0 || firstHandConfirmations > 3);
    const recencyDecay = Math.exp(-0.015 * Math.min(168, hoursElapsed));
    const activityRecencyScore = Math.min(1.0, (1.0 / (1.0 + hoursElapsed / 12.0)));

    // E. Geographic signal
    const isHotspot = districtReportDensity >= 4;

    const components: SignalComponents = {
      publicInterestSignal: {
        amplifications: ampCount,
        shares: shareCount,
        views: viewsCount,
        velocityScore
      },
      confirmationSignal: {
        firstHandConfirmations,
        localDistrictConfirmations: localConfirmations,
        credibilityMultiplier
      },
      evidenceSignal: {
        independentReportCount: 1, // At post level; situation level computes aggregate
        verifiedMediaCount,
        communityUpdatesCount,
        hasInstitutionalAcknowledgement
      },
      temporalSignal: {
        hoursElapsed,
        isPersistent,
        activityRecencyScore
      },
      geographicSignal: {
        region: post.region,
        district: post.district,
        isHotspot,
        districtReportDensity
      }
    };

    // 4. Server-Authoritative Formula Weighting
    // Severity baseline (max 30 pts)
    let severityBase = 12;
    if (post.severity === 'EMERGENCY') severityBase = 30;
    else if (post.severity === 'SEVERE' || post.urgency === 'CRITICAL') severityBase = 24;
    else if (post.severity === 'MODERATE' || post.urgency === 'HIGH') severityBase = 16;
    else if (post.severity === 'INFORMATIONAL' || post.urgency === 'LOW') severityBase = 8;

    // First-hand confirmations (max 25 pts)
    const normConfirmations = Math.min(1.0, Math.log10(1 + firstHandConfirmations) / 1.6);
    const confirmationWeight = Math.round(normConfirmations * 25 * credibilityMultiplier);

    // Evidence backing (max 20 pts)
    const evidenceScoreRaw = (verifiedMediaCount * 6) + (communityUpdatesCount * 4);
    const evidenceWeight = Math.min(20, evidenceScoreRaw);

    // Geographic cluster density (max 10 pts)
    const geographicDensityWeight = Math.min(10, Math.round(Math.log10(1 + districtReportDensity) * 10));

    // Temporal urgency (max 10 pts)
    const temporalUrgencyWeight = Math.round(activityRecencyScore * 10);

    // Public interest amplification (capped strictly at max 5 pts - cannot dominate credibility)
    const normAmps = Math.min(1.0, Math.log10(1 + ampCount + shareCount) / 2.5);
    const publicInterestWeight = Math.round(normAmps * 5);

    // Institutional acknowledgement validation (bonus 5 pts if recognized by official authority)
    const acknowledgementBonus = hasInstitutionalAcknowledgement ? 5 : 0;

    const rawScore = severityBase + confirmationWeight + evidenceWeight + geographicDensityWeight + temporalUrgencyWeight + publicInterestWeight + acknowledgementBonus;
    const finalScore = Math.min(100, Math.max(5, rawScore));

    let priorityBand: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'MODERATE';
    if (finalScore >= 80) priorityBand = 'CRITICAL';
    else if (finalScore >= 60) priorityBand = 'HIGH';
    else if (finalScore >= 35) priorityBand = 'MODERATE';
    else priorityBand = 'LOW';

    const priorityFactors = {
      severityWeight: severityBase,
      confirmationWeight,
      evidenceWeight,
      geographicDensityWeight,
      temporalUrgencyWeight,
      publicInterestWeight,
      acknowledgementBonus
    };

    const calculatedAt = new Date().toISOString();

    // Persist server-side score and factors to post_signal_scores & posts
    try {
      db.prepare(`
        INSERT INTO post_signal_scores (
          post_id, severity_score, confidence_score, confirmation_count, amplification_count, evidence_count, ips_score, formula_version, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(post_id) DO UPDATE SET
          severity_score = excluded.severity_score,
          confidence_score = excluded.confidence_score,
          confirmation_count = excluded.confirmation_count,
          amplification_count = excluded.amplification_count,
          evidence_count = excluded.evidence_count,
          ips_score = excluded.ips_score,
          formula_version = excluded.formula_version,
          updated_at = excluded.updated_at
      `).run(
        postId,
        severityBase / 30,
        Math.min(1.0, (confirmationWeight + evidenceWeight) / 45),
        firstHandConfirmations,
        ampCount,
        communityUpdatesCount,
        finalScore,
        this.VERSION,
        calculatedAt
      );

      db.prepare(`
        UPDATE posts
        SET priority_score = ?, priority_band = ?
        WHERE id = ?
      `).run(finalScore, priorityBand, postId);
    } catch (err: any) {
      logger.error(`Error persisting priority score for post ${postId}: ${err.message}`);
    }

    return {
      priorityScore: finalScore,
      priorityBand,
      priorityFactors,
      priorityVersion: this.VERSION,
      calculatedAt,
      components
    };
  }

  /**
   * Records a user amplification (repost) with transactional outbox event
   */
  public static recordAmplification(postId: string, userId: string, ipAddress: string) {
    const ipHash = this.hashIp(ipAddress);
    const now = new Date().toISOString();

    const existing = db.prepare('SELECT id FROM amplifications WHERE post_id = ? AND user_id = ?').get(postId, userId) as any;
    let amplified = false;

    if (existing) {
      db.prepare('DELETE FROM amplifications WHERE post_id = ? AND user_id = ?').run(postId, userId);
      db.prepare('UPDATE posts SET reposts_count = MAX(0, reposts_count - 1) WHERE id = ?').run(postId);
      amplified = false;
    } else {
      const ampId = `amp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      db.prepare(`
        INSERT INTO amplifications (id, post_id, user_id, ip_hash, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(ampId, postId, userId, ipHash, now);
      db.prepare('UPDATE posts SET reposts_count = reposts_count + 1 WHERE id = ?').run(postId);
      amplified = true;
    }

    db.prepare('INSERT OR IGNORE INTO issue_followers (user_id, post_id) VALUES (?, ?)').run(userId, postId);

    const updatedPost = db.prepare('SELECT reposts_count FROM posts WHERE id = ?').get(postId) as any;
    const count = updatedPost?.reposts_count || 0;

    const priorityResult = this.calculatePriority(postId);

    OutboxService.enqueueEvent('post.amplified', 'POST', postId, {
      postId,
      userId,
      amplified,
      count,
      priorityScore: priorityResult.priorityScore,
      priorityBand: priorityResult.priorityBand
    });

    return { amplified, count, priorityScore: priorityResult.priorityScore, priorityBand: priorityResult.priorityBand };
  }

  /**
   * Records a first-hand citizen confirmation (Seen Too)
   */
  public static recordConfirmation(postId: string, userId: string, ipAddress: string) {
    const now = new Date().toISOString();
    const existing = db.prepare('SELECT id FROM confirmations WHERE post_id = ? AND user_id = ?').get(postId, userId) as any;
    let confirmed = false;

    if (existing) {
      db.prepare('DELETE FROM confirmations WHERE post_id = ? AND user_id = ?').run(postId, userId);
      db.prepare('UPDATE posts SET confirmations_count = MAX(0, confirmations_count - 1) WHERE id = ?').run(postId);
      confirmed = false;
    } else {
      const confId = `conf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      db.prepare(`
        INSERT INTO confirmations (id, post_id, user_id, created_at)
        VALUES (?, ?, ?, ?)
      `).run(confId, postId, userId, now);
      db.prepare('UPDATE posts SET confirmations_count = confirmations_count + 1 WHERE id = ?').run(postId);
      confirmed = true;
    }

    db.prepare('INSERT OR IGNORE INTO issue_followers (user_id, post_id) VALUES (?, ?)').run(userId, postId);

    const updatedPost = db.prepare('SELECT confirmations_count FROM posts WHERE id = ?').get(postId) as any;
    const count = updatedPost?.confirmations_count || 0;

    const priorityResult = this.calculatePriority(postId);

    OutboxService.enqueueEvent('post.confirmed', 'POST', postId, {
      postId,
      userId,
      confirmed,
      count,
      priorityScore: priorityResult.priorityScore,
      priorityBand: priorityResult.priorityBand
    });

    return { confirmed, count, priorityScore: priorityResult.priorityScore, priorityBand: priorityResult.priorityBand };
  }
}
