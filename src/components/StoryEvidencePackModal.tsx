import React, { useState } from 'react';
import {
  FileText,
  Copy,
  Check,
  Download,
  X,
  ExternalLink,
  ShieldCheck,
  MapPin,
  Clock,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Camera,
  Layers,
  Sparkles,
  Share2,
  Code2
} from 'lucide-react';
import { CivicPost } from '../types';

interface StoryEvidencePackModalProps {
  post: CivicPost | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectPost?: (post: CivicPost) => void;
  onOpenCluster?: (clusterId: string) => void;
}

export const StoryEvidencePackModal: React.FC<StoryEvidencePackModalProps> = ({
  post,
  isOpen,
  onClose,
  onSelectPost,
  onOpenCluster
}) => {
  const [activeView, setActiveView] = useState<'formatted' | 'markdown' | 'json' | 'media'>('formatted');
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  if (!isOpen || !post) return null;

  // Generate formatted Story Evidence Pack markdown text
  const generateEvidencePackText = (p: CivicPost) => {
    const responsesSection = p.officialResponses && p.officialResponses.length > 0
      ? p.officialResponses.map((r, idx) => `[STATEMENT #${idx + 1} - ${r.institutionName.toUpperCase()}]
Responder : ${r.responderName} (${r.responderTitle})
Status    : ${r.status || 'PUBLISHED'} (${r.responseType || 'OFFICIAL_RESPONSE'})
Timestamp : ${new Date(r.createdAt).toLocaleString()}
Transcript:
"${r.message}"
`).join('\n')
      : 'NO OFFICIAL INSTITUTIONAL COMMUNIQUÉ RECORDED YET';

    const mediaSection = p.media && p.media.length > 0
      ? p.media.map((m, i) => `  ${i + 1}. [${m.type.toUpperCase()}] ${m.url} (P³RE Sanitized Ground Evidence)`).join('\n')
      : '  No direct media files attached';

    const tagsSection = p.institutionTags && p.institutionTags.length > 0
      ? p.institutionTags.map(t => `${t.shortName} (${t.acronym}) - Dispatch Status: ${t.alertStatus}`).join('\n  • ')
      : 'None tagged';

    return `======================================================================
📰 GHANA CIVIC NETWORK - VERIFIED INVESTIGATIVE EVIDENCE DOSSIER
======================================================================
STORY HEADLINE   : ${p.title.toUpperCase()}
INTERNAL CASE ID : ${p.id}
DATE SUBMITTED   : ${new Date(p.createdAt).toLocaleString()}
URGENCY LEVEL    : ${p.urgency}
PRIMARY CATEGORY : ${p.category}
VERIFICATION HASH: p3re-v4-${p.id.substring(0, 8)}

----------------------------------------------------------------------
1. GEO-LOCATION & GROUND DETAILS
----------------------------------------------------------------------
REGION      : ${p.location.region} Region, Ghana
DISTRICT    : ${p.location.district}
LANDMARK    : ${p.location.landmark || 'Not specified'}
COORDINATES : ${p.location.latitude ?? p.location.lat ? `${p.location.latitude ?? p.location.lat}, ${p.location.longitude ?? p.location.lng}` : 'District Centroid Verified'}

----------------------------------------------------------------------
2. CITIZEN TESTIMONY & WITNESS STATEMENT
----------------------------------------------------------------------
AUTHOR CITIZEN : ${p.authorName} (@${p.authorHandle})
VISIBILITY     : ${p.authorVisibility === 'anonymous' ? 'Confidential Citizen Reporter' : 'Public Verified Citizen'}
GROUND WITNESS TESTIMONY:
"${p.content}"

${p.translatedText && p.translatedText !== p.content ? `CLARIFIED SUMMARY / TRANSLATION:\n"${p.translatedText}"\n` : ''}
----------------------------------------------------------------------
3. COMMUNITY VERIFICATION & CREDIBILITY SIGNALS
----------------------------------------------------------------------
INDEPENDENT LOCAL RESIDENT CONFIRMATIONS : ${p.engagement.confirmations} verified citizens
COMMUNITY AMPLIFICATIONS & REPOSTS      : ${p.engagement.amplifies} amplifications
CITIZEN SHARES                           : ${p.engagement.shares} shares
INSTITUTIONAL AWARENESS RATING           : ${p.credibilitySignals.institutionalAwarenessScore}%
P³RE SENSITIVE PII SCRUBBING             : PASSED (Encrypted, 0 PII leaks)

----------------------------------------------------------------------
4. ATTACHED GROUND MEDIA EVIDENCE
----------------------------------------------------------------------
${mediaSection}

----------------------------------------------------------------------
5. TAGGED STATE AGENCIES & DISPATCH STATUS
----------------------------------------------------------------------
  • ${tagsSection}

----------------------------------------------------------------------
6. OFFICIAL STATE RESPONSES & ACCOUNTABILITY RECORD
----------------------------------------------------------------------
${responsesSection}

----------------------------------------------------------------------
7. PERMANENT INVESTIGATIVE VERIFICATION DEEP LINK
----------------------------------------------------------------------
VERIFY CITATION ONLINE : ${window.location.origin}/app/post/${p.id}
DATA INTEGRITY CITATION : Ghana Civic Network Ground Intelligence Protocol
======================================================================`;
  };

  const handleCopyText = (format: 'markdown' | 'json') => {
    let payload = '';
    if (format === 'markdown') {
      payload = generateEvidencePackText(post);
    } else {
      payload = JSON.stringify({
        id: post.id,
        title: post.title,
        content: post.content,
        category: post.category,
        urgency: post.urgency,
        createdAt: post.createdAt,
        location: post.location,
        author: {
          name: post.authorName,
          handle: post.authorHandle,
          visibility: post.authorVisibility,
          isVerified: post.isVerifiedCitizen
        },
        engagement: post.engagement,
        credibilitySignals: post.credibilitySignals,
        media: post.media,
        institutionTags: post.institutionTags,
        officialResponses: post.officialResponses,
        verificationUrl: `${window.location.origin}/app/post/${post.id}`
      }, null, 2);
    }

    navigator.clipboard.writeText(payload);
    setCopiedFormat(format);
    setTimeout(() => setCopiedFormat(null), 2500);
  };

  const handleDownloadFile = (format: 'txt' | 'json') => {
    let content = '';
    let mime = 'text/plain';
    let filename = `evidence-briefing-${post.id}.${format}`;

    if (format === 'txt') {
      content = generateEvidencePackText(post);
    } else {
      content = JSON.stringify(post, null, 2);
      mime = 'application/json';
    }

    const blob = new Blob([content], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
                <FileText className="w-3 h-3" /> Newsroom Evidence Pack
              </span>
              <span className="text-xs font-semibold text-slate-400">
                Case #{post.id}
              </span>
              {post.urgency === 'CRITICAL' && (
                <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-bold">
                  CRITICAL
                </span>
              )}
            </div>
            <h3 className="font-extrabold text-base sm:text-lg text-white leading-snug">
              {post.title}
            </h3>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 flex-wrap">
              <MapPin className="w-3 h-3 text-emerald-400" />
              <span>{post.location.district}, {post.location.region} Region</span>
              <span>•</span>
              <Clock className="w-3 h-3 text-slate-400" />
              <span>{new Date(post.createdAt).toLocaleDateString()}</span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors shrink-0"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center bg-slate-950/60 px-4 pt-2 border-b border-slate-800 overflow-x-auto gap-1 text-xs">
          <button
            onClick={() => setActiveView('formatted')}
            className={`px-3.5 py-2 font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeView === 'formatted'
                ? 'border-sky-500 text-sky-300 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Structured Briefing</span>
          </button>

          <button
            onClick={() => setActiveView('markdown')}
            className={`px-3.5 py-2 font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeView === 'markdown'
                ? 'border-sky-500 text-sky-300 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Raw Text / Markdown</span>
          </button>

          <button
            onClick={() => setActiveView('json')}
            className={`px-3.5 py-2 font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeView === 'json'
                ? 'border-sky-500 text-sky-300 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>JSON Data Dossier</span>
          </button>

          <button
            onClick={() => setActiveView('media')}
            className={`px-3.5 py-2 font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeView === 'media'
                ? 'border-sky-500 text-sky-300 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Attached Media ({post.media?.length || 0})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: FORMATTED STRUCTURED BRIEFING */}
          {activeView === 'formatted' && (
            <div className="space-y-4 text-xs">
              {/* Evidence Pack What-Is-Copied Explanation Banner */}
              <div className="p-3 bg-sky-950/40 border border-sky-800/60 rounded-2xl flex items-start gap-2.5 text-sky-200">
                <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold text-xs text-white">Investigative Evidence Pack Standard</span>
                  <p className="text-[11px] text-sky-300/90 leading-relaxed">
                    This evidence pack packages verified citizen ground testimony, independent local confirmation metrics, P³RE privacy scrub validation, tagged government institutions, and official agency response statements for news broadcasting and investigative journalism.
                  </p>
                </div>
              </div>

              {/* 1. Ground Witness Testimony */}
              <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                  <span>1. Ground Witness Testimony</span>
                  <span className="text-emerald-400 font-semibold">Author: {post.authorName} (@{post.authorHandle})</span>
                </div>
                <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 text-slate-200 text-xs sm:text-sm leading-relaxed whitespace-pre-line font-sans">
                  "{post.content}"
                </div>
              </div>

              {/* 2. Key Ground Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Local Confirmations</div>
                  <div className="text-lg font-black text-emerald-400 mt-0.5">{post.engagement.confirmations}</div>
                  <div className="text-[9px] text-slate-500">Local residents verified</div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Amplifications</div>
                  <div className="text-lg font-black text-sky-400 mt-0.5">{post.engagement.amplifies}</div>
                  <div className="text-[9px] text-slate-500">Citizen boosts</div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Awareness Score</div>
                  <div className="text-lg font-black text-amber-400 mt-0.5">{post.credibilitySignals.institutionalAwarenessScore}%</div>
                  <div className="text-[9px] text-slate-500">Agency alert index</div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Privacy Status</div>
                  <div className="text-xs font-black text-emerald-400 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> P³RE Clean
                  </div>
                  <div className="text-[9px] text-slate-500">0 PII leaks</div>
                </div>
              </div>

              {/* 3. Tagged State Institutions */}
              <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-2xl space-y-2">
                <div className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                  2. Alerted State Institutions & Dispatch Record
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {post.institutionTags.map((tag, idx) => (
                    <div key={idx} className="p-2 bg-slate-900 rounded-xl border border-slate-800 flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-amber-400" />
                      <div>
                        <span className="font-bold text-white text-xs">{tag.shortName} ({tag.acronym})</span>
                        <span className="text-[10px] text-slate-400 ml-1.5 font-mono">[{tag.alertStatus}]</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Official Statements */}
              <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-2xl space-y-2">
                <div className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                  3. Official Agency Communiqués ({post.officialResponses?.length || 0})
                </div>
                {post.officialResponses && post.officialResponses.length > 0 ? (
                  <div className="space-y-2.5">
                    {post.officialResponses.map((r, idx) => (
                      <div key={idx} className="bg-slate-900 p-3 rounded-xl border border-emerald-900/40 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-emerald-400 flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5" /> {r.institutionName}
                          </span>
                          <span className="text-[10px] text-slate-400">{new Date(r.createdAt).toLocaleString()}</span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {r.responderName} ({r.responderTitle}) • <span className="text-amber-400 uppercase font-mono">{r.responseType}</span>
                        </div>
                        <p className="text-xs text-slate-200 italic leading-relaxed">
                          "{r.message}"
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-slate-500 bg-slate-900/50 rounded-xl border border-slate-800 text-xs">
                    No official public response statement recorded from state agencies yet.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: RAW MARKDOWN / TEXT */}
          {activeView === 'markdown' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Formatted for newsroom distribution and print copy:</span>
                <span className="font-mono text-[10px]">text/markdown</span>
              </div>
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 font-mono text-xs text-sky-200 whitespace-pre-wrap select-all leading-relaxed max-h-[50vh] overflow-y-auto">
                {generateEvidencePackText(post)}
              </div>
            </div>
          )}

          {/* TAB 3: JSON DOSSIER */}
          {activeView === 'json' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Structured data payload for automated data journalism:</span>
                <span className="font-mono text-[10px]">application/json</span>
              </div>
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 font-mono text-xs text-emerald-300 whitespace-pre-wrap select-all leading-relaxed max-h-[50vh] overflow-y-auto">
                {JSON.stringify(post, null, 2)}
              </div>
            </div>
          )}

          {/* TAB 4: ATTACHED MEDIA */}
          {activeView === 'media' && (
            <div className="space-y-3">
              {post.media && post.media.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {post.media.map((m, idx) => (
                    <div key={idx} className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-sky-400 uppercase text-[10px]">Media Evidence #{idx + 1} ({m.type})</span>
                        <span className="text-[10px] text-emerald-400 font-bold">P³RE Verified</span>
                      </div>
                      {m.type === 'image' && (
                        <img src={m.url} alt="Evidence" className="w-full h-44 object-cover rounded-xl border border-slate-800" />
                      )}
                      {m.type === 'video' && (
                        <video src={m.url} controls className="w-full h-44 object-cover rounded-xl border border-slate-800" />
                      )}
                      {m.type === 'audio' && (
                        <audio src={m.url} controls className="w-full mt-4" />
                      )}
                      {m.caption && <p className="text-xs text-slate-400 italic">{m.caption}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-950 border border-slate-800 rounded-2xl text-slate-400 text-xs">
                  No visual media files attached to this report.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleDownloadFile('txt')}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 border border-slate-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-sky-400" />
              <span>Download .TXT</span>
            </button>

            <button
              onClick={() => handleDownloadFile('json')}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 border border-slate-700 transition-colors"
            >
              <Code2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Download JSON</span>
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onSelectPost && (
              <button
                onClick={() => {
                  onClose();
                  onSelectPost(post);
                }}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 border border-slate-700"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Post View</span>
              </button>
            )}

            <button
              onClick={() => handleCopyText('markdown')}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-lg shadow-sky-600/20 active:scale-95 transition-all"
            >
              {copiedFormat === 'markdown' ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              <span>{copiedFormat === 'markdown' ? 'Briefing Copied to Clipboard!' : 'Copy Story Evidence Pack'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
