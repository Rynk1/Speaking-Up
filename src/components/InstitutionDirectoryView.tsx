import React, { useState } from 'react';
import {
  Building2,
  ShieldCheck,
  PhoneCall,
  MessageCircle,
  ExternalLink,
  Search,
  Filter,
  Megaphone,
  AlertCircle,
  CheckCircle,
  Mail
} from 'lucide-react';
import { Institution, CivicPost } from '../types';

interface InstitutionDirectoryViewProps {
  institutions: Institution[];
  posts: CivicPost[];
  onSelectInstitution: (inst: Institution) => void;
  onTagInstitutionInNewPost: (inst: Institution) => void;
}

export const InstitutionDirectoryView: React.FC<InstitutionDirectoryViewProps> = ({
  institutions,
  posts,
  onSelectInstitution,
  onTagInstitutionInNewPost
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const categories = ['ALL', 'Security & Emergency', 'Utilities & Water', 'Roads & Transport', 'Local Government', 'Governance & Technology'];

  const filtered = institutions.filter(inst => {
    const matchSearch =
      inst.officialName.toLowerCase().includes(search.toLowerCase()) ||
      inst.shortName.toLowerCase().includes(search.toLowerCase()) ||
      inst.acronym.toLowerCase().includes(search.toLowerCase()) ||
      inst.mandate.toLowerCase().includes(search.toLowerCase());

    const matchCategory = selectedCategory === 'ALL' || inst.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  return (
    <div className="space-y-4 animate-in fade-in">
      {/* Directory Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Building2 className="w-4 h-4" />
            </div>
            <h2 className="font-extrabold text-lg sm:text-xl text-white tracking-tight">
              Verified Public Institutions Directory
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Official mandate registry of Ghanaian state agencies, ministries, emergency response desks, and regulatory commissions. Tag them in civic observations to dispatch alerts.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 bg-emerald-950 text-emerald-300 border border-emerald-800/80 rounded-lg font-bold">
            {institutions.length} Verified Agencies
          </span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, acronym (e.g. ECG, NADMO, PURC, GHA) or mandate..."
            className="w-full pl-9 pr-4 py-2 bg-slate-800 text-xs sm:text-sm text-slate-100 placeholder-slate-400 rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 text-xs">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Institutions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((inst, idx) => {
          const taggedPostsCount = posts.filter(p =>
            p.institutionTags.some(t => t.institutionId === inst.id)
          ).length;

          return (
            <div
              key={inst.id ? `${inst.id}-${idx}` : `dir-inst-${idx}`}
              className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 sm:p-5 shadow-md flex flex-col justify-between space-y-3 transition-all"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-base text-white">{inst.shortName}</h3>
                      <span className="text-[10px] font-extrabold px-1.5 py-0.2 bg-slate-800 text-slate-300 rounded border border-slate-700">
                        {inst.acronym}
                      </span>
                      {inst.verified && (
                        <span className="flex items-center gap-0.5 text-[10px] font-semibold bg-emerald-950 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-800/60">
                          <ShieldCheck className="w-3 h-3 text-emerald-400" /> Verified Authority
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">{inst.officialName}</div>
                  </div>

                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 whitespace-nowrap">
                    {inst.category}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/80">
                  {inst.mandate}
                </p>
              </div>

              {/* Contact Channels */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                  {inst.emergencyHotline && (
                    <a
                      href={`tel:${inst.emergencyHotline}`}
                      className="flex items-center gap-1.5 p-1.5 bg-red-950/60 text-red-300 hover:bg-red-900/60 rounded-lg border border-red-800/60 transition-colors"
                    >
                      <PhoneCall className="w-3.5 h-3.5 text-red-400" />
                      <span>Hotline: <strong>{inst.emergencyHotline}</strong></span>
                    </a>
                  )}

                  {inst.whatsappDesk && (
                    <a
                      href={`https://api.whatsapp.com/send?phone=${inst.whatsappDesk.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 p-1.5 bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/60 rounded-lg border border-emerald-800/60 transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span>WhatsApp: <strong>{inst.whatsappDesk}</strong></span>
                    </a>
                  )}

                  {inst.tollFree && (
                    <div className="flex items-center gap-1.5 p-1.5 bg-slate-800/60 text-slate-300 rounded-lg border border-slate-700">
                      <PhoneCall className="w-3.5 h-3.5 text-sky-400" />
                      <span>Toll-Free: {inst.tollFree}</span>
                    </div>
                  )}

                  {inst.officialEmail && (
                    <div className="flex items-center gap-1.5 p-1.5 bg-slate-800/60 text-slate-300 rounded-lg border border-slate-700 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{inst.officialEmail}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] text-slate-400">
                    <strong className="text-slate-200">{taggedPostsCount}</strong> active citizen mentions
                  </span>

                  <button
                    onClick={() => onTagInstitutionInNewPost(inst)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Megaphone className="w-3 h-3" /> Report to {inst.shortName}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
