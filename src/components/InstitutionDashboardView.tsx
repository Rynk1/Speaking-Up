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
  MapPin,
  TrendingUp,
  UserCheck,
  HelpCircle,
  FolderCheck,
  GitPullRequest
} from 'lucide-react';
import { Institution, CivicPost, InstitutionResponse } from '../types';
import { api } from '../services/api';
import { CivicPostReportModal } from './CivicPostReportModal';

export type InstitutionTab =
  | 'overview'
  | 'new_awareness'
  | 'urgent'
  | 'trending'
  | 'assigned'
  | 'under_review'
  | 'responses'
  | 'action_reported'
  | 'citizen_followup'
  | 'closed'
  | 'config';

interface InstitutionDashboardViewProps {
  institutions: Institution[];
  posts: CivicPost[];
  selectedInstitutionId: string;
  setSelectedInstitutionId: (id: string) => void;
  onOpenResponseModal: (post: CivicPost, existingResponse?: InstitutionResponse) => void;
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
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [selectedReportPost, setSelectedReportPost] = useState<CivicPost | null>(null);

  // Quick Assignment Modal State
  const [assigningPost, setAssigningPost] = useState<CivicPost | null>(null);
  const [assignedDepartment, setAssignedDepartment] = useState('Rapid Technical Unit');
  const [assignedOfficer, setAssignedOfficer] = useState('Duty Senior Inspector');
  const [assignNotes, setAssignNotes] = useState('');

  // Clarification Modal State
  const [clarifyingPost, setClarifyingPost] = useState<CivicPost | null>(null);
  const [clarifyQuestion, setClarifyQuestion] = useState('');

  const currentInstitution = institutions.find(i => i.id === selectedInstitutionId) || institutions[0];

  // Filter posts tagged with this institution
  const taggedPosts = posts.filter(p =>
    p.institutionTags.some(t => t.institutionId === currentInstitution?.id)
  );

  // Filter categories matching PRD Phase 7
  const newAwarenessPosts = taggedPosts.filter(p =>
    !p.accountabilityStatus || p.accountabilityStatus === 'NOT_ROUTED' || p.accountabilityStatus === 'QUEUED'
  );
  const urgentPosts = taggedPosts.filter(p => p.urgency === 'CRITICAL' || p.severity === 'EMERGENCY');
  const trendingPosts = taggedPosts.filter(p => p.engagement.confirmations >= 5 || (p.engagement.shares && p.engagement.shares >= 3));
  const assignedPosts = taggedPosts.filter(p => p.accountabilityStatus === 'ASSIGNED');
  const underReviewPosts = taggedPosts.filter(p => p.accountabilityStatus === 'UNDER_REVIEW' || p.accountabilityStatus === 'ACKNOWLEDGED');
  const answeredPosts = taggedPosts.filter(p =>
    p.officialResponses?.some(r => r.institutionId === currentInstitution?.id) || p.accountabilityStatus === 'RESPONDED'
  );
  const actionReportedPosts = taggedPosts.filter(p => p.accountabilityStatus === 'ACTION_REPORTED');
  const citizenFollowupPosts = taggedPosts.filter(p => p.communityEvidence && p.communityEvidence.length > 0);
  const closedPosts = taggedPosts.filter(p => p.accountabilityStatus === 'RESOLVED' || p.accountabilityStatus === 'COMMUNITY_CONFIRMED');

  const getTabLabel = (tab: InstitutionTab) => {
    switch (tab) {
      case 'overview': return 'Performance & Geo Desk';
      case 'new_awareness': return 'New Awareness';
      case 'urgent': return 'Urgent / Crisis Desk';
      case 'trending': return 'Trending / Viral Issues';
      case 'assigned': return 'Assigned Internally';
      case 'under_review': return 'Under Field Assessment';
      case 'responses': return 'Responded / Statements';
      case 'action_reported': return 'Action Reported';
      case 'citizen_followup': return 'Citizen Evidence Follow-up';
      case 'closed': return 'Closed / Resolved Archive';
      case 'config': return 'Agency & Channel Config';
    }
  };

