import { db } from './db';
import { logger } from '../shared/logger';

export function setupFullTextSearch() {
  try {
    // Create FTS5 virtual table for posts and comments
    db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS posts_fts USING fts5(
        post_id UNINDEXED,
        title,
        content,
        category,
        region,
        district,
        landmark,
        author_name,
        author_handle
      );
    `);

    // Re-index all posts into posts_fts
    const posts = db.prepare('SELECT id, title, content, category, region, district, landmark, author_name, author_handle FROM posts').all() as any[];
    db.prepare('DELETE FROM posts_fts').run();

    const insertFts = db.prepare(`
      INSERT INTO posts_fts (post_id, title, content, category, region, district, landmark, author_name, author_handle)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const p of posts) {
      insertFts.run(p.id, p.title, p.content, p.category, p.region, p.district, p.landmark || '', p.author_name, p.author_handle);
    }

    logger.info(`Full-Text Search (FTS5) index populated with ${posts.length} civic reports.`);
  } catch (err: any) {
    logger.error(`FTS setup note: ${err.message}`);
  }
}

export function searchPostsFts(query: string, limit: number = 50): string[] {
  if (!query || !query.trim()) return [];
  const cleanTerm = query.trim().replace(/['"]/g, '');
  try {
    const rows = db.prepare(`
      SELECT post_id FROM posts_fts WHERE posts_fts MATCH ? ORDER BY rank LIMIT ?
    `).all(`${cleanTerm}*`, limit) as any[];
    return rows.map(r => r.post_id);
  } catch {
    // Fallback SQL LIKE if FTS expression parsing fails
    const term = `%${cleanTerm}%`;
    const rows = db.prepare(`
      SELECT id FROM posts WHERE title LIKE ? OR content LIKE ? OR district LIKE ? OR category LIKE ? LIMIT ?
    `).all(term, term, term, term, limit) as any[];
    return rows.map(r => r.id);
  }
}
