import { db } from '../database/db';
import { searchPostsFts } from '../database/fts';

export interface SearchOptions {
  query: string;
  category?: string;
  region?: string;
  district?: string;
  limit?: number;
}

export class SearchService {
  /**
   * Search across posts, comments, institutions, and locations
   */
  public static searchAll(options: SearchOptions) {
    const q = options.query ? options.query.trim() : '';
    const limit = options.limit || 20;

    if (!q) {
      return { posts: [], comments: [], institutions: [] };
    }

    // 1. Post Search via FTS5 with SQL LIKE fallback
    const postIds = searchPostsFts(q, limit);
    let posts: any[] = [];
    if (postIds.length > 0) {
      const placeholders = postIds.map(() => '?').join(',');
      posts = db.prepare(`SELECT * FROM posts WHERE id IN (${placeholders})`).all(...postIds);
    }

    // 2. Comments Search
    const term = `%${q}%`;
    const comments = db.prepare(`
      SELECT c.*, p.title as post_title
      FROM comments c
      JOIN posts p ON c.post_id = p.id
      WHERE c.content LIKE ?
      ORDER BY c.created_at DESC
      LIMIT ?
    `).all(term, limit);

    // 3. Institutions Search
    const institutions = db.prepare(`
      SELECT * FROM institutions
      WHERE official_name LIKE ? OR short_name LIKE ? OR acronym LIKE ? OR mandate LIKE ?
      ORDER BY official_name ASC
      LIMIT ?
    `).all(term, term, term, term, limit);

    return {
      query: q,
      posts,
      comments,
      institutions
    };
  }
}
