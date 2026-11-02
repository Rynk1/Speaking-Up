import React from 'react';

const controlBase =
  'w-full bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-600 ' +
  'focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/40 disabled:opacity-50';

export interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
  htmlFor?: string;
}

export const Field: React.FC<FieldProps> = ({ label, hint, error, required, children, className = '', htmlFor }) => (
  <div className={`space-y-1 ${className}`}>
    {label && (
      <label htmlFor={htmlFor} className="block text-[11px] font-semibold text-slate-400">
        {label}
        {required && <span className="text-red-400"> *</span>}
      </label>
    )}
    {children}
    {error ? (
      <p className="text-[10px] text-red-400">{error}</p>
    ) : hint ? (
      <p className="text-[10px] text-slate-500">{hint}</p>
    ) : null}
  </div>
);

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = '', ...rest }, ref) {
    return <input ref={ref} className={`${controlBase} px-3 py-2 ${className}`} {...rest} />;
  }
);

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className = '', rows = 3, ...rest }, ref) {
    return <textarea ref={ref} rows={rows} className={`${controlBase} px-3 py-2 resize-none ${className}`} {...rest} />;
  }
);

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className = '', children, ...rest }, ref) {
    return (
      <select ref={ref} className={`${controlBase} px-3 py-2 cursor-pointer ${className}`} {...rest}>
        {children}
      </select>
    );
  }
);

export interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { icon, className = '', ...rest },
  ref
) {
  return (
    <div className="relative flex-1 min-w-[180px]">
      {icon && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">{icon}</span>
      )}
      <input
        ref={ref}
        type="search"
        className={`${controlBase} ${icon ? 'pl-9' : 'pl-3'} pr-3 py-2 ${className}`}
        {...rest}
      />
    </div>
  );
});
