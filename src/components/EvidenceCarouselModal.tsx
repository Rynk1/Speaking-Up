import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Heart,
  MessageSquare,
  Share2,
  BadgeCheck,
  MapPin,
  Clock,
  Send,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Check,
  Copy,
  Info,
  Flame,
  Wrench,
  CheckCircle2,
  Camera,
  Film,
  Mic,
  FileCheck,
  Layers,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence, useAnimationControls } from 'motion/react';
import { CivicPost, CommunityEvidence, PostMedia, PostComment } from '../types';
import { formatCivicDate } from '../utils/format';
import { api } from '../services/api';

export interface UnifiedEvidenceItem {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userHandle: string;
  userAvatar?: string;
  isVerified?: boolean;
  title?: string;
  text: string;
  media: PostMedia[];
  statusUpdate: 'still_ongoing' | 'worsened' | 'improving' | 'resolved';
  likesCount: number;
  userLiked?: boolean;
  commentsCount?: number;
  location?: { landmark?: string; district?: string; region?: string };
  createdAt: string;
  isOriginalPost?: boolean;
}

interface EvidenceCarouselModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: CivicPost;
  initialEvidenceIndex?: number;
  initialMediaIndex?: number;
  onCommentAdded?: (comment: PostComment) => void;
  onEvidenceLiked?: (evidenceId: string, userLiked: boolean, likesCount: number) => void;
}

