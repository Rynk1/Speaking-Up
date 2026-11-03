import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  Shield,
  MapPin,
  Mail,
  Phone,
  Radio,
  CheckCircle2,
  Layers,
  ChevronRight,
  ShieldCheck,
  Award,
  MapPinned,
  Send,
  Loader2,
  Rocket,
  Globe2
} from 'lucide-react';
import { InstitutionalDesk, InstitutionTeamMember, Institution, RoutingCoverage } from '../../types';

interface MmdaRefEntry {
  code: string;
  name: string;
  tier: string;
}

interface HierarchyDesksViewProps {
  desks: InstitutionalDesk[];
  team: InstitutionTeamMember[];
  currentInstitution: Institution;
  loading: boolean;
  onMobilise?: (payload: {
    region: string;
    district: string;
    level?: string;
    mmdaCode?: string;
    coverageMode?: 'STANDING' | 'ON_CALL';
    mobileReady?: boolean;
  }) => Promise<void>;
  onLoadCoverage?: (region: string) => Promise<RoutingCoverage>;
  onProvisionHierarchy?: (
    regions: { region: string; mmdaCodes?: string[]; coverageMode?: 'STANDING' | 'ON_CALL'; mobileReady?: boolean }[]
  ) => Promise<{ created: number; skipped: number; desks: { region: string; name: string; level: string; mmdaCode?: string; status: 'created' | 'skipped' }[] }>;
  onLoadMmdaReference?: () => Promise<{ regions: string[]; byRegion: Record<string, MmdaRefEntry[]> }>;
}

const GHANA_REGIONS = [
  'Greater Accra', 'Ashanti', 'Northern', 'Western', 'Central', 'Eastern', 'Volta',
  'Upper East', 'Upper West', 'Bono', 'Bono East', 'Ahafo', 'Oti', 'Savannah',
  'North East', 'Western North'
];

const LEVEL_STYLES: Record<string, string> = {
  NATIONAL: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  REGIONAL: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  METROPOLITAN: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  MUNICIPAL: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
  DISTRICT: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  SPECIALIST: 'bg-purple-500/20 text-purple-300 border-purple-500/30'
};

const LEVEL_LABELS: Record<string, string> = {
  NATIONAL: 'National',
  REGIONAL: 'Regional',
  METROPOLITAN: 'Metropolitan (MMDA)',
  MUNICIPAL: 'Municipal (MMDA)',
  DISTRICT: 'District (MMDA)',
  SPECIALIST: 'Specialist'
};

