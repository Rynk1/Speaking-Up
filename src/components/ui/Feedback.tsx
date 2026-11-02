import React from 'react';
import { Loader2, Inbox, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import type { StatusTone } from '../../utils/status';
import { toneClasses } from './tokens';

export const Spinner: React.FC<{ className?: string; label?: string }> = ({
  className = 'w-4 h-4',
  label = 'Loading'
}) => (
  <Loader2 role="status" aria-label={label} className={`${className} animate-spin text-purple-400`} />
);

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse rounded-md bg-slate-800/70 ${className}`} aria-hidden="true" />
);

/** Skeleton rows sized for a table body. */
export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({ rows = 5, cols = 5 }) => (
  <tbody aria-hidden="true">
    {Array.from({ length: rows }).map((_, r) => (
      <tr key={r} className="border-b border-slate-800/60">
        {Array.from({ length: cols }).map((__, c) => (
          <td key={c} className="p-3">
            <Skeleton className={`h-3.5 ${c === 0 ? 'w-3/4' : 'w-1/2'}`} />
          </td>
        ))}
      </tr>
    ))}
  </tbody>
);

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = ''
}) => (
  <div className={`flex flex-col items-center justify-center gap-2 p-10 text-center ${className}`}>
    <div className="w-11 h-11 rounded-2xl bg-slate-800/70 border border-slate-700 flex items-center justify-center text-slate-500">
      {icon || <Inbox className="w-5 h-5" />}
    </div>
    <p className="text-sm font-semibold text-slate-200">{title}</p>
    {description && <p className="text-xs text-slate-500 max-w-sm">{description}</p>}
    {action && <div className="pt-1">{action}</div>}
  </div>
);

export interface InlineAlertProps {
  tone?: StatusTone;
  title?: string;
  children: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}

const alertIcon: Partial<Record<StatusTone, React.ReactNode>> = {
  danger: <AlertCircle className="w-4 h-4" />,
  critical: <AlertCircle className="w-4 h-4" />,
  success: <CheckCircle2 className="w-4 h-4" />,
  warning: <AlertCircle className="w-4 h-4" />,
  info: <Info className="w-4 h-4" />
};

export const InlineAlert: React.FC<InlineAlertProps> = ({
  tone = 'info',
  title,
  children,
  onDismiss,
  className = ''
}) => (
  <div
    role={tone === 'danger' || tone === 'critical' ? 'alert' : 'status'}
    className={`flex items-start gap-2.5 rounded-xl border p-3 text-xs ${toneClasses[tone]} ${className}`}
  >
    <span className="shrink-0 pt-0.5">{alertIcon[tone] || <Info className="w-4 h-4" />}</span>
    <div className="flex-1 space-y-0.5">
      {title && <div className="font-bold">{title}</div>}
      <div className="opacity-90 leading-relaxed">{children}</div>
    </div>
    {onDismiss && (
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss message"
        className="shrink-0 opacity-70 hover:opacity-100 text-current"
      >
        &times;
      </button>
    )}
  </div>
);
