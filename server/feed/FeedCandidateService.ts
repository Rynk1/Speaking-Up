import { db } from '../database/db';
import { CivicSignalService } from '../services/CivicSignalService';

export interface FeedQueryOptions {
  mode?: 'important' | 'latest' | 'institution' | 'emergency';
  category?: string;
  region?: string;
  district?: string;
  institutionId?: string;
  page?: number;
  limit?: number;
}

export class FeedCandidateService {
  /**
   * Modular feed candidate pipeline: Eligibility -> Moderation Filtering -> Signal Calculation -> Ranking -> Pagination
   */
  public static getFeedCandidates(options: FeedQueryOptions = {}): { posts: any[]; total: number; page: number; totalPages: number } {
    const mode = options.mode || 'important';
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const offset = (page - 1) * limit;

    let baseSql = "FROM posts p LEFT JOIN post_signal_scores pss ON p.id = pss.post_id WHERE p.moderation_status = 'approved'";
    const params: any[] = [];

    // Category / Regional / District filters
    if (options.category && options.category !== 'ALL') {
      baseSql += ' AND p.category = ?';
      params.push(options.category);
    }
    if (options.region && options.region !== 'ALL') {
      baseSql += ' AND p.region = ?';
      params.push(options.region);
    }
    if (options.district && options.district !== 'ALL') {
      baseSql += ' AND p.district = ?';
      params.push(options.district);
    }

    // Mode-specific eligibility & ordering
    let orderBy = 'ORDER BY p.created_at DESC';

    if (mode === 'emergency') {
      baseSql += " AND (p.urgency IN ('CRITICAL', 'HIGH') OR p.severity IN ('EMERGENCY', 'SEVERE'))";
      orderBy = 'ORDER BY COALESCE(pss.ips_score, 50.0) DESC, p.created_at DESC';
    } else if (mode === 'institution') {
      if (options.institutionId) {
        baseSql += ' AND p.id IN (SELECT post_id FROM post_institution_tags WHERE institution_id = ?)';
        params.push(options.institutionId);
      }
      orderBy = 'ORDER BY p.created_at DESC';
    } else if (mode === 'important') {
      orderBy = 'ORDER BY COALESCE(pss.ips_score, 0.0) DESC, p.confirmations_count DESC, p.created_at DESC';
    } else {
      // mode === 'latest'
      orderBy = 'ORDER BY p.created_at DESC';
    }

    const countRow = db.prepare(`SELECT COUNT(DISTINCT p.id) as count ${baseSql}`).get(...params) as any;
    const total = countRow ? countRow.count : 0;

    const selectSql = `SELECT p.* ${baseSql} ${orderBy} LIMIT ? OFFSET ?`;
    const rows = db.prepare(selectSql).all(...params, limit, offset) as any[];

    return {
      posts: rows,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1
    };
  }
}
