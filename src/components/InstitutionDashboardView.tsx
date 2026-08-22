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
  ChevronRight,
  Activity,
  FileText,
  Users,
  Settings,
  Eye,
  Search,
  Radio,
  ExternalLink,
  ChevronDown,
  ArrowRight,
  Layers,
  MapPin
} from 'lucide-react';
import { Institution, CivicPost, InstitutionResponse } from '../types';
import { api } from '../services/api';

export type InstitutionTab = 'overview' | 'alerts' | 'urgent' | 'responses' | 'config';

interface InstitutionDashboardViewProps {
  institutions: Institution[];
  posts: CivicPost[];
  selectedInstitutionId: string;
  setSelectedInstitutionId: (id: string) => void;
  onOpenResponseModal: (post: CivicPost) => void;
  onPostUpdated: () => void;
  onViewOfficialResponse?: (post: CivicPost, response: InstitutionResponse) => void;
  onViewResponseFeedPost?: (post: CivicPost, response: InstitutionResponse) => void;
  onOpenCluster?: (clusterId: string) => void;
  onSelectPost?: (post: CivicPost) => void;
}

export const InstitutionDashboardView: React.FC<InstitutionDashboardViewProps> = ({
  institutions,
  posts,
  selectedInstitutionId,
  setSelectedInstitutionId,
  onOpenResponseModal,
  onPostUpdated,
  onViewOfficialResponse,
  onViewResponseFeedPost,
  onOpenCluster,
  onSelectPost
}) => {
  const [activeTab, setActiveTab] = useState<InstitutionTab>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showMobileTabDropdown, setShowMobileTabDropdown] = useState(false);

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

  // Filtered lists for tabs
  const filteredAlerts = taggedPosts.filter(post => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = post.title.toLowerCase().includes(q);
      const matchContent = post.content.toLowerCase().includes(q);
      const matchDistrict = post.location.district.toLowerCase().includes(q);
      if (!matchTitle && !matchContent && !matchDistrict) return false;
    }
    return true;
  });

  const getTabLabel = (tab: InstitutionTab) => {
    switch (tab) {
      case 'overview': return 'Performance Overview';
      case 'alerts': return 'Tagged Alerts Queue';
      case 'urgent': return 'Urgent / Crisis Desk';
      case 'responses': return 'Official Statements';
      case 'config': return 'Agency & Dispatch Config';
    }
  };

  const handleQuickAcknowledge = async (postId: string) => {
    setActionLoading(`ack-${postId}`);
    try {
      await api.triggerAlert(postId, currentInstitution.id);
      onPostUpdated();
    } catch (err) {
      console.error('Failed to acknowledge:', err);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden min-h-[700px] flex flex-col md:flex-row text-slate-100">
      {/* Sidebar Navigation - Desktop */}
      <aside className="hidden md:flex w-64 lg:w-72 bg-slate-950/90 border-r border-slate-800 p-4 shrink-0 flex-col justify-between">
        <div className="space-y-6">
          {/* Header & Institution Selector */}
          <div className="space-y-3 px-1">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-700 flex items-center justify-center shadow-lg text-slate-950 font-black">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-extrabold text-sm text-white tracking-wide">AGENCY PORTAL</h2>
                <p className="text-[10px] text-amber-400 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Verified Authority
                </p>
              </div>
            </div>

            {/* Institution Switcher */}
            <div>
              <label className="block text-[9px] text-slate-400 mb-1 uppercase font-bold tracking-wider">
                Select Agency Account:
              </label>
              <select
                value={currentInstitution?.id}
                onChange={e => setSelectedInstitutionId(e.target.value)}
                className="w-full p-2 bg-slate-900 text-amber-300 text-xs font-bold rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500"
              >
                {institutions.map((inst, idx) => (
                  <option key={inst.id ? `${inst.id}-${idx}` : `inst-opt-${idx}`} value={inst.id}>
                    {inst.shortName} ({inst.acronym})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                activeTab === 'overview'
                  ? 'bg-amber-600 text-slate-950 font-extrabold shadow-lg shadow-amber-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Activity className="w-4 h-4" /> Performance Overview
              </span>
            </button>

            <button
              onClick={() => setActiveTab('alerts')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                activeTab === 'alerts'
                  ? 'bg-amber-600 text-slate-950 font-extrabold shadow-lg shadow-amber-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <FileText className="w-4 h-4" /> Tagged Alerts Queue
              </span>
              {unansweredPosts.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold border border-red-500/30">
                  {unansweredPosts.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('urgent')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                activeTab === 'urgent'
                  ? 'bg-amber-600 text-slate-950 font-extrabold shadow-lg shadow-amber-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Flame className="w-4 h-4" /> Urgent / Crisis Desk
              </span>
              {criticalPosts.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                  {criticalPosts.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('responses')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                activeTab === 'responses'
                  ? 'bg-amber-600 text-slate-950 font-extrabold shadow-lg shadow-amber-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4" /> Official Statements
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                {answeredPosts.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('config')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                activeTab === 'config'
                  ? 'bg-amber-600 text-slate-950 font-extrabold shadow-lg shadow-amber-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Settings className="w-4 h-4" /> Agency & Dispatch Config
              </span>
            </button>
          </nav>
        </div>

        {/* Footer Status */}
        <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-500 space-y-1.5 px-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Dispatch Line:</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> ACTIVE
            </span>
          </div>
          <div className="text-[10px] text-slate-400 truncate">{currentInstitution?.officialName}</div>
        </div>
      </aside>

      {/* Mobile Top Header with Breadcrumbs & Dropdown */}
      <div className="md:hidden bg-slate-950/95 border-b border-slate-800 p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-600 flex items-center justify-center text-slate-950 font-bold shadow">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <span className="font-extrabold text-xs text-white">{currentInstitution?.acronym || 'AGENCY PORTAL'}</span>
              <div className="flex items-center gap-1 text-[10px] text-amber-400">
                <span>Portal</span>
                <ChevronRight className="w-3 h-3 text-slate-600" />
                <span className="font-bold">{getTabLabel(activeTab)}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowMobileTabDropdown(!showMobileTabDropdown)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-amber-300 text-xs font-bold rounded-xl border border-slate-700 active:scale-95 transition-all"
          >
            <span>Switch Tab</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Mobile Agency Selector */}
        <div className="pt-1">
          <select
            value={currentInstitution?.id}
            onChange={e => setSelectedInstitutionId(e.target.value)}
            className="w-full p-2 bg-slate-900 text-amber-300 text-xs font-bold rounded-xl border border-slate-700 focus:outline-none"
          >
            {institutions.map((inst, idx) => (
              <option key={inst.id ? `${inst.id}-${idx}` : `inst-m-opt-${idx}`} value={inst.id}>
                {inst.shortName} ({inst.acronym})
              </option>
            ))}
          </select>
        </div>

        {/* Mobile Dropdown Panel */}
        {showMobileTabDropdown && (
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-2 space-y-1 shadow-2xl animate-in fade-in">
            {(['overview', 'alerts', 'urgent', 'responses', 'config'] as InstitutionTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setShowMobileTabDropdown(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between ${
                  activeTab === tab
                    ? 'bg-amber-600 text-slate-950 font-bold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span>{getTabLabel(tab)}</span>
                {tab === 'alerts' && <span className="text-[10px] bg-red-900/60 text-red-300 px-1.5 py-0.2 rounded font-mono">{unansweredPosts.length}</span>}
                {tab === 'urgent' && <span className="text-[10px] bg-amber-900/60 text-amber-300 px-1.5 py-0.2 rounded font-mono">{criticalPosts.length}</span>}
              </button>
            ))}
          </div>
        )}

        {/* Mobile Horizontal Pill Tab Scroller */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
          {(['overview', 'alerts', 'urgent', 'responses', 'config'] as InstitutionTab[]).map(tab => (
            <button
              key={`pill-inst-${tab}`}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap shrink-0 transition-all ${
                activeTab === tab
                  ? 'bg-amber-600 text-slate-950 shadow-md font-extrabold'
                  : 'bg-slate-900 text-slate-400 border border-slate-800'
              }`}
            >
              {getTabLabel(tab)}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Body */}
      <main className="flex-1 p-3.5 sm:p-6 bg-slate-900/60 overflow-y-auto space-y-5">
        {/* Top Header - Desktop */}
        <div className="hidden md:flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-amber-400 uppercase tracking-wider">
                {currentInstitution?.acronym}
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-xs text-slate-400 font-medium">{currentInstitution?.category}</span>
              <ChevronRight className="w-3 h-3 text-slate-600" />
              <span className="text-xs text-slate-300 font-semibold">{getTabLabel(activeTab)}</span>
            </div>
            <h1 className="text-lg font-bold text-white mt-0.5">
              {currentInstitution?.officialName}
            </h1>
          </div>

          <span className="px-3 py-1 bg-amber-950 text-amber-300 border border-amber-800 rounded-xl text-xs font-bold flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Verified State Desk
          </span>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-2xl space-y-1">
                <div className="text-xs text-slate-400 uppercase font-semibold">Total Tagged Alerts</div>
                <div className="text-2xl font-black text-white">{taggedPosts.length}</div>
                <div className="text-[10px] text-slate-500">Citizen reports across districts</div>
              </div>

              <div className="bg-slate-950/70 border border-amber-900/60 p-4 rounded-2xl space-y-1">
                <div className="text-xs text-amber-400 uppercase font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Critical Safety Issues
                </div>
                <div className="text-2xl font-black text-amber-400">{criticalPosts.length}</div>
                <div className="text-[10px] text-slate-500">Requires emergency response</div>
              </div>

              <div className="bg-slate-950/70 border border-red-900/60 p-4 rounded-2xl space-y-1">
                <div className="text-xs text-red-400 uppercase font-semibold">Pending Response</div>
                <div className="text-2xl font-black text-red-400">{unansweredPosts.length}</div>
                <div className="text-[10px] text-slate-500">Awaiting official statement</div>
              </div>

              <div className="bg-slate-950/70 border border-emerald-900/60 p-4 rounded-2xl space-y-1">
                <div className="text-xs text-emerald-400 uppercase font-semibold">Published Statements</div>
                <div className="text-2xl font-black text-emerald-400">{answeredPosts.length}</div>
                <div className="text-[10px] text-slate-500">Official communiqués issued</div>
              </div>
            </div>

            {/* Recent Unanswered Alerts Preview */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-3xl p-4 sm:p-5 space-y-4 shadow-md">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400" /> High-Priority Citizen Alerts Requiring Response
                </h3>
                <button
                  onClick={() => setActiveTab('alerts')}
                  className="text-xs text-amber-400 hover:underline font-bold"
                >
                  View All ({unansweredPosts.length}) →
                </button>
              </div>

              <div className="space-y-3">
                {unansweredPosts.slice(0, 3).length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800">
                    No pending citizen alerts requiring response! Excellent agency responsiveness.
                  </div>
                ) : (
                  unansweredPosts.slice(0, 3).map((post, idx) => (
                    <div key={post.id} className="p-3.5 sm:p-4 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4
                            onClick={() => onSelectPost && onSelectPost(post)}
                            className="font-bold text-sm text-white hover:text-amber-300 transition-colors cursor-pointer"
                          >
                            {post.title}
                          </h4>
                          <span className="text-[11px] text-slate-400">{post.location.district} ({post.location.region} Region)</span>
                        </div>
                        <span className="text-[10px] font-semibold text-slate-500">
                          {new Date(post.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80">
                        "{post.content}"
                      </p>

                      <div className="flex items-center justify-between pt-1 text-xs">
                        <span className="text-emerald-400 font-semibold">{post.engagement.confirmations} Confirmations</span>
                        <div className="flex items-center gap-2">
                          {onSelectPost && (
                            <button
                              onClick={() => onSelectPost(post)}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700"
                            >
                              Inspect
                            </button>
                          )}
                          <button
                            onClick={() => onOpenResponseModal(post)}
                            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-extrabold rounded-xl shadow-md transition-transform active:scale-95"
                          >
                            Respond Officially
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ALERTS QUEUE */}
        {activeTab === 'alerts' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/70 p-3 sm:p-3.5 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Filter tagged alerts by keyword or district..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="space-y-3.5">
              {filteredAlerts.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/60 border border-slate-800 rounded-2xl text-slate-400 text-xs">
                  No citizen alerts matching filter.
                </div>
              ) : (
                filteredAlerts.map((post, postIdx) => {
                  const hasResponded = post.officialResponses?.some(r => r.institutionId === currentInstitution?.id);
                  const myTag = post.institutionTags.find(t => t.institutionId === currentInstitution?.id);

                  return (
                    <div
                      key={post.id ? `${post.id}-${postIdx}` : `dash-post-${postIdx}`}
                      className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3 hover:border-slate-700 transition-all shadow-md"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap text-xs">
                            <span className="font-bold text-slate-300">
                              {post.location.district} ({post.location.region})
                            </span>
                            {post.urgency === 'CRITICAL' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 bg-red-950 text-red-300 border border-red-800 rounded">
                                🔴 CRITICAL DANGER
                              </span>
                            )}
                          </div>
                          <h3
                            onClick={() => onSelectPost && onSelectPost(post)}
                            className="font-bold text-base text-white hover:text-amber-300 transition-colors cursor-pointer"
                          >
                            {post.title}
                          </h3>
                        </div>

                        <span className="text-[11px] text-slate-400 whitespace-nowrap">
                          {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                        {post.content}
                      </p>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 border-t border-slate-800 gap-2">
                        <div className="flex items-center gap-3 text-xs text-slate-400">
                          <span>
                            <strong className="text-emerald-400">{post.engagement.confirmations}</strong> citizen confirmations
                          </span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {myTag?.alertStatus !== 'ACKNOWLEDGED' && (
                            <button
                              onClick={() => handleQuickAcknowledge(post.id)}
                              disabled={actionLoading === `ack-${post.id}`}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors"
                            >
                              <Check className="w-3.5 h-3.5 text-emerald-400" /> Acknowledge Alert
                            </button>
                          )}

                          {onSelectPost && (
                            <button
                              onClick={() => onSelectPost(post)}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700"
                            >
                              Inspect Post
                            </button>
                          )}

                          <button
                            onClick={() => onOpenResponseModal(post)}
                            className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-transform active:scale-95"
                          >
                            <Building2 className="w-3.5 h-3.5" />
                            <span>{hasResponded ? 'Update Public Statement' : 'Respond Officially'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 3: URGENT / CRISIS DESK */}
        {activeTab === 'urgent' && (
          <div className="space-y-4">
            <div className="p-4 sm:p-5 bg-red-950/40 border border-red-800/60 rounded-3xl text-xs text-red-200 space-y-1.5">
              <h3 className="font-bold text-sm text-red-300 flex items-center gap-2">
                <Flame className="w-4 h-4 text-red-400" /> High-Priority & Critical Public Safety Queue
              </h3>
              <p>Alerts in this queue involve imminent hazards, infrastructure failures, or active emergency dispatches.</p>
            </div>

            <div className="space-y-3.5">
              {criticalPosts.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/60 border border-slate-800 rounded-2xl text-slate-400 text-xs">
                  No active critical/urgent alerts tagged to {currentInstitution?.shortName}.
                </div>
              ) : (
                criticalPosts.map((post, idx) => (
                  <div key={post.id} className="bg-slate-950/70 border border-red-900/50 rounded-2xl p-4 sm:p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded uppercase">
                          {post.urgency} THREAT
                        </span>
                        <h3
                          onClick={() => onSelectPost && onSelectPost(post)}
                          className="font-bold text-base text-white hover:text-red-300 transition-colors cursor-pointer mt-1"
                        >
                          {post.title}
                        </h3>
                        <p className="text-xs text-slate-400">{post.location.district} ({post.location.region})</p>
                      </div>
                      <span className="text-[11px] text-slate-400">{new Date(post.createdAt).toLocaleTimeString()}</span>
                    </div>

                    <p className="text-xs text-slate-300 bg-slate-900/60 p-3 rounded-xl border border-slate-800">{post.content}</p>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                      {onSelectPost && (
                        <button
                          onClick={() => onSelectPost(post)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700"
                        >
                          Inspect Post
                        </button>
                      )}
                      <button
                        onClick={() => onOpenResponseModal(post)}
                        className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition-transform"
                      >
                        <Building2 className="w-3.5 h-3.5" /> Dispatch Statement
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 4: PUBLISHED STATEMENTS */}
        {activeTab === 'responses' && (
          <div className="space-y-4">
            <div className="p-4 sm:p-5 bg-slate-950/70 border border-slate-800 rounded-3xl text-xs text-slate-300 space-y-1">
              <h3 className="font-bold text-sm text-white">Published Official Communiqués</h3>
              <p className="text-xs text-slate-400">All public updates, field action communiqués, and official responses issued by {currentInstitution?.officialName}.</p>
            </div>

            <div className="space-y-3.5">
              {answeredPosts.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/60 border border-slate-800 rounded-2xl text-slate-400 text-xs">
                  No statements published yet.
                </div>
              ) : (
                answeredPosts.map((post, idx) => {
                  const resp = post.officialResponses?.find(r => r.institutionId === currentInstitution?.id);
                  if (!resp) return null;

                  return (
                    <div key={resp.id || idx} className="bg-slate-950/70 border border-emerald-900/50 rounded-2xl p-4 sm:p-5 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5" /> Official Statement Live
                          </span>
                          <h4
                            onClick={() => onSelectPost && onSelectPost(post)}
                            className="font-bold text-sm text-white hover:text-emerald-300 transition-colors cursor-pointer mt-1"
                          >
                            Re: {post.title}
                          </h4>
                        </div>
                        <span className="text-[11px] text-slate-400">{new Date(resp.createdAt).toLocaleDateString()}</span>
                      </div>

                      <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 text-xs text-slate-200 leading-relaxed font-sans">
                        <div className="text-[10px] text-slate-400 font-bold mb-1">
                          {resp.responderName} ({resp.responderTitle}) • <span className="text-amber-400 uppercase">{resp.responseType}</span>
                        </div>
                        "{resp.message}"
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 border-t border-slate-800 text-xs gap-2">
                        <span className="text-slate-400">{post.location.district} ({post.location.region})</span>
                        <div className="flex items-center gap-2 flex-wrap">
                          {onViewResponseFeedPost && (
                            <button
                              onClick={() => onViewResponseFeedPost(post, resp)}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-[11px] font-semibold border border-slate-700"
                            >
                              Feed Post View
                            </button>
                          )}
                          {onViewOfficialResponse && (
                            <button
                              onClick={() => onViewOfficialResponse(post, resp)}
                              className="px-3.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-[11px] font-semibold"
                            >
                              Statement Thread →
                            </button>
                          )}
                          {onSelectPost && (
                            <button
                              onClick={() => onSelectPost(post)}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[11px] font-semibold border border-slate-700"
                            >
                              Inspect Post
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 5: AGENCY CONFIG */}
        {activeTab === 'config' && (
          <div className="space-y-4">
            <div className="p-5 sm:p-6 bg-slate-950/80 border border-slate-800 rounded-3xl space-y-4 text-xs">
              <h3 className="font-bold text-sm text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <Settings className="w-4 h-4" /> Agency Profile & Dispatch Integration Settings
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-1">
                  <div className="text-slate-400 text-[10px] uppercase font-semibold">Official Authority Name</div>
                  <div className="font-bold text-white text-sm">{currentInstitution?.officialName}</div>
                </div>

                <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-1">
                  <div className="text-slate-400 text-[10px] uppercase font-semibold">Short Name & Acronym</div>
                  <div className="font-bold text-white text-sm">{currentInstitution?.shortName} ({currentInstitution?.acronym})</div>
                </div>

                <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-1">
                  <div className="text-slate-400 text-[10px] uppercase font-semibold">Category & Jurisdiction</div>
                  <div className="font-bold text-emerald-400">{currentInstitution?.category} — {currentInstitution?.jurisdiction}</div>
                </div>

                <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-1">
                  <div className="text-slate-400 text-[10px] uppercase font-semibold">Alert Dispatch Method</div>
                  <div className="font-bold text-amber-300 font-mono">{currentInstitution?.alertMethod || 'OFFICIAL_EMAIL'}</div>
                </div>
              </div>

              <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-1">
                <div className="text-slate-400 text-[10px] uppercase font-semibold">Institutional Public Mandate</div>
                <div className="text-slate-300 leading-relaxed">{currentInstitution?.mandate || 'Official Ghanaian public service body.'}</div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
