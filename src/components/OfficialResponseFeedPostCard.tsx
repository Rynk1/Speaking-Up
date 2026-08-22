import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  Info,
  Building2,
  FileText,
  Copy,
  Check,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Share2,
  Phone,
  ArrowRight,
  Send,
  Heart,
  ChevronDown,
  ChevronUp,
  Sparkles,
  MapPin,
  Flame,
  AlertTriangle,
  FileCheck2,
  MoreVertical,
  Flag,
  BadgeCheck
} from 'lucide-react';
import { CivicPost, InstitutionResponse, ResponseComment } from '../types';
import { api } from '../services/api';
import { formatCount } from '../utils/format';

interface OfficialResponseFeedPostCardProps {
  post: CivicPost;
  response: InstitutionResponse;
  currentUser?: any;
  onOpenStatementModal: (post: CivicPost, response: InstitutionResponse) => void;
  onJumpToOriginalPost?: (post: CivicPost) => void;
  onPostUpdated?: () => void;
  onOpenShare?: (post: CivicPost, response?: InstitutionResponse) => void;
  onOpenReportAbuse?: (postId: string) => void;
}

export const OfficialResponseFeedPostCard: React.FC<OfficialResponseFeedPostCardProps> = ({
  post,
  response: initialResponse,
  currentUser,
  onOpenStatementModal,
  onJumpToOriginalPost,
  onPostUpdated,
  onOpenShare,
  onOpenReportAbuse
}) => {
  const [response, setResponse] = useState<InstitutionResponse>(initialResponse);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<ResponseComment[]>(initialResponse.commentsList || []);
  const [newCommentText, setNewCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [helpfulVote, setHelpfulVote] = useState<'helpful' | 'unhelpful' | null>(
    initialResponse.userHelpfulVote || null
  );
  const [helpfulCount, setHelpfulCount] = useState(initialResponse.helpfulCount || 0);
  const [unhelpfulCount, setUnhelpfulCount] = useState(initialResponse.unhelpfulCount || 0);
  const [copiedRef, setCopiedRef] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleCopyRef = (e: React.MouseEvent) => {
    e.stopPropagation();
    const ref = response.referenceNumber || `REF-${response.id}`;
    navigator.clipboard.writeText(ref);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const handleVote = async (e: React.MouseEvent, voteType: 'helpful' | 'unhelpful') => {
    e.stopPropagation();
    try {
      const res = await api.voteResponseHelpful(response.id, voteType, currentUser?.id);
      setHelpfulCount(res.helpfulCount);
      setUnhelpfulCount(res.unhelpfulCount);
      setHelpfulVote(res.userVote as any);
    } catch (err) {
      console.error('Vote failed', err);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || submittingComment) return;

    try {
      setSubmittingComment(true);
      const newComment = await api.addResponseComment(response.id, newCommentText.trim(), {
        userName: currentUser?.name || 'Concerned Citizen',
        userHandle: currentUser?.handle || 'citizen_gh'
      });
      setComments(prev => [...prev, newComment]);
      setNewCommentText('');
      setResponse(prev => ({
        ...prev,
        commentsCount: (prev.commentsCount || 0) + 1
      }));
      if (onPostUpdated) onPostUpdated();
    } catch (err) {
      console.error('Error posting response comment:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    try {
      const res = await api.likeResponseComment(commentId);
      setComments(prev =>
        prev.map(c => (c.id === commentId ? { ...c, likesCount: res.likesCount, userLiked: true } : c))
      );
    } catch (err) {
      console.error('Like failed', err);
    }
  };

  // Response Type Color & Icon
  const getResponseTypeMeta = (type: string) => {
    switch (type) {
      case 'ACTION_TAKEN':
        return {
          label: 'Direct Action Taken / Teams Active',
          badgeBg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
          borderLeft: 'border-l-emerald-500',
          icon: CheckCircle2
        };
      case 'INVESTIGATING':
        return {
          label: 'Investigation & Assessment Underway',
          badgeBg: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
          borderLeft: 'border-l-amber-500',
          icon: Clock
        };
      case 'PUBLIC_GUIDANCE':
        return {
          label: 'Official Public Safety Guidance',
          badgeBg: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30',
          borderLeft: 'border-l-sky-500',
          icon: ShieldCheck
        };
      case 'WE_ARE_AWARE':
        return {
          label: 'Acknowledged & Logged for Dispatch',
          badgeBg: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30',
          borderLeft: 'border-l-blue-500',
          icon: Info
        };
      case 'OUTSIDE_MANDATE':
        return {
          label: 'Referral to Authorized Institution',
          badgeBg: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30',
          borderLeft: 'border-l-purple-500',
          icon: Building2
        };
      default:
        return {
          label: 'Official State Communiqué',
          badgeBg: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30',
          borderLeft: 'border-l-emerald-500',
          icon: FileText
        };
    }
  };

  const typeMeta = getResponseTypeMeta(response.responseType);
  const TypeIcon = typeMeta.icon;
  const timelineSteps = Array.isArray(response.actionTimeline) ? response.actionTimeline : [];
  const currentStep = timelineSteps.find(s => s.status === 'in_progress') || timelineSteps[timelineSteps.length - 1];

  return (
    <article
      id={`official-response-post-${response.id}`}
      className={`bg-white dark:bg-slate-900 border-l-4 ${typeMeta.borderLeft} border-y border-r border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700/90 rounded-2xl p-3 sm:p-5 shadow-xl space-y-3 relative overflow-hidden`}
    >
      {/* Community Megaphone Banner & Controls */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/80 text-[11px] gap-2">
        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Official Directive</span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
          <span className={`px-2 py-0.5 text-[10px] sm:text-xs font-bold rounded-md border uppercase tracking-wider flex items-center gap-1 shrink-0 ${typeMeta.badgeBg}`}>
            <TypeIcon className="w-3 h-3" />
            <span>{response.responseType.replace(/_/g, ' ')}</span>
          </span>

          {/* Menu Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-1.5 z-30">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    if (onOpenShare) {
                      onOpenShare(post, response);
                    }
                  }}
                  className="w-full text-left px-2 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded flex items-center gap-2 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" /> Share Communiqué
                </button>
                {onOpenReportAbuse && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onOpenReportAbuse(post.id);
                    }}
                    className="w-full text-left px-2 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded flex items-center gap-2"
                  >
                    <Flag className="w-3.5 h-3.5" /> Report Violation
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Official Institution Identity Header (Social Media Format like X / Instagram) */}
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 overflow-hidden shrink-0">
            {response.institutionLogo ? (
              <img
                src={response.institutionLogo}
                alt={response.institutionName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-emerald-600 to-teal-700 flex items-center justify-center text-white font-bold text-sm">
                <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap leading-tight">
              <span className="font-bold text-[13px] sm:text-sm text-slate-900 dark:text-slate-100 hover:underline cursor-pointer truncate tracking-tight">
                {response.institutionName}
              </span>
              <BadgeCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 fill-emerald-500/15" />
            </div>

            {/* Responder & Time */}
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
              <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
                {response.responderName}
                {response.responderTitle && (
                  <span className="text-slate-500 dark:text-slate-400 font-normal"> • {response.responderTitle}</span>
                )}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                <Clock className="w-3 h-3 shrink-0" />
                {new Date(response.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* OFFICIAL STATEMENT / COMMUNIQUÉ BODY */}
      <div className="space-y-2 pt-0.5">
        {/* Title and Reference Number */}
        <div className="flex items-start justify-between gap-2 flex-wrap">
          {response.statementTitle ? (
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base leading-snug tracking-tight">
              "{response.statementTitle}"
            </h4>
          ) : (
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base leading-snug tracking-tight">
              Official State Directive on Citizen Report #{post.id.slice(0, 8)}
            </h4>
          )}

          {response.referenceNumber && (
            <button
              id={`copy-ref-${response.id}`}
              onClick={handleCopyRef}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono text-[11px] border border-slate-300 dark:border-slate-700 transition-colors"
              title="Copy official reference number"
            >
              <FileCheck2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span>{response.referenceNumber}</span>
              <span className="text-slate-500 dark:text-slate-400 text-[10px]">{copiedRef ? '✓' : '(copy)'}</span>
            </button>
          )}
        </div>

        {/* Statement Message Text & Response Media (No outer background container) */}
        <div className="text-sm sm:text-base text-slate-900 dark:text-slate-100 leading-relaxed font-editorial whitespace-pre-line space-y-2.5 px-0.5">
          <p className={isExpanded ? '' : 'line-clamp-4'}>
            {response.fullStatement || response.message}
          </p>

          {(response.fullStatement || response.message.length > 220) && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 text-xs font-semibold flex items-center gap-1 pt-0.5"
            >
              {isExpanded ? (
                <>
                  <span>Show less</span>
                  <ChevronUp className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  <span>Read entire communiqué statement...</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          )}

          {/* Attached Response Media */}
          {(response as any).media && (response as any).media.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {(response as any).media.map((m: any, idx: number) => (
                <div key={m.id || idx} className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
                  {m.type === 'video' ? (
                    <video src={m.url} controls className="w-full h-48 object-cover" />
                  ) : m.type === 'audio' ? (
                    <div className="p-3 bg-slate-100 dark:bg-slate-800 flex items-center gap-2">
                      <audio src={m.url} controls className="w-full" />
                    </div>
                  ) : (
                    <img src={m.url} alt={m.caption || 'Official response attachment'} className="w-full h-48 object-cover" />
                  )}
                  {m.caption && <p className="text-[11px] text-slate-500 dark:text-slate-400 p-1.5">{m.caption}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Operational Step Preview */}
        {currentStep && (
          <div className="p-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 gap-2">
            <div className="flex items-center gap-2 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse shrink-0" />
              <span className="text-slate-500 dark:text-slate-400 font-medium shrink-0">Live Action Step:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{currentStep.step}</span>
            </div>
            {currentStep.timestamp && (
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 shrink-0">{currentStep.timestamp}</span>
            )}
          </div>
        )}

        {/* Attached Documents & Direct Hotlines Chips */}
        {(response.documents?.length || response.hotlines?.length) ? (
          <div className="flex items-center gap-2 flex-wrap text-xs pt-1">
            {response.documents?.map((doc, idx) => (
              <a
                key={`doc-badge-${idx}`}
                href={doc.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-950/60 text-blue-300 border border-blue-800/60 hover:border-blue-500 transition-colors text-[11px]"
              >
                <FileText className="w-3 h-3 text-blue-400" />
                <span className="font-medium truncate max-w-[200px]">{doc.title}</span>
              </a>
            ))}

            {response.hotlines?.map((line, idx) => (
              <a
                key={`hotline-badge-${idx}`}
                href={`tel:${line.split(' ')[0].replace(/[^0-9+]/g, '')}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 hover:border-emerald-500 transition-colors text-[11px]"
              >
                <Phone className="w-3 h-3 text-emerald-400" />
                <span>{line}</span>
              </a>
            ))}
          </div>
        ) : null}
      </div>

      {/* REVERSE HIERARCHY EMBEDDED CARD: The Original Citizen Issue */}
      <div
        id={`response-embedded-original-issue-${post.id}`}
        className="p-3 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 transition-colors space-y-2.5"
      >
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
            <ArrowRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 rotate-180 shrink-0" />
            <span>In Direct Response To Citizen Report</span>
          </div>

          <button
            onClick={() => onJumpToOriginalPost?.(post)}
            className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 font-bold flex items-center gap-1"
          >
            <span>Jump to original report</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-start gap-3">
          {post.media && post.media.length > 0 && (
            <img
              src={post.media[0].url}
              alt={post.title}
              className="w-full sm:w-24 h-20 rounded-lg object-cover border border-slate-200 dark:border-slate-800 shrink-0"
            />
          )}

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap text-xs leading-tight">
              <span className="font-bold text-[13px] sm:text-sm text-slate-900 dark:text-slate-200 truncate">{post.authorName}</span>
              <span className="text-slate-500 dark:text-slate-400 font-normal">@{post.authorHandle}</span>
              <span className="text-slate-400 dark:text-slate-600">•</span>
              <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1 truncate text-[11px]">
                <MapPin className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                {post.location.landmark ? `${post.location.landmark}, ` : ''}
                {post.location.region}
              </span>
              <span className="px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-medium">
                {post.category}
              </span>
            </div>

            <h5 className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm line-clamp-1">
              {post.title}
            </h5>

            <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2 leading-relaxed">
              {post.content}
            </p>

            <div className="flex items-center gap-3 pt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">👥 {formatCount(post.engagement?.confirmations ?? post.confirmationsCount ?? 0)} citizen confirmations</span>
              <span>💬 {formatCount(post.engagement?.comments ?? post.commentsCount ?? 0)} comments</span>
            </div>
          </div>
        </div>
      </div>

      {/* Simplified Core Action Bar (Single Row without horizontal scrolls) */}
      <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-1 sm:gap-1.5 text-slate-700 dark:text-slate-300 w-full min-w-0">
        {/* Helpful Upvote Button */}
        <button
          id={`vote-helpful-btn-${response.id}`}
          onClick={e => handleVote(e, 'helpful')}
          className={`flex items-center gap-1 px-1.5 sm:px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-semibold shrink-0 transition-all ${
            helpfulVote === 'helpful'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-emerald-700 dark:text-emerald-400 border border-slate-300 dark:border-slate-700/80'
          }`}
          title="Mark this official statement as helpful & transparent"
        >
          <ThumbsUp className={`w-3 h-3 shrink-0 ${helpfulVote === 'helpful' ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}`} />
          <span className="whitespace-nowrap hidden xs:inline sm:inline">Helpful</span>
          <span
            className={`px-1 py-0.2 rounded text-[9px] sm:text-[10px] font-mono leading-none ${
              helpfulVote === 'helpful' ? 'bg-emerald-800 text-white' : 'bg-slate-200 dark:bg-slate-900 text-emerald-800 dark:text-emerald-300'
            }`}
          >
            {formatCount(helpfulCount)}
          </span>
        </button>

        {/* Action Group: All aligned neatly with compact spacing */}
        <div className="flex items-center gap-0.5 sm:gap-1.5 shrink-0">
          {/* Unhelpful Vote Button */}
          <button
            id={`vote-unhelpful-btn-${response.id}`}
            onClick={e => handleVote(e, 'unhelpful')}
            className={`px-1.5 sm:px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-medium border flex items-center gap-1 transition-colors shrink-0 ${
              helpfulVote === 'unhelpful'
                ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                : 'bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700/80'
            }`}
            title="Mark statement as unclear or inadequate"
          >
            <ThumbsDown className="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0" />
            <span className="whitespace-nowrap hidden sm:inline">Unhelpful</span>
            <span className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 font-mono">{formatCount(unhelpfulCount)}</span>
          </button>

          {/* Social Share Button */}
          <button
            id={`share-response-btn-${response.id}`}
            onClick={() => {
              if (onOpenShare) {
                onOpenShare(post, response);
              }
            }}
            className="px-1.5 sm:px-2 py-1 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] sm:text-[11px] font-medium rounded-lg border border-slate-300 dark:border-slate-700/80 flex items-center gap-1 transition-colors shrink-0 cursor-pointer active:scale-95"
            title="Share Official Communiqué to WhatsApp, X, or Telegram"
          >
            <Share2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="whitespace-nowrap hidden sm:inline">Share</span>
            <span className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 font-mono">{formatCount(post.engagement?.shares || post.sharesCount || 0)}</span>
          </button>

          {/* Reply / Comments Toggle Button */}
          <button
            id={`toggle-comments-btn-${response.id}`}
            onClick={() => setShowComments(!showComments)}
            className="px-1.5 sm:px-2 py-1 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] sm:text-[11px] font-medium rounded-lg border border-slate-300 dark:border-slate-700/80 flex items-center gap-1 transition-colors shrink-0"
            title="View citizen replies"
          >
            <MessageSquare className="w-3 h-3 text-purple-600 dark:text-purple-400 shrink-0" />
            <span className="whitespace-nowrap hidden sm:inline">Replies</span>
            <span className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 font-mono">{formatCount(comments.length || response.commentsCount || 0)}</span>
          </button>

          {/* Full Communiqué Modal CTA */}
          <button
            id={`open-statement-modal-btn-${response.id}`}
            onClick={() => onOpenStatementModal(post, response)}
            className="px-1.5 sm:px-2 py-1 bg-emerald-100 dark:bg-emerald-500/20 hover:bg-emerald-200 dark:hover:bg-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-[10px] sm:text-[11px] font-bold rounded-lg border border-emerald-300 dark:border-emerald-500/40 flex items-center gap-1 transition-colors shrink-0"
            title="View full official communiqué statement"
          >
            <ExternalLink className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="whitespace-nowrap hidden sm:inline">Communiqué</span>
          </button>
        </div>
      </div>

      {/* INLINE EXPANDABLE REPLIES THREAD */}
      {showComments && (
        <div
          id={`response-comments-thread-${response.id}`}
          className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3 animate-in fade-in"
        >
          {/* Reply Composer */}
          <form onSubmit={handleCommentSubmit} className="flex items-start gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0 border border-slate-300 dark:border-slate-700">
              {currentUser?.name ? currentUser.name.charAt(0) : 'C'}
            </div>
            <div className="flex-1 space-y-1.5">
              <input
                id={`reply-input-${response.id}`}
                type="text"
                value={newCommentText}
                onChange={e => setNewCommentText(e.target.value)}
                placeholder={`Reply to ${response.institutionName} regarding this statement...`}
                className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!newCommentText.trim() || submittingComment}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors"
                >
                  <Send className="w-3 h-3" />
                  <span>{submittingComment ? 'Sending...' : 'Reply'}</span>
                </button>
              </div>
            </div>
          </form>

          {/* List of Replies */}
          <div className="space-y-2">
            {comments.length === 0 ? (
              <p className="text-center py-3 text-xs text-slate-500 dark:text-slate-400">
                No replies yet. Be the first citizen to ask or verify progress with this agency!
              </p>
            ) : (
              comments.map(c => (
                <div
                  key={c.id}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-[13px] text-slate-900 dark:text-slate-200 hover:underline cursor-pointer">{c.userName}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">@{c.userHandle}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                      {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-800 dark:text-slate-300">{c.content}</p>
                  <div className="flex items-center gap-2 pt-0.5 text-[11px] text-slate-500">
                    <button
                      onClick={() => handleLikeComment(c.id)}
                      className={`flex items-center gap-1 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors ${
                        c.userLiked ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : ''
                      }`}
                    >
                      <Heart className={`w-3 h-3 ${c.userLiked ? 'fill-current' : ''}`} />
                      <span>{c.likesCount || 0}</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </article>
  );
};
