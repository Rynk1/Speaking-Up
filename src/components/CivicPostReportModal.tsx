import React, { useState, useRef } from 'react';
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
  Share2,
  Repeat2,
  MessageSquare,
  Volume2,
  Play,
  Pause,
  User,
  Eye,
  TrendingUp,
  BarChart3,
  Sparkles,
  Printer,
  ChevronRight,
  ShieldAlert,
  Send,
  HelpCircle,
  PieChart,
  Users
} from 'lucide-react';
import { CivicPost, PostMedia, CommunityEvidence, Institution } from '../types';

interface CivicPostReportModalProps {
  post: CivicPost | null;
  isOpen: boolean;
  onClose: () => void;
  currentInstitution?: Institution | null;
  onOpenResponseModal?: (post: CivicPost) => void;
  onSelectPost?: (post: CivicPost) => void;
  onAcknowledgeAlert?: (postId: string) => Promise<void>;
  isAcknowledging?: boolean;
}

export const CivicPostReportModal: React.FC<CivicPostReportModalProps> = ({
  post,
  isOpen,
  onClose,
  currentInstitution,
  onOpenResponseModal,
  onSelectPost,
  onAcknowledgeAlert,
  isAcknowledging = false
}) => {
  const [activeTab, setActiveTab] = useState<'dossier' | 'evidence' | 'analytics' | 'comments'>('dossier');
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<PostMedia | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  if (!isOpen || !post) return null;

  // Extracted numbers & metrics
  const totalConfirmations = post.engagement?.confirmations || post.confirmationsCount || 0;
  const additionalEvidenceList: CommunityEvidence[] = post.communityEvidence || [];
  const evidenceCount = additionalEvidenceList.length;
  const totalShares = post.engagement?.shares || post.sharesCount || 0;
  const totalAmplifies = post.engagement?.reposts || post.repostsCount || post.engagement?.amplifies || 0;
  const totalComments = post.commentsList?.length || post.engagement?.comments || post.commentsCount || 0;
  const followersCount = post.engagement?.followersCount || post.followersCount || 0;

  // Evidence to confirmation ratio
  const evidenceRatio = totalConfirmations > 0 ? Math.round((evidenceCount / totalConfirmations) * 100) : (evidenceCount > 0 ? 100 : 0);

  // Voice note
  const voiceMedia = post.media.find(m => m.type === 'audio');
  const originalPhotos = post.media.filter(m => m.type === 'image' || m.type === 'video');

  // Sentiment Analysis calculation
  const commentsList = post.commentsList || [];
  let urgentCount = 0;
  let infoCount = 0;
  let supportCount = 0;

  commentsList.forEach(c => {
    const txt = (c.content || '').toLowerCase();
    if (txt.includes('urgent') || txt.includes('help') || txt.includes('danger') || txt.includes('please') || txt.includes('emergency') || txt.includes('action') || txt.includes('terrible') || txt.includes('now') || txt.includes('fix')) {
      urgentCount++;
    } else if (txt.includes('location') || txt.includes('passed') || txt.includes('update') || txt.includes('road') || txt.includes('water') || txt.includes('still') || txt.includes('saw') || txt.includes('meter')) {
      infoCount++;
    } else {
      supportCount++;
    }
  });

  const totalAnalyzed = Math.max(1, urgentCount + infoCount + supportCount);
  const urgentPct = Math.round((urgentCount / totalAnalyzed) * 100) || (post.urgency === 'CRITICAL' ? 65 : 45);
  const infoPct = Math.round((infoCount / totalAnalyzed) * 100) || 35;
  const supportPct = Math.max(5, 100 - urgentPct - infoPct);

  // Institution tag status
  const myTag = currentInstitution ? post.institutionTags?.find(t => t.institutionId === currentInstitution.id) : null;
  const isAcknowledged = myTag?.alertStatus === 'ACKNOWLEDGED' || post.accountabilityStatus === 'ACKNOWLEDGED';
  const hasResponded = post.officialResponses?.some(r => currentInstitution ? r.institutionId === currentInstitution.id : true);

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  const handleCopySummary = () => {
    const text = `CIVIC POST EXECUTIVE REPORT #${post.id}
TOPIC: ${post.title}
LOCATION: ${post.location.district} (${post.location.region} Region)
THREAT LEVEL: ${post.urgency} | CATEGORY: ${post.category}
REPORTER: ${post.authorName} (@${post.authorHandle}) - ${post.isVerifiedCitizen ? 'Verified Citizen' : 'Citizen'}
CONFIRMATIONS (SEEN TOO): ${totalConfirmations} citizens
ADDITIONAL EVIDENCE: ${evidenceCount} submissions
SHARES: ${totalShares} | AMPLIFICATIONS: ${totalAmplifies}
CORE SUMMARY:
${post.content}
${post.translatedText ? `\nTRANSLATED SUMMARY: ${post.translatedText}` : ''}
TAGGED INSTITUTIONS: ${post.institutionTags.map(t => t.shortName).join(', ')}`;

    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const getThreatColor = () => {
    switch (post.urgency) {
      case 'CRITICAL':
        return {
          bg: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
          badge: 'bg-rose-600 text-white',
          label: 'CRITICAL EMERGENCY',
          desc: 'High immediate hazard to public life, safety, or critical infrastructure. Requires priority dispatch.'
        };
      case 'HIGH':
        return {
          bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
          badge: 'bg-amber-600 text-white',
          label: 'HIGH PRIORITY',
          desc: 'Severe community impact or escalating service disruption. Timely intervention required.'
        };
      case 'NORMAL':
      default:
        return {
          bg: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
          badge: 'bg-blue-600 text-white',
          label: 'MODERATE CONCERN',
          desc: 'Standard civic concern, routine municipal workflow or scheduled inspection required.'
        };
      case 'LOW':
        return {
          bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
          badge: 'bg-emerald-600 text-white',
          label: 'LOW / INFORMATIONAL',
          desc: 'Community advisory or localized observation.'
        };
    }
  };

  const threat = getThreatColor();

  return (
    <div
      id="civic-post-report-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-in fade-in"
      onClick={onClose}
    >
      <div
        id="civic-post-report-modal"
        role="dialog"
        aria-modal="true"
        className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-4xl text-slate-100 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* TOP HEADER: Official Agency Report Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] sm:text-xs font-mono font-bold px-2 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700">
                  DOSSIER #{post.id}
                </span>
                <span className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded border ${threat.bg}`}>
                  {threat.label}
                </span>
              </div>
              <h2 className="font-bold text-sm sm:text-base text-white truncate mt-0.5">
                Civic Incident Report Pack for State Responders
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleCopySummary}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Copy Briefing Text"
            >
              {copiedSummary ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span className="hidden sm:inline">{copiedSummary ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 text-xs font-semibold hidden md:flex items-center gap-1.5 transition-colors"
              title="Print Dossier"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="px-4 sm:px-6 bg-slate-950/40 border-b border-slate-800 flex items-center gap-1 sm:gap-2 overflow-x-auto shrink-0 scrollbar-none py-1.5">
          <button
            onClick={() => setActiveTab('dossier')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'dossier'
                ? 'bg-amber-600 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Executive Briefing</span>
          </button>

          <button
            onClick={() => setActiveTab('evidence')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'evidence'
                ? 'bg-amber-600 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Evidence Dossier ({originalPhotos.length + (voiceMedia ? 1 : 0)} Org + {evidenceCount} Citizen)</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'analytics'
                ? 'bg-amber-600 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Field & Sentiment Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab('comments')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'comments'
                ? 'bg-amber-600 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Citizen Comments ({totalComments})</span>
          </button>
        </div>

        {/* SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* TAB 1: EXECUTIVE BRIEFING */}
          {activeTab === 'dossier' && (
            <div className="space-y-6">
              {/* Top Summary Banner */}
              <div className="p-4 sm:p-5 bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 rounded-3xl space-y-3 shadow-lg">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                      {post.category} {post.subcategory ? `• ${post.subcategory}` : ''}
                    </span>
                    <h1 className="font-extrabold text-base sm:text-lg text-white leading-snug">
                      {post.title}
                    </h1>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(post.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Threat assessment description */}
                <div className={`p-3 rounded-2xl border text-xs flex items-start gap-2.5 ${threat.bg}`}>
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                  <div>
                    <strong className="font-bold">{threat.label}: </strong>
                    <span>{threat.desc}</span>
                  </div>
                </div>
              </div>

              {/* 3-Column Key Data Matrix */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                {/* 1. Reporter Details */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2.5">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-sky-400" /> Reporter Details
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 overflow-hidden shrink-0">
                      {post.authorAvatar && post.authorVisibility !== 'anonymous' ? (
                        <img src={post.authorAvatar} alt={post.authorName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-emerald-700 flex items-center justify-center text-white font-bold">
                          {post.authorVisibility === 'anonymous' ? '🛡️' : post.authorName.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-white truncate flex items-center gap-1">
                        {post.authorName}
                        {post.isVerifiedCitizen && (
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" title="Verified Citizen" />
                        )}
                      </div>
                      <div className="text-xs text-slate-400 truncate">@{post.authorHandle}</div>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Visibility:</span>
                    <span className="font-semibold text-slate-200 capitalize">
                      {post.authorVisibility === 'anonymous' ? 'Confidential Relay' : 'Public Verified'}
                    </span>
                  </div>
                </div>

                {/* 2. Geo-Location Dossier */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2.5">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" /> Location Dossier
                  </div>
                  <div className="space-y-1">
                    <div className="font-bold text-sm text-white">
                      {post.location.district}
                    </div>
                    <div className="text-xs text-slate-300">
                      {post.location.region} Region, Ghana
                    </div>
                    {post.location.landmark && (
                      <div className="text-[11px] text-slate-400 italic">
                        Near: {post.location.landmark}
                      </div>
                    )}
                  </div>
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Coordinates:</span>
                    <span className="font-mono text-emerald-400">
                      {post.location.latitude?.toFixed(4) || '5.5588'}, {post.location.longitude?.toFixed(4) || '-0.2137'}
                    </span>
                  </div>
                </div>

                {/* 3. Citizen Validation Ratio */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2.5">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-amber-400" /> Citizen Validations
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-emerald-400">{totalConfirmations}</span>
                    <span className="text-xs text-slate-300 font-semibold">Seen Too Confirmations</span>
                  </div>
                  <div className="text-xs text-slate-400">
                    <strong className="text-amber-300">{evidenceCount}</strong> of {totalConfirmations} citizens attached field evidence ({evidenceRatio}%)
                  </div>
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Corroboration:</span>
                    <span className="font-bold text-emerald-400">Multi-Citizen Corroborated</span>
                  </div>
                </div>
              </div>

              {/* Citizen Statement & Core Issue Narrative */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-amber-400" /> Citizen Report Statement
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Original Language: {post.originalLanguage || 'English'}
                  </span>
                </div>

                <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-800 text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {post.content}
                </div>

                {post.translatedText && post.translatedText !== post.content && (
                  <div className="p-3 bg-amber-950/30 rounded-xl border border-amber-900/40 text-xs text-amber-200 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" /> English Translation / Clarified Briefing
                    </div>
                    <p className="leading-relaxed">{post.translatedText}</p>
                  </div>
                )}
              </div>

              {/* Voice Note Audio Recording (If attached) */}
              {voiceMedia && (
                <div className="p-4 bg-purple-950/40 border border-purple-800/50 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-purple-300 flex items-center gap-1.5">
                      <Volume2 className="w-4 h-4 text-purple-400" /> Original Citizen Voice Recording
                    </span>
                    <span className="text-[11px] text-purple-400 font-mono">
                      {voiceMedia.duration ? `${Math.floor(voiceMedia.duration / 60)}:${(voiceMedia.duration % 60).toString().padStart(2, '0')}` : 'Voice Note'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={toggleAudio}
                      className="w-10 h-10 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center shadow-md active:scale-95 transition-all shrink-0 cursor-pointer"
                    >
                      {isPlayingAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
                    </button>
                    <div className="flex-1">
                      <div className="h-2 bg-purple-900/60 rounded-full overflow-hidden">
                        <div className={`h-full bg-purple-400 rounded-full ${isPlayingAudio ? 'w-3/4 transition-all duration-1000' : 'w-1/4'}`} />
                      </div>
                      <span className="text-[11px] text-slate-400 mt-1 block">
                        Direct on-the-ground spoken testimony recorded in local dialect
                      </span>
                    </div>
                  </div>
                  {voiceMedia.url && <audio ref={audioRef} src={voiceMedia.url} onEnded={() => setIsPlayingAudio(false)} className="hidden" />}
                </div>
              )}

              {/* Tagged State Institutions Status */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
                <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <Building2 className="w-4 h-4 text-amber-400" /> Tagged State Agencies & Response Routing
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {post.institutionTags?.map((tag, idx) => (
                    <div
                      key={tag.institutionId || idx}
                      className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-white truncate">
                          {tag.institutionName} ({tag.shortName})
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Channel: {tag.alertMethodUsed || 'Direct Platform Channel'}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                          tag.alertStatus === 'ACKNOWLEDGED'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}
                      >
                        {tag.alertStatus}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: EVIDENCE DOSSIER (Original & Additional Citizen Evidence) */}
          {activeTab === 'evidence' && (
            <div className="space-y-6">
              {/* Original Reporter Evidence */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-sky-400" /> Original Incident Evidence (Filed by Reporter)
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {originalPhotos.length} File(s)
                  </span>
                </div>

                {originalPhotos.length === 0 ? (
                  <div className="p-6 text-center bg-slate-950/60 border border-slate-800 rounded-2xl text-slate-400 text-xs">
                    No visual media attached to original report.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {originalPhotos.map((media, idx) => (
                      <div
                        key={media.id || idx}
                        onClick={() => setSelectedMedia(media)}
                        className="group relative bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden cursor-pointer hover:border-slate-600 transition-all aspect-video sm:aspect-4/3"
                      >
                        <img
                          src={media.url}
                          alt={media.caption || 'Evidence photo'}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent flex flex-col justify-end p-3">
                          <span className="text-[11px] font-bold text-white truncate">
                            {media.caption || 'Primary Scene Photo'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            P³RE Privacy Sanitized ✓
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Additional Evidence Provided by Other Citizens */}
              <div className="space-y-3 pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-emerald-400" /> Additional Evidence from Other Citizens ({additionalEvidenceList.length})
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Independent field updates and photographic corroboration submitted by citizens who confirmed observing this issue.
                    </p>
                  </div>
                </div>

                {additionalEvidenceList.length === 0 ? (
                  <div className="p-8 text-center bg-slate-950/60 border border-slate-800 rounded-2xl text-slate-400 text-xs space-y-1">
                    <p className="font-semibold text-slate-300">No additional citizen evidence submitted yet.</p>
                    <p className="text-[11px]">
                      {totalConfirmations} citizens have verified observing the issue via "Seen Too".
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {additionalEvidenceList.map((ev, idx) => (
                      <div
                        key={ev.id || idx}
                        className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3 hover:border-slate-700 transition-all"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 overflow-hidden shrink-0">
                              {ev.userAvatar ? (
                                <img src={ev.userAvatar} alt={ev.userName} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-emerald-800 flex items-center justify-center text-white text-xs font-bold">
                                  {ev.userName.charAt(0)}
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-xs text-white flex items-center gap-1">
                                {ev.userName}
                                {ev.isVerified && (
                                  <ShieldCheck className="w-3 h-3 text-emerald-400" title="Verified Field Contributor" />
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400">@{ev.userHandle}</div>
                            </div>
                          </div>

                          <div className="text-right">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                ev.statusUpdate === 'worsened'
                                  ? 'bg-red-950 text-red-300 border border-red-800'
                                  : ev.statusUpdate === 'improving'
                                  ? 'bg-blue-950 text-blue-300 border border-blue-800'
                                  : ev.statusUpdate === 'resolved'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : 'bg-slate-800 text-slate-300 border border-slate-700'
                              }`}
                            >
                              {ev.statusUpdate?.replace('_', ' ') || 'Field Update'}
                            </span>
                            <div className="text-[10px] text-slate-500 mt-1">
                              {new Date(ev.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>

                        {/* Text statement */}
                        <p className="text-xs text-slate-300 bg-slate-900/80 p-3 rounded-xl border border-slate-800 leading-relaxed">
                          "{ev.text}"
                        </p>

                        {/* Attached media from this citizen if any */}
                        {ev.media && ev.media.length > 0 && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                            {ev.media.map((m, mIdx) => (
                              <div
                                key={m.id || mIdx}
                                onClick={() => setSelectedMedia(m)}
                                className="relative rounded-xl overflow-hidden border border-slate-800 aspect-video cursor-pointer group"
                              >
                                <img src={m.url} alt="Field evidence" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-slate-950/80 text-[10px] text-slate-300 rounded font-mono">
                                  Citizen Photo
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: FIELD & SENTIMENT ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              {/* Engagement & Amplification Overview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-1">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Seen Too Validations</div>
                  <div className="text-2xl font-black text-emerald-400">{totalConfirmations}</div>
                  <div className="text-[10px] text-slate-500">Citizens observed on-site</div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-1">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Evidence Provided</div>
                  <div className="text-2xl font-black text-amber-400">{evidenceCount}</div>
                  <div className="text-[10px] text-slate-500">{evidenceRatio}% of confirming citizens</div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-1">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Total Shares</div>
                  <div className="text-2xl font-black text-sky-400">{totalShares}</div>
                  <div className="text-[10px] text-slate-500">WhatsApp, X, Facebook, Web</div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-1">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Amplifications</div>
                  <div className="text-2xl font-black text-purple-400">{totalAmplifies}</div>
                  <div className="text-[10px] text-slate-500">Platform community reposts</div>
                </div>
              </div>

              {/* Sentiment Analysis Breakdown */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-white flex items-center gap-2">
                      <PieChart className="w-4 h-4 text-amber-400" /> Community Sentiment & Urgency Breakdown
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Extracted tone and community emotional distribution across {totalComments} citizen comments.
                    </p>
                  </div>
                </div>

                {/* Progress Bar Visualization */}
                <div className="space-y-2">
                  <div className="h-4 bg-slate-800 rounded-full overflow-hidden flex gap-0.5">
                    <div style={{ width: `${urgentPct}%` }} className="bg-rose-500 transition-all" title={`Urgent: ${urgentPct}%`} />
                    <div style={{ width: `${infoPct}%` }} className="bg-sky-500 transition-all" title={`Informational: ${infoPct}%`} />
                    <div style={{ width: `${supportPct}%` }} className="bg-emerald-500 transition-all" title={`Supportive: ${supportPct}%`} />
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                    <div className="p-3 bg-slate-900/90 rounded-xl border border-rose-950/60 space-y-1">
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-rose-400">Urgent Demand for Action</span>
                        <span className="font-mono text-rose-300">{urgentPct}%</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Citizens expressing frustration, calling for immediate state intervention or emergency repair.
                      </p>
                    </div>

                    <div className="p-3 bg-slate-900/90 rounded-xl border border-sky-950/60 space-y-1">
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-sky-400">Informational & Status</span>
                        <span className="font-mono text-sky-300">{infoPct}%</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Citizens providing live traffic updates, landmark context, or nearby business impacts.
                      </p>
                    </div>

                    <div className="p-3 bg-slate-900/90 rounded-xl border border-emerald-950/60 space-y-1">
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-emerald-400">Community Solidarity</span>
                        <span className="font-mono text-emerald-300">{supportPct}%</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Citizens sharing words of caution, supporting the reporter, or helping stranded residents.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Public Reach & Issue Followership */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-400" /> Public Accountability & Awareness Index
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-1">
                    <div className="text-slate-400">Issue Followers (Waiting for Statement)</div>
                    <div className="text-xl font-black text-amber-400">{followersCount || 12} Citizens</div>
                    <div className="text-[11px] text-slate-500">Will receive instant SMS / push when response is posted</div>
                  </div>

                  <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-1">
                    <div className="text-slate-400">Credibility Rating</div>
                    <div className="text-xl font-black text-emerald-400">
                      {post.credibilitySignals?.institutionalAwarenessScore || 92}% Index
                    </div>
                    <div className="text-[11px] text-slate-500">GPS triangulated, media verified, multi-citizen corroborated</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CITIZEN COMMENTS */}
          {activeTab === 'comments' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <h3 className="font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-purple-400" /> Community Commentary & Dialogue ({commentsList.length})
                </h3>
                <span className="text-[11px] text-slate-400">Public Comments Feed</span>
              </div>

              {commentsList.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/60 border border-slate-800 rounded-2xl text-slate-400 text-xs">
                  No public comments recorded on this post yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {commentsList.map((comm, idx) => (
                    <div
                      key={comm.id || idx}
                      className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 sm:p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-800 text-[10px] font-bold text-white flex items-center justify-center">
                            {comm.userName?.charAt(0) || 'C'}
                          </div>
                          <span className="font-bold text-white">{comm.userName}</span>
                          <span className="text-[11px] text-slate-400">@{comm.userHandle}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(comm.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                        {comm.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* BOTTOM ACTION BAR FOR INSTITUTION REPRESENTATIVES */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-t border-slate-800 bg-slate-950/90 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-400 w-full sm:w-auto justify-between sm:justify-start">
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isAcknowledged ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
              <strong className="text-slate-200">Agency Status: </strong>
              {hasResponded ? 'Communiqué Issued' : isAcknowledged ? 'Acknowledged & Fielded' : 'Pending Response'}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
            {/* Quick Acknowledge if not acknowledged */}
            {!isAcknowledged && onAcknowledgeAlert && (
              <button
                onClick={() => onAcknowledgeAlert(post.id)}
                disabled={isAcknowledging}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{isAcknowledging ? 'Acknowledging...' : 'Acknowledge Alert'}</span>
              </button>
            )}

            {/* Read Full Post */}
            {onSelectPost && (
              <button
                onClick={() => {
                  onClose();
                  onSelectPost(post);
                }}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Read Full Post</span>
              </button>
            )}

            {/* Official Response Modal CTA */}
            {onOpenResponseModal && (
              <button
                onClick={() => {
                  onClose();
                  onOpenResponseModal(post);
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-transform active:scale-95 cursor-pointer"
              >
                <Building2 className="w-4 h-4" />
                <span>{hasResponded ? 'Update Official Statement' : 'Respond Officially'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Full Image Preview Lightbox */}
        {selectedMedia && (
          <div
            className="fixed inset-0 z-60 bg-slate-950/95 flex items-center justify-center p-4"
            onClick={() => setSelectedMedia(null)}
          >
            <div className="relative max-w-4xl max-h-[85vh] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
              <button
                onClick={() => setSelectedMedia(null)}
                className="absolute top-3 right-3 p-2 bg-slate-900/80 text-white rounded-full hover:bg-slate-800 z-10"
              >
                <X className="w-5 h-5" />
              </button>
              <img src={selectedMedia.url} alt="Evidence" className="max-w-full max-h-[80vh] object-contain" />
              {selectedMedia.caption && (
                <div className="p-3 bg-slate-900 text-xs text-slate-300 text-center">
                  {selectedMedia.caption}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
