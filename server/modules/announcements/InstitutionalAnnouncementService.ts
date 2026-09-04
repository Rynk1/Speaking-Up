import { db } from '../../database/db';
import { OutboxService } from '../../infrastructure/events/OutboxService';
import { AuditService } from '../audit/AuditService';
import { logger } from '../../shared/logger';

export type AnnouncementType =
  | 'PUBLIC_NOTICE'
  | 'ADVISORY'
  | 'PUBLIC_ADVISORY'
  | 'SERVICE_DISRUPTION'
  | 'SCHEDULED_MAINTENANCE'
  | 'ROAD_CLOSURE'
  | 'EMERGENCY_DIRECTIVE'
  | 'REPAIR_COMPLETION'
  | 'PRESS_RELEASE'
  | 'POLICY_UPDATE'
  | 'FACT_CHECK_CLARIFICATION'
  | 'SITUATION_BRIEF'
  | 'EMERGENCY_ALERT';

export interface CreateAnnouncementInput {
  institutionId: string;
  authorId: string;
  authorName: string;
  authorTitle: string;
  title: string;
  body: string;
  summary?: string;
  announcementType: AnnouncementType;
  geographicScope: 'NATIONAL' | 'REGIONAL' | 'DISTRICT' | 'CORRIDOR';
  region?: string;
  district?: string;
  topic?: string;
  category?: string;
  media?: any[];
  officialLinks?: any[];
  relatedSituationIds?: string[];
  expiresAt?: string;
}

export class InstitutionalAnnouncementService {
  /**
   * Creates and publishes an official institutional announcement
   */
  public static createAnnouncement(input: CreateAnnouncementInput): any {
    const institution = db.prepare('SELECT * FROM institutions WHERE id = ?').get(input.institutionId) as any;
    if (!institution) {
      throw new Error(`Institution ${input.institutionId} not found`);
    }

    const id = `ann-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const summary = input.summary || input.body.slice(0, 200) + '...';

    db.prepare(`
      INSERT INTO institutional_announcements (
        id, institution_id, author_id, author_name, author_title,
        title, body, summary, announcement_type, status,
        geographic_scope, region, district, topic, category,
        media_json, official_links_json, related_situation_ids_json,
        view_count, share_count, published_at, expires_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PUBLISHED', ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?)
    `).run(
      id,
      input.institutionId,
      input.authorId,
      input.authorName,
      input.authorTitle,
      input.title,
      input.body,
      summary,
      input.announcementType,
      input.geographicScope,
      input.region || null,
      input.district || null,
      input.topic || null,
      input.category || institution.category,
      JSON.stringify(input.media || []),
      JSON.stringify(input.officialLinks || []),
      JSON.stringify(input.relatedSituationIds || []),
      now,
      input.expiresAt || null,
      now,
      now
    );

    // Link to situations
    if (input.relatedSituationIds && input.relatedSituationIds.length > 0) {
      for (const sitId of input.relatedSituationIds) {
        db.prepare(`
          INSERT OR IGNORE INTO announcement_situations (announcement_id, situation_id, linked_at)
          VALUES (?, ?, ?)
        `).run(id, sitId, now);

        // Record situation event
        const sevId = `sev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        db.prepare(`
          INSERT INTO situation_events (id, situation_id, event_type, actor_type, actor_id, actor_name, institution_id, description, metadata_json, created_at)
          VALUES (?, ?, 'ANNOUNCEMENT_LINKED', 'INSTITUTION', ?, ?, ?, ?, ?, ?)
        `).run(
          sevId,
          sitId,
          input.authorId,
          input.authorName,
          input.institutionId,
          `Official Announcement: "${input.title}" linked to situation`,
          JSON.stringify({ announcementId: id, announcementType: input.announcementType }),
          now
        );
      }
    }

