# Speak Up — Repository Notes for Agents

Ghana civic awareness & institutional accountability platform.
Stack: Vite + React 19 frontend, Express backend, SQLite via `better-sqlite3`, tested with vitest + supertest.

## Commands

- `npm run dev` — start the full-stack dev server (`tsx server.ts`, port 3000 by default; honour `PORT`).
- `npm run lint` — `tsc --noEmit` (must stay at exit 0).
- `npm test` — `vitest run --fileParallelism=false`. The suite shares one SQLite file, so **never** enable parallelism.
- Delete `speakup.db*` before a clean run; the DB file is gitignored.

## Seeded credentials

All seeded users share the password `Password123!`.

- Citizen: `citizen@speakup.gh`
- Moderator: `mod@speakup.gh`
- Institution desks: `desk.<institutionId>@speakup.gov.gh` (e.g. `desk.nadmo-ghana@speakup.gov.gh`).

## Institutional coordination model

The reporting → action workflow is intentionally layered. Understanding this saves a lot of time:

1. **Citizen report** (`POST /api/posts`) is stored as a post, tagged to institutions (`post_institution_tags`).
2. **Awareness inbox** (`institutional_inbox_items`) receives one item per tagged institution. Each item is routed to the most specific **desk** (DISTRICT → REGIONAL → NATIONAL → SPECIALIST) via `CoordinationService.resolveDeskForLocation`, gets an SLA `due_at`, and an `inbox_item_routes` row.
3. **Desks** (`institution_desks`) model the national/regional/district hierarchy. **Officers** (`institution_desk_officers`) are the officials attached to a desk.
4. **Delegations** (`coordination_delegations`) move work between institutions/desks: `TRANSFER`, `DELEGATION`, `ESCALATION`, `INFORMATION`. Lifecycle: `PENDING → ACCEPTED/DECLINED → COMPLETED/CANCELLED` via `POST /api/delegations/:id/transition`.
5. **Notifications** (`notifications`) are written by `NotificationService` and published through the transactional outbox (`outbox_events`) to the SSE stream at `/api/events`. SSE filters `notification.created` events by `payload.userId`, so only the intended account receives them.
6. **Internal handoff** (`POST /api/institutions/:id/desks/handoff`) moves an inbox item to another desk in the same institution. Ownership transfers; the source desk gets a read-only **mirror** (`mirror_of_item_id`), and any `ccDeskIds` get mirrors too. Mirror state is kept in sync whenever the source item transitions.
7. **Assignment** (`POST /api/institutions/:id/inbox/:itemId/assign`) attaches `assigned_officer_user_id` (must belong to the institution) and optionally a desk, then notifies the officer (`WORK_ITEM_ASSIGNED`).
8. **Escalation ladder** (`POST /api/institutions/:id/inbox/:itemId/escalate`) climbs `parent_desk_id` (DISTRICT → REGIONAL → NATIONAL). At escalation level ≥ 2 an oversight notification (`WORK_ITEM_ESCALATED_OVERSIGHT`) goes to admins/moderators.
9. **SLA monitoring**: `CoordinationService.runSlaSweep()` warns and escalates overdue inbox items (auto-escalating up the ladder, resetting `due_at`/`sla_notified_at` for idempotency) and stale delegations. It returns `{overdueItems, warningItems, escalatedDelegations, ladderEscalations, notified}`. Runs on a 15-minute worker started in `server.ts`; trigger on demand via `POST /api/admin/coordination/run-sla-sweep`.
10. **Admin oversight actions**: the admin console reads live posture only — `GET /api/admin/privacy` (real P³RE detectors, policies, storage zones, finding counts) and `GET /api/admin/overview` (derived `regionsRepresented`, honest `systemHealth`/`databaseStatus`). Admin mutations (`role`, `verify`, `post moderation`, `abuse-report resolution`) persist the operator reason and write it to `audit_logs`; the UI only claims "reason recorded" when the API returns `reasonRecorded: true`. Admin delegation actions in the Coordination tab call `POST /api/delegations/:id/transition` as oversight (audited with the real actor role).
11. **Joint coordination cases** (`coordination_cases` + `coordination_case_participants` + `coordination_case_events`) bind several institutions to one civic issue. `JointCaseService.createCase` makes the lead a `LEAD` participant, resolves the most specific desk per participant location, and creates an actionable inbox item per institution. Participants move `INVITED → ACCEPTED/DECLINED → COMPLETED` via `POST /api/joint-cases/:caseId/respond`; when every non-observer participant is done the case is resolvable. `resolveCase` marks the linked post `RESOLVED`, closes open inbox items, notifies participants, and sends the reporter a citizen notification. Institution routes: `GET/POST /api/institutions/:id/joint-cases`, `GET /api/joint-cases/:caseId`, `POST .../respond`, `POST .../participants`, `POST .../resolve`. Oversight routes under `/api/admin/coordination/cases`.
12. **Citizen lifecycle notifications** (`CitizenNotificationService`): the reporter is told when a report is `ROUTED`, `ACCEPTED`, `ESCALATED`, `RESOLVED`, `DECLINED`, or `RESPONDED`. Anonymous sentinel authors (`user-anonymous-reporter`, `anon-actor-*`) are skipped. Wired into routing (`app.ts`), delegation transitions + escalation (`CoordinationService`), joint-case resolution (`JointCaseService`), and official responses (`OfficialResponseService`).
13. **Admin ops surfaces**: `GET /api/admin/jobs` + `POST /api/admin/jobs/:id/retry` (requeue failed work), `GET /api/admin/alerts/failed` + `POST /api/admin/alerts/:tagId/redispatch` (force re-run a failed/undelivered alert; `AlertOrchestrator.orchestrateAlert(..., { force: true })` increments `retry_count`), and `GET /api/admin/audit-trail` (immutable `audit_logs` with resolved actor names; `/api/admin/audit-logs` remains the `report_events` timeline). The readiness probe and admin overview count failed jobs as `FAILED` **or** `DEAD_LETTER` and expose `failedAlerts`.
14. **Job recovery**: `jobQueue.recoverInterruptedJobs()` runs on boot (`server.ts`). It requeues `PROCESSING` jobs stranded by a crash and revives `DEAD_LETTER` jobs with a fresh attempt budget, so transient outages self-heal instead of stranding alerts.
15. **Idempotent report creation**: `POST /api/posts` honours the `X-Idempotency-Key` header via `idempotencyMiddleware` (stores 2xx responses in `idempotency_keys`). The composer generates one key per publish attempt (`publishIdempotencyKeyRef`) so a retry cannot duplicate a report.
16. **Protected evidence**: `GET /api/media/protected/:filename` requires authentication **and** a signed access token; only institution reps, oversight, or the token owner may read, and the filename is basename-checked to block path traversal. Every read is written to `evidence_access_logs`.
17. **Unified operations queue** (`CoordinationQueueService.buildQueue`): one severity-ranked triage feed that merges **live** records from six sources — open `institutional_inbox_items`, pending/accepted `coordination_delegations`, open `coordination_cases`, `FAILED` `post_institution_tags`, `PENDING` `abuse_reports`, and `held`/`flagged`/`under_review` posts. Each row carries `source`, `severity` (`BREACHED > URGENT > DUE_SOON > ON_TRACK > INFO`), SLA state, institution/desk/officer and a namespaced id (`inbox:…`, `delegation:…`, `case:…`, `alert:…`, `abuse:…`, `moderation:…`). Severity comes from the shared `evaluateSlaState` (`server/modules/coordination/sla.ts`, mirrors `src/utils/status.ts:evaluateSla`) with a priority-band floor, so client and server never disagree. Exposed at `GET /api/admin/coordination/queue?severity=&source=&limit=` and summarised as `coordinationQueue` on `GET /api/admin/overview`. The admin console renders it via `QueueItemCard` and drives it with real actions (delegation accept/decline → `POST /api/delegations/:id/transition`, alert re-dispatch, joint-case resolve, escalation). Nothing is hardcoded: an empty queue is rendered as empty, not padded with placeholders. The Operations Queue is the admin console's **default landing tab** so triage is the first thing oversight sees.
18. **Assign from the queue**: `QueueItemCard` exposes an **Assign** action for `INBOX_ITEM` rows. The admin console opens a modal that loads the institution's live hierarchy (`GET /api/admin/institutions/:id/hierarchy`), lets the operator pick an official and/or owning desk plus notes, and calls `POST /api/institutions/:id/inbox/:itemId/assign` (oversight bypasses `requireInstitutionScope`). A single operator therefore goes from detection to a named, notified accountable owner without leaving the feed; the row then shows the owner and flips the action to **Reassign**.

