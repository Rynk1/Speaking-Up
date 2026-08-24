import { db } from '../database/db';

export interface ReportTraceTimeline {
  reportId: string;
  lifecycleStatus: string;
  accountabilityStatus: string;
  events: any[];
  alertAttempts: any[];
  jobAttempts: any[];
}

export class TraceService {
  /**
   * Retrieves end-to-end operational trace timeline for any civic report
   */
  public static getReportTrace(reportId: string): ReportTraceTimeline | null {
    const post = db.prepare('SELECT id, report_lifecycle_status, accountability_status FROM posts WHERE id = ?').get(reportId) as any;
    if (!post) return null;

    const events = db.prepare('SELECT * FROM report_events WHERE report_id = ? ORDER BY created_at ASC').all(reportId);
    const alertAttempts = db.prepare('SELECT * FROM alert_attempts WHERE post_id = ? ORDER BY created_at ASC').all(reportId);

    // Get background job attempts associated with this report
    const jobAttempts = db.prepare(`
      SELECT ja.*, j.type as job_type
      FROM job_attempts ja
      JOIN jobs j ON ja.job_id = j.id
      WHERE j.payload_json LIKE ?
      ORDER BY ja.created_at ASC
    `).all(`%${reportId}%`);

    return {
      reportId,
      lifecycleStatus: post.report_lifecycle_status,
      accountabilityStatus: post.accountability_status,
      events,
      alertAttempts,
      jobAttempts
    };
  }
}
