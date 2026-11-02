import React, { useMemo, useState } from 'react';
import {
  Inbox,
  AlertTriangle,
  Flame,
  Clock,
  Search,
  CheckCircle2,
  MessageSquare,
  Building2,
  ArrowUpRight,
  Layers,
  RefreshCw,
  UserPlus,
  Forward,
  ArrowUpCircle,
  EyeOff
} from 'lucide-react';
import { InstitutionalInboxItem, CivicPost, InstitutionalDesk, InstitutionTeamMember } from '../../types';
import { CivicPriorityIndicator } from './CivicPriorityIndicator';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  InlineAlert,
  Modal,
  SearchInput,
  Select,
  StatCard,
  StatusBadge,
  Textarea,
  WorkflowStepper
} from '../ui';
import { getInboxStateMeta, getPriorityMeta } from '../../utils/status';

interface InstitutionalInboxViewProps {
  items: InstitutionalInboxItem[];
  loading: boolean;
  onRefresh: () => void;
  onTransitionState: (itemId: string, newState: string) => Promise<void>;
  onSelectPost: (post: CivicPost) => void;
  onOpenSituationDossier?: (situationId: string) => void;
  onRespondToItem?: (item: InstitutionalInboxItem) => void;
  desks?: InstitutionalDesk[];
  team?: InstitutionTeamMember[];
  onAssign?: (itemId: string, payload: { officerUserId?: string; deskId?: string; notes?: string }) => Promise<void>;
  onHandoff?: (itemId: string, payload: { toDeskId: string; reason: string; instructions?: string; ccDeskIds?: string[] }) => Promise<void>;
  onEscalate?: (itemId: string, payload: { reason?: string; toDeskId?: string }) => Promise<void>;
}

type WorkItemAction = 'ASSIGN' | 'HANDOFF' | 'ESCALATE';

