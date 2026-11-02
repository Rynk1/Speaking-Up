import { db } from '../../database/db';
import { evaluateSlaState } from './sla';

export type QueueSeverity = 'BREACHED' | 'URGENT' | 'DUE_SOON' | 'ON_TRACK' | 'INFO';

export type QueueSource =
  | 'INBOX_ITEM'
  | 'DELEGATION'
  | 'JOINT_CASE'
  | 'ALERT'
  | 'ABUSE_REPORT'
  | 'MODERATION';

export interface QueueItem {
  id: string;
  source: QueueSource;
  severity: QueueSeverity;
  title: string;
  subtitle: string | null;
  institutionId: string | null;
  institutionName: string | null;
  deskId: string | null;
  deskName: string | null;
  postId: string | null;
  situationId: string | null;
  caseId: string | null;
  status: string;
  priority: string;
  dueAt: string | null;
  createdAt: string;
  ageMs: number;
  slaState: string;
  assignedOfficerId: string | null;
  assignedOfficerName: string | null;
  escalationLevel: number;
  meta: Record<string, any>;
}

const SEVERITY_RANK: Record<QueueSeverity, number> = {
  BREACHED: 0,
  URGENT: 1,
  DUE_SOON: 2,
  ON_TRACK: 3,
  INFO: 4
};

const CLOSED_INBOX_STATES = ['RESOLVED', 'CITIZEN_FOLLOW_UP'];

/** Priority band → a floor severity when no SLA deadline applies. */
function prioritySeverity(priority?: string | null): QueueSeverity {
  switch ((priority || '').toUpperCase()) {
    case 'EMERGENCY':
    case 'URGENT':
      return 'URGENT';
    case 'ELEVATED':
      return 'DUE_SOON';
    default:
      return 'ON_TRACK';
  }
}

/** Severity from an SLA deadline; falls back to the priority band. */
function slaSeverity(dueAt: string | null | undefined, createdAt: string | null | undefined, priority?: string | null): QueueSeverity {
  const sla = evaluateSlaState(dueAt, createdAt);
  if (sla === 'breached') return 'BREACHED';
  if (sla === 'due-soon' || sla === 'at-risk') return 'DUE_SOON';
  return prioritySeverity(priority);
}

function worst(a: QueueSeverity, b: QueueSeverity): QueueSeverity {
  return SEVERITY_RANK[a] <= SEVERITY_RANK[b] ? a : b;
}

/**
 * A single triage surface that merges every kind of open coordination work —
 * routed inbox items, pending delegations, joint cases, failed alerts, abuse
 * complaints and held reports — into one severity-ranked feed. Oversight no
 * longer has to reconcile several panels to answer "what needs attention now?".
 *
 * Everything is derived from live tables; nothing is synthesised.
 */
export class CoordinationQueueService {
  public static buildQueue(params: { limit?: number; sources?: QueueSource[] } = {}): {
    items: QueueItem[];
    summary: Record<string, number>;
  } {
    const limit = Math.min(Math.max(params.limit || 100, 1), 300);
    const wanted = params.sources && params.sources.length ? new Set(params.sources) : null;
    const now = Date.now();
    const items: QueueItem[] = [];

    const include = (source: QueueSource) => !wanted || wanted.has(source);

    if (include('INBOX_ITEM')) items.push(...this.inboxItems(now));
    if (include('DELEGATION')) items.push(...this.delegations(now));
    if (include('JOINT_CASE')) items.push(...this.jointCases(now));
    if (include('ALERT')) items.push(...this.failedAlerts(now));
    if (include('ABUSE_REPORT')) items.push(...this.abuseReports(now));
    if (include('MODERATION')) items.push(...this.moderationHolds(now));

    items.sort((a, b) => {
      const rank = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
      if (rank !== 0) return rank;
      // Within a severity band, the oldest deadline (or creation) wins.
      const aDue = a.dueAt ? new Date(a.dueAt).getTime() : a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bDue = b.dueAt ? new Date(b.dueAt).getTime() : b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (aDue !== bDue) return aDue - bDue;
      return b.ageMs - a.ageMs;
    });

    const summary: Record<string, number> = {
      total: items.length,
      BREACHED: 0,
      URGENT: 0,
      DUE_SOON: 0,
      ON_TRACK: 0,
      INFO: 0
    };
    for (const item of items) summary[item.severity] = (summary[item.severity] || 0) + 1;

    return { items: items.slice(0, limit), summary };
  }

