import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ShieldAlert,
  Users,
  FileText,
  AlertTriangle,
  Building2,
  Lock,
  Cpu,
  RefreshCw,
  Search,
  Plus,
  RotateCcw,
  Activity,
  ShieldCheck,
  UserCheck,
  Clock,
  GitPullRequest,
  ArrowRight,
  CheckCircle2,
  Mail,
  Inbox,
  Pencil,
  Check,
  X
} from 'lucide-react';
import { api } from '../services/api';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  ConsoleLayout,
  DataTable,
  EmptyState,
  Field,
  Input,
  Modal,
  QueueItemCard,
  SearchInput,
  SectionHeader,
  SegmentedControl,
  Select,
  StatCard,
  StatusBadge,
  TableRow,
  TableSkeleton,
  Td,
  Th,
  Tile,
  useToast,
  type ConsoleNavSection
} from './ui';
import {
  getAbuseReportMeta,
  getJobMeta,
  getModerationMeta,
  getPriorityMeta,
  getRoleMeta
} from '../utils/status';
import type { CoordinationQueueItem } from '../types';

type AdminTab = 'overview' | 'content' | 'reports' | 'users' | 'institutions' | 'coordination' | 'privacy' | 'system';

interface PendingAction {
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  tone: 'danger' | 'primary' | 'success';
  confirmPhrase?: string;
  reasonLabel?: string;
  reasonRequired?: boolean;
  run: (reason?: string) => Promise<void>;
}

const TAB_META: Record<AdminTab, { title: string; subtitle: string }> = {
  overview: { title: 'Command Center', subtitle: 'Live platform health, triage backlog and subsystem readiness at a glance.' },
  content: { title: 'Civic Content & Report Moderation', subtitle: 'Review, approve, hold or remove citizen submissions.' },
  reports: { title: 'Citizen Abuse & Flagging Review Queue', subtitle: 'Triage abuse complaints raised against content and users.' },
  users: { title: 'User Accounts & Access Management', subtitle: 'Elevate roles, verify identities and control platform access.' },
  institutions: { title: 'State Agencies & Alert Channel Configuration', subtitle: 'Register agencies, inspect desks and configure dispatch channels.' },
  coordination: { title: 'Operations Queue', subtitle: 'One severity-ranked triage feed across every institution, desk and case.' },
  privacy: { title: 'P³RE Privacy Engine Policy & Audit', subtitle: 'Privacy-preserving representation policy and storage posture.' },
  system: { title: 'Job Queue, Alerts & Audit', subtitle: 'Retry background jobs, re-dispatch failed alerts and inspect the audit trail.' }
};

