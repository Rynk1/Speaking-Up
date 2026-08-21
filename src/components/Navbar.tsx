import React, { useState, useRef, useEffect } from 'react';
import {
  Megaphone,
  Radio,
  MapPin,
  Building2,
  BarChart3,
  Search,
  Bell,
  UserCheck,
  Shield,
  Newspaper,
  User,
  SlidersHorizontal,
  Flame,
  CheckCircle2,
  X,
  Sun,
  Moon
} from 'lucide-react';
import { NotificationItem } from '../types';
import { useTheme } from '../context/ThemeContext';

interface NavbarProps {
  currentView: 'feed' | 'map' | 'clusters' | 'institutions' | 'institution_portal' | 'journalist_desk' | 'radar' | 'privacy_review';
  setCurrentView: (view: 'feed' | 'map' | 'clusters' | 'institutions' | 'institution_portal' | 'journalist_desk' | 'radar' | 'privacy_review') => void;
  onOpenSpeakUp: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  userRole: 'citizen' | 'institution_rep' | 'journalist' | 'moderator';
  setUserRole: (role: 'citizen' | 'institution_rep' | 'journalist' | 'moderator') => void;
  selectedInstitutionId: string;
  setSelectedInstitutionId: (id: string) => void;
  notifications: NotificationItem[];
  onMarkNotificationRead: (id: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  setCurrentView,
  onOpenSpeakUp,
  searchQuery,
  setSearchQuery,
  userRole,
  setUserRole,
  selectedInstitutionId,
  setSelectedInstitutionId,
  notifications,
  onMarkNotificationRead
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const roleRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useTheme();

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (roleRef.current && !roleRef.current.contains(e.target as Node)) {
        setShowRoleMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white shadow-sm">
      <div className="max-w-7xl mx-auto px-2 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5 sm:gap-3 cursor-pointer flex-shrink-0" onClick={() => setCurrentView('feed')}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-amber-500 p-0.5 shadow-md flex items-center justify-center">
              <div className="w-full h-full bg-slate-900 dark:bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Megaphone className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold tracking-tight text-base sm:text-lg text-slate-900 dark:text-white">
                  GHANA<span className="text-emerald-600 dark:text-emerald-400">CIVIC</span>
                </span>
                <span className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.2 text-[9px] font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 rounded border border-amber-300 dark:border-amber-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  GH
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block tracking-wide">
                The Megaphone for Every Citizen
              </p>
            </div>
          </div>

          {/* Expanded Search Bar */}
          <div className="flex-1 max-w-xl lg:max-w-2xl hidden md:block">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="global-search-input"
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search issues, regions, #hashtags, @police, @nadmo..."
                className="w-full pl-9 pr-8 py-2 bg-slate-100 dark:bg-slate-800/90 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 text-xs font-medium">
            <button
              id="nav-tab-feed"
              onClick={() => setCurrentView('feed')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
                currentView === 'feed'
                  ? 'bg-emerald-100 dark:bg-emerald-600/20 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30 font-bold'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              Live Feed
            </button>

            <button
              id="nav-tab-map"
              onClick={() => setCurrentView('map')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
                currentView === 'map'
                  ? 'bg-emerald-100 dark:bg-emerald-600/20 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30 font-bold'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              National Map
            </button>

            <button
              id="nav-tab-institutions"
              onClick={() => setCurrentView('institutions')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
                currentView === 'institutions'
                  ? 'bg-emerald-100 dark:bg-emerald-600/20 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30 font-bold'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              State Bodies
            </button>

            <button
              id="nav-tab-radar"
              onClick={() => setCurrentView('radar')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
                currentView === 'radar'
                  ? 'bg-emerald-100 dark:bg-emerald-600/20 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30 font-bold'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Civic Radar
            </button>
          </nav>

          {/* Action CTAs: Role Switcher, Theme Toggle, Notifications */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Role Switcher */}
            <div className="relative" ref={roleRef}>
              <button
                id="role-switcher-btn"
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 transition-colors"
                title="Switch Viewing Perspective"
              >
                {userRole === 'citizen' && <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                {userRole === 'institution_rep' && <Building2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />}
                {userRole === 'journalist' && <Newspaper className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />}
                {userRole === 'moderator' && <Shield className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />}
                <span className="hidden sm:inline capitalize">
                  {userRole === 'citizen' ? 'Citizen' : userRole === 'institution_rep' ? 'Official' : userRole === 'journalist' ? 'Media' : 'Safety'}
                </span>
                <SlidersHorizontal className="w-3 h-3 text-slate-500 dark:text-slate-400" />
              </button>

              {showRoleMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-2 z-50 animate-in fade-in zoom-in-95">
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 px-2.5 py-1.5 uppercase tracking-wider">
                    Experience As:
                  </div>

                  <button
                    onClick={() => {
                      setUserRole('citizen');
                      setCurrentView('feed');
                      setShowRoleMenu(false);
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between ${
                      userRole === 'citizen' ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 font-semibold' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <div>
                        <div className="font-semibold">Citizen Reporter (0 Followers)</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">Post & amplify local observations</div>
                      </div>
                    </div>
                    {userRole === 'citizen' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                  </button>

                  <button
                    onClick={() => {
                      setUserRole('institution_rep');
                      setCurrentView('institution_portal');
                      setShowRoleMenu(false);
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between mt-1 ${
                      userRole === 'institution_rep' ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 font-semibold' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <div>
                        <div className="font-semibold">Verified State Institution</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">Monitor alerts & respond publicly</div>
                      </div>
                    </div>
                    {userRole === 'institution_rep' && <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />}
                  </button>

                  <button
                    onClick={() => {
                      setUserRole('journalist');
                      setCurrentView('journalist_desk');
                      setShowRoleMenu(false);
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between mt-1 ${
                      userRole === 'journalist' ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-900 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60 font-semibold' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Newspaper className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                      <div>
                        <div className="font-semibold">Journalist / Media Desk</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">Discover breaking public interest stories</div>
                      </div>
                    </div>
                    {userRole === 'journalist' && <CheckCircle2 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />}
                  </button>

                  <button
                    onClick={() => {
                      setUserRole('moderator');
                      setCurrentView('privacy_review');
                      setShowRoleMenu(false);
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between mt-1 ${
                      userRole === 'moderator' ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-900 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 font-semibold' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <div>
                        <div className="font-semibold">P³RE Privacy Review Portal</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">Inspect PII findings & moderation queue</div>
                      </div>
                    </div>
                    {userRole === 'moderator' && <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />}
                  </button>
                </div>
              )}
            </div>

            {/* Theme Toggle Button */}
            <button
              id="theme-toggle-btn"
              onClick={toggleTheme}
              className="p-2 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 rounded-lg border border-slate-300 dark:border-slate-700 transition-all flex items-center justify-center group"
              title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              aria-label="Toggle theme mode"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400 group-hover:rotate-45 transition-transform duration-300" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700 group-hover:-rotate-12 transition-transform duration-300" />
              )}
            </button>

            {/* Notifications Dropdown */}
            <div className="relative" ref={notifRef}>
              <button
                id="notifications-bell-btn"
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 rounded-lg border border-slate-300 dark:border-slate-700 relative transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-white dark:text-slate-950 text-[10px] font-extrabold rounded-full flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-3 z-50">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Bell className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      Civic Alerts & Responses
                    </span>
                    <span className="text-[11px] text-emerald-800 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/40 font-bold">
                      {unreadCount} unread
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-80 overflow-y-auto mt-2">
                    {notifications.length === 0 ? (
                      <p className="text-center py-6 text-xs text-slate-500 dark:text-slate-400">No notifications at this time.</p>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          onClick={() => {
                            onMarkNotificationRead(n.id);
                            if (n.postId) setCurrentView('feed');
                          }}
                          className={`py-2.5 px-2 rounded-lg cursor-pointer transition-colors ${
                            n.read ? 'opacity-60 hover:opacity-100' : 'bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <span className="font-semibold text-xs text-slate-900 dark:text-slate-200">{n.title}</span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                              {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-snug">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </header>
  );
};