export const InstitutionalInboxView: React.FC<InstitutionalInboxViewProps> = ({
  items,
  loading,
  onRefresh,
  onTransitionState,
  onSelectPost,
  onOpenSituationDossier,
  onRespondToItem,
  desks = [],
  team = [],
  onAssign,
  onHandoff,
  onEscalate
}) => {
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterState, setFilterState] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionTarget, setActionTarget] = useState<{ item: InstitutionalInboxItem; action: WorkItemAction } | null>(null);

  const deskNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const d of desks) map[d.id] = d.name;
    return map;
  }, [desks]);

  const officerNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const m of team) {
      if (m.userId) map[m.userId] = m.name;
    }
    return map;
  }, [team]);

  const filtered = items.filter((item) => {
    if (filterPriority !== 'ALL' && item.itemPriority !== filterPriority) return false;
    if (filterType !== 'ALL' && item.itemType !== filterType) return false;
    if (filterState !== 'ALL' && item.actionState !== filterState) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchSummary = item.summary.toLowerCase().includes(q);
      const matchLoc = (item.region || '').toLowerCase().includes(q) || (item.district || '').toLowerCase().includes(q);
      if (!matchTitle && !matchSummary && !matchLoc) return false;
    }
    return true;
  });

  const handleStateChange = async (itemId: string, newState: string) => {
    setUpdatingId(itemId);
    try {
      await onTransitionState(itemId, newState);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleActionSubmit = async (payload: any) => {
    if (!actionTarget) return;
    const { item, action } = actionTarget;
    setUpdatingId(item.id);
    try {
      if (action === 'ASSIGN' && onAssign) await onAssign(item.id, payload);
      else if (action === 'HANDOFF' && onHandoff) await onHandoff(item.id, payload);
      else if (action === 'ESCALATE' && onEscalate) await onEscalate(item.id, payload);
      setActionTarget(null);
    } finally {
      setUpdatingId(null);
    }
  };

  const emergencyCount = items.filter((i) => i.itemPriority === 'EMERGENCY').length;
  const urgentCount = items.filter((i) => i.itemPriority === 'URGENT').length;
  const pendingReviewCount = items.filter((i) => ['NEW', 'SEEN', 'ACKNOWLEDGED', 'UNDER_REVIEW'].includes(i.actionState)).length;
  const resolvedCount = items.filter((i) => i.actionState === 'RESOLVED').length;

  return (
    <div id="institutional-inbox-view" className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <StatCard label="Total Queue" value={items.length} hint="Submissions & signals" icon={<Inbox className="w-4 h-4" />} />
        <StatCard label="Critical / Emergency" value={emergencyCount + urgentCount} hint="Prompt dispatch needed" tone="critical" icon={<Flame className="w-4 h-4" />} />
        <StatCard label="Pending Action" value={pendingReviewCount} hint="New or under review" tone="warning" icon={<Clock className="w-4 h-4" />} />
        <StatCard label="Addressed & Resolved" value={resolvedCount} hint="Closed state actions" tone="success" icon={<CheckCircle2 className="w-4 h-4" />} />
      </div>

      <Card padded={false} className="p-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <SearchInput
            icon={<Search className="w-4 h-4" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search queue by keyword, region, district…"
          />
          <Select aria-label="Filter by priority" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="!w-auto">
            <option value="ALL">All Priorities</option>
            <option value="EMERGENCY">Emergency</option>
            <option value="URGENT">Urgent</option>
            <option value="ELEVATED">Elevated</option>
            <option value="NORMAL">Normal</option>
          </Select>
          <Select aria-label="Filter by signal type" value={filterType} onChange={(e) => setFilterType(e.target.value)} className="!w-auto">
            <option value="ALL">All Signal Types</option>
            <option value="REPORT">Civic Reports</option>
            <option value="EVIDENCE">Citizen Evidence</option>
            <option value="MENTION">Direct Mentions</option>
            <option value="FOLLOW_UP">Follow-up Queries</option>
          </Select>
          <Select aria-label="Filter by action state" value={filterState} onChange={(e) => setFilterState(e.target.value)} className="!w-auto">
            <option value="ALL">All Action States</option>
            <option value="NEW">New (Unseen)</option>
            <option value="SEEN">Seen</option>
            <option value="ACKNOWLEDGED">Acknowledged</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="PUBLIC_RESPONSE">Public Responded</option>
            <option value="RESOLVED">Resolved</option>
          </Select>
          <Button variant="secondary" size="sm" onClick={onRefresh} loading={loading} icon={<RefreshCw className="w-4 h-4" />} aria-label="Refresh inbox">
            Refresh
          </Button>
        </div>
      </Card>

      <div className="space-y-3">
        {loading && items.length === 0 ? (
          <Card className="space-y-3">
            <div className="h-5 w-1/3 rounded bg-slate-800/60 animate-pulse" />
            <div className="h-3 w-full rounded bg-slate-800/60 animate-pulse" />
            <div className="h-3 w-2/3 rounded bg-slate-800/60 animate-pulse" />
          </Card>
        ) : filtered.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Inbox className="w-5 h-5" />}
              title="No awareness items match your filters"
              description="Adjust the priority, classification or action-state filters above to widen the results."
            />
          </Card>
        ) : (
          filtered.map((item) => {
            const isUpdating = updatingId === item.id;
            const stateMeta = getInboxStateMeta(item.actionState);

            return (
              <Card key={item.id} className="space-y-3" data-inbox-card={item.id}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1.5 max-w-[75%] min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CivicPriorityIndicator priorityScore={item.priorityScore} priorityBand={item.itemPriority} size="sm" />
                      <Badge tone="neutral" uppercase>{item.itemType}</Badge>
                      {item.mirrorOfItemId && (
                        <Badge tone="neutral" uppercase icon={<EyeOff className="w-3 h-3" />}>
                          Visibility Mirror
                        </Badge>
                      )}
                      {(item.escalationLevel ?? 0) > 0 && (
                        <Badge tone="danger" uppercase>Escalation L{item.escalationLevel}</Badge>
                      )}
                      {item.region && (
                        <span className="text-[10px] text-amber-400 font-semibold">
                          📍 {item.district ? `${item.district}, ` : ''}
                          {item.region}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-white leading-snug">{item.title}</h3>
                  </div>

                  <div className="text-right shrink-0">
                    <StatusBadge meta={stateMeta} size="sm" />
                    <div className="text-[10px] text-slate-500 pt-1 font-mono">{new Date(item.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">{item.summary}</p>

                <div className="rounded-xl bg-slate-950/50 border border-slate-800/70 p-3">
                  <WorkflowStepper currentState={item.actionState} />
                </div>

                {(item.assignedDeskId || item.assignedOfficerId || item.dueAt || item.handoffNotes) && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                    {item.assignedDeskId && (
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-slate-500" />
                        {deskNameById[item.assignedDeskId] || 'Assigned desk'}
                      </span>
                    )}
                    {item.assignedOfficerId && (
                      <span className="flex items-center gap-1 text-blue-300">
                        <UserPlus className="w-3 h-3" />
                        {officerNameById[item.assignedOfficerId] || 'Assigned officer'}
                      </span>
                    )}
                    {item.dueAt && (
                      <span className="flex items-center gap-1 text-amber-400">
                        <Clock className="w-3 h-3" /> Due {new Date(item.dueAt).toLocaleString()}
                      </span>
                    )}
                    {item.handoffNotes && <span className="text-slate-500 italic">“{item.handoffNotes}”</span>}
                  </div>
                )}

                <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Workflow</span>

                    {item.mirrorOfItemId ? (
                      <span className="text-[11px] text-slate-500 italic">Read-only visibility mirror — act on the source work item.</span>
                    ) : (
                      <>
                        {item.actionState === 'NEW' && (
                          <Button variant="secondary" size="xs" loading={isUpdating} onClick={() => handleStateChange(item.id, 'SEEN')}>
                            Mark Seen
                          </Button>
                        )}
                        {['NEW', 'SEEN'].includes(item.actionState) && (
                          <Button variant="secondary" size="xs" loading={isUpdating} onClick={() => handleStateChange(item.id, 'ACKNOWLEDGED')}>
                            Acknowledge
                          </Button>
                        )}
                        {['NEW', 'SEEN', 'ACKNOWLEDGED'].includes(item.actionState) && (
                          <Button variant="warning" size="xs" loading={isUpdating} onClick={() => handleStateChange(item.id, 'UNDER_REVIEW')}>
                            Start Review
                          </Button>
                        )}
                        {item.actionState !== 'RESOLVED' && (
                          <Button variant="success" size="xs" loading={isUpdating} onClick={() => handleStateChange(item.id, 'RESOLVED')}>
                            Mark Resolved
                          </Button>
                        )}
                        {onAssign && team.length > 0 && (
                          <Button
                            variant="primary"
                            size="xs"
                            loading={isUpdating}
                            icon={<UserPlus className="w-3 h-3" />}
                            onClick={() => setActionTarget({ item, action: 'ASSIGN' })}
                          >
                            Assign
                          </Button>
                        )}
                        {onHandoff && desks.length > 0 && (
                          <Button
                            variant="secondary"
                            size="xs"
                            loading={isUpdating}
                            icon={<Forward className="w-3 h-3" />}
                            onClick={() => setActionTarget({ item, action: 'HANDOFF' })}
                          >
                            Handoff
                          </Button>
                        )}
                        {onEscalate && item.actionState !== 'RESOLVED' && (
                          <Button
                            variant="danger"
                            size="xs"
                            loading={isUpdating}
                            icon={<ArrowUpCircle className="w-3 h-3" />}
                            onClick={() => setActionTarget({ item, action: 'ESCALATE' })}
                          >
                            Escalate
                          </Button>
                        )}
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {item.postId && onRespondToItem && !item.mirrorOfItemId && (
                      <Button
                        variant="success"
                        size="xs"
                        icon={<MessageSquare className="w-3 h-3" />}
                        onClick={() => onRespondToItem(item)}
                      >
                        Respond
                      </Button>
                    )}
                    {item.situationId && onOpenSituationDossier && (
                      <Button variant="ghost" size="xs" icon={<Layers className="w-3.5 h-3.5" />} onClick={() => onOpenSituationDossier(item.situationId!)}>
                        Situation Dossier
                      </Button>
                    )}
                    {item.postId && (
                      <Button
                        variant="secondary"
                        size="xs"
                        iconRight={<ArrowUpRight className="w-3 h-3" />}
                        onClick={() => onSelectPost({ id: item.postId } as any)}
                      >
                        Inspect Submission
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {actionTarget && (
        <WorkItemActionModal
          item={actionTarget.item}
          action={actionTarget.action}
          desks={desks}
          team={team}
          onClose={() => setActionTarget(null)}
          onSubmit={handleActionSubmit}
        />
      )}
    </div>
  );
};

interface WorkItemActionModalProps {
  item: InstitutionalInboxItem;
  action: WorkItemAction;
  desks: InstitutionalDesk[];
  team: InstitutionTeamMember[];
  onClose: () => void;
  onSubmit: (payload: any) => Promise<void>;
}

const ACTION_META: Record<WorkItemAction, { title: string; hint: string; cta: string; tone: 'primary' | 'warning' | 'danger' }> = {
  ASSIGN: { title: 'Assign work item', hint: 'Attach a named official and optionally re-home the item onto their desk.', cta: 'Assign', tone: 'primary' },
  HANDOFF: { title: 'Handoff to a desk', hint: 'Move ownership to another sub-unit. The current desk keeps a read-only mirror.', cta: 'Handoff', tone: 'warning' },
  ESCALATE: { title: 'Escalate work item', hint: 'Send this up the desk hierarchy to the next supervisory level. Two levels notify oversight.', cta: 'Escalate', tone: 'danger' }
};

const WorkItemActionModal: React.FC<WorkItemActionModalProps> = ({ item, action, desks, team, onClose, onSubmit }) => {
  const [officerUserId, setOfficerUserId] = useState('');
  const [deskId, setDeskId] = useState(item.assignedDeskId || '');
  const [toDeskId, setToDeskId] = useState('');
  const [reason, setReason] = useState('');
  const [instructions, setInstructions] = useState('');
  const [notes, setNotes] = useState('');
  const [ccDeskIds, setCcDeskIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const meta = ACTION_META[action];

  const handleSubmit = async () => {
    setError(null);
    let payload: any = {};
    if (action === 'ASSIGN') {
      if (!officerUserId && !deskId) return setError('Select an officer or a desk');
      payload = { officerUserId: officerUserId || undefined, deskId: deskId || undefined, notes: notes.trim() || undefined };
    } else if (action === 'HANDOFF') {
      if (!toDeskId) return setError('Select a target desk');
      if (reason.trim().length < 3) return setError('A reason is required');
      payload = { toDeskId, reason: reason.trim(), instructions: instructions.trim() || undefined, ccDeskIds: ccDeskIds.length ? ccDeskIds : undefined };
    } else {
      if (reason.trim().length > 0 && reason.trim().length < 3) return setError('Reason must be at least 3 characters');
      payload = { reason: reason.trim() || undefined, toDeskId: toDeskId || undefined };
    }

    setSubmitting(true);
    try {
      await onSubmit(payload);
    } catch (e: any) {
      setError(e.message || 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleCc = (id: string) => {
    setCcDeskIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={meta.title}
      description={meta.hint}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant={meta.tone} loading={submitting} onClick={handleSubmit} iconRight={<ArrowUpRight className="w-3.5 h-3.5" />}>
            {meta.cta}
          </Button>
        </>
      }
    >
      {error && <InlineAlert tone="danger" title="Cannot submit">{error}</InlineAlert>}

      <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 text-[11px] text-slate-300">
        <div className="font-bold text-white">{item.title}</div>
        <div className="text-slate-400 line-clamp-2">{item.summary}</div>
      </div>

      {action === 'ASSIGN' && (
        <>
          <Field label="Officer">
            <Select value={officerUserId} onChange={(e) => setOfficerUserId(e.target.value)}>
              <option value="">Unassigned</option>
              {team.filter((m) => m.userId).map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.name}
                  {m.title ? ` — ${m.title}` : ''}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Desk" hint="Leave as-is to keep the current desk.">
            <Select value={deskId} onChange={(e) => setDeskId(e.target.value)}>
              <option value="">Keep current desk</option>
              {desks.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.level})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Notes" hint="Optional context for the assigned official.">
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </>
      )}

      {action === 'HANDOFF' && (
        <>
          <Field label="Target desk" required>
            <Select value={toDeskId} onChange={(e) => setToDeskId(e.target.value)}>
              <option value="">Select desk…</option>
              {desks.filter((d) => d.id !== item.assignedDeskId).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.level})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Reason" required hint="Required — recorded in the coordination audit trail.">
            <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this being handed off?" />
          </Field>
          <Field label="Instructions" hint="Optional handling instructions for the receiving desk.">
            <Textarea rows={2} value={instructions} onChange={(e) => setInstructions(e.target.value)} />
          </Field>
          <Field label="CC sub-units" hint="Visibility only — CC'd desks see a mirror and cannot action the item.">
            <div className="flex flex-wrap gap-1.5">
              {desks.filter((d) => d.id !== toDeskId).map((d) => {
                const selected = ccDeskIds.includes(d.id);
                return (
                  <button
                    key={d.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleCc(d.id)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                      selected ? 'bg-amber-500 text-slate-950 border-amber-500' : 'bg-slate-950 text-slate-300 border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    {d.name}
                  </button>
                );
              })}
            </div>
          </Field>
        </>
      )}

      {action === 'ESCALATE' && (
        <>
          <Field label="Escalate to" hint="Defaults to the next supervisory desk in the hierarchy.">
            <Select value={toDeskId} onChange={(e) => setToDeskId(e.target.value)}>
              <option value="">Next supervisory desk (automatic)</option>
              {desks.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.level})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Reason" hint="Optional — helps oversight understand why this was escalated.">
            <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this being escalated?" />
          </Field>
        </>
      )}

      <div className="flex items-center gap-2 text-[10px] text-slate-500 pt-1">
        <AlertTriangle className="w-3 h-3" />
        Current state: {getInboxStateMeta(item.actionState).label} · Priority: {getPriorityMeta(item.itemPriority).label}
      </div>
    </Modal>
  );
};
