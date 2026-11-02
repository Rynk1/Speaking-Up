/**
 * Single source of truth for how every workflow status is labelled and toned.
 * Views must not invent their own colour logic; they read from here so the same
 * semantic state looks identical everywhere in the console.
 */

export type StatusTone =
  | 'neutral'
  | 'info'
  | 'progress'
  | 'success'
  | 'warning'
  | 'danger'
  | 'critical';

export interface StatusMeta {
  label: string;
  tone: StatusTone;
  /** Ordering within a lifecycle, used by steppers and progress meters. */
  rank?: number;
  description?: string;
}

const titleCase = (value: string): string =>
  value
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

/* ------------------------------------------------------------------ */
/* Institutional inbox work-item lifecycle                             */
/* ------------------------------------------------------------------ */

export const INBOX_STATE_META: Record<string, StatusMeta> = {
  NEW: { label: 'New', tone: 'info', rank: 0, description: 'Received, not yet opened' },
  SEEN: { label: 'Seen', tone: 'neutral', rank: 1, description: 'Opened by a desk officer' },
  ACKNOWLEDGED: { label: 'Acknowledged', tone: 'progress', rank: 2, description: 'Institution accepted ownership' },
  UNDER_REVIEW: { label: 'Under Review', tone: 'progress', rank: 3, description: 'Officials are investigating' },
  RESPONSE_PREPARED: { label: 'Response Prepared', tone: 'progress', rank: 4, description: 'Draft response awaiting release' },
  PUBLIC_RESPONSE: { label: 'Responded', tone: 'success', rank: 5, description: 'Official response published' },
  ACTION_REPORTED: { label: 'Action Reported', tone: 'success', rank: 6, description: 'Remedial action reported' },
  RESOLVED: { label: 'Resolved', tone: 'success', rank: 7, description: 'Closed' },
  CITIZEN_FOLLOW_UP: { label: 'Citizen Follow-up', tone: 'warning', rank: 5, description: 'Awaiting citizen confirmation' }
};

/** Ordered stages shown in the work-item stepper. */
export const INBOX_WORKFLOW_STAGES = [
  'NEW',
  'SEEN',
  'ACKNOWLEDGED',
  'UNDER_REVIEW',
  'PUBLIC_RESPONSE',
  'RESOLVED'
] as const;

export const getInboxStateMeta = (state?: string): StatusMeta =>
  (state && INBOX_STATE_META[state]) || { label: state ? titleCase(state) : 'Unknown', tone: 'neutral' };

/* ------------------------------------------------------------------ */
/* Report accountability status                                        */
/* ------------------------------------------------------------------ */

export const ACCOUNTABILITY_META: Record<string, StatusMeta> = {
  NOT_ROUTED: { label: 'Not Routed', tone: 'neutral' },
  QUEUED: { label: 'Queued', tone: 'info' },
  ROUTED: { label: 'Routed', tone: 'info' },
  ASSIGNED: { label: 'Assigned', tone: 'progress' },
  ACKNOWLEDGED: { label: 'Acknowledged', tone: 'progress' },
  UNDER_REVIEW: { label: 'Under Review', tone: 'progress' },
  RESPONDED: { label: 'Responded', tone: 'success' },
  ACTION_IN_PROGRESS: { label: 'Action In Progress', tone: 'success' },
  ACTION_REPORTED: { label: 'Action Reported', tone: 'success' },
  RESOLVED: { label: 'Resolved', tone: 'success' },
  COMMUNITY_CONFIRMED: { label: 'Community Confirmed', tone: 'success' },
  REJECTED: { label: 'Rejected', tone: 'danger' }
};

export const getAccountabilityMeta = (status?: string): StatusMeta =>
  (status && ACCOUNTABILITY_META[status]) || { label: status ? titleCase(status) : 'Unrouted', tone: 'neutral' };

/* ------------------------------------------------------------------ */
/* Content moderation                                                  */
/* ------------------------------------------------------------------ */

