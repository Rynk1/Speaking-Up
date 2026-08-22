import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Megaphone,
  Plus,
  Flame,
  ArrowRight,
  Building2,
  Filter,
  RefreshCw,
  Loader2,
  ShieldCheck,
  FileCheck2,
  Search,
  CheckCircle2,
  BarChart3,
  MapPin
} from 'lucide-react';
import { CivicPost, Institution, IssueCluster, NationalAnalytics, InstitutionResponse } from '../types';
import { api } from '../services/api';
import { CivicPostCard } from './CivicPostCard';
import { OfficialResponseFeedPostCard } from './OfficialResponseFeedPostCard';
import { GHANA_REGIONS } from '../../server/seedData';

interface HomeFeedViewProps {
  posts: CivicPost[];
  institutions: Institution[];
  clusters: IssueCluster[];
  analytics: NationalAnalytics | null;
  loadingPosts: boolean;
  refreshPosts: () => Promise<void>;
  searchQuery: string;
  userRole: string;
  currentUser: any;
  setIsSpeakUpOpen: (open: boolean) => void;
  setSelectedInstitutionId: (id: string) => void;
  setSharePost: (p: CivicPost | null) => void;
  setEvidencePost: (p: CivicPost | null) => void;
  setResponsePost: (p: CivicPost | null) => void;
  setAbusePostId: (id: string | null) => void;
  setSelectedStatement: (s: { post: CivicPost; response: InstitutionResponse } | null) => void;
}