  private static inboxItems(now: number): QueueItem[] {
    const rows = db.prepare(`
      SELECT i.id, i.institution_id, i.item_type, i.item_priority, i.title, i.summary,
             i.post_id, i.situation_id, i.action_state, i.due_at, i.created_at,
             i.desk_id, i.assigned_officer_user_id, i.escalation_level,
             inst.official_name AS institution_name, d.name AS desk_name,
             u.name AS officer_name
      FROM institutional_inbox_items i
      LEFT JOIN institutions inst ON inst.id = i.institution_id
      LEFT JOIN institution_desks d ON d.id = i.desk_id
      LEFT JOIN users u ON u.id = i.assigned_officer_user_id
      WHERE i.action_state NOT IN (${CLOSED_INBOX_STATES.map(() => '?').join(', ')})
      ORDER BY i.due_at IS NULL, i.due_at ASC, i.created_at ASC
      LIMIT 200
    `).all(...CLOSED_INBOX_STATES) as any[];

    return rows.map((r) => {
      const severity = slaSeverity(r.due_at, r.created_at, r.item_priority);
      return {
        id: `inbox:${r.id}`,
        source: 'INBOX_ITEM' as QueueSource,
        severity: r.escalation_level > 0 ? worst(severity, 'DUE_SOON') : severity,
        title: r.title,
        subtitle: r.summary,
        institutionId: r.institution_id,
        institutionName: r.institution_name,
        deskId: r.desk_id,
        deskName: r.desk_name,
        postId: r.post_id,
        situationId: r.situation_id,
        caseId: null,
        status: r.action_state,
        priority: r.item_priority,
        dueAt: r.due_at,
        createdAt: r.created_at,
        ageMs: r.created_at ? now - new Date(r.created_at).getTime() : 0,
        slaState: evaluateSlaState(r.due_at, r.created_at),
        assignedOfficerId: r.assigned_officer_user_id,
        assignedOfficerName: r.officer_name,
        escalationLevel: r.escalation_level || 0,
        meta: { itemType: r.item_type, escalationLevel: r.escalation_level || 0 }
      };
    });
  }

  private static delegations(now: number): QueueItem[] {
    const rows = db.prepare(`
      SELECT d.id, d.post_id, d.situation_id, d.from_institution_id, d.to_institution_id,
             d.delegation_type, d.reason, d.instructions, d.status, d.priority, d.due_at, d.created_at,
             p.title AS post_title, fi.official_name AS from_name, ti.official_name AS to_name
      FROM coordination_delegations d
      LEFT JOIN posts p ON p.id = d.post_id
      LEFT JOIN institutions fi ON fi.id = d.from_institution_id
      LEFT JOIN institutions ti ON ti.id = d.to_institution_id
      WHERE d.status IN ('PENDING', 'ACCEPTED')
      ORDER BY d.due_at IS NULL, d.due_at ASC, d.created_at ASC
      LIMIT 200
    `).all() as any[];

    return rows.map((r) => {
      const severity = r.status === 'PENDING'
        ? worst(slaSeverity(r.due_at, r.created_at, r.priority), prioritySeverity(r.priority))
        : slaSeverity(r.due_at, r.created_at, r.priority);
      return {
        id: `delegation:${r.id}`,
        source: 'DELEGATION' as QueueSource,
        severity,
        title: r.post_title || `Delegation (${r.delegation_type.toLowerCase()})`,
        subtitle: `${r.from_name || 'External'} → ${r.to_name || r.to_institution_id}${r.reason ? ` · ${r.reason}` : ''}`,
        institutionId: r.to_institution_id,
        institutionName: r.to_name,
        deskId: null,
        deskName: null,
        postId: r.post_id,
        situationId: r.situation_id,
        caseId: null,
        status: r.status,
        priority: r.priority,
        dueAt: r.due_at,
        createdAt: r.created_at,
        ageMs: r.created_at ? now - new Date(r.created_at).getTime() : 0,
        slaState: evaluateSlaState(r.due_at, r.created_at),
        assignedOfficerId: null,
        assignedOfficerName: null,
        escalationLevel: 0,
        meta: {
          delegationType: r.delegation_type,
          fromInstitutionId: r.from_institution_id,
          fromInstitutionName: r.from_name,
          toInstitutionId: r.to_institution_id,
          toInstitutionName: r.to_name,
          instructions: r.instructions
        }
      };
    });
  }

