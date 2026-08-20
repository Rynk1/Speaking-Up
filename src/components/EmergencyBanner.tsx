import React, { useState } from 'react';
import { AlertTriangle, PhoneCall, ShieldAlert, X, ChevronRight, ExternalLink } from 'lucide-react';

export const EmergencyBanner: React.FC = () => {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div id="emergency-notice-banner" className="bg-amber-50 dark:bg-amber-950 text-amber-950 dark:text-amber-100 border-b border-amber-200 dark:border-amber-800/80 px-2 sm:px-4 py-2 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-2 text-xs sm:text-sm">
        <div className="flex items-center gap-2 flex-1">
          <div className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <ShieldAlert className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <div className="leading-tight">
            <span className="font-semibold text-amber-800 dark:text-amber-300 mr-1.5 uppercase tracking-wider text-[10px] sm:text-[11px] bg-amber-200/70 dark:bg-amber-900/60 px-1.5 py-0.5 rounded border border-amber-300 dark:border-amber-700/50 inline-block mb-0.5 sm:mb-0">
              Immediate Danger?
            </span>
            <span className="text-amber-900 dark:text-amber-100/90 text-xs sm:text-sm">
              Posting here creates public awareness, but does <strong>not</strong> dispatch emergency rescue.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 self-stretch md:self-auto justify-between md:justify-end flex-wrap">
          <div className="flex items-center gap-1 sm:gap-1.5 bg-amber-200/60 dark:bg-amber-900/80 rounded-md p-1 border border-amber-300 dark:border-amber-700/60 overflow-x-auto max-w-full">
            <a
              id="emergency-call-112"
              href="tel:112"
              className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-red-600 hover:bg-red-500 text-white font-bold rounded text-[11px] sm:text-xs transition-colors shadow-xs shrink-0"
              title="Call National Emergency Centre"
            >
              <PhoneCall className="w-3 h-3" />
              112
            </a>
            <a
              id="emergency-call-191"
              href="tel:191"
              className="px-1 sm:px-1.5 py-0.5 sm:py-1 hover:bg-amber-300/60 dark:hover:bg-amber-800/80 text-amber-900 dark:text-amber-200 font-medium rounded text-[11px] sm:text-xs transition-colors shrink-0"
              title="Call Ghana Police"
            >
              191
            </a>
            <a
              id="emergency-call-192"
              href="tel:192"
              className="px-1 sm:px-1.5 py-0.5 sm:py-1 hover:bg-amber-300/60 dark:hover:bg-amber-800/80 text-amber-900 dark:text-amber-200 font-medium rounded text-[11px] sm:text-xs transition-colors shrink-0"
              title="Call Fire Service"
            >
              192
            </a>
            <a
              id="emergency-call-193"
              href="tel:193"
              className="px-1 sm:px-1.5 py-0.5 sm:py-1 hover:bg-amber-300/60 dark:hover:bg-amber-800/80 text-amber-900 dark:text-amber-200 font-medium rounded text-[11px] sm:text-xs transition-colors shrink-0"
              title="Call Ambulance"
            >
              193
            </a>
          </div>

          <button
            id="emergency-banner-close"
            onClick={() => setDismissed(true)}
            className="p-1 text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 rounded hover:bg-amber-200/50 dark:hover:bg-amber-900/50"
            aria-label="Dismiss banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
