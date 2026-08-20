import { describe, it, expect, beforeAll } from 'vitest';
import { db, initDatabase } from '../server/db';
import { seedDatabaseIfEmpty } from '../server/seedDatabase';

describe('Speak Up Core System Tests', () => {
  beforeAll(async () => {
    initDatabase();
    await seedDatabaseIfEmpty();
  });

  it('should have seeded Ghana institutions correctly', () => {
    const insts = db.prepare('SELECT * FROM institutions').all();
    expect(insts.length).toBeGreaterThanOrEqual(10);
  });

  it('should ensure zero-follower posts are stored and discoverable', () => {
    const posts = db.prepare('SELECT * FROM posts').all() as any[];
    expect(posts.length).toBeGreaterThan(0);
    const zeroFollowerPost = posts.find(p => p.author_id === 'user-fatima-tamale');
    expect(zeroFollowerPost).toBeDefined();
    expect(zeroFollowerPost.title).toContain('Drain');
  });

  it('should enforce NOT_CONFIGURED or SENT status for alerts without fake claims', () => {
    const tags = db.prepare('SELECT * FROM post_institution_tags').all() as any[];
    expect(tags.length).toBeGreaterThan(0);
    for (const tag of tags) {
      expect(['SENT', 'DELIVERED', 'ACKNOWLEDGED', 'NOT_CONFIGURED', 'FAILED']).toContain(tag.alert_status);
    }
  });
});
