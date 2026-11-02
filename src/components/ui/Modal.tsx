import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  closeOnBackdrop?: boolean;
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl'
} as const;

/**
 * Standard console dialog: accessible labelling, escape/backdrop dismissal,
 * body scroll lock, and focus moved into the panel on open.
 */
export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={`relative w-full ${sizeClasses[size]} bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col focus:outline-none`}
      >
        <header className="flex items-start justify-between gap-3 p-4 border-b border-slate-800">
          <div className="min-w-0">
            <h2 id={titleId} className="text-sm font-bold text-white">
              {title}
            </h2>
            {description && (
              <p id={descId} className="text-[11px] text-slate-400 mt-0.5">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="p-4 overflow-y-auto flex-1 space-y-3">{children}</div>

        {footer && (
          <footer className="flex items-center justify-end gap-2 p-4 border-t border-slate-800 bg-slate-950/40 rounded-b-2xl">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
};

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary' | 'success';
  busy?: boolean;
  /** When set, the user must type this exact string to enable confirmation. */
  confirmPhrase?: string;
  /** Optional free-text reason captured and passed back on confirm. */
  reasonLabel?: string;
  reasonRequired?: boolean;
  onConfirm: (reason?: string) => void;
  onClose: () => void;
}

/**
 * Destructive/irreversible action guard. Supports a typed confirmation phrase
 * and an optional reason, so enterprise actions are deliberate and auditable.
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  busy = false,
  confirmPhrase,
  reasonLabel,
  reasonRequired = false,
  onConfirm,
  onClose
}) => {
  const [typed, setTyped] = React.useState('');
  const [reason, setReason] = React.useState('');

  useEffect(() => {
    if (open) {
      setTyped('');
      setReason('');
    }
  }, [open]);

  const phraseOk = !confirmPhrase || typed.trim() === confirmPhrase;
  const reasonOk = !reasonRequired || reason.trim().length > 0;
  const canConfirm = phraseOk && reasonOk && !busy;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      closeOnBackdrop={!busy}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone}
            loading={busy}
            disabled={!canConfirm}
            onClick={() => onConfirm(reason.trim() || undefined)}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-xs text-slate-300 leading-relaxed">{message}</div>

      {reasonLabel && (
        <label className="block space-y-1">
          <span className="text-[11px] font-semibold text-slate-400">
            {reasonLabel}
            {reasonRequired && <span className="text-red-400"> *</span>}
          </span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            disabled={busy}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 resize-none"
            placeholder="Recorded in the audit trail…"
          />
        </label>
      )}

      {confirmPhrase && (
        <label className="block space-y-1">
          <span className="text-[11px] font-semibold text-slate-400">
            Type <span className="font-mono text-red-300">{confirmPhrase}</span> to confirm
          </span>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            disabled={busy}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
            placeholder={confirmPhrase}
          />
        </label>
      )}
    </Modal>
  );
};
