/**
 * Workflow policy — the single source of truth for how work moves through the
 * platform, and for the checks & balances that gate each step.
 *
 * Both the Express services and the React console import this module, so a
 * button that the UI disables is also refused by the API, and vice versa. A
 * step can never be skipped by calling the endpoint directly, and the console
 * can never offer an action the server would reject.
 *
 * Pure and dependency-free: no Node, no DOM, no imports.
 */

/* ------------------------------------------------------------------ */
/* Inbox routing roles                                                 */
/* ------------------------------------------------------------------ */

/**
 * How a sub-unit received a work item. `PRIMARY` owns the work. `SUPPORTING`
 * is the supervisory chain (a parent desk that shares accountability and can
 * act). `INFORMED` is the downward cascade — a sub-unit told about work it does
 * not own, so a regional/national desk's intake reaches the MMDA desks without
 * appearing as a co-owner. `SECONDARY`/`CC` are legacy awareness roles.
 */
export type RoutingRole = 'PRIMARY' | 'SECONDARY' | 'SUPPORTING' | 'INFORMED' | 'CC';

/** Display/priority order for the routing trail: most accountable first. */
export const ROUTING_ROLE_RANK: Record<string, number> = {
  PRIMARY: 1,
  SECONDARY: 2,
  SUPPORTING: 3,
  INFORMED: 4,
  CC: 5
};

/** Human labels for each routing role, shared by the API and the console. */
export const ROUTING_ROLE_LABELS: Record<string, string> = {
  PRIMARY: 'Accountable',
  SECONDARY: 'Secondary',
  SUPPORTING: 'Supporting',
  INFORMED: 'Informed (FYI)',
  CC: 'CC'
};

/** Roles that expect the receiving desk to act, versus awareness-only roles. */
export const ROUTING_ACTION_ROLES: string[] = ['PRIMARY', 'SECONDARY', 'SUPPORTING'];

/* ------------------------------------------------------------------ */
/* Work item (institutional awareness inbox) lifecycle                 */
/* ------------------------------------------------------------------ */

export type WorkItemState =
  | 'NEW'
  | 'SEEN'
  | 'ACKNOWLEDGED'
  | 'UNDER_REVIEW'
  | 'RESPONSE_PREPARED'
  | 'PUBLIC_RESPONSE'
  | 'ACTION_REPORTED'
  | 'RESOLVED'
  | 'CITIZEN_FOLLOW_UP';

/** Ordered lifecycle, used for progress meters and steppers. */
export const WORK_ITEM_SEQUENCE: WorkItemState[] = [
  'NEW',
  'SEEN',
  'ACKNOWLEDGED',
  'UNDER_REVIEW',
  'RESPONSE_PREPARED',
  'PUBLIC_RESPONSE',
  'ACTION_REPORTED',
  'RESOLVED'
];

/** Terminal states that no longer accept operational transitions. */
export const WORK_ITEM_TERMINAL: WorkItemState[] = ['RESOLVED'];

/**
 * States an *operator* may move a work item into. The system (an official
 * response, a joint-case resolution, an SLA sweep) may advance further in one
 * hop — that is a consequence of a real event, not a manual click.
 */
export const WORK_ITEM_TRANSITIONS: Record<WorkItemState, WorkItemState[]> = {
  NEW: ['SEEN', 'ACKNOWLEDGED'],
  SEEN: ['ACKNOWLEDGED'],
  ACKNOWLEDGED: ['UNDER_REVIEW', 'CITIZEN_FOLLOW_UP'],
  UNDER_REVIEW: ['RESPONSE_PREPARED', 'PUBLIC_RESPONSE', 'ACTION_REPORTED', 'CITIZEN_FOLLOW_UP'],
  RESPONSE_PREPARED: ['PUBLIC_RESPONSE', 'UNDER_REVIEW'],
  PUBLIC_RESPONSE: ['ACTION_REPORTED', 'RESOLVED'],
  ACTION_REPORTED: ['RESOLVED'],
  CITIZEN_FOLLOW_UP: ['SEEN', 'ACKNOWLEDGED', 'UNDER_REVIEW', 'RESOLVED'],
  RESOLVED: []
};

