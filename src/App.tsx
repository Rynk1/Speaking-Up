/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Radio,
  MapPin,
  Building2,
  BarChart3,
  Flame,
  Filter,
  Plus,
  Megaphone,
  Loader2,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
  SlidersHorizontal,
  ChevronDown,
  Info,
  ShieldCheck,
  FileCheck2,
  ArrowRight
} from 'lucide-react';
import {
  CivicPost,
  Institution,
  InstitutionResponse,
  IssueCluster,
  NationalAnalytics,
  NotificationItem,
  CivicCategory,
  GhanaRegionName,
  UrgencyLevel
} from './types';
import { api } from './services/api';
import { EmergencyBanner } from './components/EmergencyBanner';
import { Navbar } from './components/Navbar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { CivicPostCard } from './components/CivicPostCard';
import { OfficialResponseFeedPostCard } from './components/OfficialResponseFeedPostCard';
import { SpeakUpComposer } from './components/SpeakUpComposer';
import { SharePreviewModal } from './components/SharePreviewModal';
import { AddEvidenceModal } from './components/AddEvidenceModal';
import { InstitutionResponseModal } from './components/InstitutionResponseModal';
import { ReportAbuseModal } from './components/ReportAbuseModal';
import { CommunityIssueClusterModal } from './components/CommunityIssueClusterModal';
import { OfficialStatementModal } from './components/OfficialStatementModal';
import { NationalMapView } from './components/NationalMapView';
import { InstitutionDirectoryView } from './components/InstitutionDirectoryView';
import { InstitutionDashboardView } from './components/InstitutionDashboardView';
import { JournalistDeskView } from './components/JournalistDeskView';
import { NationalAnalyticsView } from './components/NationalAnalyticsView';
import { AuthModal } from './components/AuthModal';
import { GHANA_REGIONS } from '../server/seedData';

