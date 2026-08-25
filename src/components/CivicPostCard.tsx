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
  ShieldAlert,
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
  ChevronRight,
  FileText,
  FileCheck,
  Download,
  Mic,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CivicPost, InstitutionResponse, CommunityEvidence } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatCount, formatCivicDate } from '../utils/format';
import { CommunityEvidenceSection } from './CommunityEvidenceSection';
import { SeenTooPromptModal } from './SeenTooPromptModal';

interface CivicPostCardProps {
  post: CivicPost;
  onOpenShare: (post: CivicPost, response?: InstitutionResponse) => void;
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
  const { currentUser, requireAuth } = useAuth();
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSeenTooPromptOpen, setIsSeenTooPromptOpen] = useState(false);
  const [isFollowingIssue, setIsFollowingIssue] = useState(false);
  const [activeResponseIndex, setActiveResponseIndex] = useState(0);
  const [showExternalShareOptions, setShowExternalShareOptions] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const voiceMedia = post.media.find(m => m.type === 'audio');
  const visualMedia = post.media.filter(m => (m.type === 'image' && !m.isSystemThumbnail) || m.type === 'video');
  const documentMedia = post.media.filter(m => m.type === 'document');

  // "Seen This Too" Confirmation Handler
  const handleToggleConfirm = () => {
    requireAuth(
      async () => {
        if (isConfirming) return;
        setIsConfirming(true);
        const willBeConfirmed = !post.userConfirmed;
        try {
          await api.toggleConfirmation(post.id);
          onPostUpdated();
          if (willBeConfirmed) {
            setIsSeenTooPromptOpen(true);
          }
        } catch (err) {
          console.error('Error confirming post:', err);
        } finally {
          setIsConfirming(false);
        }
      },
      { type: 'seen_too', postId: post.id },
      {
        title: 'Sign In to Confirm Issue',
        description: "Confirming you've seen this issue gives verified signal to state responders and local authorities.",
        badge: "Verification Required: 'Seen This Too'"
      }
    );
  };

  const handleOpenAddEvidence = () => {
    requireAuth(
      () => onOpenAddEvidence(post),
      { type: 'add_evidence', postId: post.id },
      {
        title: 'Sign In to Add Evidence',
        description: 'Submit on-the-ground photos, videos, voice updates or progress notes.',
        badge: 'Verification Required: Field Evidence'
      }
    );
  };

  const handleToggleFollowIssue = () => {
    requireAuth(
      async () => {
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
      },
      { type: 'follow_issue', postId: post.id },
      {
        title: 'Sign In to Follow Updates',
        description: 'Receive real-time notifications when institutions respond or resolve this issue.',
        badge: 'Verification Required: Follow Issue'
      }
    );
  };

  const handleToggleBookmark = () => {
    requireAuth(
      async () => {
        try {
          await api.toggleBookmark(post.id);
          onPostUpdated();
        } catch (err) {
          console.error('Error bookmarking:', err);
        }
      },
      { type: 'bookmark', postId: post.id }
    );
  };

  // Internal Platform Amplification (Civic Signal Boost)
  const handleToggleRepost = () => {
    requireAuth(
      async () => {
        try {
          await api.toggleRepost(post.id);
          onPostUpdated();
          setShowExternalShareOptions(true); // Offer external distribution option after amplifying
        } catch (err) {
          console.error('Error reposting:', err);
        }
      },
      { type: 'amplify', postId: post.id },
      {
        title: 'Sign In to Amplify Alert',
        description: 'Amplify this civic alert to boost its priority score and notify local authorities.',
        badge: 'Verification Required: Amplify'
      }
    );
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    const textToSend = commentText.trim();
    const parentIdToSend = replyingToCommentId || undefined;

    requireAuth(
      async () => {
        setIsSubmittingComment(true);
        try {
          await api.addComment(post.id, {
            content: textToSend,
            parentCommentId: parentIdToSend,
            userName: currentUser?.name || 'Citizen Participant',
            userHandle: currentUser?.handle || 'citizen_gh'
          });
          setCommentText('');
          setReplyingToCommentId(null);
          onPostUpdated();
        } catch (err) {
          console.error('Error adding comment:', err);
        } finally {
          setIsSubmittingComment(false);
        }
      },
      { type: 'comment', postId: post.id, content: textToSend, parentCommentId: parentIdToSend },
      {
        title: 'Sign In to Submit Comment',
        description: 'Join verified community deliberations and tag state institutions directly.',
        badge: 'Verification Required: Comment'
      }
    );
  };

  const handleReplyToComment = (c: any) => {
    requireAuth(
      () => {
        setShowComments(true);
        setReplyingToCommentId(c.id);
        setCommentText(`@${c.userHandle} `);
      },
      { type: 'reply', postId: post.id, parentCommentId: c.id, initialText: `@${c.userHandle} ` }
    );
  };

  const handleLikeComment = (commentId: string) => {
    requireAuth(
      async () => {
        try {
          await api.likeComment(commentId);
          onPostUpdated();
        } catch (err) {
          console.error('Error liking comment:', err);
        }
      },
      { type: 'like_comment', postId: post.id, commentId }
    );
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
    const rawUrgency = (post.urgency || '').toUpperCase();
    const rawSeverity = (post.severity || '').toUpperCase();

    if (rawUrgency === 'CRITICAL' || rawSeverity === 'EMERGENCY') {
      return (
        <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800 rounded-md flex items-center gap-1 shrink-0 shadow-xs">
          <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0 animate-pulse" />
          <span className="whitespace-nowrap font-bold">Emergency</span>
        </span>
      );
    }

    if (rawUrgency === 'HIGH' || rawSeverity === 'SEVERE') {
      return (
        <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800 rounded-md flex items-center gap-1 shrink-0 shadow-xs">
          <Flame className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="whitespace-nowrap font-bold">High</span>
        </span>
      );
    }

    return (
      <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-md flex items-center gap-1 shrink-0 shadow-xs">
        <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span className="whitespace-nowrap font-bold">Moderate</span>
      </span>
    );
  };

  return (
    <article
      id={`civic-post-${post.id}`}
      className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 sm:p-5 shadow-lg transition-all hover:border-slate-300 dark:hover:border-slate-700/80 space-y-3 relative overflow-hidden"
    >
      {/* Header Bar: Category Tag, Follow Control, Urgency Badge, Menu */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/80 text-[11px] gap-1.5 sm:gap-2 flex-nowrap min-w-0">
        <div className="flex items-center gap-1.5 min-w-0 shrink">
          <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 truncate">
            {post.category}
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap justify-end shrink-0">
          <button
            onClick={handleToggleFollowIssue}
            disabled={isFollowingIssue}
            className={`px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95 shrink-0 ${
              post.userFollowed
                ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40'
                : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700'
            }`}
          >
            {post.userFollowed ? (
              <>
                <BellRing className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="font-semibold hidden xs:inline">Following</span>
              </>
            ) : (
              <>
                <BellPlus className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="font-semibold">Follow</span>
              </>
            )}
            <span className="text-[9.5px] sm:text-[10px] opacity-80">({formatCount(post.engagement?.followersCount || post.followersCount || 0)})</span>
          </button>

          {getUrgencyBadge()}

          {/* Menu Options (Behind •••) */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-1.5 z-30">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    handleToggleBookmark();
                  }}
                  className="w-full text-left px-2 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded flex items-center gap-2"
                >
                  <Bookmark className="w-3.5 h-3.5" /> {post.userBookmarked ? 'Remove Bookmark' : 'Bookmark Report'}
                </button>

                <button
                  onClick={() => {
                    setShowMenu(false);
                    handleOpenAddEvidence();
                  }}
                  className="w-full text-left px-2 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded flex items-center gap-2"
                >
                  <Camera className="w-3.5 h-3.5" /> Submit Field Evidence
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

      {/* Tagged Authorities & Multi-Channel Action Flow Header */}
      {post.institutionTags && post.institutionTags.length > 0 && (
        <div className="bg-slate-50 dark:bg-slate-950/80 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              State Authorities Tagged & Multi-Channel Flow:
            </span>
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
              Signal Awareness: {post.credibilitySignals?.institutionalAwarenessScore || 85}%
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {post.institutionTags.map((tag, idx) => (
              <div
                key={idx}
                className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-lg text-xs flex items-center gap-1.5 shadow-2xs"
              >
                <span className="font-bold text-slate-900 dark:text-slate-100">🏛 @{tag.shortName || tag.acronym}</span>
                <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase ${
                  tag.alertStatus === 'ACKNOWLEDGED'
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                    : tag.alertStatus === 'DELIVERED' || tag.alertStatus === 'SENT'
                    ? 'bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-800'
                    : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                }`}>
                  {tag.alertStatus === 'ACKNOWLEDGED' ? '✓ Acknowledged' : tag.alertStatus === 'DELIVERED' ? '⚡ Dispatched' : '✉️ Alert Queued'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Author & Location Header */}
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 overflow-hidden shrink-0">
            {post.authorAvatar && post.authorVisibility !== 'anonymous' ? (
              <img src={post.authorAvatar} alt={post.authorName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-emerald-600 to-teal-700 flex items-center justify-center text-white font-bold text-sm">
                {post.authorVisibility === 'anonymous' ? '🛡️' : post.authorName.charAt(0)}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap leading-tight">
              <span className="font-bold text-[13px] sm:text-sm text-slate-900 dark:text-slate-100 truncate">
                {post.authorName}
              </span>
              {post.authorVisibility === 'anonymous' && (
                <span className="text-[10px] font-semibold bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 px-1.5 py-0.2 rounded-md">
                  Confidential
                </span>
              )}
              {post.isVerifiedCitizen && (
                <span className="text-emerald-600 dark:text-emerald-400 shrink-0 inline-flex items-center">
                  <BadgeCheck className="w-4 h-4 fill-emerald-500/15" />
                </span>
              )}
              <span className="text-xs text-slate-500 dark:text-slate-400 font-normal truncate">
                @{post.authorHandle}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
              <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium truncate">
                <MapPin className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                {post.location.landmark ? `${post.location.landmark}, ` : ''}
                {post.location.region}
              </span>
              <span>•</span>
              <span className="font-mono text-[11px]">{formatCivicDate(post.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Post Title & Content */}
      <div className="space-y-1.5 font-editorial">
        <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white leading-snug tracking-tight font-editorial">
          {post.title}
        </h3>
        <p className="text-base text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line font-editorial">
          {post.content}
        </p>
      </div>

      {/* Voice Recording Card if present */}
      {voiceMedia && (
        <div className="relative rounded-2xl overflow-hidden border border-emerald-500/40 shadow-xl my-2 bg-slate-950 aspect-[16/9] sm:aspect-[21/9] flex items-end p-4">
          <audio ref={audioRef} src={voiceMedia.url} onEnded={() => setIsPlayingAudio(false)} className="hidden" />
          <div className="relative z-10 w-full flex items-center gap-3">
            <button
              onClick={toggleAudioPlayback}
              className="w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shrink-0 shadow-xl"
            >
              {isPlayingAudio ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
            </button>
            <div className="flex-1 min-w-0 text-white">
              <div className="text-xs font-bold flex items-center gap-1.5">
                <Mic className="w-4 h-4 text-emerald-400 animate-pulse" /> Citizen Voice Recording ({voiceMedia.duration || 12}s)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Visual Media Gallery */}
      {visualMedia.length > 0 && (
        <div className={`grid gap-2 rounded-xl overflow-hidden ${visualMedia.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {visualMedia.map((m, idx) => (
            <div key={idx} className="relative bg-slate-100 dark:bg-slate-950 rounded-xl overflow-hidden aspect-video border border-slate-200 dark:border-slate-800">
              {m.type === 'image' && <img src={m.url} alt="Evidence" className="w-full h-full object-cover" loading="lazy" />}
              {m.type === 'video' && <video src={m.url} controls className="w-full h-full object-cover" />}
            </div>
          ))}
        </div>
      )}

      {/* Official State Responses Carousel / Communique Section */}
      {post.officialResponses && post.officialResponses.length > 0 && (
        <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <BadgeCheck className="w-4 h-4 text-emerald-600" />
              Official State Communiqué & Resolution
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950/90 border-l-4 border-l-emerald-500 border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                {post.officialResponses[0].institutionName}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                {post.officialResponses[0].responseType.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed italic">
              "{post.officialResponses[0].message}"
            </p>
          </div>
        </div>
      )}

      {/* Citizen Field Evidence Section */}
      <CommunityEvidenceSection
        evidence={post.communityEvidence}
        post={post}
        onOpenAddEvidence={handleOpenAddEvidence}
      />

      {/* Core Primary Action Bar Hierarchy: 1. Seen This Too, 2. Amplify, 3. Comment, 4. Share */}
      <div className="pt-2.5 sm:pt-3 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-1.5 sm:gap-2 text-slate-700 dark:text-slate-300 w-full min-w-0">
        {/* 1. ❤️ Seen This Too Action */}
        <button
          id={`confirm-post-btn-${post.id}`}
          onClick={handleToggleConfirm}
          disabled={isConfirming}
          className={`h-9 sm:h-9.5 px-3 sm:px-3.5 py-1.5 rounded-xl text-xs sm:text-[13px] font-bold shrink-0 transition-all active:scale-95 flex items-center gap-1.5 shadow-xs cursor-pointer ${
            post.userConfirmed
              ? 'bg-emerald-600 text-white shadow-emerald-900/30'
              : 'bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 text-emerald-700 dark:text-emerald-400 border border-slate-300 dark:border-slate-700/80'
          }`}
          title="Confirm you have seen this issue too"
        >
          <CheckCircle2 className={`w-4 h-4 shrink-0 ${post.userConfirmed ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}`} />
          <span className="whitespace-nowrap">Seen Too</span>
          <span className={`px-1.5 py-0.5 rounded-md text-[10px] sm:text-xs font-mono font-bold leading-none ${
            post.userConfirmed ? 'bg-emerald-800 text-white' : 'bg-slate-200 dark:bg-slate-900 text-emerald-800 dark:text-emerald-300'
          }`}>
            {formatCount(post.engagement?.confirmations || post.confirmationsCount || 0)}
          </span>
        </button>

        {/* 2. 📣 Amplify Internal Civic Signal Action */}
        <button
          onClick={handleToggleRepost}
          className={`h-9 sm:h-9.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs sm:text-[13px] font-bold border flex items-center justify-center gap-1 sm:gap-1.5 transition-all shrink-0 active:scale-95 shadow-xs cursor-pointer ${
            post.userReposted
              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
              : 'bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300/80 dark:border-slate-700/80'
          }`}
          title="Amplify on SpeakUp platform signal engine"
        >
          <Repeat2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="whitespace-nowrap">Amplify</span>
          <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-mono font-medium">
            {formatCount(post.engagement?.reposts || post.repostsCount || 0)}
          </span>
        </button>

        {/* 3. 💬 Comment Action */}
        <button
          onClick={() => setShowComments(!showComments)}
          className="h-9 sm:h-9.5 px-2.5 sm:px-3 py-1.5 bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs sm:text-[13px] font-semibold rounded-xl border border-slate-300/80 dark:border-slate-700/80 flex items-center justify-center gap-1 sm:gap-1.5 transition-all shrink-0 active:scale-95 shadow-xs cursor-pointer"
        >
          <MessageSquare className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
          <span className="whitespace-nowrap hidden md:inline">Comments</span>
          <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-mono font-medium">
            {formatCount(post.commentsList?.length || post.engagement?.comments || post.commentsCount || 0)}
          </span>
        </button>

        {/* 4. ➤ External Social Share Distribution */}
        <button
          id={`share-post-btn-${post.id}`}
          onClick={() => onOpenShare(post)}
          className="h-9 sm:h-9.5 px-2.5 sm:px-3 py-1.5 bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs sm:text-[13px] font-semibold rounded-xl border border-slate-300/80 dark:border-slate-700/80 flex items-center justify-center gap-1 sm:gap-1.5 transition-all shrink-0 active:scale-95 shadow-xs cursor-pointer"
          title="Share to external platforms (WhatsApp, X, Facebook)"
        >
          <Share2 className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="whitespace-nowrap hidden md:inline">Share</span>
          <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-mono font-medium">
            {formatCount(post.engagement?.shares || post.sharesCount || 0)}
          </span>
        </button>
      </div>

      {/* External Share Option Prompt after internal Amplification */}
      {showExternalShareOptions && (
        <div className="p-3 bg-emerald-950/70 border border-emerald-800 rounded-xl flex items-center justify-between text-xs text-emerald-200 animate-in fade-in">
          <span>✓ Amplified internally on SpeakUp! Share wider to WhatsApp or X?</span>
          <button
            type="button"
            onClick={() => {
              setShowExternalShareOptions(false);
              onOpenShare(post);
            }}
            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-[11px] flex items-center gap-1"
          >
            <Share2 className="w-3 h-3" /> Share Wider
          </button>
        </div>
      )}

      {/* Comments Section */}
      {showComments && (
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5 animate-in fade-in">
          {/* Quick Tag Agency Chips */}
          <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1 font-medium">
              <AtSign className="w-3 h-3 text-purple-600 dark:text-purple-400" /> Quick Tag Agency:
            </span>
            {['@NADMO', '@ECG', '@GWCL', '@GhanaPolice', '@MWRH'].map(handleTag => (
              <button
                key={handleTag}
                type="button"
                onClick={() => setCommentText(prev => (prev ? `${prev} ${handleTag} ` : `${handleTag} `))}
                className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-purple-100 dark:hover:bg-purple-950/60 text-slate-700 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700 font-mono text-[10px]"
              >
                {handleTag}
              </button>
            ))}
          </div>

          <form onSubmit={handleAddComment} className="flex items-center gap-2">
            <input
              type="text"
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="Add context or tag agency with @..."
              className="flex-1 p-2 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:border-purple-500"
            />
            <button
              type="submit"
              disabled={isSubmittingComment || !commentText.trim()}
              className="px-3 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-sm"
            >
              <Send className="w-3 h-3" />
            </button>
          </form>

          {/* Comment List */}
          <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
            {post.commentsList && post.commentsList.length > 0 ? (
              post.commentsList.map((c, idx) => (
                <div key={idx} className="p-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">@{c.userHandle}</span>
                    <span className="text-[10px] font-mono">{new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-slate-800 dark:text-slate-200">{c.content}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 py-2 text-center italic">No comments yet. Be the first to comment!</p>
            )}
          </div>
        </div>
      )}

      <SeenTooPromptModal
        post={post}
        isOpen={isSeenTooPromptOpen}
        onClose={() => setIsSeenTooPromptOpen(false)}
        onOpenAddEvidence={handleOpenAddEvidence}
        confirmationsCount={post.engagement?.confirmations || post.confirmationsCount || 0}
      />
    </article>
  );
};
