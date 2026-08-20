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
  FileCheck2
} from 'lucide-react';
import { CivicPost, InstitutionResponse, ResponseComment } from '../types';
import { api } from '../services/api';

interface OfficialResponseFeedPostCardProps {
  post: CivicPost;
  response: InstitutionResponse;
  currentUser?: any;
  onOpenStatementModal: (post: CivicPost, response: InstitutionResponse) => void;
  onJumpToOriginalPost?: (post: CivicPost) => void;
  onPostUpdated?: () => void;
}

export const OfficialResponseFeedPostCard: React.FC<OfficialResponseFeedPostCardProps> = ({
  post,
  response: initialResponse,
  currentUser,
  onOpenStatementModal,
  onJumpToOriginalPost,
  onPostUpdated
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
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyRef = (e: React.MouseEvent) => {
    e.stopPropagation();
    const ref = response.referenceNumber || `REF-${response.id}`;
    navigator.clipboard.writeText(ref);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/#response-${response.id}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
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
          badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          borderLeft: 'border-l-emerald-500',
          icon: CheckCircle2
        };
      case 'INVESTIGATING':
        return {
          label: 'Investigation & Assessment Underway',
          badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          borderLeft: 'border-l-amber-500',
          icon: Clock
        };
      case 'PUBLIC_GUIDANCE':
        return {
          label: 'Official Public Safety Guidance',
          badgeBg: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
          borderLeft: 'border-l-sky-500',
          icon: ShieldCheck
        };
      case 'WE_ARE_AWARE':
        return {
          label: 'Acknowledged & Logged for Dispatch',
          badgeBg: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
          borderLeft: 'border-l-blue-500',
          icon: Info
        };
      case 'OUTSIDE_MANDATE':
        return {
          label: 'Referral to Authorized Institution',
          badgeBg: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
          borderLeft: 'border-l-purple-500',
          icon: Building2
        };
      default:
        return {
          label: 'Official State Communiqué',
          badgeBg: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
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
      className={`bg-slate-900 border-l-4 ${typeMeta.borderLeft} border-y border-r border-slate-800 hover:border-slate-700/90 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4 transition-all duration-200`}
    >
      {/* 1. TOP HEADER: Official Institution Identity & Verified State Desk */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {response.institutionLogo ? (
            <img
              src={response.institutionLogo}
              alt={response.institutionName}
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl object-cover ring-2 ring-emerald-500/30 shrink-0 shadow-md"
            />
          ) : (
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-700 flex items-center justify-center text-white shrink-0 shadow-md">
              <Building2 className="w-6 h-6" />
            </div>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-extrabold text-slate-100 text-sm sm:text-base tracking-tight truncate">
                {response.institutionName}
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 shrink-0">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                VERIFIED STATE AUTHORITY
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap mt-0.5">
              <span className="font-medium text-slate-300">{response.responderName}</span>
              <span>•</span>
              <span className="text-slate-400 truncate">{response.responderTitle}</span>
              <span>•</span>
              <span className="text-slate-500 font-mono text-[11px]">
                {new Date(response.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} at{' '}
                {new Date(response.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </div>

        {/* Action badge & status */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border uppercase tracking-wider flex items-center gap-1 ${typeMeta.badgeBg}`}>
            <TypeIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{response.responseType.replace(/_/g, ' ')}</span>
          </span>

          {response.resolutionStatus && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              STATUS: {response.resolutionStatus}
            </span>
          )}
        </div>
      </div>

      {/* 2. OFFICIAL STATEMENT / COMMUNIQUÉ BODY */}
      <div className="space-y-2.5 pt-1">
        {/* Title and Reference Number */}
        <div className="flex items-start justify-between gap-2 flex-wrap">
          {response.statementTitle ? (
            <h4 className="font-bold text-slate-100 text-sm sm:text-base leading-snug tracking-tight">
              "{response.statementTitle}"
            </h4>
          ) : (
            <h4 className="font-bold text-slate-100 text-sm sm:text-base leading-snug tracking-tight">
              Official State Directive on Citizen Report #{post.id.slice(0, 8)}
            </h4>
          )}

          {response.referenceNumber && (
            <button
              id={`copy-ref-${response.id}`}
              onClick={handleCopyRef}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px] border border-slate-700 transition-colors"
              title="Copy official reference number"
            >
              <FileCheck2 className="w-3 h-3 text-emerald-400" />
              <span>{response.referenceNumber}</span>
              <span className="text-slate-400 text-[10px]">{copiedRef ? '✓' : '(copy)'}</span>
            </button>
          )}
        </div>

        {/* Statement Message Excerpt */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 sm:p-4 text-xs sm:text-sm text-slate-200 leading-relaxed font-sans shadow-inner whitespace-pre-line space-y-2">
          <p className={isExpanded ? '' : 'line-clamp-4'}>
            {response.fullStatement || response.message}
          </p>

          {(response.fullStatement || response.message.length > 220) && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-emerald-400 hover:text-emerald-300 text-xs font-semibold flex items-center gap-1 pt-1"
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
        </div>

        {/* Live Operational Step Preview */}
        {currentStep && (
          <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800 flex items-center justify-between text-xs text-slate-300 gap-2">
            <div className="flex items-center gap-2 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="text-slate-400 font-medium shrink-0">Live Action Step:</span>
              <span className="font-semibold text-slate-200 truncate">{currentStep.step}</span>
            </div>
            {currentStep.timestamp && (
              <span className="text-[11px] font-mono text-slate-400 shrink-0">{currentStep.timestamp}</span>
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

      {/* 3. REVERSE HIERARCHY EMBEDDED CARD: The Original Citizen Issue */}
      <div
        id={`response-embedded-original-issue-${post.id}`}
        className="p-3.5 sm:p-4 rounded-xl bg-slate-950/90 border border-slate-800 hover:border-emerald-500/40 transition-colors space-y-2.5"
      >
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
            <ArrowRight className="w-3.5 h-3.5 text-emerald-400 rotate-180 shrink-0" />
            <span>In Direct Response To Citizen Report</span>
          </div>

          <button
            onClick={() => onJumpToOriginalPost?.(post)}
            className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
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
              className="w-full sm:w-24 h-20 rounded-lg object-cover border border-slate-800 shrink-0"
            />
          )}

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="font-bold text-slate-200">{post.authorName}</span>
              <span className="text-slate-400">@{post.authorHandle}</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-emerald-400" />
                {post.location.landmark || post.location.district}, {post.location.region}
              </span>
              <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 text-[10px] font-medium">
                {post.category}
              </span>
            </div>

            <h5 className="font-bold text-slate-100 text-xs sm:text-sm line-clamp-1">
              {post.title}
            </h5>

            <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
              {post.content}
            </p>

            <div className="flex items-center gap-3 pt-0.5 text-[11px] text-slate-400">
              <span className="text-emerald-400 font-medium">👥 {post.engagement.confirmations} citizen confirmations</span>
              <span>💬 {post.engagement.comments} comments</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. INTERACTION & ACTION BAR (Vote, Reply, Share, Full Modal) */}
      <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2 flex-wrap text-xs">
        {/* Helpfulness Rating and Comments toggler */}
        <div className="flex items-center gap-2">
          {/* Helpful Upvote */}
          <button
            id={`vote-helpful-btn-${response.id}`}
            onClick={e => handleVote(e, 'helpful')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium border transition-colors ${
              helpfulVote === 'helpful'
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-emerald-950/60 hover:text-emerald-300 hover:border-emerald-700'
            }`}
            title="Mark this official statement as helpful & transparent"
          >
            <ThumbsUp className="w-3.5 h-3.5" />
            <span>Helpful ({helpfulCount})</span>
          </button>

          {/* Unhelpful Vote */}
          <button
            id={`vote-unhelpful-btn-${response.id}`}
            onClick={e => handleVote(e, 'unhelpful')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-medium border transition-colors ${
              helpfulVote === 'unhelpful'
                ? 'bg-rose-600 text-white border-rose-600'
                : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-rose-950/60 hover:text-rose-300 hover:border-rose-700'
            }`}
            title="Mark statement as unclear or inadequate"
          >
            <ThumbsDown className="w-3.5 h-3.5" />
            <span>{unhelpfulCount > 0 ? unhelpfulCount : ''}</span>
          </button>

          {/* Reply / Comments Button */}
          <button
            id={`toggle-comments-btn-${response.id}`}
            onClick={() => setShowComments(!showComments)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium border transition-colors ${
              showComments
                ? 'bg-slate-700 text-white border-slate-600'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
            <span>Replies ({comments.length || response.commentsCount || 0})</span>
          </button>
        </div>

        {/* Share and Open Statement Modal Buttons */}
        <div className="flex items-center gap-2">
          <button
            id={`share-response-btn-${response.id}`}
            onClick={handleCopyLink}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-medium border border-slate-700 transition-colors flex items-center gap-1.5"
            title="Copy link to this response post"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copiedLink ? 'Link Copied!' : 'Share'}</span>
          </button>

          <button
            id={`open-statement-modal-btn-${response.id}`}
            onClick={() => onOpenStatementModal(post, response)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs shadow-md transition-all"
          >
            <span>Full Communiqué & Timeline</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 5. INLINE EXPANDABLE REPLIES THREAD */}
      {showComments && (
        <div
          id={`response-comments-thread-${response.id}`}
          className="pt-3 border-t border-slate-800 space-y-3"
        >
          {/* Reply Composer */}
          <form onSubmit={handleCommentSubmit} className="flex items-start gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0 border border-slate-700">
              {currentUser?.name ? currentUser.name.charAt(0) : 'C'}
            </div>
            <div className="flex-1 space-y-1.5">
              <input
                id={`reply-input-${response.id}`}
                type="text"
                value={newCommentText}
                onChange={e => setNewCommentText(e.target.value)}
                placeholder={`Reply to ${response.institutionName} regarding this statement...`}
                className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
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
              <p className="text-center py-3 text-xs text-slate-500">
                No replies yet. Be the first citizen to ask or verify progress with this agency!
              </p>
            ) : (
              comments.map(c => (
                <div
                  key={c.id}
                  className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-200">{c.userName}</span>
                      <span className="text-slate-500">@{c.userHandle}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-300">{c.content}</p>
                  <div className="flex items-center gap-2 pt-0.5 text-[11px] text-slate-500">
                    <button
                      onClick={() => handleLikeComment(c.id)}
                      className={`flex items-center gap-1 hover:text-emerald-400 transition-colors ${
                        c.userLiked ? 'text-emerald-400 font-semibold' : ''
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
