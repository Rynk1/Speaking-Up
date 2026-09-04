import React, { useState } from 'react';
import {
  X,
  Radio,
  Send,
  Building2,
  MapPin,
  FileText,
  AlertOctagon,
  Eye,
  CheckCircle2,
  Link2,
  Tag
} from 'lucide-react';
import { Institution, CivicSituation } from '../../types';
import { api } from '../../services/api';

interface AnnouncementComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentInstitution: Institution;
  linkedSituation?: CivicSituation | null;
  onAnnouncementCreated: () => void;
}

const GHANA_REGIONS = [
  'Greater Accra',
  'Ashanti',
  'Western',
  'Eastern',
  'Central',
  'Northern',
  'Volta',
  'Upper East',
  'Upper West',
  'Bono',
  'Bono East',
  'Ahafo',
  'Oti',
  'Savannah',
  'North East',
  'Western North'
];

const ANNOUNCEMENT_TYPES = [
  { value: 'PUBLIC_ADVISORY', label: 'Public Advisory & Caution' },
  { value: 'SERVICE_DISRUPTION', label: 'Service Disruption / Outage Notice' },
  { value: 'SCHEDULED_MAINTENANCE', label: 'Scheduled Remediation / Maintenance' },
  { value: 'ROAD_CLOSURE', label: 'Traffic Diversion & Road Closure' },
  { value: 'EMERGENCY_DIRECTIVE', label: 'Emergency Protocol Directive' },
  { value: 'REPAIR_COMPLETION', label: 'Intervention / Repair Completion' },
  { value: 'PUBLIC_NOTICE', label: 'General Civic Notice' }
];

