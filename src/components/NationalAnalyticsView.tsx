import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Activity,
  ShieldCheck,
  Building2,
  MapPin,
  Clock,
  CheckCircle2,
  Flame,
  AlertTriangle,
  Radio,
  Search,
  Filter,
  Users,
  MessageSquare,
  Sparkles,
  Zap,
  ArrowUpRight
} from 'lucide-react';
import { NationalAnalytics, Institution } from '../types';

interface NationalAnalyticsViewProps {
  analytics: NationalAnalytics | null;
  institutions: Institution[];
}

export const NationalAnalyticsView: React.FC<NationalAnalyticsViewProps> = ({
  analytics,
  institutions
}) => {
  const [selectedThreatFilter, setSelectedThreatFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'NORMAL'>('ALL');
  const [instSearchQuery, setInstSearchQuery] = useState('');

  if (!analytics) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-500 dark:text-slate-400 text-sm animate-pulse shadow-sm">
        Loading national civic metrics and early warning signals...
      </div>
    );
  }

  const filteredInstitutions = institutions.filter(inst => {
    if (!instSearchQuery.trim()) return true;
    const q = instSearchQuery.toLowerCase();
    return (
      inst.officialName.toLowerCase().includes(q) ||
      inst.shortName.toLowerCase().includes(q) ||
      inst.acronym.toLowerCase().includes(q) ||
      inst.mandate.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5 animate-in fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-white">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shadow-inner">
              <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
            </div>
            <div>
              <h2 className="font-black text-lg sm:text-2xl text-white tracking-tight flex items-center gap-2">
                National Civic Radar & Threat Observatory
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                Real-time civic intelligence, regional threat velocity, and state institutional accountability matrix for Ghana
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs shrink-0">
          <span className="px-3 py-1.5 bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 rounded-xl font-bold flex items-center gap-2 shadow-md">
            <Activity className="w-4 h-4 text-emerald-400 animate-pulse" /> Live Telemetry Feed
          </span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1 shadow-md">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Citizen Reports</div>
          <div className="text-2xl font-black text-white">{analytics.totalPosts}</div>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> +14% this week
          </div>
        </div>

        <div className="bg-slate-900 border border-emerald-900/60 rounded-2xl p-4 space-y-1 shadow-md">
          <div className="text-[10px] text-emerald-400 uppercase font-semibold">Community Confirmations</div>
          <div className="text-2xl font-black text-emerald-400">{analytics.totalConfirmations}</div>
          <div className="text-[11px] text-slate-400">Independent citizen validations</div>
        </div>

        <div className="bg-slate-900 border border-amber-900/60 rounded-2xl p-4 space-y-1 shadow-md">
          <div className="text-[10px] text-amber-400 uppercase font-semibold">Official Response Rate</div>
          <div className="text-2xl font-black text-amber-400">{analytics.responseRate}%</div>
          <div className="text-[11px] text-slate-400">State bodies public statements</div>
        </div>

        <div className="bg-slate-900 border border-sky-900/60 rounded-2xl p-4 space-y-1 shadow-md">
          <div className="text-[10px] text-sky-400 uppercase font-semibold">Avg Response Time</div>
          <div className="text-2xl font-black text-sky-400">{analytics.averageResponseTimeHours}h</div>
          <div className="text-[11px] text-slate-400">From alert to public update</div>
        </div>
      </div>

      {/* Early Warning Radar Signals */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Flame className="w-4 h-4 text-amber-400" />
          Live Civic Velocity Radar:
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-950/60 border border-red-900/60 p-3 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-red-400 font-bold">
              <span>⚠️ Flood Alert Spikes</span>
              <span className="text-[10px] bg-red-950 px-1.5 py-0.2 rounded border border-red-800">+280%</span>
            </div>
            <p className="text-slate-300 text-[11px]">
              Odawna, Circle, and Kasoa experiencing rapid citizen reports following early morning downpours.
            </p>
          </div>

          <div className="bg-slate-950/60 border border-amber-900/60 p-3 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-amber-400 font-bold">
              <span>⚡ Power Outage Velocity</span>
              <span className="text-[10px] bg-amber-950 px-1.5 py-0.2 rounded border border-amber-800">Ashanti</span>
            </div>
            <p className="text-slate-300 text-[11px]">
              Ahodwo & Nhyiaeso reporting 72h continuous outage affecting healthcare clinics and cold stores.
            </p>
          </div>

          <div className="bg-slate-950/60 border border-emerald-900/60 p-3 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-emerald-400 font-bold">
              <span>🚧 Highway Repair Notice</span>
              <span className="text-[10px] bg-emerald-950 px-1.5 py-0.2 rounded border border-emerald-800">Active</span>
            </div>
            <p className="text-slate-300 text-[11px]">
              Ghana Highway Authority has dispatched maintenance crew to patch Tema Motorway kilometer 8 craters.
            </p>
          </div>
        </div>
      </div>

      {/* Category Breakdown & Regional Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Category Distribution */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
          <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            Issues by Civic Domain
          </h3>

          <div className="space-y-2.5 text-xs">
            {analytics.categoryBreakdown.map(item => {
              const percentage = Math.round((item.count / analytics.totalPosts) * 100);
              return (
                <div key={item.category} className="space-y-1">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>{item.category}</span>
                    <span className="font-bold text-slate-200">
                      {item.count} reports ({percentage}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${percentage}%` }}
                      className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full transition-all"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Regional Activity Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
          <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-400" />
            Top Active Regions
          </h3>

          <div className="space-y-2.5 text-xs">
            {analytics.regionalBreakdown.slice(0, 6).map(r => (
              <div key={r.region} className="p-2.5 bg-slate-800/60 rounded-xl border border-slate-700/80 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-200">{r.region} Region</div>
                  <div className="text-[10px] text-slate-400">
                    {r.postCount} citizen reports • {r.resolvedCount} addressed
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-emerald-400 font-bold">{r.responseRate}%</span>
                  <div className="text-[10px] text-slate-500">Response Rate</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Institutional Response Transparency Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              State Institutions Responsiveness & Channel Directory Index
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live status of state bodies, public statement counts, and verified alert channels across Ghana
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={instSearchQuery}
              onChange={e => setInstSearchQuery(e.target.value)}
              placeholder="Search state agency..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 uppercase">
                <th className="pb-2.5 font-bold">Institution</th>
                <th className="pb-2.5 font-bold">Domain Mandate</th>
                <th className="pb-2.5 font-bold text-center">Alert Channel</th>
                <th className="pb-2.5 font-bold text-center">Responses</th>
                <th className="pb-2.5 font-bold text-right">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-800 dark:text-slate-300">
              {filteredInstitutions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500 dark:text-slate-400 text-xs">
                    No state agency matches "{instSearchQuery}"
                  </td>
                </tr>
              ) : (
                filteredInstitutions.map((inst, idx) => (
                  <tr key={inst.id ? `${inst.id}-${idx}` : `inst-row-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3">
                      <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <span>{inst.shortName}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded">
                          {inst.acronym}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">{inst.officialName}</div>
                    </td>
                    <td className="py-3 max-w-xs">
                      <div className="font-medium text-slate-700 dark:text-slate-300">{inst.category}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">{inst.mandate}</div>
                    </td>
                    <td className="py-3 text-center">
                      <span className="px-2.5 py-1 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-300 dark:border-slate-700 inline-flex items-center gap-1">
                        {inst.alertMethod === 'DIRECT_API' ? '⚡ Direct Platform API' : inst.alertMethod === 'WHATSAPP_LINE' ? '💬 WhatsApp Desk' : '✉️ Official Email'}
                      </span>
                    </td>
                    <td className="py-3 text-center">
                      <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold rounded text-xs border border-emerald-200 dark:border-emerald-800/60">
                        {inst.officialResponsesCount || 0}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Official Desk
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
