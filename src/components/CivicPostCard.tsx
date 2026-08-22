import React, { useState, useRef } from 'react';
import {
  MapPin,
  Building2,
  Share2,
  Repeat2,
  MessageSquare,
  Bookmark,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  Volume2,
  Flame,
  ShieldCheck,
  MoreVertical,
  Flag,
  Sparkles,
  Camera,
  ExternalLink,
  Clock,
  UserCheck,
  Send,
  Eye,
  BellPlus,
  BellRing,
  BadgeCheck,
  ArrowRight,
  Heart,
  Reply,
  AtSign,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CivicPost, InstitutionResponse, CommunityEvidence } from '../types';
import { api } from '../services/api';
import { formatCount } from '../utils/format';

interface CivicPostCardProps {
  post: CivicPost;
  onOpenShare: (post: CivicPost) => void;
  onOpenAddEvidence: (post: CivicPost) => void;
  onOpenReportAbuse: (postId: string) => void;
  onOpenCluster?: (clusterId: string) => void;
  onPostUpdated: () => void;
  userRole?: 'citizen' | 'institution_rep' | 'journalist' | 'moderator' | 'admin';
  onOpenInstitutionResponse?: (post: CivicPost) => void;
  onViewOfficialResponse?: (post: CivicPost, response: InstitutionResponse) => void;
  onViewResponseFeedPost?: (post: CivicPost, response: InstitutionResponse) => void;
}

