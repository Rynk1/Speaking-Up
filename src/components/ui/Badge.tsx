import React from 'react';
import { toneClasses, toneDotClasses } from './tokens';
import type { StatusMeta, StatusTone } from '../../utils/status';

const sizeClasses = {
  xs: 'px-1.5 py-0.5 text-[10px]',
  sm: 'px-2 py-0.5 text-[11px]',
  md: 'px-2.5 py-1 text-xs'
} as const;

export interface BadgeProps {
  children: React.ReactNode;
  tone?: StatusTone;
  size?: keyof typeof sizeClasses;
  dot?: boolean;
  uppercase?: boolean;
  icon?: React.ReactNode;
  className?: string;
  title?: string;
}

/** Generic pill. Prefer StatusBadge for anything driven by a workflow state. */
export const Badge: React.FC<BadgeProps> = ({
  children,
  tone = 'neutral',
  size = 'xs',
  dot = false,
  uppercase = false,
  icon,
  className = '',
  title
}) => (
  <span
    title={title}
    className={`inline-flex items-center gap-1 rounded-md border font-bold leading-none ${
      toneClasses[tone]
    } ${sizeClasses[size]} ${uppercase ? 'uppercase tracking-wide' : ''} ${className}`}
  >
    {dot && <span className={`w-1.5 h-1.5 rounded-full ${toneDotClasses[tone]}`} aria-hidden="true" />}
    {icon}
    {children}
  </span>
);

export interface StatusBadgeProps {
  meta: StatusMeta;
  size?: keyof typeof sizeClasses;
  uppercase?: boolean;
  showDot?: boolean;
  className?: string;
}

/**
 * Renders a workflow state straight from its StatusMeta so the label, tone and
 * tooltip always agree with utils/status.ts.
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  meta,
  size = 'xs',
  uppercase = true,
  showDot = true,
  className = ''
}) => (
  <Badge
    tone={meta.tone}
    size={size}
    dot={showDot}
    uppercase={uppercase}
    title={meta.description}
    className={className}
  >
    {meta.label}
  </Badge>
);
