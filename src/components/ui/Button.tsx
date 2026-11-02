import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'success'
  | 'warning';

export type ButtonSize = 'xs' | 'sm' | 'md';

const base =
  'inline-flex items-center justify-center gap-1.5 font-semibold rounded-lg border transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ' +
  'focus-visible:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed select-none whitespace-nowrap';

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-purple-600 hover:bg-purple-500 text-white border-purple-500/40 focus-visible:ring-purple-400',
  secondary:
    'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 focus-visible:ring-slate-400',
  ghost:
    'bg-transparent hover:bg-slate-800 text-slate-300 border-transparent focus-visible:ring-slate-500',
  danger:
    'bg-red-600 hover:bg-red-500 text-white border-red-500/40 focus-visible:ring-red-400',
  success:
    'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500/40 focus-visible:ring-emerald-400',
  warning:
    'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400/50 focus-visible:ring-amber-400'
};

const sizes: Record<ButtonSize, string> = {
  xs: 'px-2 py-1 text-[11px]',
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-3.5 py-2 text-sm'
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'sm', loading = false, icon, iconRight, className = '', children, disabled, type = 'button', ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : icon}
      {children}
      {!loading && iconRight}
    </button>
  );
});

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, variant = 'ghost', size = 'sm', className = '', children, type = 'button', ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={`${base} ${variants[variant]} ${sizes[size]} !px-2 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
});
