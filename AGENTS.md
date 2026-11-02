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

## Authorization rules

- `requireRole([...])` for role gates.
- `requireInstitutionScope('id')` (in `server/middleware/auth.middleware.ts`) restricts `:id`-scoped routes to the caller's own institution. `ADMIN`, `MODERATOR`, and `EXECUTIVE_OBSERVER` bypass it for oversight.
- Delegation transitions additionally verify the caller belongs to the sending or receiving institution.

## Gotchas

- `users.password_hash` is `NOT NULL`. Use `INSERT OR REPLACE` with a `password_hash` when seeding users; a bare `INSERT OR IGNORE` without it is silently skipped, which then breaks any JOIN on `users` (e.g. desk-officer lookups returning empty).
- `institution_verifications` has a unique constraint on `(user_id, institution_id)` — guard inserts.
- Route ordering matters: specific `/api/.../transition` routes must be declared before any broad `:id` catch-all.
- **Payload casing**: the Express layer returns raw SQLite rows (snake_case). The frontend client (`src/services/api.ts`) runs every coordination/institution response through `camelize()` to match the camelCase UI types. Add new coordination endpoints to that normalization, and keep UI components reading camelCase only.
