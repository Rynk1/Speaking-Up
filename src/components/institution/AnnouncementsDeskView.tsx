import React, { useState } from 'react';
import {
  Building2,
  Plus,
  Radio,
  MapPin,
  ExternalLink,
  Eye,
  Share2,
  Calendar,
  Clock,
  Filter,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { InstitutionalAnnouncement, Institution } from '../../types';

interface AnnouncementsDeskViewProps {
  announcements: InstitutionalAnnouncement[];
  loading: boolean;
  onRefresh: () => void;
  onOpenComposer: () => void;
  currentInstitution: Institution;
}

export const AnnouncementsDeskView: React.FC<AnnouncementsDeskViewProps> = ({
  announcements,
  loading,
  onRefresh,
  onOpenComposer,
  currentInstitution
}) => {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filtered = announcements.filter((ann) => {
    if (filterType !== 'ALL' && ann.announcementType !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = ann.title.toLowerCase().includes(q);
      const matchBody = (ann.body || '').toLowerCase().includes(q);
      const matchTopic = (ann.topic || '').toLowerCase().includes(q);
      if (!matchTitle && !matchBody && !matchTopic) return false;
    }
    return true;
  });

  return (
    <div id="announcements-desk-view" className="space-y-4">
      {/* Top Banner & Action */}
      <div className="bg-gradient-to-r from-amber-950/50 via-slate-900 to-slate-900 border border-amber-500/30 p-4 sm:p-5 rounded-3xl flex flex-wrap items-center justify-between gap-3 text-slate-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
              Official State Communications Center
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {announcements.length} Published Bulletins
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-extrabold text-white">
            Authoritative Citizen Communiqués & Advisories
          </h2>
          <p className="text-xs text-slate-300 max-w-xl">
            Broadcast official safety bulletins, scheduled maintenance alerts, and service interruption notices directly to verified citizen feeds and regional mobile alerts.
          </p>
        </div>

        <button
          id="btn-draft-new-announcement"
          onClick={onOpenComposer}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-lg hover:shadow-amber-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Draft New Communiqué</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search bulletins by keyword, topic, reference..."
            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 font-semibold"
          >
            <option value="ALL">All Bulletin Types</option>
            <option value="PUBLIC_ADVISORY">Public Advisories</option>
            <option value="SERVICE_DISRUPTION">Service Disruptions</option>
            <option value="SCHEDULED_MAINTENANCE">Maintenance Notices</option>
            <option value="ROAD_CLOSURE">Road Closures</option>
            <option value="EMERGENCY_DIRECTIVE">Emergency Directives</option>
          </select>

          <button
            onClick={onRefresh}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors"
            title="Refresh Announcements"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Announcements List */}
      <div className="space-y-3.5">
        {loading && announcements.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2 bg-slate-900 rounded-2xl border border-slate-800">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-amber-400" />
            <p className="text-xs">Loading official state communiqués...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3 bg-slate-900 rounded-2xl border border-slate-800">
            <Radio className="w-8 h-8 mx-auto text-slate-600" />
            <p className="text-sm font-semibold text-slate-300">No announcements found matching criteria.</p>
            <button
              onClick={onOpenComposer}
              className="px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-amber-400 transition-colors inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Publish First Announcement</span>
            </button>
          </div>
        ) : (
          filtered.map((ann) => (
            <div
              key={ann.id}
              id={`announcement-card-${ann.id}`}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-4 sm:p-5 rounded-2xl space-y-3 transition-colors text-slate-100"
            >
              {/* Header */}
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1 max-w-[80%]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black px-2.5 py-0.5 rounded-md bg-amber-500 text-slate-950 uppercase tracking-wider">
                      {ann.announcementType.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {ann.geographicScope} {ann.region ? `• ${ann.region}` : ''}
                    </span>
                    {ann.topic && (
                      <span className="text-[10px] text-amber-400 font-semibold">
                        #{ann.topic}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white leading-snug">
                    {ann.title}
                  </h3>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-700 uppercase">
                    {ann.status}
                  </span>
                  <div className="text-[10px] text-slate-500 pt-1 font-mono">
                    {new Date(ann.publishedAt || ann.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Summary */}
              {ann.summary && (
                <p className="text-xs text-amber-300/90 font-medium italic border-l-2 border-amber-500/50 pl-3">
                  {ann.summary}
                </p>
              )}

              {/* Body Content */}
              <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap line-clamp-4 bg-slate-950/50 p-3 rounded-xl border border-slate-800/60">
                {ann.body}
              </div>

              {/* Links and Metrics Footer */}
              <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400">
                <div className="flex items-center gap-2">
                  <span>Author: <b className="text-slate-200">{ann.authorName}</b> ({ann.authorTitle})</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 font-mono">
                    <Eye className="w-3.5 h-3.5 text-slate-400" />
                    <span>{ann.viewCount || 0} views</span>
                  </span>
                  <span className="flex items-center gap-1 font-mono">
                    <Share2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>{ann.shareCount || 0} shares</span>
                  </span>
                  {ann.officialLinks && ann.officialLinks.length > 0 && (
                    <a
                      href={ann.officialLinks[0].url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-400 hover:underline font-bold flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>{ann.officialLinks[0].label || 'Portal'}</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
