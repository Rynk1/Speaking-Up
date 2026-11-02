import React, { useState } from 'react';
import { ChevronRight, Layers, ShieldAlert, X } from 'lucide-react';

export interface ConsoleNavItem<T extends string> {
  id: T;
  label: string;
  description?: string;
  icon: React.ReactNode;
  /** Optional count badge; renders a red dot when only `alert` is set. */
  badge?: number;
  alert?: boolean;
}

export interface ConsoleNavSection<T extends string> {
  label?: string;
  items: ConsoleNavItem<T>[];
}

export interface ConsoleLayoutProps<T extends string> {
  brandTitle: string;
  brandSubtitle: string;
  brandIcon?: React.ReactNode;
  accent?: 'purple' | 'amber';
  items?: ConsoleNavItem<T>[];
  /** Optional grouped navigation; takes precedence over `items` when present. */
  sections?: ConsoleNavSection<T>[];
  activeTab: T;
  onTabChange: (tab: T) => void;
  headerTitle: string;
  headerSubtitle?: string;
  headerContent?: React.ReactNode;
  headerActions?: React.ReactNode;
  /** Extra controls rendered under the brand in the sidebar/drawer (e.g. a switcher). */
  sidebarExtra?: React.ReactNode;
  footerNote?: string;
  children: React.ReactNode;
}

const accentMap = {
  purple: {
    logo: 'from-purple-600 to-indigo-600',
    active: 'bg-purple-600 text-white shadow-md',
    text: 'text-purple-400'
  },
  amber: {
    logo: 'from-amber-500 to-orange-600',
    active: 'bg-amber-600 text-white shadow-md',
    text: 'text-amber-400'
  }
};

/**
 * One navigation definition drives the desktop sidebar, the mobile drawer and
 * the mobile breadcrumb, so console shells can never drift out of sync.
 */
export function ConsoleLayout<T extends string>({
  brandTitle,
  brandSubtitle,
  brandIcon,
  accent = 'purple',
  items,
  sections,
  activeTab,
  onTabChange,
  headerTitle,
  headerSubtitle,
  headerContent,
  headerActions,
  sidebarExtra,
  footerNote,
  children
}: ConsoleLayoutProps<T>) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const colors = accentMap[accent];
  const groups: ConsoleNavSection<T>[] = sections || [{ items: items || [] }];
  const allItems = groups.flatMap((g) => g.items);
  const activeItem = allItems.find((i) => i.id === activeTab);

  const renderNavButton = (item: ConsoleNavItem<T>, onNavigate?: () => void) => {
    const active = item.id === activeTab;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => {
          onTabChange(item.id);
          onNavigate?.();
        }}
        aria-current={active ? 'page' : undefined}
        className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 transition-colors ${
          active ? colors.active : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
        }`}
      >
        <span className="flex items-center gap-2.5 min-w-0">
          <span className="shrink-0">{item.icon}</span>
          <span className="truncate">{item.label}</span>
        </span>
        {typeof item.badge === 'number' && item.badge > 0 && (
          <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold border border-amber-500/30">
            {item.badge}
          </span>
        )}
        {!item.badge && item.alert && <span className="shrink-0 w-2 h-2 rounded-full bg-emerald-400" aria-hidden="true" />}
      </button>
    );
  };

  const renderNav = (onNavigate?: () => void) => (
    <nav className="space-y-4" aria-label="Console sections">
      {groups.map((group, index) => (
        <div key={group.label || `group-${index}`} className="space-y-1">
          {group.label && (
            <div className="px-3 text-[9px] font-bold text-slate-500 uppercase tracking-wider">{group.label}</div>
          )}
          {group.items.map((item) => renderNavButton(item, onNavigate))}
        </div>
      ))}
    </nav>
  );

  const brand = (
    <div className="flex items-center gap-2.5 px-2">
      <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${colors.logo} flex items-center justify-center shadow-lg`}>
        {brandIcon || <ShieldAlert className="w-4 h-4 text-white" />}
      </div>
      <div className="min-w-0">
        <h2 className="font-extrabold text-sm text-white tracking-wide truncate">{brandTitle}</h2>
        <p className="text-[10px] text-slate-400 truncate">{brandSubtitle}</p>
      </div>
    </div>
  );

  const footer = (
    <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-500 space-y-1 px-2">
      <div className="flex items-center justify-between">
        <span>Status</span>
        <span className="text-emerald-400 font-bold flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> ONLINE
        </span>
      </div>
      {footerNote && <div className="text-[10px]">{footerNote}</div>}
    </div>
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden min-h-[680px] flex flex-col md:flex-row text-slate-100">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 lg:w-72 bg-slate-950/90 border-r border-slate-800 p-4 shrink-0 flex-col justify-between">
        <div className="space-y-6">
          {brand}
          {sidebarExtra}
          {renderNav()}
        </div>
        {footer}
      </aside>

      {/* Mobile header */}
      <div className="md:hidden bg-slate-950/95 border-b border-slate-800 p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-2 group text-left cursor-pointer min-w-0"
            aria-label="Open console navigation"
          >
            <div className={`w-8 h-8 rounded-xl ${colors.logo} bg-gradient-to-tr flex items-center justify-center text-white shadow-md shrink-0`}>
              {brandIcon || <ShieldAlert className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <span className="font-extrabold text-xs text-white block truncate">{brandTitle}</span>
              <div className={`flex items-center gap-1 text-[11px] font-semibold ${colors.text}`}>
                <span>Console</span>
                <ChevronRight className="w-3 h-3 text-slate-500" />
                <span className="text-white truncate">{activeItem?.label}</span>
              </div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl border border-slate-700 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Menu</span>
          </button>
        </div>
        {(headerContent || headerActions) && (
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">{headerContent}</div>
            {headerActions && <div className="flex items-center gap-2 shrink-0">{headerActions}</div>}
          </div>
        )}
      </div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            onClick={() => setDrawerOpen(false)}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            aria-hidden="true"
          />
          <div className="relative w-4/5 max-w-xs bg-slate-950 border-r border-slate-800 h-full p-4 flex flex-col justify-between shadow-2xl z-10">
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                {brand}
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close navigation"
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {sidebarExtra}
              {renderNav(() => setDrawerOpen(false))}
            </div>
            {footer}
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 bg-slate-900/60 overflow-y-auto">
        <div className="sticky top-0 z-30 hidden md:flex items-start justify-between gap-4 px-4 sm:px-6 py-4 border-b border-slate-800 bg-slate-900/85 backdrop-blur supports-[backdrop-filter]:bg-slate-900/70">
          <div className="min-w-0">
            <div className={`flex items-center gap-1.5 text-xs font-semibold mb-1 ${colors.text}`}>
              <span>Console</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              <span className="text-slate-200">{activeItem?.label}</span>
            </div>
            <h1 className="text-base sm:text-lg font-bold text-white truncate">{headerTitle}</h1>
            {headerSubtitle && <p className="text-xs text-slate-400 mt-0.5">{headerSubtitle}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {headerContent}
            {headerActions}
          </div>
        </div>
        <div className="p-4 sm:p-6 space-y-5">{children}</div>
      </main>
    </div>
  );
}
