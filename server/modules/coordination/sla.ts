export type SlaState = 'on-track' | 'at-risk' | 'due-soon' | 'breached' | 'none';

/**
 * Deadline health for a work item. Mirrors `evaluateSla` in
 * `src/utils/status.ts` so the server-ranked coordination queue and the
 * client-rendered SLA meter never disagree about which items are at risk.
 *
 * When no `createdAt` is supplied the window defaults to 24h before the
 * deadline, matching the client behaviour.
 */
export function evaluateSlaState(dueAt?: string | null, createdAt?: string | null): SlaState {
  if (!dueAt) return 'none';

  const due = new Date(dueAt).getTime();
  if (Number.isNaN(due)) return 'none';

  const start = createdAt ? new Date(createdAt).getTime() : due - 24 * 60 * 60 * 1000;
  const now = Date.now();
  const total = Math.max(due - start, 1);
  const msRemaining = due - now;
  const percentRemaining = Math.max(0, Math.min(100, (msRemaining / total) * 100));

  if (msRemaining <= 0) return 'breached';
  if (percentRemaining <= 20) return 'due-soon';
  if (percentRemaining <= 45) return 'at-risk';
  return 'on-track';
}
