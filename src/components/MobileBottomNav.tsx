import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Radio, MapPin, Building2, BarChart3, Plus } from 'lucide-react';

interface MobileBottomNavProps {
  onOpenSpeakUp: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onOpenSpeakUp }) => {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 shadow-lg px-2 py-1.5">
      <div className="flex items-center justify-around max-w-md mx-auto">
        <Link
          to="/"
          className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-colors ${
            isActive('/')
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Radio className="w-5 h-5" />
          <span className="text-[10px]">Feed</span>
        </Link>

        <Link
          to="/map"
          className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-colors ${
            isActive('/map')
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <MapPin className="w-5 h-5" />
          <span className="text-[10px]">Map</span>
        </Link>

        {/* Speak Up Centered Floating CTA */}
        <button
          onClick={onOpenSpeakUp}
          className="-mt-5 w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform border-2 border-white dark:border-slate-900"
          aria-label="Speak Up"
        >
          <Plus className="w-6 h-6 stroke-[3]" />
        </button>

        <Link
          to="/institutions"
          className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-colors ${
            isActive('/institutions')
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Building2 className="w-5 h-5" />
          <span className="text-[10px]">Desks</span>
        </Link>

        <Link
          to="/radar"
          className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-colors ${
            isActive('/radar')
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[10px]">Radar</span>
        </Link>
      </div>
    </nav>
  );
};