  private static jointCases(now: number): QueueItem[] {
    const rows = db.prepare(`
      SELECT c.id, c.post_id, c.situation_id, c.title, c.summary, c.status, c.priority,
             c.lead_institution_id, c.region, c.district, c.created_at, c.updated_at,
             li.official_name AS lead_name,
             (SELECT COUNT(*) FROM coordination_case_participants cp WHERE cp.case_id = c.id) AS participant_count,
             (SELECT COUNT(*) FROM coordination_case_participants cp WHERE cp.case_id = c.id AND cp.status = 'COMPLETED') AS completed_count,
             (SELECT COUNT(*) FROM coordination_case_participants cp WHERE cp.case_id = c.id AND cp.status = 'INVITED') AS invited_count,
             (SELECT COUNT(*) FROM coordination_case_participants cp WHERE cp.case_id = c.id AND cp.status = 'DECLINED') AS declined_count
      FROM coordination_cases c
      LEFT JOIN institutions li ON li.id = c.lead_institution_id
      WHERE c.status IN ('OPEN', 'ACTIVE')
      ORDER BY c.updated_at DESC
      LIMIT 200
    `).all() as any[];

    return rows.map((r) => {
      const awaiting = (r.invited_count || 0) + (r.declined_count || 0);
      // A case with unaccepted invitations or declines is not yet moving.
      const severity: QueueSeverity = awaiting > 0
        ? worst(prioritySeverity(r.priority), 'DUE_SOON')
        : prioritySeverity(r.priority);
      return {
        id: `case:${r.id}`,
        source: 'JOINT_CASE' as QueueSource,
        severity,
        title: r.title,
        subtitle: `${r.lead_name || r.lead_institution_id} leads · ${r.completed_count || 0}/${r.participant_count || 0} participants complete${awaiting ? ` · ${awaiting} awaiting response` : ''}`,
        institutionId: r.lead_institution_id,
        institutionName: r.lead_name,
        deskId: null,
        deskName: null,
        postId: r.post_id,
        situationId: r.situation_id,
        caseId: r.id,
        status: r.status,
        priority: r.priority,
        dueAt: null,
        createdAt: r.created_at,
        ageMs: r.created_at ? now - new Date(r.created_at).getTime() : 0,
        slaState: 'none',
        assignedOfficerId: null,
        assignedOfficerName: null,
        escalationLevel: 0,
        meta: {
          leadInstitutionId: r.lead_institution_id,
          leadInstitutionName: r.lead_name,
          participantCount: r.participant_count,
          completedCount: r.completed_count,
          invitedCount: r.invited_count,
          declinedCount: r.declined_count,
          region: r.region,
          district: r.district
        }
      };
    });
  }