export function canTransitionWorkItem(from: string, to: string): boolean {
  const allowed = WORK_ITEM_TRANSITIONS[from as WorkItemState];
  return Boolean(allowed && allowed.includes(to as WorkItemState));
}

/* ------------------------------------------------------------------ */
/* Report accountability status                                        */
/* ------------------------------------------------------------------ */

export type AccountabilityStatus =
  | 'NOT_ROUTED'
  | 'NEW_AWARENESS'
  | 'URGENT'
  | 'TRENDING'
  | 'QUEUED'
  | 'ROUTED'
  | 'AWAITING_ACKNOWLEDGEMENT'
  | 'ACKNOWLEDGED'
  | 'ASSIGNED'
  | 'UNDER_REVIEW'
  | 'CITIZEN_FOLLOW_UP'
  | 'RESPONDED'
  | 'ACTION_IN_PROGRESS'
  | 'ACTION_REPORTED'
  | 'RESOLVED'
  | 'CLOSED'
  | 'COMMUNITY_CONFIRMED'
  | 'CITIZEN_CONFIRMED'
  | 'COMMUNITY_DISPUTED'
  | 'REJECTED';

/**
 * The accountability field is a coarse projection of where a report stands.
 * Its vocabulary is a little mixed (awareness flags, routing, review, and the
 * substantive outcomes), so we model it as a monotonic ladder: a report may
 * only ever move forward. That alone stops the dangerous case of un-resolving
 * a closed report, while the substantive steps (a response, an action, a
 * resolution) carry their own artefact gates below.
 */
export const ACCOUNTABILITY_STAGE: Record<string, number> = {
  NOT_ROUTED: 0,
  NEW_AWARENESS: 0,
  URGENT: 0,
  TRENDING: 0,
  QUEUED: 1,
  ROUTED: 1,
  AWAITING_ACKNOWLEDGEMENT: 1,
  ACKNOWLEDGED: 2,
  ASSIGNED: 2,
  UNDER_REVIEW: 3,
  CITIZEN_FOLLOW_UP: 3,
  RESPONDED: 4,
  ACTION_IN_PROGRESS: 5,
  ACTION_REPORTED: 5,
  RESOLVED: 6,
  CLOSED: 6,
  COMMUNITY_CONFIRMED: 7,
  CITIZEN_CONFIRMED: 7,
  COMMUNITY_DISPUTED: 7,
  REJECTED: 7
};

/** Terminal outcomes: a closed or confirmed report may not be reopened here. */
export const ACCOUNTABILITY_TERMINAL: string[] = [
  'RESOLVED',
  'CLOSED',
  'COMMUNITY_CONFIRMED',
  'CITIZEN_CONFIRMED',
  'REJECTED'
];

/**
 * The canonical public-facing ladder an operator is offered. Legacy aliases in
 * ACCOUNTABILITY_STAGE still validate for data written before this policy, but
 * are not presented as choices.
 */
export const ACCOUNTABILITY_LADDER: string[] = [
  'NOT_ROUTED',
  'ROUTED',
  'ACKNOWLEDGED',
  'UNDER_REVIEW',
  'RESPONDED',
  'ACTION_REPORTED',
  'RESOLVED'
];

/** Statuses that represent a genuine resolution, not an arbitrary jump. */
export const RESOLVED_ACCOUNTABILITY: string[] = ['RESOLVED', 'CLOSED', 'COMMUNITY_CONFIRMED', 'CITIZEN_CONFIRMED'];

/**
 * A substantive status asserts that real work has happened; each maps to the
 * artefact that must exist before it can be claimed.
 */