  const handleQuickAcknowledge = async (postId: string) => {
    setActionLoading(`ack-${postId}`);
    try {
      await api.triggerAlert(postId, currentInstitution.id);
      await api.updatePostStatus(postId, 'UNDER_REVIEW');
      onPostUpdated();
    } catch (err) {
      console.error('Failed to acknowledge:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleStatusChange = async (postId: string, newStatus: string) => {
    setActionLoading(`status-${postId}`);
    try {
      await api.updatePostStatus(postId, newStatus);
      onPostUpdated();
    } catch (err) {
      console.error('Failed to change status:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningPost) return;
    setActionLoading(`assign-${assigningPost.id}`);
    try {
      await api.assignPost(assigningPost.id, {
        institutionId: currentInstitution.id,
        assignedDepartment,
        assignedOfficer,
        notes: assignNotes
      });
      setAssigningPost(null);
      setAssignNotes('');
      onPostUpdated();
    } catch (err) {
      console.error('Failed to assign post:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleClarifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clarifyingPost || !clarifyQuestion.trim()) return;
    setActionLoading(`clarify-${clarifyingPost.id}`);
    try {
      await api.requestClarification(clarifyingPost.id, {
        institutionId: currentInstitution.id,
        question: clarifyQuestion.trim()
      });
      setClarifyingPost(null);
      setClarifyQuestion('');
      onPostUpdated();
    } catch (err) {
      console.error('Failed to request clarification:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const renderPostList = (postList: CivicPost[], emptyMessage: string) => {
    const filtered = postList.filter(p => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q) || p.location.district.toLowerCase().includes(q);
    });

    if (filtered.length === 0) {
      return (
        <div className="p-8 text-center bg-slate-950/60 border border-slate-800 rounded-2xl text-slate-400 text-xs">
          {emptyMessage}
        </div>
      );
    }

    return (
      <div className="space-y-3.5">
        {filtered.map((post, postIdx) => {
          const resp = post.officialResponses?.find(r => r.institutionId === currentInstitution?.id);
          const hasResponded = !!resp;

          return (
            <div
              key={post.id ? `${post.id}-${postIdx}` : `dash-post-${postIdx}`}
              className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3 hover:border-slate-700 transition-all shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="font-bold text-amber-400">
                      {post.location.district} ({post.location.region})
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-800 text-slate-300 border border-slate-700 rounded uppercase">
                      {post.accountabilityStatus || 'NEW_AWARENESS'}
                    </span>
                    {post.urgency === 'CRITICAL' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-red-950 text-red-300 border border-red-800 rounded">
                        🔴 CRITICAL
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
                  {new Date(post.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                "{post.content}"
              </p>

              {/* Status Transition & Actions Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 border-t border-slate-800 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-medium">Status:</span>
                  <select
                    value={post.accountabilityStatus || 'NEW_AWARENESS'}
                    onChange={e => handleStatusChange(post.id, e.target.value)}
                    disabled={actionLoading === `status-${post.id}`}
                    className="bg-slate-900 text-amber-300 border border-slate-700 rounded-lg p-1 text-[11px] font-bold focus:outline-none"
                  >
                    <option value="NEW_AWARENESS">NEW_AWARENESS</option>
                    <option value="URGENT">URGENT</option>
                    <option value="TRENDING">TRENDING</option>
                    <option value="ASSIGNED">ASSIGNED</option>
                    <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                    <option value="RESPONDED">RESPONDED</option>
                    <option value="ACTION_REPORTED">ACTION_REPORTED</option>
                    <option value="CITIZEN_FOLLOW_UP">CITIZEN_FOLLOW_UP</option>
                    <option value="CLOSED">RESOLVED / CLOSED</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setAssigningPost(post)}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-semibold rounded-lg border border-slate-700 flex items-center gap-1 cursor-pointer"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-amber-400" /> Assign Dept
                  </button>

                  <button
                    onClick={() => setClarifyingPost(post)}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold rounded-lg border border-slate-700 flex items-center gap-1 cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-blue-400" /> Ask Citizen
                  </button>

                  <button
                    onClick={() => setSelectedReportPost(post)}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-semibold rounded-lg border border-slate-700 flex items-center gap-1 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" /> Civic Report
                  </button>

                  <button
                    onClick={() => onOpenResponseModal(post, resp)}
                    className="px-3.5 py-1 bg-amber-600 hover:bg-amber-500 text-slate-950 font-extrabold text-[11px] rounded-lg shadow-md active:scale-95 transition-transform flex items-center gap-1 cursor-pointer"
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>{hasResponded ? 'Edit Statement' : 'Respond Officially'}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden min-h-[750px] flex flex-col md:flex-row text-slate-100">
      {/* Sidebar Navigation - Desktop */}
      <aside className="hidden md:flex w-64 lg:w-72 bg-slate-950/90 border-r border-slate-800 p-4 shrink-0 flex-col justify-between">
        <div className="space-y-5">
          {/* Header & Institution Selector */}
          <div className="space-y-3 px-1">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-700 flex items-center justify-center shadow-lg text-slate-950 font-black">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-extrabold text-sm text-white tracking-wide">STATE DESK PORTAL</h2>
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

          {/* Granular Workflow Tabs (Phase 7 Compliant) */}
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                activeTab === 'overview'
                  ? 'bg-amber-600 text-slate-950 font-extrabold shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span className="flex items-center gap-2">
                <Activity className="w-4 h-4" /> Performance & Geo Desk
              </span>
            </button>

            <button
              onClick={() => setActiveTab('new_awareness')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                activeTab === 'new_awareness'
                  ? 'bg-amber-600 text-slate-950 font-extrabold shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4" /> New Awareness
              </span>
              {newAwarenessPosts.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold border border-red-500/30">
                  {newAwarenessPosts.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('urgent')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                activeTab === 'urgent'
                  ? 'bg-amber-600 text-slate-950 font-extrabold shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-red-400" /> Urgent / Crisis Desk
              </span>
              {urgentPosts.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                  {urgentPosts.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('trending')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                activeTab === 'trending'
                  ? 'bg-amber-600 text-slate-950 font-extrabold shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-400" /> Trending / Viral
              </span>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold">
                {trendingPosts.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('assigned')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                activeTab === 'assigned'
                  ? 'bg-amber-600 text-slate-950 font-extrabold shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-400" /> Assigned Internally
              </span>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold">
                {assignedPosts.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('under_review')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                activeTab === 'under_review'
                  ? 'bg-amber-600 text-slate-950 font-extrabold shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" /> Under Assessment
              </span>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold">
                {underReviewPosts.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('responses')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                activeTab === 'responses'
                  ? 'bg-amber-600 text-slate-950 font-extrabold shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Responded Statements
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                {answeredPosts.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('action_reported')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                activeTab === 'action_reported'
                  ? 'bg-amber-600 text-slate-950 font-extrabold shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span className="flex items-center gap-2">
                <GitPullRequest className="w-4 h-4 text-amber-300" /> Action Reported
              </span>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold">
                {actionReportedPosts.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('citizen_followup')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                activeTab === 'citizen_followup'
                  ? 'bg-amber-600 text-slate-950 font-extrabold shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-purple-400" /> Citizen Evidence
              </span>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold">
                {citizenFollowupPosts.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('closed')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                activeTab === 'closed'
                  ? 'bg-amber-600 text-slate-950 font-extrabold shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span className="flex items-center gap-2">
                <FolderCheck className="w-4 h-4 text-slate-400" /> Closed / Resolved
              </span>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold">
                {closedPosts.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('config')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                activeTab === 'config'
                  ? 'bg-amber-600 text-slate-950 font-extrabold shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span className="flex items-center gap-2">
                <Settings className="w-4 h-4" /> Agency & Dispatch Config
              </span>
            </button>
          </nav>
        </div>

        {/* Footer Status */}
        <div className="pt-3 border-t border-slate-800/80 text-[11px] text-slate-500 space-y-1 px-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Dispatch Line:</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> ACTIVE
            </span>
          </div>
          <div className="text-[10px] text-slate-400 truncate">{currentInstitution?.officialName}</div>
        </div>
      </aside>

      {/* Mobile Top Header with Interactive Breadcrumb Drawer Trigger */}
      <div className="md:hidden bg-slate-950/95 border-b border-slate-800 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowMobileSidebar(true)}
            className="flex items-center gap-2 group text-left cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-600 flex items-center justify-center text-slate-950 font-bold shadow-md">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <span className="font-extrabold text-xs text-white block">{currentInstitution?.acronym || 'STATE PORTAL'}</span>
              <div className="flex items-center gap-1 text-[11px] text-amber-400 font-semibold">
                <span>Portal</span>
                <ChevronRight className="w-3 h-3 text-slate-500" />
                <span className="text-white underline underline-offset-2 decoration-amber-500">{getTabLabel(activeTab)}</span>
              </div>
            </div>
          </button>

          <button
            onClick={() => setShowMobileSidebar(true)}
            className="px-3 py-1.5 bg-slate-800 text-amber-300 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>Workflow Menu</span>
          </button>
        </div>
      </div>

      {/* Mobile Left Sidebar Overlay Drawer */}
      {showMobileSidebar && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            onClick={() => setShowMobileSidebar(false)}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
          />

          <div className="relative w-4/5 max-w-xs bg-slate-950 border-r border-slate-800 h-full p-4 flex flex-col justify-between shadow-2xl z-10 overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-600 flex items-center justify-center text-slate-950 font-bold shadow-lg">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-sm text-white">STATE DESK PORTAL</h2>
                    <p className="text-[10px] text-amber-400 font-semibold">Verified Authority Desk</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowMobileSidebar(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  <Check className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Tabs */}
              <nav className="space-y-1">
                {(
                  [
                    'overview',
                    'new_awareness',
                    'urgent',
                    'trending',
                    'assigned',
                    'under_review',
                    'responses',
                    'action_reported',
                    'citizen_followup',
                    'closed',
                    'config'
                  ] as InstitutionTab[]
                ).map(tab => (
                  <button
                    key={`drawer-inst-${tab}`}
                    onClick={() => {
                      setActiveTab(tab);
                      setShowMobileSidebar(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                      activeTab === tab
                        ? 'bg-amber-600 text-slate-950 font-extrabold shadow-md'
                        : 'text-slate-300 hover:bg-slate-800/80'
                    }`}
                  >
                    <span>{getTabLabel(tab)}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>
      )}

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

        {/* Global Search Bar for Tagged Queue */}
        {activeTab !== 'overview' && activeTab !== 'config' && (
          <div className="flex items-center gap-2 bg-slate-950/70 p-3 rounded-2xl border border-slate-800">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder={`Filter ${getTabLabel(activeTab)} by keyword or district...`}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        )}

        {/* TAB 1: OVERVIEW & GEOGRAPHIC CONCENTRATION */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-950 text-emerald-400 rounded-xl border border-emerald-800/60">
                  <Radio className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <div className="font-bold text-white flex items-center gap-2">
                    Multi-Channel Alert Dispatch & Workflow Engine
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300 font-bold border border-emerald-700/60">
                      LIVE & OPERATIONAL
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Email, SMS, WhatsApp, Webhook & Dashboard Inbox Active
                  </div>
                </div>
              </div>
            </div>

            {/* Geographic Concentration & Emerging Patterns Card */}
            <div className="bg-slate-950/70 border border-slate-800 p-5 rounded-3xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-400" /> Geographic Concentration & Regional Emerging Patterns
                </h3>
                <span className="text-[11px] text-amber-400 font-bold">Real-time Cluster Mapping</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800 space-y-1">
                  <div className="text-slate-400 text-[10px] font-bold">Greater Accra Metro</div>
                  <div className="text-lg font-black text-amber-400">
                    {taggedPosts.filter(p => p.location.region === 'Greater Accra').length} Active Issues
                  </div>
                  <p className="text-[10px] text-slate-500">High concentration in Kumasi & Accra</p>
                </div>
                <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800 space-y-1">
                  <div className="text-slate-400 text-[10px] font-bold">Ashanti Region</div>
                  <div className="text-lg font-black text-emerald-400">
                    {taggedPosts.filter(p => p.location.region === 'Ashanti').length} Active Issues
                  </div>
                  <p className="text-[10px] text-slate-500">Infrastructure & Drainage reports</p>
                </div>
                <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800 space-y-1">
                  <div className="text-slate-400 text-[10px] font-bold">Other Regions</div>
                  <div className="text-lg font-black text-purple-400">
                    {taggedPosts.filter(p => p.location.region !== 'Greater Accra' && p.location.region !== 'Ashanti').length} Active Issues
                  </div>
                  <p className="text-[10px] text-slate-500">Distributed community observations</p>
                </div>
              </div>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
              <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-2xl space-y-1">
                <div className="text-xs text-slate-400 uppercase font-semibold">Total Tagged Alerts</div>
                <div className="text-2xl font-black text-white">{taggedPosts.length}</div>
                <div className="text-[10px] text-slate-500">Citizen reports across districts</div>
              </div>

              <div className="bg-slate-950/70 border border-amber-900/60 p-4 rounded-2xl space-y-1">
                <div className="text-xs text-amber-400 uppercase font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Critical Safety Issues
                </div>
                <div className="text-2xl font-black text-amber-400">{urgentPosts.length}</div>
                <div className="text-[10px] text-slate-500">Requires emergency response</div>
              </div>

              <div className="bg-slate-950/70 border border-red-900/60 p-4 rounded-2xl space-y-1">
                <div className="text-xs text-red-400 uppercase font-semibold">New Unacknowledged</div>
                <div className="text-2xl font-black text-red-400">{newAwarenessPosts.length}</div>
                <div className="text-[10px] text-slate-500">Awaiting official statement</div>
              </div>

              <div className="bg-slate-950/70 border border-emerald-900/60 p-4 rounded-2xl space-y-1">
                <div className="text-xs text-emerald-400 uppercase font-semibold">Published Statements</div>
                <div className="text-2xl font-black text-emerald-400">{answeredPosts.length}</div>
                <div className="text-[10px] text-slate-500">Official communiqués issued</div>
              </div>
            </div>
          </div>
        )}

        {/* WORKFLOW TABS CONTENT */}
        {activeTab === 'new_awareness' && renderPostList(newAwarenessPosts, 'No new unacknowledged citizen awareness reports.')}
        {activeTab === 'urgent' && renderPostList(urgentPosts, 'No active critical or high-severity safety reports.')}
        {activeTab === 'trending' && renderPostList(trendingPosts, 'No high-velocity trending issues right now.')}
        {activeTab === 'assigned' && renderPostList(assignedPosts, 'No internally assigned issues yet. Click "Assign Dept" on any report.')}
        {activeTab === 'under_review' && renderPostList(underReviewPosts, 'No issues currently under field inspection.')}
        {activeTab === 'responses' && renderPostList(answeredPosts, 'No official response statements published yet.')}
        {activeTab === 'action_reported' && renderPostList(actionReportedPosts, 'No direct field intervention actions reported yet.')}
        {activeTab === 'citizen_followup' && renderPostList(citizenFollowupPosts, 'No citizen evidence follow-ups submitted yet.')}
        {activeTab === 'closed' && renderPostList(closedPosts, 'No closed or resolved issues in archive.')}

        {/* TAB: AGENCY CONFIG */}
        {activeTab === 'config' && (
          <div className="space-y-4">
            <div className="p-5 sm:p-6 bg-slate-950/80 border border-slate-800 rounded-3xl space-y-5 text-xs">
              <h3 className="font-bold text-sm text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <Settings className="w-4 h-4" /> Agency Profile & Multi-Channel Dispatch Integration
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
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Internal Assignment Modal */}
      {assigningPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-md w-full space-y-4 text-xs">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-400" /> Assign Issue Internally
            </h3>
            <p className="text-slate-400">
              Assign report <strong className="text-white">"{assigningPost.title}"</strong> to a specific internal department or duty officer.
            </p>
            <form onSubmit={handleAssignSubmit} className="space-y-3">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Assigned Department:</label>
                <input
                  type="text"
                  value={assignedDepartment}
                  onChange={e => setAssignedDepartment(e.target.value)}
                  className="w-full p-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                  placeholder="e.g. Bridge Inspection Unit"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Nominated Duty Officer:</label>
                <input
                  type="text"
                  value={assignedOfficer}
                  onChange={e => setAssignedOfficer(e.target.value)}
                  className="w-full p-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                  placeholder="e.g. Ing. Samuel Mensah"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Internal Directive / Notes:</label>
                <textarea
                  rows={2}
                  value={assignNotes}
                  onChange={e => setAssignNotes(e.target.value)}
                  className="w-full p-2 bg-slate-800 border border-slate-700 rounded-xl text-white resize-none"
                  placeholder="Internal instructions for the assigned team..."
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setAssigningPost(null)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-xl shadow-md"
                >
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clarification Request Modal */}
      {clarifyingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-md w-full space-y-4 text-xs">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-blue-400" /> Request Citizen Clarification
            </h3>
            <p className="text-slate-400">
              Send an official inquiry regarding <strong className="text-white">"{clarifyingPost.title}"</strong>.
            </p>
            <form onSubmit={handleClarifySubmit} className="space-y-3">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Question for Citizen Reporter:</label>
                <textarea
                  rows={3}
                  value={clarifyQuestion}
                  onChange={e => setClarifyQuestion(e.target.value)}
                  className="w-full p-2 bg-slate-800 border border-slate-700 rounded-xl text-white resize-none"
                  placeholder="e.g. Could you confirm if the road is currently completely blocked or partially passable?"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setClarifyingPost(null)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!clarifyQuestion.trim()}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-md disabled:opacity-50"
                >
                  Dispatch Clarification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Comprehensive Civic Post Report Pack Modal for State Institutions */}
      <CivicPostReportModal
        post={selectedReportPost}
        isOpen={!!selectedReportPost}
        onClose={() => setSelectedReportPost(null)}
        currentInstitution={currentInstitution}
        onOpenResponseModal={(p) => {
          setSelectedReportPost(null);
          onOpenResponseModal(p);
        }}
        onSelectPost={(p) => {
          setSelectedReportPost(null);
          if (onSelectPost) onSelectPost(p);
        }}
        onAcknowledgeAlert={async (postId) => {
          await handleQuickAcknowledge(postId);
        }}
        isAcknowledging={actionLoading === `ack-${selectedReportPost?.id}`}
      />
    </div>
  );
};
