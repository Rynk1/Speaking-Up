import React, { useState } from 'react';
import {
  Camera,
  Plus,
  Clock,
  Flame,
  Wrench,
  CheckCircle2,
  BadgeCheck,
  ChevronDown,
  ChevronUp,
  Play,
  Mic,
  Film,
  Layers,
  Heart,
  MessageSquare,
  Sparkles,
  Maximize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CivicPost, CommunityEvidence, PostMedia, PostComment } from '../types';
import { formatCivicDate } from '../utils/format';
import { EvidenceCarouselModal } from './EvidenceCarouselModal';

interface CommunityEvidenceSectionProps {
  evidence?: CommunityEvidence[];
  post: CivicPost;
  onOpenAddEvidence: (post: CivicPost) => void;
  onCommentAdded?: (comment: PostComment) => void;
  onEvidenceLiked?: (evidenceId: string, userLiked: boolean, likesCount: number) => void;
}

export const CommunityEvidenceSection: React.FC<CommunityEvidenceSectionProps> = ({
  evidence,
  post,
  onOpenAddEvidence,
  onCommentAdded,
  onEvidenceLiked
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [carouselModalOpen, setCarouselModalOpen] = useState(false);
  const [selectedEvIndex, setSelectedEvIndex] = useState(0);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);

  const evidenceList = evidence || [];
  const hasEvidence = evidenceList.length > 0;

  // Format relative time helper
  const formatEvidenceTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return formatCivicDate(dateStr);
    } catch {
      return 'Recently';
    }
  };

  // Status Badge Helper
  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'worsened':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/80 shrink-0">
            <Flame className="w-2.5 h-2.5 text-rose-500 shrink-0" />
            <span>Worsened</span>
          </span>
        );
      case 'improving':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-50 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/80 shrink-0">
            <Wrench className="w-2.5 h-2.5 text-sky-500 shrink-0" />
            <span>In Repair</span>
          </span>
        );
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 shrink-0">
            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
            <span>Field Resolved</span>
          </span>
        );
      case 'still_ongoing':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80 shrink-0">
            <Clock className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Still Ongoing</span>
          </span>
        );
    }
  };

  const handleOpenMediaModal = (evIndex: number, mediaIndex: number = 0) => {
    // In EvidenceCarouselModal, index 0 is the original scene report, so community evidence is offset by 1
    setSelectedEvIndex(evIndex + 1);
    setSelectedMediaIndex(mediaIndex);
    setCarouselModalOpen(true);
  };

  // If no evidence is present yet, show an inviting prompt
  if (!hasEvidence) {
    return (
      <div className="bg-slate-50/70 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-700/60 rounded-xl px-3 py-2 sm:px-3.5 sm:py-2.5 flex items-center justify-between gap-2 text-xs transition-colors hover:border-slate-300 dark:hover:border-slate-600">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-md bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 flex items-center justify-center shrink-0">
            <Camera className="w-3.5 h-3.5" />
          </div>
          <span className="text-slate-600 dark:text-slate-400 truncate text-[11px] sm:text-xs">
            At this scene? Add follow-up field photo, audio note, video or status
          </span>
        </div>

        <button
          type="button"
          onClick={() => onOpenAddEvidence(post)}
          className="px-2.5 py-1 text-[11px] sm:text-xs font-bold rounded-lg bg-sky-600 hover:bg-sky-500 text-white transition-all active:scale-95 flex items-center gap-1 shrink-0 cursor-pointer shadow-xs"
        >
          <Plus className="w-3 h-3" />
          <span>Add Evidence</span>
        </button>
      </div>
    );
  }

  // Items to display
  const displayedEvidence = isExpanded ? evidenceList : [evidenceList[0]];

  return (
    <>
      <div className="bg-slate-50/90 dark:bg-slate-800/40 border border-slate-200/90 dark:border-slate-700/70 rounded-xl p-2.5 sm:p-3 space-y-2 text-xs transition-all shadow-xs">
        
        {/* Header Strip */}
        <div className="flex items-center justify-between gap-2 min-w-0 pb-1.5 border-b border-slate-200/70 dark:border-slate-700/60">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-5 h-5 rounded-md bg-sky-100 dark:bg-sky-950/90 text-sky-700 dark:text-sky-300 flex items-center justify-center shrink-0">
              <Camera className="w-3 h-3" />
            </div>
            <span className="font-bold text-[11px] sm:text-xs text-slate-800 dark:text-slate-200 truncate">
              Citizen Field Evidence Packs
            </span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold font-mono bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-300 shrink-0">
              {evidenceList.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {evidenceList.length > 1 && (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="px-2 py-0.5 text-[10.5px] font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-200/70 dark:bg-slate-700/60 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                title={isExpanded ? 'Collapse evidence updates' : 'View all evidence updates'}
              >
                <span>{isExpanded ? 'Show Latest' : `All (${evidenceList.length})`}</span>
                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}

            <button
              type="button"
              onClick={() => onOpenAddEvidence(post)}
              className="px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10.5px] sm:text-xs font-bold rounded-md bg-sky-600 hover:bg-sky-500 text-white transition-all active:scale-95 flex items-center gap-1 shrink-0 cursor-pointer shadow-xs"
            >
              <Plus className="w-3 h-3" />
              <span>Add Update</span>
            </button>
          </div>
        </div>

        {/* Evidence Items List */}
        <div className="space-y-2 min-w-0">
          <AnimatePresence initial={false}>
            {displayedEvidence.map((ev, idx) => {
              const actualEvIndex = evidenceList.findIndex(e => e.id === ev.id);
              const itemKey = ev.id || `ev-${idx}`;
              const userAvatarUrl =
                ev.userAvatar ||
                `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(ev.userHandle || ev.userName || 'citizen')}`;

              const hasMedia = ev.media && Array.isArray(ev.media) && ev.media.length > 0;
              const photoMedia = hasMedia ? ev.media!.filter(m => m.type === 'image') : [];
              const videoMedia = hasMedia ? ev.media!.filter(m => m.type === 'video') : [];
              const audioMedia = hasMedia ? ev.media!.filter(m => m.type === 'audio') : [];
              const totalMediaCount = (ev.media || []).length;

              return (
                <motion.div
                  key={itemKey}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => handleOpenMediaModal(actualEvIndex !== -1 ? actualEvIndex : idx, 0)}
                  className="group relative bg-white dark:bg-slate-900/90 hover:bg-sky-50/40 dark:hover:bg-slate-850 p-3 rounded-xl border border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-slate-200 space-y-2.5 shadow-2xs transition-all cursor-pointer hover:border-sky-400/80 hover:shadow-md"
                >
                  {/* Item Header Row */}
                  <div className="flex items-center justify-between gap-1.5 text-[11px] min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <img
                        src={userAvatarUrl}
                        alt={ev.userName}
                        className="w-6 h-6 rounded-full object-cover bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(ev.userName || 'Citizen')}`;
                        }}
                      />
                      <span className="font-bold text-slate-900 dark:text-slate-100 truncate max-w-[120px] sm:max-w-[170px]">
                        {ev.userName}
                      </span>
                      {ev.isVerified !== false && (
                        <BadgeCheck className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                      )}
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate hidden sm:inline">
                        @{ev.userHandle || ev.userName.toLowerCase().replace(/\s+/g, '_')}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {getStatusBadge(ev.statusUpdate)}
                      <span
                        className="text-[10px] text-slate-500 dark:text-slate-400 font-mono"
                        title={`${new Date(ev.createdAt).toLocaleString()} (${formatCivicDate(ev.createdAt)})`}
                      >
                        {formatEvidenceTime(ev.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Title if present */}
                  {ev.title && (
                    <h5 className="font-bold text-xs sm:text-[13px] text-slate-900 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-300 transition-colors">
                      {ev.title}
                    </h5>
                  )}

                  {/* Observational Text (Acting as Caption) */}
                  <p className="text-[11.5px] sm:text-xs text-slate-700 dark:text-slate-300 leading-relaxed break-words font-sans line-clamp-2">
                    {ev.text}
                  </p>

                  {/* Media Grid / Preview Thumbnail Strip (Clicking opens fullscreen reels carousel) */}
                  {hasMedia && (
                    <div className="relative pt-0.5">
                      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
                        {ev.media!.map((m, mIdx) => (
                          <div
                            key={m.id || `m-thumb-${mIdx}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenMediaModal(actualEvIndex !== -1 ? actualEvIndex : idx, mIdx);
                            }}
                            className="relative group/media overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-950 h-20 sm:h-24 w-28 sm:w-32 shrink-0 shadow-xs"
                          >
                            {m.type === 'video' ? (
                              <>
                                <img
                                  src={m.thumbnailUrl || 'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=400&auto=format&fit=crop&q=80'}
                                  alt={m.caption || 'Video'}
                                  className="w-full h-full object-cover opacity-85 group-hover/media:opacity-100 transition-opacity"
                                />
                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                  <div className="w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg group-hover/media:scale-110 transition-transform">
                                    <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                                  </div>
                                </div>
                                <div className="absolute top-1 left-1 bg-black/70 px-1.5 py-0.2 rounded text-[8.5px] text-white font-mono flex items-center gap-0.5">
                                  <Film className="w-2.5 h-2.5 text-red-400" />
                                  <span>Video</span>
                                </div>
                              </>
                            ) : m.type === 'audio' ? (
                              <div className="w-full h-full bg-gradient-to-tr from-amber-950 to-slate-900 p-2 flex flex-col justify-between text-white">
                                <div className="flex items-center justify-between">
                                  <Mic className="w-3.5 h-3.5 text-amber-400" />
                                  <span className="text-[8.5px] font-mono text-amber-300 font-bold">{m.duration || 26}s</span>
                                </div>
                                <div className="flex items-center gap-0.5 h-3">
                                  {[3, 8, 12, 6, 14, 8, 11, 5, 9, 13].map((bh, bi) => (
                                    <div key={bi} style={{ height: `${bh}px` }} className="w-1 rounded-full bg-amber-400" />
                                  ))}
                                </div>
                                <span className="text-[8.5px] text-slate-300 truncate">{m.caption || 'Voice Note'}</span>
                              </div>
                            ) : (
                              <>
                                <img
                                  src={m.url}
                                  alt={m.caption || 'Evidence photo'}
                                  className="w-full h-full object-cover transition-transform duration-200 group-hover/media:scale-105"
                                />
                                <div className="absolute inset-0 bg-black/10 group-hover/media:bg-black/30 transition-colors flex items-center justify-center">
                                  <Maximize2 className="w-4 h-4 text-white opacity-0 group-hover/media:opacity-100 transition-opacity" />
                                </div>
                              </>
                            )}

                            {m.caption && (
                              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-1 text-[8.5px] text-white truncate">
                                {m.caption}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Total Media Count Pill */}
                      {totalMediaCount > 1 && (
                        <div className="absolute top-2 right-2 bg-black/75 backdrop-blur-md text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md pointer-events-none">
                          <Layers className="w-3 h-3 text-sky-400" />
                          <span>{totalMediaCount} files</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Quick Card Action Footer */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium">
                        <Heart className="w-3 h-3 text-rose-500" />
                        <span>{ev.likesCount || 0}</span>
                      </span>

                      <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium">
                        <MessageSquare className="w-3 h-3 text-purple-500" />
                        <span>{ev.commentsCount || (post.commentsList?.filter(c => c.evidenceId === ev.id).length) || 0} replies</span>
                      </span>
                    </div>

                    <span className="text-sky-600 dark:text-sky-400 font-bold group-hover:underline flex items-center gap-1">
                      <span>View Reel</span>
                      <Maximize2 className="w-3 h-3" />
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Media-Centric Fullscreen Reel/Carousel Modal */}
      <EvidenceCarouselModal
        isOpen={carouselModalOpen}
        onClose={() => setCarouselModalOpen(false)}
        post={post}
        initialEvidenceIndex={selectedEvIndex}
        initialMediaIndex={selectedMediaIndex}
        onCommentAdded={onCommentAdded}
        onEvidenceLiked={onEvidenceLiked}
      />
    </>
  );
};
