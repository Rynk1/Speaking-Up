import React from 'react';
import type { StatusTone } from '../../utils/status';
import { toneClasses, toneSolidClasses } from './tokens';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
  as?: 'div' | 'section';
}

export const Card: React.FC<CardProps> = ({ padded = true, className = '', children, ...rest }) => (
  <div
    className={`bg-slate-950/60 border border-slate-800 rounded-2xl shadow-sm ${
      padded ? 'p-4' : ''
    } ${className}`}
    {...rest}
  >
    {children}
  </div>
);

export interface SectionHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  description,
  icon,
  actions,
  className = ''
}) => (
  <div className={`flex flex-wrap items-start justify-between gap-3 ${className}`}>
    <div className="min-w-0">
      <h3 className="text-sm font-bold text-white flex items-center gap-2">
        {icon}
        {title}
      </h3>
      {description && <p className="text-[11px] text-slate-400 mt-0.5">{description}</p>}
    </div>
    {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
  </div>
);

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  tone?: StatusTone;
  hint?: string;
  onClick?: () => void;
  active?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  tone = 'neutral',
  hint,
  onClick,
  active = false
}) => {
  const interactive = Boolean(onClick);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!interactive}
      aria-pressed={interactive ? active : undefined}
      className={`text-left w-full rounded-xl border p-3.5 space-y-1.5 transition-colors ${
        active
          ? `${toneClasses[tone]} ring-1 ring-inset ring-white/10`
          : 'bg-slate-950/60 border-slate-800'
      } ${interactive ? 'hover:border-slate-600 cursor-pointer' : 'cursor-default'}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[11px] font-semibold ${active ? '' : 'text-slate-400'}`}>{label}</span>
        {icon && <span className={`${active ? '' : 'text-slate-500'}`}>{icon}</span>}
      </div>
      <div className="text-2xl font-black text-white leading-none">{value}</div>
      {hint && <div className={`text-[10px] ${active ? 'opacity-80' : 'text-slate-500'}`}>{hint}</div>}
    </button>
  );
};

export interface TileProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  tone?: StatusTone;
}

/** Compact metric tile used inside subsystem/health grids. */
export const Tile: React.FC<TileProps> = ({ label, value, icon, tone = 'neutral' }) => (
  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
    <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
      {icon}
      {label}
    </div>
    <div className={`text-xs font-bold ${tone === 'neutral' ? 'text-white' : ''}`}>
      <span className={tone !== 'neutral' ? toneClasses[tone].split(' ').filter((c) => c.startsWith('text-')).join(' ') : ''}>
        {value}
      </span>
    </div>
  </div>
);

export const ProgressBar: React.FC<{ percent: number; tone?: StatusTone; className?: string }> = ({
  percent,
  tone = 'progress',
  className = ''
}) => (
  <div
    className={`h-1.5 w-full rounded-full bg-slate-800 overflow-hidden ${className}`}
    role="progressbar"
    aria-valuenow={Math.round(percent)}
    aria-valuemin={0}
    aria-valuemax={100}
  >
    <div
      className={`h-full rounded-full transition-all ${toneSolidClasses[tone]}`}
      style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
    />
  </div>
);