export const SUBSTANTIVE_ACCOUNTABILITY: Record<string, 'RESPONSE' | 'ACTION' | 'RESOLUTION'> = {
  RESPONDED: 'RESPONSE',
  ACTION_IN_PROGRESS: 'ACTION',
  ACTION_REPORTED: 'ACTION',
  RESOLVED: 'RESOLUTION',
  CLOSED: 'RESOLUTION',
  COMMUNITY_CONFIRMED: 'RESOLUTION',
  CITIZEN_CONFIRMED: 'RESOLUTION'
};

export function canTransitionAccountability(from: string | null | undefined, to: string): boolean {
  const key = (from || 'NOT_ROUTED') as string;
  if (key === to) return false;
  const fromStage = ACCOUNTABILITY_STAGE[key];
  const toStage = ACCOUNTABILITY_STAGE[to];
  if (fromStage === undefined || toStage === undefined) return false;
  return toStage >= fromStage;
}

/** The statuses an operator may choose next, given the current one. */
export function nextAccountabilityStatuses(from: string | null | undefined): string[] {
  const key = (from || 'NOT_ROUTED') as string;
  const fromStage = ACCOUNTABILITY_STAGE[key] ?? 0;
  // Offer only the canonical ladder, not every legacy alias that happens to sit
  // on a later rank — otherwise the control is a wall of near-duplicate states.
  return ACCOUNTABILITY_LADDER.filter(
    (status) => status !== key && ACCOUNTABILITY_STAGE[status] >= fromStage
  );
}

/* ------------------------------------------------------------------ */
/* Coordination delegations                                            */
/* ------------------------------------------------------------------ */

export const DELEGATION_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['ACCEPTED', 'DECLINED', 'CANCELLED'],
  ACCEPTED: ['COMPLETED', 'CANCELLED'],
  DECLINED: ['CANCELLED'],
  COMPLETED: [],
  CANCELLED: []
};

export function canTransitionDelegation(from: string, to: string): boolean {
  const allowed = DELEGATION_TRANSITIONS[from];
  return Boolean(allowed && allowed.includes(to));
}

/**
 * The coarse delegation status a work-item state implies. A delegation and the
 * inbox item it created describe the same work at two resolutions; without a
 * mapping they drift (an operator acknowledges the item while the delegation sits
 * PENDING forever). This is that mapping, in one place.
 *
 * Returns null when the state carries no delegation-level meaning (fine-grained
 * progress such as RESPONSE_PREPARED, or CITIZEN_FOLLOW_UP, which is not a
 * decline).
 */
export function delegationStatusForWorkItemState(state: string): 'ACCEPTED' | 'COMPLETED' | null {
  switch (state) {
    case 'ACKNOWLEDGED':
    case 'UNDER_REVIEW':
    case 'RESPONSE_PREPARED':
    case 'PUBLIC_RESPONSE':
    case 'ACTION_REPORTED':
      return 'ACCEPTED';
    case 'RESOLVED':
      return 'COMPLETED';
    default:
      return null;
  }
}

/**
 * The work-item state a delegation status projects onto. The inverse direction
 * of the mapping above, used when the delegation is the one that moved.
 */
