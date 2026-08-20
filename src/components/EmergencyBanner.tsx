import React, { useState } from 'react';
import { AlertTriangle, PhoneCall, ShieldAlert, X, ChevronRight, ExternalLink } from 'lucide-react';

export const EmergencyBanner: React.FC = () => {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div id="emergency-notice-banner" className="bg-amber-950 text-amber-100 border-b border-amber-800/80 px-4 py-2.5 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5 text-xs sm:text-sm">
        <div className="flex items-center gap-2.5 flex-1">
          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <span className="font-semibold text-amber-300 mr-1.5 uppercase tracking-wider text-[11px] bg-amber-900/60 px-2 py-0.5 rounded border border-amber-700/50">
              Immediate Danger?
            </span>
            <span className="text-amber-200/90">
              Posting here creates public awareness, but does <strong>not</strong> dispatch emergency rescue. For active threats to life or crime, dial Ghana Emergency Services directly.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto flex-wrap">
          <div className="flex items-center gap-1.5 bg-amber-900/70 rounded-md p-1 border border-amber-700/60">
            <a
              id="emergency-call-112"
              href="tel:112"
              className="flex items-center gap-1 px-2 py-1 bg-red-600 hover:bg-red-500 text-white font-bold rounded text-xs transition-colors shadow-xs"
              title="Call National Emergency Centre"
            >
              <PhoneCall className="w-3 h-3" />
              112 (All Emergency)
            </a>
            <a
              id="emergency-call-191"
              href="tel:191"
              className="flex items-center gap-1 px-1.5 py-1 hover:bg-amber-800/80 text-amber-200 rounded text-xs transition-colors"
              title="Call Ghana Police"
            >
              191 (Police)
            </a>
            <a
              id="emergency-call-192"
              href="tel:192"
              className="flex items-center gap-1 px-1.5 py-1 hover:bg-amber-800/80 text-amber-200 rounded text-xs transition-colors"
              title="Call Fire Service"
            >
              192 (Fire)
            </a>
            <a
              id="emergency-call-193"
              href="tel:193"
              className="flex items-center gap-1 px-1.5 py-1 hover:bg-amber-800/80 text-amber-200 rounded text-xs transition-colors"
              title="Call Ambulance"
            >
              193 (Ambulance)
            </a>
          </div>

          <button
            id="emergency-banner-close"
            onClick={() => setDismissed(true)}
            className="p-1 text-amber-400/80 hover:text-amber-200 rounded hover:bg-amber-900/40"
            aria-label="Dismiss banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
