import React, { useState } from 'react';
import {
  Building2,
  ShieldCheck,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Clock,
  Send,
  MessageSquare,
  Filter,
  Check,
  ChevronRight
} from 'lucide-react';
import { Institution, CivicPost } from '../types';
import { api } from '../services/api';

interface InstitutionDashboardViewProps {
  institutions: Institution[];
  posts: CivicPost[];
  selectedInstitutionId: string;
  setSelectedInstitutionId: (id: string) => void;
  onOpenResponseModal: (post: CivicPost) => void;
  onPostUpdated: () => void;
}

export const InstitutionDashboardView: React.FC<InstitutionDashboardViewProps> = ({
  institutions,
  posts,
  selectedInstitutionId,
  setSelectedInstitutionId,
  onOpenResponseModal,
  onPostUpdated
}) => {
  const [filterTab, setFilterTab] = useState<'all' | 'unanswered' | 'critical' | 'responded'>('unanswered');

  const currentInstitution = institutions.find(i => i.id === selectedInstitutionId) || institutions[0];

  // Filter posts tagged with this institution
  const taggedPosts = posts.filter(p =>
    p.institutionTags.some(t => t.institutionId === currentInstitution?.id)
  );

  const criticalPosts = taggedPosts.filter(p => p.urgency === 'CRITICAL' || p.urgency === 'HIGH');
  const answeredPosts = taggedPosts.filter(p =>
    p.officialResponses?.some(r => r.institutionId === currentInstitution?.id)
  );
  const unansweredPosts = taggedPosts.filter(
    p => !p.officialResponses?.some(r => r.institutionId === currentInstitution?.id)
  );

  const displayedPosts = taggedPosts.filter(p => {
    if (filterTab === 'unanswered') {
      return !p.officialResponses?.some(r => r.institutionId === currentInstitution?.id);
    }
    if (filterTab === 'critical') {
      return p.urgency === 'CRITICAL' || p.urgency === 'HIGH';
    }
    if (filterTab === 'responded') {
      return p.officialResponses?.some(r => r.institutionId === currentInstitution?.id);
    }
    return true;
  });

  const handleQuickAcknowledge = async (postId: string) => {
    try {
      await api.triggerAlert(postId, currentInstitution.id);
      onPostUpdated();
    } catch (err) {
      console.error('Failed to acknowledge:', err);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in">
      {/* Top Authority Header & Institution Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 uppercase flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" /> Verified Agency Portal
              </span>
              <span className="text-xs text-slate-400">Official Responder Mode</span>
            </div>
            <h2 className="font-extrabold text-base sm:text-xl text-white mt-0.5">
              {currentInstitution?.officialName}
            </h2>
          </div>
        </div>

        {/* Institution Switcher */}
        <div className="w-full md:w-auto">
          <label className="block text-[10px] text-slate-400 mb-1 uppercase font-semibold">
            Select Agency Account:
          </label>
          <select
            value={currentInstitution?.id}
            onChange={e => setSelectedInstitutionId(e.target.value)}
            className="w-full md:w-64 p-2 bg-slate-800 text-slate-100 text-xs font-semibold rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500"
          >
            {institutions.map(inst => (
              <option key={inst.id} value={inst.id}>
                {inst.shortName} ({inst.acronym})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Tagged Alerts</div>
          <div className="text-xl font-black text-white">{taggedPosts.length}</div>
          <div className="text-[10px] text-slate-500">Citizen mentions</div>
        </div>

        <div className="bg-slate-900 border border-amber-900/60 rounded-xl p-3.5 space-y-1">
          <div className="text-[10px] text-amber-400 uppercase font-semibold flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Urgent / Critical
          </div>
          <div className="text-xl font-black text-amber-400">{criticalPosts.length}</div>
          <div className="text-[10px] text-slate-500">Immediate public safety</div>
        </div>

        <div className="bg-slate-900 border border-red-900/60 rounded-xl p-3.5 space-y-1">
          <div className="text-[10px] text-red-400 uppercase font-semibold">Pending Response</div>
          <div className="text-xl font-black text-red-400">{unansweredPosts.length}</div>
          <div className="text-[10px] text-slate-500">Awaiting official action</div>
        </div>

        <div className="bg-slate-900 border border-emerald-900/60 rounded-xl p-3.5 space-y-1">
          <div className="text-[10px] text-emerald-400 uppercase font-semibold">Public Responses</div>
          <div className="text-xl font-black text-emerald-400">{answeredPosts.length}</div>
          <div className="text-[10px] text-slate-500">Published updates</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs">
        <button
          onClick={() => setFilterTab('unanswered')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
            filterTab === 'unanswered'
              ? 'bg-amber-600 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-slate-200 bg-slate-900'
          }`}
        >
          <span>Pending Response</span>
          <span className="text-[10px] px-1.5 py-0.2 bg-slate-950/40 rounded-full">{unansweredPosts.length}</span>
        </button>

        <button
          onClick={() => setFilterTab('critical')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
            filterTab === 'critical'
              ? 'bg-red-600 text-white font-bold'
              : 'text-slate-400 hover:text-slate-200 bg-slate-900'
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-red-400" />
          <span>Urgent & High Priority</span>
          <span className="text-[10px] px-1.5 py-0.2 bg-slate-950/40 rounded-full">{criticalPosts.length}</span>
        </button>

        <button
          onClick={() => setFilterTab('all')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
            filterTab === 'all' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          All Tagged ({taggedPosts.length})
        </button>

        <button
          onClick={() => setFilterTab('responded')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
            filterTab === 'responded' ? 'bg-slate-800 text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Responded ({answeredPosts.length})
        </button>
      </div>

      {/* Posts List */}
      <div className="space-y-3">
        {displayedPosts.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">
            No citizen observations matching this tab currently.
          </div>
        ) : (
          displayedPosts.map(post => {
            const hasResponded = post.officialResponses?.some(r => r.institutionId === currentInstitution?.id);
            const myTag = post.institutionTags.find(t => t.institutionId === currentInstitution?.id);

            return (
              <div
                key={post.id}
                className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3 hover:border-slate-700 transition-all shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-300">
                        {post.location.district} ({post.location.region})
                      </span>
                      {post.urgency === 'CRITICAL' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-red-950 text-red-300 border border-red-800 rounded">
                          🔴 CRITICAL DANGER
                        </span>
                      )}
                      {post.urgency === 'HIGH' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-950 text-amber-300 border border-amber-800 rounded">
                          🟡 HIGH PRIORITY
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-base text-white">{post.title}</h3>
                  </div>

                  <span className="text-[11px] text-slate-400 whitespace-nowrap">
                    {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-950/40 p-3 rounded-xl border border-slate-800">
                  {post.content}
                </p>

                {/* Evidence thumbnails */}
                {post.media.length > 0 && (
                  <div className="flex items-center gap-2">
                    {post.media.map(m => (
                      <div key={m.id} className="w-16 h-16 rounded-lg bg-slate-800 overflow-hidden border border-slate-700">
                        {m.type === 'image' && <img src={m.url} alt="Evidence" className="w-full h-full object-cover" />}
                        {m.type === 'audio' && <div className="w-full h-full flex items-center justify-center text-xs text-emerald-400">🎤 Audio</div>}
                      </div>
                    ))}
                  </div>
                )}

                {/* Existing response banner if responded */}
                {hasResponded && (
                  <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-2.5 text-xs text-emerald-300">
                    <span className="font-bold">Official Response Published: </span>
                    <span>{post.officialResponses?.find(r => r.institutionId === currentInstitution?.id)?.message}</span>
                  </div>
                )}

                {/* Action Row for Official */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800 flex-wrap gap-2">
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span>
                      <strong className="text-emerald-400">{post.engagement.confirmations}</strong> citizen confirmations
                    </span>
                    <span>•</span>
                    <span>Awareness Score: {post.credibilitySignals.institutionalAwarenessScore}%</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {myTag?.alertStatus !== 'ACKNOWLEDGED' && (
                      <button
                        onClick={() => handleQuickAcknowledge(post.id)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-400" /> Acknowledge Alert
                      </button>
                    )}

                    <button
                      onClick={() => onOpenResponseModal(post)}
                      className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      {hasResponded ? 'Update Public Response' : 'Respond Officially'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