  private static failedAlerts(now: number): QueueItem[] {
    const rows = db.prepare(`
      SELECT t.id AS tag_id, t.post_id, t.institution_id, t.institution_name,
             t.alert_status, t.delivery_timestamp,
             p.title AS post_title, p.urgency,
             a.error_message, a.retry_count, a.updated_at AS last_attempt_at
      FROM post_institution_tags t
      LEFT JOIN posts p ON p.id = t.post_id
      LEFT JOIN alert_attempts a ON a.idempotency_key = 'alert-' || t.post_id || '-' || t.institution_id
      WHERE t.alert_status = 'FAILED'
      ORDER BY t.delivery_timestamp DESC
      LIMIT 200
    `).all() as any[];

    return rows.map((r) => ({
      id: `alert:${r.tag_id}`,
      source: 'ALERT' as QueueSource,
      severity: 'URGENT' as QueueSeverity,
      title: `Alert undelivered: ${r.post_title || r.post_id}`,
      subtitle: `${r.institution_name || r.institution_id}${r.error_message ? ` · ${r.error_message}` : ''}`,
      institutionId: r.institution_id,
      institutionName: r.institution_name,
      deskId: null,
      deskName: null,
      postId: r.post_id,
      situationId: null,
      caseId: null,
      status: r.alert_status,
      priority: r.urgency || 'NORMAL',
      dueAt: null,
      createdAt: r.last_attempt_at || r.delivery_timestamp,
      ageMs: r.delivery_timestamp ? now - new Date(r.delivery_timestamp).getTime() : 0,
      slaState: 'none',
      assignedOfficerId: null,
      assignedOfficerName: null,
      escalationLevel: 0,
      meta: { tagId: r.tag_id, retryCount: r.retry_count || 0, errorMessage: r.error_message }
    }));
  }

  private static abuseReports(now: number): QueueItem[] {
    const rows = db.prepare(`
      SELECT a.id, a.post_id, a.reason, a.status, a.created_at,
             p.title AS post_title
      FROM abuse_reports a
      LEFT JOIN posts p ON p.id = a.post_id
      WHERE a.status = 'PENDING'
      ORDER BY a.created_at ASC
      LIMIT 200
    `).all() as any[];

    return rows.map((r) => ({
      id: `abuse:${r.id}`,
      source: 'ABUSE_REPORT' as QueueSource,
      severity: 'DUE_SOON' as QueueSeverity,
      title: `Abuse complaint: ${r.post_title || r.post_id}`,
      subtitle: r.reason || 'Citizen complaint awaiting review',
      institutionId: null,
      institutionName: null,
      deskId: null,
      deskName: null,
      postId: r.post_id,
      situationId: null,
      caseId: null,
      status: r.status,
      priority: 'NORMAL',
      dueAt: null,
      createdAt: r.created_at,
      ageMs: r.created_at ? now - new Date(r.created_at).getTime() : 0,
      slaState: 'none',
      assignedOfficerId: null,
      assignedOfficerName: null,
      escalationLevel: 0,
      meta: { abuseReportId: r.id, reason: r.reason }
    }));
  }

  private static moderationHolds(now: number): QueueItem[] {
    const rows = db.prepare(`
      SELECT p.id, p.title, p.category, p.urgency, p.region, p.district, p.created_at,
             p.moderation_status, u.name AS author_name
      FROM posts p
      LEFT JOIN users u ON u.id = p.author_id
      WHERE p.moderation_status IN ('held', 'flagged', 'under_review')
      ORDER BY p.created_at ASC
      LIMIT 200
    `).all() as any[];

    return rows.map((r) => ({
      id: `moderation:${r.id}`,
      source: 'MODERATION' as QueueSource,
      severity: (r.moderation_status === 'held' ? 'INFO' : 'DUE_SOON') as QueueSeverity,
      title: `Report ${r.moderation_status}: ${r.title}`,
      subtitle: `${r.author_name || 'Unknown author'}${r.region ? ` · ${r.region}` : ''}`,
      institutionId: null,
      institutionName: null,
      deskId: null,
      deskName: null,
      postId: r.id,
      situationId: null,
      caseId: null,
      status: r.moderation_status,
      priority: r.urgency || 'NORMAL',
      dueAt: null,
      createdAt: r.created_at,
      ageMs: r.created_at ? now - new Date(r.created_at).getTime() : 0,
      slaState: 'none',
      assignedOfficerId: null,
      assignedOfficerName: null,
      escalationLevel: 0,
      meta: { moderationStatus: r.moderation_status, category: r.category, region: r.region, district: r.district }
    }));
  }
}