## Authorization rules

- `requireRole([...])` for role gates.
- `requireInstitutionScope('id')` (in `server/middleware/auth.middleware.ts`) restricts `:id`-scoped routes to the caller's own institution. `ADMIN`, `MODERATOR`, and `EXECUTIVE_OBSERVER` bypass it for oversight.
- Delegation transitions additionally verify the caller belongs to the sending or receiving institution.

## Unified workflow policy (`shared/workflow.ts`)

Every lifecycle in the platform — work-item, delegation, joint-case participant,
situation and report accountability — is defined once in `shared/workflow.ts`
and imported by **both** the Express layer and the React client. That is the
single source of truth for "may this transition happen?"; do not re-implement a
transition table in a route or a component.

- Pure predicates: `canTransitionWorkItem`, `canTransitionDelegation`,
  `canTransitionParticipant`, `canTransitionSituation`,
  `canTransitionAccountability`, plus `nextAccountabilityStatuses` /
  `nextSituationStatuses` for driving selects.
- Prerequisite gates: `checkCanAssign`, `checkCanEscalate`, `checkCanHandoff`,
  `checkCanResolve`. Each returns `{ ok, reason? }`. `evaluateWorkItemActions(facts)`
  returns per-action `{ enabled, reason }` so the client can render a disabled
  button with the exact reason instead of hiding it.
