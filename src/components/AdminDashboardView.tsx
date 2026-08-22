import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  Users,
  FileText,
  AlertTriangle,
  Building2,
  Lock,
  Cpu,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  Filter,
  Plus,
  Play,
  RotateCcw,
  Activity,
  Layers,
  Eye,
  ShieldCheck,
  UserCheck,
  Clock,
  ExternalLink,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { api } from '../services/api';

type AdminTab = 'overview' | 'content' | 'reports' | 'users' | 'institutions' | 'privacy' | 'system';

export const AdminDashboardView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showMobileTabDropdown, setShowMobileTabDropdown] = useState(false);

  // Overview stats
  const [overview, setOverview] = useState<any>(null);

  // Users tab state
  const [users, setUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');

  // Posts / Moderation state
  const [adminPosts, setAdminPosts] = useState<any[]>([]);
  const [postSearch, setPostSearch] = useState('');
  const [moderationFilter, setModerationFilter] = useState('ALL');

  // Abuse Reports state
  const [abuseReports, setAbuseReports] = useState<any[]>([]);
  const [reportStatusFilter, setReportStatusFilter] = useState('ALL');

  // Jobs state
  const [jobs, setJobs] = useState<any[]>([]);
  const [jobStatusFilter, setJobStatusFilter] = useState('ALL');

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Institution Modal / Form state
  const [showInstModal, setShowInstModal] = useState(false);
  const [instForm, setInstForm] = useState({
    id: '',
    officialName: '',
    shortName: '',
    acronym: '',
    mandate: '',
    category: 'GOVERNMENT',
    jurisdiction: 'NATIONAL',
    alertMethod: 'OFFICIAL_EMAIL'
  });

  const getTabLabel = (tab: AdminTab) => {
    switch (tab) {
      case 'overview': return 'System Overview';
      case 'content': return 'Content Moderation';
      case 'reports': return 'Abuse Flag Queue';
      case 'users': return 'User Management';
      case 'institutions': return 'State Institutions';
      case 'privacy': return 'P³RE Privacy Engine';
      case 'system': return 'Job Queue & Audit';
    }
  };

  // Load overview data
  const loadOverview = useCallback(async () => {
    try {
      const data = await api.getAdminOverview();
      setOverview(data);
    } catch (err) {
      console.error('Failed to load admin overview:', err);
    }
  }, []);

  // Load Tab-specific data
  const loadTabData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'overview') {
        await loadOverview();
      } else if (activeTab === 'users') {
        const u = await api.getAdminUsers({ search: userSearch, role: userRoleFilter });
        setUsers(u);
      } else if (activeTab === 'content') {
        const p = await api.getAdminPosts({ search: postSearch, moderationStatus: moderationFilter });
        setAdminPosts(p);
      } else if (activeTab === 'reports') {
        const r = await api.getAdminAbuseReports(reportStatusFilter);
        setAbuseReports(r);
      } else if (activeTab === 'system') {
        const [j, logs] = await Promise.all([
          api.getAdminJobs(jobStatusFilter),
          api.getAdminAuditLogs()
        ]);
        setJobs(j);
        setAuditLogs(logs);
      }
    } catch (err) {
      console.error(`Failed to load tab data for ${activeTab}:`, err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, userSearch, userRoleFilter, postSearch, moderationFilter, reportStatusFilter, jobStatusFilter, loadOverview]);

  useEffect(() => {
    loadTabData();
  }, [loadTabData]);

  // Handlers
  const handleUserRoleChange = async (userId: string, newRole: string) => {
    setActionLoading(`user-role-${userId}`);
    try {
      await api.updateUserRole(userId, newRole);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      alert('Failed to update user role');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUserVerifyToggle = async (userId: string, currentStatus: boolean) => {
    setActionLoading(`user-verify-${userId}`);
    try {
      await api.updateUserVerification(userId, !currentStatus);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_verified: !currentStatus ? 1 : 0 } : u));
    } catch (err) {
      alert('Failed to toggle verification status');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePostModerationUpdate = async (postId: string, modStatus: string, lifecycleStatus?: string) => {
    setActionLoading(`post-mod-${postId}`);
    try {
      await api.updatePostModeration(postId, { moderationStatus: modStatus, reportLifecycleStatus: lifecycleStatus });
      setAdminPosts(prev => prev.map(p => p.id === postId ? { ...p, moderation_status: modStatus, report_lifecycle_status: lifecycleStatus || p.report_lifecycle_status } : p));
    } catch (err) {
      alert('Failed to update post moderation');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAbuseReportResolve = async (reportId: string, status: 'RESOLVED' | 'DISMISSED') => {
    setActionLoading(`report-${reportId}`);
    try {
      await api.updateAbuseReport(reportId, status);
      setAbuseReports(prev => prev.map(r => r.id === reportId ? { ...r, status } : r));
    } catch (err) {
      alert('Failed to update report status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRetryJob = async (jobId: string) => {
    setActionLoading(`job-${jobId}`);
    try {
      await api.retryAdminJob(jobId);
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'QUEUED', attempts: 0 } : j));
    } catch (err) {
      alert('Failed to retry background job');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading('save-inst');
    try {
      await api.manageInstitution(instForm);
      setShowInstModal(false);
      setInstForm({
        id: '',
        officialName: '',
        shortName: '',
        acronym: '',
        mandate: '',
        category: 'GOVERNMENT',
        jurisdiction: 'NATIONAL',
        alertMethod: 'OFFICIAL_EMAIL'
      });
      alert('State agency successfully saved/updated!');
    } catch (err) {
      alert('Failed to save institution');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden min-h-[680px] flex flex-col md:flex-row text-slate-100">
      {/* Sidebar Navigation - Desktop */}
      <aside className="hidden md:flex w-64 lg:w-72 bg-slate-950/90 border-r border-slate-800 p-4 shrink-0 flex-col justify-between">
        <div className="space-y-6">
          {/* Header Badge */}
          <div className="flex items-center gap-2.5 px-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg">
              <ShieldAlert className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm text-white tracking-wide">ADMIN CONSOLE</h2>
              <p className="text-[10px] text-slate-400">Ghana Civic Control Center</p>
            </div>
          </div>

          {/* Nav Tabs */}
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                activeTab === 'overview'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Activity className="w-4 h-4" /> System Overview
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            </button>

            <button
              onClick={() => setActiveTab('content')}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                activeTab === 'content'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <FileText className="w-4 h-4" /> Content Moderation
              </span>
              {overview?.pendingAbuse > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold border border-amber-500/30">
                  {overview.pendingAbuse}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                activeTab === 'reports'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4" /> Abuse Flag Queue
              </span>
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                activeTab === 'users'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Users className="w-4 h-4" /> User Management
              </span>
            </button>

            <button
              onClick={() => setActiveTab('institutions')}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                activeTab === 'institutions'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Building2 className="w-4 h-4" /> State Institutions
              </span>
            </button>

            <button
              onClick={() => setActiveTab('privacy')}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                activeTab === 'privacy'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Lock className="w-4 h-4" /> P³RE Privacy Engine
              </span>
            </button>

            <button
              onClick={() => setActiveTab('system')}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                activeTab === 'system'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Cpu className="w-4 h-4" /> Job Queue & Audit Logs
              </span>
            </button>
          </nav>
        </div>

        {/* Footer Status */}
        <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-500 space-y-1 px-2">
          <div className="flex items-center justify-between">
            <span>Status:</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> ONLINE
            </span>
          </div>
          <div className="text-[10px]">Speak Up Web v1.0 Production</div>
        </div>
      </aside>

      {/* Mobile Top Header with Breadcrumbs & Dropdown */}
      <div className="md:hidden bg-slate-950/95 border-b border-slate-800 p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-purple-600 flex items-center justify-center text-white shadow">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <span className="font-extrabold text-xs text-white">ADMIN CONSOLE</span>
              <div className="flex items-center gap-1 text-[10px] text-purple-400">
                <span>Console</span>
                <ChevronRight className="w-3 h-3 text-slate-600" />
                <span className="font-bold">{getTabLabel(activeTab)}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowMobileTabDropdown(!showMobileTabDropdown)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-purple-300 text-xs font-bold rounded-xl border border-slate-700 active:scale-95 transition-all"
          >
            <span>Switch Tab</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Mobile Dropdown Panel */}
        {showMobileTabDropdown && (
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-2 space-y-1 shadow-2xl animate-in fade-in">
            {(['overview', 'content', 'reports', 'users', 'institutions', 'privacy', 'system'] as AdminTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setShowMobileTabDropdown(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between ${
                  activeTab === tab
                    ? 'bg-purple-600 text-white font-bold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span>{getTabLabel(tab)}</span>
              </button>
            ))}
          </div>
        )}

        {/* Mobile Horizontal Pill Tab Scroller */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
          {(['overview', 'content', 'reports', 'users', 'institutions', 'privacy', 'system'] as AdminTab[]).map(tab => (
            <button
              key={`pill-adm-${tab}`}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap shrink-0 transition-all ${
                activeTab === tab
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-slate-900 text-slate-400 border border-slate-800'
              }`}
            >
              {getTabLabel(tab)}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Body */}
      <main className="flex-1 p-4 sm:p-6 bg-slate-900/60 overflow-y-auto space-y-5">
        {/* Top Header - Desktop view */}
        <div className="hidden md:flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-purple-400 font-semibold mb-1">
              <span>Admin Console</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              <span className="text-slate-200">{getTabLabel(activeTab)}</span>
            </div>
            <h1 className="text-lg font-bold text-white capitalize flex items-center gap-2">
              {activeTab === 'overview' && 'System Performance & Platform Overview'}
              {activeTab === 'content' && 'Civic Content & Report Moderation'}
              {activeTab === 'reports' && 'Citizen Abuse & Flagging Review Queue'}
              {activeTab === 'users' && 'User Accounts & Access Management'}
              {activeTab === 'institutions' && 'State Agencies & Alert Channel Configuration'}
              {activeTab === 'privacy' && 'P³RE Privacy Engine Policy & Audit'}
              {activeTab === 'system' && 'Durable Job Queue & Event Timeline Audit'}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Full administrative authority over users, posts, alert dispatching, and site health.
            </p>
          </div>

          <button
            onClick={loadTabData}
            disabled={loading}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-purple-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-2">
                <div className="text-xs text-slate-400 flex items-center justify-between">
                  <span>Registered Users</span>
                  <Users className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-2xl font-extrabold text-white">{overview?.totalUsers || 0}</div>
                <div className="text-[10px] text-emerald-400">Citizens & Officials</div>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-2">
                <div className="text-xs text-slate-400 flex items-center justify-between">
                  <span>Total Civic Reports</span>
                  <FileText className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-extrabold text-white">{overview?.totalPosts || 0}</div>
                <div className="text-[10px] text-slate-400">Across 16 Regions</div>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-2">
                <div className="text-xs text-slate-400 flex items-center justify-between">
                  <span>Pending Abuse Flags</span>
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-extrabold text-amber-400">{overview?.pendingAbuse || 0}</div>
                <div className="text-[10px] text-slate-400">Requires review</div>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-2">
                <div className="text-xs text-slate-400 flex items-center justify-between">
                  <span>Active State Agencies</span>
                  <Building2 className="w-4 h-4 text-sky-400" />
                </div>
                <div className="text-2xl font-extrabold text-white">{overview?.activeInstitutions || 0}</div>
                <div className="text-[10px] text-slate-400">Alert routing configured</div>
              </div>
            </div>

            {/* Sub-system Status */}
            <div className="bg-slate-950/60 border border-slate-800 p-5 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-400" /> Infrastructure & Subsystem Readiness
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                  <div className="text-slate-400">SQLite Storage Engine</div>
                  <div className="font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> WAL Mode Active (0.2ms)
                  </div>
                </div>

                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                  <div className="text-slate-400">P³RE Ghanaian PII Engine</div>
                  <div className="font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Ghana Card / License Plate Active
                  </div>
                </div>

                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                  <div className="text-slate-400">Alert Channels (HMAC / SMTP / SMS)</div>
                  <div className="font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Idempotent Alert Queue
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CONTENT MODERATION */}
        {activeTab === 'content' && (
          <div className="space-y-4">
            {/* Filter bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter posts by title or author..."
                  value={postSearch}
                  onChange={e => setPostSearch(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <select
                value={moderationFilter}
                onChange={e => setModerationFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              >
                <option value="ALL">All Moderation Statuses</option>
                <option value="approved">Approved / Visible</option>
                <option value="held">Held for Review</option>
                <option value="flagged">Flagged</option>
                <option value="removed">Removed</option>
              </select>
            </div>

            {/* Posts Table */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 text-slate-400 uppercase font-bold text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-3">Report Details</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Urgency</th>
                    <th className="p-3">Author</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Moderation Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {adminPosts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-500">
                        No reports matching filter criteria.
                      </td>
                    </tr>
                  ) : (
                    adminPosts.map(post => (
                      <tr key={post.id} className="hover:bg-slate-900/50 transition-colors">
                        <td className="p-3">
                          <div className="font-bold text-white line-clamp-1">{post.title}</div>
                          <div className="text-[10px] text-slate-400">{post.region} - {post.district}</div>
                        </td>
                        <td className="p-3 font-semibold text-slate-300">{post.category}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            post.urgency === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-slate-800 text-slate-300'
                          }`}>
                            {post.urgency}
                          </span>
                        </td>
                        <td className="p-3 font-medium text-slate-300">{post.author_name}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            post.moderation_status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            {post.moderation_status}
                          </span>
                        </td>
                        <td className="p-3 text-right space-x-1.5">
                          {post.moderation_status !== 'approved' && (
                            <button
                              onClick={() => handlePostModerationUpdate(post.id, 'approved', 'PUBLISHED')}
                              disabled={actionLoading === `post-mod-${post.id}`}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold transition-colors"
                            >
                              Approve
                            </button>
                          )}
                          {post.moderation_status !== 'held' && (
                            <button
                              onClick={() => handlePostModerationUpdate(post.id, 'held', 'MODERATION_REVIEW')}
                              disabled={actionLoading === `post-mod-${post.id}`}
                              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-[11px] font-bold transition-colors"
                            >
                              Hold
                            </button>
                          )}
                          {post.moderation_status !== 'removed' && (
                            <button
                              onClick={() => handlePostModerationUpdate(post.id, 'removed', 'REMOVED')}
                              disabled={actionLoading === `post-mod-${post.id}`}
                              className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-[11px] font-bold transition-colors"
                            >
                              Remove
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: ABUSE REPORTS */}
        {activeTab === 'reports' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <span className="text-xs font-bold text-slate-300">Filter Flagged Abuse Complaints:</span>
              <select
                value={reportStatusFilter}
                onChange={e => setReportStatusFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending Action</option>
                <option value="RESOLVED">Resolved</option>
                <option value="DISMISSED">Dismissed</option>
              </select>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 text-slate-400 uppercase font-bold text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-3">Reported Issue Title</th>
                    <th className="p-3">Abuse Reason</th>
                    <th className="p-3">Reporter Details</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {abuseReports.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-500">
                        No abuse reports found.
                      </td>
                    </tr>
                  ) : (
                    abuseReports.map(rep => (
                      <tr key={rep.id} className="hover:bg-slate-900/50">
                        <td className="p-3 font-semibold text-white">{rep.post_title || rep.post_id}</td>
                        <td className="p-3 font-medium text-amber-400">{rep.reason}</td>
                        <td className="p-3 text-slate-400">{rep.user_id || 'Anonymous Citizen'}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            rep.status === 'PENDING' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {rep.status}
                          </span>
                        </td>
                        <td className="p-3 text-right space-x-1.5">
                          {rep.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleAbuseReportResolve(rep.id, 'RESOLVED')}
                                disabled={actionLoading === `report-${rep.id}`}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold"
                              >
                                Action & Resolve
                              </button>
                              <button
                                onClick={() => handleAbuseReportResolve(rep.id, 'DISMISSED')}
                                disabled={actionLoading === `report-${rep.id}`}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-bold"
                              >
                                Dismiss
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: USERS MANAGEMENT */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search user by name, handle or email..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <select
                value={userRoleFilter}
                onChange={e => setUserRoleFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              >
                <option value="ALL">All Roles</option>
                <option value="CITIZEN">Citizen</option>
                <option value="INSTITUTION_REP">State Institution Rep</option>
                <option value="JOURNALIST">Journalist</option>
                <option value="MODERATOR">Moderator</option>
                <option value="ADMIN">System Admin</option>
              </select>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 text-slate-400 uppercase font-bold text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-3">User</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Verified Status</th>
                    <th className="p-3 text-right">Account Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-slate-900/50">
                      <td className="p-3 font-bold text-white flex items-center gap-2">
                        <img src={u.avatar} alt="" className="w-6 h-6 rounded-full bg-slate-800" />
                        <div>
                          <div>{u.name}</div>
                          <div className="text-[10px] text-slate-500 font-normal">{u.handle}</div>
                        </div>
                      </td>
                      <td className="p-3 font-mono text-slate-400">{u.email}</td>
                      <td className="p-3">
                        <select
                          value={u.role}
                          onChange={e => handleUserRoleChange(u.id, e.target.value)}
                          disabled={actionLoading === `user-role-${u.id}`}
                          className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-purple-300 font-bold focus:outline-none"
                        >
                          <option value="CITIZEN">CITIZEN</option>
                          <option value="INSTITUTION_REP">INSTITUTION_REP</option>
                          <option value="JOURNALIST">JOURNALIST</option>
                          <option value="MODERATOR">MODERATOR</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => handleUserVerifyToggle(u.id, Boolean(u.is_verified))}
                          disabled={actionLoading === `user-verify-${u.id}`}
                          className={`px-2.5 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition-colors ${
                            u.is_verified ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          <UserCheck className="w-3 h-3" />
                          {u.is_verified ? 'VERIFIED' : 'UNVERIFIED'}
                        </button>
                      </td>
                      <td className="p-3 text-right text-slate-400 text-[10px]">
                        ID: {u.id.substring(0, 12)}...
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: INSTITUTIONS & ALERT CHANNELS */}
        {activeTab === 'institutions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-white">Registered Ghanaian Public Institutions</h3>
              <button
                onClick={() => setShowInstModal(true)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md"
              >
                <Plus className="w-4 h-4" /> Add State Agency
              </button>
            </div>

            {showInstModal && (
              <form onSubmit={handleSaveInstitution} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <h4 className="font-bold text-xs text-purple-400 uppercase">Manage Agency Profile</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <input
                    type="text"
                    placeholder="Official Name (e.g., Ghana Police Service)"
                    required
                    value={instForm.officialName}
                    onChange={e => setInstForm({ ...instForm, officialName: e.target.value })}
                    className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  />
                  <input
                    type="text"
                    placeholder="Short Name (e.g., Ghana Police)"
                    required
                    value={instForm.shortName}
                    onChange={e => setInstForm({ ...instForm, shortName: e.target.value })}
                    className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  />
                  <input
                    type="text"
                    placeholder="Acronym (e.g., GPS)"
                    required
                    value={instForm.acronym}
                    onChange={e => setInstForm({ ...instForm, acronym: e.target.value })}
                    className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  />
                  <select
                    value={instForm.alertMethod}
                    onChange={e => setInstForm({ ...instForm, alertMethod: e.target.value })}
                    className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  >
                    <option value="OFFICIAL_EMAIL">Official SMTP Email Alert</option>
                    <option value="DIRECT_API">HMAC Webhook API</option>
                    <option value="WHATSAPP_DISPATCH">WhatsApp Dispatch Desk</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowInstModal(false)}
                    className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-purple-600 text-white text-xs font-bold rounded-lg"
                  >
                    Save Institution
                  </button>
                </div>
              </form>
            )}

            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-300 space-y-2">
              <p className="font-semibold text-white">Configured Dispatch Channels:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-400">
                <li>Ghana Police Service (GPS) — <span className="text-emerald-400">alerts@police.gov.gh</span> (Email & HMAC Webhook)</li>
                <li>Electricity Company of Ghana (ECG) — <span className="text-emerald-400">dispatch@ecg.gov.gh</span> (Direct API)</li>
                <li>Ghana Water Company Ltd (GWCL) — <span className="text-emerald-400">reports@gwcl.com.gh</span> (Email)</li>
                <li>NADMO Disaster Emergency — <span className="text-emerald-400">emergency@nadmo.gov.gh</span> (SMS / API)</li>
              </ul>
            </div>
          </div>
        )}

        {/* TAB 6: P3RE PRIVACY ENGINE */}
        {activeTab === 'privacy' && (
          <div className="space-y-4">
            <div className="p-5 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase">
                <ShieldCheck className="w-4 h-4" /> P³RE Privacy Engine Active Policy
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                The Privacy-Preserving Public Representation Engine isolates raw citizen submissions in protected storage, executes local Ghanaian deterministic PII detectors (Ghana Card IDs, Phone numbers, GPS coordinates), generates public projections, and restricts raw evidence to authorized state officials.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <div className="text-slate-500 text-[10px]">Protected Storage</div>
                  <div className="font-bold text-white">/uploads/protected</div>
                </div>
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <div className="text-slate-500 text-[10px]">Public Storage</div>
                  <div className="font-bold text-white">/uploads/public</div>
                </div>
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <div className="text-slate-500 text-[10px]">Ghana Card ID Detector</div>
                  <div className="font-bold text-emerald-400">GHA-XXXXXXXXX-X</div>
                </div>
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <div className="text-slate-500 text-[10px]">Access Token Expiry</div>
                  <div className="font-bold text-amber-400">30 Minutes</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: JOB QUEUE & AUDIT LOGS */}
        {activeTab === 'system' && (
          <div className="space-y-6">
            {/* Job Queue */}
            <div className="space-y-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-purple-400" /> Background Job Queue
              </h3>
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900 text-slate-400 uppercase font-bold text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="p-3">Job ID & Type</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Attempts</th>
                      <th className="p-3">Created At</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {jobs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-slate-500">
                          No background jobs in queue.
                        </td>
                      </tr>
                    ) : (
                      jobs.map(j => (
                        <tr key={j.id} className="hover:bg-slate-900/50">
                          <td className="p-3 font-mono font-bold text-white">
                            <div>{j.type}</div>
                            <div className="text-[10px] text-slate-500 font-normal">{j.id}</div>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              j.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' :
                              j.status === 'FAILED' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                            }`}>
                              {j.status}
                            </span>
                          </td>
                          <td className="p-3 text-slate-400">{j.attempts} / {j.max_attempts}</td>
                          <td className="p-3 text-slate-400">{new Date(j.created_at).toLocaleString()}</td>
                          <td className="p-3 text-right">
                            {j.status === 'FAILED' && (
                              <button
                                onClick={() => handleRetryJob(j.id)}
                                disabled={actionLoading === `job-${j.id}`}
                                className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-[11px] font-bold flex items-center gap-1 ml-auto"
                              >
                                <RotateCcw className="w-3 h-3" /> Retry
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Audit Logs */}
            <div className="space-y-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" /> Immutable Event Audit Timeline
              </h3>
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-2 max-h-60 overflow-y-auto text-xs font-mono">
                {auditLogs.map((log, idx) => (
                  <div key={idx} className="p-2 bg-slate-900/80 rounded border border-slate-800 flex items-center justify-between text-slate-300">
                    <div>
                      <span className="text-purple-400 font-bold">[{log.event_type}]</span> Report: {log.report_id} — Actor: {log.actor_type} ({log.actor_id || 'System'})
                    </div>
                    <span className="text-[10px] text-slate-500">{new Date(log.created_at).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
