import React, { useState } from 'react';
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
  Award
} from 'lucide-react';
import { InstitutionalDesk, InstitutionTeamMember, Institution } from '../../types';

interface HierarchyDesksViewProps {
  desks: InstitutionalDesk[];
  team: InstitutionTeamMember[];
  currentInstitution: Institution;
  loading: boolean;
}

export const HierarchyDesksView: React.FC<HierarchyDesksViewProps> = ({
  desks,
  team,
  currentInstitution,
  loading
}) => {
  const [subTab, setSubTab] = useState<'desks' | 'team'>('desks');

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
            Jurisdictional routing divides incident intake between National Command, Regional Response Desks, and Specialist Intervention Units.
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
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase">
                      {desk.level}
                    </span>
                    <span className="text-xs font-mono text-slate-400 font-bold">
                      {desk.code}
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    {desk.name}
                  </h3>
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
                  <span>Authorized for automated incident dispatch routing</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
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
                <p className="text-xs text-amber-400 font-medium">{member.title}</p>
                <div className="text-[11px] text-slate-400 font-mono pt-1">
                  {member.email}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
