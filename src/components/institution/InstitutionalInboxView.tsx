import React, { useMemo, useState } from 'react';
import {
  Inbox,
  AlertTriangle,
  Flame,
  Clock,
  Filter,
  Search,
  CheckCircle2,
  ChevronRight,
  Eye,
  MessageSquare,
  Building2,
  ArrowUpRight,
  Layers,
  ShieldCheck,
  RefreshCw,
  UserPlus,
  Forward,
  ArrowUpCircle,
  EyeOff,
  X
} from 'lucide-react';
import { InstitutionalInboxItem, CivicPost, InstitutionalDesk, InstitutionTeamMember } from '../../types';
import { CivicPriorityIndicator } from './CivicPriorityIndicator';

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

  // Filter items
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

  const emergencyCount = items.filter(i => i.itemPriority === 'EMERGENCY').length;
  const urgentCount = items.filter(i => i.itemPriority === 'URGENT').length;
  const pendingReviewCount = items.filter(i => ['NEW', 'SEEN', 'ACKNOWLEDGED', 'UNDER_REVIEW'].includes(i.actionState)).length;
  const resolvedCount = items.filter(i => i.actionState === 'RESOLVED').length;

  return (
    <div id="institutional-inbox-view" className="space-y-4">
      {/* Top Telemetry Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
          <div className="text-[10px] uppercase font-bold text-slate-400">Total Awareness Queue</div>
          <div className="text-xl font-black text-white">{items.length}</div>
          <div className="text-[10px] text-slate-500">Submissions & signals</div>
        </div>

        <div className="bg-slate-900 border border-red-900/50 p-3.5 rounded-2xl">
          <div className="text-[10px] uppercase font-bold text-red-400 flex items-center gap-1">
            <Flame className="w-3 h-3 text-red-400" /> Critical / Emergency
          </div>
          <div className="text-xl font-black text-red-400">{emergencyCount + urgentCount}</div>
          <div className="text-[10px] text-slate-500">Requires prompt dispatch</div>
        </div>

        <div className="bg-slate-900 border border-amber-900/50 p-3.5 rounded-2xl">
          <div className="text-[10px] uppercase font-bold text-amber-400 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-400" /> Pending Action
          </div>
          <div className="text-xl font-black text-amber-400">{pendingReviewCount}</div>
          <div className="text-[10px] text-slate-500">New or under review</div>
        </div>

        <div className="bg-slate-900 border border-emerald-900/50 p-3.5 rounded-2xl">
          <div className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Addressed & Resolved
          </div>
          <div className="text-xl font-black text-emerald-400">{resolvedCount}</div>
          <div className="text-[10px] text-slate-500">Closed state actions</div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search queue by keyword, region, district..."
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Priority filter */}
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 font-semibold"
          >
            <option value="ALL">All Priorities</option>
            <option value="EMERGENCY">Emergency</option>
            <option value="URGENT">Urgent</option>
            <option value="ELEVATED">Elevated</option>
            <option value="NORMAL">Normal</option>
          </select>

          {/* Type filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 font-semibold"
          >
            <option value="ALL">All Signal Types</option>
            <option value="REPORT">Civic Reports</option>
            <option value="EVIDENCE">Citizen Evidence</option>
            <option value="MENTION">Direct Mentions</option>
            <option value="FOLLOW_UP">Follow-up Queries</option>
          </select>

          {/* Action State filter */}
          <select
            value={filterState}
            onChange={(e) => setFilterState(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 font-semibold"
          >
            <option value="ALL">All Action States</option>
            <option value="NEW">New (Unseen)</option>
            <option value="SEEN">Seen</option>
            <option value="ACKNOWLEDGED">Acknowledged</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="PUBLIC_RESPONSE">Public Responded</option>
            <option value="RESOLVED">Resolved</option>
          </select>

          <button
            onClick={onRefresh}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors"
            title="Refresh Inbox"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Inbox Items List */}
      <div className="space-y-3">
        {loading && items.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2 bg-slate-900 rounded-2xl border border-slate-800">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-amber-400" />
            <p className="text-xs">Synchronizing institutional awareness queue...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2 bg-slate-900 rounded-2xl border border-slate-800">
            <Inbox className="w-6 h-6 mx-auto text-slate-600" />
            <p className="text-sm font-semibold text-slate-300">No awareness items match your filter criteria.</p>
            <p className="text-xs text-slate-500">Adjust your priority or classification filters above.</p>
          </div>
        ) : (
          filtered.map((item) => {
            const isUpdating = updatingId === item.id;

            return (
              <div
                key={item.id}
                id={`inbox-card-${item.id}`}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-4 rounded-2xl space-y-3 transition-colors text-slate-100"
              >
                {/* Card Header */}
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1 max-w-[75%]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CivicPriorityIndicator
                        priorityScore={item.priorityScore}
                        priorityBand={item.itemPriority}
                        size="sm"
                      />
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                        {item.itemType}
                      </span>
                      {item.mirrorOfItemId && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-600 uppercase flex items-center gap-1">
                          <EyeOff className="w-3 h-3" /> Visibility Mirror
                        </span>
                      )}
                      {(item.escalationLevel ?? 0) > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-950/80 text-red-300 border border-red-700 uppercase">
                          Escalation L{item.escalationLevel}
                        </span>
                      )}
                      {item.region && (
                        <span className="text-[10px] text-amber-400 font-semibold">
                          📍 {item.district ? `${item.district}, ` : ''}{item.region}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-white leading-snug">
                      {item.title}
                    </h3>
                  </div>

                  {/* Action State Tag */}
                  <div className="text-right shrink-0">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wide border ${
                      item.actionState === 'NEW'
                        ? 'bg-blue-950/80 text-blue-300 border-blue-700'
                        : item.actionState === 'SEEN'
                        ? 'bg-slate-800 text-slate-300 border-slate-700'
                        : item.actionState === 'UNDER_REVIEW'
                        ? 'bg-amber-950/80 text-amber-300 border-amber-700'
                        : item.actionState === 'RESOLVED'
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                        : 'bg-purple-950/80 text-purple-300 border-purple-700'
                    }`}>
                      {item.actionState.replace(/_/g, ' ')}
                    </span>
                    <div className="text-[10px] text-slate-500 pt-1 font-mono">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                  {item.summary}
                </p>

                {/* Routing & Assignment telemetry */}
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
                    {item.handoffNotes && (
                      <span className="text-slate-500 italic">“{item.handoffNotes}”</span>
                    )}
                  </div>
                )}

                {/* Workflow Transition Action Strip */}
                <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-400 font-semibold">Workflow Action:</span>

                    {item.mirrorOfItemId ? (
                      <span className="text-[11px] text-slate-500 italic">
                        Read-only visibility mirror — act on the source work item.
                      </span>
                    ) : (
                      <>
                        {item.actionState === 'NEW' && (
                          <button
                            onClick={() => handleStateChange(item.id, 'SEEN')}
                            disabled={isUpdating}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold border border-slate-700 transition-colors"
                          >
                            Mark Seen
                          </button>
                        )}

                        {['NEW', 'SEEN'].includes(item.actionState) && (
                          <button
                            onClick={() => handleStateChange(item.id, 'ACKNOWLEDGED')}
                            disabled={isUpdating}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-bold border border-slate-700 transition-colors"
                          >
                            Acknowledge
                          </button>
                        )}

                        {['NEW', 'SEEN', 'ACKNOWLEDGED'].includes(item.actionState) && (
                          <button
                            onClick={() => handleStateChange(item.id, 'UNDER_REVIEW')}
                            disabled={isUpdating}
                            className="px-2.5 py-1 rounded-lg bg-amber-950/60 hover:bg-amber-900/80 text-amber-200 text-[11px] font-bold border border-amber-700/60 transition-colors"
                          >
                            Start Review
                          </button>
                        )}

                        {item.actionState !== 'RESOLVED' && (
                          <button
                            onClick={() => handleStateChange(item.id, 'RESOLVED')}
                            disabled={isUpdating}
                            className="px-2.5 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 text-[11px] font-bold border border-emerald-700/60 transition-colors"
                          >
                            Mark Resolved
                          </button>
                        )}

                        {onAssign && team.length > 0 && (
                          <button
                            onClick={() => setActionTarget({ item, action: 'ASSIGN' })}
                            disabled={isUpdating}
                            className="px-2.5 py-1 rounded-lg bg-blue-950/60 hover:bg-blue-900/80 text-blue-300 text-[11px] font-bold border border-blue-700/60 transition-colors flex items-center gap-1 disabled:opacity-50"
                          >
                            <UserPlus className="w-3 h-3" /> Assign
                          </button>
                        )}

                        {onHandoff && desks.length > 0 && (
                          <button
                            onClick={() => setActionTarget({ item, action: 'HANDOFF' })}
                            disabled={isUpdating}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold border border-slate-700 transition-colors flex items-center gap-1 disabled:opacity-50"
                          >
                            <Forward className="w-3 h-3" /> Handoff
                          </button>
                        )}

                        {onEscalate && item.actionState !== 'RESOLVED' && (
                          <button
                            onClick={() => setActionTarget({ item, action: 'ESCALATE' })}
                            disabled={isUpdating}
                            className="px-2.5 py-1 rounded-lg bg-red-950/60 hover:bg-red-900/80 text-red-300 text-[11px] font-bold border border-red-700/60 transition-colors flex items-center gap-1 disabled:opacity-50"
                          >
                            <ArrowUpCircle className="w-3 h-3" /> Escalate
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {item.postId && onRespondToItem && !item.mirrorOfItemId && (
                      <button
                        onClick={() => onRespondToItem(item)}
                        className="text-xs text-emerald-300 hover:text-emerald-200 font-bold flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-700/60 transition-colors"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>Respond</span>
                      </button>
                    )}

                    {item.situationId && onOpenSituationDossier && (
                      <button
                        onClick={() => onOpenSituationDossier(item.situationId!)}
                        className="text-xs text-amber-400 hover:underline font-bold flex items-center gap-1"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Situation Dossier</span>
                      </button>
                    )}

                    {item.postId && (
                      <button
                        onClick={() => onSelectPost({ id: item.postId } as any)}
                        className="text-xs text-slate-300 hover:text-white font-bold flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
                      >
                        <span>Inspect Submission</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
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

const ACTION_META: Record<WorkItemAction, { title: string; hint: string; cta: string }> = {
  ASSIGN: {
    title: 'Assign work item',
    hint: 'Attach a named official and optionally re-home the item onto their desk.',
    cta: 'Assign'
  },
  HANDOFF: {
    title: 'Handoff to a desk',
    hint: 'Move ownership to another sub-unit. The current desk keeps a read-only mirror.',
    cta: 'Handoff'
  },
  ESCALATE: {
    title: 'Escalate work item',
    hint: 'Send this up the desk hierarchy to the next supervisory level. Two levels notify oversight.',
    cta: 'Escalate'
  }
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
      payload = {
        toDeskId,
        reason: reason.trim(),
        instructions: instructions.trim() || undefined,
        ccDeskIds: ccDeskIds.length ? ccDeskIds : undefined
      };
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
    setCcDeskIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white">{meta.title}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">{meta.hint}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {error && (
            <div className="bg-red-950/60 border border-red-800 text-red-200 text-xs p-2.5 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5" /> {error}
            </div>
          )}

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 text-[11px] text-slate-300">
            <div className="font-bold text-white">{item.title}</div>
            <div className="text-slate-400 line-clamp-2">{item.summary}</div>
          </div>

          {action === 'ASSIGN' && (
            <>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase">Officer</label>
                <select
                  value={officerUserId}
                  onChange={(e) => setOfficerUserId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200"
                >
                  <option value="">Unassigned</option>
                  {team.filter(m => m.userId).map(m => (
                    <option key={m.userId} value={m.userId}>{m.name}{m.title ? ` — ${m.title}` : ''}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase">Desk (optional)</label>
                <select
                  value={deskId}
                  onChange={(e) => setDeskId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200"
                >
                  <option value="">Keep current desk</option>
                  {desks.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.level})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 resize-none"
                />
              </div>
            </>
          )}

          {action === 'HANDOFF' && (
            <>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase">Target desk</label>
                <select
                  value={toDeskId}
                  onChange={(e) => setToDeskId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200"
                >
                  <option value="">Select desk...</option>
                  {desks.filter(d => d.id !== item.assignedDeskId).map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.level})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase">Reason (required)</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  placeholder="Why is this being handed off?"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 resize-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase">Instructions (optional)</label>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 resize-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase">CC sub-units (visibility only)</label>
                <div className="flex flex-wrap gap-1.5">
                  {desks.filter(d => d.id !== toDeskId).map(d => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => toggleCc(d.id)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                        ccDeskIds.includes(d.id)
                          ? 'bg-amber-500 text-slate-950 border-amber-500'
                          : 'bg-slate-950 text-slate-300 border-slate-700 hover:border-slate-500'
                      }`}
                    >
                      {d.name}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {action === 'ESCALATE' && (
            <>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase">Escalate to (optional)</label>
                <select
                  value={toDeskId}
                  onChange={(e) => setToDeskId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200"
                >
                  <option value="">Next supervisory desk (automatic)</option>
                  {desks.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.level})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase">Reason (optional)</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  placeholder="Why is this being escalated?"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 resize-none"
                />
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
          >
            {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ChevronRight className="w-3.5 h-3.5" />}
            {meta.cta}
          </button>
        </div>
      </div>
    </div>
  );
};