    AuditService.log({
      eventType: 'ANNOUNCEMENT_PUBLISHED',
      userId: input.authorId,
      actorType: 'INSTITUTION',
      institutionId: input.institutionId,
      targetType: 'ANNOUNCEMENT',
      targetId: id,
      reason: `Published ${input.announcementType}: ${input.title}`,
      metadata: { scope: input.geographicScope, region: input.region }
    });

    OutboxService.enqueueEvent('institution.announcement.published', 'ANNOUNCEMENT', id, {
      announcementId: id,
      institutionId: input.institutionId,
      institutionName: institution.official_name,
      title: input.title,
      announcementType: input.announcementType,
      geographicScope: input.geographicScope,
      publishedAt: now
    });

    return this.getAnnouncementById(id);
  }

  /**
   * Retrieves an announcement by ID
   */
  public static getAnnouncementById(id: string): any {
    const row = db.prepare(`
      SELECT a.*, i.official_name as institution_official_name, i.short_name as institution_short_name,
             i.logo as institution_logo, i.category as institution_category
      FROM institutional_announcements a
      JOIN institutions i ON i.id = a.institution_id
      WHERE a.id = ?
    `).get(id) as any;

    if (!row) return null;

    try {
      row.media = JSON.parse(row.media_json || '[]');
      row.officialLinks = JSON.parse(row.official_links_json || '[]');
      row.relatedSituationIds = JSON.parse(row.related_situation_ids_json || '[]');
    } catch {
      row.media = [];
      row.officialLinks = [];
      row.relatedSituationIds = [];
    }

    return row;
  }

  /**
   * Lists announcements with filtering for public feed and dashboard
   */
  public static listAnnouncements(params: {
    institutionId?: string;
    region?: string;
    district?: string;
    announcementType?: string;
    status?: string;
    limit?: number;
    cursor?: string;
  }): { items: any[]; nextCursor: string | null } {
    const limit = Math.min(params.limit || 20, 50);
    const conditions: string[] = [];
    const values: any[] = [];

    if (params.institutionId) {
      conditions.push('a.institution_id = ?');
      values.push(params.institutionId);
    }
    if (params.status) {
      conditions.push('a.status = ?');
      values.push(params.status);
    } else {
      conditions.push("a.status = 'PUBLISHED'");
    }
    if (params.announcementType && params.announcementType !== 'ALL') {
      conditions.push('a.announcement_type = ?');
      values.push(params.announcementType);
    }
    if (params.region && params.region !== 'All') {
      conditions.push("(a.geographic_scope = 'NATIONAL' OR a.region = ?)");
      values.push(params.region);
    }
    if (params.cursor) {
      conditions.push('a.published_at < ?');
      values.push(params.cursor);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `
      SELECT a.*, i.official_name as institution_official_name, i.short_name as institution_short_name,
             i.logo as institution_logo, i.category as institution_category
      FROM institutional_announcements a
      JOIN institutions i ON i.id = a.institution_id
      ${whereClause}
      ORDER BY a.published_at DESC
      LIMIT ?
    `;

    values.push(limit + 1);
    const rows = db.prepare(query).all(...values) as any[];

    let nextCursor: string | null = null;
    if (rows.length > limit) {
      const lastItem = rows[limit - 1];
      nextCursor = lastItem.published_at;
      rows.pop();
    }

    for (const r of rows) {
      try {
        r.media = JSON.parse(r.media_json || '[]');
        r.officialLinks = JSON.parse(r.official_links_json || '[]');
        r.relatedSituationIds = JSON.parse(r.related_situation_ids_json || '[]');
      } catch {
        r.media = [];
        r.officialLinks = [];
        r.relatedSituationIds = [];
      }
    }

    return { items: rows, nextCursor };
  }

  /**
   * Tracks announcement view count
   */
  public static incrementView(id: string): void {
    db.prepare('UPDATE institutional_announcements SET view_count = view_count + 1 WHERE id = ?').run(id);
  }
}
