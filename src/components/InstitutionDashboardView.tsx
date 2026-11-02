import React, { useState, useEffect, useCallback } from 'react';
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
  ChevronUp,
  ArrowRight,
  Layers,
  MapPin,
  TrendingUp,
  UserCheck,
  HelpCircle,
  FolderCheck,
  GitPullRequest,
  Plus,
  Trash2,
  Phone,
  Download,
  FileCheck,
  Inbox,
  Megaphone
} from 'lucide-react';
import {
  Institution,
  CivicPost,
  InstitutionResponse,
  CivicSituation,
  InstitutionalInboxItem,
  InstitutionalAnnouncement,
  InstitutionalDesk,
  InstitutionTeamMember
} from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { CivicPostReportModal } from './CivicPostReportModal';
import { InstitutionalInboxView } from './institution/InstitutionalInboxView';
import { SituationsDeskView } from './institution/SituationsDeskView';
import { AnnouncementsDeskView } from './institution/AnnouncementsDeskView';
import { HierarchyDesksView } from './institution/HierarchyDesksView';
import { CoordinationDeskView } from './institution/CoordinationDeskView';
import { SituationDossierModal } from './institution/SituationDossierModal';
import { AnnouncementComposerModal } from './institution/AnnouncementComposerModal';
import { ConsoleLayout, type ConsoleNavSection, SearchInput, Select, useToast } from './ui';

