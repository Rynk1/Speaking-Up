import React from 'react';
import { AlertTriangle, Flame, ShieldAlert, Activity, CheckCircle2 } from 'lucide-react';

interface CivicPriorityIndicatorProps {
  priorityScore?: number;
  priorityBand?: string;
  severity?: string;
  urgency?: string;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
}

export const CivicPriorityIndicator: React.FC<CivicPriorityIndicatorProps> = ({
  priorityScore = 50,
  priorityBand,
  severity,
  urgency,
  size = 'md',
  showDetails = false
}) => {
  // Normalize band
  const band = (priorityBand || (
    priorityScore >= 85 ? 'CRITICAL' :
    priorityScore >= 70 ? 'HIGH' :
    priorityScore >= 50 ? 'ELEVATED' :
    priorityScore >= 30 ? 'MODERATE' : 'ROUTINE'
  )).toUpperCase();

  const getBandStyles = () => {
    switch (band) {
      case 'CRITICAL':
        return {
          bg: 'bg-red-950/80',
          border: 'border-red-600',
          text: 'text-red-300',
          badgeBg: 'bg-red-500',
          barColor: 'bg-red-500',
          label: 'CRITICAL SAFETY THREAT',
          icon: ShieldAlert
        };
      case 'HIGH':
        return {
          bg: 'bg-orange-950/80',
          border: 'border-orange-600',
          text: 'text-orange-300',
          badgeBg: 'bg-orange-500',
          barColor: 'bg-orange-500',
          label: 'HIGH CIVIC PRIORITY',
          icon: Flame
        };
      case 'ELEVATED':
        return {
          bg: 'bg-amber-950/70',
          border: 'border-amber-600/70',
          text: 'text-amber-300',
          badgeBg: 'bg-amber-500',
          barColor: 'bg-amber-500',
          label: 'ELEVATED AWARENESS',
          icon: AlertTriangle
        };
      case 'MODERATE':
        return {
          bg: 'bg-blue-950/70',
          border: 'border-blue-600/70',
          text: 'text-blue-300',
          badgeBg: 'bg-blue-500',
          barColor: 'bg-blue-500',
          label: 'MODERATE PRIORITY',
          icon: Activity
        };
      default:
        return {
          bg: 'bg-slate-900/80',
          border: 'border-slate-700',
          text: 'text-slate-300',
          badgeBg: 'bg-slate-500',
          barColor: 'bg-slate-500',
          label: 'ROUTINE MONITORING',
          icon: CheckCircle2
        };
    }
  };

  const style = getBandStyles();
  const Icon = style.icon;

  if (size === 'sm') {
    return (
      <span
        id={`priority-indicator-sm-${band.toLowerCase()}`}
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${style.bg} ${style.border} ${style.text}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${style.badgeBg} animate-pulse`} />
        <span>{band}</span>
        <span className="font-mono text-slate-400">({Math.round(priorityScore)})</span>
      </span>
    );
  }

  return (
    <div
      id={`priority-indicator-${band.toLowerCase()}`}
      className={`rounded-xl border p-2.5 ${style.bg} ${style.border} ${style.text} space-y-2`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 shrink-0" />
          <span className="text-xs font-black tracking-wide">{style.label}</span>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-xs font-bold">
          <span>SCORE:</span>
          <span className="text-white px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800">
            {Math.round(priorityScore)}/100
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-950/80 rounded-full h-1.5 overflow-hidden border border-slate-800">
        <div
          className={`h-full rounded-full ${style.barColor} transition-all duration-500`}
          style={{ width: `${Math.min(100, Math.max(5, priorityScore))}%` }}
        />
      </div>

      {showDetails && (
        <div className="grid grid-cols-2 gap-2 text-[10px] pt-1 text-slate-400 border-t border-slate-800/60 font-medium">
          <div>Severity: <span className="text-slate-200 uppercase font-bold">{severity || 'Moderate'}</span></div>
          <div>Urgency: <span className="text-slate-200 uppercase font-bold">{urgency || 'Normal'}</span></div>
        </div>
      )}
    </div>
  );
};
