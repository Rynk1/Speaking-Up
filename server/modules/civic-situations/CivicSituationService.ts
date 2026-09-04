import { db } from '../../database/db';
import { OutboxService } from '../../infrastructure/events/OutboxService';
import { AuditService } from '../audit/AuditService';
import { logger } from '../../shared/logger';

export interface CivicSituation {
  id: string;
  title: string;
  summary: string;
  category: string;
  region: string;
  district: string;
  locationSummary?: string;
  severity: string;
  urgency: string;
  status: string;
  priorityScore: number;
  priorityBand: string;
  priorityFactors: Record<string, any>;
  firstReportedAt: string;
  latestActivityAt: string;
  reportCount: number;
  confirmationCount: number;
  evidenceCount: number;
  amplificationCount: number;
  primaryInstitutionId?: string;
  createdAt: string;
  updatedAt: string;
}

export class CivicSituationService {
  /**
   * Matches a new or existing report to a Civic Situation or creates a new one
   */
  public static matchOrCreateSituation(reportId: string): string {
    const report = db.prepare('SELECT * FROM posts WHERE id = ?').get(reportId) as any;
    if (!report) {
      throw new Error(`Report ${reportId} not found`);
    }

    const now = new Date().toISOString();

    // 1. Look for matching active situation in the same district and category in past 14 days
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString();

    const candidateSituations = db.prepare(`
      SELECT * FROM civic_situations
      WHERE region = ? AND district = ? AND category = ?
        AND status NOT IN ('RESOLVED', 'CLOSED')
        AND latest_activity_at >= ?
      ORDER BY latest_activity_at DESC
      LIMIT 5
    `).all(report.region, report.district, report.category, fourteenDaysAgo) as any[];

    let matchedSituationId: string | null = null;
    let matchConfidence = 0.0;
    let matchReason = '';

    // Extract keywords from report title
    const reportKeywords = (report.title + ' ' + (report.landmark || ''))
      .toLowerCase()
      .split(/\W+/)
      .filter((w: string) => w.length > 3);

    for (const candidate of candidateSituations) {
      const candidateText = (candidate.title + ' ' + candidate.summary + ' ' + (candidate.location_summary || '')).toLowerCase();
      let keywordHits = 0;
      for (const kw of reportKeywords) {
        if (candidateText.includes(kw)) keywordHits++;
      }

      // If landmark matches or at least 2 distinct keywords match, high confidence
      const landmarkMatch = report.landmark && candidateText.includes(report.landmark.toLowerCase());
      if (landmarkMatch) {
        matchedSituationId = candidate.id;
        matchConfidence = 0.95;
        matchReason = `Direct geographic landmark match: ${report.landmark}`;
        break;
      } else if (keywordHits >= 2) {
        matchedSituationId = candidate.id;
        matchConfidence = 0.85;
        matchReason = `District & semantic keyword overlap (${keywordHits} shared terms)`;
        break;
      }
    }

    // 2. If matched, attach report to existing situation
    if (matchedSituationId) {
      // Check if already linked
      const existingLink = db.prepare('SELECT * FROM situation_reports WHERE situation_id = ? AND report_id = ?')
        .get(matchedSituationId, reportId);

      if (!existingLink) {
        db.prepare(`
          INSERT INTO situation_reports (situation_id, report_id, match_confidence, match_reason, attached_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(matchedSituationId, reportId, matchConfidence, matchReason, now);

        // Update situation aggregates
        this.recalculateSituationAggregates(matchedSituationId);

        // Record situation timeline event
        const eventId = `sev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        db.prepare(`
          INSERT INTO situation_events (id, situation_id, event_type, actor_type, actor_id, actor_name, description, metadata_json, created_at)
          VALUES (?, ?, 'REPORT_LINKED', 'CITIZEN', ?, ?, ?, ?, ?)
        `).run(
          eventId,
          matchedSituationId,
          report.author_id,
          report.author_name,
          `Independent citizen report linked: "${report.title}"`,
          JSON.stringify({ reportId, matchConfidence, matchReason }),
          now
        );

        // Update post reference
        db.prepare('UPDATE posts SET situation_id = ? WHERE id = ?').run(matchedSituationId, reportId);

        AuditService.log({
          eventType: 'SITUATION_REPORT_LINKED',
          actorType: 'SYSTEM',
          targetType: 'SITUATION',
          targetId: matchedSituationId,
          reason: matchReason,
          metadata: { reportId, matchConfidence }
        });

        OutboxService.enqueueEvent('situation.updated', 'SITUATION', matchedSituationId, {
          situationId: matchedSituationId,
          reportId,
          matchConfidence,
          reason: matchReason
        });
      }

      return matchedSituationId;
    }

    // 3. Otherwise, create a new Civic Situation
    const situationId = `sit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const title = report.title;
    const summary = report.content.slice(0, 300);
    const locationSummary = report.landmark ? `${report.landmark}, ${report.district}` : `${report.district}, ${report.region}`;

    // Get primary tagged institution if any
    const primaryInst = db.prepare(`
      SELECT institution_id FROM post_institution_tags WHERE post_id = ? LIMIT 1
    `).get(reportId) as any;
    const primaryInstitutionId = primaryInst?.institution_id || null;

    db.prepare(`
      INSERT INTO civic_situations (
        id, title, summary, category, region, district, location_summary,
        severity, urgency, status, priority_score, priority_band, priority_factors_json,
        first_reported_at, latest_activity_at, report_count, confirmation_count, evidence_count,
        amplification_count, primary_institution_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, '{}', ?, ?, 1, ?, 0, ?, ?, ?, ?)
    `).run(
      situationId,
      title,
      summary,
      report.category,
      report.region,
      report.district,
      locationSummary,
      report.severity || 'MODERATE',
      report.urgency || 'NORMAL',
      report.priority_score || 25.0,
      report.priority_band || 'MODERATE',
      report.created_at,
      now,
      report.confirmations_count || 0,
      report.reposts_count || 0,
      primaryInstitutionId,
      now,
      now
    );

    // Link report
    db.prepare(`
      INSERT INTO situation_reports (situation_id, report_id, match_confidence, match_reason, attached_at)
      VALUES (?, ?, 1.0, 'Initial root report establishing Civic Situation', ?)
    `).run(situationId, reportId, now);

    // Update post reference
    db.prepare('UPDATE posts SET situation_id = ? WHERE id = ?').run(situationId, reportId);

    // Record timeline creation event
    const eventId = `sev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    db.prepare(`
      INSERT INTO situation_events (id, situation_id, event_type, actor_type, actor_id, actor_name, institution_id, description, metadata_json, created_at)
      VALUES (?, ?, 'SITUATION_CREATED', 'SYSTEM', ?, ?, ?, ?, ?, ?)
    `).run(
      eventId,
      situationId,
      report.author_id,
      report.author_name,
      primaryInstitutionId,
      `Civic Situation established from report in ${locationSummary}`,
      JSON.stringify({ reportId, category: report.category }),
      now
    );

    // Link institutional tags
    const postTags = db.prepare('SELECT * FROM post_institution_tags WHERE post_id = ?').all(reportId) as any[];
    for (const tag of postTags) {
      db.prepare(`
        INSERT OR IGNORE INTO situation_institutions (situation_id, institution_id, role, jurisdiction_level, assigned_at)
        VALUES (?, ?, 'PRIMARY', 'NATIONAL', ?)
      `).run(situationId, tag.institution_id, now);
    }

    AuditService.log({
      eventType: 'SITUATION_CREATED',
      actorType: 'SYSTEM',
      targetType: 'SITUATION',
      targetId: situationId,
      reason: 'Created from initial citizen report',
      metadata: { rootReportId: reportId, region: report.region, district: report.district }
    });

    OutboxService.enqueueEvent('situation.created', 'SITUATION', situationId, {
      situationId,
      rootReportId: reportId,
      category: report.category,
      region: report.region,
      district: report.district
    });

    return situationId;
  }

  /**
   * Recalculates aggregated statistics and priority for a Civic Situation
   */
  public static recalculateSituationAggregates(situationId: string): void {
    const linkedReports = db.prepare(`
      SELECT p.* FROM posts p
      JOIN situation_reports sr ON sr.report_id = p.id
      WHERE sr.situation_id = ?
    `).all(situationId) as any[];

    if (linkedReports.length === 0) return;

    let totalConfirmations = 0;
    let totalAmplifications = 0;
    let totalEvidence = 0;
    let maxPriorityScore = 0;
    let highestSeverity = 'MODERATE';
    let highestUrgency = 'NORMAL';

    for (const rep of linkedReports) {
      totalConfirmations += rep.confirmations_count || 0;
      totalAmplifications += rep.reposts_count || 0;
      if ((rep.priority_score || 0) > maxPriorityScore) {
        maxPriorityScore = rep.priority_score;
      }
      if (rep.severity === 'EMERGENCY') highestSeverity = 'EMERGENCY';
      else if (rep.severity === 'SEVERE' && highestSeverity !== 'EMERGENCY') highestSeverity = 'SEVERE';

      if (rep.urgency === 'CRITICAL') highestUrgency = 'CRITICAL';
      else if (rep.urgency === 'HIGH' && highestUrgency !== 'CRITICAL') highestUrgency = 'HIGH';
    }

    const evidenceRow = db.prepare(`
      SELECT COUNT(*) as count FROM community_evidence ce
      JOIN situation_reports sr ON sr.report_id = ce.post_id
      WHERE sr.situation_id = ?
    `).get(situationId) as any;
    totalEvidence = evidenceRow?.count || 0;

    // Aggregated situation priority: independent reports boost credibility
    const multiReportBonus = Math.min(20, (linkedReports.length - 1) * 8);
    const situationPriorityScore = Math.min(100, Math.round(maxPriorityScore + multiReportBonus));

    let priorityBand = 'MODERATE';
    if (situationPriorityScore >= 80) priorityBand = 'CRITICAL';
    else if (situationPriorityScore >= 60) priorityBand = 'HIGH';
    else if (situationPriorityScore >= 35) priorityBand = 'MODERATE';
    else priorityBand = 'LOW';

    const now = new Date().toISOString();

    db.prepare(`
      UPDATE civic_situations
      SET report_count = ?, confirmation_count = ?, amplification_count = ?, evidence_count = ?,
          priority_score = ?, priority_band = ?, severity = ?, urgency = ?, latest_activity_at = ?, updated_at = ?
      WHERE id = ?
    `).run(
      linkedReports.length,
      totalConfirmations,
      totalAmplifications,
      totalEvidence,
      situationPriorityScore,
      priorityBand,
      highestSeverity,
      highestUrgency,
      now,
      now,
      situationId
    );
  }

  /**
   * Retrieves complete situation profile with linked reports, timeline events, and responses
   */
  public static getSituationDetail(situationId: string): any {
    const situation = db.prepare('SELECT * FROM civic_situations WHERE id = ?').get(situationId) as any;
    if (!situation) return null;

    const reports = db.prepare(`
      SELECT p.*, sr.match_confidence, sr.match_reason, sr.attached_at
      FROM posts p
      JOIN situation_reports sr ON sr.report_id = p.id
      WHERE sr.situation_id = ?
      ORDER BY p.created_at ASC
    `).all(situationId) as any[];

    const timeline = db.prepare(`
      SELECT * FROM situation_events
      WHERE situation_id = ?
      ORDER BY created_at ASC
    `).all(situationId) as any[];

    const institutions = db.prepare(`
      SELECT i.*, si.role, si.jurisdiction_level, si.assigned_at
      FROM institutions i
      JOIN situation_institutions si ON si.institution_id = i.id
      WHERE si.situation_id = ?
    `).all(situationId) as any[];

    const responses = db.prepare(`
      SELECT r.* FROM institution_responses r
      JOIN situation_reports sr ON sr.report_id = r.post_id
      WHERE sr.situation_id = ? OR r.situation_id = ?
      ORDER BY r.created_at DESC
    `).all(situationId, situationId) as any[];

    const announcements = db.prepare(`
      SELECT a.* FROM institutional_announcements a
      JOIN announcement_situations asit ON asit.announcement_id = a.id
      WHERE asit.situation_id = ? AND a.status = 'PUBLISHED'
      ORDER BY a.published_at DESC
    `).all(situationId) as any[];

    return {
      ...situation,
      reports,
      timeline,
      institutions,
      responses,
      announcements
    };
  }

  /**
   * Lists active civic situations with cursor pagination
   */
  public static listSituations(params: {
    region?: string;
    district?: string;
    category?: string;
    status?: string;
    priorityBand?: string;
    limit?: number;
    cursor?: string;
  }): { items: any[]; nextCursor: string | null } {
    const limit = Math.min(params.limit || 20, 50);
    const conditions: string[] = [];
    const values: any[] = [];

    if (params.region && params.region !== 'All') {
      conditions.push('region = ?');
      values.push(params.region);
    }
    if (params.district) {
      conditions.push('district = ?');
      values.push(params.district);
    }
    if (params.category && params.category !== 'All') {
      conditions.push('category = ?');
      values.push(params.category);
    }
    if (params.status && params.status !== 'All') {
      conditions.push('status = ?');
      values.push(params.status);
    }
    if (params.priorityBand) {
      conditions.push('priority_band = ?');
      values.push(params.priorityBand);
    }
    if (params.cursor) {
      conditions.push('latest_activity_at < ?');
      values.push(params.cursor);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `
      SELECT * FROM civic_situations
      ${whereClause}
      ORDER BY latest_activity_at DESC
      LIMIT ?
    `;

    values.push(limit + 1);
    const rows = db.prepare(query).all(...values) as any[];

    let nextCursor: string | null = null;
    if (rows.length > limit) {
      const lastItem = rows[limit - 1];
      nextCursor = lastItem.latest_activity_at;
      rows.pop();
    }

    return { items: rows, nextCursor };
  }
}
