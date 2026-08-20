import React, { useState } from 'react';
import {
  MapPin,
  Flame,
  AlertTriangle,
  Layers,
  Filter,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Building2,
  Eye
} from 'lucide-react';
import { CivicPost, GhanaRegionName, CivicCategory } from '../types';
import { GHANA_REGIONS } from '../../server/seedData';

interface NationalMapViewProps {
  posts: CivicPost[];
  onSelectPost: (post: CivicPost) => void;
  onOpenSpeakUp: () => void;
}

// Region coordinates for interactive SVG Map of Ghana
const REGION_MAP_COORDS: Record<
  GhanaRegionName,
  { x: number; y: number; label: string; short: string }
> = {
  'Upper West': { x: 130, y: 70, label: 'Upper West', short: 'UW' },
  'Upper East': { x: 230, y: 60, label: 'Upper East', short: 'UE' },
  'North East': { x: 250, y: 100, label: 'North East', short: 'NE' },
  Northern: { x: 200, y: 140, label: 'Northern', short: 'NR' },
  Savannah: { x: 130, y: 160, label: 'Savannah', short: 'SV' },
  'Bono East': { x: 180, y: 220, label: 'Bono East', short: 'BE' },
  Bono: { x: 110, y: 220, label: 'Bono', short: 'BO' },
  Oti: { x: 260, y: 220, label: 'Oti', short: 'OT' },
  Ahafo: { x: 100, y: 260, label: 'Ahafo', short: 'AH' },
  Ashanti: { x: 160, y: 270, label: 'Ashanti', short: 'AS' },
  Eastern: { x: 210, y: 300, label: 'Eastern', short: 'ER' },
  Volta: { x: 265, y: 290, label: 'Volta', short: 'VR' },
  'Western North': { x: 85, y: 310, label: 'Western North', short: 'WN' },
  Western: { x: 90, y: 365, label: 'Western', short: 'WR' },
  Central: { x: 155, y: 355, label: 'Central', short: 'CR' },
  'Greater Accra': { x: 225, y: 350, label: 'Greater Accra', short: 'GA' }
};