export type InstitutionTab =
  | 'overview'
  | 'inbox'
  | 'situations'
  | 'announcements'
  | 'desks'
  | 'coordination'
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
  const { currentUser, userRole } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedReportPost, setSelectedReportPost] = useState<CivicPost | null>(null);
  const toast = useToast();

  // Quick Assignment Modal State
  const [assigningPost, setAssigningPost] = useState<CivicPost | null>(null);
  const [assignedDepartment, setAssignedDepartment] = useState('Rapid Technical Unit');
  const [assignedOfficer, setAssignedOfficer] = useState('Duty Senior Inspector');
  const [assignNotes, setAssignNotes] = useState('');

  // Clarification Modal State
  const [clarifyingPost, setClarifyingPost] = useState<CivicPost | null>(null);
  const [clarifyQuestion, setClarifyQuestion] = useState('');

  // Institutional Monolith State: Inbox, Situations, Announcements, Desks, Team
  const [inboxItems, setInboxItems] = useState<InstitutionalInboxItem[]>([]);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [situations, setSituations] = useState<CivicSituation[]>([]);
  const [situationsLoading, setSituationsLoading] = useState(false);
  const [announcements, setAnnouncements] = useState<InstitutionalAnnouncement[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);
  const [desks, setDesks] = useState<InstitutionalDesk[]>([]);
  const [team, setTeam] = useState<InstitutionTeamMember[]>([]);

  // Modals for Situations and Announcements
  const [selectedSituationId, setSelectedSituationId] = useState<string | null>(null);
  const [isSituationDossierOpen, setIsSituationDossierOpen] = useState(false);
  const [isAnnouncementComposerOpen, setIsAnnouncementComposerOpen] = useState(false);
  const [composerLinkedSituation, setComposerLinkedSituation] = useState<CivicSituation | null>(null);

  const currentInstitution = institutions.find(i => i.id === selectedInstitutionId) || institutions[0];

  // A verified rep is bound to one institution; pin the console to it so oversight
  // of other institutions is never shown by default (or by stale selection).
  useEffect(() => {
    const affiliated = currentUser?.institutionId || currentUser?.institution_id;
    if (!affiliated || userRole !== 'institution_rep') return;
    if (affiliated !== selectedInstitutionId) {
      setSelectedInstitutionId(affiliated);
    }
  }, [currentUser?.institutionId, currentUser?.institution_id, userRole, selectedInstitutionId, setSelectedInstitutionId]);

  // Data fetchers
  const loadInbox = useCallback(async () => {
    if (!currentInstitution) return;
    setInboxLoading(true);
    try {
      const res = await api.getInstitutionInbox(currentInstitution.id);
      setInboxItems(res.items || []);
    } catch (e) {
      console.error('Failed to load inbox:', e);
    } finally {
      setInboxLoading(false);
    }
  }, [currentInstitution]);

  const loadSituations = useCallback(async () => {
    setSituationsLoading(true);
    try {
      const res = await api.getCivicSituations();
      setSituations(res.items || []);
    } catch (e) {
      console.error('Failed to load situations:', e);
    } finally {
      setSituationsLoading(false);
    }
  }, []);

  const loadAnnouncements = useCallback(async () => {
    if (!currentInstitution) return;
    setAnnouncementsLoading(true);
    try {
      const res = await api.getInstitutionAnnouncements(currentInstitution.id);
      setAnnouncements(res.items || []);
    } catch (e) {
      console.error('Failed to load announcements:', e);
    } finally {
      setAnnouncementsLoading(false);
    }
  }, [currentInstitution]);

  const loadDesksAndTeam = useCallback(async () => {
    if (!currentInstitution) return;
    try {
      const [desksRes, teamRes] = await Promise.all([
        api.getInstitutionDesks(currentInstitution.id),
        api.getInstitutionTeam(currentInstitution.id)
      ]);
      setDesks(Array.isArray(desksRes) ? desksRes : []);
      setTeam(Array.isArray(teamRes) ? teamRes : []);
    } catch (e) {
      console.error('Failed to load desks and team:', e);
    }
  }, [currentInstitution]);

  useEffect(() => {
    loadInbox();
    loadSituations();
    loadAnnouncements();
    loadDesksAndTeam();
  }, [loadInbox, loadSituations, loadAnnouncements, loadDesksAndTeam]);

  const handleTransitionInboxItem = async (itemId: string, newState: string) => {
    if (!currentInstitution) return;
    try {
      await api.transitionInboxItem(currentInstitution.id, itemId, newState);
      await loadInbox();
    } catch (e) {
      console.error('Failed to transition inbox item:', e);
    }
  };

  const handleAssignInboxItem = async (itemId: string, payload: { officerUserId?: string; deskId?: string; notes?: string }) => {
    if (!currentInstitution) return;
    await api.assignInboxItem(currentInstitution.id, itemId, payload);
    await Promise.all([loadInbox(), loadDesksAndTeam()]);
  };

  const handleHandoffInboxItem = async (itemId: string, payload: { toDeskId: string; reason: string; instructions?: string; ccDeskIds?: string[] }) => {
    if (!currentInstitution) return;
    await api.handoffToDesk(currentInstitution.id, { inboxItemId: itemId, ...payload });
    await Promise.all([loadInbox(), loadDesksAndTeam()]);
  };

  const handleEscalateInboxItem = async (itemId: string, payload: { reason?: string; toDeskId?: string }) => {
    if (!currentInstitution) return;
    await api.escalateInboxItem(currentInstitution.id, itemId, payload);
    await Promise.all([loadInbox(), loadDesksAndTeam()]);
  };

  const handleOpenSituationDossier = (situationId: string) => {
    setSelectedSituationId(situationId);
    setIsSituationDossierOpen(true);
  };

  const handleOpenAnnouncementComposer = (situation?: CivicSituation | null) => {
    setComposerLinkedSituation(situation || null);
    setIsAnnouncementComposerOpen(true);
  };

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

  const pendingInboxCount = inboxItems.filter(i => i.actionState === 'NEW' || i.actionState === 'SEEN' || i.actionState === 'UNDER_REVIEW').length;
  const activeSituationsCount = situations.filter(s => s.status === 'ACTIVE_MONITORING' || s.status === 'INTERVENTION_IN_PROGRESS' || s.status === 'REPORTED' || s.status === 'VERIFYING').length;

  const getTabLabel = (tab: InstitutionTab) => {
    switch (tab) {
      case 'overview': return 'Command & Geo Desk';
      case 'inbox': return 'Awareness Queue & Signals';
      case 'situations': return 'Civic Situation Dossiers';
      case 'announcements': return 'Official Communiqués';
      case 'desks': return 'Hierarchy & Routing Desks';
      case 'coordination': return 'Coordination & Delegations';
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

  const navSections: ConsoleNavSection<InstitutionTab>[] = [
    {
      label: 'Command & Desks',
      items: [
        { id: 'overview', label: 'Command & Geo Desk', icon: <Activity className="w-4 h-4" /> },
        { id: 'inbox', label: 'Awareness Queue', icon: <Inbox className="w-4 h-4" />, badge: pendingInboxCount },
        { id: 'situations', label: 'Situation Dossiers', icon: <Radio className="w-4 h-4 text-emerald-400" />, badge: activeSituationsCount },
        { id: 'announcements', label: 'Communiqués', icon: <Megaphone className="w-4 h-4 text-amber-400" />, badge: announcements.length },
        { id: 'desks', label: 'Desks & Hierarchy', icon: <Building2 className="w-4 h-4 text-blue-400" />, badge: desks.length },
        { id: 'coordination', label: 'Coordination & Delegations', icon: <GitPullRequest className="w-4 h-4 text-rose-400" /> }
      ]
    },
    {
      label: 'Citizen Issue Queues',
      items: [
        { id: 'new_awareness', label: 'New Awareness', icon: <FileText className="w-4 h-4" />, badge: newAwarenessPosts.length },
        { id: 'urgent', label: 'Urgent / Crisis Desk', icon: <Flame className="w-4 h-4 text-red-400" />, badge: urgentPosts.length },
        { id: 'trending', label: 'Trending / Viral', icon: <TrendingUp className="w-4 h-4 text-amber-400" />, badge: trendingPosts.length },
        { id: 'assigned', label: 'Assigned Internally', icon: <UserCheck className="w-4 h-4 text-emerald-400" />, badge: assignedPosts.length },
        { id: 'under_review', label: 'Under Assessment', icon: <Clock className="w-4 h-4 text-blue-400" />, badge: underReviewPosts.length },
        { id: 'responses', label: 'Responded Statements', icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />, badge: answeredPosts.length },
        { id: 'action_reported', label: 'Action Reported', icon: <GitPullRequest className="w-4 h-4 text-amber-300" />, badge: actionReportedPosts.length },
        { id: 'citizen_followup', label: 'Citizen Evidence', icon: <MessageSquare className="w-4 h-4 text-purple-400" />, badge: citizenFollowupPosts.length },
        { id: 'closed', label: 'Closed / Resolved', icon: <FolderCheck className="w-4 h-4 text-slate-400" />, badge: closedPosts.length }
      ]
    },
    {
      items: [{ id: 'config', label: 'Agency & Dispatch Config', icon: <Settings className="w-4 h-4" /> }]
    }
  ];

  const handleQuickAcknowledge = async (postId: string) => {
    setActionLoading(`ack-${postId}`);
    try {
      await api.triggerAlert(postId, currentInstitution.id);
      await api.updatePostStatus(postId, 'UNDER_REVIEW');
      onPostUpdated();
      toast.success('Report acknowledged', 'The citizen submission is now marked under review.');
    } catch (err: any) {
      toast.error('Failed to acknowledge report', err?.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleStatusChange = async (postId: string, newStatus: string) => {
    setActionLoading(`status-${postId}`);
    try {
      await api.updatePostStatus(postId, newStatus);
      onPostUpdated();
      toast.success('Status updated', `Report moved to ${newStatus.replace(/_/g, ' ').toLowerCase()}.`);
    } catch (err: any) {
      toast.error('Failed to change status', err?.message);
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
      toast.success('Report assigned', `${assignedDepartment} has been notified of the assignment.`);
    } catch (err: any) {
      toast.error('Failed to assign report', err?.message);
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
      toast.success('Clarification requested', 'The citizen has been asked for additional detail.');
    } catch (err: any) {
      toast.error('Failed to request clarification', err?.message);
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

              {/* Official Response & Communiqué Section if Responded */}
              {hasResponded && resp && (
                <div className="bg-slate-900/90 border border-amber-500/30 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-amber-400" />
                        Official State Communiqué
                      </span>
                      {resp.referenceNumber && (
                        <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono border border-slate-700">
                          {resp.referenceNumber}
                        </span>
                      )}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        resp.resolutionStatus === 'RESOLVED'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : resp.resolutionStatus === 'UNDER_REVIEW'
                          ? 'bg-blue-950 text-blue-300 border border-blue-800'
                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}>
                        {resp.resolutionStatus || 'IN_PROGRESS'}
                      </span>
                    </div>

                    <span className="text-[10px] text-slate-400">
                      {resp.responderName} ({resp.responderTitle || 'Spokesperson'})
                    </span>
                  </div>

                  {resp.statementTitle && (
                    <h4 className="text-xs font-bold text-white">{resp.statementTitle}</h4>
                  )}

                  <p className="text-xs text-slate-200 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 leading-relaxed">
                    "{resp.message || resp.fullStatement}"
                  </p>

                  {/* Summary Badges Bar for Communiqué Assets */}
                  <div className="flex items-center justify-between gap-2 flex-wrap pt-1 text-[11px]">
                    <div className="flex items-center gap-2 flex-wrap text-slate-400">
                      {Array.isArray(resp.actionTimeline) && resp.actionTimeline.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-emerald-400 font-medium">
                          <Clock className="w-3 h-3 text-emerald-400" />
                          {resp.actionTimeline.length} Milestones
                        </span>
                      )}
                      {resp.hotlines && resp.hotlines.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-amber-400 font-medium">
                          <Phone className="w-3 h-3 text-amber-400" />
                          {resp.hotlines.length} Hotlines
                        </span>
                      )}
                      {resp.documents && resp.documents.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-blue-400 font-medium">
                          <FileText className="w-3 h-3 text-blue-400" />
                          {resp.documents.length} Directives/PDFs
                        </span>
                      )}
                    </div>

                    {onViewOfficialResponse && (
                      <button
                        type="button"
                        onClick={() => onViewOfficialResponse(post, resp)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30 transition-colors cursor-pointer text-xs"
                      >
                        <span>View Full Communiqué</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              )}

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
                    <span>{hasResponded ? 'Edit Communiqué & Action Plan' : 'Respond Officially'}</span>
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
    <>
    <ConsoleLayout<InstitutionTab>
      brandTitle="STATE DESK PORTAL"
      brandSubtitle="Verified Authority Desk"
      brandIcon={<Building2 className="w-4 h-4 text-slate-950" />}
      accent="amber"
      sections={navSections}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      headerTitle={currentInstitution?.officialName || 'State Desk'}
      headerSubtitle={`${currentInstitution?.acronym || ''} • ${currentInstitution?.category || ''} • ${getTabLabel(activeTab)}`}
      footerNote={currentInstitution?.officialName}
      sidebarExtra={
        // A rep is bound to one agency; only oversight roles may switch accounts.
        userRole === 'institution_rep' ? (
          <div className="px-2">
            <label className="block text-[9px] text-slate-500 mb-1 uppercase font-bold tracking-wider">
              Signed in as
            </label>
            <div className="text-xs font-bold text-amber-300 truncate">
              {currentInstitution?.shortName} ({currentInstitution?.acronym})
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">Scope locked to your agency</p>
          </div>
        ) : (
          <div>
            <label className="block text-[9px] text-slate-400 mb-1 uppercase font-bold tracking-wider">
              Select Agency Account
            </label>
            <Select
              aria-label="Select agency account"
              value={currentInstitution?.id}
              onChange={(e) => setSelectedInstitutionId(e.target.value)}
              className="!text-amber-300 !font-bold"
            >
              {institutions.map((inst, idx) => (
                <option key={inst.id ? `${inst.id}-${idx}` : `inst-opt-${idx}`} value={inst.id}>
                  {inst.shortName} ({inst.acronym})
                </option>
              ))}
            </Select>
          </div>
        )
      }
    >
        {/* Global Search Bar for Tagged Queue */}
        {!['overview', 'inbox', 'situations', 'announcements', 'desks', 'config'].includes(activeTab) && (
          <SearchInput
            icon={<Search className="w-4 h-4" />}
            placeholder={`Filter ${getTabLabel(activeTab)} by keyword or district…`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
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

        {/* TAB: INBOX / AWARENESS QUEUE */}
        {activeTab === 'inbox' && (
          <InstitutionalInboxView
            items={inboxItems}
            loading={inboxLoading}
            onRefresh={loadInbox}
            onTransitionState={handleTransitionInboxItem}
            onSelectPost={(post) => setSelectedReportPost(post)}
            onOpenSituationDossier={handleOpenSituationDossier}
            desks={desks}
            team={team}
            onAssign={handleAssignInboxItem}
            onHandoff={handleHandoffInboxItem}
            onEscalate={handleEscalateInboxItem}
            onRespondToItem={(item) => {
              const post = posts.find(p => p.id === item.postId);
              if (post) onOpenResponseModal(post);
            }}
          />
        )}

        {/* TAB: CIVIC SITUATIONS DESK */}
        {activeTab === 'situations' && (
          <SituationsDeskView
            situations={situations}
            loading={situationsLoading}
            onRefresh={loadSituations}
            onSelectSituation={(sit) => handleOpenSituationDossier(sit.id)}
            currentInstitution={currentInstitution}
            onDraftAnnouncementForSituation={handleOpenAnnouncementComposer}
          />
        )}

        {/* TAB: OFFICIAL COMMUNIQUÉS & BULLETINS */}
        {activeTab === 'announcements' && (
          <AnnouncementsDeskView
            announcements={announcements}
            loading={announcementsLoading}
            onRefresh={loadAnnouncements}
            onOpenComposer={() => handleOpenAnnouncementComposer(null)}
            currentInstitution={currentInstitution}
          />
        )}

        {/* TAB: HIERARCHY & FUNCTIONAL DESKS */}
        {activeTab === 'desks' && (
          <HierarchyDesksView
            desks={desks}
            team={team}
            currentInstitution={currentInstitution}
            loading={false}
          />
        )}

        {activeTab === 'coordination' && (
          <CoordinationDeskView
            currentInstitution={currentInstitution}
            institutions={institutions}
            currentUser={currentUser}
            onSelectPost={(postId) => {
              const post = posts.find(p => p.id === postId);
              if (post) onSelectPost?.(post);
            }}
          />
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
    </ConsoleLayout>

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

      {/* Situation Dossier Modal */}
      <SituationDossierModal
        isOpen={isSituationDossierOpen}
        onClose={() => {
          setIsSituationDossierOpen(false);
          setSelectedSituationId(null);
        }}
        situationId={selectedSituationId}
        currentInstitution={currentInstitution}
        onSituationUpdated={() => {
          loadSituations();
          loadInbox();
        }}
        onOpenAnnouncementModal={(situation) => {
          setIsSituationDossierOpen(false);
          handleOpenAnnouncementComposer(situation);
        }}
        onOpenResponseModal={(post) => {
          setIsSituationDossierOpen(false);
          onOpenResponseModal(post);
        }}
      />

      {/* Announcement Composer Modal */}
      <AnnouncementComposerModal
        isOpen={isAnnouncementComposerOpen}
        onClose={() => {
          setIsAnnouncementComposerOpen(false);
          setComposerLinkedSituation(null);
        }}
        currentInstitution={currentInstitution}
        linkedSituation={composerLinkedSituation}
        onAnnouncementCreated={() => {
          loadAnnouncements();
          loadSituations();
        }}
      />
    </>
  );
};