export const AdminDashboardView: React.FC = () => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);

  const [overview, setOverview] = useState<any>(null);

  const [users, setUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');

  const [adminPosts, setAdminPosts] = useState<any[]>([]);
  const [postSearch, setPostSearch] = useState('');
  const [moderationFilter, setModerationFilter] = useState('ALL');

  const [abuseReports, setAbuseReports] = useState<any[]>([]);
  const [reportStatusFilter, setReportStatusFilter] = useState('ALL');

  const [jobs, setJobs] = useState<any[]>([]);
  const [jobStatusFilter, setJobStatusFilter] = useState('ALL');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditTrail, setAuditTrail] = useState<any[]>([]);
  const [auditTrailTypes, setAuditTrailTypes] = useState<string[]>([]);
  const [auditEventFilter, setAuditEventFilter] = useState('ALL');

  const [coordination, setCoordination] = useState<any>(null);
  const [queue, setQueue] = useState<{ items: CoordinationQueueItem[]; summary: any; totalCount: number } | null>(null);
  const [queueSeverity, setQueueSeverity] = useState('ALL');
  const [queueSource, setQueueSource] = useState('ALL');
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [privacy, setPrivacy] = useState<any>(null);
  const [failedAlerts, setFailedAlerts] = useState<{ items: any[]; summary: { failed: number; notConfigured: number; total: number } } | null>(null);
  const [jointCases, setJointCases] = useState<any[]>([]);
  const [hierarchy, setHierarchy] = useState<any>(null);
  const [hierarchyInst, setHierarchyInst] = useState<any>(null);
  const [hierarchyLoading, setHierarchyLoading] = useState(false);

  const [showInstModal, setShowInstModal] = useState(false);
  const [showCoordModal, setShowCoordModal] = useState(false);
  const [coordForm, setCoordForm] = useState({
    toInstitutionId: '',
    delegationType: 'ESCALATION',
    priority: 'URGENT',
    reason: '',
    instructions: '',
    postId: ''
  });
  const [showCaseModal, setShowCaseModal] = useState(false);
  const [caseForm, setCaseForm] = useState({
    title: '',
    leadInstitutionId: '',
    summary: '',
    priority: 'ELEVATED',
    region: '',
    district: '',
    postId: '',
    participants: [] as string[]
  });
  const [instForm, setInstForm] = useState({
    id: '',
    officialName: '',
    shortName: '',
    acronym: '',
    mandate: '',
    category: 'GOVERNMENT',
    jurisdiction: 'NATIONAL',
    alertMethod: 'OFFICIAL_EMAIL',
    officialWebsite: '',
    emailChannels: '',
    whatsappChannels: ''
  });

  const loadOverview = useCallback(async () => {
    try {
      setOverview(await api.getAdminOverview());
    } catch (err) {
      console.error('Failed to load admin overview:', err);
    }
  }, []);

  const loadTabData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'overview') {
        const [ov, q] = await Promise.all([
          api.getAdminOverview(),
          api.getAdminCoordinationQueue({ limit: 6 })
        ]);
        setOverview(ov);
        setQueue(q);
      } else if (activeTab === 'users') {
        setUsers(await api.getAdminUsers({ search: userSearch, role: userRoleFilter }));
      } else if (activeTab === 'content') {
        setAdminPosts(await api.getAdminPosts({ search: postSearch, moderationStatus: moderationFilter }));
      } else if (activeTab === 'reports') {
        setAbuseReports(await api.getAdminAbuseReports(reportStatusFilter));
      } else if (activeTab === 'coordination') {
        const [coord, cases, q] = await Promise.all([
          api.getAdminCoordination(),
          api.getAdminJointCases({ limit: 50 }),
          api.getAdminCoordinationQueue({ severity: queueSeverity, source: queueSource, limit: 100 })
        ]);
        setCoordination(coord);
        setJointCases(cases.items || []);
        setQueue(q);
      } else if (activeTab === 'institutions') {
        setInstitutions(await api.getInstitutions());
      } else if (activeTab === 'privacy') {
        setPrivacy(await api.getAdminPrivacy());
      } else if (activeTab === 'system') {
        const [j, logs, alerts, trail] = await Promise.all([
          api.getAdminJobs(jobStatusFilter),
          api.getAdminAuditLogs(),
          api.getAdminFailedAlerts(),
          api.getAdminAuditTrail({ limit: 150, eventType: auditEventFilter })
        ]);
        setJobs(j);
        setAuditLogs(logs);
        setFailedAlerts(alerts);
        setAuditTrail(trail.items || []);
        setAuditTrailTypes(trail.eventTypes || []);
      }
    } catch (err: any) {
      console.error(`Failed to load tab data for ${activeTab}:`, err);
      toast.error('Could not load data', err?.message || 'The server did not respond as expected.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, userSearch, userRoleFilter, postSearch, moderationFilter, reportStatusFilter, jobStatusFilter, auditEventFilter, queueSeverity, queueSource, loadOverview, toast]);

  useEffect(() => {
    loadTabData();
  }, [loadTabData]);

  /* ----------------------------- actions ----------------------------- */

  const handleRunSlaSweep = async () => {
    setActionLoading('sla-sweep');
    try {
      const r = await api.runSlaSweep();
      toast.success(
        'SLA sweep complete',
        `${r.overdueItems} overdue · ${r.warningItems} approaching · ${r.escalatedDelegations} delegations and ${r.ladderEscalations ?? 0} work items escalated · ${r.notified} officials notified.`
      );
      await loadTabData();
    } catch (err: any) {
      toast.error('SLA sweep failed', err?.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUserRoleChange = (userId: string, newRole: string, currentRole: string) => {
    const user = users.find((u) => u.id === userId);
    setPending({
      title: 'Change user role',
      tone: newRole === 'ADMIN' ? 'danger' : 'primary',
      confirmLabel: `Set to ${newRole}`,
      reasonLabel: 'Reason for this role change',
      reasonRequired: true,
      message: (
        <>
          Change <span className="font-semibold text-white">{user?.name || userId}</span> from{' '}
          <span className="font-semibold text-white">{currentRole}</span> to{' '}
          <span className="font-semibold text-white">{newRole}</span>?
          {newRole === 'ADMIN' && (
            <span className="block mt-2 text-red-300">
              Administrators hold full platform authority. Grant this only to vetted staff.
            </span>
          )}
        </>
      ),
      run: async (reason) => {
        setActionLoading(`user-role-${userId}`);
        try {
          const res = await api.updateUserRole(userId, newRole, reason);
          setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
          toast.success('Role updated', `${user?.name || 'User'} is now ${newRole}.${res?.reasonRecorded ? ' Reason recorded.' : ''}`);
        } catch (err: any) {
          toast.error('Failed to update role', err?.message);
        } finally {
          setActionLoading(null);
        }
      }
    });
  };

  const handleUserVerifyToggle = async (userId: string, currentStatus: boolean) => {
    setActionLoading(`user-verify-${userId}`);
    try {
      await api.updateUserVerification(userId, !currentStatus);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_verified: !currentStatus ? 1 : 0 } : u)));
      toast.success(!currentStatus ? 'User verified' : 'Verification removed');
    } catch (err: any) {
      toast.error('Failed to update verification', err?.message);
    } finally {
      setActionLoading(null);
    }
  };

  const runPostModeration = async (postId: string, modStatus: string, lifecycleStatus: string | undefined, reason?: string) => {
    setActionLoading(`post-mod-${postId}`);
    try {
      const res = await api.updatePostModeration(postId, { moderationStatus: modStatus, reportLifecycleStatus: lifecycleStatus, reason });
      setAdminPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, moderation_status: modStatus, report_lifecycle_status: lifecycleStatus || p.report_lifecycle_status } : p
        )
      );
      toast.success(`Report ${getModerationMeta(modStatus).label.toLowerCase()}`, res?.reasonRecorded ? 'Reason recorded in the audit trail.' : undefined);
    } catch (err: any) {
      toast.error('Failed to update moderation', err?.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePostModeration = (post: any, modStatus: string, lifecycleStatus?: string) => {
    if (modStatus === 'removed' || modStatus === 'held') {
      setPending({
        title: modStatus === 'removed' ? 'Remove this report' : 'Hold this report',
        tone: modStatus === 'removed' ? 'danger' : 'primary',
        confirmLabel: modStatus === 'removed' ? 'Remove report' : 'Hold for review',
        reasonLabel: 'Reason (recorded in audit trail)',
        reasonRequired: true,
        message: (
          <>
            <span className="font-semibold text-white">{post.title}</span> by {post.author_name} will be{' '}
            {modStatus === 'removed' ? 'removed from public view' : 'held for moderation review'}.
          </>
        ),
        run: (reason) => runPostModeration(post.id, modStatus, lifecycleStatus, reason)
      });
    } else {
      runPostModeration(post.id, modStatus, lifecycleStatus);
    }
  };

  const resolveAbuseReport = async (rep: any, status: 'RESOLVED' | 'DISMISSED', reason?: string): Promise<void> => {
    setActionLoading(`report-${rep.id}`);
    try {
      const res = await api.updateAbuseReport(rep.id, status, reason);
      setAbuseReports((prev) => prev.map((r) => (r.id === rep.id ? { ...r, status } : r)));
      toast.success(status === 'RESOLVED' ? 'Complaint resolved' : 'Complaint dismissed', res?.reasonRecorded ? 'Reason recorded in the audit trail.' : undefined);
    } catch (err: any) {
      toast.error('Failed to update complaint', err?.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAbuseReportAction = (rep: any, status: 'RESOLVED' | 'DISMISSED') => {
    setPending({
      title: status === 'RESOLVED' ? 'Action and resolve complaint' : 'Dismiss complaint',
      tone: status === 'RESOLVED' ? 'success' : 'primary',
      confirmLabel: status === 'RESOLVED' ? 'Confirm action taken' : 'Dismiss',
      reasonLabel: status === 'RESOLVED' ? 'Action taken' : 'Reason for dismissal',
      reasonRequired: true,
      message: (
        <>
          {status === 'RESOLVED' ? 'Mark the complaint against ' : 'Dismiss the complaint against '}
          <span className="font-semibold text-white">{rep.post_title || rep.post_id}</span>
          {status === 'RESOLVED' ? ' as resolved after taking moderation action.' : ' as unfounded.'}
        </>
      ),
      run: (reason) => resolveAbuseReport(rep, status, reason)
    });
  };

  const handleDelegationTransition = async (delegation: any, status: 'ACCEPTED' | 'DECLINED' | 'CANCELLED', note?: string) => {
    setActionLoading(`delegation-${delegation.id}`);
    try {
      await api.transitionDelegation(delegation.id, status, note);
      toast.success(
        status === 'ACCEPTED' ? 'Delegation accepted' : status === 'DECLINED' ? 'Delegation declined' : 'Delegation cancelled',
        note ? 'Note recorded on the delegation.' : undefined
      );
      await loadTabData();
    } catch (err: any) {
      toast.error('Failed to update delegation', err?.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelegationAction = (delegation: any, status: 'ACCEPTED' | 'DECLINED' | 'CANCELLED') => {
    setPending({
      title:
        status === 'ACCEPTED' ? 'Accept delegation'
        : status === 'DECLINED' ? 'Decline delegation'
        : 'Cancel delegation',
      tone: status === 'ACCEPTED' ? 'success' : status === 'DECLINED' ? 'danger' : 'primary',
      confirmLabel:
        status === 'ACCEPTED' ? 'Accept on behalf of desk'
        : status === 'DECLINED' ? 'Decline delegation'
        : 'Cancel delegation',
      reasonLabel: status === 'ACCEPTED' ? 'Acceptance note (optional)' : 'Reason (recorded on the delegation)',
      reasonRequired: status !== 'ACCEPTED',
      message: (
        <>
          {status === 'ACCEPTED' ? 'Accept the transfer of ' : status === 'DECLINED' ? 'Decline the transfer of ' : 'Cancel the transfer of '}
          <span className="font-semibold text-white">{delegation.postTitle || 'this work item'}</span> from{' '}
          {delegation.fromInstitutionName || 'external'} to{' '}
          <span className="font-semibold text-white">{delegation.toInstitutionName}</span> as oversight.
        </>
      ),
      run: (reason) => handleDelegationTransition(delegation, status, reason)
    });
  };

  const handleRetryJob = async (jobId: string) => {
    setActionLoading(`job-${jobId}`);
    try {
      await api.retryAdminJob(jobId);
      setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, status: 'QUEUED', attempts: 0 } : j)));
      toast.success('Job re-queued', 'The background job will be retried by the worker.');
    } catch (err: any) {
      toast.error('Failed to retry job', err?.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRedispatchAlert = async (tagId: string) => {
    setActionLoading(`alert-${tagId}`);
    try {
      const res = await api.redispatchAdminAlert(tagId);
      const delivered = res.status === 'DELIVERED' || res.status === 'SENT';
      if (delivered) {
        toast.success('Alert re-dispatched', `Delivery status is now ${res.status}.`);
      } else {
        toast.error('Re-dispatch did not succeed', res.errorMessage || `Delivery status is ${res.status}.`);
      }
      const alerts = await api.getAdminFailedAlerts();
      setFailedAlerts(alerts);
      if (activeTab === 'overview') await loadOverview();
    } catch (err: any) {
      toast.error('Failed to re-dispatch alert', err?.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolveJointCase = (caseRow: any) => {
    setPending({
      title: 'Resolve joint case',
      tone: 'success',
      confirmLabel: 'Record resolution',
      reasonLabel: 'Resolution summary (visible to all participants and the reporter)',
      reasonRequired: true,
      message: (
        <>
          Record the outcome for the joint case{' '}
          <span className="font-semibold text-white">{caseRow.title}</span>. All participants and the original reporter
          will be notified, and the linked report will be marked resolved.
        </>
      ),
      run: async (reason) => {
        setActionLoading(`case-${caseRow.id}`);
        try {
          await api.resolveAdminJointCase(caseRow.id, reason || 'Resolved', false);
          toast.success('Joint case resolved', 'Participants and the reporter have been notified.');
          await loadTabData();
        } catch (err: any) {
          toast.error('Failed to resolve joint case', err?.message);
        } finally {
          setActionLoading(null);
        }
      }
    });
  };

  const handleCreateCoordinationAction = async () => {
    if (!coordForm.toInstitutionId || !coordForm.reason.trim()) {
      toast.error('Missing information', 'A target institution and reason are required.');
      return;
    }
    setActionLoading('coord-create');
    try {
      await api.createAdminCoordinationAction({
        toInstitutionId: coordForm.toInstitutionId,
        delegationType: coordForm.delegationType,
        priority: coordForm.priority,
        reason: coordForm.reason.trim(),
        instructions: coordForm.instructions.trim() || undefined,
        postId: coordForm.postId.trim() || undefined
      });
      toast.success('Coordination action created', 'The receiving institution has been alerted.');
      setShowCoordModal(false);
      setCoordForm({ toInstitutionId: '', delegationType: 'ESCALATION', priority: 'URGENT', reason: '', instructions: '', postId: '' });
      await loadTabData();
    } catch (err: any) {
      toast.error('Failed to create coordination action', err?.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateJointCase = async () => {
    if (!caseForm.title.trim() || !caseForm.leadInstitutionId) {
      toast.error('Missing information', 'A case title and lead institution are required.');
      return;
    }
    setActionLoading('case-create');
    try {
      await api.createAdminJointCase({
        title: caseForm.title.trim(),
        leadInstitutionId: caseForm.leadInstitutionId,
        summary: caseForm.summary.trim() || undefined,
        priority: caseForm.priority,
        region: caseForm.region.trim() || undefined,
        district: caseForm.district.trim() || undefined,
        postId: caseForm.postId.trim() || undefined,
        participants: caseForm.participants.map((institutionId) => ({ institutionId, role: 'SUPPORTING' }))
      });
      toast.success('Joint case opened', 'All participating institutions have been notified and assigned an action.');
      setShowCaseModal(false);
      setCaseForm({ title: '', leadInstitutionId: '', summary: '', priority: 'ELEVATED', region: '', district: '', postId: '', participants: [] });
      await loadTabData();
    } catch (err: any) {
      toast.error('Failed to open joint case', err?.message);
    } finally {
      setActionLoading(null);
    }
  };

  /* ------------------- unified operations queue actions ------------------- */

  const refreshQueue = async () => {
    try {
      const q = await api.getAdminCoordinationQueue({ severity: queueSeverity, source: queueSource, limit: 100 });
      setQueue(q);
    } catch (err: any) {
      toast.error('Failed to refresh queue', err?.message);
    }
  };

  const handleQueueAccept = (item: CoordinationQueueItem) => {
    if (item.source !== 'DELEGATION') return;
    const delegationId = item.id.replace('delegation:', '');
    handleDelegationAction(
      { id: delegationId, postTitle: item.title, toInstitutionName: item.institutionName, fromInstitutionName: item.meta?.fromInstitutionName },
      'ACCEPTED'
    );
  };

  const handleQueueDecline = (item: CoordinationQueueItem) => {
    if (item.source !== 'DELEGATION') return;
    const delegationId = item.id.replace('delegation:', '');
    handleDelegationAction(
      { id: delegationId, postTitle: item.title, toInstitutionName: item.institutionName, fromInstitutionName: item.meta?.fromInstitutionName },
      'DECLINED'
    );
  };

  const handleQueueResolve = (item: CoordinationQueueItem) => {
    if (item.source === 'JOINT_CASE' && item.caseId) {
      handleResolveJointCase({ id: item.caseId, title: item.title });
    } else if (item.source === 'INBOX_ITEM') {
      toast.info('Resolve from the institution desk', 'Open the agency structure to close this work item with a recorded outcome.');
    }
  };

  const handleQueueRedispatch = (item: CoordinationQueueItem) => {
    const tagId = item.meta?.tagId || item.id.replace('alert:', '');
    handleRedispatchAlert(tagId);
  };

  const handleQueueReview = (item: CoordinationQueueItem) => {
    if (item.source === 'ABUSE_REPORT') setActiveTab('reports');
    else if (item.source === 'MODERATION') setActiveTab('content');
  };

  const handleQueueEscalate = (item: CoordinationQueueItem) => {
    setCoordForm({
      toInstitutionId: '',
      delegationType: 'ESCALATION',
      priority: item.severity === 'BREACHED' ? 'EMERGENCY' : 'URGENT',
      reason: '',
      instructions: `Escalated from operations queue: ${item.title}`,
      postId: item.postId || ''
    });
    setShowCoordModal(true);
  };

  const resetInstForm = () => setInstForm({
    id: '', officialName: '', shortName: '', acronym: '', mandate: '',
    category: 'GOVERNMENT', jurisdiction: 'NATIONAL', alertMethod: 'OFFICIAL_EMAIL',
    officialWebsite: '', emailChannels: '', whatsappChannels: ''
  });

  const openInstitutionModal = (inst?: any) => {
    if (inst) {
      setInstForm({
        id: inst.id,
        officialName: inst.officialName || '',
        shortName: inst.shortName || '',
        acronym: inst.acronym || '',
        mandate: inst.mandate || '',
        category: inst.category || 'GOVERNMENT',
        jurisdiction: inst.jurisdiction || 'NATIONAL',
        alertMethod: inst.alertMethod || 'OFFICIAL_EMAIL',
        officialWebsite: inst.website || '',
        emailChannels: (inst.emailChannels || []).join(', '),
        whatsappChannels: (inst.whatsappChannels || []).join(', ')
      });
    } else {
      resetInstForm();
    }
    setShowInstModal(true);
  };

  const openHierarchy = async (inst: any) => {
    setHierarchyInst(inst);
    setHierarchy(null);
    setHierarchyLoading(true);
    try {
      setHierarchy(await api.getAdminInstitutionHierarchy(inst.id));
    } catch (err: any) {
      toast.error('Failed to load institution structure', err?.message);
      setHierarchyInst(null);
    } finally {
      setHierarchyLoading(false);
    }
  };

  const handleSaveInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading('save-inst');
    try {
      const toList = (v: string) => v.split(',').map((s) => s.trim()).filter(Boolean);
      await api.manageInstitution({
        ...instForm,
        officialWebsite: instForm.officialWebsite.trim() || undefined,
        emailChannels: toList(instForm.emailChannels),
        whatsappChannels: toList(instForm.whatsappChannels)
      });
      setShowInstModal(false);
      resetInstForm();
      await loadTabData();
      toast.success('Agency saved', `${instForm.officialName} dispatch configuration updated.`);
    } catch (err: any) {
      toast.error('Failed to save agency', err?.message);
    } finally {
      setActionLoading(null);
    }
  };

  const runPending = async (reason?: string) => {
    if (!pending) return;
    const action = pending;
    setPending(null);
    await action.run(reason);
  };

  /* ----------------------------- nav ----------------------------- */

  const queueBacklog = overview?.coordinationQueue
    ? (overview.coordinationQueue.BREACHED || 0) + (overview.coordinationQueue.URGENT || 0)
    : undefined;

  const navSections: ConsoleNavSection<AdminTab>[] = useMemo(
    () => [
      {
        label: 'Operations',
        items: [
          { id: 'overview', label: 'Command Center', icon: <Activity className="w-4 h-4" /> },
          {
            id: 'coordination',
            label: 'Operations Queue',
            icon: <GitPullRequest className="w-4 h-4" />,
            badge: queueBacklog || undefined,
            alert: !queueBacklog
          },
          { id: 'institutions', label: 'State Agencies', icon: <Building2 className="w-4 h-4" /> }
        ]
      },
      {
        label: 'Trust & Safety',
        items: [
          { id: 'content', label: 'Content Moderation', icon: <FileText className="w-4 h-4" />, badge: overview?.pendingAbuse },
          { id: 'reports', label: 'Abuse Complaints', icon: <AlertTriangle className="w-4 h-4" /> }
        ]
      },
      {
        label: 'Governance',
        items: [
          { id: 'users', label: 'Users & Access', icon: <Users className="w-4 h-4" /> },
          { id: 'privacy', label: 'P³RE Privacy Engine', icon: <Lock className="w-4 h-4" /> },
          { id: 'system', label: 'Jobs, Alerts & Audit', icon: <Cpu className="w-4 h-4" />, badge: overview?.failedAlerts }
        ]
      }
    ],
    [overview, queueBacklog]
  );

  const meta = TAB_META[activeTab];

  return (
    <>
      <ConsoleLayout<AdminTab>
        brandTitle="ADMIN CONSOLE"
        brandSubtitle="Ghana Civic Control Center"
        brandIcon={<ShieldAlert className="w-4 h-4 text-white" />}
        accent="purple"
        sections={navSections}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        headerTitle={meta.title}
        headerSubtitle={meta.subtitle}
        footerNote="Speak Up Web v1.0 Production"
        headerContent={
          overview?.systemHealth && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800 w-fit">
              <span
                className={`w-2 h-2 rounded-full ${
                  overview.systemHealth === 'HEALTHY'
                    ? 'bg-emerald-400 animate-pulse'
                    : overview.systemHealth === 'DEGRADED'
                    ? 'bg-red-400 animate-pulse'
                    : 'bg-amber-400 animate-pulse'
                }`}
              />
              <span className="text-[11px] font-semibold text-slate-300 whitespace-nowrap">
                {overview.systemHealth === 'HEALTHY' ? 'All systems nominal' : overview.systemHealth === 'DEGRADED' ? 'System degraded' : 'Attention required'}
              </span>
            </div>
          )
        }
        headerActions={
          <Button variant="secondary" onClick={loadTabData} loading={loading} icon={<RefreshCw className="w-3.5 h-3.5" />}>
            Refresh
          </Button>
        }
      >
        {activeTab === 'overview' && (
          <div className="space-y-5">
            {/* Triage backlog — the operational headline */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <StatCard
                label="Breached"
                value={overview?.coordinationQueue?.BREACHED || 0}
                hint="Past deadline"
                tone={(overview?.coordinationQueue?.BREACHED || 0) > 0 ? 'critical' : 'neutral'}
                icon={<AlertTriangle className="w-4 h-4" />}
                onClick={() => setActiveTab('coordination')}
              />
              <StatCard
                label="Urgent"
                value={overview?.coordinationQueue?.URGENT || 0}
                hint="Needs action now"
                tone={(overview?.coordinationQueue?.URGENT || 0) > 0 ? 'danger' : 'neutral'}
                icon={<ShieldAlert className="w-4 h-4" />}
                onClick={() => setActiveTab('coordination')}
              />
              <StatCard
                label="Due Soon"
                value={overview?.coordinationQueue?.DUE_SOON || 0}
                hint="Approaching deadline"
                tone={(overview?.coordinationQueue?.DUE_SOON || 0) > 0 ? 'warning' : 'neutral'}
                icon={<Clock className="w-4 h-4" />}
                onClick={() => setActiveTab('coordination')}
              />
              <StatCard
                label="Open Reports"
                value={overview?.openReports || 0}
                hint={`Across ${overview?.regionsRepresented ?? 0} regions`}
                icon={<FileText className="w-4 h-4" />}
              />
              <StatCard
                label="Active Agencies"
                value={overview?.activeInstitutions || 0}
                hint={overview?.unreachableInstitutions ? `${overview.unreachableInstitutions} without a channel` : 'Alert routing configured'}
                tone={overview?.unreachableInstitutions ? 'warning' : 'neutral'}
                icon={<Building2 className="w-4 h-4" />}
                onClick={() => setActiveTab('institutions')}
              />
            </div>

            {/* Two-column: queue preview + platform posture */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <Card className="xl:col-span-2 space-y-3">
                <SectionHeader
                  title="Needs Attention Now"
                  description="The highest-severity items across every institution, desk and case."
                  icon={<AlertTriangle className="w-4 h-4 text-amber-400" />}
                  actions={
                    <Button variant="ghost" size="xs" onClick={() => setActiveTab('coordination')} iconRight={<ArrowRight className="w-3 h-3" />}>
                      Open queue
                    </Button>
                  }
                />
                {loading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-20 rounded-xl bg-slate-800/60 animate-pulse" />
                    ))}
                  </div>
                ) : !queue?.items?.length ? (
                  <EmptyState icon={<CheckCircle2 className="w-5 h-5" />} title="Nothing needs attention" description="No breached, urgent or due-soon work across the platform." />
                ) : (
                  <div className="space-y-2">
                    {queue.items.map((item) => (
                      <QueueItemCard
                        key={item.id}
                        item={item}
                        onAccept={handleQueueAccept}
                        onDecline={handleQueueDecline}
                        onResolve={handleQueueResolve}
                        onRedispatch={handleQueueRedispatch}
                        onReview={handleQueueReview}
                        onEscalate={handleQueueEscalate}
                      />
                    ))}
                  </div>
                )}
              </Card>

              <div className="space-y-4">
                <Card className="space-y-3">
                  <SectionHeader title="Platform Posture" icon={<Activity className="w-4 h-4 text-purple-400" />} />
                  <div className="space-y-2">
                    <Tile
                      label="Platform Health"
                      value={overview?.systemHealth === 'HEALTHY' ? 'All systems nominal' : overview?.systemHealth === 'DEGRADED' ? 'Degraded' : 'Attention required'}
                      tone={overview?.systemHealth === 'HEALTHY' ? 'success' : overview?.systemHealth === 'DEGRADED' ? 'critical' : 'warning'}
                      icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                    />
                    <Tile
                      label="Database"
                      value={overview?.databaseStatus === 'CONNECTED' ? 'Connected' : 'Unavailable'}
                      tone={overview?.databaseStatus === 'CONNECTED' ? 'success' : 'critical'}
                      icon={<ShieldCheck className="w-3.5 h-3.5" />}
                    />
                    <Tile
                      label="Registered Users"
                      value={String(overview?.totalUsers ?? 0)}
                      icon={<Users className="w-3.5 h-3.5" />}
                    />
                    <Tile
                      label="Institutions"
                      value={String(overview?.totalInstitutions ?? 0)}
                      icon={<Building2 className="w-3.5 h-3.5" />}
                    />
                    <Tile
                      label="Desks Configured"
                      value={String(overview?.totalDesks ?? 0)}
                      icon={<GitPullRequest className="w-3.5 h-3.5" />}
                    />
                  </div>
                </Card>

                <Card className="space-y-3">
                  <SectionHeader title="Alert Delivery" icon={<Mail className="w-4 h-4 text-sky-400" />} />
                  <div className="grid grid-cols-2 gap-2">
                    <Tile label="Delivered" value={String(overview?.alertsByStatus?.DELIVERED || 0)} tone="success" />
                    <Tile label="Sent" value={String(overview?.alertsByStatus?.SENT || 0)} tone="info" />
                    <Tile label="Failed" value={String(overview?.alertsByStatus?.FAILED || 0)} tone={(overview?.alertsByStatus?.FAILED || 0) > 0 ? 'critical' : 'neutral'} />
                    <Tile label="No Channel" value={String(overview?.alertsByStatus?.NOT_CONFIGURED || 0)} tone={(overview?.alertsByStatus?.NOT_CONFIGURED || 0) > 0 ? 'warning' : 'neutral'} />
                  </div>
                  {(overview?.failedAlerts || 0) > 0 && (
                    <Button variant="warning" size="xs" onClick={() => setActiveTab('system')} iconRight={<ArrowRight className="w-3 h-3" />}>
                      Re-dispatch {overview.failedAlerts} failed alert{overview.failedAlerts === 1 ? '' : 's'}
                    </Button>
                  )}
                </Card>
              </div>
            </div>

            {overview?.pendingAbuse > 0 && (
              <Card className="border-amber-800/50">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">
                        {overview.pendingAbuse} abuse complaint{overview.pendingAbuse === 1 ? '' : 's'} awaiting review
                      </div>
                      <div className="text-[11px] text-slate-400">Citizens have flagged content that may need removal or action.</div>
                    </div>
                  </div>
                  <Button variant="warning" size="sm" onClick={() => setActiveTab('reports')} iconRight={<ArrowRight className="w-3.5 h-3.5" />}>
                    Review complaints
                  </Button>
                </div>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'content' && (
          <div className="space-y-4">
            <Card padded={false} className="p-3">
              <div className="flex flex-wrap items-center gap-3">
                <SearchInput
                  icon={<Search className="w-4 h-4" />}
                  placeholder="Filter posts by title or author…"
                  value={postSearch}
                  onChange={(e) => setPostSearch(e.target.value)}
                />
                <Select value={moderationFilter} onChange={(e) => setModerationFilter(e.target.value)} className="!w-auto">
                  <option value="ALL">All Moderation Statuses</option>
                  <option value="approved">Approved / Visible</option>
                  <option value="held">Held for Review</option>
                  <option value="flagged">Flagged</option>
                  <option value="removed">Removed</option>
                </Select>
              </div>
            </Card>

            <DataTable
              loading={loading}
              skeleton={<TableSkeleton rows={6} cols={6} />}
              isEmpty={!loading && adminPosts.length === 0}
              empty={<EmptyState icon={<FileText className="w-5 h-5" />} title="No reports match this filter" description="Adjust the search or moderation status to widen the results." />}
              columns={
                <>
                  <Th>Report Details</Th>
                  <Th>Category</Th>
                  <Th>Urgency</Th>
                  <Th>Author</Th>
                  <Th>Status</Th>
                  <Th align="right">Moderation Actions</Th>
                </>
              }
            >
              <tbody className="divide-y divide-slate-800">
                {adminPosts.map((post) => {
                  const busy = actionLoading === `post-mod-${post.id}`;
                  return (
                    <TableRow key={post.id}>
                      <Td>
                        <div className="font-bold text-white line-clamp-1">{post.title}</div>
                        <div className="text-[10px] text-slate-400">
                          {post.region} · {post.district}
                        </div>
                      </Td>
                      <Td className="font-semibold text-slate-300">{post.category}</Td>
                      <Td>
                        <StatusBadge meta={getPriorityMeta(post.urgency)} />
                      </Td>
                      <Td className="font-medium text-slate-300">{post.author_name}</Td>
                      <Td>
                        <StatusBadge meta={getModerationMeta(post.moderation_status)} />
                      </Td>
                      <Td align="right">
                        <div className="flex items-center justify-end gap-1.5">
                          {post.moderation_status !== 'approved' && (
                            <Button variant="success" size="xs" loading={busy} onClick={() => handlePostModeration(post, 'approved', 'PUBLISHED')}>
                              Approve
                            </Button>
                          )}
                          {post.moderation_status !== 'held' && (
                            <Button variant="warning" size="xs" loading={busy} onClick={() => handlePostModeration(post, 'held', 'MODERATION_REVIEW')}>
                              Hold
                            </Button>
                          )}
                          {post.moderation_status !== 'removed' && (
                            <Button variant="danger" size="xs" loading={busy} onClick={() => handlePostModeration(post, 'removed', 'REMOVED')}>
                              Remove
                            </Button>
                          )}
                        </div>
                      </Td>
                    </TableRow>
                  );
                })}
              </tbody>
            </DataTable>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-4">
            <Card padded={false} className="p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-bold text-slate-300">Filter flagged abuse complaints</span>
                <Select value={reportStatusFilter} onChange={(e) => setReportStatusFilter(e.target.value)} className="!w-auto">
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING">Pending Action</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="DISMISSED">Dismissed</option>
                </Select>
              </div>
            </Card>

            <DataTable
              loading={loading}
              skeleton={<TableSkeleton rows={5} cols={5} />}
              isEmpty={!loading && abuseReports.length === 0}
              empty={<EmptyState icon={<AlertTriangle className="w-5 h-5" />} title="No abuse reports" description="Nothing is waiting in the flagging queue." />}
              columns={
                <>
                  <Th>Reported Issue</Th>
                  <Th>Abuse Reason</Th>
                  <Th>Reporter</Th>
                  <Th>Status</Th>
                  <Th align="right">Actions</Th>
                </>
              }
            >
              <tbody className="divide-y divide-slate-800">
                {abuseReports.map((rep) => {
                  const busy = actionLoading === `report-${rep.id}`;
                  return (
                    <TableRow key={rep.id}>
                      <Td className="font-semibold text-white">{rep.post_title || rep.post_id}</Td>
                      <Td className="font-medium text-amber-400">{rep.reason}</Td>
                      <Td className="text-slate-400">{rep.user_id || 'Anonymous Citizen'}</Td>
                      <Td>
                        <StatusBadge meta={getAbuseReportMeta(rep.status)} />
                      </Td>
                      <Td align="right">
                        {rep.status === 'PENDING' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button variant="success" size="xs" loading={busy} onClick={() => handleAbuseReportAction(rep, 'RESOLVED')}>
                              Action & Resolve
                            </Button>
                            <Button variant="secondary" size="xs" loading={busy} onClick={() => handleAbuseReportAction(rep, 'DISMISSED')}>
                              Dismiss
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-500">No action required</span>
                        )}
                      </Td>
                    </TableRow>
                  );
                })}
              </tbody>
            </DataTable>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-4">
            <Card padded={false} className="p-3">
              <div className="flex flex-wrap items-center gap-3">
                <SearchInput
                  icon={<Search className="w-4 h-4" />}
                  placeholder="Search user by name, handle or email…"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
                <Select value={userRoleFilter} onChange={(e) => setUserRoleFilter(e.target.value)} className="!w-auto">
                  <option value="ALL">All Roles</option>
                  <option value="CITIZEN">Citizen</option>
                  <option value="INSTITUTION_REP">State Institution Rep</option>
                  <option value="JOURNALIST">Journalist</option>
                  <option value="MODERATOR">Moderator</option>
                  <option value="ADMIN">System Admin</option>
                </Select>
              </div>
            </Card>

            <DataTable
              loading={loading}
              skeleton={<TableSkeleton rows={6} cols={5} />}
              isEmpty={!loading && users.length === 0}
              empty={<EmptyState icon={<Users className="w-5 h-5" />} title="No users found" description="Try a different search term or role filter." />}
              columns={
                <>
                  <Th>User</Th>
                  <Th>Email</Th>
                  <Th>Role</Th>
                  <Th>Verification</Th>
                  <Th align="right">Account Controls</Th>
                </>
              }
            >
              <tbody className="divide-y divide-slate-800">
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <Td>
                      <div className="flex items-center gap-2">
                        <img src={u.avatar} alt="" className="w-7 h-7 rounded-full bg-slate-800" />
                        <div>
                          <div className="font-bold text-white">{u.name}</div>
                          <div className="text-[10px] text-slate-500 font-normal">{u.handle}</div>
                        </div>
                      </div>
                    </Td>
                    <Td className="font-mono text-slate-400">{u.email}</Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <StatusBadge meta={getRoleMeta(u.role)} />
                        <Select
                          aria-label={`Change role for ${u.name}`}
                          value={u.role}
                          disabled={actionLoading === `user-role-${u.id}`}
                          onChange={(e) => handleUserRoleChange(u.id, e.target.value, u.role)}
                          className="!w-auto !py-1"
                        >
                          <option value="CITIZEN">CITIZEN</option>
                          <option value="INSTITUTION_REP">INSTITUTION_REP</option>
                          <option value="JOURNALIST">JOURNALIST</option>
                          <option value="MODERATOR">MODERATOR</option>
                          <option value="ADMIN">ADMIN</option>
                        </Select>
                      </div>
                    </Td>
                    <Td>
                      <Button
                        variant={u.is_verified ? 'success' : 'secondary'}
                        size="xs"
                        loading={actionLoading === `user-verify-${u.id}`}
                        icon={<UserCheck className="w-3 h-3" />}
                        onClick={() => handleUserVerifyToggle(u.id, Boolean(u.is_verified))}
                      >
                        {u.is_verified ? 'Verified' : 'Unverified'}
                      </Button>
                    </Td>
                    <Td align="right" className="text-[10px] text-slate-500 font-mono">
                      {String(u.id).slice(0, 12)}…
                    </Td>
                  </TableRow>
                ))}
              </tbody>
            </DataTable>
          </div>
        )}

        {activeTab === 'institutions' && (
          <div className="space-y-4">
            <SectionHeader
              title="Registered Ghanaian Public Institutions"
              description="Agencies receiving routed reports and alerts."
              actions={
                <Button variant="success" onClick={() => openInstitutionModal()} icon={<Plus className="w-4 h-4" />}>
                  Add State Agency
                </Button>
              }
            />

            <DataTable
              loading={loading}
              skeleton={<TableSkeleton rows={5} cols={6} />}
              isEmpty={!loading && institutions.length === 0}
              empty={<EmptyState icon={<Building2 className="w-5 h-5" />} title="No agencies registered" description="Register a state agency to begin routing citizen reports and dispatching alerts." action={<Button variant="success" size="sm" onClick={() => openInstitutionModal()} icon={<Plus className="w-4 h-4" />}>Add State Agency</Button>} />}
              columns={
                <>
                  <Th>Agency</Th>
                  <Th>Jurisdiction</Th>
                  <Th>Alert Method</Th>
                  <Th>Dispatch Endpoint</Th>
                  <Th>Reach</Th>
                  <Th align="right">Actions</Th>
                </>
              }
            >
              <tbody className="divide-y divide-slate-800">
                {institutions.map((inst) => {
                  const email = inst.emailChannels?.[0];
                  const whatsapp = inst.whatsappChannels?.[0];
                  const endpoint = inst.alertMethod === 'OFFICIAL_EMAIL' ? email
                    : inst.alertMethod === 'WHATSAPP_LINE' ? whatsapp
                    : inst.alertMethod === 'DIRECT_API' ? (inst.website ? `${inst.website.replace(/\/$/, '')}/api/speakup-webhook` : undefined)
                    : undefined;
                  return (
                    <TableRow key={inst.id}>
                      <Td>
                        <div className="font-medium text-white">{inst.shortName}</div>
                        <div className="text-slate-400 text-xs">{inst.officialName}</div>
                      </Td>
                      <Td><Badge tone="neutral">{inst.jurisdiction || 'NATIONAL'}</Badge></Td>
                      <Td><Badge tone="info">{inst.alertMethod || 'UNSET'}</Badge></Td>
                      <Td>
                        {endpoint
                          ? <span className="font-mono text-emerald-400 text-xs">{endpoint}</span>
                          : <Badge tone="warning">NOT CONFIGURED</Badge>}
                      </Td>
                      <Td>
                        <span className="text-xs text-slate-300">
                          {inst.activeMentionsCount || 0} routed · {inst.unansweredMentionsCount || 0} awaiting
                        </span>
                      </Td>
                      <Td align="right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="xs" icon={<GitPullRequest className="w-3.5 h-3.5" />} onClick={() => openHierarchy(inst)}>
                            Desks
                          </Button>
                          <Button variant="ghost" size="xs" icon={<Pencil className="w-3.5 h-3.5" />} onClick={() => openInstitutionModal(inst)}>
                            Configure
                          </Button>
                        </div>
                      </Td>
                    </TableRow>
                  );
                })}
              </tbody>
            </DataTable>

            <Modal
              open={showInstModal}
              onClose={() => setShowInstModal(false)}
              title="Manage agency profile"
              description="Register a state agency and configure how it receives alerts."
              footer={
                <>
                  <Button variant="ghost" onClick={() => setShowInstModal(false)} disabled={actionLoading === 'save-inst'}>
                    Cancel
                  </Button>
                  <Button type="submit" form="institution-form" variant="primary" loading={actionLoading === 'save-inst'}>
                    Save Institution
                  </Button>
                </>
              }
            >
              <form id="institution-form" onSubmit={handleSaveInstitution} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Official Name" required>
                  <Input required placeholder="Ghana Police Service" value={instForm.officialName} onChange={(e) => setInstForm({ ...instForm, officialName: e.target.value })} />
                </Field>
                <Field label="Short Name" required>
                  <Input required placeholder="Ghana Police" value={instForm.shortName} onChange={(e) => setInstForm({ ...instForm, shortName: e.target.value })} />
                </Field>
                <Field label="Acronym" required>
                  <Input required placeholder="GPS" value={instForm.acronym} onChange={(e) => setInstForm({ ...instForm, acronym: e.target.value })} />
                </Field>
                <Field label="Primary Alert Channel">
                  <Select value={instForm.alertMethod} onChange={(e) => setInstForm({ ...instForm, alertMethod: e.target.value })}>
                    <option value="OFFICIAL_EMAIL">Official SMTP Email Alert</option>
                    <option value="DIRECT_API">HMAC Webhook API</option>
                    <option value="WHATSAPP_LINE">WhatsApp Dispatch Desk</option>
                    <option value="NO_DIRECT_CHANNEL">No Direct Channel (tag only)</option>
                  </Select>
                </Field>
                <Field label="Official Website" hint="Used to derive the HMAC webhook endpoint for API dispatch.">
                  <Input placeholder="https://police.gov.gh" value={instForm.officialWebsite} onChange={(e) => setInstForm({ ...instForm, officialWebsite: e.target.value })} />
                </Field>
                <Field label="Alert Email Desk(s)" hint="Comma-separated. Required for email dispatch." className="sm:col-span-2">
                  <Input placeholder="alerts@police.gov.gh, dispatch@police.gov.gh" value={instForm.emailChannels} onChange={(e) => setInstForm({ ...instForm, emailChannels: e.target.value })} />
                </Field>
                <Field label="WhatsApp Desk Number(s)" hint="Comma-separated. Required for WhatsApp dispatch." className="sm:col-span-2">
                  <Input placeholder="+233206639121" value={instForm.whatsappChannels} onChange={(e) => setInstForm({ ...instForm, whatsappChannels: e.target.value })} />
                </Field>
                <Field label="Mandate" className="sm:col-span-2">
                  <Input placeholder="Constitutional mandate or service scope" value={instForm.mandate} onChange={(e) => setInstForm({ ...instForm, mandate: e.target.value })} />
                </Field>
              </form>
            </Modal>

            <Modal
              open={Boolean(hierarchyInst)}
              onClose={() => setHierarchyInst(null)}
              title={`${hierarchyInst?.shortName || 'Institution'} — Desks & Officials`}
              description="Live desk hierarchy, attached officials and open workload."
              size="lg"
              footer={
                <Button variant="ghost" onClick={() => setHierarchyInst(null)}>
                  Close
                </Button>
              }
            >
              {hierarchyLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-14 rounded-xl bg-slate-800/60 animate-pulse" />
                  ))}
                </div>
              ) : !hierarchy ? (
                <EmptyState icon={<Building2 className="w-5 h-5" />} title="No structure available" description="This agency has no desks configured yet." />
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <Tile label="Active Desks" value={String(hierarchy.desks?.length ?? 0)} />
                    <Tile label="Officials" value={String(hierarchy.team?.length ?? 0)} />
                    <Tile label="Owned Work" value={String(hierarchy.workload?.total ?? 0)} tone="warning" />
                    <Tile label="Overdue" value={String(hierarchy.workload?.overdueItems ?? 0)} tone={(hierarchy.workload?.overdueItems ?? 0) > 0 ? 'critical' : 'success'} />
                  </div>

                  <div className="space-y-2">
                    <SectionHeader title="Desk Hierarchy" icon={<GitPullRequest className="w-4 h-4 text-amber-400" />} />
                    {!hierarchy.desks?.length ? (
                      <EmptyState icon={<Inbox className="w-5 h-5" />} title="No desks registered" />
                    ) : (
                      hierarchy.desks.map((desk: any) => {
                        const openItems = (hierarchy.workload?.byDesk || []).find((d: any) => d.deskId === desk.id)?.openItems ?? 0;
                        return (
                        <div key={desk.id} className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <div className="text-xs font-bold text-white">{desk.name}</div>
                              <div className="text-[10px] text-slate-500">{desk.level} · {desk.officerCount ?? 0} officials</div>
                            </div>
                            <Badge tone={openItems > 0 ? 'warning' : 'success'} size="sm">{openItems} open</Badge>
                          </div>
                          {desk.officers?.length ? (
                            <div className="flex flex-wrap gap-1.5">
                              {desk.officers.map((o: any) => (
                                <span key={o.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-300">
                                  <UserCheck className="w-3 h-3 text-emerald-400" />
                                  {o.name || o.userId}
                                  <span className="text-slate-500">· {String(o.role || '').replace(/_/g, ' ').toLowerCase()}</span>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-500">No officials attached to this desk.</div>
                          )}
                        </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </Modal>
          </div>
        )}

        {activeTab === 'coordination' && (
          <div className="space-y-4">
            <SectionHeader
              title="Operations Queue"
              description="Every open coordination item across institutions, desks and joint cases, ranked by severity. Nothing here is synthesised — each row is a live record."
              icon={<GitPullRequest className="w-4 h-4 text-amber-400" />}
              actions={
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="ghost" onClick={() => setShowCaseModal(true)} icon={<Plus className="w-3.5 h-3.5" />}>
                    Open Joint Case
                  </Button>
                  <Button variant="ghost" onClick={() => setShowCoordModal(true)} icon={<GitPullRequest className="w-3.5 h-3.5" />}>
                    Escalate / Transfer
                  </Button>
                  <Button variant="warning" loading={actionLoading === 'sla-sweep'} onClick={handleRunSlaSweep} icon={<RefreshCw className="w-3.5 h-3.5" />}>
                    Run SLA Sweep
                  </Button>
                </div>
              }
            />

            {/* Severity backlog tiles double as filters */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <StatCard
                label="Breached"
                value={queue?.summary?.BREACHED ?? 0}
                hint="Past deadline"
                tone="critical"
                icon={<AlertTriangle className="w-4 h-4" />}
                active={queueSeverity === 'BREACHED'}
                onClick={() => setQueueSeverity(queueSeverity === 'BREACHED' ? 'ALL' : 'BREACHED')}
              />
              <StatCard
                label="Urgent"
                value={queue?.summary?.URGENT ?? 0}
                hint="Action required now"
                tone="danger"
                icon={<ShieldAlert className="w-4 h-4" />}
                active={queueSeverity === 'URGENT'}
                onClick={() => setQueueSeverity(queueSeverity === 'URGENT' ? 'ALL' : 'URGENT')}
              />
              <StatCard
                label="Due Soon"
                value={queue?.summary?.DUE_SOON ?? 0}
                hint="Approaching deadline"
                tone="warning"
                icon={<Clock className="w-4 h-4" />}
                active={queueSeverity === 'DUE_SOON'}
                onClick={() => setQueueSeverity(queueSeverity === 'DUE_SOON' ? 'ALL' : 'DUE_SOON')}
              />
              <StatCard
                label="On Track"
                value={queue?.summary?.ON_TRACK ?? 0}
                hint="Within window"
                icon={<CheckCircle2 className="w-4 h-4" />}
                active={queueSeverity === 'ON_TRACK'}
                onClick={() => setQueueSeverity(queueSeverity === 'ON_TRACK' ? 'ALL' : 'ON_TRACK')}
              />
              <StatCard
                label="Total Open"
                value={queue?.summary?.total ?? 0}
                hint="All active work"
                icon={<Inbox className="w-4 h-4" />}
                active={queueSeverity === 'ALL'}
                onClick={() => setQueueSeverity('ALL')}
              />
            </div>

            {/* Filter bar */}
            <Card padded={false} className="p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <SegmentedControl
                  ariaLabel="Filter by severity"
                  value={queueSeverity}
                  onChange={setQueueSeverity}
                  options={[
                    { value: 'ALL', label: 'All', count: queue?.summary?.total },
                    { value: 'BREACHED', label: 'Breached', count: queue?.summary?.BREACHED, tone: 'critical' },
                    { value: 'URGENT', label: 'Urgent', count: queue?.summary?.URGENT, tone: 'danger' },
                    { value: 'DUE_SOON', label: 'Due Soon', count: queue?.summary?.DUE_SOON, tone: 'warning' },
                    { value: 'ON_TRACK', label: 'On Track', count: queue?.summary?.ON_TRACK, tone: 'info' },
                    { value: 'INFO', label: 'Info', count: queue?.summary?.INFO, tone: 'neutral' }
                  ]}
                />
                <div className="flex items-center gap-2">
                  <Select value={queueSource} onChange={(e) => setQueueSource(e.target.value)} className="!w-auto">
                    <option value="ALL">All sources</option>
                    <option value="INBOX_ITEM">Routed work items</option>
                    <option value="DELEGATION">Delegations / transfers</option>
                    <option value="JOINT_CASE">Joint cases</option>
                    <option value="ALERT">Undelivered alerts</option>
                    <option value="ABUSE_REPORT">Abuse complaints</option>
                    <option value="MODERATION">Moderation holds</option>
                  </Select>
                  <Button variant="ghost" size="sm" onClick={refreshQueue} loading={loading} icon={<RefreshCw className="w-3.5 h-3.5" />}>
                    Refresh
                  </Button>
                </div>
              </div>
            </Card>

            {/* The queue itself */}
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-24 rounded-xl bg-slate-800/60 animate-pulse" />
                ))}
              </div>
            ) : !queue?.items?.length ? (
              <EmptyState
                icon={<CheckCircle2 className="w-5 h-5" />}
                title={queueSeverity === 'ALL' && queueSource === 'ALL' ? 'Queue is clear' : 'No items match this filter'}
                description={
                  queueSeverity === 'ALL' && queueSource === 'ALL'
                    ? 'Every routed report, delegation and case is within SLA.'
                    : 'Widen the severity or source filter to see more work.'
                }
                action={
                  (queueSeverity !== 'ALL' || queueSource !== 'ALL') && (
                    <Button variant="ghost" size="sm" onClick={() => { setQueueSeverity('ALL'); setQueueSource('ALL'); }}>
                      Clear filters
                    </Button>
                  )
                }
              />
            ) : (
              <div className="space-y-2">
                {queue.items.map((item) => (
                  <QueueItemCard
                    key={item.id}
                    item={item}
                    busy={actionLoading === `delegation-${item.id.replace('delegation:', '')}` || actionLoading === `alert-${item.meta?.tagId}` || actionLoading === `case-${item.caseId}`}
                    onAccept={handleQueueAccept}
                    onDecline={handleQueueDecline}
                    onResolve={handleQueueResolve}
                    onRedispatch={handleQueueRedispatch}
                    onReview={handleQueueReview}
                    onEscalate={handleQueueEscalate}
                  />
                ))}
              </div>
            )}

            {/* Supporting detail: joint cases + workload, collapsed into a grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <Card className="space-y-3">
                <SectionHeader
                  title="Joint Multi-Institution Cases"
                  description="One civic issue, several agencies, a single shared record."
                  icon={<Building2 className="w-4 h-4 text-cyan-400" />}
                />
                {loading ? (
                  <div className="space-y-2">
                    <div className="h-16 rounded-xl bg-slate-800/60 animate-pulse" />
                    <div className="h-16 rounded-xl bg-slate-800/60 animate-pulse" />
                  </div>
                ) : !jointCases.length ? (
                  <EmptyState
                    icon={<Inbox className="w-5 h-5" />}
                    title="No joint cases"
                    description="Open a joint case when an issue needs coordinated action from more than one institution."
                  />
                ) : (
                  <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                    {jointCases.map((c: any) => (
                      <div key={c.id} className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-white truncate">{c.title}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <StatusBadge meta={getPriorityMeta(c.priority)} />
                            <Badge tone={c.status === 'RESOLVED' || c.status === 'CLOSED' ? 'success' : c.status === 'ACTIVE' ? 'progress' : 'warning'} uppercase size="sm">
                              {c.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Lead: <span className="text-slate-200">{c.leadInstitutionName || c.leadInstitutionId}</span>
                          {c.region ? ` • ${c.district || ''} ${c.region}` : ''}
                        </div>
                        <div className="flex items-center justify-between gap-2 pt-0.5">
                          <span className="text-[10px] text-slate-500">
                            {c.completedCount ?? 0}/{c.participantCount ?? 0} participants complete
                          </span>
                          {c.status !== 'RESOLVED' && c.status !== 'CLOSED' && (
                            <Button
                              size="xs"
                              variant="success"
                              loading={actionLoading === `case-${c.id}`}
                              onClick={() => handleResolveJointCase(c)}
                              icon={<CheckCircle2 className="w-3 h-3" />}
                            >
                              Record Resolution
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="space-y-3">
                <SectionHeader title="Open Workload by Institution" icon={<Building2 className="w-4 h-4 text-purple-400" />} />
                {loading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-12 rounded-xl bg-slate-800/60 animate-pulse" />
                    ))}
                  </div>
                ) : !coordination?.byInstitution?.length ? (
                  <EmptyState icon={<Inbox className="w-5 h-5" />} title="No open institutional work" description="All routed reports have been resolved." />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {coordination.byInstitution.map((row: any) => (
                      <div key={row.institutionId} className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-200 truncate">{row.institutionName || row.institutionId}</span>
                        <Badge tone={row.openReports > 5 ? 'warning' : 'progress'} size="sm">{row.openReports}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}


        {activeTab === 'privacy' && (
          <div className="space-y-4">
            <Card className="space-y-3">
              <SectionHeader title="P³RE Privacy Engine Active Policy" icon={<ShieldCheck className="w-4 h-4 text-emerald-400" />} />
              <p className="text-xs text-slate-300 leading-relaxed">
                The Privacy-Preserving Public Representation Engine isolates raw citizen submissions in protected storage, runs local
                Ghanaian deterministic PII detectors (Ghana Card IDs, phone numbers, GPS coordinates), generates public projections, and
                restricts raw evidence to authorised state officials.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Tile label="Protected Storage" value={privacy?.storage?.protected || '—'} />
                <Tile label="Public Storage" value={privacy?.storage?.public || '—'} />
                <Tile label="Findings Detected" value={String(privacy?.summary?.totalFindings ?? '—')} tone="success" />
                <Tile
                  label="Evidence Token TTL"
                  value={privacy?.accessTokenTtlSeconds ? `${Math.round(privacy.accessTokenTtlSeconds / 60)} Minutes` : '—'}
                  tone="warning"
                />
              </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="space-y-3">
                <SectionHeader title="Detection Coverage" icon={<Activity className="w-4 h-4 text-purple-400" />} />
                {!privacy?.detectors?.length ? (
                  <EmptyState icon={<Lock className="w-5 h-5" />} title="No findings recorded yet" description="PII detectors run automatically on new submissions." />
                ) : (
                  <div className="space-y-2">
                    {privacy.detectors.map((d: any) => (
                      <div key={d.detector} className="flex items-center justify-between p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
                        <span className="text-xs text-slate-200 font-mono">{d.detector}</span>
                        <Badge tone="progress" size="sm">{d.count}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="space-y-3">
                <SectionHeader title="Active Policy Rules" icon={<ShieldCheck className="w-4 h-4 text-emerald-400" />} />
                {!privacy?.policies?.length ? (
                  <EmptyState icon={<Lock className="w-5 h-5" />} title="No policies configured" />
                ) : (
                  <div className="space-y-2">
                    {privacy.policies.map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between gap-2 p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
                        <div className="min-w-0">
                          <div className="text-xs text-slate-200 truncate">{p.policyName}</div>
                          <div className="text-[10px] text-slate-500">{p.findingType} · {p.audience} · v{p.version}</div>
                        </div>
                        <Badge tone={p.enabled ? 'success' : 'neutral'} size="sm">{p.action}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'system' && (
          <div className="space-y-6">
            <div className="space-y-3">
              <SectionHeader title="Background Job Queue" icon={<Cpu className="w-4 h-4 text-purple-400" />} />
              <DataTable
                loading={loading}
                skeleton={<TableSkeleton rows={5} cols={5} />}
                isEmpty={!loading && jobs.length === 0}
                empty={<EmptyState icon={<Cpu className="w-5 h-5" />} title="No background jobs" description="The durable queue is empty." />}
                columns={
                  <>
                    <Th>Job</Th>
                    <Th>Status</Th>
                    <Th>Attempts</Th>
                    <Th>Created</Th>
                    <Th align="right">Actions</Th>
                  </>
                }
              >
                <tbody className="divide-y divide-slate-800">
                  {jobs.map((j) => (
                    <TableRow key={j.id}>
                      <Td>
                        <div className="font-mono font-bold text-white">{j.type}</div>
                        <div className="text-[10px] text-slate-500 font-normal font-mono">{j.id}</div>
                      </Td>
                      <Td>
                        <StatusBadge meta={getJobMeta(j.status)} />
                      </Td>
                      <Td className="text-slate-400">
                        {j.attempts} / {j.max_attempts}
                      </Td>
                      <Td className="text-slate-400">{new Date(j.created_at).toLocaleString()}</Td>
                      <Td align="right">
                        {j.status === 'FAILED' ? (
                          <Button
                            variant="primary"
                            size="xs"
                            loading={actionLoading === `job-${j.id}`}
                            onClick={() => handleRetryJob(j.id)}
                            icon={<RotateCcw className="w-3 h-3" />}
                          >
                            Retry
                          </Button>
                        ) : (
                          <span className="text-[10px] text-slate-500">—</span>
                        )}
                      </Td>
                    </TableRow>
                  ))}
                </tbody>
              </DataTable>
            </div>

            <div className="space-y-3">
              <SectionHeader
                title="Failed Alert Deliveries"
                description="Alerts to state agencies that failed or had no configured channel. Re-dispatch re-runs the delivery."
                icon={<ShieldAlert className="w-4 h-4 text-red-400" />}
                actions={<Button variant="ghost" size="xs" onClick={loadTabData} loading={loading} icon={<RefreshCw className="w-3 h-3" />}>Refresh</Button>}
              />
              {loading ? (
                <div className="space-y-2">
                  <div className="h-14 rounded-xl bg-slate-800/60 animate-pulse" />
                  <div className="h-14 rounded-xl bg-slate-800/60 animate-pulse" />
                </div>
              ) : !failedAlerts?.items?.length ? (
                <EmptyState icon={<CheckCircle2 className="w-5 h-5" />} title="No failed deliveries" description="Every routed alert reached a configured institution channel." />
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <StatCard label="Failed" value={failedAlerts.summary.failed} hint="Delivery attempt errored" tone="critical" icon={<AlertTriangle className="w-4 h-4" />} />
                    <StatCard label="Not Configured" value={failedAlerts.summary.notConfigured} hint="No channel set for agency" tone="warning" icon={<ShieldAlert className="w-4 h-4" />} />
                    <StatCard label="Total Undelivered" value={failedAlerts.summary.total} hint="Awaiting operator action" icon={<Inbox className="w-4 h-4" />} />
                  </div>
                  <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                    {failedAlerts.items.map((a: any) => (
                      <div key={a.tag_id} className="p-3 bg-slate-900 border border-red-900/40 rounded-xl text-xs space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-white truncate">{a.post_title || a.post_id}</span>
                          <Badge tone={a.alert_status === 'FAILED' ? 'critical' : 'warning'} uppercase size="sm">{a.alert_status}</Badge>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {a.institution_name}{a.recipient ? ` • ${a.recipient}` : ''}{a.channel_type ? ` (${a.channel_type})` : ''}
                        </div>
                        {a.error_message && <p className="text-[11px] text-red-400 line-clamp-2">{a.error_message}</p>}
                        <div className="flex items-center justify-between gap-2 pt-0.5">
                          <span className="text-[10px] text-slate-500">
                            {a.retry_count ? `${a.retry_count} retr${a.retry_count === 1 ? 'y' : 'ies'} · ` : ''}
                            {a.last_attempt_at ? `last attempt ${new Date(a.last_attempt_at).toLocaleString()}` : 'no delivery attempt recorded'}
                          </span>
                          <Button
                            size="xs"
                            variant="primary"
                            loading={actionLoading === `alert-${a.tag_id}`}
                            onClick={() => handleRedispatchAlert(a.tag_id)}
                            icon={<RotateCcw className="w-3 h-3" />}
                          >
                            Re-dispatch
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="space-y-3">
              <SectionHeader
                title="Administrative Audit Trail"
                description="Immutable record of privileged and workflow actions: role changes, moderation, delegations, joint cases and alert re-dispatch."
                icon={<ShieldCheck className="w-4 h-4 text-amber-400" />}
                actions={
                  <div className="flex items-center gap-2">
                    <Select value={auditEventFilter} onChange={(e) => setAuditEventFilter(e.target.value)} className="text-xs">
                      <option value="ALL">All events</option>
                      {auditTrailTypes.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </Select>
                    <Button variant="ghost" size="xs" onClick={loadTabData} loading={loading} icon={<RefreshCw className="w-3 h-3" />}>Refresh</Button>
                  </div>
                }
              />
              <Card padded={false} className="p-3 space-y-2 max-h-72 overflow-y-auto">
                {loading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-8 rounded-lg bg-slate-800/60 animate-pulse" />
                    ))}
                  </div>
                ) : auditTrail.length === 0 ? (
                  <EmptyState icon={<ShieldCheck className="w-5 h-5" />} title="No administrative actions recorded" description="Privileged and workflow actions will appear here." />
                ) : (
                  auditTrail.map((log) => (
                    <div key={log.id} className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800 space-y-1 text-[11px]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-amber-400 font-bold truncate">[{log.event_type}]</span>
                        <span className="text-[10px] text-slate-500 shrink-0">{new Date(log.created_at).toLocaleString()}</span>
                      </div>
                      <div className="text-slate-400 truncate">
                        {log.actor_type} · {log.actor_name || log.user_id || 'System'}
                        {log.target_type ? ` → ${log.target_type} ${log.target_id || ''}` : ''}
                      </div>
                      {log.reason && <div className="text-slate-300 line-clamp-2">{log.reason}</div>}
                    </div>
                  ))
                )}
              </Card>
            </div>

            <div className="space-y-3">
              <SectionHeader title="Immutable Event Audit Timeline" icon={<Clock className="w-4 h-4 text-emerald-400" />} />
              <Card padded={false} className="p-3 space-y-2 max-h-60 overflow-y-auto">
                {loading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-8 rounded-lg bg-slate-800/60 animate-pulse" />
                    ))}
                  </div>
                ) : auditLogs.length === 0 ? (
                  <EmptyState icon={<Clock className="w-5 h-5" />} title="No audit events yet" />
                ) : (
                  auditLogs.map((log, idx) => (
                    <div key={idx} className="p-2 bg-slate-900/80 rounded-lg border border-slate-800 flex items-center justify-between gap-2 text-[11px] font-mono text-slate-300">
                      <div className="min-w-0 truncate">
                        <span className="text-purple-400 font-bold">[{log.event_type}]</span> Report: {log.report_id} — Actor:{' '}
                        {log.actor_type} ({log.actor_id || 'System'})
                      </div>
                      <span className="text-[10px] text-slate-500 shrink-0">{new Date(log.created_at).toLocaleTimeString()}</span>
                    </div>
                  ))
                )}
              </Card>
            </div>
          </div>
        )}
      </ConsoleLayout>

      <Modal
        open={showCoordModal}
        onClose={() => setShowCoordModal(false)}
        title="Escalate or transfer work"
        description="Oversight action: push a report or stuck work item to another institution's desk."
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCoordModal(false)} disabled={actionLoading === 'coord-create'}>
              Cancel
            </Button>
            <Button variant="primary" loading={actionLoading === 'coord-create'} onClick={handleCreateCoordinationAction}>
              Create Action
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Target Institution" required>
            <Select value={coordForm.toInstitutionId} onChange={(e) => setCoordForm({ ...coordForm, toInstitutionId: e.target.value })}>
              <option value="">Select institution…</option>
              {institutions.map((inst: any) => (
                <option key={inst.id} value={inst.id}>{inst.shortName || inst.officialName}</option>
              ))}
            </Select>
          </Field>
          <Field label="Action Type">
            <Select value={coordForm.delegationType} onChange={(e) => setCoordForm({ ...coordForm, delegationType: e.target.value })}>
              <option value="ESCALATION">Escalation</option>
              <option value="TRANSFER">Transfer</option>
              <option value="DELEGATION">Delegation</option>
              <option value="INFORMATION">Information only</option>
            </Select>
          </Field>
          <Field label="Priority">
            <Select value={coordForm.priority} onChange={(e) => setCoordForm({ ...coordForm, priority: e.target.value })}>
              <option value="ROUTINE">Routine</option>
              <option value="ELEVATED">Elevated</option>
              <option value="URGENT">Urgent</option>
              <option value="EMERGENCY">Emergency</option>
            </Select>
          </Field>
          <Field label="Report ID" hint="Optional. Links the action to a specific report.">
            <Input placeholder="post-…" value={coordForm.postId} onChange={(e) => setCoordForm({ ...coordForm, postId: e.target.value })} />
          </Field>
          <Field label="Reason" required className="sm:col-span-2">
            <Input placeholder="Why is this being escalated or transferred?" value={coordForm.reason} onChange={(e) => setCoordForm({ ...coordForm, reason: e.target.value })} />
          </Field>
          <Field label="Instructions" className="sm:col-span-2">
            <Input placeholder="What the receiving desk should do" value={coordForm.instructions} onChange={(e) => setCoordForm({ ...coordForm, instructions: e.target.value })} />
          </Field>
        </div>
      </Modal>

      <Modal
        open={showCaseModal}
        onClose={() => setShowCaseModal(false)}
        title="Open a joint coordination case"
        description="Bind several institutions to one civic issue with a lead and supporting participants."
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCaseModal(false)} disabled={actionLoading === 'case-create'}>
              Cancel
            </Button>
            <Button variant="primary" loading={actionLoading === 'case-create'} onClick={handleCreateJointCase}>
              Open Case
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Case Title" required className="sm:col-span-2">
            <Input placeholder="Flooding at Odawna — coordinated response" value={caseForm.title} onChange={(e) => setCaseForm({ ...caseForm, title: e.target.value })} />
          </Field>
          <Field label="Lead Institution" required>
            <Select value={caseForm.leadInstitutionId} onChange={(e) => setCaseForm({ ...caseForm, leadInstitutionId: e.target.value, participants: caseForm.participants.filter((p) => p !== e.target.value) })}>
              <option value="">Select lead…</option>
              {institutions.map((inst: any) => (
                <option key={inst.id} value={inst.id}>{inst.shortName || inst.officialName}</option>
              ))}
            </Select>
          </Field>
          <Field label="Priority">
            <Select value={caseForm.priority} onChange={(e) => setCaseForm({ ...caseForm, priority: e.target.value })}>
              <option value="ROUTINE">Routine</option>
              <option value="ELEVATED">Elevated</option>
              <option value="URGENT">Urgent</option>
              <option value="EMERGENCY">Emergency</option>
            </Select>
          </Field>
          <Field label="Region">
            <Input placeholder="Greater Accra" value={caseForm.region} onChange={(e) => setCaseForm({ ...caseForm, region: e.target.value })} />
          </Field>
          <Field label="District">
            <Input placeholder="Accra Metropolitan" value={caseForm.district} onChange={(e) => setCaseForm({ ...caseForm, district: e.target.value })} />
          </Field>
          <Field label="Report ID" hint="Optional. Links the case to a citizen report." className="sm:col-span-2">
            <Input placeholder="post-…" value={caseForm.postId} onChange={(e) => setCaseForm({ ...caseForm, postId: e.target.value })} />
          </Field>
          <Field label="Summary" className="sm:col-span-2">
            <Input placeholder="What is the shared problem and why does it need multiple agencies?" value={caseForm.summary} onChange={(e) => setCaseForm({ ...caseForm, summary: e.target.value })} />
          </Field>
          <Field label="Supporting Institutions" hint="Select every other agency that must act. The lead is added automatically." className="sm:col-span-2">
            <div className="max-h-48 overflow-y-auto border border-slate-800 rounded-xl divide-y divide-slate-800">
              {institutions.filter((inst: any) => inst.id !== caseForm.leadInstitutionId).map((inst: any) => {
                const checked = caseForm.participants.includes(inst.id);
                return (
                  <label key={inst.id} className="flex items-center gap-2 px-3 py-2 text-xs text-slate-200 cursor-pointer hover:bg-slate-900">
                    <input
                      type="checkbox"
                      className="accent-cyan-500"
                      checked={checked}
                      onChange={(e) =>
                        setCaseForm({
                          ...caseForm,
                          participants: e.target.checked
                            ? [...caseForm.participants, inst.id]
                            : caseForm.participants.filter((p) => p !== inst.id)
                        })
                      }
                    />
                    <span className="truncate">{inst.shortName || inst.officialName}</span>
                  </label>
                );
              })}
            </div>
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(pending)}
        title={pending?.title || ''}
        message={pending?.message}
        confirmLabel={pending?.confirmLabel}
        tone={pending?.tone}
        confirmPhrase={pending?.confirmPhrase}
        reasonLabel={pending?.reasonLabel}
        reasonRequired={pending?.reasonRequired}
        busy={Boolean(actionLoading)}
        onClose={() => setPending(null)}
        onConfirm={runPending}
      />
    </>
  );
};