export const AnnouncementComposerModal: React.FC<AnnouncementComposerModalProps> = ({
  isOpen,
  onClose,
  currentInstitution,
  linkedSituation,
  onAnnouncementCreated
}) => {
  const [announcementType, setAnnouncementType] = useState('PUBLIC_ADVISORY');
  const [geographicScope, setGeographicScope] = useState<'NATIONAL' | 'REGIONAL' | 'DISTRICT'>(
    linkedSituation ? 'REGIONAL' : 'NATIONAL'
  );
  const [region, setRegion] = useState(linkedSituation?.region || 'Greater Accra');
  const [district, setDistrict] = useState(linkedSituation?.district || '');
  const [title, setTitle] = useState(
    linkedSituation ? `Official Advisory regarding: ${linkedSituation.title}` : ''
  );
  const [summary, setSummary] = useState('');
  const [body, setBody] = useState('');
  const [topic, setTopic] = useState(linkedSituation?.category || 'Public Infrastructure');
  const [officialLinkUrl, setOfficialLinkUrl] = useState('');
  const [officialLinkLabel, setOfficialLinkLabel] = useState('');
  const [isPreview, setIsPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setErrorMessage('Headline title and statement body are required.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      const links = officialLinkUrl.trim()
        ? [{ label: officialLinkLabel.trim() || 'Official Portal', url: officialLinkUrl.trim() }]
        : [];

      await api.createInstitutionAnnouncement(currentInstitution.id, {
        institutionId: currentInstitution.id,
        authorId: 'user-current',
        authorName: currentInstitution.officialName,
        authorTitle: `${currentInstitution.acronym} Official Communications Desk`,
        title: title.trim(),
        summary: summary.trim() || title.trim(),
        body: body.trim(),
        announcementType,
        geographicScope,
        region: geographicScope !== 'NATIONAL' ? region : undefined,
        district: geographicScope === 'DISTRICT' ? district : undefined,
        topic: topic.trim(),
        category: currentInstitution.category,
        officialLinks: links,
        relatedSituationIds: linkedSituation ? [linkedSituation.id] : []
      });

      onAnnouncementCreated();
      onClose();
    } catch (err: any) {
      console.error('Failed to create announcement:', err);
      setErrorMessage(err.message || 'Failed to publish official announcement. Please verify inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      id="announcement-composer-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md overflow-y-auto"
    >
      <div
        id="announcement-composer-modal-card"
        className="bg-slate-900 border border-slate-700/80 rounded-2xl sm:rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">Publish Official State Communiqué</h2>
              <p className="text-xs text-slate-400">
                Broadcasting on behalf of <span className="text-amber-400 font-bold">{currentInstitution.officialName}</span>
              </p>
            </div>
          </div>

          <button
            id="btn-close-announcement-composer"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-950/80 border border-red-700 text-red-300 text-xs flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {linkedSituation && (
            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-700/60 text-amber-200 text-xs flex items-center justify-between">
              <div>
                <span className="font-bold">Attached Situation:</span> {linkedSituation.title}
              </div>
              <span className="text-[10px] font-mono text-amber-400">ID: {linkedSituation.id}</span>
            </div>
          )}

          {/* Toggle Live Preview */}
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => setIsPreview(!isPreview)}
              className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{isPreview ? 'Edit Form' : 'Preview Communiqué'}</span>
            </button>
          </div>

          {isPreview ? (
            /* Live Preview Layout */
            <div className="bg-slate-950 p-5 rounded-2xl border border-amber-600/40 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider">
                    {announcementType.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">
                    Scope: {geographicScope} {geographicScope !== 'NATIONAL' && `(${region})`}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">Live Broadcast Preview</span>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-black text-white">{title || 'Untitled Communiqué'}</h3>
                {summary && <p className="text-xs text-amber-300 font-medium italic">{summary}</p>}
                <div className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed pt-2 border-t border-slate-800/80">
                  {body || 'Official statement body will be displayed here...'}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span>Issued by: {currentInstitution.officialName}</span>
                {officialLinkUrl && (
                  <span className="text-amber-400 underline font-semibold flex items-center gap-1">
                    <Link2 className="w-3 h-3" />
                    {officialLinkLabel || 'Official Documentation'}
                  </span>
                )}
              </div>
            </div>
          ) : (
            /* Input Fields */
            <div className="space-y-4">
              {/* Type and Scope */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Announcement Classification
                  </label>
                  <select
                    value={announcementType}
                    onChange={(e) => setAnnouncementType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-amber-500"
                  >
                    {ANNOUNCEMENT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Geographic Reach Scope
                  </label>
                  <select
                    value={geographicScope}
                    onChange={(e) => setGeographicScope(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="NATIONAL">NATIONAL (All Ghana Citizens)</option>
                    <option value="REGIONAL">REGIONAL (Specific Region)</option>
                    <option value="DISTRICT">DISTRICT (Local Municipality)</option>
                  </select>
                </div>
              </div>

              {/* Regional selection if not national */}
              {geographicScope !== 'NATIONAL' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Target Region</label>
                    <select
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    >
                      {GHANA_REGIONS.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  {geographicScope === 'DISTRICT' && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">District / Assembly</label>
                      <input
                        type="text"
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        placeholder="e.g. Accra Metropolitan, Bantama"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Official Bulletin Headline *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Public Safety Advisory: Drainage Maintenance and Flood Diversion"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              {/* Summary */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Executive Citizen Summary (Optional)
                </label>
                <input
                  type="text"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Short high-priority summary visible on notifications and mobile widgets"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Communique Body */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Full Communiqué Statement Body *
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={6}
                  placeholder="Provide authoritative context, directives, emergency contact hotlines, scheduled timelines, and remedial actions undertaken by the institution..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 leading-relaxed font-sans"
                  required
                />
              </div>

              {/* Topic Tag & External Link */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Primary Topic
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Flood Prevention, Grid Reliability"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Official Reference Link / Hotline (Optional)
                  </label>
                  <input
                    type="url"
                    value={officialLinkUrl}
                    onChange={(e) => setOfficialLinkUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="btn-publish-announcement-submit"
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 transition-colors cursor-pointer shadow-md"
            >
              {submitting ? (
                <>
                  <Radio className="w-3.5 h-3.5 animate-spin" />
                  <span>Publishing Bulletin...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Authorize & Publish Communiqué</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
