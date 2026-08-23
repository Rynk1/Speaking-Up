import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  ExternalLink,
  Send,
  Printer,
  ChevronRight,
  Building2,
  Landmark,
  User,
  Heart,
  FileCheck2,
  Info,
  Layers,
  ArrowUpRight,
  Check,
  BadgeCheck
} from 'lucide-react';
import { CivicPost, InstitutionResponse, ResponseComment, ResponseTimelineStep } from '../types';
import { api } from '../services/api';
import { SharePreviewModal } from './SharePreviewModal';

interface OfficialStatementModalProps {
  post: CivicPost;
  response: InstitutionResponse;
  currentUser?: any;
  onClose: () => void;
  onPostUpdated?: (updatedPost: CivicPost) => void;
  onOpenAnotherResponse?: (response: InstitutionResponse) => void;
  onViewAsFeedPost?: (post: CivicPost, response: InstitutionResponse) => void;
  onOpenShare?: (post: CivicPost, response: InstitutionResponse) => void;
}

export const OfficialStatementModal: React.FC<OfficialStatementModalProps> = ({
  post,
  response: initialResponse,
  currentUser,
  onClose,
  onPostUpdated,
  onOpenAnotherResponse,
  onViewAsFeedPost,
  onOpenShare
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
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [relatedResponses, setRelatedResponses] = useState<InstitutionResponse[]>([]);

  // Synchronize with initialResponse prop
  useEffect(() => {
    setResponse(initialResponse);
    setComments(initialResponse.commentsList || []);
    setHelpfulCount(initialResponse.helpfulCount || 0);
    setUnhelpfulCount(initialResponse.unhelpfulCount || 0);
    setHelpfulVote(initialResponse.userHelpfulVote || null);
  }, [initialResponse]);

  // Fetch full details from backend on mount or when response ID changes
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoadingDetails(true);
        const data = await api.getResponseById(response.id);
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
  }, [response.id]);

  const handleSelectAnotherResponse = (targetResp: InstitutionResponse, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setResponse(targetResp);
    setComments(targetResp.commentsList || []);
    setHelpfulCount(targetResp.helpfulCount || 0);
    setUnhelpfulCount(targetResp.unhelpfulCount || 0);
    setHelpfulVote(targetResp.userHelpfulVote || null);
    setActiveTab('statement_replies');

    if (onOpenAnotherResponse) {
      onOpenAnotherResponse(targetResp);
    }

    const scrollContainer = document.getElementById('statement-modal-body');
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleCopyRef = () => {
    const ref = response.referenceNumber || `REF-${response.id}`;
    navigator.clipboard.writeText(ref);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const handleShareClick = () => {
    if (onOpenShare) {
      onOpenShare(post, response);
    } else {
      setIsShareModalOpen(true);
    }
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
          label: 'Formal Assessment Underway',
          bg: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
          badgeBg: 'bg-amber-600',
          icon: Clock
        };
      case 'PUBLIC_GUIDANCE':
        return {
          label: 'Public Advisory',
          bg: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20',
          badgeBg: 'bg-sky-600',
          icon: ShieldCheck
        };
      case 'WE_ARE_AWARE':
        return {
          label: 'Acknowledged & Logged',
          bg: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
          badgeBg: 'bg-blue-600',
          icon: Info
        };
      case 'OUTSIDE_MANDATE':
        return {
          label: 'Inter-Agency Referral',
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

  const navigate = useNavigate();

  const typeMeta = getResponseTypeMeta(response.responseType);
  const TypeIcon = typeMeta.icon;

  // Action Timeline list helper
  const timelineSteps: ResponseTimelineStep[] = Array.isArray(response.actionTimeline)
    ? response.actionTimeline
    : [];

  // Merge other responses from post.officialResponses and relatedResponses
  const otherAgencyResponses = React.useMemo(() => {
    const map = new Map<string, InstitutionResponse>();
    (post.officialResponses || []).forEach(r => {
      if (r.id !== response.id) map.set(r.id, r);
    });
    (relatedResponses || []).forEach(r => {
      if (r.id !== response.id && !map.has(r.id)) map.set(r.id, r);
    });
    return Array.from(map.values());
  }, [post.officialResponses, relatedResponses, response.id]);

  return (
    <div
      id="official-statement-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="official-statement-modal-dialog"
        className="relative w-full max-w-4xl h-full sm:h-auto sm:max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 sm:rounded-2xl shadow-2xl border-0 sm:border border-slate-200 dark:border-slate-800 overflow-hidden my-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Official Header */}
        <div
          id="statement-modal-header"
          className="px-3.5 py-3 sm:px-5 sm:py-4 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex items-center justify-between gap-3 shrink-0"
        >
          {/* Left: Institution avatar & Verified title */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div
              className="relative shrink-0 cursor-pointer"
              onClick={() => {
                if (response.institutionId) {
                  navigate(`/institutions/${response.institutionId}`);
                  onClose();
                }
              }}
            >
              {response.institutionLogo ? (
                <img
                  src={response.institutionLogo}
                  alt={response.institutionName}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-200 dark:ring-slate-700 shadow-xs"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shrink-0 shadow-xs font-bold text-sm">
                  <Landmark className="w-5 h-5" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1 leading-tight">
              <div className="flex items-center gap-1.5 min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    if (response.institutionId) {
                      navigate(`/institutions/${response.institutionId}`);
                      onClose();
                    }
                  }}
                  className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 truncate tracking-tight hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors text-left cursor-pointer"
                >
                  {response.institutionName}
                </button>
                <BadgeCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 fill-emerald-500/15" />
              </div>
              <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 font-normal">
                <span className="truncate font-medium text-slate-700 dark:text-slate-300">{response.responderName}</span>
                {response.responderTitle && (
                  <>
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <span className="truncate hidden sm:inline text-slate-500 dark:text-slate-400">{response.responderTitle}</span>
                  </>
                )}
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <span className="font-mono text-[10px] text-slate-400 shrink-0">
                  {new Date(response.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </div>
            </div>
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {onViewAsFeedPost && (
              <button
                id="statement-view-feed-btn"
                onClick={() => {
                  onViewAsFeedPost(post, response);
                  onClose();
                }}
                title="View formatted as a dedicated feed post"
                className="h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-xs"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Feed View</span>
              </button>
            )}

            <button
              id="statement-share-btn"
              onClick={handleShareClick}
              title="Share Official Communiqué"
              className="h-8 sm:h-9 px-2.5 sm:px-3 text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300/80 dark:border-slate-700/80 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer active:scale-95 shadow-xs"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">Share</span>
            </button>

            <button
              id="statement-print-btn"
              onClick={handlePrint}
              title="Print Communiqué"
              className="h-8 sm:h-9 w-8 sm:w-9 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl transition-colors hidden sm:flex items-center justify-center text-xs cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4" />
            </button>

            <button
              id="statement-close-btn"
              onClick={onClose}
              title="Close modal"
              className="h-8 sm:h-9 w-8 sm:w-9 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl transition-colors flex items-center justify-center cursor-pointer active:scale-95 shadow-xs"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div id="statement-modal-body" className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
          {/* Main Statement Content Block */}
          <div className="p-4 sm:p-6 space-y-4">
            {/* Action Badges & Ref Header Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold border ${typeMeta.bg}`}>
                  <TypeIcon className="w-3.5 h-3.5" />
                  {typeMeta.label}
                </span>

                {response.resolutionStatus && (
                  <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium border border-slate-200 dark:border-slate-700">
                    Status: <strong className="font-semibold uppercase">{response.resolutionStatus.replace('_', ' ')}</strong>
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                {response.referenceNumber && (
                  <button
                    id="copy-ref-number-btn"
                    onClick={handleCopyRef}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono text-[11px] transition-colors cursor-pointer"
                  >
                    <FileCheck2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{response.referenceNumber}</span>
                    <span className="text-[10px] text-slate-400">{copiedRef ? '✓' : '(copy)'}</span>
                  </button>
                )}
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
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

            {/* Title & Author Info Section */}
            <div className="space-y-3 pt-1">
              <h2 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-snug">
                {response.statementTitle || `Official Communiqué regarding ${post.title}`}
              </h2>

              {/* Responder Author Box */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80">
                <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center justify-center shrink-0 font-bold text-xs">
                  <User className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm truncate">
                    {response.responderName}
                  </p>
                  <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 truncate">
                    {response.responderTitle} • {response.institutionName}
                  </p>
                </div>
              </div>
            </div>

            {/* Body Statement Content */}
            <div className="p-4 sm:p-5 rounded-xl bg-slate-50/70 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 leading-relaxed space-y-3 text-xs sm:text-sm shadow-xs">
              {(response.fullStatement || response.message).split('\n\n').map((paragraph, idx) => (
                <p key={`p-${idx}`} className="whitespace-pre-line">
                  {paragraph}
                </p>
              ))}
            </div>

            {/* Action Timeline Progress Steps */}
            {timelineSteps.length > 0 && (
              <div id="statement-timeline-section" className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-950/90 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Official Action & Resolution Timeline
                  </h4>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Live dispatch</span>
                </div>
                <div className="space-y-3 pt-1">
                  {timelineSteps.map((step, idx) => (
                    <div key={`step-${idx}-${step.step.slice(0, 8)}`} className="flex items-start gap-3 relative">
                      {idx !== timelineSteps.length - 1 && (
                        <div className="absolute left-3.5 top-6 bottom-0 w-0.5 bg-slate-300 dark:bg-slate-700" />
                      )}
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
                          <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center border border-slate-300 dark:border-slate-700">
                            <span className="text-xs font-semibold">{idx + 1}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 pb-2 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {step.step}
                          </p>
                          {step.timestamp && (
                            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 shrink-0">
                              {step.timestamp}
                            </span>
                          )}
                        </div>
                        {step.description && (
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Documents */}
              {response.documents && response.documents.length > 0 && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 space-y-2">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
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
                        className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 hover:border-blue-400 transition-colors text-xs text-slate-800 dark:text-slate-200"
                      >
                        <span className="font-medium truncate mr-2">
                          📄 {doc.title}
                        </span>
                        {doc.size && <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono shrink-0">{doc.size}</span>}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Hotlines */}
              {response.hotlines && response.hotlines.length > 0 && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 space-y-2">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-500" />
                    Direct Agency Contact & Hotlines
                  </h5>
                  <div className="space-y-1.5">
                    {response.hotlines.map((line, idx) => (
                      <div
                        key={`line-${idx}`}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 text-xs text-slate-800 dark:text-slate-200"
                      >
                        <span className="font-medium truncate">
                          📞 {line}
                        </span>
                        <a
                          href={`tel:${line.split(' ')[0].replace(/[^0-9+]/g, '')}`}
                          className="px-2.5 py-1 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[11px] font-semibold hover:bg-emerald-200 dark:hover:bg-emerald-900"
                        >
                          Call
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Transparency Rating bar */}
            <div className="flex items-center justify-between gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 hidden sm:block" />
                <div className="min-w-0">
                  <span className="font-semibold text-slate-900 dark:text-slate-100 text-[11px] sm:text-xs truncate block">
                    Clear and transparent statement?
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 truncate hidden sm:block">
                    Public accountability rating
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  id="vote-helpful-btn"
                  onClick={() => handleVote('helpful')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                    helpfulVote === 'helpful'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-slate-700'
                  }`}
                  title="Mark statement as clear and transparent"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>Clear ({helpfulCount})</span>
                </button>
                <button
                  id="vote-unhelpful-btn"
                  onClick={() => handleVote('unhelpful')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                    helpfulVote === 'unhelpful'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-slate-700'
                  }`}
                  title="Mark statement as unclear or inadequate"
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                  <span>Unclear ({unhelpfulCount})</span>
                </button>
              </div>
            </div>
          </div>

          {/* REVERSE CONTEXT: "In Response To Citizen Issue Report" */}
          <div id="statement-parent-post-context" className="p-4 sm:p-5 bg-slate-100/70 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                In Direct Response To Citizen Issue
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigate(`/post/${post.id}`);
                    onClose();
                  }}
                  className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <span>View Original Report</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
                  • {post.location.landmark || post.location.district}, {post.location.region}
                </span>
              </div>
            </div>

            <div
              onClick={() => {
                navigate(`/post/${post.id}`);
                onClose();
              }}
              className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 shadow-xs flex flex-col sm:flex-row gap-3 items-start cursor-pointer transition-colors group"
            >
              {post.media && post.media.length > 0 && (
                <img
                  src={post.media[0].url}
                  alt={post.title}
                  className="w-full sm:w-28 h-24 sm:h-20 rounded-lg object-cover shrink-0 border border-slate-200 dark:border-slate-800"
                />
              )}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {post.category}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    Reported by <strong className="text-slate-700 dark:text-slate-300">{post.authorName}</strong> (@{post.authorHandle})
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 text-xs sm:text-sm line-clamp-2 transition-colors">
                  {post.title}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                  {post.content}
                </p>
                <div className="flex items-center gap-3 pt-1 text-[10px] text-slate-500 dark:text-slate-400">
                  <span>👥 {post.engagement.confirmations} confirmations</span>
                  <span>💬 {post.engagement.comments} comments</span>
                  <span>📅 {new Date(post.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Perspective Switcher Tabs */}
          <div id="statement-discussion-tabs" className="px-4 sm:px-5 pt-3 bg-white dark:bg-slate-900">
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar">
              <button
                id="tab-statement-replies"
                onClick={() => setActiveTab('statement_replies')}
                className={`pb-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === 'statement_replies'
                    ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Replies ({comments.length})</span>
              </button>

              <button
                id="tab-original-report"
                onClick={() => setActiveTab('original_report_discussion')}
                className={`pb-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === 'original_report_discussion'
                    ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Citizen Thread ({post.commentsList?.length || post.engagement.comments || 0})</span>
              </button>

              {otherAgencyResponses.length > 0 && (
                <button
                  id="tab-agency-thread"
                  onClick={() => setActiveTab('agency_thread')}
                  className={`pb-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors ${
                    activeTab === 'agency_thread'
                      ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Other Agencies ({otherAgencyResponses.length})</span>
                </button>
              )}
            </div>
          </div>

          {/* TAB 1: STATEMENT REPLIES */}
          {activeTab === 'statement_replies' && (
            <div id="tab-content-statement-replies" className="p-4 sm:p-5 space-y-4 bg-white dark:bg-slate-900">
              {/* Comment Composer */}
              <form onSubmit={handleCommentSubmit} className="space-y-2">
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0 text-xs font-bold">
                    {currentUser?.name ? currentUser.name.charAt(0) : 'C'}
                  </div>
                  <div className="flex-1 relative">
                    <textarea
                      id="statement-reply-textarea"
                      value={newCommentText}
                      onChange={e => setNewCommentText(e.target.value)}
                      placeholder={`Reply directly to ${response.institutionName} regarding this statement...`}
                      rows={2}
                      className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                    />
                    <div className="flex justify-end mt-1.5">
                      <button
                        id="submit-statement-reply-btn"
                        type="submit"
                        disabled={!newCommentText.trim() || submittingComment}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{submittingComment ? 'Posting...' : 'Post Reply'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </form>

              {/* Comments List */}
              <div className="space-y-2.5 pt-1">
                {comments.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    No replies yet to this official statement.
                  </div>
                ) : (
                  comments.map(c => (
                    <div
                      key={c.id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900 dark:text-white">
                            {c.userName}
                          </span>
                          <span className="text-[10px] text-slate-400">@{c.userHandle}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300">
                        {c.content}
                      </p>
                      <div className="flex items-center gap-3 pt-1 text-[10px] text-slate-500">
                        <button
                          onClick={() => handleLikeComment(c.id)}
                          className={`flex items-center gap-1 hover:text-emerald-600 transition-colors ${
                            c.userLiked ? 'text-emerald-600 font-semibold' : ''
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

          {/* TAB 2: ORIGINAL CITIZEN REPORT DISCUSSION */}
          {activeTab === 'original_report_discussion' && (
            <div id="tab-content-original-discussion" className="p-4 sm:p-5 space-y-3 bg-white dark:bg-slate-900">
              <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 text-xs text-blue-800 dark:text-blue-200 flex items-center justify-between">
                <span>Original community discussion on "{post.title}"</span>
                <span className="font-semibold">{post.commentsList?.length || post.engagement.comments || 0} Comments</span>
              </div>

              <div className="space-y-2.5">
                {post.commentsList && post.commentsList.length > 0 ? (
                  post.commentsList.map(c => (
                    <div
                      key={c.id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900 dark:text-white">
                            {c.userName}
                          </span>
                          <span className="text-[10px] text-slate-400">@{c.userHandle}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300">{c.content}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    No previous comments recorded on the original post.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: OTHER AGENCY STATEMENTS */}
          {activeTab === 'agency_thread' && (
            <div id="tab-content-agency-thread" className="p-4 sm:p-5 space-y-3 bg-white dark:bg-slate-900">
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                <span>Other state institutions that issued statements on this report:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">{otherAgencyResponses.length} Communiqué{otherAgencyResponses.length > 1 ? 's' : ''}</span>
              </div>
              {otherAgencyResponses.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No other agency statements found for this civic report.
                </div>
              ) : (
                otherAgencyResponses.map(r => (
                  <div
                    key={r.id}
                    id={`agency-response-card-${r.id}`}
                    onClick={(e) => handleSelectAnotherResponse(r, e)}
                    className="p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 space-y-2 hover:border-emerald-500 dark:hover:border-emerald-500/80 transition-all cursor-pointer shadow-xs hover:shadow-sm group"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 min-w-0">
                        {r.institutionLogo ? (
                          <img
                            src={r.institutionLogo}
                            alt={r.institutionName}
                            className="w-6 h-6 rounded-full object-cover shrink-0 ring-1 ring-slate-300 dark:ring-slate-700"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                            <Building2 className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <strong className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                          {r.institutionName}
                        </strong>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium shrink-0">
                          {r.responseType?.replace('_', ' ') || 'COMMUNIQUÉ'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleSelectAnotherResponse(r, e)}
                        className="text-xs px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/80 group-hover:bg-emerald-600 text-emerald-700 dark:text-emerald-300 group-hover:text-white border border-emerald-500/30 group-hover:border-emerald-600 font-semibold flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <span>View Statement</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2 leading-relaxed">
                      {r.statementTitle ? <strong className="text-slate-900 dark:text-slate-100">"{r.statementTitle}" — </strong> : null}
                      {r.message}
                    </p>
                    <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500 dark:text-slate-400">
                      <span>{r.responderName ? `By ${r.responderName} (${r.responderTitle || 'Spokesperson'})` : 'Official Agency Statement'}</span>
                      <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3 shrink-0 flex-wrap">
          <div className="text-[11px] sm:text-xs text-slate-500 flex items-center gap-1.5 min-w-0">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="truncate">Ghana National Civic Transparency Record</span>
          </div>
          <div className="flex items-center gap-2">
            {onViewAsFeedPost && (
              <button
                onClick={() => {
                  onViewAsFeedPost(post, response);
                  onClose();
                }}
                className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in Feed</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Standalone Share Preview Modal Fallback */}
      {isShareModalOpen && (
        <SharePreviewModal
          post={post}
          response={response}
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
        />
      )}
    </div>
  );
};