export const HierarchyDesksView: React.FC<HierarchyDesksViewProps> = ({
  desks,
  team,
  currentInstitution,
  loading,
  onMobilise,
  onLoadCoverage,
  onProvisionHierarchy,
  onLoadMmdaReference
}) => {
  const [subTab, setSubTab] = useState<'desks' | 'team' | 'coverage' | 'rollout'>('desks');
  const [region, setRegion] = useState('Greater Accra');
  const [coverage, setCoverage] = useState<RoutingCoverage | null>(null);
  const [coverageLoading, setCoverageLoading] = useState(false);
  const [mobiliseDistrict, setMobiliseDistrict] = useState('');
  const [mobiliseLevel, setMobiliseLevel] = useState('MUNICIPAL');
  const [mobiliseOnCall, setMobiliseOnCall] = useState(false);
  const [mobilising, setMobilising] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // NATIONAL ROLLOUT state
  const [mmdaRef, setMmdaRef] = useState<Record<string, MmdaRefEntry[]>>({});
  const [rolloutRegions, setRolloutRegions] = useState<string[]>([]);
  const [rolloutCodes, setRolloutCodes] = useState<Record<string, string[]>>({});
  const [rolloutOnCall, setRolloutOnCall] = useState(false);
  const [rolloutMobile, setRolloutMobile] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [rolloutResult, setRolloutResult] = useState<{ created: number; skipped: number; desks: { region: string; name: string; level: string; status: 'created' | 'skipped' }[] } | null>(null);
  const [rolloutError, setRolloutError] = useState<string | null>(null);

  const refreshCoverage = async (r: string) => {
    if (!onLoadCoverage) return;
    setCoverageLoading(true);
    try {
      setCoverage(await onLoadCoverage(r));
    } catch {
      setCoverage(null);
    } finally {
      setCoverageLoading(false);
    }
  };

  const handleMobilise = async () => {
    if (!onMobilise || !mobiliseDistrict.trim()) return;
    setMobilising(true);
    setNotice(null);
    try {
      await onMobilise({
        region,
        district: mobiliseDistrict.trim(),
        level: mobiliseLevel,
        coverageMode: mobiliseOnCall ? 'ON_CALL' : 'STANDING',
        mobileReady: true
      });
      setNotice(`Local desk mobilised for ${mobiliseDistrict.trim()}.`);
      setMobiliseDistrict('');
      await refreshCoverage(region);
    } catch (e: any) {
      setNotice(e?.message || 'Failed to mobilise local desk');
    } finally {
      setMobilising(false);
    }
  };

  useEffect(() => {
    if (subTab === 'coverage' && !coverage && onLoadCoverage) {
      refreshCoverage(region);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subTab]);

  // Load the MMDA reference once, when the rollout tab is first opened.
  useEffect(() => {
    if (subTab === 'rollout' && Object.keys(mmdaRef).length === 0 && onLoadMmdaReference) {
      onLoadMmdaReference()
        .then((ref) => setMmdaRef(ref.byRegion || {}))
        .catch(() => setRolloutError('Could not load the MMDA reference registry.'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subTab]);

  const toggleRolloutRegion = (r: string) => {
    setRolloutRegions((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
    setRolloutError(null);
  };

  const toggleRolloutCode = (regionName: string, code: string) => {
    setRolloutCodes((prev) => {
      const current = prev[regionName] || [];
      const next = current.includes(code) ? current.filter((c) => c !== code) : [...current, code];
      return { ...prev, [regionName]: next };
    });
  };

  const handleProvision = async () => {
    if (!onProvisionHierarchy || rolloutRegions.length === 0) return;
    setProvisioning(true);
    setRolloutError(null);
    setRolloutResult(null);
    try {
      const result = await onProvisionHierarchy(
        rolloutRegions.map((r) => ({
          region: r,
          // An empty selection means "all assemblies in this region".
          mmdaCodes: (rolloutCodes[r] && rolloutCodes[r].length) ? rolloutCodes[r] : undefined,
          coverageMode: rolloutOnCall ? 'ON_CALL' : 'STANDING',
          mobileReady: rolloutMobile
        }))
      );
      setRolloutResult(result);
      setRolloutRegions([]);
      setRolloutCodes({});
    } catch (e: any) {
      setRolloutError(e?.message || 'Failed to provision desk hierarchy');
    } finally {
      setProvisioning(false);
    }
  };

  return (
    <div id="hierarchy-desks-view" className="space-y-4">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-3xl flex flex-wrap items-center justify-between gap-3 text-slate-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase">
              Operational Command Architecture
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {desks.length} Functional Desks • {team.length} Verified Officers
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-extrabold text-white">
            {currentInstitution.officialName} — Dispatch Hierarchy
          </h2>
          <p className="text-xs text-slate-300 max-w-xl">
            Jurisdictional routing divides incident intake between National Command, Regional Response Desks, and Specialist Intervention Units. District and MMDA desks are resolved first when a report names their area.
          </p>
        </div>

        {/* Sub-tab switcher */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-2xl border border-slate-800">
          <button
            onClick={() => setSubTab('desks')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              subTab === 'desks'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Functional Desks ({desks.length})
          </button>
          <button
            onClick={() => setSubTab('team')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              subTab === 'team'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Desk Officers ({team.length})
          </button>
          <button
            onClick={() => setSubTab('coverage')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
              subTab === 'coverage'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MapPinned className="w-3.5 h-3.5" /> Local Coverage
          </button>
          {onProvisionHierarchy && (
            <button
              onClick={() => setSubTab('rollout')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                subTab === 'rollout'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Rocket className="w-3.5 h-3.5" /> National Rollout
            </button>
          )}
        </div>
      </div>

      {subTab === 'desks' ? (
        /* DESKS LIST */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {desks.map((desk) => (
            <div
              key={desk.id}
              id={`desk-card-${desk.id}`}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-4 rounded-2xl space-y-3 transition-colors text-slate-100"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${LEVEL_STYLES[desk.level] || LEVEL_STYLES.NATIONAL}`}>
                      {LEVEL_LABELS[desk.level] || desk.level}
                    </span>
                    {desk.coverageMode === 'ON_CALL' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded border uppercase bg-orange-500/20 text-orange-300 border-orange-500/40">
                        On-call
                      </span>
                    )}
                    {desk.mobileReady && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded border uppercase bg-sky-500/20 text-sky-300 border-sky-500/40">
                        Mobile-ready
                      </span>
                    )}
                    <span className="text-xs font-mono text-slate-400 font-bold">
                      {desk.code}
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    {desk.name}
                  </h3>
                  {(desk.region || desk.district) && (
                    <p className="text-[11px] text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {[desk.district, desk.region].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>

                <div className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-amber-400">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>

              {desk.specialization && (
                <p className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                  Specialization: <span className="font-semibold text-white">{desk.specialization}</span>
                </p>
              )}

              <div className="space-y-1.5 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                {desk.leadOfficerName && (
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-slate-300">Lead: {desk.leadOfficerName}</span>
                  </div>
                )}
                {desk.contactEmail && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <span className="font-mono text-slate-300">{desk.contactEmail}</span>
                  </div>
                )}
                {desk.contactPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span className="font-mono text-slate-300">{desk.contactPhone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-emerald-400 font-semibold pt-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{desk.officerCount ?? 0} officer(s) • authorized for automated dispatch routing</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : subTab === 'team' ? (
        /* TEAM ROSTER */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {team.map((member) => (
            <div
              key={member.id}
              id={`member-card-${member.id}`}
              className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-start gap-3.5 text-slate-100"
            >
              <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold text-sm shrink-0">
                {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>

              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white">{member.name}</h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-700 uppercase">
                    {member.role}
                  </span>
                </div>
                <p className="text-xs text-amber-400 font-medium">{member.title || member.department || member.role}</p>
                {member.deskName && (
                  <p className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Layers className="w-3 h-3" /> {member.deskName}
                  </p>
                )}
                <div className="text-[11px] text-slate-400 font-mono pt-1">
                  {member.email}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : subTab === 'coverage' ? (
        /* LOCAL COVERAGE (MMDA) */
        <div className="space-y-3.5">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3 text-slate-100">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase">Region</label>
                <select
                  value={region}
                  onChange={(e) => {
                    setRegion(e.target.value);
                    setCoverage(null);
                    refreshCoverage(e.target.value);
                  }}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  {GHANA_REGIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              {coverageLoading && <Loader2 className="w-4 h-4 animate-spin text-amber-400" />}
            </div>
            {coverage && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                  <p className="text-[10px] uppercase text-slate-500 font-bold">Local desks</p>
                  <p className="text-lg font-extrabold text-white">{coverage.localDesks.length}</p>
                </div>
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                  <p className="text-[10px] uppercase text-slate-500 font-bold">On-call (not mobilised)</p>
                  <p className="text-lg font-extrabold text-orange-300">{coverage.onCallDesks.length}</p>
                </div>
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                  <p className="text-[10px] uppercase text-slate-500 font-bold">Districts covered</p>
                  <p className="text-lg font-extrabold text-emerald-300">{coverage.coveredDistricts.length}</p>
                </div>
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                  <p className="text-[10px] uppercase text-slate-500 font-bold">Coverage gaps</p>
                  <p className="text-lg font-extrabold text-rose-300">{coverage.gapDistricts.length}</p>
                </div>
              </div>
            )}
          </div>

          {/* Mobilise a local desk into a gap district */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3 text-slate-100">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <MapPinned className="w-4 h-4 text-amber-400" /> Mobilise a local (MMDA) desk
              </h3>
              <p className="text-xs text-slate-400 max-w-2xl">
                For districts where {currentInstitution.officialName} has no standing desk, extend operations
                into the jurisdiction. The new desk is linked under the regional command and adopts the open
                reports already sitting there. Use On-call when the agency should only stand up when needed.
              </p>
            </div>

            {coverage && coverage.gapDistricts.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-slate-500 font-bold uppercase">Gaps:</span>
                {coverage.gapDistricts.map((d) => (
                  <button
                    key={d}
                    onClick={() => setMobiliseDistrict(d)}
                    className="text-[11px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25"
                  >
                    {d}
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1 flex-1 min-w-[180px]">
                <label className="text-[11px] font-bold text-slate-400 uppercase">District / MMDA</label>
                <input
                  value={mobiliseDistrict}
                  onChange={(e) => setMobiliseDistrict(e.target.value)}
                  placeholder="e.g. Ga East Municipal"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase">Tier</label>
                <select
                  value={mobiliseLevel}
                  onChange={(e) => setMobiliseLevel(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="METROPOLITAN">Metropolitan</option>
                  <option value="MUNICIPAL">Municipal</option>
                  <option value="DISTRICT">District</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-300 pb-2">
                <input type="checkbox" checked={mobiliseOnCall} onChange={(e) => setMobiliseOnCall(e.target.checked)} />
                On-call
              </label>
              <button
                onClick={handleMobilise}
                disabled={mobilising || !mobiliseDistrict.trim()}
                className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold disabled:opacity-50 flex items-center gap-1.5"
              >
                {mobilising ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Mobilise desk
              </button>
            </div>
            {notice && <p className="text-xs text-amber-300">{notice}</p>}
          </div>

          {coverage && coverage.localDesks.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {coverage.localDesks.map((desk) => (
                <div key={desk.id} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-2 text-slate-100">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${LEVEL_STYLES[desk.level] || LEVEL_STYLES.DISTRICT}`}>
                      {LEVEL_LABELS[desk.level] || desk.level}
                    </span>
                    <span className="text-xs font-mono text-slate-400 font-bold">{desk.code}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${desk.coverageMode === 'ON_CALL' ? 'bg-orange-500/20 text-orange-300 border-orange-500/40' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'}`}>
                      {desk.coverageMode === 'ON_CALL' ? 'On-call' : 'Standing'}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white">{desk.name}</h4>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {[desk.district, desk.region].filter(Boolean).join(', ')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : subTab === 'rollout' ? (
        /* NATIONAL ROLLOUT */
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-3xl space-y-4 text-slate-100">
            <div className="space-y-1">
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <Rocket className="w-4 h-4 text-amber-400" /> National → Regional → MMDA rollout
              </h3>
              <p className="text-xs text-slate-400 max-w-3xl">
                Stand up {currentInstitution.officialName}&apos;s full desk network in one action. Pick the regions
                to operate in; a regional desk is created for each (with a national command desk if the agency has
                none), and a local MMDA desk for every assembly — or just the ones you tick. The rollout is
                idempotent: re-running it only adds what is missing.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={rolloutOnCall} onChange={(e) => setRolloutOnCall(e.target.checked)} />
                Create local desks as On-call
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={rolloutMobile} onChange={(e) => setRolloutMobile(e.target.checked)} />
                Mark local desks mobile-ready
              </label>
            </div>

            <div className="space-y-3">
              {Object.keys(mmdaRef).length === 0 && (
                <p className="text-xs text-slate-500 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading MMDA reference registry…
                </p>
              )}
              {Object.entries(mmdaRef).map(([regionName, assemblies]) => {
                const selected = rolloutRegions.includes(regionName);
                return (
                  <div key={regionName} className={`border rounded-2xl p-3 space-y-2 ${selected ? 'border-amber-500/40 bg-amber-500/5' : 'border-slate-800 bg-slate-950/40'}`}>
                    <label className="flex items-center justify-between gap-2 cursor-pointer">
                      <span className="flex items-center gap-2 text-sm font-bold text-white">
                        <input type="checkbox" checked={selected} onChange={() => toggleRolloutRegion(regionName)} />
                        <Globe2 className="w-3.5 h-3.5 text-slate-400" /> {regionName}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">{assemblies.length} MMDA{assemblies.length === 1 ? '' : 's'}</span>
                    </label>
                    {selected && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {assemblies.map((a) => {
                          const codeSelected = (rolloutCodes[regionName] || []).includes(a.code);
                          return (
                            <button
                              key={a.code}
                              onClick={() => toggleRolloutCode(regionName, a.code)}
                              title={`${a.tier} • ${a.code}`}
                              className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                                codeSelected
                                  ? 'bg-amber-500 text-slate-950 border-amber-500'
                                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                              }`}
                            >
                              {a.name}
                            </button>
                          );
                        })}
                        <span className="text-[10px] text-slate-500 self-center">
                          {(rolloutCodes[regionName] || []).length === 0 ? '(all assemblies)' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleProvision}
                disabled={provisioning || rolloutRegions.length === 0}
                className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold disabled:opacity-50 flex items-center gap-1.5"
              >
                {provisioning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5" />}
                Roll out {rolloutRegions.length || ''} region{rolloutRegions.length === 1 ? '' : 's'}
              </button>
              {rolloutError && <p className="text-xs text-rose-300">{rolloutError}</p>}
            </div>
          </div>

          {rolloutResult && (
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3 text-slate-100">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">
                  Rollout complete — {rolloutResult.created} desk(s) created, {rolloutResult.skipped} already present
                </h3>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-800 rounded-xl border border-slate-800">
                {rolloutResult.desks.map((d, i) => (
                  <div key={`${d.name}-${i}`} className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
                    <span className="text-slate-200">{d.name}</span>
                    <span className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-slate-500">{d.level}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                        d.status === 'created'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-slate-700/40 text-slate-400 border-slate-600'
                      }`}>
                        {d.status}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