export const HomeFeedView: React.FC<HomeFeedViewProps> = ({
  posts,
  institutions,
  clusters,
  analytics,
  loadingPosts,
  refreshPosts,
  searchQuery,
  userRole,
  currentUser,
  setIsSpeakUpOpen,
  setSelectedInstitutionId,
  setSharePost,
  setEvidencePost,
  setResponsePost,
  setAbusePostId,
  setSelectedStatement
}) => {
  const navigate = useNavigate();

  const [feedTab, setFeedTab] = useState<'nearby_hot' | 'official_responded' | 'all'>('nearby_hot');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterRegion, setFilterRegion] = useState<string>('ALL');
  const [filterUrgency, setFilterUrgency] = useState<string>('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [focusedResponseId, setFocusedResponseId] = useState<string | null>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshPosts();
    setIsRefreshing(false);
  };

  const handleViewResponseFeedPost = useCallback((post: CivicPost, response: InstitutionResponse) => {
    setFeedTab('official_responded');
    setFocusedResponseId(response.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Filter posts for Feed view
  const filteredPosts = posts.filter(post => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = post.title.toLowerCase().includes(q);
      const matchContent = post.content.toLowerCase().includes(q);
      const matchLocation =
        post.location.district.toLowerCase().includes(q) ||
        post.location.region.toLowerCase().includes(q) ||
        (post.location.landmark && post.location.landmark.toLowerCase().includes(q));
      const matchTags = post.institutionTags.some(
        t => t.shortName?.toLowerCase().includes(q) || t.acronym?.toLowerCase().includes(q)
      );
      const matchHashtags = post.hashtags?.some(h => h.toLowerCase().includes(q));
      if (!matchTitle && !matchContent && !matchLocation && !matchTags && !matchHashtags) return false;
    }

    if (feedTab === 'official_responded' && (!post.officialResponses || post.officialResponses.length === 0)) {
      return false;
    }

    if (filterCategory !== 'ALL' && post.category !== filterCategory) return false;
    if (filterRegion !== 'ALL' && post.location.region !== filterRegion) return false;
    if (filterUrgency !== 'ALL' && post.urgency !== filterUrgency) return false;

    return true;
  });

  const officialResponseFeedItems = useMemo(() => {
    const items: { post: CivicPost; response: InstitutionResponse }[] = [];
    posts.forEach(post => {
      if (post.officialResponses && post.officialResponses.length > 0) {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = post.title.toLowerCase().includes(q);
          const matchContent = post.content.toLowerCase().includes(q);
          const matchLocation =
            post.location.district.toLowerCase().includes(q) ||
            post.location.region.toLowerCase().includes(q) ||
            (post.location.landmark && post.location.landmark.toLowerCase().includes(q));
          const matchResp = post.officialResponses.some(
            r =>
              r.statementTitle?.toLowerCase().includes(q) ||
              r.message.toLowerCase().includes(q) ||
              r.institutionName.toLowerCase().includes(q) ||
              r.responderName?.toLowerCase().includes(q)
          );
          if (!matchTitle && !matchContent && !matchLocation && !matchResp) return;
        }

        if (filterCategory !== 'ALL' && post.category !== filterCategory) return;
        if (filterRegion !== 'ALL' && post.location.region !== filterRegion) return;
        if (filterUrgency !== 'ALL' && post.urgency !== filterUrgency) return;

        post.officialResponses.forEach(response => {
          items.push({ post, response });
        });
      }
    });

    items.sort((a, b) => {
      if (focusedResponseId) {
        if (a.response.id === focusedResponseId) return -1;
        if (b.response.id === focusedResponseId) return 1;
      }
      return new Date(b.response.createdAt).getTime() - new Date(a.response.createdAt).getTime();
    });

    return items;
  }, [posts, searchQuery, filterCategory, filterRegion, filterUrgency, focusedResponseId]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
      {/* Left Sidebar (Desktop Only) */}
      <aside className="hidden lg:block lg:col-span-3 space-y-4">
        {/* Civic Discovery Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 shadow-md">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
            <Megaphone className="w-4 h-4" />
            <span>ZERO FOLLOWERS NEEDED</span>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            On Ghana Civic Network, your voice reaches nearby residents and verified state authorities regardless of your follower count.
          </p>
          <button
            id="sidebar-speak-up-btn"
            onClick={() => setIsSpeakUpOpen(true)}
            className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> SPEAK UP NOW
          </button>
        </div>

        {/* Active Community Issue Clusters Widget */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 shadow-md">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              Hot Community Clusters
            </span>
            <Link
              to="/clusters"
              className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline capitalize flex items-center gap-0.5 font-bold"
            >
              See all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-2">
            {clusters.map((cluster, idx) => (
              <div
                key={cluster.id ? `${cluster.id}-${idx}` : `cluster-${idx}`}
                onClick={() => navigate(`/clusters/${cluster.id}`)}
                className="p-2.5 bg-slate-50 dark:bg-slate-950/60 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800/80 rounded-xl cursor-pointer transition-colors space-y-1"
              >
                <div className="text-[10px] font-bold text-amber-700 dark:text-amber-400">{cluster.category}</div>
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-2 leading-snug">
                  {cluster.title}
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-1">
                  <span>{cluster.district}</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{cluster.totalConfirmations} confirmed</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Verified Authorities Quick Links */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2.5 shadow-md">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Top Verified Desks
            </span>
            <Link
              to="/institutions"
              className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline capitalize"
            >
              Directory
            </Link>
          </div>

          <div className="space-y-1.5 text-xs">
            {institutions.slice(0, 4).map((inst, idx) => (
              <div
                key={inst.id ? `${inst.id}-${idx}` : `inst-${idx}`}
                onClick={() => {
                  setSelectedInstitutionId(inst.id);
                  navigate(`/institutions/${inst.id}`);
                }}
                className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950/40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-between transition-colors"
              >
                <div className="font-semibold text-slate-800 dark:text-slate-300">{inst.shortName}</div>
                <span className="text-[9px] px-1.5 py-0.2 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded font-mono">
                  {inst.alertMethod === 'DIRECT_API' ? '⚡ API' : '💬 WhatsApp'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Central Feed Stream */}
      <div className="lg:col-span-6 space-y-3.5 sm:space-y-4">
        {/* Mobile Quick Action Banner */}
        <div className="lg:hidden bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-2xl p-3 sm:p-3.5 flex items-center justify-between gap-2.5 shadow-md">
          <div className="min-w-0">
            <div className="font-bold text-xs sm:text-sm text-white truncate">Have a civic issue in your area?</div>
            <div className="text-[10px] sm:text-[11px] text-emerald-200 truncate">Zero followers needed to alert public & authorities</div>
          </div>
          <button
            onClick={() => setIsSpeakUpOpen(true)}
            className="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl flex items-center gap-1 shadow-md shrink-0 transition-transform active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> SPEAK UP
          </button>
        </div>

        {/* Feed Tabs Bar */}
        <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-1 sm:p-1.5 flex items-center gap-1 overflow-x-auto shadow-sm">
          <button
            id="feed-tab-hot"
            onClick={() => setFeedTab('nearby_hot')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1 sm:gap-1.5 cursor-pointer ${
              feedTab === 'nearby_hot'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400 dark:text-amber-300" />
            <span>Nearby & Community Hot</span>
          </button>

          <button
            id="feed-tab-official"
            onClick={() => {
              setFeedTab('official_responded');
              setFocusedResponseId(null);
            }}
            className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1 sm:gap-1.5 cursor-pointer ${
              feedTab === 'official_responded'
                ? 'bg-emerald-600 text-white font-bold shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
            <span>Official Responses ({officialResponseFeedItems.length})</span>
          </button>

          <button
            id="feed-tab-all"
            onClick={() => {
              setFeedTab('all');
              setFocusedResponseId(null);
            }}
            className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              feedTab === 'all'
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            All Recent ({posts.length})
          </button>
        </div>

        {/* Feed Filters Strip */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 shadow-sm flex items-center justify-between gap-2 text-xs flex-wrap w-full">
          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
            <span className="text-slate-500 dark:text-slate-400 text-[11px] font-medium flex items-center gap-1 flex-shrink-0">
              <Filter className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Filter:
            </span>

            <select
              id="filter-urgency-select"
              value={filterUrgency}
              onChange={e => setFilterUrgency(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 text-xs rounded-lg border border-slate-200 dark:border-slate-700/80 focus:outline-none focus:border-emerald-500 font-medium flex-1 min-w-[130px]"
            >
              <option value="ALL">All Threat Levels</option>
              <option value="CRITICAL">🔴 Critical Threat (Emergency)</option>
              <option value="HIGH">🟠 High Priority Threat</option>
              <option value="NORMAL">🟡 Moderate Priority</option>
              <option value="LOW">🟢 Low / Minor Threat</option>
            </select>

            <select
              value={filterRegion}
              onChange={e => setFilterRegion(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 text-xs rounded-lg border border-slate-200 dark:border-slate-700/80 focus:outline-none focus:border-emerald-500 font-medium flex-1 min-w-[130px]"
            >
              <option value="ALL">All Ghana Regions</option>
              {GHANA_REGIONS.map(r => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 text-xs rounded-lg border border-slate-200 dark:border-slate-700/80 focus:outline-none focus:border-emerald-500 font-medium flex-1 min-w-[130px]"
            >
              <option value="ALL">All Categories</option>
              <option value="Flooding & Drainage">Flooding & Drainage</option>
              <option value="Infrastructure & Roads">Infrastructure & Roads</option>
              <option value="Power & Electricity (Dumsor)">Power & Electricity (Dumsor)</option>
              <option value="Water Supply & Quality">Water Supply & Quality</option>
              <option value="Public Safety & Security">Public Safety & Security</option>
              <option value="Sanitation & Waste">Sanitation & Waste</option>
            </select>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-colors disabled:opacity-50 flex-shrink-0 cursor-pointer"
            title="Refresh feed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Feed Items Stream */}
        {loadingPosts ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 sm:p-12 text-center text-slate-500 dark:text-slate-400 text-sm flex items-center justify-center gap-2 shadow-sm">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-600 dark:text-emerald-400" />
            <span>Loading live citizen reports from all regions...</span>
          </div>
        ) : feedTab === 'official_responded' ? (
          <div className="space-y-3.5 sm:space-y-4">
            {focusedResponseId && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-sm">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-medium min-w-0">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="truncate">Viewing focused official response feed post in reverse flow</span>
                </div>
                <button
                  onClick={() => setFocusedResponseId(null)}
                  className="px-2.5 py-1 bg-emerald-200 dark:bg-emerald-900/60 hover:bg-emerald-300 dark:hover:bg-emerald-900 text-emerald-900 dark:text-emerald-200 rounded-lg text-[11px] font-bold transition-colors shrink-0 cursor-pointer"
                >
                  Show all ({officialResponseFeedItems.length})
                </button>
              </div>
            )}

            {officialResponseFeedItems.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 sm:p-10 text-center space-y-3 shadow-sm">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                  <FileCheck2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-200">No official responses match your filter</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  State institutions provide direct public updates and field action communiqués. Try adjusting your category or region filter.
                </p>
                <button
                  onClick={() => {
                    setFilterCategory('ALL');
                    setFilterRegion('ALL');
                    setFocusedResponseId(null);
                  }}
                  className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-300 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              officialResponseFeedItems.map((item, idx) => (
                <OfficialResponseFeedPostCard
                  key={`resp-feed-${item.response.id}-${idx}`}
                  post={item.post}
                  response={item.response}
                  currentUser={currentUser}
                  onOpenStatementModal={(p, r) => setSelectedStatement({ post: p, response: r })}
                  onJumpToOriginalPost={p => {
                    navigate(`/post/${p.id}`);
                  }}
                  onPostUpdated={handleRefresh}
                />
              ))
            )}
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 sm:p-10 text-center space-y-3 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-200">No civic reports match your filter</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Try adjusting your category or region filter, or be the first to report what's happening in your area.
            </p>
            <button
              onClick={() => {
                setFilterCategory('ALL');
                setFilterRegion('ALL');
                setFeedTab('all');
              }}
              className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-300 text-xs font-semibold rounded-lg cursor-pointer"
            >
              Reset all filters
            </button>
          </div>
        ) : (
          <div className="space-y-3.5 sm:space-y-4">
            {filteredPosts.map((post, idx) => (
              <CivicPostCard
                key={post.id ? `${post.id}-${idx}` : `post-${idx}`}
                post={post}
                onOpenShare={p => setSharePost(p)}
                onOpenAddEvidence={p => setEvidencePost(p)}
                onOpenReportAbuse={id => setAbusePostId(id)}
                onOpenCluster={cId => navigate(`/clusters/${cId}`)}
                onPostUpdated={handleRefresh}
                userRole={userRole as any}
                onOpenInstitutionResponse={p => setResponsePost(p)}
                onViewOfficialResponse={(p, r) => setSelectedStatement({ post: p, response: r })}
                onViewResponseFeedPost={handleViewResponseFeedPost}
              />
            ))}
          </div>
        )}
      </div>

      {/* Right Sidebar: Regional Pulse & Quick Analytics (Desktop) */}
      <aside className="hidden lg:block lg:col-span-3 space-y-4">
        {/* National Radar Pulse Mini */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 shadow-md">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              National Civic Pulse
            </span>
            <Link
              to="/radar"
              className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline capitalize flex items-center gap-0.5 font-bold"
            >
              See all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-50 dark:bg-slate-950/60 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Total Reports</div>
              <div className="text-base font-extrabold text-slate-900 dark:text-white">{analytics?.totalPosts || posts.length}</div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-950/60 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Confirmations</div>
              <div className="text-base font-extrabold text-emerald-700 dark:text-emerald-400">
                {analytics?.totalConfirmations || 840}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 space-y-1.5 text-xs">
            <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Fast-Growing Issues:</div>
            <div className="p-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-lg text-[11px] text-red-800 dark:text-red-200">
              🔴 Accra & Kumasi Storm Drains
            </div>
            <div className="p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-lg text-[11px] text-amber-800 dark:text-amber-200">
              🟡 Tema Motorway kilometer 8 Potholes
            </div>
          </div>
        </div>

        {/* National Map Teaser Card */}
        <div
          onClick={() => navigate('/map')}
          className="bg-gradient-to-br from-slate-50 to-emerald-50 dark:from-slate-900 dark:to-emerald-950/50 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 rounded-2xl p-4 cursor-pointer transition-all space-y-2 shadow-md group"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> Interactive Map
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white">Open Map →</span>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-snug">
            Explore geo-located civic observations across all 16 regions of Ghana in real time.
          </p>
        </div>
      </aside>
    </div>
  );
};
