import React from 'react';
import { Check, Clock, AlertTriangle } from 'lucide-react';
import {
  getInboxStateMeta,
  INBOX_WORKFLOW_STAGES,
  evaluateSla,
  type SlaInfo
} from '../../utils/status';
import { toneSolidClasses, toneDotClasses } from './tokens';
import { ProgressBar } from './Card';

export interface WorkflowStepperProps {
  currentState: string;
  className?: string;
  compact?: boolean;
}

/**
 * Horizontal lifecycle stepper (New → Seen → Acknowledged → Under Review →
 * Responded → Resolved). Gives operators an at-a-glance position in the
 * process instead of a single ambiguous colour pill.
 */
export const WorkflowStepper: React.FC<WorkflowStepperProps> = ({ currentState, className = '', compact = false }) => {
  const currentMeta = getInboxStateMeta(currentState);
  const currentRank = currentMeta.rank ?? -1;
  const stages = INBOX_WORKFLOW_STAGES;

  return (
    <ol className={`flex items-center ${className}`} aria-label="Workflow progress">
      {stages.map((stage, index) => {
        const meta = getInboxStateMeta(stage);
        const rank = meta.rank ?? index;
        const done = rank < currentRank;
        const active = rank === currentRank;

        return (
          <li key={stage} className="flex items-center flex-1 last:flex-none min-w-0">
            <div className="flex flex-col items-center gap-1 min-w-0">
              <span
                aria-current={active ? 'step' : undefined}
                title={meta.description}
                className={`flex items-center justify-center rounded-full border shrink-0 transition-colors ${
                  compact ? 'w-4 h-4' : 'w-5 h-5'
                } ${
                  done
                    ? `${toneSolidClasses.success} border-transparent`
                    : active
                    ? `${toneSolidClasses[meta.tone]} border-transparent ring-2 ring-offset-1 ring-offset-slate-950 ring-white/20`
                    : 'bg-slate-900 border-slate-700 text-slate-600'
                }`}
              >
                {done ? (
                  <Check className={compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
                ) : (
                  <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-white/80' : toneDotClasses.neutral}`} />
                )}
              </span>
              {!compact && (
                <span
                  className={`text-[9px] font-bold uppercase tracking-wide text-center leading-tight ${
                    active ? 'text-white' : done ? 'text-emerald-400' : 'text-slate-600'
                  }`}
                >
                  {meta.label}
                </span>
              )}
            </div>
            {index < stages.length - 1 && (
              <span
                aria-hidden="true"
                className={`flex-1 h-0.5 mx-1 rounded-full ${done ? 'bg-emerald-600/70' : 'bg-slate-800'}`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
};

export interface SlaMeterProps {
  dueAt?: string | null;
  createdAt?: string | null;
  className?: string;
  showBar?: boolean;
}

const slaIcon = (info: SlaInfo) =>
  info.state === 'breached' ? (
    <AlertTriangle className="w-3 h-3" />
  ) : (
    <Clock className="w-3 h-3" />
  );

/** Deadline countdown that turns red on breach — the missing SLA signal. */
export const SlaMeter: React.FC<SlaMeterProps> = ({ dueAt, createdAt, className = '', showBar = true }) => {
  const info = evaluateSla(dueAt, createdAt);
  if (info.state === 'none') {
    return <span className={`text-[10px] text-slate-500 ${className}`}>No SLA set</span>;
  }

  const textTone =
    info.state === 'breached'
      ? 'text-red-400'
      : info.state === 'due-soon'
      ? 'text-amber-400'
      : info.state === 'at-risk'
      ? 'text-indigo-300'
      : 'text-emerald-400';

  return (
    <div className={`space-y-1 ${className}`} title={`SLA ${info.state}`}>
      <div className={`flex items-center gap-1 text-[10px] font-bold ${textTone}`}>
        {slaIcon(info)}
        <span>{info.label}</span>
      </div>
      {showBar && <ProgressBar percent={info.percentRemaining} tone={info.tone} />}
    </div>
  );
};