export const MODERATION_META: Record<string, StatusMeta> = {
  approved: { label: 'Approved', tone: 'success' },
  held: { label: 'Held', tone: 'warning' },
  flagged: { label: 'Flagged', tone: 'warning' },
  removed: { label: 'Removed', tone: 'danger' },
  under_review: { label: 'Under Review', tone: 'progress' },
  restricted: { label: 'Restricted', tone: 'warning' },
  hidden: { label: 'Hidden', tone: 'neutral' }
};

export const getModerationMeta = (status?: string): StatusMeta =>
  (status && MODERATION_META[status]) || { label: status ? titleCase(status) : 'Unknown', tone: 'neutral' };

/* ------------------------------------------------------------------ */
/* Coordination delegations                                            */
/* ------------------------------------------------------------------ */

export const DELEGATION_META: Record<string, StatusMeta> = {
  PENDING: { label: 'Pending', tone: 'warning' },
  ACCEPTED: { label: 'Accepted', tone: 'progress' },
  DECLINED: { label: 'Declined', tone: 'danger' },
  COMPLETED: { label: 'Completed', tone: 'success' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' }
};

export const getDelegationMeta = (status?: string): StatusMeta =>
  (status && DELEGATION_META[status]) || { label: status ? titleCase(status) : 'Unknown', tone: 'neutral' };

/* ------------------------------------------------------------------ */
/* Abuse reports                                                       */
/* ------------------------------------------------------------------ */

export const ABUSE_REPORT_META: Record<string, StatusMeta> = {
  PENDING: { label: 'Pending', tone: 'warning' },
  RESOLVED: { label: 'Resolved', tone: 'success' },
  DISMISSED: { label: 'Dismissed', tone: 'neutral' }
};

export const getAbuseReportMeta = (status?: string): StatusMeta =>
  (status && ABUSE_REPORT_META[status]) || { label: status ? titleCase(status) : 'Unknown', tone: 'neutral' };

/* ------------------------------------------------------------------ */
/* Background jobs                                                     */
/* ------------------------------------------------------------------ */

export const JOB_META: Record<string, StatusMeta> = {
  PENDING: { label: 'Pending', tone: 'info' },
  QUEUED: { label: 'Queued', tone: 'info' },
  RUNNING: { label: 'Running', tone: 'progress' },
  PROCESSING: { label: 'Processing', tone: 'progress' },
  COMPLETED: { label: 'Completed', tone: 'success' },
  FAILED: { label: 'Failed', tone: 'danger' },
  DEAD: { label: 'Dead', tone: 'critical' }
};

export const getJobMeta = (status?: string): StatusMeta =>
  (status && JOB_META[status]) || { label: status ? titleCase(status) : 'Unknown', tone: 'neutral' };

/* ------------------------------------------------------------------ */
/* Priority bands                                                      */
/* ------------------------------------------------------------------ */

export const PRIORITY_META: Record<string, StatusMeta> = {
  ROUTINE: { label: 'Routine', tone: 'neutral' },
  NORMAL: { label: 'Normal', tone: 'neutral' },
  ELEVATED: { label: 'Elevated', tone: 'info' },
  URGENT: { label: 'Urgent', tone: 'warning' },
  EMERGENCY: { label: 'Emergency', tone: 'critical' }
};

export const getPriorityMeta = (priority?: string): StatusMeta =>
  (priority && PRIORITY_META[priority]) || { label: priority ? titleCase(priority) : 'Routine', tone: 'neutral' };

/* ------------------------------------------------------------------ */
/* User roles                                                          */
/* ------------------------------------------------------------------ */

export const ROLE_META: Record<string, StatusMeta> = {
  CITIZEN: { label: 'Citizen', tone: 'neutral' },
  INSTITUTION_REP: { label: 'Institution Rep', tone: 'info' },
  JOURNALIST: { label: 'Journalist', tone: 'progress' },
  MODERATOR: { label: 'Moderator', tone: 'warning' },
  ADMIN: { label: 'Administrator', tone: 'danger' }
};

export const getRoleMeta = (role?: string): StatusMeta =>
  (role && ROLE_META[role]) || { label: role ? titleCase(role) : 'Unknown', tone: 'neutral' };

/* ------------------------------------------------------------------ */
/* SLA helpers                                                         */
/* ------------------------------------------------------------------ */

export type SlaState = 'on-track' | 'at-risk' | 'due-soon' | 'breached' | 'none';

export interface SlaInfo {
  state: SlaState;
  label: string;
  tone: StatusTone;
  /** Percentage of the SLA window remaining, 0-100. */
  percentRemaining: number;
  msRemaining: number;
}

export function evaluateSla(dueAt?: string | null, createdAt?: string | null): SlaInfo {
  const empty: SlaInfo = { state: 'none', label: 'No deadline', tone: 'neutral', percentRemaining: 100, msRemaining: 0 };
  if (!dueAt) return empty;

  const due = new Date(dueAt).getTime();
  if (Number.isNaN(due)) return empty;

  const start = createdAt ? new Date(createdAt).getTime() : due - 24 * 60 * 60 * 1000;
  const now = Date.now();
  const total = Math.max(due - start, 1);
  const msRemaining = due - now;
  const percentRemaining = Math.max(0, Math.min(100, (msRemaining / total) * 100));

  if (msRemaining <= 0) {
    const overdueMs = Math.abs(msRemaining);
    const hours = Math.floor(overdueMs / 3_600_000);
    const label = hours >= 24 ? `${Math.floor(hours / 24)}d overdue` : hours >= 1 ? `${hours}h overdue` : 'Just overdue';
    return { state: 'breached', label, tone: 'critical', percentRemaining: 0, msRemaining };
  }

  const hoursRemaining = msRemaining / 3_600_000;
  const label =
    hoursRemaining >= 48
      ? `${Math.floor(hoursRemaining / 24)}d left`
      : hoursRemaining >= 1
      ? `${Math.floor(hoursRemaining)}h left`
      : `${Math.max(1, Math.floor(msRemaining / 60_000))}m left`;

  if (percentRemaining <= 20) return { state: 'due-soon', label, tone: 'warning', percentRemaining, msRemaining };
  if (percentRemaining <= 45) return { state: 'at-risk', label, tone: 'progress', percentRemaining, msRemaining };
  return { state: 'on-track', label, tone: 'success', percentRemaining, msRemaining };
}

/* ------------------------------------------------------------------ */
/* Coordination queue                                                  */
/* ------------------------------------------------------------------ */

export type QueueSeverity = 'BREACHED' | 'URGENT' | 'DUE_SOON' | 'ON_TRACK' | 'INFO';

export const QUEUE_SEVERITY_META: Record<QueueSeverity, StatusMeta> = {
  BREACHED: { label: 'Breached', tone: 'critical', rank: 0, description: 'Past its response deadline' },
  URGENT: { label: 'Urgent', tone: 'danger', rank: 1, description: 'Emergency/urgent or undelivered' },
  DUE_SOON: { label: 'Due Soon', tone: 'warning', rank: 2, description: 'Deadline approaching or elevated' },
  ON_TRACK: { label: 'On Track', tone: 'info', rank: 3, description: 'Within its window' },
  INFO: { label: 'Info', tone: 'neutral', rank: 4, description: 'No deadline pressure' }
};

export const getQueueSeverityMeta = (severity?: string): StatusMeta =>
  (severity && QUEUE_SEVERITY_META[severity as QueueSeverity]) ||
  { label: severity ? titleCase(severity) : 'Unknown', tone: 'neutral' };

export const QUEUE_SOURCE_META: Record<string, { label: string; short: string }> = {
  INBOX_ITEM: { label: 'Routed work item', short: 'Inbox' },
  DELEGATION: { label: 'Delegation / transfer', short: 'Delegation' },
  JOINT_CASE: { label: 'Joint multi-agency case', short: 'Joint Case' },
  ALERT: { label: 'Undelivered alert', short: 'Alert' },
  ABUSE_REPORT: { label: 'Abuse complaint', short: 'Complaint' },
  MODERATION: { label: 'Moderation hold', short: 'Moderation' }
};

export const getQueueSourceMeta = (source?: string): { label: string; short: string } =>
  (source && QUEUE_SOURCE_META[source]) || { label: source || 'Work item', short: source || 'Work' };

/** Human-readable age, e.g. "3d", "5h", "12m". */
export function formatAge(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return 'now';
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `${Math.max(1, minutes)}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}