export const CivicPostCard: React.FC<CivicPostCardProps> = ({
  post,
  onOpenShare,
  onOpenAddEvidence,
  onOpenReportAbuse,
  onOpenCluster,
  onPostUpdated,
  userRole,
  onOpenInstitutionResponse,
  onViewOfficialResponse,
  onViewResponseFeedPost
}) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isFollowingIssue, setIsFollowingIssue] = useState(false);
  const [activeResponseIndex, setActiveResponseIndex] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const voiceMedia = post.media.find(m => m.type === 'audio');
  const visualMedia = post.media.filter(m => m.type === 'image' || m.type === 'video');

  const handleToggleConfirm = async () => {
    if (isConfirming) return;
    setIsConfirming(true);
    try {
      await api.toggleConfirmation(post.id);
      onPostUpdated();
    } catch (err) {
      console.error('Error confirming post:', err);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleToggleFollowIssue = async () => {
    if (isFollowingIssue) return;
    setIsFollowingIssue(true);
    try {
      await api.toggleFollowIssue(post.id);
      onPostUpdated();
    } catch (err) {
      console.error('Error following issue:', err);
    } finally {
      setIsFollowingIssue(false);
    }
  };

  const handleToggleBookmark = async () => {
    try {
      await api.toggleBookmark(post.id);
      onPostUpdated();
    } catch (err) {
      console.error('Error bookmarking:', err);
    }
  };

  const handleToggleRepost = async () => {
    try {
      await api.toggleRepost(post.id);
      onPostUpdated();
    } catch (err) {
      console.error('Error reposting:', err);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setIsSubmittingComment(true);
    try {
      await api.addComment(post.id, {
        content: commentText.trim(),
        parentCommentId: replyingToCommentId || undefined,
        userName: 'Citizen Participant',
        userHandle: 'citizen_gh'
      });
      setCommentText('');
      setReplyingToCommentId(null);
      onPostUpdated();
    } catch (err) {
      console.error('Error adding comment:', err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    try {
      await api.likeComment(commentId);
      onPostUpdated();
    } catch (err) {
      console.error('Error liking comment:', err);
    }
  };

  const toggleAudioPlayback = () => {
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  const getUrgencyBadge = () => {
    if (post.urgency === 'CRITICAL') {
      return (
        <span className="px-2 py-0.5 text-[10px] font-bold bg-red-950 text-red-300 border border-red-800 rounded-md flex items-center gap-1 animate-pulse">
          <AlertTriangle className="w-3 h-3 text-red-400" /> CRITICAL DANGER
        </span>
      );
    }
    if (post.urgency === 'HIGH') {
      return (
        <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800 rounded-md flex items-center gap-1">
          <Flame className="w-3 h-3 text-amber-400" /> HIGH PRIORITY
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700 rounded-md">
        {post.category}
      </span>
    );
  };

  return (
    <article
      id={`civic-post-${post.id}`}
      className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 sm:p-5 shadow-lg transition-all hover:border-slate-300 dark:hover:border-slate-700/80 space-y-3 relative overflow-hidden"
    >
      {/* Community Megaphone Banner & Issue Followership Controls */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/80 text-[11px] gap-2">
        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Public Report</span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
          {/* Issue Followership CTA */}
          <button
            onClick={handleToggleFollowIssue}
            disabled={isFollowingIssue}
            className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[11px] sm:text-xs font-bold flex items-center gap-1 transition-all active:scale-95 ${
              post.userFollowed
                ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40'
                : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
            }`}
            title="Follow this specific civic issue to get push updates whenever state bodies respond"
          >
            {post.userFollowed ? (
              <>
                <BellRing className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Following ({formatCount(post.engagement?.followersCount || post.followersCount || 0)})</span>
              </>
            ) : (
              <>
                <BellPlus className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Follow ({formatCount(post.engagement?.followersCount || post.followersCount || 0)})</span>
              </>
            )}
          </button>

          {getUrgencyBadge()}

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
                    onOpenShare(post);
                  }}
                  className="w-full text-left px-2 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded flex items-center gap-2"
                >
                  <Share2 className="w-3.5 h-3.5" /> Share / Export
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onOpenReportAbuse(post.id);
                  }}
                  className="w-full text-left px-2 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded flex items-center gap-2"
                >
                  <Flag className="w-3.5 h-3.5" /> Report Violation
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Author & Location Header (Social Media Format like X / Instagram) */}
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden flex-shrink-0">
            {post.authorAvatar && post.authorVisibility !== 'anonymous' ? (
              <img src={post.authorAvatar} alt={post.authorName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-emerald-600 to-teal-700 flex items-center justify-center text-white font-bold text-sm">
                {post.authorVisibility === 'anonymous' ? '🛡️' : post.authorName.charAt(0)}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100 truncate">{post.authorName}</span>
              {post.authorVisibility === 'anonymous' && (
                <span className="text-[10px] font-semibold bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 px-1.5 py-0.2 rounded">
                  Confidential
                </span>
              )}
              {post.isVerifiedCitizen && (
                <span className="text-emerald-600 dark:text-emerald-400 shrink-0" title="Verified Ghanaian Citizen">
                  <UserCheck className="w-3.5 h-3.5" />
                </span>
              )}
              <span className="text-xs text-slate-500 dark:text-slate-400 truncate">@{post.authorHandle}</span>
            </div>

            {/* Location & Time */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
              <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-medium truncate">
                <MapPin className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                {post.location.landmark ? `${post.location.landmark}, ` : ''}
                {post.location.region}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                <Clock className="w-3 h-3 shrink-0" />
                {new Date(post.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Title & Post Content */}
      <div className="space-y-1.5">
        <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white leading-snug tracking-tight">
          {post.title}
        </h3>
        <p className="text-sm text-slate-800 dark:text-slate-300 leading-relaxed whitespace-pre-line">
          {post.content}
        </p>

        {/* Refined translation/caption if available */}
        {post.translatedText && post.translatedText !== post.content && (
          <div className="mt-2 p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl text-xs">
            <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 mb-1">
              <Sparkles className="w-3 h-3" /> Clarified Civic Summary:
            </div>
            <p className="text-slate-700 dark:text-slate-300 italic text-xs leading-relaxed">"{post.translatedText}"</p>
          </div>
        )}
      </div>

      {/* Voice Note Audio Player */}
      {voiceMedia && (
        <div className="bg-slate-50 dark:bg-slate-800/90 border border-emerald-200 dark:border-emerald-900/40 p-3 rounded-xl flex items-center justify-between gap-3">
          <audio
            ref={audioRef}
            src={voiceMedia.url}
            onEnded={() => setIsPlayingAudio(false)}
            className="hidden"
          />
          <div className="flex items-center gap-2.5 flex-1">
            <button
              onClick={toggleAudioPlayback}
              className="w-9 h-9 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow-md transition-transform active:scale-95"
            >
              {isPlayingAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <Volume2 className="w-3.5 h-3.5" /> Citizen Voice Recording
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">{voiceMedia.duration || 12}s</span>
              </div>
              {/* Audio Waveform visualization */}
              <div className="flex items-center gap-1 h-4">
                {(voiceMedia.waveform || [30, 60, 80, 45, 90, 75, 40, 85, 60, 35, 70, 95, 50, 65, 40]).map((h, i) => (
                  <div
                    key={i}
                    style={{ height: `${isPlayingAudio ? Math.max(20, (h + (i % 3) * 20) % 100) : h}%` }}
                    className={`flex-1 rounded-full transition-all duration-150 ${isPlayingAudio ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Media Gallery */}
      {visualMedia.length > 0 && (
        <div className={`grid gap-2 rounded-xl overflow-hidden ${visualMedia.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {visualMedia.map((m, idx) => (
            <div key={m.id ? `${m.id}-${idx}` : `media-${idx}`} className="relative bg-slate-100 dark:bg-slate-950 rounded-xl overflow-hidden aspect-video border border-slate-200 dark:border-slate-800">
              {m.type === 'image' && (
                <img
                  src={m.url}
                  alt={m.caption || 'Evidence photo'}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              )}
              {m.type === 'video' && (
                <video src={m.url} controls className="w-full h-full object-cover" />
              )}
              {m.caption && (
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/90 via-slate-950/60 to-transparent p-2 text-[11px] text-slate-200">
                  {m.caption}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tagged State Institutions Bar */}
      {post.institutionTags.length > 0 && (
        <div className="bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Institutions Alerted:
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">
              Awareness Score: <strong className="text-emerald-600 dark:text-emerald-400">{post.credibilitySignals.institutionalAwarenessScore}%</strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {post.institutionTags.map((tag, idx) => {
              const matchingRespIdx = post.officialResponses?.findIndex(
                r => r.institutionId === tag.institutionId || r.institutionName.toLowerCase().includes(tag.shortName.toLowerCase())
              );
              const matchingResp = matchingRespIdx !== undefined && matchingRespIdx !== -1 && post.officialResponses
                ? post.officialResponses[matchingRespIdx]
                : undefined;
              return (
                <button
                  type="button"
                  key={`${tag.institutionId || 'inst'}-${idx}`}
                  onClick={() => {
                    if (matchingRespIdx !== undefined && matchingRespIdx !== -1) {
                      setActiveResponseIndex(matchingRespIdx);
                    }
                  }}
                  className={`px-2.5 py-1 bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-lg text-xs flex items-center gap-1.5 transition-all text-left ${
                    matchingResp
                      ? 'hover:border-emerald-500 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer ring-1 ring-emerald-500/30'
                      : ''
                  }`}
                  title={matchingResp ? 'Click to show this institution’s official statement in the response carousel' : undefined}
                >
                  <span className="font-semibold text-slate-800 dark:text-slate-200">@{tag.shortName || tag.acronym}</span>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                      tag.alertStatus === 'ACKNOWLEDGED'
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60'
                        : tag.alertStatus === 'DELIVERED'
                        ? 'bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-800/60'
                        : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60'
                    }`}
                  >
                    {tag.alertStatus === 'ACKNOWLEDGED'
                      ? '✓ Acknowledged'
                      : tag.alertStatus === 'DELIVERED'
                      ? '⚡ Dispatched'
                      : '✉️ Tagged'}
                  </span>
                  {matchingResp && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center">
                      • Statement 📄
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Official State Institution Responses Section */}
      {post.officialResponses && post.officialResponses.length > 0 && (() => {
        const responses = post.officialResponses;
        const totalResponses = responses.length;
        const safeIndex = (activeResponseIndex % totalResponses + totalResponses) % totalResponses;
        const resp = responses[safeIndex];

        return (
          <div className="space-y-2.5 pt-2">
            {/* Header with Multi-Statement Navigation */}
            <div className="flex items-center justify-between gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              <div className="flex items-center gap-1.5 min-w-0">
                <BadgeCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="truncate">
                  {totalResponses > 1
                    ? 'Official State Statements'
                    : 'Official State Response'}
                </span>
                {totalResponses > 1 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/80 normal-case tracking-normal shrink-0">
                    {totalResponses} Issued
                  </span>
                )}
              </div>

              {totalResponses > 1 && (
                <div className="flex items-center gap-1.5 normal-case tracking-normal shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveResponseIndex((prev) => (prev - 1 + totalResponses) % totalResponses);
                    }}
                    className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition-colors shadow-xs"
                    title="Previous official statement"
                    aria-label="Previous official statement"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 select-none">
                    {safeIndex + 1}/{totalResponses}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveResponseIndex((prev) => (prev + 1) % totalResponses);
                    }}
                    className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition-colors shadow-xs"
                    title="Next official statement"
                    aria-label="Next official statement"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Quick Agency Switcher Tabs if Multiple Responses Exist */}
            {totalResponses > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                {responses.map((r, rIdx) => {
                  const isActive = rIdx === safeIndex;
                  return (
                    <button
                      key={r.id ? `${r.id}-${rIdx}` : `tab-${rIdx}`}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveResponseIndex(rIdx);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                        isActive
                          ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-500 font-bold'
                          : 'bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <Building2 className={`w-3 h-3 ${isActive ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}`} />
                      <span>{r.institutionName.split(' ')[0] || r.institutionName}</span>
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Single Carousel Statement View */}
            <AnimatePresence mode="wait">
              <motion.div
                key={resp.id ? `${resp.id}-${safeIndex}` : `resp-${resp.institutionId}-${safeIndex}`}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                transition={{ duration: 0.15 }}
                onClick={() => {
                  if (onViewOfficialResponse) {
                    onViewOfficialResponse(post, resp);
                  }
                }}
                className="group bg-slate-50 dark:bg-slate-950/90 border-l-4 border-l-emerald-500 border-y border-r border-slate-200 dark:border-slate-800 hover:border-emerald-500/80 rounded-2xl p-3.5 sm:p-4 shadow-xl space-y-3 transition-all cursor-pointer hover:shadow-emerald-950/30"
              >
                {/* Institution Clean X/Social Media Style Header */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 p-0.5 flex items-center justify-center shadow-xs shrink-0">
                      <div className="w-full h-full bg-white dark:bg-slate-900 rounded-full flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition-colors truncate">
                          {resp.institutionName}
                        </span>
                        <BadgeCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      </div>

                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        <span className="font-medium text-slate-700 dark:text-slate-300">{resp.responderName}</span>
                        {resp.responderTitle && (
                          <span className="text-slate-500 dark:text-slate-400 font-normal"> • {resp.responderTitle}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Badge & Timestamp */}
                  <div className="text-right shrink-0">
                    <span className="px-2 py-0.5 text-[10px] sm:text-xs font-bold rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-800/80 uppercase tracking-wider inline-block">
                      {resp.responseType.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block font-mono">
                      {new Date(resp.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>

                {/* Statement Title if available */}
                {resp.statementTitle && (
                  <h5 className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-200 transition-colors">
                    "{resp.statementTitle}"
                  </h5>
                )}

                {/* Formatted Official Message Box (Summary) */}
                <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/90 rounded-xl p-3.5 text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-sans shadow-inner whitespace-pre-line line-clamp-3 group-hover:border-slate-300 dark:group-hover:border-slate-700">
                  {resp.message}
                </div>

                {/* Action Footer for Official Response */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-900 flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5" /> Official Accountability Record
                    </span>
                    {resp.commentsCount !== undefined && resp.commentsCount > 0 && (
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        💬 {resp.commentsCount} citizen replies
                      </span>
                    )}
                    {resp.helpfulCount !== undefined && resp.helpfulCount > 0 && (
                      <span className="text-emerald-700 dark:text-emerald-400/80 flex items-center gap-1">
                        👍 {resp.helpfulCount} found helpful
                      </span>
                    )}
                    {totalResponses > 1 && (
                      <div className="flex items-center gap-1 ml-1">
                        {responses.map((_, dotIdx) => (
                          <button
                            key={`dot-${dotIdx}`}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveResponseIndex(dotIdx);
                            }}
                            className={`h-1.5 rounded-full transition-all ${
                              dotIdx === safeIndex
                                ? 'w-4 bg-emerald-600 dark:bg-emerald-400'
                                : 'w-1.5 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
                            }`}
                            title={`View statement ${dotIdx + 1}`}
                            aria-label={`View statement ${dotIdx + 1}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        if (onViewResponseFeedPost) {
                          onViewResponseFeedPost(post, resp);
                        } else if (onViewOfficialResponse) {
                          onViewOfficialResponse(post, resp);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold border border-slate-200 dark:border-slate-700 text-xs transition-colors"
                      title="View this response formatted as a standalone reverse-hierarchy post in the feed"
                    >
                      <span>View Response Feed Post</span>
                      <ArrowRight className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    </button>

                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        if (onViewOfficialResponse) {
                          onViewOfficialResponse(post, resp);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 hover:bg-emerald-200 dark:hover:bg-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-semibold border border-emerald-300 dark:border-emerald-500/40 text-xs transition-colors"
                    >
                      <span>Full Communiqué</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        );
      })()}

      {/* Community Evidence Updates */}
      {post.communityEvidence && post.communityEvidence.length > 0 && (
        <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800/80 space-y-2">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            Community Evidence & Field Updates ({post.communityEvidence.length}):
          </div>
          {post.communityEvidence.map((ev, idx) => (
            <div key={ev.id ? `${ev.id}-${idx}` : `ev-${idx}`} className="text-xs text-slate-800 dark:text-slate-300 bg-white dark:bg-slate-900/60 p-2 rounded-lg border border-slate-200 dark:border-slate-800/60">
              <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-1">
                <span className="font-medium text-slate-700 dark:text-slate-300">{ev.userName}</span>
                <span>{new Date(ev.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p>{ev.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* Hashtags */}
      {post.hashtags && post.hashtags.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          {post.hashtags.map((tag, idx) => (
            <span key={`${tag}-${idx}`} className="text-emerald-600 dark:text-emerald-400/90 hover:text-emerald-500 cursor-pointer font-medium">
              {tag.startsWith('#') ? tag : `#${tag}`}
            </span>
          ))}
        </div>
      )}

      {/* Core Action Bar: "I'M SEEING THIS TOO", Add Evidence, Share, Amplify, Comments */}
      <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-1 sm:gap-1.5 text-slate-700 dark:text-slate-300 w-full overflow-x-auto no-scrollbar">
        {/* "I'M SEEING THIS TOO" Button */}
        <button
          id={`confirm-post-btn-${post.id}`}
          onClick={handleToggleConfirm}
          disabled={isConfirming}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold shrink-0 transition-all ${
            post.userConfirmed
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-emerald-700 dark:text-emerald-400 border border-slate-300 dark:border-slate-700/80'
          }`}
          title="Independently confirm that you observe or experience this issue"
        >
          <CheckCircle2 className={`w-3 h-3 shrink-0 ${post.userConfirmed ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}`} />
          <span className="whitespace-nowrap">I’m Seeing This Too</span>
          <span
            className={`px-1 py-0.2 rounded text-[10px] font-mono leading-none ${
              post.userConfirmed ? 'bg-emerald-800 text-white' : 'bg-slate-200 dark:bg-slate-900 text-emerald-800 dark:text-emerald-300'
            }`}
          >
            {formatCount(post.engagement?.confirmations || post.confirmationsCount || 0)}
          </span>
        </button>

        {/* Action Group: All aligned neatly with compact spacing */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Add Evidence CTA */}
          <button
            onClick={() => onOpenAddEvidence(post)}
            className="px-1.5 sm:px-2 py-1 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-medium rounded-lg border border-slate-300 dark:border-slate-700/80 flex items-center gap-1 transition-colors shrink-0"
            title="Add field photos or status update"
          >
            <Camera className="w-3 h-3 text-sky-600 dark:text-sky-400 shrink-0" />
            <span className="whitespace-nowrap"><span className="hidden xs:inline">Add </span>Evidence</span>
          </button>

          {/* Social Share */}
          <button
            id={`share-post-btn-${post.id}`}
            onClick={() => onOpenShare(post)}
            className="px-1.5 sm:px-2 py-1 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-medium rounded-lg border border-slate-300 dark:border-slate-700/80 flex items-center gap-1 transition-colors shrink-0"
            title="Share to WhatsApp, X, Facebook or Telegram"
          >
            <Share2 className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="whitespace-nowrap">Share</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{formatCount(post.engagement?.shares || post.sharesCount || 0)}</span>
          </button>

          {/* Repost / Amplify */}
          <button
            onClick={handleToggleRepost}
            className={`px-1.5 sm:px-2 py-1 rounded-lg text-[11px] font-medium border flex items-center gap-1 transition-colors shrink-0 ${
              post.userReposted
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                : 'bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700/80'
            }`}
            title="Amplify on platform"
          >
            <Repeat2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="whitespace-nowrap">Amplify</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{formatCount(post.engagement?.reposts || post.repostsCount || 0)}</span>
          </button>

          {/* Comments Toggle */}
          <button
            onClick={() => setShowComments(!showComments)}
            className="px-1.5 sm:px-2 py-1 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-medium rounded-lg border border-slate-300 dark:border-slate-700/80 flex items-center gap-1 transition-colors shrink-0"
          >
            <MessageSquare className="w-3 h-3 text-purple-600 dark:text-purple-400 shrink-0" />
            <span className="whitespace-nowrap">Comments</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{formatCount(post.commentsList?.length || post.engagement?.comments || post.commentsCount || 0)}</span>
          </button>

          {/* Institution Rep CTA if viewing in official mode */}
          {userRole === 'institution_rep' && onOpenInstitutionResponse && (
            <button
              onClick={() => onOpenInstitutionResponse(post)}
              className="px-1.5 sm:px-2 py-1 bg-amber-600 hover:bg-amber-500 text-slate-950 text-[11px] font-bold rounded-lg flex items-center gap-1 shadow-sm transition-colors shrink-0"
            >
              <Building2 className="w-3 h-3 shrink-0" />
              <span className="whitespace-nowrap">Respond</span>
            </button>
          )}
        </div>
      </div>

      {/* Expanded Comments Section */}
      {showComments && (
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5 animate-in fade-in">
          {/* Quick Tagging Chips */}
          <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1 font-medium">
              <AtSign className="w-3 h-3 text-purple-600 dark:text-purple-400" /> Quick Tag Agency:
            </span>
            {['@NADMO', '@ECG', '@GWCL', '@GhanaPolice', '@MWRH'].map(handleTag => (
              <button
                key={handleTag}
                type="button"
                onClick={() => setCommentText(prev => (prev ? `${prev} ${handleTag} ` : `${handleTag} `))}
                className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-purple-100 dark:hover:bg-purple-950/60 text-slate-700 dark:text-slate-300 hover:text-purple-700 dark:hover:text-purple-300 rounded-lg border border-slate-200 dark:border-slate-700 font-mono text-[10px] transition-colors"
              >
                {handleTag}
              </button>
            ))}
          </div>

          {/* Comment Form */}
          <form onSubmit={handleAddComment} className="space-y-1.5">
            {replyingToCommentId && (
              <div className="flex items-center justify-between text-[11px] bg-purple-50 dark:bg-purple-950/40 px-2.5 py-1 rounded-lg border border-purple-200 dark:border-purple-800/60 text-purple-800 dark:text-purple-300">
                <span className="flex items-center gap-1 font-medium">
                  <Reply className="w-3 h-3" /> Replying to comment
                </span>
                <button
                  type="button"
                  onClick={() => setReplyingToCommentId(null)}
                  className="font-bold hover:underline text-[10px]"
                >
                  Cancel Reply
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder={replyingToCommentId ? "Write your reply..." : "Add factual context or tag state agency with @..."}
                className="flex-1 p-2 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-400 rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:border-purple-500"
              />
              <button
                type="submit"
                disabled={isSubmittingComment || !commentText.trim()}
                className="px-3 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-sm transition-all"
              >
                <Send className="w-3 h-3" />
              </button>
            </div>
          </form>

          {/* Comment Stream */}
          <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
            {post.commentsList && post.commentsList.length > 0 ? (
              post.commentsList.map((c, idx) => (
                <div
                  key={c.id ? `${c.id}-${idx}` : `c-${idx}`}
                  className={`p-2.5 rounded-xl text-xs space-y-1 border transition-colors ${
                    c.parentCommentId
                      ? 'ml-4 bg-purple-50/50 dark:bg-purple-950/20 border-purple-200/60 dark:border-purple-900/40'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                      @{c.userHandle}
                      {c.isVerified && <span className="text-emerald-500 text-[10px]">✓</span>}
                    </span>
                    <span>{new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  {/* Comment Content with Tag Highlight */}
                  <p className="text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                    {c.content.split(/(@[\w_]+)/g).map((part, pIdx) =>
                      part.startsWith('@') ? (
                        <span key={pIdx} className="font-bold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/40 px-1 py-0.2 rounded">
                          {part}
                        </span>
                      ) : (
                        part
                      )
                    )}
                  </p>

                  {/* Comment Actions: Heart Like & Reply */}
                  <div className="flex items-center justify-between pt-1 text-[11px] border-t border-slate-200/60 dark:border-slate-700/40">
                    <button
                      type="button"
                      onClick={() => handleLikeComment(c.id)}
                      className={`flex items-center gap-1 transition-colors ${
                        c.userLiked
                          ? 'text-red-600 dark:text-red-400 font-bold'
                          : 'text-slate-500 dark:text-slate-400 hover:text-red-500'
                      }`}
                    >
                      <Heart className={`w-3 h-3 ${c.userLiked ? 'fill-current text-red-600 dark:text-red-400' : ''}`} />
                      <span>{c.likesCount || 0}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setReplyingToCommentId(c.id);
                        setCommentText(`@${c.userHandle} `);
                      }}
                      className="flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-300 font-medium transition-colors"
                    >
                      <Reply className="w-3 h-3" />
                      <span>Reply</span>
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-2 text-center italic">
                No comments yet. Be the first to add community context or tag an agency!
              </p>
            )}
          </div>
        </div>
      )}
    </article>
  );
};
