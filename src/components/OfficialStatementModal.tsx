import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  ShieldCheck,
  Clock,
  FileText,
  Phone,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Share2,
  Copy,
  ExternalLink,
  Send,
  AlertTriangle,
  ArrowRight,
  Printer,
  ChevronRight,
  Building2,
  Landmark,
  User,
  Heart,
  Sparkles,
  Layers,
  FileCheck2,
  Info
} from 'lucide-react';
import { CivicPost, InstitutionResponse, ResponseComment, ResponseTimelineStep } from '../types';
import { api } from '../services/api';

interface OfficialStatementModalProps {
  post: CivicPost;
  response: InstitutionResponse;
  currentUser?: any;
  onClose: () => void;
  onPostUpdated?: (updatedPost: CivicPost) => void;
  onOpenAnotherResponse?: (response: InstitutionResponse) => void;
  onViewAsFeedPost?: (post: CivicPost, response: InstitutionResponse) => void;
}

export const OfficialStatementModal: React.FC<OfficialStatementModalProps> = ({
  post,
  response: initialResponse,
  currentUser,
  onClose,
  onPostUpdated,
  onOpenAnotherResponse,
  onViewAsFeedPost
}) => {
  const [response, setResponse] = useState<InstitutionResponse>(initialResponse);
  const [activeTab, setActiveTab] = useState<'statement_replies' | 'original_report_discussion' | 'agency_thread'>('statement_replies');
  const [comments, setComments] = useState<ResponseComment[]>(initialResponse.commentsList || []);
  const [newCommentText, setNewCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [helpfulVote, setHelpfulVote] = useState<'helpful' | 'unhelpful' | null>(initialResponse.userHelpfulVote || null);
  const [helpfulCount, setHelpfulCount] = useState(initialResponse.helpfulCount || 0);
  const [unhelpfulCount, setUnhelpfulCount] = useState(initialResponse.unhelpfulCount || 0);
  const [copiedRef, setCopiedRef] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [relatedResponses, setRelatedResponses] = useState<InstitutionResponse[]>([]);

  // Fetch full details from backend on mount
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoadingDetails(true);
        const data = await api.getResponseById(initialResponse.id);
        if (isMounted && data) {
          if (data.response) {
            setResponse(data.response);
            if (data.response.commentsList) {
              setComments(data.response.commentsList);
            }
            if (data.response.helpfulCount !== undefined) {
              setHelpfulCount(data.response.helpfulCount);
            }
            if (data.response.unhelpfulCount !== undefined) {
              setUnhelpfulCount(data.response.unhelpfulCount);
            }
          }
          if (data.relatedResponses) {
            setRelatedResponses(data.relatedResponses);
          }
        }
      } catch (err) {
        console.error('Error fetching response details:', err);
      } finally {
        if (isMounted) setLoadingDetails(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [initialResponse.id]);

  const handleCopyRef = () => {
    const ref = response.referenceNumber || `REF-${response.id}`;
    navigator.clipboard.writeText(ref);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const handleShare = () => {
    const shareText = `Official Statement from ${response.institutionName}: "${response.statementTitle || response.message}" regarding citizen report on "${post.title}".`;
    navigator.clipboard.writeText(shareText);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleVote = async (voteType: 'helpful' | 'unhelpful') => {
    try {
      const res = await api.voteResponseHelpful(response.id, voteType, currentUser?.id);
      setHelpfulCount(res.helpfulCount);
      setUnhelpfulCount(res.unhelpfulCount);
      setHelpfulVote(res.userVote as any);
    } catch (e) {
      console.error('Vote failed', e);
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
    } catch (err) {
      console.error('Error posting comment:', err);
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

  // Response Type Color and Icon
  const getResponseTypeMeta = (type: string) => {
    switch (type) {
      case 'ACTION_TAKEN':
        return {
          label: 'Direct Action Taken / Teams Active',
          bg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
          badgeBg: 'bg-emerald-600',
          icon: CheckCircle2
        };
      case 'INVESTIGATING':
        return {
          label: 'Formal Investigation & Assessment Underway',
          bg: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
          badgeBg: 'bg-amber-600',
          icon: Clock
        };
      case 'PUBLIC_GUIDANCE':
        return {
          label: 'Official Public Safety Guidance & Advisory',
          bg: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20',
          badgeBg: 'bg-sky-600',
          icon: ShieldCheck
        };
      case 'WE_ARE_AWARE':
        return {
          label: 'Acknowledged & Logged for Dispatch',
          bg: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
          badgeBg: 'bg-blue-600',
          icon: Info
        };
      case 'OUTSIDE_MANDATE':
        return {
          label: 'Referral to Authorized Sister Institution',
          bg: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20',
          badgeBg: 'bg-purple-600',
          icon: Building2
        };
      default:
        return {
          label: 'Official State Communiqué',
          bg: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20',
          badgeBg: 'bg-slate-600',
          icon: FileText
        };
    }
  };

  const typeMeta = getResponseTypeMeta(response.responseType);
  const TypeIcon = typeMeta.icon;

  // Action Timeline list helper
  const timelineSteps: ResponseTimelineStep[] = Array.isArray(response.actionTimeline)
    ? response.actionTimeline
    : [];

  const otherAgencyResponses = post.officialResponses.filter(r => r.id !== response.id);

  return (
    <div
      id="official-statement-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="official-statement-modal-dialog"
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Official Banner / Header */}
        <div
          id="statement-modal-header"
          className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-50 via-slate-100 to-slate-50 dark:from-slate-900 dark:via-slate-850 dark:to-slate-900 flex items-center justify-between gap-3 shrink-0"
        >
          <div className="flex items-center gap-3 min-w-0">
            {response.institutionLogo ? (
              <img
                src={response.institutionLogo}
                alt={response.institutionName}
                className="w-11 h-11 rounded-xl object-cover ring-2 ring-emerald-500/20 shrink-0"
              />
            ) : (
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shrink-0 shadow-sm">
                <Landmark className="w-6 h-6" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-slate-900 dark:text-white text-base truncate">
                  {response.institutionName}
                </span>
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verified State Authority
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Republic of Ghana • Official Public Accountability Record
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {onViewAsFeedPost && (
              <button
                id="statement-view-feed-btn"
                onClick={() => {
                  onViewAsFeedPost(post, response);
                  onClose();
                }}
                title="View formatted as standalone reverse-hierarchy post in feed"
                className="px-2.5 py-1.5 bg-emerald-600/10 dark:bg-emerald-600/20 hover:bg-emerald-600/20 dark:hover:bg-emerald-600/30 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold"
              >
                <ArrowRight className="w-3.5 h-3.5 rotate-45" />
                <span>Open Feed Post View</span>
              </button>
            )}
            <button
              id="statement-share-btn"
              onClick={handleShare}
              title="Share Communiqué"
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">{copiedLink ? 'Copied!' : 'Share'}</span>
            </button>
            <button
              id="statement-print-btn"
              onClick={handlePrint}
              title="Print / Save PDF"
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors hidden sm:flex items-center gap-1 text-xs font-medium"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>
            <button
              id="statement-close-btn"
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div id="statement-modal-body" className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
          {/* Main Statement Box */}
          <div className="p-5 sm:p-6 space-y-5">
            {/* Meta bar: Reference ID, Status, Timestamp */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-semibold border ${typeMeta.bg}`}>
                  <TypeIcon className="w-3.5 h-3.5" />
                  {typeMeta.label}
                </span>

                {response.resolutionStatus && (
                  <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium border border-slate-200 dark:border-slate-700">
                    Status: <strong className="font-semibold uppercase">{response.resolutionStatus.replace('_', ' ')}</strong>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {response.referenceNumber && (
                  <button
                    id="copy-ref-number-btn"
                    onClick={handleCopyRef}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono text-xs transition-colors"
                  >
                    <FileCheck2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{response.referenceNumber}</span>
                    <span className="text-[10px] text-slate-400 ml-0.5">{copiedRef ? '✓' : '(copy)'}</span>
                  </button>
                )}
                <span className="text-slate-400 dark:text-slate-500">
                  {new Date(response.createdAt).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>

            {/* Communiqué Title / Subject */}
            <div className="space-y-1.5">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-snug">
                {response.statementTitle || `Official Communiqué regarding ${post.title}`}
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <span className="font-medium text-slate-900 dark:text-slate-200">{response.responderName}</span>
                <span>•</span>
                <span>{response.responderTitle}</span>
              </div>
            </div>

            {/* Official Statement Body */}
            <div className="p-4 sm:p-5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-750 text-slate-800 dark:text-slate-200 leading-relaxed space-y-3.5 text-sm sm:text-[15px]">
              {(response.fullStatement || response.message).split('\n\n').map((paragraph, idx) => (
                <p key={`p-${idx}`} className="whitespace-pre-line">
                  {paragraph}
                </p>
              ))}
            </div>

            {/* Action Timeline Progress Steps */}
            {timelineSteps.length > 0 && (
              <div id="statement-timeline-section" className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-850/50 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Official Action & Resolution Timeline
                  </h4>
                  <span className="text-[11px] text-slate-500">Live operational dispatch</span>
                </div>
                <div className="space-y-3 pt-1">
                  {timelineSteps.map((step, idx) => (
                    <div key={`step-${idx}-${step.step.slice(0, 8)}`} className="flex items-start gap-3 relative">
                      {/* Line connector */}
                      {idx !== timelineSteps.length - 1 && (
                        <div className="absolute left-3.5 top-6 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700" />
                      )}
                      {/* Step Status Icon */}
                      <div className="z-10 mt-0.5 shrink-0">
                        {step.status === 'completed' ? (
                          <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        ) : step.status === 'in_progress' ? (
                          <div className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-sm animate-pulse">
                            <Clock className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center">
                            <span className="text-xs font-semibold">{idx + 1}</span>
                          </div>
                        )}
                      </div>
                      {/* Step text */}
                      <div className="flex-1 pb-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {step.step}
                          </p>
                          {step.timestamp && (
                            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 shrink-0">
                              {step.timestamp}
                            </span>
                          )}
                        </div>
                        {step.description && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                            {step.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Attached Documents & Emergency Hotlines Bar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Documents */}
              {response.documents && response.documents.length > 0 && (
                <div className="p-3.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-500" />
                    Official Directives & Documents
                  </h5>
                  <div className="space-y-1.5">
                    {response.documents.map((doc, idx) => (
                      <a
                        key={`doc-${idx}`}
                        href={doc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-400 transition-colors text-xs"
                      >
                        <span className="font-medium text-slate-800 dark:text-slate-200 truncate mr-2">
                          📄 {doc.title}
                        </span>
                        {doc.size && <span className="text-[10px] text-slate-400 font-mono shrink-0">{doc.size}</span>}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Hotlines */}
              {response.hotlines && response.hotlines.length > 0 && (
                <div className="p-3.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-500" />
                    Direct Agency Contact & Hotlines
                  </h5>
                  <div className="space-y-1.5">
                    {response.hotlines.map((line, idx) => (
                      <div
                        key={`line-${idx}`}
                        className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                      >
                        <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                          📞 {line}
                        </span>
                        <a
                          href={`tel:${line.split(' ')[0].replace(/[^0-9+]/g, '')}`}
                          className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[11px] font-semibold hover:bg-emerald-200"
                        >
                          Call
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Helpfulness Rating bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-slate-850 dark:to-slate-850 border border-emerald-100 dark:border-slate-750">
              <div>
                <p className="text-xs font-semibold text-slate-900 dark:text-white">
                  Was this official statement clear, transparent and actionable?
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Citizen ratings provide transparent accountability to the Ministry & Regulators.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  id="vote-helpful-btn"
                  onClick={() => handleVote('helpful')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    helpfulVote === 'helpful'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>Helpful ({helpfulCount})</span>
                </button>
                <button
                  id="vote-unhelpful-btn"
                  onClick={() => handleVote('unhelpful')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    helpfulVote === 'unhelpful'
                      ? 'bg-rose-600 text-white border-rose-600'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                  <span>Unclear ({unhelpfulCount})</span>
                </button>
              </div>
            </div>
          </div>

          {/* REVERSE CONTEXT: "In Response To Citizen Issue Report" */}
          <div id="statement-parent-post-context" className="p-4 sm:p-5 bg-slate-50/80 dark:bg-slate-900/60 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <ArrowRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 rotate-180" />
                In Direct Response To Citizen Issue
              </span>
              <div className="flex items-center gap-2">
                {onViewAsFeedPost && (
                  <button
                    onClick={() => {
                      onViewAsFeedPost(post, response);
                      onClose();
                    }}
                    className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold flex items-center gap-1"
                  >
                    <span>View as Feed Post</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
                <span className="text-xs text-slate-500 hidden sm:inline">
                  {post.location.landmark || post.location.district}, {post.location.region}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row gap-3.5 items-start">
              {post.media && post.media.length > 0 && (
                <img
                  src={post.media[0].url}
                  alt={post.title}
                  className="w-full sm:w-28 h-20 rounded-lg object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                />
              )}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    {post.category}
                  </span>
                  <span className="text-xs text-slate-500">
                    Reported by <strong className="text-slate-700 dark:text-slate-300">{post.authorName}</strong> ({post.authorHandle})
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-2">
                  {post.title}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                  {post.content}
                </p>
                <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-500">
                  <span>👥 {post.engagement.confirmations} citizen confirmations</span>
                  <span>💬 {post.engagement.comments} comments</span>
                  <span>📅 {new Date(post.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Perspective Switcher Tabs (Like X reply & quote threads) */}
          <div id="statement-discussion-tabs" className="px-5 pt-4 bg-white dark:bg-slate-900">
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
              <button
                id="tab-statement-replies"
                onClick={() => setActiveTab('statement_replies')}
                className={`pb-3 text-xs sm:text-sm font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
                  activeTab === 'statement_replies'
                    ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Statement Follow-ups & Citizen Replies ({comments.length})</span>
              </button>

              <button
                id="tab-original-report"
                onClick={() => setActiveTab('original_report_discussion')}
                className={`pb-3 text-xs sm:text-sm font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
                  activeTab === 'original_report_discussion'
                    ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Original Citizen Discussion ({post.commentsList?.length || post.engagement.comments || 0})</span>
              </button>

              {otherAgencyResponses.length > 0 && (
                <button
                  id="tab-agency-thread"
                  onClick={() => setActiveTab('agency_thread')}
                  className={`pb-3 text-xs sm:text-sm font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
                    activeTab === 'agency_thread'
                      ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span>Other Agency Statements ({otherAgencyResponses.length})</span>
                </button>
              )}
            </div>
          </div>

          {/* TAB 1: STATEMENT REPLIES & FIELD VERIFICATIONS */}
          {activeTab === 'statement_replies' && (
            <div id="tab-content-statement-replies" className="p-5 space-y-4 bg-white dark:bg-slate-900">
              {/* Comment Composer */}
              <form onSubmit={handleCommentSubmit} className="space-y-2">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0 text-xs font-bold">
                    {currentUser?.name ? currentUser.name.charAt(0) : 'C'}
                  </div>
                  <div className="flex-1 relative">
                    <textarea
                      id="statement-reply-textarea"
                      value={newCommentText}
                      onChange={e => setNewCommentText(e.target.value)}
                      placeholder={`Reply directly to ${response.institutionName} regarding this statement, report whether crews arrived, or ask follow-up questions...`}
                      rows={2}
                      className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                    />
                    <div className="flex justify-end mt-1.5">
                      <button
                        id="submit-statement-reply-btn"
                        type="submit"
                        disabled={!newCommentText.trim() || submittingComment}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold transition-colors"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{submittingComment ? 'Posting...' : 'Post Reply to Authority'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </form>

              {/* Comments List */}
              <div className="space-y-3 pt-2">
                {comments.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    No replies yet to this official statement. Be the first citizen or assembly member to reply!
                  </div>
                ) : (
                  comments.map(c => (
                    <div
                      key={c.id}
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/70 dark:border-slate-800 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900 dark:text-white">
                            {c.userName}
                          </span>
                          <span className="text-[11px] text-slate-400">@{c.userHandle}</span>
                          {c.isVerified && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium">
                              Verified Citizen
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                        {c.content}
                      </p>
                      <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-500">
                        <button
                          onClick={() => handleLikeComment(c.id)}
                          className={`flex items-center gap-1 hover:text-emerald-600 transition-colors ${
                            c.userLiked ? 'text-emerald-600 font-semibold' : ''
                          }`}
                        >
                          <Heart className={`w-3.5 h-3.5 ${c.userLiked ? 'fill-current' : ''}`} />
                          <span>{c.likesCount || 0}</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 2: ORIGINAL CITIZEN REPORT DISCUSSION */}
          {activeTab === 'original_report_discussion' && (
            <div id="tab-content-original-discussion" className="p-5 space-y-4 bg-white dark:bg-slate-900">
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 text-xs text-blue-800 dark:text-blue-200 flex items-center justify-between">
                <span>Displaying original community comments on "{post.title}"</span>
                <span className="font-semibold">{post.commentsList?.length || post.engagement.comments || 0} Comments</span>
              </div>

              <div className="space-y-3">
                {post.commentsList && post.commentsList.length > 0 ? (
                  post.commentsList.map(c => (
                    <div
                      key={c.id}
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/70 dark:border-slate-800 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900 dark:text-white">
                            {c.userName}
                          </span>
                          <span className="text-[11px] text-slate-400">@{c.userHandle}</span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300">{c.content}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    No previous comments recorded on the original citizen post.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: OTHER AGENCY STATEMENTS (Cross-agency coordination) */}
          {activeTab === 'agency_thread' && (
            <div id="tab-content-agency-thread" className="p-5 space-y-3 bg-white dark:bg-slate-900">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Other state institutions and regulatory commissions that have issued statements regarding this citizen issue:
              </p>
              {otherAgencyResponses.map(r => (
                <div
                  key={r.id}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 space-y-2 hover:border-emerald-500 transition-colors cursor-pointer"
                  onClick={() => {
                    if (onOpenAnotherResponse) {
                      onOpenAnotherResponse(r);
                    } else {
                      setResponse(r);
                      setComments(r.commentsList || []);
                      setActiveTab('statement_replies');
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <strong className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                        {r.institutionName}
                      </strong>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium">
                        {r.responseType}
                      </span>
                    </div>
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      View Statement <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                    {r.statementTitle ? `"${r.statementTitle}" — ` : ''}
                    {r.message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between gap-3 shrink-0 flex-wrap">
          <div className="text-xs text-slate-500 flex items-center gap-1.5 min-w-0">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="truncate">Audited & verified public record on SpeakUp Ghana National Platform</span>
          </div>
          <div className="flex items-center gap-2">
            {onViewAsFeedPost && (
              <button
                onClick={() => {
                  onViewAsFeedPost(post, response);
                  onClose();
                }}
                className="px-3.5 py-2 rounded-xl bg-emerald-600/10 dark:bg-emerald-950/60 hover:bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Post in Feed</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors"
            >
              Close Statement
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
