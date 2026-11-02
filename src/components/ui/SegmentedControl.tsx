import React from 'react';
import type { StatusTone } from '../../utils/status';
import { toneDotClasses } from './tokens';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  count?: number;
  tone?: StatusTone;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  /** Allow the group to scroll horizontally on narrow screens instead of wrapping. */
  scroll?: boolean;
  ariaLabel?: string;
  className?: string;
}

/**
 * Compact filter switch. Chosen over a `<select>` for the small, fixed sets that
 * drive triage (severity, source, status) so the current slice and its counts
 * stay visible at a glance. Scrolls rather than wraps on narrow screens.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'sm',
  scroll = true,
  ariaLabel,
  className = ''
}: SegmentedControlProps<T>) {
  const pad = size === 'sm' ? 'px-2.5 py-1.5 text-[11px]' : 'px-3 py-2 text-xs';

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`inline-flex items-center gap-1 p-1 rounded-xl bg-slate-950/70 border border-slate-800 ${
        scroll ? 'max-w-full overflow-x-auto' : 'flex-wrap'
      } ${className}`}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg font-semibold transition-colors whitespace-nowrap ${pad} ${
              active ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            {opt.tone && <span className={`w-1.5 h-1.5 rounded-full ${toneDotClasses[opt.tone]}`} aria-hidden="true" />}
            <span>{opt.label}</span>
            {typeof opt.count === 'number' && (
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                  active ? 'bg-slate-900/80 text-slate-200' : 'bg-slate-800/80 text-slate-400'
                }`}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
