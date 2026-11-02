import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';
import type { StatusTone } from '../../utils/status';
import { toneClasses } from './tokens';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastInput {
  title: string;
  description?: string;
  tone?: StatusTone;
  durationMs?: number;
  action?: ToastAction;
}

interface ToastRecord extends ToastInput {
  id: string;
}

interface ToastContextValue {
  push: (toast: ToastInput) => string;
  success: (title: string, description?: string, action?: ToastAction) => string;
  error: (title: string, description?: string, action?: ToastAction) => string;
  info: (title: string, description?: string, action?: ToastAction) => string;
  warning: (title: string, description?: string, action?: ToastAction) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const icons: Partial<Record<StatusTone, React.ReactNode>> = {
  success: <CheckCircle2 className="w-4 h-4" />,
  danger: <AlertCircle className="w-4 h-4" />,
  critical: <AlertCircle className="w-4 h-4" />,
  warning: <AlertTriangle className="w-4 h-4" />,
  info: <Info className="w-4 h-4" />,
  neutral: <Info className="w-4 h-4" />,
  progress: <Info className="w-4 h-4" />
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current[id];
    if (timer) {
      clearTimeout(timer);
      delete timers.current[id];
    }
  }, []);

  const push = useCallback(
    (toast: ToastInput) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const record: ToastRecord = { ...toast, id };
      setToasts((prev) => [...prev.slice(-4), record]);
      const duration = toast.durationMs ?? (toast.tone === 'danger' || toast.tone === 'critical' ? 8000 : 4500);
      if (duration > 0) {
        timers.current[id] = setTimeout(() => dismiss(id), duration);
      }
      return id;
    },
    [dismiss]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      push,
      dismiss,
      success: (title, description, action) => push({ title, description, action, tone: 'success' }),
      error: (title, description, action) => push({ title, description, action, tone: 'danger' }),
      warning: (title, description, action) => push({ title, description, action, tone: 'warning' }),
      info: (title, description, action) => push({ title, description, action, tone: 'info' })
    }),
    [push, dismiss]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed z-[100] bottom-4 right-4 left-4 sm:left-auto flex flex-col gap-2 sm:w-96 pointer-events-none"
        role="region"
        aria-label="Notifications"
      >
        {toasts.map((toast) => {
          const tone = toast.tone || 'info';
          return (
            <div
              key={toast.id}
              role="status"
              className={`pointer-events-auto flex items-start gap-2.5 rounded-xl border p-3 shadow-2xl backdrop-blur-sm animate-in slide-in-from-bottom-2 ${toneClasses[tone]}`}
            >
              <span className="shrink-0 pt-0.5">{icons[tone]}</span>
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="text-xs font-bold">{toast.title}</div>
                {toast.description && <div className="text-[11px] opacity-90 leading-relaxed break-words">{toast.description}</div>}
                {toast.action && (
                  <button
                    type="button"
                    onClick={() => {
                      toast.action!.onClick();
                      dismiss(toast.id);
                    }}
                    className="mt-1 text-[11px] font-bold underline underline-offset-2 hover:opacity-80"
                  >
                    {toast.action.label}
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss notification"
                className="shrink-0 opacity-60 hover:opacity-100"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
