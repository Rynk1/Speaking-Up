import type { StatusTone } from '../../utils/status';

/**
 * Canonical Tailwind classes per status tone. Kept in one place so badges,
 * alerts and meters never drift apart. Colours are tuned for the dark console
 * theme and remain legible in light mode via the index.css overrides.
 */
export const toneClasses: Record<StatusTone, string> = {
  neutral: 'bg-slate-800/80 text-slate-300 border-slate-700',
  info: 'bg-sky-950/70 text-sky-300 border-sky-800/70',
  progress: 'bg-indigo-950/70 text-indigo-300 border-indigo-800/70',
  success: 'bg-emerald-950/70 text-emerald-300 border-emerald-800/70',
  warning: 'bg-amber-950/70 text-amber-300 border-amber-800/70',
  danger: 'bg-red-950/70 text-red-300 border-red-800/70',
  critical: 'bg-red-600/20 text-red-200 border-red-500/60'
};

export const toneSolidClasses: Record<StatusTone, string> = {
  neutral: 'bg-slate-600 text-white',
  info: 'bg-sky-600 text-white',
  progress: 'bg-indigo-600 text-white',
  success: 'bg-emerald-600 text-white',
  warning: 'bg-amber-500 text-slate-950',
  danger: 'bg-red-600 text-white',
  critical: 'bg-red-600 text-white'
};

export const toneDotClasses: Record<StatusTone, string> = {
  neutral: 'bg-slate-400',
  info: 'bg-sky-400',
  progress: 'bg-indigo-400',
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  danger: 'bg-red-400',
  critical: 'bg-red-500'
};

export const toneBarClasses: Record<StatusTone, string> = {
  neutral: 'bg-slate-500',
  info: 'bg-sky-500',
  progress: 'bg-indigo-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  critical: 'bg-red-500'
};