- **Accountability is forward-only**: `ACCOUNTABILITY_STAGE` ranks every status
  (including legacy aliases); a transition is allowed only when the target rank
  is ≥ the current rank. `ACCOUNTABILITY_LADDER` is the canonical set the UI
  offers. `SUBSTANTIVE_ACCOUNTABILITY` maps statuses that assert real work
  (`RESPONDED`/`ACTION_*`/`RESOLVED`) to the artefact they require, so a report
  cannot be marked resolved without a published response or recorded action.
- **System actors bypass operator gates** but can never move an item backwards.
  Oversight (`ADMIN`/`MODERATOR`) may act where an operator cannot, but a
  resolution still needs a recorded reason.

Server routes surface the policy decision as a specific error: `409`
`INVALID_TRANSITION` for a disallowed edge, `409` `PREREQUISITE_UNMET` for a
legal edge whose artefact is missing, `403` for an ownership/scope failure.
`server/modules/institutional-inbox/InstitutionalInboxService.transitionItemState`
is the canonical entry point; `buildWorkItemFacts` gathers the facts the gates
need. Institution-scope checks apply to `PUT /api/posts/:id/status`,
`POST /api/posts/:id/response` and `POST /api/situations/:id/status` (a
representative may only act on a report or situation routed to their agency;
oversight may act on any).

Client gating: `InstitutionDashboardView` consolidates the nine flat status
tabs into one **Report Register** with quick-filter chips derived from
`ACCOUNTABILITY_STAGE` ranks, and drives the post-status select from
`nextAccountabilityStatuses`. `InstitutionalInboxView` renders workflow buttons
through `evaluateWorkItemActions`. `SituationDossierModal` drives its status
select from `nextSituationStatuses` and surfaces the server error inline.

Civic situations have their own route (`POST /api/situations/:id/status`, scoped
to the situation's institutions) and also advance by system consequence: an
official response on a linked report moves the situation to
`OFFICIAL_RESPONSE_ISSUED` through the same transition map.

## Gotchas

- `users.password_hash` is `NOT NULL`. Use `INSERT OR REPLACE` with a `password_hash` when seeding users; a bare `INSERT OR IGNORE` without it is silently skipped, which then breaks any JOIN on `users` (e.g. desk-officer lookups returning empty).
- `institution_verifications` has a unique constraint on `(user_id, institution_id)` — guard inserts.
- Route ordering matters: specific `/api/.../transition` routes must be declared before any broad `:id` catch-all.
- **Payload casing**: the Express layer returns raw SQLite rows (snake_case). The frontend client (`src/services/api.ts`) runs every coordination/institution response through `camelize()` to match the camelCase UI types. Add new coordination endpoints to that normalization, and keep UI components reading camelCase only.
