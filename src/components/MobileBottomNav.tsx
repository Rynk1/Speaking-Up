import React from 'react';
import {
  Radio,
  MapPin,
  Megaphone,
  Building2,
  BarChart3,
  Flame
} from 'lucide-react';

interface MobileBottomNavProps {
  currentView: 'feed' | 'map' | 'clusters' | 'institutions' | 'institution_portal' | 'journalist_desk' | 'radar' | 'privacy_review' | 'admin_dashboard';
  setCurrentView: (view: 'feed' | 'map' | 'clusters' | 'institutions' | 'institution_portal' | 'journalist_desk' | 'radar' | 'privacy_review' | 'admin_dashboard') => void;
  onOpenSpeakUp: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentView,
  setCurrentView,
  onOpenSpeakUp
}) => {
  return (
    <div
      id="mobile-bottom-navigation"
      className="lg:hidden fixed bottom-0 inset-x-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 z-40 px-2 py-1.5 shadow-2xl"
    >
      <div className="flex items-center justify-around">
        {/* Feed Tab */}
        <button
          onClick={() => setCurrentView('feed')}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-lg transition-colors ${
            currentView === 'feed' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span className="text-[10px]">Feed</span>
        </button>

        {/* Map Tab */}
        <button
          onClick={() => setCurrentView('map')}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-lg transition-colors ${
            currentView === 'map' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span className="text-[10px]">Map</span>
        </button>

        {/* Central Raised SPEAK UP Button */}
        <button
          onClick={onOpenSpeakUp}
          className="flex flex-col items-center -mt-5 group focus:outline-none"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-950/40 group-active:scale-95 transition-transform border-2 border-white dark:border-slate-900">
            <Megaphone className="w-6 h-6 animate-pulse" />
          </div>
          <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">SPEAK UP</span>
        </button>

        {/* Clusters Tab */}
        <button
          onClick={() => setCurrentView('clusters')}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-lg transition-colors ${
            currentView === 'clusters' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Flame className="w-4 h-4 text-amber-500 dark:text-amber-400" />
          <span className="text-[10px]">Issues</span>
        </button>

        {/* Institutions Directory */}
        <button
          onClick={() => setCurrentView('institutions')}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-lg transition-colors ${
            currentView === 'institutions' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span className="text-[10px]">Agencies</span>
        </button>
      </div>
    </div>
  );
};