export default function App() {
  // Navigation & Role State
  const [currentView, setCurrentView] = useState<
    'feed' | 'map' | 'clusters' | 'institutions' | 'institution_portal' | 'journalist_desk' | 'radar'
  >('feed');
  const [userRole, setUserRole] = useState<'citizen' | 'institution_rep' | 'journalist' | 'moderator'>('citizen');
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>('ghana-police-service');
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Search & Filters for Feed
  const [searchQuery, setSearchQuery] = useState('');
  const [feedTab, setFeedTab] = useState<'nearby_hot' | 'urgent' | 'official_responded' | 'all'>('nearby_hot');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterRegion, setFilterRegion] = useState<string>('ALL');
  const [filterUrgency, setFilterUrgency] = useState<string>('ALL');

  // Core Data
  const [posts, setPosts] = useState<CivicPost[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [clusters, setClusters] = useState<IssueCluster[]>([]);
  const [analytics, setAnalytics] = useState<NationalAnalytics | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  // Modals & Focused States
  const [isSpeakUpOpen, setIsSpeakUpOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [sharePost, setSharePost] = useState<CivicPost | null>(null);
  const [evidencePost, setEvidencePost] = useState<CivicPost | null>(null);
  const [responsePost, setResponsePost] = useState<CivicPost | null>(null);
  const [abusePostId, setAbusePostId] = useState<string | null>(null);
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
  const [selectedStatement, setSelectedStatement] = useState<{ post: CivicPost; response: InstitutionResponse } | null>(null);
  const [focusedResponseId, setFocusedResponseId] = useState<string | null>(null);

  // Navigate directly to Response Feed Post (Reverse Hierarchy)
  const handleViewResponseFeedPost = useCallback((post: CivicPost, response: InstitutionResponse) => {
    setFeedTab('official_responded');
    setFocusedResponseId(response.id);
    setCurrentView('feed');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Hash deep-link listener
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#response-')) {
        const respId = hash.replace('#response-', '');
        setFeedTab('official_responded');
        setFocusedResponseId(respId);
        setCurrentView('feed');
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Fetch all initial data
  const loadAllData = useCallback(async () => {
    try {
      setLoadingPosts(true);
      const [fetchedPosts, fetchedInsts, fetchedClusters, fetchedAnalytics, fetchedNotifs] =
        await Promise.all([
          api.getPosts(),
          api.getInstitutions(),
          api.getClusters(),
          api.getAnalytics(),
          api.getNotifications()
        ]);
      setPosts(fetchedPosts);
      setInstitutions(fetchedInsts);
      setClusters(fetchedClusters);
      setAnalytics(fetchedAnalytics);
      setNotifications(fetchedNotifs);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoadingPosts(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Refresh posts specifically
  const refreshPosts = async () => {
    try {
      const updated = await api.getPosts();
      setPosts(updated);
      const updatedAnalytics = await api.getAnalytics();
      setAnalytics(updatedAnalytics);
    } catch (err) {
      console.error('Error refreshing posts:', err);
    }
  };

  const handleMarkNotificationRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  };

  // Filter posts for Feed view
  const filteredPosts = posts.filter(post => {
    // Search query
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

    // Feed tab
    if (feedTab === 'urgent' && post.urgency !== 'CRITICAL' && post.urgency !== 'HIGH') {
      return false;
    }
    if (feedTab === 'official_responded' && (!post.officialResponses || post.officialResponses.length === 0)) {
      return false;
    }

    // Dropdown filters
    if (filterCategory !== 'ALL' && post.category !== filterCategory) return false;
    if (filterRegion !== 'ALL' && post.location.region !== filterRegion) return false;
    if (filterUrgency !== 'ALL' && post.urgency !== filterUrgency) return false;

    return true;
  });

  // Extract and format all official responses as standalone reverse-hierarchy feed post items
  const officialResponseFeedItems = useMemo(() => {
    const items: { post: CivicPost; response: InstitutionResponse }[] = [];
    posts.forEach(post => {
      if (post.officialResponses && post.officialResponses.length > 0) {
        // Search & filter checks for response items
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

    // If focused response ID, prioritize it
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950 pb-20 lg:pb-8">
      {/* Emergency Disclaimer Banner */}
      <EmergencyBanner />

      {/* Main Header & Navbar */}
      <Navbar
        currentView={currentView}
        setCurrentView={setCurrentView}
        onOpenSpeakUp={() => setIsSpeakUpOpen(true)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        userRole={userRole}
        setUserRole={setUserRole}
        selectedInstitutionId={selectedInstitutionId}
        setSelectedInstitutionId={setSelectedInstitutionId}
        notifications={notifications}
        onMarkNotificationRead={handleMarkNotificationRead}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-1.5 sm:px-6 py-3 sm:py-6">
        {/* VIEW 1: LIVE FEED & CITIZEN REPORTS */}
        {currentView === 'feed' && (
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
                  className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-98 flex items-center justify-center gap-1.5"
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
                </div>

                <div className="space-y-2">
                  {clusters.map((cluster, idx) => (
                    <div
                      key={cluster.id ? `${cluster.id}-${idx}` : `cluster-${idx}`}
                      onClick={() => setSelectedClusterId(cluster.id)}
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
                  <button
                    onClick={() => setCurrentView('institutions')}
                    className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline capitalize"
                  >
                    Directory
                  </button>
                </div>

                <div className="space-y-1.5 text-xs">
                  {institutions.slice(0, 4).map((inst, idx) => (
                    <div
                      key={inst.id ? `${inst.id}-${idx}` : `inst-${idx}`}
                      onClick={() => {
                        setSelectedInstitutionId(inst.id);
                        setCurrentView('institutions');
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
                  className="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl flex items-center gap-1 shadow-md shrink-0 transition-transform active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" /> SPEAK UP
                </button>
              </div>

              {/* Feed Tabs Bar */}
              <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-1 sm:p-1.5 flex items-center gap-1 overflow-x-auto shadow-sm">
                <button
                  id="feed-tab-hot"
                  onClick={() => setFeedTab('nearby_hot')}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1 sm:gap-1.5 ${
                    feedTab === 'nearby_hot'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5 text-amber-400 dark:text-amber-300" />
                  <span>Nearby & Community Hot</span>
                </button>

                <button
                  id="feed-tab-urgent"
                  onClick={() => setFeedTab('urgent')}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1 sm:gap-1.5 ${
                    feedTab === 'urgent'
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Urgent Threats</span>
                </button>

                <button
                  id="feed-tab-official"
                  onClick={() => {
                    setFeedTab('official_responded');
                    setFocusedResponseId(null);
                  }}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1 sm:gap-1.5 ${
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
                  className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                    feedTab === 'all'
                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  All Recent ({posts.length})
                </button>
              </div>

              {/* Feed Filters Strip */}
              <div className="flex items-center justify-between gap-2 text-xs flex-wrap px-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-slate-500 dark:text-slate-400 text-[11px] font-medium flex items-center gap-1">
                    <Filter className="w-3 h-3" /> Filter:
                  </span>

                  {/* Region selector */}
                  <select
                    value={filterRegion}
                    onChange={e => setFilterRegion(e.target.value)}
                    className="p-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-300 text-xs rounded-lg border border-slate-300 dark:border-slate-800 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ALL">All Ghana Regions</option>
                    {GHANA_REGIONS.map(r => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>

                  {/* Category selector */}
                  <select
                    value={filterCategory}
                    onChange={e => setFilterCategory(e.target.value)}
                    className="p-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-300 text-xs rounded-lg border border-slate-300 dark:border-slate-800 focus:outline-none focus:border-emerald-500"
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
                  onClick={refreshPosts}
                  className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 text-xs"
                  title="Refresh feed"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>

              {/* Feed Items Stream */}
              {loadingPosts ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 sm:p-12 text-center text-slate-500 dark:text-slate-400 text-sm flex items-center justify-center gap-2 shadow-sm">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-600 dark:text-emerald-400" />
                  <span>Loading live citizen reports from all regions...</span>
                </div>
              ) : feedTab === 'official_responded' ? (
                /* OFFICIAL STATE RESPONSES STREAM (REVERSE FLOW FEED POSTS) */
                <div className="space-y-3.5 sm:space-y-4">
                  {/* Focused Banner if navigating directly to a response */}
                  {focusedResponseId && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-sm">
                      <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-medium min-w-0">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="truncate">Viewing focused official response feed post in reverse flow</span>
                      </div>
                      <button
                        onClick={() => setFocusedResponseId(null)}
                        className="px-2.5 py-1 bg-emerald-200 dark:bg-emerald-900/60 hover:bg-emerald-300 dark:hover:bg-emerald-900 text-emerald-900 dark:text-emerald-200 rounded-lg text-[11px] font-bold transition-colors shrink-0"
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
                          setSearchQuery('');
                          setFocusedResponseId(null);
                        }}
                        className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-300 text-xs font-semibold rounded-lg"
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
                          setFeedTab('all');
                          setFocusedResponseId(null);
                          setSearchQuery(p.title);
                        }}
                        onPostUpdated={refreshPosts}
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
                      setSearchQuery('');
                      setFeedTab('all');
                    }}
                    className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-300 text-xs font-semibold rounded-lg"
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
                      onOpenCluster={cId => setSelectedClusterId(cId)}
                      onPostUpdated={refreshPosts}
                      userRole={userRole}
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
                  <button
                    onClick={() => setCurrentView('radar')}
                    className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline capitalize"
                  >
                    Full Radar
                  </button>
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
                onClick={() => setCurrentView('map')}
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
        )}

        {/* VIEW 2: NATIONAL MAP */}
        {currentView === 'map' && (
          <NationalMapView
            posts={posts}
            onSelectPost={p => {
              // Switch to feed and scroll
              setCurrentView('feed');
              setSearchQuery(p.title);
            }}
            onOpenSpeakUp={() => setIsSpeakUpOpen(true)}
          />
        )}

        {/* VIEW 3: COMMUNITY ISSUE CLUSTERS */}
        {currentView === 'clusters' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                    <Flame className="w-4 h-4" />
                  </div>
                  <h2 className="font-extrabold text-lg sm:text-xl text-white tracking-tight">
                    Community Issue Clusters
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
                  When multiple citizens report the same crisis in a neighborhood, our civic AI engine clusters them together into an aggregated community issue with amplified institutional visibility.
                </p>
              </div>

              <span className="px-3 py-1 bg-amber-950 text-amber-300 border border-amber-800 rounded-lg text-xs font-bold">
                {clusters.length} Monitored Clusters
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clusters.map((cluster, idx) => (
                <div
                  key={cluster.id ? `${cluster.id}-${idx}` : `cluster-card-${idx}`}
                  onClick={() => setSelectedClusterId(cluster.id)}
                  className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 sm:p-5 cursor-pointer transition-all shadow-md flex flex-col justify-between space-y-3 group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-amber-400">{cluster.category}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                        {cluster.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-white group-hover:text-amber-300 transition-colors leading-snug">
                      {cluster.title}
                    </h3>

                    <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">
                      {cluster.summary}
                    </p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="flex items-center gap-1 text-slate-300">
                        <MapPin className="w-3 h-3 text-emerald-400" />
                        {cluster.district} ({cluster.region})
                      </span>
                      <span className="text-emerald-400 font-bold">
                        {cluster.totalConfirmations} confirmed
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400">
                      Tagged: <strong className="text-slate-300">{cluster.primaryInstitutions.join(', ')}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW 4: VERIFIED INSTITUTIONS DIRECTORY */}
        {currentView === 'institutions' && (
          <InstitutionDirectoryView
            institutions={institutions}
            posts={posts}
            onSelectInstitution={inst => {
              setSelectedInstitutionId(inst.id);
            }}
            onTagInstitutionInNewPost={inst => {
              setSelectedInstitutionId(inst.id);
              setIsSpeakUpOpen(true);
            }}
          />
        )}

        {/* VIEW 5: INSTITUTION OFFICIAL RESPONDER PORTAL */}
        {currentView === 'institution_portal' && (
          <InstitutionDashboardView
            institutions={institutions}
            posts={posts}
            selectedInstitutionId={selectedInstitutionId}
            setSelectedInstitutionId={setSelectedInstitutionId}
            onOpenResponseModal={p => setResponsePost(p)}
            onPostUpdated={refreshPosts}
            onViewOfficialResponse={(p, r) => setSelectedStatement({ post: p, response: r })}
            onViewResponseFeedPost={handleViewResponseFeedPost}
          />
        )}

        {/* VIEW 6: JOURNALIST & MEDIA DESK */}
        {currentView === 'journalist_desk' && (
          <JournalistDeskView
            posts={posts}
            clusters={clusters}
            onSelectPost={p => {
              setCurrentView('feed');
              setSearchQuery(p.title);
            }}
            onOpenCluster={cId => setSelectedClusterId(cId)}
          />
        )}

        {/* VIEW 7: NATIONAL CIVIC RADAR & ANALYTICS */}
        {currentView === 'radar' && (
          <NationalAnalyticsView analytics={analytics} institutions={institutions} />
        )}
      </main>

      {/* Mobile Sticky Bottom Navigation */}
      <MobileBottomNav
        currentView={currentView}
        setCurrentView={setCurrentView}
        onOpenSpeakUp={() => setIsSpeakUpOpen(true)}
      />

      {/* MODALS */}
      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={(user) => {
          setCurrentUser(user);
          setUserRole(user.role);
          if (user.institutionId) setSelectedInstitutionId(user.institutionId);
        }}
      />

      {/* 1. Speak Up Multimodal Composer Modal */}
      <SpeakUpComposer
        isOpen={isSpeakUpOpen}
        onClose={() => setIsSpeakUpOpen(false)}
        onPostCreated={() => {
          refreshPosts();
          setCurrentView('feed');
        }}
        institutionsList={institutions}
      />

      {/* 2. Social Share & OpenGraph Preview Modal */}
      <SharePreviewModal
        post={sharePost}
        isOpen={!!sharePost}
        onClose={() => setSharePost(null)}
      />

      {/* 3. Add Evidence Modal */}
      <AddEvidenceModal
        post={evidencePost}
        isOpen={!!evidencePost}
        onClose={() => setEvidencePost(null)}
        onEvidenceAdded={refreshPosts}
      />

      {/* 4. Institution Official Response Modal */}
      <InstitutionResponseModal
        post={responsePost}
        isOpen={!!responsePost}
        onClose={() => setResponsePost(null)}
        onResponseSubmitted={refreshPosts}
        institutionsList={institutions}
        currentInstitutionId={selectedInstitutionId}
      />

      {/* 5. Report Abuse Modal */}
      <ReportAbuseModal
        postId={abusePostId}
        isOpen={!!abusePostId}
        onClose={() => setAbusePostId(null)}
      />

      {/* 6. Community Issue Cluster Modal */}
      <CommunityIssueClusterModal
        clusterId={selectedClusterId}
        isOpen={!!selectedClusterId}
        onClose={() => setSelectedClusterId(null)}
        onSelectPost={p => {
          setCurrentView('feed');
          setSearchQuery(p.title);
        }}
      />

      {/* 7. Official State Institution Full Statement Modal (Reverse Hierarchy & Replies Thread) */}
      {selectedStatement && (
        <OfficialStatementModal
          post={selectedStatement.post}
          response={selectedStatement.response}
          currentUser={currentUser}
          onClose={() => setSelectedStatement(null)}
          onPostUpdated={() => refreshPosts()}
          onOpenAnotherResponse={(newResp) => {
            setSelectedStatement({
              post: selectedStatement.post,
              response: newResp
            });
          }}
          onViewAsFeedPost={handleViewResponseFeedPost}
        />
      )}
    </div>
  );
}