export const NationalMapView: React.FC<NationalMapViewProps> = ({
  posts,
  onSelectPost,
  onOpenSpeakUp
}) => {
  const [selectedRegion, setSelectedRegion] = useState<GhanaRegionName | 'ALL'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedUrgency, setSelectedUrgency] = useState<string>('ALL');

  // Filter posts
  const filteredPosts = posts.filter(post => {
    if (selectedRegion !== 'ALL' && post.location.region !== selectedRegion) return false;
    if (selectedCategory !== 'ALL' && post.category !== selectedCategory) return false;
    if (selectedUrgency !== 'ALL' && post.urgency !== selectedUrgency) return false;
    return true;
  });

  // Calculate region stats
  const regionCounts: Record<string, number> = {};
  posts.forEach(p => {
    regionCounts[p.location.region] = (regionCounts[p.location.region] || 0) + 1;
  });

  return (
    <div className="space-y-4 animate-in fade-in">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <h2 className="font-extrabold text-lg sm:text-xl text-white tracking-tight">
              National Civic Map of Ghana
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time geospatial observation radar across all 16 regions of Ghana
          </p>
        </div>

        {/* Action button */}
        <button
          onClick={onOpenSpeakUp}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-colors flex items-center gap-1.5"
        >
          <MapPin className="w-4 h-4" /> Report from your area
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-wrap items-center gap-2 text-xs">
        <div className="flex items-center gap-1 text-slate-400 font-semibold mr-1">
          <Filter className="w-3.5 h-3.5" /> Filters:
        </div>

        {/* Region Filter */}
        <select
          value={selectedRegion}
          onChange={e => setSelectedRegion(e.target.value as any)}
          className="p-2 bg-slate-800 text-slate-200 rounded-lg border border-slate-700 focus:outline-none focus:border-emerald-500"
        >
          <option value="ALL">All 16 Regions (Ghana)</option>
          {GHANA_REGIONS.map(r => (
            <option key={r} value={r}>
              {r} ({regionCounts[r] || 0} reports)
            </option>
          ))}
        </select>

        {/* Category Filter */}
        <select
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
          className="p-2 bg-slate-800 text-slate-200 rounded-lg border border-slate-700 focus:outline-none focus:border-emerald-500"
        >
          <option value="ALL">All Categories</option>
          <option value="Flooding & Drainage">Flooding & Drainage</option>
          <option value="Infrastructure & Roads">Infrastructure & Roads</option>
          <option value="Power & Electricity (Dumsor)">Power & Electricity (Dumsor)</option>
          <option value="Water Supply & Quality">Water Supply & Quality</option>
          <option value="Public Safety & Security">Public Safety & Security</option>
          <option value="Sanitation & Waste">Sanitation & Waste</option>
        </select>

        {/* Urgency */}
        <select
          value={selectedUrgency}
          onChange={e => setSelectedUrgency(e.target.value)}
          className="p-2 bg-slate-800 text-slate-200 rounded-lg border border-slate-700 focus:outline-none focus:border-emerald-500"
        >
          <option value="ALL">All Urgencies</option>
          <option value="CRITICAL">🔴 Critical Only</option>
          <option value="HIGH">🟡 High Priority</option>
          <option value="NORMAL">🟢 Normal Priority</option>
        </select>

        {(selectedRegion !== 'ALL' || selectedCategory !== 'ALL' || selectedUrgency !== 'ALL') && (
          <button
            onClick={() => {
              setSelectedRegion('ALL');
              setSelectedCategory('ALL');
              setSelectedUrgency('ALL');
            }}
            className="px-2.5 py-1.5 text-slate-400 hover:text-white underline text-xs"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Map Layout Grid: SVG Radar on Left/Top, List on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Interactive SVG Ghana Map Box */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden min-h-[420px]">
          <div className="absolute top-3 left-3 text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>CLICK REGION TO FOCUS</span>
          </div>

          <div className="w-full max-w-sm aspect-[4/5] relative">
            <svg viewBox="0 0 350 420" className="w-full h-full filter drop-shadow-md">
              {/* Ghana Base Contour / Simplified Regions */}
              <defs>
                <linearGradient id="regionGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1e293b" />
                  <stop offset="100%" stopColor="#0f172a" />
                </linearGradient>
                <linearGradient id="activeRegionGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#065f46" />
                  <stop offset="100%" stopColor="#047857" />
                </linearGradient>
              </defs>

              {/* Map Outline approximation */}
              <path
                d="M 120 40 L 260 40 L 280 80 L 290 190 L 280 320 L 250 370 L 190 380 L 130 385 L 70 340 L 80 240 L 90 120 Z"
                fill="#0b1324"
                stroke="#334155"
                strokeWidth="1.5"
              />

              {/* Region Nodes */}
              {Object.entries(REGION_MAP_COORDS).map(([rName, coord]) => {
                const count = regionCounts[rName] || 0;
                const isSelected = selectedRegion === rName;
                const hasCritical = posts.some(p => p.location.region === rName && p.urgency === 'CRITICAL');

                return (
                  <g
                    key={rName}
                    onClick={() => setSelectedRegion(isSelected ? 'ALL' : (rName as GhanaRegionName))}
                    className="cursor-pointer group"
                  >
                    {/* Node circle */}
                    <circle
                      cx={coord.x}
                      cy={coord.y}
                      r={isSelected ? 18 : 14}
                      className={`transition-all duration-300 ${
                        isSelected
                          ? 'fill-emerald-500 stroke-white stroke-2'
                          : count > 0
                          ? 'fill-slate-800 hover:fill-emerald-700 stroke-slate-600 group-hover:stroke-emerald-400'
                          : 'fill-slate-900 stroke-slate-800'
                      }`}
                    />

                    {/* Pulse ring for critical/high activity */}
                    {hasCritical && (
                      <circle
                        cx={coord.x}
                        cy={coord.y}
                        r="20"
                        className="fill-none stroke-red-500 stroke-1 animate-ping opacity-75 pointer-events-none"
                      />
                    )}

                    {/* Short Code */}
                    <text
                      x={coord.x}
                      y={coord.y + 3}
                      textAnchor="middle"
                      className={`text-[9px] font-extrabold select-none pointer-events-none ${
                        isSelected ? 'fill-slate-950' : 'fill-slate-200'
                      }`}
                    >
                      {coord.short}
                    </text>

                    {/* Count badge */}
                    {count > 0 && (
                      <g transform={`translate(${coord.x + 8}, ${coord.y - 10})`}>
                        <circle r="7" className="fill-emerald-500" />
                        <text
                          y="2.5"
                          textAnchor="middle"
                          className="text-[8px] font-black fill-slate-950 select-none pointer-events-none"
                        >
                          {count}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="w-full flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span> Critical Issue
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Active Reports
            </span>
            <span>{posts.length} Total Field Points</span>
          </div>
        </div>

        {/* List of Filtered Issues in Region */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {selectedRegion === 'ALL' ? 'Nationwide Active Hotspots' : `${selectedRegion} Region Reports`}
              </span>
              <span className="text-slate-400">({filteredPosts.length})</span>
            </div>

            {selectedRegion !== 'ALL' && (
              <button
                onClick={() => setSelectedRegion('ALL')}
                className="text-[11px] text-emerald-400 hover:underline"
              >
                View all regions
              </button>
            )}
          </div>

          {filteredPosts.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">
              No civic reports currently match this region and filter combination.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {filteredPosts.map(post => (
                <div
                  key={post.id}
                  onClick={() => onSelectPost(post)}
                  className="p-3.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl cursor-pointer transition-all space-y-2 group shadow-sm"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-emerald-400" />
                      {post.location.district}, {post.location.region}
                    </span>

                    {post.urgency === 'CRITICAL' ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 bg-red-950 text-red-300 border border-red-800 rounded">
                        Critical
                      </span>
                    ) : post.urgency === 'HIGH' ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 bg-amber-950 text-amber-300 border border-amber-800 rounded">
                        High Priority
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded">
                        {post.category}
                      </span>
                    )}
                  </div>

                  <h4 className="font-bold text-sm text-slate-100 group-hover:text-emerald-300 transition-colors">
                    {post.title}
                  </h4>

                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">{post.content}</p>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                    <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                      <CheckCircle2 className="w-3 h-3" /> {post.engagement.confirmations} confirmed
                    </span>

                    <span className="flex items-center gap-1 text-slate-400 group-hover:text-slate-200">
                      View details <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