export const EvidenceCarouselModal: React.FC<EvidenceCarouselModalProps> = ({
  isOpen,
  onClose,
  post,
  initialEvidenceIndex = 0,
  initialMediaIndex = 0,
  onCommentAdded,
  onEvidenceLiked
}) => {
  // Build unified evidence list: Index 0 = Original Post Scene Report, followed by community evidence packs
  const buildUnifiedEvidenceList = useCallback((targetPost: CivicPost): UnifiedEvidenceItem[] => {
    const list: UnifiedEvidenceItem[] = [];

    // 1. Original Civic Post as foundational scene report
    const originalVisualMedia = (targetPost.media || []).filter(m => m.type !== 'document');
    const originalPostItem: UnifiedEvidenceItem = {
      id: `original-post-${targetPost.id}`,
      postId: targetPost.id,
      userId: targetPost.authorId,
      userName: targetPost.authorVisibility === 'anonymous' ? 'Anonymous Citizen' : targetPost.authorName,
      userHandle: targetPost.authorVisibility === 'anonymous' ? 'anonymous' : (targetPost.authorHandle || 'citizen_witness'),
      userAvatar: targetPost.authorAvatar,
      isVerified: targetPost.isVerifiedCitizen,
      title: targetPost.title,
      text: targetPost.content,
      media: originalVisualMedia.length > 0
        ? originalVisualMedia
        : [{
            id: `media-post-${targetPost.id}`,
            type: 'image' as const,
            url: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=1200&auto=format&fit=crop&q=80',
            caption: targetPost.title,
            uploadedAt: targetPost.createdAt
          }],
      statusUpdate: targetPost.accountabilityStatus === 'RESOLVED' || targetPost.accountabilityStatus === 'CLOSED'
        ? 'resolved'
        : 'still_ongoing',
      likesCount: targetPost.engagement?.confirmations || 0,
      userLiked: Boolean(targetPost.userConfirmed),
      commentsCount: targetPost.commentsCount || 0,
      location: {
        landmark: targetPost.location?.landmark,
        district: targetPost.location?.district,
        region: targetPost.location?.region
      },
      createdAt: targetPost.createdAt,
      isOriginalPost: true
    };
    list.push(originalPostItem);

    // 2. Follow-up Community Evidence Packs
    if (targetPost.communityEvidence && targetPost.communityEvidence.length > 0) {
      targetPost.communityEvidence.forEach((ev) => {
        const evMedia = ev.media && ev.media.length > 0
          ? ev.media
          : [{
              id: `text-media-${ev.id}`,
              type: 'image' as const,
              url: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=1200&auto=format&fit=crop&q=80',
              caption: ev.text,
              uploadedAt: ev.createdAt
            }];

        list.push({
          id: ev.id,
          postId: targetPost.id,
          userId: ev.userId,
          userName: ev.userName,
          userHandle: ev.userHandle || ev.userName.toLowerCase().replace(/\s+/g, '_'),
          userAvatar: ev.userAvatar,
          isVerified: ev.isVerified,
          title: ev.title,
          text: ev.text,
          media: evMedia,
          statusUpdate: ev.statusUpdate || 'still_ongoing',
          likesCount: ev.likesCount || 0,
          userLiked: Boolean(ev.userLiked),
          commentsCount: ev.commentsCount || 0,
          location: ev.location,
          createdAt: ev.createdAt,
          isOriginalPost: false
        });
      });
    }

    return list;
  }, []);

  const unifiedList = buildUnifiedEvidenceList(post);

  const [currentEvIndex, setCurrentEvIndex] = useState(0);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  
  // Motion direction tracking: vertical evidence scroll (1 = down/next, -1 = up/prev)
  // or horizontal media scroll (1 = right/next, -1 = left/prev)
  const [navDirection, setNavDirection] = useState<{ axis: 'vertical' | 'horizontal'; dir: number }>({
    axis: 'vertical',
    dir: 1
  });

  const [showCommentsDrawer, setShowCommentsDrawer] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Likes state per evidence
  const [likesState, setLikesState] = useState<{ [evidenceId: string]: { userLiked: boolean; count: number } }>({});
  const [isLiking, setIsLiking] = useState(false);

  // Audio/Video player state
  const [isPlayingMedia, setIsPlayingMedia] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Comments state
  const [commentInput, setCommentInput] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [localComments, setLocalComments] = useState<PostComment[]>([]);

  // Wheel scroll throttling to give natural reel snapping
  const lastWheelTime = useRef<number>(0);
  const wheelAccumulator = useRef<number>(0);

  // Initialize or update current indices when modal opens
  useEffect(() => {
    if (isOpen) {
      const validEvIdx = Math.max(0, Math.min(initialEvidenceIndex, Math.max(0, unifiedList.length - 1)));
      setCurrentEvIndex(validEvIdx);
      setCurrentMediaIndex(initialMediaIndex || 0);
      setNavDirection({ axis: 'vertical', dir: 1 });
      setShowCommentsDrawer(false);
      setIsPlayingMedia(true);

      // Initialize like states
      const initialLikes: { [id: string]: { userLiked: boolean; count: number } } = {};
      unifiedList.forEach(ev => {
        initialLikes[ev.id] = {
          userLiked: Boolean(ev.userLiked),
          count: ev.likesCount || 0
        };
      });
      setLikesState(initialLikes);
    }
  }, [isOpen, initialEvidenceIndex, initialMediaIndex, unifiedList.length]);

  // Keep local comments in sync with post comments
  useEffect(() => {
    if (post.commentsList) {
      setLocalComments(post.commentsList);
    }
  }, [post.commentsList]);

  const currentEvidence: UnifiedEvidenceItem | undefined = unifiedList[currentEvIndex] || unifiedList[0];
  const mediaItems: PostMedia[] = currentEvidence?.media || [];
  const currentMedia: PostMedia | undefined = mediaItems[currentMediaIndex] || mediaItems[0];

  // Navigation handlers with direction awareness
  const handlePrevMedia = useCallback(() => {
    if (mediaItems.length > 1) {
      setNavDirection({ axis: 'horizontal', dir: -1 });
      setCurrentMediaIndex((prev) => (prev - 1 + mediaItems.length) % mediaItems.length);
    }
  }, [mediaItems.length]);

  const handleNextMedia = useCallback(() => {
    if (mediaItems.length > 1) {
      setNavDirection({ axis: 'horizontal', dir: 1 });
      setCurrentMediaIndex((prev) => (prev + 1) % mediaItems.length);
    }
  }, [mediaItems.length]);

  const handlePrevEvidence = useCallback(() => {
    if (unifiedList.length > 1 && currentEvIndex > 0) {
      setNavDirection({ axis: 'vertical', dir: -1 });
      setCurrentEvIndex((prev) => prev - 1);
      setCurrentMediaIndex(0);
    }
  }, [unifiedList.length, currentEvIndex]);

  const handleNextEvidence = useCallback(() => {
    if (unifiedList.length > 1 && currentEvIndex < unifiedList.length - 1) {
      setNavDirection({ axis: 'vertical', dir: 1 });
      setCurrentEvIndex((prev) => prev + 1);
      setCurrentMediaIndex(0);
    }
  }, [unifiedList.length, currentEvIndex]);

  const handleJumpToEvidence = useCallback((idx: number) => {
    if (idx !== currentEvIndex && idx >= 0 && idx < unifiedList.length) {
      setNavDirection({ axis: 'vertical', dir: idx > currentEvIndex ? 1 : -1 });
      setCurrentEvIndex(idx);
      setCurrentMediaIndex(0);
    }
  }, [currentEvIndex, unifiedList.length]);

  // Wheel and Trackpad Scroll Event Handler (Tactile Reel Snapping)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    // If the comments drawer is open or user is inside an internal scroll container with room to scroll, let native scroll happen
    if (showCommentsDrawer) return;

    const target = e.target as HTMLElement | null;
    const scrollableContent = target?.closest('.evidence-content-scroll');
    if (scrollableContent) {
      const isAtTop = scrollableContent.scrollTop <= 0;
      const isAtBottom = scrollableContent.scrollTop + scrollableContent.clientHeight >= scrollableContent.scrollHeight - 2;
      
      // If user is actively scrolling inside description, only switch evidence if they hit the boundary
      if (e.deltaY < 0 && !isAtTop) return;
      if (e.deltaY > 0 && !isAtBottom) return;
    }

    const now = Date.now();
    wheelAccumulator.current += e.deltaY;

    // Threshold to prevent erratic micro-triggers
    if (Math.abs(wheelAccumulator.current) > 35 && now - lastWheelTime.current > 340) {
      if (wheelAccumulator.current > 0) {
        if (currentEvIndex < unifiedList.length - 1) {
          lastWheelTime.current = now;
          handleNextEvidence();
        }
      } else {
        if (currentEvIndex > 0) {
          lastWheelTime.current = now;
          handlePrevEvidence();
        }
      }
      wheelAccumulator.current = 0;
    }
  }, [showCommentsDrawer, currentEvIndex, unifiedList.length, handleNextEvidence, handlePrevEvidence]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      switch (e.key) {
        case 'Escape':
          if (showCommentsDrawer) {
            setShowCommentsDrawer(false);
          } else if (showShareModal) {
            setShowShareModal(false);
          } else {
            onClose();
          }
          break;
        case 'ArrowLeft':
          handlePrevMedia();
          break;
        case 'ArrowRight':
          handleNextMedia();
          break;
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault();
          handlePrevEvidence();
          break;
        case 'ArrowDown':
        case 'PageDown':
          e.preventDefault();
          handleNextEvidence();
          break;
        case ' ':
          e.preventDefault();
          setIsPlayingMedia((prev) => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showCommentsDrawer, showShareModal, onClose, handlePrevMedia, handleNextMedia, handlePrevEvidence, handleNextEvidence]);

  // Touch Swipe Gesture Management (Horizontal for media carousel, Vertical for evidence reel)
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchEndX = useRef(0);
  const touchEndY = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].clientX;
    touchEndY.current = e.changedTouches[0].clientY;
    handleSwipe();
  };

  const handleSwipe = () => {
    const diffX = touchStartX.current - touchEndX.current;
    const diffY = touchStartY.current - touchEndY.current;
    const absDiffX = Math.abs(diffX);
    const absDiffY = Math.abs(diffY);
    const minSwipeDistance = 38;

    if (absDiffX > absDiffY && absDiffX > minSwipeDistance) {
      if (diffX > 0) {
        handleNextMedia();
      } else {
        handlePrevMedia();
      }
    } else if (absDiffY > absDiffX && absDiffY > minSwipeDistance) {
      if (diffY > 0) {
        handleNextEvidence();
      } else {
        handlePrevEvidence();
      }
    }
  };

  // Like Toggle
  const handleToggleLike = async () => {
    if (!currentEvidence || isLiking) return;
    const evId = currentEvidence.id;
    const currentLike = likesState[evId] || { userLiked: false, count: currentEvidence.likesCount || 0 };
    const nextLiked = !currentLike.userLiked;
    const nextCount = nextLiked ? currentLike.count + 1 : Math.max(0, currentLike.count - 1);

    // Optimistic update
    setLikesState(prev => ({
      ...prev,
      [evId]: { userLiked: nextLiked, count: nextCount }
    }));

    if (onEvidenceLiked) {
      onEvidenceLiked(evId, nextLiked, nextCount);
    }

    setIsLiking(true);
    try {
      if (currentEvidence.isOriginalPost) {
        await api.toggleConfirmation(post.id);
      } else {
        const res = await api.toggleEvidenceLike(evId);
        setLikesState(prev => ({
          ...prev,
          [evId]: { userLiked: res.userLiked, count: res.likesCount }
        }));
      }
    } catch (err) {
      console.error('Failed to toggle like:', err);
      setLikesState(prev => ({
        ...prev,
        [evId]: currentLike
      }));
    } finally {
      setIsLiking(false);
    }
  };

  // Comment on Evidence Submit
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || !currentEvidence || isSubmittingComment) return;

    setIsSubmittingComment(true);
    try {
      const newComment = await api.addComment(post.id, {
        content: commentInput.trim(),
        evidenceId: currentEvidence.isOriginalPost ? undefined : currentEvidence.id,
        userName: 'Citizen Contributor',
        userHandle: 'citizen_witness'
      });

      setLocalComments(prev => [newComment, ...prev]);
      setCommentInput('');

      if (onCommentAdded) {
        onCommentAdded(newComment);
      }
    } catch (err) {
      console.error('Failed to post comment on evidence:', err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Copy Evidence Share Link
  const handleCopyLink = () => {
    const url = `${window.location.origin}/#post-${post.id}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (!isOpen || !currentEvidence) return null;

  // Filter comments specific to this evidence pack (or general post comments for initial post)
  const evidenceSpecificComments = currentEvidence.isOriginalPost
    ? localComments.filter(c => !c.evidenceId)
    : localComments.filter(c => c.evidenceId === currentEvidence.id);

  // Status helper badge
  const renderStatusBadge = (status?: string) => {
    switch (status) {
      case 'worsened':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/90 text-white backdrop-blur-md shadow-md border border-rose-400/50">
            <Flame className="w-3.5 h-3.5" />
            <span>Worsened</span>
          </span>
        );
      case 'improving':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-500/90 text-white backdrop-blur-md shadow-md border border-sky-400/50">
            <Wrench className="w-3.5 h-3.5" />
            <span>In Repair</span>
          </span>
        );
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/90 text-white backdrop-blur-md shadow-md border border-emerald-400/50">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Field Resolved</span>
          </span>
        );
      case 'still_ongoing':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/90 text-slate-950 backdrop-blur-md shadow-md border border-amber-300/60 font-semibold">
            <Clock className="w-3.5 h-3.5" />
            <span>Still Ongoing</span>
          </span>
        );
    }
  };

  const currentLikeInfo = likesState[currentEvidence.id] || {
    userLiked: Boolean(currentEvidence.userLiked),
    count: currentEvidence.likesCount || 0
  };

  const userAvatarUrl =
    currentEvidence.userAvatar ||
    `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(currentEvidence.userHandle || currentEvidence.userName || 'citizen')}`;

  // Animation variants for media stage (supports 3D vertical reel scrolling and horizontal sub-media transitions)
  const isVertical = navDirection.axis === 'vertical';
  const vDir = navDirection.dir;

  const mediaVariants = {
    initial: (custom: { isVert: boolean; dir: number }) => ({
      opacity: 0,
      y: custom.isVert ? custom.dir * 90 : 0,
      x: !custom.isVert ? custom.dir * 80 : 0,
      scale: 0.93,
      rotateX: custom.isVert ? custom.dir * -8 : 0,
      filter: 'blur(4px)'
    }),
    animate: {
      opacity: 1,
      y: 0,
      x: 0,
      scale: 1,
      rotateX: 0,
      filter: 'blur(0px)',
      transition: {
        type: 'spring' as const,
        stiffness: 340,
        damping: 32,
        mass: 0.85
      }
    },
    exit: (custom: { isVert: boolean; dir: number }) => ({
      opacity: 0,
      y: custom.isVert ? custom.dir * -90 : 0,
      x: !custom.isVert ? custom.dir * -80 : 0,
      scale: 0.93,
      rotateX: custom.isVert ? custom.dir * 8 : 0,
      filter: 'blur(4px)',
      transition: {
        duration: 0.22,
        ease: 'easeInOut' as const
      }
    })
  };

  // Content text synchronization variants
  const contentVariants = {
    initial: (custom: { dir: number }) => ({
      opacity: 0,
      y: custom.dir * 18,
      filter: 'blur(2px)'
    }),
    animate: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: {
        duration: 0.26,
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number]
      }
    },
    exit: (custom: { dir: number }) => ({
      opacity: 0,
      y: custom.dir * -14,
      filter: 'blur(2px)',
      transition: {
        duration: 0.16,
        ease: 'easeIn' as const
      }
    })
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-2xl select-none overflow-hidden p-0 sm:p-3 md:p-6 transition-colors duration-500"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
      style={{ perspective: 1200 }}
    >
      {/* Dynamic Background Ambience Layer */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-20 filter blur-3xl scale-125 transition-all duration-700 pointer-events-none"
        style={{
          backgroundImage: `url(${currentMedia?.url || currentMedia?.thumbnailUrl || 'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=600'})`
        }}
      />

      {/* Main Responsive Modal Shell with 3D Depth Framing */}
      <div className="relative w-full h-full sm:h-[94vh] max-w-4xl lg:max-w-5xl bg-slate-950 sm:rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col z-10">
        
        {/* TOP STATUS & REEL NAVIGATION HEADER BAR */}
        <div className="shrink-0 px-3.5 py-2.5 sm:px-5 sm:py-3 bg-slate-950/90 border-b border-white/10 flex items-center justify-between z-30 backdrop-blur-md">
          
          {/* Left: Pack Tracker & Status */}
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/90 backdrop-blur-md border border-white/15 text-white text-xs font-bold shadow-sm">
              <Camera className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="truncate">
                {currentEvidence.isOriginalPost
                  ? `Scene Baseline (${currentEvIndex + 1}/${unifiedList.length})`
                  : `Field Update ${currentEvIndex + 1} of ${unifiedList.length}`}
              </span>
            </div>

            {renderStatusBadge(currentEvidence.statusUpdate)}
          </div>

          {/* Right: Sequence Arrows & Vertical Reel Indicators & Close Button */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            
            {/* Tactile Vertical Navigation Controls */}
            {unifiedList.length > 1 && (
              <div className="flex items-center gap-1 bg-slate-800/90 backdrop-blur-md rounded-full p-1 border border-white/15 shadow-inner">
                <button
                  onClick={handlePrevEvidence}
                  disabled={currentEvIndex === 0}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-20 disabled:hover:bg-transparent disabled:cursor-not-allowed text-white flex items-center justify-center transition-all cursor-pointer active:scale-90"
                  title="Previous evidence (Scroll Up / Arrow Up)"
                  aria-label="Previous evidence"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>

                <div className="flex items-center px-1.5 gap-1">
                  <span className="text-[12px] font-mono font-extrabold text-sky-400">
                    {currentEvIndex + 1}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">/</span>
                  <span className="text-[11px] font-mono text-slate-300">
                    {unifiedList.length}
                  </span>
                </div>

                <button
                  onClick={handleNextEvidence}
                  disabled={currentEvIndex === unifiedList.length - 1}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-20 disabled:hover:bg-transparent disabled:cursor-not-allowed text-white flex items-center justify-center transition-all cursor-pointer active:scale-90"
                  title="Next evidence (Scroll Down / Arrow Down)"
                  aria-label="Next evidence"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-800/90 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-white/15 shadow-md"
              title="Close viewer (Esc)"
              aria-label="Close viewer"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* MAIN MEDIA STAGE VIEWPORT (Center - Tactile Reel Animation Canvas) */}
        <div 
          className="relative flex-1 min-h-[240px] sm:min-h-[300px] md:min-h-[360px] max-h-[50vh] sm:max-h-[54vh] bg-black flex items-center justify-center overflow-hidden"
          style={{ perspective: 1000 }}
        >
          
          {/* Subtle Vertical Reel Rail Spine on the right side */}
          {unifiedList.length > 1 && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 z-30 hidden sm:flex flex-col items-center gap-1.5 bg-black/60 backdrop-blur-md px-1.5 py-2.5 rounded-full border border-white/15 shadow-xl">
              {unifiedList.map((_, dotIdx) => (
                <button
                  key={`reel-dot-${dotIdx}`}
                  onClick={() => handleJumpToEvidence(dotIdx)}
                  className={`transition-all duration-300 rounded-full cursor-pointer ${
                    dotIdx === currentEvIndex
                      ? 'w-2 h-5 bg-sky-400 shadow-md shadow-sky-400/60 ring-2 ring-sky-400/30'
                      : 'w-2 h-2 bg-white/30 hover:bg-white/60 hover:scale-125'
                  }`}
                  title={`Jump to evidence ${dotIdx + 1}`}
                  aria-label={`Evidence ${dotIdx + 1}`}
                />
              ))}
            </div>
          )}

          {/* Horizontal Carousel Indicator Dots for Multiple Media within Current Evidence */}
          {mediaItems.length > 1 && (
            <div className="absolute top-3 inset-x-0 z-20 flex items-center justify-center gap-1.5 px-4 pointer-events-none">
              {mediaItems.map((_, dotIdx) => (
                <div
                  key={`dot-${dotIdx}`}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    dotIdx === currentMediaIndex
                      ? 'w-6 bg-white shadow-lg shadow-white/60'
                      : 'w-2 bg-white/40'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Quick Helper Scroll Cue on Bottom-Left of Media Stage */}
          {unifiedList.length > 1 && (
            <div className="absolute bottom-3 left-3.5 z-20 hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10.5px] text-slate-300 font-mono pointer-events-none">
              <span className="flex items-center text-sky-400 font-bold">
                <ChevronUp className="w-3 h-3 -mr-0.5" />
                <ChevronDown className="w-3 h-3" />
              </span>
              <span>Scroll wheel or ↑/↓ to navigate updates</span>
            </div>
          )}

          {/* Animated Active Media Item with Physical Reel Motion */}
          <div className="relative w-full h-full flex items-center justify-center p-1 sm:p-2">
            <AnimatePresence mode="wait" custom={{ isVert: isVertical, dir: navDirection.dir }}>
              <motion.div
                key={`${currentEvidence.id}-${currentMediaIndex}`}
                custom={{ isVert: isVertical, dir: navDirection.dir }}
                variants={mediaVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="w-full h-full flex items-center justify-center relative select-none will-change-transform"
                onClick={() => {
                  if (currentMedia?.type === 'video' || currentMedia?.type === 'audio') {
                    setIsPlayingMedia(prev => !prev);
                  }
                }}
              >
                {/* Image Media */}
                {(!currentMedia?.type || currentMedia.type === 'image') && (
                  <img
                    src={currentMedia?.url}
                    alt={currentMedia?.caption || currentEvidence.text}
                    className="max-h-full max-w-full object-contain select-none rounded-xl shadow-2xl transition-all duration-300"
                    draggable={false}
                  />
                )}

                {/* Video Media */}
                {currentMedia?.type === 'video' && (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <video
                      ref={videoRef}
                      src={currentMedia.url}
                      poster={currentMedia.thumbnailUrl}
                      loop
                      playsInline
                      autoPlay
                      muted={isMuted}
                      className="max-h-full max-w-full object-contain select-none rounded-xl shadow-2xl"
                      onPlay={() => setIsPlayingMedia(true)}
                      onPause={() => setIsPlayingMedia(false)}
                    />
                    
                    {!isPlayingMedia && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none rounded-xl">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-red-600/95 text-white flex items-center justify-center shadow-2xl animate-pulse">
                          <Play className="w-7 h-7 fill-white ml-1" />
                        </div>
                      </div>
                    )}

                    {/* Mute/Unmute Toggle */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMuted(prev => !prev);
                      }}
                      className="absolute bottom-3 right-3 z-20 w-9 h-9 rounded-full bg-black/80 hover:bg-black border border-white/20 text-white flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-90"
                      title={isMuted ? "Unmute video" : "Mute video"}
                    >
                      {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-white" />}
                    </button>
                  </div>
                )}

                {/* Audio Media / Voice Note */}
                {currentMedia?.type === 'audio' && (
                  <div className="w-full max-w-md p-5 bg-gradient-to-br from-slate-900 via-slate-850 to-slate-950 rounded-2xl border border-amber-500/30 shadow-2xl flex flex-col items-center justify-center gap-4 text-center mx-3">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-600 to-yellow-500 flex items-center justify-center shadow-xl shadow-amber-600/30 ring-6 ring-amber-500/10">
                      <Mic className="w-8 h-8 text-white animate-pulse" />
                    </div>

                    <div>
                      <h4 className="text-white font-bold text-sm sm:text-base">Field Audio Recording</h4>
                      <p className="text-amber-300 text-xs mt-0.5">{currentMedia.caption || 'Voice Note / Ambient Field Audio'}</p>
                      <span className="text-[11px] font-mono text-slate-400 block mt-1">Duration: {currentMedia.duration || 26}s</span>
                    </div>

                    <audio
                      ref={audioRef}
                      src={currentMedia.url}
                      autoPlay
                      loop
                      onPlay={() => setIsPlayingMedia(true)}
                      onPause={() => setIsPlayingMedia(false)}
                      className="hidden"
                    />

                    {/* Animated Waveform Visualizer */}
                    <div className="flex items-center justify-center gap-1.5 h-10 w-full px-4 bg-slate-950/80 rounded-xl border border-slate-700/60">
                      {[30, 65, 90, 45, 100, 75, 40, 85, 60, 35, 70, 95, 50, 65, 40, 80, 55, 90, 45, 70, 30].map((h, i) => (
                        <div
                          key={i}
                          style={{ height: `${isPlayingMedia ? Math.max(20, (h + (i % 5) * 15) % 100) : 20}%` }}
                          className={`flex-1 rounded-full transition-all duration-150 ${isPlayingMedia ? 'bg-amber-400 shadow-sm shadow-amber-400' : 'bg-slate-600'}`}
                        />
                      ))}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (audioRef.current) {
                          if (isPlayingMedia) {
                            audioRef.current.pause();
                          } else {
                            audioRef.current.play();
                          }
                        }
                      }}
                      className="px-5 py-2 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer"
                    >
                      {isPlayingMedia ? <Pause className="w-3.5 h-3.5 fill-slate-950" /> : <Play className="w-3.5 h-3.5 fill-slate-950" />}
                      <span>{isPlayingMedia ? 'Pause Audio' : 'Resume Audio'}</span>
                    </button>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Horizontal Media Carousel Arrows */}
          {mediaItems.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrevMedia();
                }}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/75 hover:bg-black border border-white/20 text-white flex items-center justify-center transition-all cursor-pointer active:scale-90 shadow-xl hover:scale-105"
                title="Previous media file (Swipe Left or ArrowLeft)"
                aria-label="Previous media"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleNextMedia();
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/75 hover:bg-black border border-white/20 text-white flex items-center justify-center transition-all cursor-pointer active:scale-90 shadow-xl hover:scale-105"
                title="Next media file (Swipe Right or ArrowRight)"
                aria-label="Next media"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {/* DEDICATED SYNCHRONIZED CONTENT DETAILS SECTION (Fluid kinetic transition on scroll) */}
        <div className="shrink-0 flex-1 max-h-[38vh] sm:max-h-[32vh] md:max-h-[30vh] bg-slate-900/95 border-t border-white/10 overflow-y-auto evidence-content-scroll px-4 py-3.5 sm:px-6 sm:py-4 space-y-2.5 text-slate-100 will-change-transform">
          <AnimatePresence mode="wait" custom={{ dir: navDirection.dir }}>
            <motion.div
              key={currentEvidence.id}
              custom={{ dir: navDirection.dir }}
              variants={contentVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="space-y-2.5"
            >
              {/* Witness Profile & Origin Strip */}
              <div className="flex items-center justify-between gap-2 flex-wrap pb-1 border-b border-white/10">
                
                {/* Author Identification */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={userAvatarUrl}
                    alt={currentEvidence.userName}
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover border-2 border-sky-400 shadow-md bg-slate-800 shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentEvidence.userName)}`;
                    }}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-xs sm:text-sm text-white truncate">
                        {currentEvidence.userName}
                      </span>
                      {currentEvidence.isVerified !== false && (
                        <BadgeCheck className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      )}
                      <span className="text-[11px] text-slate-400 font-mono truncate">
                        @{currentEvidence.userHandle}
                      </span>
                    </div>
                    
                    {/* Time ago */}
                    <div className="flex items-center gap-1 text-[10.5px] text-slate-400 font-mono">
                      <Clock className="w-3 h-3 text-sky-400" />
                      <span>{formatCivicDate(currentEvidence.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Location & Report Category Badge */}
                <div className="flex items-center gap-1.5">
                  {currentEvidence.isOriginalPost ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      Original Report
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40">
                      Citizen Verification
                    </span>
                  )}

                  {currentEvidence.location && (
                    <div className="hidden sm:flex items-center gap-1 text-[11px] text-sky-300 bg-slate-800/80 px-2.5 py-0.5 rounded-full border border-white/10">
                      <MapPin className="w-3 h-3 text-sky-400 shrink-0" />
                      <span className="truncate max-w-[180px]">
                        {currentEvidence.location.landmark ? `${currentEvidence.location.landmark}, ` : ''}
                        {currentEvidence.location.district || currentEvidence.location.region}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Report Title */}
              {currentEvidence.title && (
                <h3 className="font-bold text-sm sm:text-base text-white leading-snug">
                  {currentEvidence.title}
                </h3>
              )}

              {/* Full Observational Description with Smooth Scrolling Support */}
              <div className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans break-words space-y-2">
                <p className="whitespace-pre-line">
                  {currentEvidence.text}
                </p>

                {/* Media-specific caption */}
                {currentMedia?.caption && currentMedia.caption !== currentEvidence.text && (
                  <div className="text-[11px] text-amber-300 bg-amber-950/40 border border-amber-500/30 px-3 py-1.5 rounded-xl inline-block">
                    📷 {currentMedia.caption}
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* BOTTOM RESPONSIVE INTERACTION BAR (Like, Comment, Share placed at bottom of screen) */}
        <div className="shrink-0 px-3 py-2.5 sm:px-6 sm:py-3 bg-slate-950 border-t border-white/10 z-30">
          
          {/* Mobile-First Menu-Like Action Buttons */}
          <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center sm:justify-between">
            
            {/* 1. LIKE / CONFIRM BUTTON */}
            <button
              onClick={handleToggleLike}
              disabled={isLiking}
              className={`py-2 px-3 sm:px-4 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer active:scale-95 border shadow-sm ${
                currentLikeInfo.userLiked
                  ? 'bg-rose-600 text-white border-rose-500 shadow-rose-600/30'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-white/10 hover:border-rose-500/40'
              }`}
              title="Like / Confirm this evidence pack"
            >
              <Heart className={`w-4 h-4 ${currentLikeInfo.userLiked ? 'fill-white text-white' : 'text-rose-400'}`} />
              <span>{currentLikeInfo.userLiked ? 'Confirmed' : 'Confirm'}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-black/40 text-white">
                {currentLikeInfo.count}
              </span>
            </button>

            {/* 2. COMMENT / DISCUSSION DRAWER BUTTON */}
            <button
              onClick={() => setShowCommentsDrawer(prev => !prev)}
              className={`py-2 px-3 sm:px-4 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer active:scale-95 border shadow-sm ${
                showCommentsDrawer
                  ? 'bg-purple-600 text-white border-purple-500 shadow-purple-600/30'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-white/10 hover:border-purple-500/40'
              }`}
              title="View or add replies to this evidence"
            >
              <MessageSquare className="w-4 h-4 text-purple-400" />
              <span>Replies</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-black/40 text-white">
                {evidenceSpecificComments.length}
              </span>
            </button>

            {/* 3. SHARE BUTTON */}
            <button
              onClick={() => setShowShareModal(true)}
              className="py-2 px-3 sm:px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-white/10 hover:border-amber-500/40 flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-sm"
              title="Share this evidence"
            >
              <Share2 className="w-4 h-4 text-amber-400" />
              <span>Share</span>
            </button>
          </div>
        </div>

        {/* SLIDE-UP / OVERLAY COMMENTS DRAWER */}
        <AnimatePresence>
          {showCommentsDrawer && (
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-x-0 bottom-0 top-14 bg-slate-950/98 backdrop-blur-xl border-t border-white/15 flex flex-col z-40 rounded-t-2xl shadow-2xl"
            >
              {/* Drawer Header */}
              <div className="p-3.5 border-b border-white/10 flex items-center justify-between bg-slate-900/80">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-purple-400" />
                  <span className="font-bold text-sm text-white">
                    {currentEvidence.isOriginalPost ? 'Post Discussion' : `Replies to ${currentEvidence.userName}`}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-800 font-mono">
                    {evidenceSpecificComments.length} replies
                  </span>
                </div>

                <button
                  onClick={() => setShowCommentsDrawer(false)}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Context Banner */}
              <div className="p-2.5 bg-purple-950/40 border-b border-purple-900/50 text-[11px] text-purple-200 flex items-center gap-2">
                <Info className="w-4 h-4 text-purple-400 shrink-0" />
                <span>Replies here are linked directly to this verified scene update.</span>
              </div>

              {/* Comments Stream */}
              <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
                {evidenceSpecificComments.length > 0 ? (
                  evidenceSpecificComments.map((c, idx) => (
                    <div
                      key={c.id ? `${c.id}-${idx}` : `ev-c-${idx}`}
                      className="p-3 bg-slate-900 rounded-xl border border-white/10 space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-white flex items-center gap-1">
                          @{c.userHandle}
                          {c.isVerified && <BadgeCheck className="w-3.5 h-3.5 text-emerald-400" />}
                        </span>
                        <span className="text-slate-400 font-mono text-[10px]">
                          {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <p className="text-slate-200 leading-relaxed break-words font-sans">
                        {c.content}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center text-slate-400 text-xs space-y-2">
                    <MessageSquare className="w-8 h-8 mx-auto text-slate-600 opacity-60" />
                    <p className="font-semibold text-slate-300">No replies on this evidence pack yet.</p>
                    <p className="text-[11px] text-slate-500">Be the first to confirm or add details from the ground!</p>
                  </div>
                )}
              </div>

              {/* Comment Input Form */}
              <form onSubmit={handleAddComment} className="p-3 border-t border-white/10 bg-slate-900/90">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={commentInput}
                    onChange={e => setCommentInput(e.target.value)}
                    placeholder={`Reply to ${currentEvidence.userName}...`}
                    className="flex-1 px-3.5 py-2.5 bg-slate-800 text-xs text-white placeholder-slate-400 rounded-xl border border-white/10 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingComment || !commentInput.trim()}
                    className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center justify-center transition-all cursor-pointer active:scale-95"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* SHARE MODAL POPUP */}
      {showShareModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
          onClick={() => setShowShareModal(false)}
        >
          <div
            className="w-full max-w-sm bg-slate-900 rounded-2xl border border-white/15 p-4 shadow-2xl space-y-3"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Share2 className="w-4 h-4 text-amber-400" />
                Share Evidence Pack
              </h4>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Share verified citizen evidence submitted for <strong>{post.title}</strong>.
            </p>

            <button
              onClick={handleCopyLink}
              className="w-full p-2.5 bg-slate-800 hover:bg-slate-750 rounded-xl border border-white/10 flex items-center justify-between text-xs text-white font-medium transition-colors cursor-pointer"
            >
              <span className="truncate">Copy Evidence Direct Link</span>
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
            </button>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Check out verified citizen field evidence on "${post.title}": ${window.location.origin}/#post-${post.id}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 rounded-xl text-xs font-bold text-emerald-300 flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>WhatsApp</span>
              </a>
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Verified citizen field update on "${post.title}" via CivicAlert: ${window.location.origin}/#post-${post.id}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/40 rounded-xl text-xs font-bold text-sky-300 flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>X (Twitter)</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
