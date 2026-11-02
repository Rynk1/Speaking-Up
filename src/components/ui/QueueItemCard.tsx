import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Check,
  ChevronRight,
  GitPullRequest,
  Inbox,
  Mail,
  MessageSquareWarning,
  ShieldAlert,
  UserCheck,
  X
} from 'lucide-react';
import { Badge, Button, StatusBadge } from './index';
import { getPriorityMeta, getQueueSeverityMeta, getQueueSourceMeta, formatAge } from '../../utils/status';
import type { CoordinationQueueItem } from '../../types';

const SOURCE_ICON: Record<string, React.ReactNode> = {
  INBOX_ITEM: <Inbox className="w-3.5 h-3.5" />,
  DELEGATION: <GitPullRequest className="w-3.5 h-3.5" />,
  JOINT_CASE: <Building2 className="w-3.5 h-3.5" />,
  ALERT: <Mail className="w-3.5 h-3.5" />,
  ABUSE_REPORT: <MessageSquareWarning className="w-3.5 h-3.5" />,
  MODERATION: <ShieldAlert className="w-3.5 h-3.5" />
};

export interface QueueItemCardProps {
  item: CoordinationQueueItem;
  busy?: boolean;
  onAccept?: (item: CoordinationQueueItem) => void;
  onDecline?: (item: CoordinationQueueItem) => void;
  onResolve?: (item: CoordinationQueueItem) => void;
  onRedispatch?: (item: CoordinationQueueItem) => void;
  onOpenCase?: (item: CoordinationQueueItem) => void;
  onReview?: (item: CoordinationQueueItem) => void;
  onEscalate?: (item: CoordinationQueueItem) => void;
  onAssign?: (item: CoordinationQueueItem) => void;
}

/**
 * One triage row, rendered identically wherever it appears (queue, overview,
 * institution drill-down). Actions are shown only when the item's source and
 * status make them valid, so the row never offers an impossible operation.
 */
export const QueueItemCard: React.FC<QueueItemCardProps> = ({
  item,
  busy = false,
  onAccept,
  onDecline,
  onResolve,
  onRedispatch,
  onOpenCase,
  onReview,
  onEscalate,
  onAssign
}) => {
  const severity = getQueueSeverityMeta(item.severity);
  const source = getQueueSourceMeta(item.source);

  const actions: React.ReactNode[] = [];

  if (item.source === 'DELEGATION' && item.status === 'PENDING') {
    if (onAccept) actions.push(<Button key="accept" size="xs" variant="success" loading={busy} icon={<Check className="w-3 h-3" />} onClick={() => onAccept(item)}>Accept</Button>);
    if (onDecline) actions.push(<Button key="decline" size="xs" variant="danger" loading={busy} icon={<X className="w-3 h-3" />} onClick={() => onDecline(item)}>Decline</Button>);
  }
  if (item.source === 'JOINT_CASE') {
    if (onOpenCase) actions.push(<Button key="case" size="xs" variant="ghost" loading={busy} onClick={() => onOpenCase(item)}>Manage</Button>);
    if (onResolve) actions.push(<Button key="resolve" size="xs" variant="success" loading={busy} onClick={() => onResolve(item)}>Resolve</Button>);
  }
  if (item.source === 'ALERT' && onRedispatch) {
    actions.push(<Button key="redispatch" size="xs" variant="primary" loading={busy} onClick={() => onRedispatch(item)}>Re-dispatch</Button>);
  }
  if ((item.source === 'ABUSE_REPORT' || item.source === 'MODERATION') && onReview) {
    actions.push(<Button key="review" size="xs" variant="secondary" loading={busy} icon={<ChevronRight className="w-3 h-3" />} onClick={() => onReview(item)}>Review</Button>);
  }
  if ((item.source === 'INBOX_ITEM' || item.source === 'DELEGATION') && onEscalate) {
    actions.push(<Button key="escalate" size="xs" variant="warning" loading={busy} onClick={() => onEscalate(item)}>Escalate</Button>);
  }
  // Routed inbox items can be given a named owner straight from the feed, so a
  // single operator can go from detection to accountable official in one step.
  if (item.source === 'INBOX_ITEM' && item.institutionId && onAssign) {
    actions.unshift(
      <Button key="assign" size="xs" variant="primary" loading={busy} icon={<UserCheck className="w-3 h-3" />} onClick={() => onAssign(item)}>
        {item.assignedOfficerName ? 'Reassign' : 'Assign'}
      </Button>
    );
  }

  const accent =
    item.severity === 'BREACHED'
      ? 'border-l-red-500'
      : item.severity === 'URGENT'
      ? 'border-l-orange-500'
      : item.severity === 'DUE_SOON'
      ? 'border-l-amber-500'
      : item.severity === 'ON_TRACK'
      ? 'border-l-sky-500'
      : 'border-l-slate-600';

  return (
    <div className={`p-3 bg-slate-900 border border-slate-800 border-l-2 ${accent} rounded-xl text-xs space-y-2`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold uppercase tracking-wide">
            <span className="text-slate-400">{SOURCE_ICON[item.source]}</span>
            <span>{source.short}</span>
            {item.escalationLevel > 0 && <Badge tone="warning" size="xs">L{item.escalationLevel}</Badge>}
          </div>
          <div className="font-bold text-white leading-snug line-clamp-2">{item.title}</div>
          {item.subtitle && <div className="text-[11px] text-slate-400 line-clamp-2">{item.subtitle}</div>}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <StatusBadge meta={severity} />
          <StatusBadge meta={getPriorityMeta(item.priority)} size="xs" showDot={false} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500">
        {item.institutionName && (
          <span className="inline-flex items-center gap-1">
            <Building2 className="w-3 h-3" />
            {item.institutionName}
            {item.deskName ? ` · ${item.deskName}` : ''}
          </span>
        )}
        {item.assignedOfficerName && (
          <span className="inline-flex items-center gap-1">
            <UserCheck className="w-3 h-3 text-emerald-400" />
            {item.assignedOfficerName}
          </span>
        )}
        {item.dueAt && (
          <span className="inline-flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            due {new Date(item.dueAt).toLocaleDateString()}
          </span>
        )}
        <span>age {formatAge(item.ageMs)}</span>
      </div>

      {actions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {actions}
          {onReview && item.postId && item.source !== 'ABUSE_REPORT' && item.source !== 'MODERATION' && (
            <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
              <ArrowRight className="w-3 h-3" />
              {item.postId}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
