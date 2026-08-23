import crypto from 'crypto';
import { db } from '../database/db';
import { eventBus } from '../events/eventBus';

export interface SignalScoreResult {
  postId: string;
  ipsScore: number;
  severityScore: number;
  confidenceScore: number;
  confirmationCount: number;
  amplificationCount: number;
  evidenceCount: number;
  formulaVersion: string;
  updatedAt: string;
}

export class CivicSignalService {
  private static SALT = process.env.IP_HASH_SALT || 'speakup-ghana-civic-salt-2025';

  /**
   * Hashes IP address for privacy-preserving risk and rate-limiting checks
   */
  public static hashIp(ip: string): string {
    return crypto.createHash('sha256').update(`${ip}-${this.SALT}`).digest('hex');
  }

  /**
   * Records an attributed amplification interaction with transactional consistency
   */
  public static recordAmplification(postId: string, userId: string, ipAddress: string): { amplified: boolean; count: number; ipsScore: number } {
    const ipHash = this.hashIp(ipAddress);
    const now = new Date().toISOString();

    const existing = db.prepare('SELECT id FROM amplifications WHERE post_id = ? AND user_id = ?').get(postId, userId) as any;

    let amplified = false;
    if (existing) {
      // Toggle off / Unamplify
      db.prepare('DELETE FROM amplifications WHERE post_id = ? AND user_id = ?').run(postId, userId);
      db.prepare('UPDATE posts SET reposts_count = MAX(0, reposts_count - 1) WHERE id = ?').run(postId);
      amplified = false;
    } else {
      // Amplify
      const ampId = `amp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      db.prepare(`
        INSERT INTO amplifications (id, post_id, user_id, ip_hash, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(ampId, postId, userId, ipHash, now);

      db.prepare('UPDATE posts SET reposts_count = reposts_count + 1 WHERE id = ?').run(postId);
      amplified = true;
    }

    // Auto-follow issue on interaction
    db.prepare(`
      INSERT OR IGNORE INTO issue_followers (user_id, post_id) VALUES (?, ?)
    `).run(userId, postId);

    const updatedPost = db.prepare('SELECT reposts_count FROM posts WHERE id = ?').get(postId) as any;
    const count = updatedPost?.reposts_count || 0;

    // Recalculate signal score
    const signalResult = this.calculateIPS(postId);

    // Emit event
    eventBus.emitReportEvent({
      reportId: postId,
      eventType: 'REPORT_AMPLIFIED',
      actorType: 'CITIZEN',
      actorId: userId,
      metadata: { amplified, count, ipsScore: signalResult.ipsScore }
    });

    return {
      amplified,
      count,
      ipsScore: signalResult.ipsScore
    };
  }

  /**
   * Records an independent citizen witness confirmation
   */
  public static recordConfirmation(postId: string, userId: string, ipAddress: string): { confirmed: boolean; count: number; ipsScore: number } {
    const now = new Date().toISOString();

    const existing = db.prepare('SELECT id FROM confirmations WHERE post_id = ? AND user_id = ?').get(postId, userId) as any;

    let confirmed = false;
    if (existing) {
      db.prepare('DELETE FROM confirmations WHERE post_id = ? AND user_id = ?').run(postId, userId);
      db.prepare('UPDATE posts SET confirmations_count = MAX(0, confirmations_count - 1) WHERE id = ?').run(postId);
      confirmed = false;
    } else {
      const confId = `conf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      db.prepare(`
        INSERT INTO confirmations (id, post_id, user_id, created_at)
        VALUES (?, ?, ?, ?)
      `).run(confId, postId, userId, now);

      db.prepare('UPDATE posts SET confirmations_count = confirmations_count + 1 WHERE id = ?').run(postId);
      confirmed = true;
    }

    // Auto-follow issue on interaction
    db.prepare(`
      INSERT OR IGNORE INTO issue_followers (user_id, post_id) VALUES (?, ?)
    `).run(userId, postId);

    const updatedPost = db.prepare('SELECT confirmations_count FROM posts WHERE id = ?').get(postId) as any;
    const count = updatedPost?.confirmations_count || 0;

    // Recalculate signal score
    const signalResult = this.calculateIPS(postId);

    eventBus.emitReportEvent({
      reportId: postId,
      eventType: 'REPORT_CONFIRMED',
      actorType: 'CITIZEN',
      actorId: userId,
      metadata: { confirmed, count, ipsScore: signalResult.ipsScore }
    });

    return {
      confirmed,
      count,
      ipsScore: signalResult.ipsScore
    };
  }

  /**
   * Calculates evidence-weighted Institutional Priority Score (IPS)
   */
  public static calculateIPS(postId: string): SignalScoreResult {
    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(postId) as any;
    if (!post) {
      throw new Error(`Post not found: ${postId}`);
    }

    const confirmationsCount = (db.prepare('SELECT COUNT(*) as c FROM confirmations WHERE post_id = ?').get(postId) as any)?.c || post.confirmations_count || 0;
    const amplificationsCount = (db.prepare('SELECT COUNT(*) as c FROM amplifications WHERE post_id = ?').get(postId) as any)?.c || post.reposts_count || 0;
    const evidenceCount = (db.prepare('SELECT COUNT(*) as c FROM community_evidence WHERE post_id = ?').get(postId) as any)?.c || 0;

    // Severity mapping
    let severityVal = 0.5;
    if (post.severity === 'CRITICAL') severityVal = 1.0;
    else if (post.severity === 'HIGH') severityVal = 0.8;
    else if (post.severity === 'MODERATE') severityVal = 0.5;
    else if (post.severity === 'LOW') severityVal = 0.3;

    // Confidence mapping based on verified media & author status
    let confidenceVal = 0.5;
    if (post.is_verified_citizen) confidenceVal += 0.2;
    let mediaCount = 0;
    try {
      mediaCount = (db.prepare('SELECT COUNT(*) as c FROM media WHERE post_id = ?').get(postId) as any)?.c || 0;
    } catch (e) {
      mediaCount = 0;
    }
    if (mediaCount > 0) confidenceVal += 0.2;
    confidenceVal = Math.min(1.0, confidenceVal);

    // Normalized signals
    const normConfirmations = Math.min(1.0, Math.log10(1 + confirmationsCount) / 2.0);
    const normAmplifications = Math.min(1.0, Math.log10(1 + amplificationsCount) / 3.0);
    const normEvidence = Math.min(1.0, Math.log10(1 + evidenceCount) / 1.5);

    // IPS Formula
    const rawIPS = (severityVal * 25) +
                   (confidenceVal * 20) +
                   (normConfirmations * 20) +
                   (normEvidence * 15) +
                   (normAmplifications * 10) + 10;

    // Recency decay factor (hours since creation)
    const hoursElapsed = Math.max(0, (Date.now() - new Date(post.created_at).getTime()) / (1000 * 3600));
    const recencyDecay = Math.exp(-0.01 * hoursElapsed);

    const finalIPS = Math.min(100, Math.max(0, Math.round(rawIPS * recencyDecay * 10) / 10));
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO post_signal_scores (
        post_id, severity_score, confidence_score, confirmation_count, amplification_count, evidence_count, ips_score, formula_version, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'v1.0', ?)
      ON CONFLICT(post_id) DO UPDATE SET
        severity_score = excluded.severity_score,
        confidence_score = excluded.confidence_score,
        confirmation_count = excluded.confirmation_count,
        amplification_count = excluded.amplification_count,
        evidence_count = excluded.evidence_count,
        ips_score = excluded.ips_score,
        updated_at = excluded.updated_at
    `).run(postId, severityVal, confidenceVal, confirmationsCount, amplificationsCount, evidenceCount, finalIPS, now);

    return {
      postId,
      ipsScore: finalIPS,
      severityScore: severityVal,
      confidenceScore: confidenceVal,
      confirmationCount: confirmationsCount,
      amplificationCount: amplificationsCount,
      evidenceCount: evidenceCount,
      formulaVersion: 'v1.0',
      updatedAt: now
    };
  }
}