export function workItemStateForDelegationStatus(status: string): WorkItemState | null {
  switch (status) {
    case 'ACCEPTED':
      return 'ACKNOWLEDGED';
    case 'COMPLETED':
      return 'RESOLVED';
    case 'DECLINED':
      return 'CITIZEN_FOLLOW_UP';
    case 'PENDING':
      return 'NEW';
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/* Joint case participants & cases                                     */
/* ------------------------------------------------------------------ */

export const PARTICIPANT_TRANSITIONS: Record<string, string[]> = {
  INVITED: ['ACCEPTED', 'DECLINED'],
  ACCEPTED: ['COMPLETED', 'DECLINED'],
  DECLINED: ['ACCEPTED'],
  COMPLETED: []
};

export function canTransitionParticipant(from: string, to: string): boolean {
  const allowed = PARTICIPANT_TRANSITIONS[from];
  return Boolean(allowed && allowed.includes(to));
}

/* ------------------------------------------------------------------ */
/* Civic situations                                                    */
/* ------------------------------------------------------------------ */

export const SITUATION_TRANSITIONS: Record<string, string[]> = {
  REPORTED: ['VERIFYING'],
  VERIFYING: ['ACTIVE_MONITORING', 'OFFICIAL_RESPONSE_ISSUED', 'REPORTED'],
  ACTIVE_MONITORING: ['INTERVENTION_IN_PROGRESS', 'OFFICIAL_RESPONSE_ISSUED', 'RESOLVED'],
  OFFICIAL_RESPONSE_ISSUED: ['INTERVENTION_IN_PROGRESS', 'RESOLVED'],
  INTERVENTION_IN_PROGRESS: ['RESOLVED', 'ACTIVE_MONITORING'],
  RESOLVED: ['CLOSED'],
  CLOSED: []
};

export function canTransitionSituation(from: string, to: string): boolean {
  const allowed = SITUATION_TRANSITIONS[from];
  return Boolean(allowed && allowed.includes(to));
}

/** The situation statuses an operator may move to next, given the current one. */
export function nextSituationStatuses(from: string | null | undefined): string[] {
  return SITUATION_TRANSITIONS[(from || 'REPORTED') as string] || [];
}

/** Canonical left-to-right order of the situation lifecycle, for the stepper. */
export const SITUATION_STAGES: string[] = [
  'REPORTED',
  'VERIFYING',
  'ACTIVE_MONITORING',
  'OFFICIAL_RESPONSE_ISSUED',
  'INTERVENTION_IN_PROGRESS',
  'RESOLVED',
  'CLOSED'
];

/** Short human labels for each situation stage. */
export const SITUATION_STAGE_LABELS: Record<string, string> = {
  REPORTED: 'Reported',
  VERIFYING: 'Verifying',
  ACTIVE_MONITORING: 'Monitoring',
  OFFICIAL_RESPONSE_ISSUED: 'Response Issued',
  INTERVENTION_IN_PROGRESS: 'Intervention',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed'
};

/* ------------------------------------------------------------------ */
/* Work-item action availability (checks & balances)                   */
/* ------------------------------------------------------------------ */

export interface WorkItemFacts {
  actionState: string;
  /** An official response already exists on the linked report. */
  hasResponse?: boolean;
  /** A remedial action has already been recorded against the linked report. */
  hasAction?: boolean;
  /** An accountable official is currently attached. */
  hasOfficer?: boolean;
  /** The item is a read-only visibility mirror. */
  isMirror?: boolean;
  /** True when the viewer has platform oversight (ADMIN / MODERATOR). */
  isOversight?: boolean;
}

export type WorkItemActionId =
  | 'SEEN'
  | 'ACKNOWLEDGE'
  | 'START_REVIEW'
  | 'ASSIGN'
  | 'HANDOFF'
  | 'ESCALATE'
  | 'RESPOND'
  | 'REPORT_ACTION'
  | 'RESOLVE';

export interface WorkItemActionAvailability {
  id: WorkItemActionId;
  label: string;
  targetState?: WorkItemState;
  enabled: boolean;
  /** Why the action is unavailable — surfaced as the button's tooltip. */
  reason?: string;
  /** Exactly one action is the recommended next step in the sequence. */
  isNextStep?: boolean;
}

const has = (state: string, ...allowed: string[]) => allowed.includes(state);

/**
 * The gating policy for a single work item. Every entry is either enabled or
 * carries a human-readable reason, so the console can disable the button and
 * explain what must happen first instead of letting an operator click blindly.
 */
export function evaluateWorkItemActions(facts: WorkItemFacts): WorkItemActionAvailability[] {
  const s = facts.actionState || 'NEW';
  const mirror = Boolean(facts.isMirror);
  const oversight = Boolean(facts.isOversight);
  const resolutionArtefact = Boolean(facts.hasResponse || facts.hasAction) || has(s, 'PUBLIC_RESPONSE', 'ACTION_REPORTED');

  const a = (
    id: WorkItemActionId,
    label: string,
    enabled: boolean,
    reason?: string,
    targetState?: WorkItemState
  ): WorkItemActionAvailability => ({ id, label, enabled, reason: enabled ? undefined : reason, targetState });

  const actions: WorkItemActionAvailability[] = [
    a('SEEN', 'Mark Seen', s === 'NEW', 'This item has already been opened.', 'SEEN'),
    a(
      'ACKNOWLEDGE',
      'Acknowledge',
      has(s, 'NEW', 'SEEN'),
      has(s, 'CITIZEN_FOLLOW_UP') ? 'Re-acknowledge is not required; move it back into review instead.' : 'Already acknowledged.',
      'ACKNOWLEDGED'
    ),
    a(
      'START_REVIEW',
      'Start Review',
      has(s, 'ACKNOWLEDGED') || (has(s, 'NEW', 'SEEN') && Boolean(facts.hasOfficer)),
      has(s, 'NEW', 'SEEN')
        ? 'Acknowledge the item — or assign an accountable official — before starting a review.'
        : 'This item is already in review or beyond it.',
      'UNDER_REVIEW'
    ),
    a(
      'ASSIGN',
      facts.hasOfficer ? 'Reassign' : 'Assign official',
      !has(s, 'RESOLVED') && !has(s, 'CITIZEN_FOLLOW_UP'),
      has(s, 'RESOLVED')
        ? 'This item is resolved; reopen it before changing the owner.'
        : 'This item is awaiting citizen follow-up; resolve that first.',
      undefined
    ),
    a(
      'HANDOFF',
      'Handoff',
      has(s, 'NEW', 'SEEN', 'ACKNOWLEDGED', 'UNDER_REVIEW', 'RESPONSE_PREPARED', 'PUBLIC_RESPONSE', 'ACTION_REPORTED'),
      'This item can no longer be handed off.',
      undefined
    ),
    a(
      'ESCALATE',
      'Escalate',
      has(s, 'SEEN', 'ACKNOWLEDGED', 'UNDER_REVIEW', 'RESPONSE_PREPARED', 'PUBLIC_RESPONSE', 'ACTION_REPORTED') || oversight,
      has(s, 'NEW') ? 'Open or acknowledge the item before escalating it up the hierarchy.' : 'This item can no longer be escalated.',
      undefined
    ),
    a(
      'RESPOND',
      'Respond',
      has(s, 'NEW', 'SEEN', 'ACKNOWLEDGED', 'UNDER_REVIEW', 'RESPONSE_PREPARED', 'PUBLIC_RESPONSE', 'ACTION_REPORTED'),
      'This item can no longer be answered.',
      undefined
    ),
    a(
      'REPORT_ACTION',
      'Report Action',
      has(s, 'UNDER_REVIEW', 'RESPONSE_PREPARED', 'PUBLIC_RESPONSE'),
      'Start a review before reporting remedial action.',
      'ACTION_REPORTED'
    ),
    a(
      'RESOLVE',
      'Resolve',
      resolutionArtefact,
      'A case cannot be closed silently — publish an official response or report remedial action first.',
      'RESOLVED'
    )
  ];

  // A read-only mirror can never be actioned; only the source carries ownership.
  if (mirror) {
    for (const action of actions) {
      action.enabled = false;
      action.reason = 'Read-only visibility mirror — act on the source work item.';
    }
  }

  // Mark the single next step in the sequence so the console can guide the operator.
  const nextStep = actions.find((x) => x.enabled && has(s, 'NEW', 'SEEN', 'ACKNOWLEDGED', 'UNDER_REVIEW'));
  if (nextStep) nextStep.isNextStep = true;

  // Oversight may resolve a case that lacks an artefact, but must give a reason.
  if (oversight) {
    const resolve = actions.find((x) => x.id === 'RESOLVE');
    if (resolve && !resolve.enabled && !mirror) {
      resolve.enabled = true;
      resolve.reason = undefined;
    }
  }

  return actions;
}

/* ------------------------------------------------------------------ */
/* Server-side prerequisite assertions                                 */
/* ------------------------------------------------------------------ */

export interface Prerequisite {
  ok: boolean;
  reason?: string;
}

const OK: Prerequisite = { ok: true };

/** Assigning a named owner requires the item to be open and actionable. */
export function checkCanAssign(facts: WorkItemFacts): Prerequisite {
  if (facts.isMirror) return { ok: false, reason: 'Cannot assign a read-only mirror.' };
  if (has(facts.actionState, 'RESOLVED')) return { ok: false, reason: 'This item is resolved; reopen it before reassigning.' };
  if (has(facts.actionState, 'CITIZEN_FOLLOW_UP')) return { ok: false, reason: 'This item is awaiting citizen follow-up; resolve that first.' };
  return OK;
}

/**
 * A handoff routes ownership between desks. Routing is orthogonal to the
 * acknowledgement lifecycle — a desk may route work it has just received — so
 * the only prerequisites are that the item is still open and is not a mirror.
 */
export function checkCanHandoff(facts: WorkItemFacts): Prerequisite {
  if (facts.isMirror) return { ok: false, reason: 'Cannot hand off a read-only mirror.' };
  if (has(facts.actionState, 'RESOLVED')) return { ok: false, reason: 'This item is already resolved.' };
  return OK;
}

/**
 * Escalation climbs the desk hierarchy. It may be raised by an operator or
 * fired automatically by the SLA monitor. An operator must at least have
 * opened the item (oversight may escalate anything); a system escalation is
 * never blocked by operator prerequisites.
 */
export function checkCanEscalate(facts: WorkItemFacts, opts: { isSystem?: boolean } = {}): Prerequisite {
  if (opts.isSystem) return OK;
  if (facts.isMirror) return { ok: false, reason: 'Cannot escalate a read-only mirror.' };
  if (has(facts.actionState, 'RESOLVED')) return { ok: false, reason: 'This item is already resolved.' };
  if (has(facts.actionState, 'NEW') && !facts.isOversight) {
    return { ok: false, reason: 'Open or acknowledge the item before escalating it.' };
  }
  return OK;
}

/**
 * Resolution requires a genuine artefact — a published response or a recorded
 * action — unless the caller has oversight and supplies an explicit reason.
 * An item in citizen follow-up may be closed with a note regardless.
 */
export function checkCanResolve(facts: WorkItemFacts, hasReason: boolean): Prerequisite {
  if (facts.isMirror) return { ok: false, reason: 'Cannot resolve a read-only mirror.' };
  if (has(facts.actionState, 'RESOLVED')) return { ok: false, reason: 'This item is already resolved.' };
  if (has(facts.actionState, 'CITIZEN_FOLLOW_UP')) {
    return hasReason ? OK : { ok: false, reason: 'A resolution note is required so the closure is on the record.' };
  }
  const artefact = Boolean(facts.hasResponse || facts.hasAction) || has(facts.actionState, 'PUBLIC_RESPONSE', 'ACTION_REPORTED');
  if (!artefact && !(facts.isOversight && hasReason)) {
    return {
      ok: false,
      reason: 'A case cannot be closed silently — publish an official response or report remedial action first.'
    };
  }
  if (!hasReason) {
    return { ok: false, reason: 'A resolution note is required so the closure is on the record.' };
  }
  return OK;
}

/**
 * A joint case may only be resolved once every non-observer participant has
 * completed or declined its part. Platform oversight is the escalation
 * authority and may close a case over outstanding participants — the required
 * resolution summary becomes the on-record justification.
 */
export function checkCanResolveCase(params: {
  outstandingParticipants: number;
  isOversight: boolean;
}): Prerequisite {
  if (params.outstandingParticipants <= 0) return OK;
  if (params.isOversight) return OK;
  return {
    ok: false,
    reason: `Cannot resolve: ${params.outstandingParticipants} participant(s) have not completed or declined their part.`
  };
}
