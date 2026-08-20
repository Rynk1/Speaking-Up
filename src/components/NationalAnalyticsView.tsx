import React from 'react';
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
  AlertTriangle
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
  if (!analytics) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-sm animate-pulse">
        Loading national civic metrics and early warning signals...
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <BarChart3 className="w-4 h-4" />
            </div>
            <h2 className="font-extrabold text-lg sm:text-xl text-white tracking-tight">
              National Civic Radar & Institutional Performance
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Real-time public transparency analytics: community velocity, regional hotspots, and official institutional accountability metrics across Ghana.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-lg font-bold flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> Live Telemetry
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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
        <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          State Institutions Responsiveness Index
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase">
                <th className="pb-2 font-semibold">Institution</th>
                <th className="pb-2 font-semibold">Category</th>
                <th className="pb-2 font-semibold text-center">Alert Channel</th>
                <th className="pb-2 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {institutions.map(inst => (
                <tr key={inst.id} className="hover:bg-slate-800/40">
                  <td className="py-2.5">
                    <div className="font-bold text-slate-200">{inst.shortName}</div>
                    <div className="text-[10px] text-slate-400">{inst.officialName}</div>
                  </td>
                  <td className="py-2.5">{inst.category}</td>
                  <td className="py-2.5 text-center">
                    <span className="px-2 py-0.5 text-[10px] bg-slate-800 rounded border border-slate-700 text-slate-300">
                      {inst.alertMethod === 'DIRECT_API' ? '⚡ Direct Platform API' : inst.alertMethod === 'WHATSAPP_LINE' ? '💬 WhatsApp Desk' : '✉️ Official Email'}
                    </span>
                  </td>
                  <td className="py-2.5 text-right">
                    <span className="text-emerald-400 font-semibold flex items-center justify-end gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
