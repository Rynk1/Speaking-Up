import React, { useState, useEffect, useCallback } from 'react';
import {
  GitPullRequest,
  ArrowRight,
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  RefreshCw,
  Send,
  Layers,
  X,
  Loader2
} from 'lucide-react';
import { Institution, CoordinationDelegation, InstitutionWorkload, DelegationType } from '../../types';
import { api } from '../../services/api';

interface CoordinationDeskViewProps {
  currentInstitution: Institution;
  institutions: Institution[];
  currentUser: any;
  onSelectPost?: (postId: string) => void;
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-950/70 text-amber-300 border-amber-700',
  ACCEPTED: 'bg-blue-950/70 text-blue-300 border-blue-700',
  COMPLETED: 'bg-emerald-950/70 text-emerald-300 border-emerald-700',
  DECLINED: 'bg-red-950/70 text-red-300 border-red-700',
  CANCELLED: 'bg-slate-800 text-slate-400 border-slate-700'
};

const TYPE_STYLES: Record<string, string> = {
  TRANSFER: 'text-rose-300',
  DELEGATION: 'text-blue-300',
  ESCALATION: 'text-amber-300',
  INFORMATION: 'text-slate-300'
};

export const CoordinationDeskView: React.FC<CoordinationDeskViewProps> = ({
  currentInstitution,
  institutions,
  currentUser,
  onSelectPost
}) => {
  const [direction, setDirection] = useState<'INCOMING' | 'OUTGOING'>('INCOMING');
  const [delegations, setDelegations] = useState<CoordinationDelegation[]>([]);
  const [workload, setWorkload] = useState<InstitutionWorkload | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);

  const loadData = useCallback(async () => {
    if (!currentInstitution) return;
    setLoading(true);
    setError(null);
    try {
      const [delegationsRes, workloadRes] = await Promise.all([
        api.getInstitutionDelegations(currentInstitution.id, { direction, limit: 50 }),
        api.getInstitutionWorkload(currentInstitution.id)
      ]);
      setDelegations(delegationsRes.items || []);
      setWorkload(workloadRes);
    } catch (e: any) {
      setError(e.message || 'Failed to load coordination data');
    } finally {
      setLoading(false);
    }
  }, [currentInstitution, direction]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTransition = async (delegationId: string, status: 'ACCEPTED' | 'DECLINED' | 'COMPLETED') => {
    setActionId(delegationId);
    setError(null);
    try {
      await api.transitionDelegation(delegationId, status);
      await loadData();
    } catch (e: any) {
      setError(e.message || 'Failed to update delegation');
    } finally {
      setActionId(null);
    }
  };

  const pendingIncoming = delegations.filter(d => d.status === 'PENDING' && direction === 'INCOMING').length;

  return (
    <div id="coordination-desk-view" className="space-y-4">
      {/* Workload telemetry */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
          <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
            <GitPullRequest className="w-3 h-3" /> Open Work Items
          </div>
          <div className="text-xl font-black text-white">{workload?.total ?? 0}</div>
          <div className="text-[10px] text-slate-500">Owned by this institution</div>
        </div>

        <div className="bg-slate-900 border border-amber-900/50 p-3.5 rounded-2xl">
          <div className="text-[10px] uppercase font-bold text-amber-400 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Pending Delegations
          </div>
          <div className="text-xl font-black text-amber-400">{workload?.pendingDelegations ?? 0}</div>
          <div className="text-[10px] text-slate-500">Awaiting acceptance</div>
        </div>

        <div className="bg-slate-900 border border-red-900/50 p-3.5 rounded-2xl">
          <div className="text-[10px] uppercase font-bold text-red-400 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> SLA Overdue
          </div>
          <div className="text-xl font-black text-red-400">{workload?.overdueItems ?? 0}</div>
          <div className="text-[10px] text-slate-500">Past response deadline</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
          <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
            <Layers className="w-3 h-3" /> Active Desks
          </div>
          <div className="text-xl font-black text-white">{workload?.byDesk?.length ?? 0}</div>
          <div className="text-[10px] text-slate-500">Receiving sub-units</div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-2xl border border-slate-800">
          <button
            onClick={() => setDirection('INCOMING')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
              direction === 'INCOMING' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" /> Incoming
            {pendingIncoming > 0 && (
              <span className="ml-0.5 px-1.5 rounded-full bg-slate-950 text-amber-400 text-[10px]">{pendingIncoming}</span>
            )}
          </button>
          <button
            onClick={() => setDirection('OUTGOING')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
              direction === 'OUTGOING' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" /> Outgoing
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsComposerOpen(true)}
            className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> New Delegation
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-950/60 border border-red-800 text-red-200 text-xs p-3 rounded-2xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Delegation list */}
      {loading && delegations.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-slate-400 text-sm gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading coordination queue...
        </div>
      ) : delegations.length === 0 ? (
        <div className="bg-slate-900 border border-dashed border-slate-800 rounded-2xl p-10 text-center text-slate-400 text-sm">
          <GitPullRequest className="w-8 h-8 mx-auto mb-2 text-slate-600" />
          No {direction.toLowerCase()} delegations recorded.
        </div>
      ) : (
        <div className="space-y-3">
          {delegations.map((d) => (
            <div key={d.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 text-slate-100">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1 min-w-[200px] flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-bold uppercase ${TYPE_STYLES[d.delegationType] || 'text-slate-300'}`}>
                      {d.delegationType}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${STATUS_STYLES[d.status] || STATUS_STYLES.PENDING}`}>
                      {d.status}
                    </span>
                    {d.fromInstitutionId && d.toInstitutionId === d.fromInstitutionId && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-600 uppercase flex items-center gap-1">
                        <Layers className="w-3 h-3" /> Internal
                      </span>
                    )}
                    {(d.escalationLevel ?? 0) > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-950/80 text-red-300 border border-red-700 uppercase">
                        L{d.escalationLevel}
                      </span>
                    )}
                    {d.priority && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                        {d.priority}
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-white leading-snug">
                    {d.postTitle || 'Linked civic report'}
                  </h4>
                  <p className="text-xs text-slate-300">{d.reason}</p>
                </div>

                <div className="text-right text-[11px] text-slate-400 space-y-0.5 shrink-0">
                  <div className="flex items-center gap-1 justify-end">
                    <Building2 className="w-3 h-3" />
                    {direction === 'INCOMING' ? d.fromInstitutionName || 'External' : d.toInstitutionName}
                  </div>
                  {d.toDeskName && <div className="text-slate-500">{d.toDeskName}</div>}
                  {d.dueAt && (
                    <div className="flex items-center gap-1 justify-end text-amber-400">
                      <Clock className="w-3 h-3" /> Due {new Date(d.dueAt).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>

              {d.instructions && (
                <p className="text-[11px] text-slate-400 bg-slate-950/60 border border-slate-800 rounded-xl p-2.5">
                  Instructions: {d.instructions}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
                <button
                  onClick={() => d.postId && onSelectPost?.(d.postId)}
                  disabled={!d.postId}
                  className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 disabled:opacity-40"
                >
                  View report <ArrowRight className="w-3 h-3" />
                </button>

                {direction === 'INCOMING' && d.status === 'PENDING' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTransition(d.id, 'DECLINED')}
                      disabled={actionId === d.id}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Decline
                    </button>
                    <button
                      onClick={() => handleTransition(d.id, 'ACCEPTED')}
                      disabled={actionId === d.id}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Accept
                    </button>
                  </div>
                )}

                {direction === 'INCOMING' && d.status === 'ACCEPTED' && (
                  <button
                    onClick={() => handleTransition(d.id, 'COMPLETED')}
                    disabled={actionId === d.id}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Mark Complete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {isComposerOpen && (
        <DelegationComposerModal
          currentInstitution={currentInstitution}
          institutions={institutions}
          currentUser={currentUser}
          onClose={() => setIsComposerOpen(false)}
          onCreated={() => {
            setIsComposerOpen(false);
            setDirection('OUTGOING');
            loadData();
          }}
        />
      )}
    </div>
  );
};

interface DelegationComposerModalProps {
  currentInstitution: Institution;
  institutions: Institution[];
  currentUser: any;
  onClose: () => void;
  onCreated: () => void;
}

const DelegationComposerModal: React.FC<DelegationComposerModalProps> = ({
  currentInstitution,
  institutions,
  currentUser,
  onClose,
  onCreated
}) => {
  const [postId, setPostId] = useState('');
  const [reports, setReports] = useState<{ id: string; title: string; district: string; region: string }[]>([]);
  const [toInstitutionId, setToInstitutionId] = useState('');
  const [toDeskId, setToDeskId] = useState('');
  const [desks, setDesks] = useState<{ id: string; name: string; level: string }[]>([]);
  const [delegationType, setDelegationType] = useState<DelegationType>('TRANSFER');
  const [actionRequired, setActionRequired] = useState<'ACTION' | 'ACKNOWLEDGEMENT' | 'INFORMATION'>('ACTION');
  const [priority, setPriority] = useState('NORMAL');
  const [reason, setReason] = useState('');
  const [instructions, setInstructions] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getAssignedReports(currentInstitution.id)
      .then(list => setReports(list.slice(0, 100)))
      .catch(() => setReports([]));
  }, [currentInstitution.id]);

  useEffect(() => {
    if (!toInstitutionId) {
      setDesks([]);
      return;
    }
    api.getInstitutionDesks(toInstitutionId)
      .then(list => setDesks(list.map(d => ({ id: d.id, name: d.name, level: d.level }))))
      .catch(() => setDesks([]));
  }, [toInstitutionId]);

  const handleSubmit = async () => {
    setError(null);
    if (!toInstitutionId) return setError('Select a target institution');
    if (!reason.trim()) return setError('A reason is required');

    setSubmitting(true);
    try {
      await api.createDelegation(currentInstitution.id, {
        postId: postId || undefined,
        toInstitutionId,
        toDeskId: toDeskId || undefined,
        delegationType,
        actionRequired,
        priority,
        reason: reason.trim(),
        instructions: instructions.trim() || undefined
      });
      onCreated();
    } catch (e: any) {
      setError(e.message || 'Failed to create delegation');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-amber-400" /> New Coordination Delegation
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Route a report to another institution or sub-unit for action.
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {error && (
            <div className="bg-red-950/60 border border-red-800 text-red-200 text-xs p-2.5 rounded-xl">{error}</div>
          )}

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase">Linked report (optional)</label>
            <select
              value={postId}
              onChange={(e) => setPostId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200"
            >
              <option value="">No specific report</option>
              {reports.map(r => (
                <option key={r.id} value={r.id}>{r.title} — {r.district}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase">Target institution</label>
            <select
              value={toInstitutionId}
              onChange={(e) => { setToInstitutionId(e.target.value); setToDeskId(''); }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200"
            >
              <option value="">Select institution...</option>
              {institutions.filter(i => i.id !== currentInstitution.id).map(i => (
                <option key={i.id} value={i.id}>{i.officialName}</option>
              ))}
            </select>
          </div>

          {desks.length > 0 && (
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Target desk (optional)</label>
              <select
                value={toDeskId}
                onChange={(e) => setToDeskId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200"
              >
                <option value="">Auto-resolve by location</option>
                {desks.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.level})</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Type</label>
              <select
                value={delegationType}
                onChange={(e) => setDelegationType(e.target.value as DelegationType)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200"
              >
                <option value="TRANSFER">Transfer</option>
                <option value="DELEGATION">Delegation</option>
                <option value="ESCALATION">Escalation</option>
                <option value="INFORMATION">Information</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Action required</label>
              <select
                value={actionRequired}
                onChange={(e) => setActionRequired(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200"
              >
                <option value="ACTION">Action</option>
                <option value="ACKNOWLEDGEMENT">Acknowledgement</option>
                <option value="INFORMATION">Information only</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200"
            >
              <option value="ROUTINE">Routine</option>
              <option value="ELEVATED">Elevated</option>
              <option value="URGENT">Urgent</option>
              <option value="EMERGENCY">Emergency</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase">Reason (required)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Why is this being routed to the target institution?"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 resize-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase">Instructions (optional)</label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={2}
              placeholder="Specific instructions for the receiving desk"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 resize-none"
            />
          </div>
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
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Send Delegation
          </button>
        </div>
      </div>
    </div>
  );
};
