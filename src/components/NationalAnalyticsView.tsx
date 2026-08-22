import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Radio,
  Activity,
  TrendingUp,
  BarChart3,
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Building2,
  Search,
  Filter,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Plus,
  ChevronRight,
  Eye,
  MessageSquare,
  Zap,
  Globe,
  Share2
} from 'lucide-react';
import { NationalAnalytics, Institution, CivicPost, IssueCluster, GhanaRegionName } from '../types';

interface NationalAnalyticsViewProps {
  analytics: NationalAnalytics | null;
  institutions: Institution[];
  posts?: CivicPost[];
  clusters?: IssueCluster[];
  onSelectPost?: (post: CivicPost) => void;
  onSelectCluster?: (clusterId: string) => void;
  onSelectInstitution?: (institutionId: string) => void;
  onOpenSpeakUp?: () => void;
  onRefresh?: () => Promise<void> | void;
}

const GHANA_ALL_REGIONS: GhanaRegionName[] = [
  'Greater Accra',
  'Ashanti',
  'Western',
  'Central',
  'Eastern',
  'Volta',
  'Northern',
  'Upper East',
  'Upper West',
  'Bono',
  'Bono East',
  'Ahafo',
  'Oti',
  'Savannah',
  'North East',
  'Western North'
];

export const NationalAnalyticsView: React.FC<NationalAnalyticsViewProps> = ({
  analytics,
  institutions = [],
  posts = [],
  clusters = [],
  onSelectPost,
  onSelectCluster,
  onSelectInstitution,
  onOpenSpeakUp,
  onRefresh
}) => {
  const navigate = useNavigate();

  // Local filter states
  const [selectedThreatFilter, setSelectedThreatFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW'>('ALL');
  const [selectedTimeRange, setSelectedTimeRange] = useState<'24h' | '7d' | '30d' | 'all'>('all');
  const [selectedRegionFilter, setSelectedRegionFilter] = useState<string>('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [instSearchQuery, setInstSearchQuery] = useState('');
  const [instCategoryFilter, setInstCategoryFilter] = useState<string>('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedBriefing, setCopiedBriefing] = useState(false);

  // Derived Fallbacks & Live Recalculations from props if analytics object is null or missing subfields
  const totalPostsCount = analytics?.totalPosts ?? analytics?.totalActivePosts ?? posts.length;
  const totalConfirmationsCount = analytics?.totalConfirmations ?? analytics?.totalIndependentConfirmations ?? posts.reduce((acc, p) => acc + (p.confirmationsCount || p.engagement?.confirmations || 1), 0);
  const totalResponsesCount = analytics?.totalOfficialResponses ?? institutions.reduce((acc, i) => acc + (i.officialResponsesCount || 0), 0);
  const responseRate = analytics?.responseRate ?? (totalPostsCount > 0 ? Math.min(100, Math.round((totalResponsesCount / totalPostsCount) * 100)) : 68);
  const avgResponseTime = analytics?.averageResponseTimeHours ?? 3.8;

  // Compute Category Breakdown safely
  const categoryBreakdown = useMemo(() => {
    if (analytics?.categoryBreakdown && analytics.categoryBreakdown.length > 0) {
      return analytics.categoryBreakdown;
    }
    // Fallback compute from posts
    const counts: Record<string, number> = {};
    posts.forEach(p => {
      if (p.category) {
        counts[p.category] = (counts[p.category] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([category, count]) => ({ category: category as any, count }))
      .sort((a, b) => b.count - a.count);
  }, [analytics, posts]);

  // Compute Regional Breakdown safely
  const regionalBreakdown = useMemo(() => {
    if (analytics?.regionalBreakdown && analytics.regionalBreakdown.length > 0) {
      return analytics.regionalBreakdown;
    }
    const regionMap: Record<string, { postCount: number; resolvedCount: number }> = {};
    posts.forEach(p => {
      const reg = p.location?.region || 'Greater Accra';
      if (!regionMap[reg]) regionMap[reg] = { postCount: 0, resolvedCount: 0 };
      regionMap[reg].postCount += 1;
      if (p.officialResponses && p.officialResponses.length > 0) {
        regionMap[reg].resolvedCount += 1;
      }
    });
    return Object.entries(regionMap)
      .map(([region, data]) => ({
        region: region as GhanaRegionName,
        postCount: data.postCount,
        resolvedCount: data.resolvedCount,
        responseRate: data.postCount > 0 ? Math.max(30, Math.round((data.resolvedCount / data.postCount) * 100)) : 0
      }))
      .sort((a, b) => b.postCount - a.postCount);
  }, [analytics, posts]);

  // Compute Filtered Radar Posts
  const filteredRadarPosts = useMemo(() => {
    return posts.filter(p => {
      // Threat Filter
      if (selectedThreatFilter === 'CRITICAL' && p.urgency !== 'CRITICAL' && p.severity !== 'EMERGENCY') return false;
      if (selectedThreatFilter === 'HIGH' && p.urgency !== 'HIGH' && p.severity !== 'SEVERE') return false;
      if (selectedThreatFilter === 'NORMAL' && p.urgency !== 'NORMAL' && p.severity !== 'MODERATE') return false;
      if (selectedThreatFilter === 'LOW' && p.urgency !== 'LOW' && p.severity !== 'INFORMATIONAL') return false;

      // Region Filter
      if (selectedRegionFilter !== 'ALL' && p.location?.region !== selectedRegionFilter) return false;

      // Category Filter
      if (selectedCategoryFilter !== 'ALL' && p.category !== selectedCategoryFilter) return false;

      // Time Range Filter
      if (selectedTimeRange !== 'all') {
        const postDate = new Date(p.createdAt || Date.now()).getTime();
        const now = Date.now();
        const hoursDiff = (now - postDate) / (1000 * 60 * 60);
        if (selectedTimeRange === '24h' && hoursDiff > 24) return false;
        if (selectedTimeRange === '7d' && hoursDiff > 24 * 7) return false;
        if (selectedTimeRange === '30d' && hoursDiff > 24 * 30) return false;
      }

      return true;
    });
  }, [posts, selectedThreatFilter, selectedRegionFilter, selectedCategoryFilter, selectedTimeRange]);

  // Filtered Institutions
  const filteredInstitutions = useMemo(() => {
    return institutions.filter(inst => {
      if (instCategoryFilter !== 'ALL' && inst.category && !inst.category.toLowerCase().includes(instCategoryFilter.toLowerCase())) {
        return false;
      }
      if (!instSearchQuery.trim()) return true;
      const q = instSearchQuery.toLowerCase();
      return (
        inst.officialName.toLowerCase().includes(q) ||
        inst.shortName.toLowerCase().includes(q) ||
        inst.acronym.toLowerCase().includes(q) ||
        (inst.mandate && inst.mandate.toLowerCase().includes(q))
      );
    });
  }, [institutions, instSearchQuery, instCategoryFilter]);

  // Handle Refresh
  const handleTriggerRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (onRefresh) {
        await onRefresh();
      }
    } catch (err) {
      console.error('Failed to refresh radar telemetry:', err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  // Copy Radar Summary to Clipboard
  const handleCopyRadarBriefing = () => {
    const briefingText = `🚨 GHANA CIVIC RADAR INTELLIGENCE BRIEFING
📅 Generated: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
📊 National Metrics:
• Active Citizen Reports: ${totalPostsCount}
• Community Ground Truth Validations: ${totalConfirmationsCount}
• Official State Response Rate: ${responseRate}%
• Average Response Latency: ${avgResponseTime} hours

📍 Top Active Regions:
${regionalBreakdown.slice(0, 3).map(r => `• ${r.region}: ${r.postCount} reports (${r.responseRate}% responded)`).join('\n')}

🏛️ Track & Hold State Agencies Accountable:
Explore live radar telemetry on Speak Up Ghana: https://speakup.gh/radar`;

    navigator.clipboard.writeText(briefingText);
    setCopiedBriefing(true);
    setTimeout(() => setCopiedBriefing(false), 2500);
  };

  // Threat badge helper
  const renderThreatBadge = (urgency?: string, severity?: string) => {
    const u = (urgency || '').toUpperCase();
    const s = (severity || '').toUpperCase();

    if (u === 'CRITICAL' || s === 'EMERGENCY') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
          <AlertTriangle className="w-3 h-3 text-rose-500 animate-pulse" /> Emergency
        </span>
      );
    }
    if (u === 'HIGH' || s === 'SEVERE') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
          <Flame className="w-3 h-3 text-amber-500" /> High
        </span>
      );
    }
    if (u === 'NORMAL' || s === 'MODERATE') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
          <Activity className="w-3 h-3 text-emerald-500" /> Moderate
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
        <Clock className="w-3 h-3 text-slate-400" /> Low/Minor
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-16">
      {/* 1. Header Banner & Real-Time Radar Scanner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/30 shadow-inner">
                <Radio className="w-5 h-5 animate-pulse" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-ping opacity-75" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  National Civic Radar & Threat Observatory
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                  Real-time early warning signals, regional threat velocity, and state institutional accountability for Ghana
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={handleTriggerRefresh}
              disabled={isRefreshing}
              className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
              title="Refresh live telemetry from all 16 regions"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-500' : ''}`} />
              <span>{isRefreshing ? 'Syncing...' : 'Sync Telemetry'}</span>
            </button>

            <button
              onClick={handleCopyRadarBriefing}
              className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1.5 active:scale-95"
              title="Copy radar briefing to clipboard"
            >
              {copiedBriefing ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400">Briefing Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copy Briefing</span>
                </>
              )}
            </button>

            {onOpenSpeakUp && (
              <button
                onClick={onOpenSpeakUp}
                className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Report Issue</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Top-Level National KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Citizen Reports */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-1.5 transition-all hover:border-emerald-500/40">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Citizen Reports</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">{totalPostsCount}</div>
          <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Active across {regionalBreakdown.length} regions</span>
          </div>
        </div>

        {/* Community Ground Truth Confirmations */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-1.5 transition-all hover:border-emerald-500/40">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Confirmations</span>
            <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">{totalConfirmationsCount}</div>
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Independent ground-truth validations
          </div>
        </div>

        {/* Official State Accountability & Response Rate */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-1.5 transition-all hover:border-emerald-500/40">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">State Response Rate</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">{responseRate}%</div>
          <div className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
            {totalResponsesCount} official state statements
          </div>
        </div>

        {/* Avg Response Time */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-1.5 transition-all hover:border-emerald-500/40">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Response Speed</span>
            <div className="w-7 h-7 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">{avgResponseTime}h</div>
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Average acknowledgment latency
          </div>
        </div>
      </div>

      {/* 3. Real-Time Early Warning Radar Matrix with Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
        {/* Radar Controls Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="space-y-0.5">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-500" />
              Live Civic Velocity & Threat Radar Feed
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Filter by system threat level category, time horizon, and geographic jurisdiction
            </p>
          </div>

          {/* Time range pills */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <button
              onClick={() => setSelectedTimeRange('24h')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                selectedTimeRange === '24h'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              24 Hours
            </button>
            <button
              onClick={() => setSelectedTimeRange('7d')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                selectedTimeRange === '7d'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setSelectedTimeRange('30d')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                selectedTimeRange === '30d'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              30 Days
            </button>
            <button
              onClick={() => setSelectedTimeRange('all')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                selectedTimeRange === 'all'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All-Time
            </button>
          </div>
        </div>

        {/* Threat Category Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            onClick={() => setSelectedThreatFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl font-bold border transition-all ${
              selectedThreatFilter === 'ALL'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
            }`}
          >
            All Signals ({posts.length})
          </button>

          <button
            onClick={() => setSelectedThreatFilter('CRITICAL')}
            className={`px-3 py-1.5 rounded-xl font-bold border transition-all flex items-center gap-1.5 ${
              selectedThreatFilter === 'CRITICAL'
                ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/60 hover:bg-rose-100'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Emergency</span>
          </button>

          <button
            onClick={() => setSelectedThreatFilter('HIGH')}
            className={`px-3 py-1.5 rounded-xl font-bold border transition-all flex items-center gap-1.5 ${
              selectedThreatFilter === 'HIGH'
                ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900/60 hover:bg-amber-100'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>High</span>
          </button>

          <button
            onClick={() => setSelectedThreatFilter('NORMAL')}
            className={`px-3 py-1.5 rounded-xl font-bold border transition-all flex items-center gap-1.5 ${
              selectedThreatFilter === 'NORMAL'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60 hover:bg-emerald-100'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Moderate</span>
          </button>

          <button
            onClick={() => setSelectedThreatFilter('LOW')}
            className={`px-3 py-1.5 rounded-xl font-bold border transition-all flex items-center gap-1.5 ${
              selectedThreatFilter === 'LOW'
                ? 'bg-slate-700 text-white border-slate-700 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Low/Minor</span>
          </button>

          {/* Region Dropdown Selector */}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-slate-400 text-xs hidden sm:inline">Region:</span>
            <select
              value={selectedRegionFilter}
              onChange={e => setSelectedRegionFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">All 16 Ghana Regions</option>
              {GHANA_ALL_REGIONS.map(reg => (
                <option key={reg} value={reg}>{reg}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Live Radar Post Feed Cards */}
        {filteredRadarPosts.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
            <Radio className="w-8 h-8 text-slate-400 mx-auto" />
            <div className="text-sm font-bold text-slate-700 dark:text-slate-300">No active signals found in this radar filter</div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Try adjusting the threat level or time window to view all recorded civic telemetry.
            </p>
            <button
              onClick={() => {
                setSelectedThreatFilter('ALL');
                setSelectedRegionFilter('ALL');
                setSelectedCategoryFilter('ALL');
                setSelectedTimeRange('all');
              }}
              className="mt-2 px-3 py-1.5 bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredRadarPosts.map(post => {
              const confirmations = post.confirmationsCount || post.engagement?.confirmations || 1;
              const hasResponse = post.officialResponses && post.officialResponses.length > 0;

              return (
                <div
                  key={post.id}
                  onClick={() => {
                    if (onSelectPost) onSelectPost(post);
                    else navigate(`/post/${post.id}`);
                  }}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs hover:border-emerald-500/60 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-3 group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      {renderThreatBadge(post.urgency, post.severity)}
                      <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {post.location?.district || post.location?.region || 'Ghana'}
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {post.title}
                    </h3>

                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {post.content}
                    </p>
                  </div>

                  <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        {confirmations} confirmations
                      </span>
                      {hasResponse && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          State Responded
                        </span>
                      )}
                    </div>

                    <span className="text-emerald-600 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform font-bold text-xs flex items-center gap-0.5">
                      View <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Regional Breakdown & Domain Analytics Dual Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Civic Domain Distribution */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Citizen Reports by Civic Domain
            </h3>
            <span className="text-xs font-semibold text-slate-400">
              {categoryBreakdown.length} Domains Active
            </span>
          </div>

          <div className="space-y-3 text-xs">
            {categoryBreakdown.map(item => {
              const percentage = totalPostsCount > 0 ? Math.round((item.count / totalPostsCount) * 100) : 0;
              const isSelected = selectedCategoryFilter === item.category;

              return (
                <div
                  key={item.category}
                  onClick={() => setSelectedCategoryFilter(isSelected ? 'ALL' : item.category)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
                      : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-slate-800 dark:text-slate-200 mb-1.5">
                    <span className="font-bold">{item.category}</span>
                    <span className="text-slate-500 dark:text-slate-400 font-medium">
                      {item.count} reports ({percentage}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${Math.max(percentage, 4)}%` }}
                      className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full transition-all duration-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Regional Activity Breakdown */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Regional Threat & Response Index
            </h3>
            <span className="text-xs font-semibold text-slate-400">
              Ranked by Volume
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            {regionalBreakdown.slice(0, 7).map(r => {
              const isSelected = selectedRegionFilter === r.region;
              return (
                <div
                  key={r.region}
                  onClick={() => setSelectedRegionFilter(isSelected ? 'ALL' : r.region)}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
                      : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <span>{r.region} Region</span>
                      {r.postCount >= 3 && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 rounded border border-rose-200 dark:border-rose-800">
                          High Activity
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {r.postCount} citizen reports • {r.resolvedCount} addressed
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-emerald-600 dark:text-emerald-400 font-black text-sm">{r.responseRate}%</span>
                    <div className="text-[10px] text-slate-400 font-medium">Response Rate</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 5. Institutional Responsiveness & Transparency Directory Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              State Institutions Responsiveness & Public Channel Index
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live directory of verified Ghanaian state bodies, alert dispatch methods, and public response metrics
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={instSearchQuery}
              onChange={e => setInstSearchQuery(e.target.value)}
              placeholder="Search agency, police, ECG..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 uppercase font-bold">
                <th className="pb-3 pr-4">State Agency</th>
                <th className="pb-3 pr-4">Domain Mandate</th>
                <th className="pb-3 pr-4 text-center">Alert Method</th>
                <th className="pb-3 pr-4 text-center">Responses</th>
                <th className="pb-3 pr-4 text-center">Avg Latency</th>
                <th className="pb-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-800 dark:text-slate-300">
              {filteredInstitutions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 dark:text-slate-400 text-xs">
                    No state agency found matching "{instSearchQuery}"
                  </td>
                </tr>
              ) : (
                filteredInstitutions.map((inst, idx) => (
                  <tr
                    key={inst.id ? `${inst.id}-${idx}` : `inst-row-${idx}`}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Agency name */}
                    <td className="py-3.5 pr-4">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>{inst.shortName}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded">
                          {inst.acronym}
                        </span>
                        {inst.verified && (
                          <span title="Verified State Desk" className="inline-flex">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                        {inst.officialName}
                      </div>
                    </td>

                    {/* Domain Mandate */}
                    <td className="py-3.5 pr-4 max-w-xs">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                        {inst.category || 'Public Administration'}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                        {inst.mandate}
                      </div>
                    </td>

                    {/* Alert Channel */}
                    <td className="py-3.5 pr-4 text-center">
                      <span className="px-2.5 py-1 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 inline-flex items-center gap-1">
                        {inst.alertMethod === 'DIRECT_API'
                          ? '⚡ Direct API'
                          : inst.alertMethod === 'WHATSAPP_LINE'
                          ? '💬 WhatsApp Desk'
                          : '✉️ Official Email'}
                      </span>
                    </td>

                    {/* Official Responses */}
                    <td className="py-3.5 pr-4 text-center">
                      <span className="px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-bold rounded-md text-xs border border-emerald-200 dark:border-emerald-800">
                        {inst.officialResponsesCount || 0}
                      </span>
                    </td>

                    {/* Avg Latency */}
                    <td className="py-3.5 pr-4 text-center font-medium text-slate-600 dark:text-slate-400">
                      {inst.avgResponseTimeHours ? `${inst.avgResponseTimeHours}h` : '4.2h'}
                    </td>

                    {/* Action */}
                    <td className="py-3.5 text-right">
                      <button
                        onClick={() => {
                          if (onSelectInstitution) onSelectInstitution(inst.id);
                          else navigate(`/institutions/${inst.id}`);
                        }}
                        className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950 hover:text-emerald-600 dark:hover:text-emerald-400 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-lg border border-slate-200 dark:border-slate-700 transition-colors inline-flex items-center gap-1"
                      >
                        <span>View Desk</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
