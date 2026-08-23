import React from 'react';
import { CheckCircle2, Camera, X, ArrowRight, ShieldCheck, MapPin } from 'lucide-react';
import { CivicPost } from '../types';

interface SeenTooPromptModalProps {
  post: CivicPost | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenAddEvidence: (post: CivicPost) => void;
  confirmationsCount?: number;
}

export const SeenTooPromptModal: React.FC<SeenTooPromptModalProps> = ({
  post,
  isOpen,
  onClose,
  onOpenAddEvidence,
  confirmationsCount
}) => {
  if (!isOpen || !post) return null;

  const count = confirmationsCount ?? (post.engagement?.confirmations || post.confirmationsCount || 1);

  const handleYes = () => {
    onClose();
    onOpenAddEvidence(post);
  };

  const handleNo = () => {
    onClose();
  };

  return (
    <div
      id="seen-too-prompt-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        id="seen-too-prompt-dialog"
        role="dialog"
        aria-modal="true"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md text-slate-900 dark:text-slate-100 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-300 dark:border-emerald-800/60">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-tight">
                Observation Recorded
              </h3>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                "Seen too" logged in public record
              </p>
            </div>
          </div>
          <button
            id="close-seen-too-prompt-btn"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* Post Snippet Badge */}
          <div className="p-3 bg-slate-100/80 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/70 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                {post.location.district} ({post.location.region})
              </span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                {count} {count === 1 ? 'Citizen' : 'Citizens'} Confirming
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 line-clamp-2 leading-relaxed">
              "{post.title}"
            </p>
          </div>

          {/* Main Question */}
          <div className="space-y-1.5 text-center sm:text-left">
            <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
              Do you have additional evidence to add to this post?
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Attaching photos, videos, or on-the-ground status notes helps state responders and community members verify current conditions faster.
            </p>
          </div>

          {/* Action Buttons: Yes / No */}
          <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* NO: Just Confirming */}
            <button
              id="seen-too-confirm-only-btn"
              type="button"
              onClick={handleNo}
              className="w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl border border-slate-300 dark:border-slate-700 transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer order-2 sm:order-1"
            >
              <span>No, Just Confirming</span>
            </button>

            {/* YES: Add Evidence */}
            <button
              id="seen-too-add-evidence-btn"
              type="button"
              onClick={handleYes}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-emerald-900/20 transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer order-1 sm:order-2"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Yes, Add Evidence</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Security & Reliability Note */}
          <div className="pt-2 flex items-center justify-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Encrypted observation timestamped to regional public ledger</span>
          </div>
        </div>
      </div>
    </div>
  );
};
