import React, { useState } from 'react';
import { ShieldAlert, X, Check, Loader2 } from 'lucide-react';
import { api } from '../services/api';

interface ReportAbuseModalProps {
  postId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ReportAbuseModal: React.FC<ReportAbuseModalProps> = ({
  postId,
  isOpen,
  onClose
}) => {
  const [reason, setReason] = useState('FALSE_INFORMATION');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen || !postId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.reportAbuse(postId, reason, details);
      setIsSubmitting(false);
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 1800);
    } catch (err) {
      console.error('Failed to submit abuse report:', err);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md text-slate-100 shadow-2xl overflow-hidden my-4">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/30">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base text-white">Report Content Violation</h2>
              <p className="text-[11px] text-slate-400">Keep Ghana Civic Network safe & truthful</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="p-6 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <Check className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-100">Report Received</h3>
            <p className="text-xs text-slate-400">
              Thank you. Our moderation team and civic integrity algorithms will review this report.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Reason for Reporting:
              </label>
              <select
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="w-full p-2 bg-slate-800 text-xs text-slate-100 rounded-lg border border-slate-700"
              >
                <option value="FALSE_INFORMATION">False or misleading civic claim / Fake alarm</option>
                <option value="MOB_TARGETING">Vigilante incitement / Doxxing / Mob harassment</option>
                <option value="OFF_TOPIC_SPAM">Spam / Commercial advertising</option>
                <option value="HATE_SPEECH">Ethnic or religious hate speech</option>
                <option value="DEFAMATION">Defamation / Unsubstantiated private accusations</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Additional Details (Optional):
              </label>
              <textarea
                rows={3}
                value={details}
                onChange={e => setDetails(e.target.value)}
                placeholder="Explain why this content violates community safety standards..."
                className="w-full p-2 bg-slate-800 text-xs text-slate-100 placeholder-slate-500 rounded-xl border border-slate-700 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center gap-1.5"
              >
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                Submit Report
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
