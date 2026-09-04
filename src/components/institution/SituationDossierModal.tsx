import React, { useState, useEffect } from 'react';
import {
  X,
  Layers,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Users,
  FileText,
  Radio,
  GitPullRequest,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Send,
  HelpCircle,
  MessageSquare
} from 'lucide-react';
import { CivicSituation, Institution, CivicPost } from '../../types';
import { api } from '../../services/api';
import { CivicPriorityIndicator } from './CivicPriorityIndicator';

interface SituationDossierModalProps {
  situationId: string | null;
  isOpen: boolean;
  onClose: () => void;
  currentInstitution: Institution;
  onOpenResponseModal?: (post: CivicPost) => void;
  onOpenAnnouncementModal?: (situation: CivicSituation) => void;
  onSituationUpdated?: () => void;
}

export const SituationDossierModal: React.FC<SituationDossierModalProps> = ({
  situationId,
  isOpen,
  onClose,
  currentInstitution,
  onOpenResponseModal,
  onOpenAnnouncementModal,
  onSituationUpdated
}) => {
  const [situation, setSituation] = useState<CivicSituation | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'reports' | 'timeline' | 'announcements'>('overview');

  useEffect(() => {
    if (!isOpen || !situationId) return;

    let isMounted = true;
    const fetchSituation = async () => {
      setLoading(true);
      try {
        const data = await api.getCivicSituationById(situationId);
        if (isMounted) {
          setSituation(data);
        }
      } catch (err) {
        console.error('Failed to load situation dossier:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchSituation();
    return () => {
      isMounted = false;
    };
  }, [isOpen, situationId]);

  if (!isOpen || !situationId) return null;

  const handleStatusUpdate = async (newStatus: string) => {
    if (!situation) return;
    setStatusLoading(true);
    try {
      // Direct status transition via API
      const res = await fetch(`/api/situations/${situation.id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${api.getToken()}`
        },
        body: JSON.stringify({
          status: newStatus,
          actorId: currentInstitution.id,
          actorName: currentInstitution.officialName,
          actorType: 'INSTITUTION'
        })
      });

      if (res.ok) {
        const updated = await api.getCivicSituationById(situation.id);
        setSituation(updated);
        if (onSituationUpdated) onSituationUpdated();
      }
    } catch (err) {
      console.error('Failed to update situation status:', err);
    } finally {
      setStatusLoading(false);
    }
  };

  const statusPipeline = [
    { key: 'REPORTED', label: 'Reported' },
    { key: 'VERIFYING', label: 'Verifying' },
    { key: 'ACTIVE_MONITORING', label: 'Monitoring' },
    { key: 'INTERVENTION_IN_PROGRESS', label: 'Intervention' },
    { key: 'RESOLVED', label: 'Resolved' }
  ];

  return (
    <div
      id="situation-dossier-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md overflow-y-auto"
    >
      <div
        id="situation-dossier-modal-card"
        className="bg-slate-900 border border-slate-700/80 rounded-2xl sm:rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/70 flex items-start justify-between gap-3 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <Layers className="w-3 h-3 text-amber-400" />
                CIVIC SITUATION DOSSIER
              </span>
              <span className="text-[11px] font-mono text-slate-400">ID: {situation?.id || situationId}</span>
              <span className="text-slate-600">•</span>
              <span className="text-xs text-amber-400 font-semibold">{situation?.category}</span>
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-white leading-tight">
              {situation?.title || 'Loading Situation Dossier...'}
            </h2>
          </div>

          <button
            id="btn-close-situation-dossier"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <Radio className="w-6 h-6 animate-pulse text-amber-400 mx-auto" />
            <p className="text-xs">Assembling multi-source civic situation telemetry...</p>
          </div>
        ) : !situation ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            Situation not found or could not be loaded.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {/* Priority & Pipeline Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <CivicPriorityIndicator
                  priorityScore={situation.priorityScore}
                  priorityBand={situation.priorityBand}
                  severity={situation.severity}
                  urgency={situation.urgency}
                  showDetails
                />
              </div>

              {/* Status Pipeline Visualizer */}
              <div className="sm:col-span-2 bg-slate-950/70 border border-slate-800 p-3.5 rounded-2xl flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    Accountability Lifecycle Stage:
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[11px] border border-amber-500/30">
                    {situation.status}
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-1 pt-1">
                  {statusPipeline.map((step, idx) => {
                    const currentIdx = statusPipeline.findIndex(s => s.key === situation.status);
                    const isPassed = currentIdx >= idx;
                    const isCurrent = situation.status === step.key;

                    return (
                      <div key={step.key} className="text-center space-y-1">
                        <div
                          className={`h-1.5 rounded-full transition-all ${
                            isCurrent
                              ? 'bg-amber-400 shadow-sm'
                              : isPassed
                              ? 'bg-emerald-500'
                              : 'bg-slate-800'
                          }`}
                        />
                        <span className={`text-[9px] font-medium block truncate ${
                          isCurrent ? 'text-amber-300 font-bold' : isPassed ? 'text-slate-300' : 'text-slate-600'
                        }`}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Status selector */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                  <span className="text-[10px] text-slate-400 font-semibold">Change Lifecycle Status:</span>
                  <select
                    value={situation.status}
                    onChange={(e) => handleStatusUpdate(e.target.value)}
                    disabled={statusLoading}
                    className="bg-slate-900 text-amber-300 border border-slate-700 rounded-lg px-2 py-1 text-[11px] font-bold focus:outline-none"
                  >
                    <option value="REPORTED">REPORTED</option>
                    <option value="VERIFYING">VERIFYING</option>
                    <option value="ACTIVE_MONITORING">ACTIVE_MONITORING</option>
                    <option value="OFFICIAL_RESPONSE_ISSUED">OFFICIAL_RESPONSE_ISSUED</option>
                    <option value="INTERVENTION_IN_PROGRESS">INTERVENTION_IN_PROGRESS</option>
                    <option value="RESOLVED">RESOLVED</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Telemetry Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl space-y-0.5">
                <div className="text-[10px] uppercase text-slate-400 font-semibold flex items-center gap-1">
                  <FileText className="w-3 h-3 text-amber-400" /> Linked Reports
                </div>
                <div className="text-lg font-black text-white">{situation.reportCount || 1}</div>
                <div className="text-[9px] text-slate-500">Citizen submissions</div>
              </div>

              <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl space-y-0.5">
                <div className="text-[10px] uppercase text-slate-400 font-semibold flex items-center gap-1">
                  <Users className="w-3 h-3 text-emerald-400" /> Confirmations
                </div>
                <div className="text-lg font-black text-emerald-400">{situation.confirmationCount || 0}</div>
                <div className="text-[9px] text-slate-500">Independent witnesses</div>
              </div>

              <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl space-y-0.5">
                <div className="text-[10px] uppercase text-slate-400 font-semibold flex items-center gap-1">
                  <MessageSquare className="w-3 h-3 text-blue-400" /> Community Evidence
                </div>
                <div className="text-lg font-black text-blue-400">{situation.evidenceCount || 0}</div>
                <div className="text-[9px] text-slate-500">Field photo & updates</div>
              </div>

              <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl space-y-0.5">
                <div className="text-[10px] uppercase text-slate-400 font-semibold flex items-center gap-1">
                  <Radio className="w-3 h-3 text-purple-400" /> Amplifications
                </div>
                <div className="text-lg font-black text-purple-400">{situation.amplificationCount || 0}</div>
                <div className="text-[9px] text-slate-500">Journalist/Creator packs</div>
              </div>
            </div>

            {/* Geographic Footprint Card */}
            <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-2xl space-y-1.5 text-xs">
              <div className="flex items-center gap-2 text-slate-300 font-bold">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Geographic Epicenter:</span>
                <span className="text-amber-400">{situation.district}, {situation.region}</span>
              </div>
              {situation.locationSummary && (
                <p className="text-slate-400 pl-6 text-[11px] leading-relaxed">
                  Landmark Context: {situation.locationSummary}
                </p>
              )}
            </div>

            {/* Navigation Sub-Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-3 py-1 rounded-xl font-bold transition-colors ${
                  activeTab === 'overview'
                    ? 'bg-amber-600 text-slate-950'
                    : 'text-slate-400 hover:text-white bg-slate-800/40'
                }`}
              >
                Executive Brief
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className={`px-3 py-1 rounded-xl font-bold transition-colors ${
                  activeTab === 'reports'
                    ? 'bg-amber-600 text-slate-950'
                    : 'text-slate-400 hover:text-white bg-slate-800/40'
                }`}
              >
                Linked Citizen Reports ({situation.reports?.length || situation.reportCount || 0})
              </button>
              <button
                onClick={() => setActiveTab('timeline')}
                className={`px-3 py-1 rounded-xl font-bold transition-colors ${
                  activeTab === 'timeline'
                    ? 'bg-amber-600 text-slate-950'
                    : 'text-slate-400 hover:text-white bg-slate-800/40'
                }`}
              >
                Situation Event Log ({situation.events?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('announcements')}
                className={`px-3 py-1 rounded-xl font-bold transition-colors ${
                  activeTab === 'announcements'
                    ? 'bg-amber-600 text-slate-950'
                    : 'text-slate-400 hover:text-white bg-slate-800/40'
                }`}
              >
                Official Communiqués ({situation.announcements?.length || 0})
              </button>
            </div>

            {/* TAB CONTENT: Overview */}
            {activeTab === 'overview' && (
              <div className="space-y-3 text-xs">
                <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <h4 className="font-bold text-amber-400 uppercase tracking-wider text-[11px]">
                    Consolidated Situation Summary
                  </h4>
                  <p className="text-slate-200 leading-relaxed text-xs sm:text-sm">
                    {situation.summary}
                  </p>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <div>First Detected: {new Date(situation.firstReportedAt).toLocaleString()}</div>
                  <div>Latest Signal: {new Date(situation.latestActivityAt).toLocaleString()}</div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: Linked Reports */}
            {activeTab === 'reports' && (
              <div className="space-y-2.5">
                {situation.reports && situation.reports.length > 0 ? (
                  situation.reports.map((rep: any, idx: number) => (
                    <div
                      key={rep.id ? `${rep.id}-${idx}` : `sit-rep-${idx}`}
                      className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-2xl space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-sm">{rep.title}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(rep.created_at || rep.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-slate-300 text-xs line-clamp-2">"{rep.content}"</p>
                      <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 border-t border-slate-800/60">
                        <span>Reporter: {rep.author_name || rep.authorName}</span>
                        {onOpenResponseModal && (
                          <button
                            onClick={() => onOpenResponseModal(rep)}
                            className="text-amber-400 hover:underline font-bold flex items-center gap-1"
                          >
                            <span>Respond to this report</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-slate-400 text-xs bg-slate-950/60 rounded-xl border border-slate-800">
                    Primary report attached. Submissions are deduplicated into this situation dossier.
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: Situation Event Log */}
            {activeTab === 'timeline' && (
              <div className="space-y-2.5">
                {situation.events && situation.events.length > 0 ? (
                  situation.events.map((ev: any, idx: number) => (
                    <div
                      key={ev.id ? `${ev.id}-${idx}` : `sit-ev-${idx}`}
                      className="flex items-start gap-3 bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 text-xs"
                    >
                      <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-amber-400 shrink-0">
                        <Clock className="w-3.5 h-3.5" />
                      </div>
                      <div className="space-y-0.5 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-xs">{ev.event_type}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(ev.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-slate-300 text-xs">{ev.description}</p>
                        <span className="text-[10px] text-slate-500 font-semibold">
                          Actor: {ev.actor_name} ({ev.actor_type})
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-slate-400 text-xs bg-slate-950/60 rounded-xl border border-slate-800">
                    No timeline events recorded yet.
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: Announcements */}
            {activeTab === 'announcements' && (
              <div className="space-y-2.5">
                {situation.announcements && situation.announcements.length > 0 ? (
                  situation.announcements.map((ann: any, idx: number) => (
                    <div
                      key={ann.id ? `${ann.id}-${idx}` : `sit-ann-${idx}`}
                      className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-2xl space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-300 text-sm">{ann.title}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                          {ann.announcement_type}
                        </span>
                      </div>
                      <p className="text-slate-200 text-xs leading-relaxed">{ann.body}</p>
                      <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800/60">
                        Published by {ann.author_name} ({ann.author_title}) • {new Date(ann.created_at || ann.published_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-slate-400 text-xs bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
                    <p>No official public advisory or communiqué has been linked to this situation yet.</p>
                    {onOpenAnnouncementModal && (
                      <button
                        onClick={() => onOpenAnnouncementModal(situation)}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-xl text-xs transition-colors"
                      >
                        Publish Official Communiqué
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Modal Action Bar */}
        <div className="p-3.5 sm:p-4 border-t border-slate-800 bg-slate-950/90 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="text-xs text-slate-400 font-medium flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Authority Desk Action Center</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onOpenAnnouncementModal && situation && (
              <button
                id="btn-situation-publish-announcement"
                onClick={() => onOpenAnnouncementModal(situation)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold rounded-xl text-xs border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Building2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Issue Communiqué / Advisory</span>
              </button>
            )}

            <button
              id="btn-situation-close"
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Close Dossier
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
