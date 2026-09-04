import React, { useState } from 'react';
import {
  Layers,
  MapPin,
  Clock,
  Flame,
  AlertTriangle,
  ChevronRight,
  Filter,
  Search,
  Users,
  MessageSquare,
  Radio,
  Building2,
  RefreshCw
} from 'lucide-react';
import { CivicSituation, Institution } from '../../types';
import { CivicPriorityIndicator } from './CivicPriorityIndicator';

interface SituationsDeskViewProps {
  situations: CivicSituation[];
  loading: boolean;
  onRefresh: () => void;
  onSelectSituation: (situation: CivicSituation) => void;
  currentInstitution: Institution;
  onDraftAnnouncementForSituation?: (situation: CivicSituation) => void;
}

export const SituationsDeskView: React.FC<SituationsDeskViewProps> = ({
  situations,
  loading,
  onRefresh,
  onSelectSituation,
  currentInstitution,
  onDraftAnnouncementForSituation
}) => {
  const [filterBand, setFilterBand] = useState<string>('ALL');
  const [filterRegion, setFilterRegion] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filtered = situations.filter((sit) => {
    if (filterBand !== 'ALL' && sit.priorityBand !== filterBand) return false;
    if (filterRegion !== 'ALL' && sit.region !== filterRegion) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = sit.title.toLowerCase().includes(q);
      const matchSummary = sit.summary.toLowerCase().includes(q);
      const matchDistrict = sit.district.toLowerCase().includes(q);
      if (!matchTitle && !matchSummary && !matchDistrict) return false;
    }
    return true;
  });

  const criticalCount = situations.filter(s => s.priorityBand === 'CRITICAL').length;
  const highCount = situations.filter(s => s.priorityBand === 'HIGH').length;
  const activeMonitoringCount = situations.filter(s => ['REPORTED', 'VERIFYING', 'ACTIVE_MONITORING'].includes(s.status)).length;
  const interventionCount = situations.filter(s => s.status === 'INTERVENTION_IN_PROGRESS').length;

  return (
    <div id="situations-desk-view" className="space-y-4">
      {/* Telemetry Header */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
          <div className="text-[10px] uppercase font-bold text-slate-400">Total Civic Situations</div>
          <div className="text-xl font-black text-white">{situations.length}</div>
          <div className="text-[10px] text-slate-500">Clustered event dossiers</div>
        </div>

        <div className="bg-slate-900 border border-red-900/50 p-3.5 rounded-2xl">
          <div className="text-[10px] uppercase font-bold text-red-400 flex items-center gap-1">
            <Flame className="w-3 h-3 text-red-400" /> Critical Threats
          </div>
          <div className="text-xl font-black text-red-400">{criticalCount}</div>
          <div className="text-[10px] text-slate-500">Highest safety impact</div>
        </div>

        <div className="bg-slate-900 border border-amber-900/50 p-3.5 rounded-2xl">
          <div className="text-[10px] uppercase font-bold text-amber-400 flex items-center gap-1">
            <Radio className="w-3 h-3 text-amber-400" /> Active Situations
          </div>
          <div className="text-xl font-black text-amber-400">{activeMonitoringCount}</div>
          <div className="text-[10px] text-slate-500">Continuous citizen signal</div>
        </div>

        <div className="bg-slate-900 border border-blue-900/50 p-3.5 rounded-2xl">
          <div className="text-[10px] uppercase font-bold text-blue-400 flex items-center gap-1">
            <Building2 className="w-3 h-3 text-blue-400" /> Interventions Underway
          </div>
          <div className="text-xl font-black text-blue-400">{interventionCount}</div>
          <div className="text-[10px] text-slate-500">Field works active</div>
        </div>
      </div>

      {/* Filter and Search bar */}
      <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search situation dossiers by landmark, district, topic..."
            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filterBand}
            onChange={(e) => setFilterBand(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 font-semibold"
          >
            <option value="ALL">All Priority Bands</option>
            <option value="CRITICAL">Critical Band</option>
            <option value="HIGH">High Band</option>
            <option value="ELEVATED">Elevated Band</option>
            <option value="MODERATE">Moderate Band</option>
          </select>

          <button
            onClick={onRefresh}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors"
            title="Refresh Situations"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Situations Dossier Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {loading && situations.length === 0 ? (
          <div className="col-span-full p-12 text-center text-slate-400 space-y-2 bg-slate-900 rounded-2xl border border-slate-800">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-amber-400" />
            <p className="text-xs">Aggregating civic situations from regional observation grids...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full p-12 text-center text-slate-400 space-y-2 bg-slate-900 rounded-2xl border border-slate-800">
            <Layers className="w-6 h-6 mx-auto text-slate-600" />
            <p className="text-sm font-semibold text-slate-300">No civic situations found matching your filters.</p>
          </div>
        ) : (
          filtered.map((sit) => (
            <div
              key={sit.id}
              id={`situation-card-${sit.id}`}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-4 rounded-2xl flex flex-col justify-between space-y-3 transition-colors text-slate-100"
            >
              {/* Header */}
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CivicPriorityIndicator
                      priorityScore={sit.priorityScore}
                      priorityBand={sit.priorityBand}
                      size="sm"
                    />
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                      {sit.category}
                    </span>
                  </div>

                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {sit.status.replace(/_/g, ' ')}
                  </span>
                </div>

                <h3
                  onClick={() => onSelectSituation(sit)}
                  className="text-sm sm:text-base font-bold text-white leading-snug cursor-pointer hover:text-amber-400 transition-colors line-clamp-2"
                >
                  {sit.title}
                </h3>

                <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">
                  {sit.summary}
                </p>
              </div>

              {/* Location & Signals */}
              <div className="space-y-2 pt-2 border-t border-slate-800/80 text-xs">
                <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="font-semibold text-slate-300">{sit.district}, {sit.region}</span>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-emerald-400" />
                      <b>{sit.confirmationCount || 0}</b> confirmations
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3 text-blue-400" />
                      <b>{sit.evidenceCount || 0}</b> evidence
                    </span>
                  </div>

                  <span className="text-slate-500 font-mono">
                    Latest: {new Date(sit.latestActivityAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                {onDraftAnnouncementForSituation && (
                  <button
                    onClick={() => onDraftAnnouncementForSituation(sit)}
                    className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-colors"
                  >
                    <Building2 className="w-3 h-3" />
                    <span>Issue Advisory</span>
                  </button>
                )}

                <button
                  onClick={() => onSelectSituation(sit)}
                  className="text-xs text-slate-200 hover:text-white font-bold flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors ml-auto cursor-pointer"
                >
                  <span>Open Dossier</span>
                  <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
