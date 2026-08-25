import React, { useState, useRef } from 'react';
import {
  Camera,
  Plus,
  Clock,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Wrench,
  BadgeCheck,
  ChevronDown,
  ChevronUp,
  X,
  ZoomIn,
  Eye,
  Download,
  Sparkles,
  Layers,
  Play,
  Pause,
  Volume2,
  Mic,
  Film
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CivicPost, CommunityEvidence, PostMedia } from '../types';
import { formatCivicDate } from '../utils/format';

interface CommunityEvidenceSectionProps {
  evidence?: CommunityEvidence[];
  post: CivicPost;
  onOpenAddEvidence: (post: CivicPost) => void;
}

export const CommunityEvidenceSection: React.FC<CommunityEvidenceSectionProps> = ({
  evidence,
  post,
  onOpenAddEvidence
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; caption?: string } | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<{ url: string; caption?: string } | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const evidenceList = evidence || [];
  const hasEvidence = evidenceList.length > 0;

  // Format relative & full date helper
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

  const handleToggleAudio = (mediaId: string, audioUrl: string) => {
    if (playingAudioId === mediaId) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingAudioId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const newAudio = new Audio(audioUrl);
      audioRef.current = newAudio;
      newAudio.play().catch(e => console.log('Audio playback prevented or failed:', e));
      setPlayingAudioId(mediaId);
      newAudio.onended = () => {
        setPlayingAudioId(null);
      };
    }
  };

  // If no evidence is present yet, show an inviting, unobtrusive prompt
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

  // Items to display: if multiple items and not expanded, show only the latest 1, but provide seamless toggle
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
              Citizen Field Evidence
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
              const itemKey = ev.id || `ev-${idx}`;
              const userAvatarUrl =
                ev.userAvatar ||
                `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(ev.userHandle || ev.userName || 'citizen')}`;

              const hasMedia = ev.media && Array.isArray(ev.media) && ev.media.length > 0;
              const photoMedia = hasMedia ? ev.media!.filter(m => m.type === 'image') : [];
              const videoMedia = hasMedia ? ev.media!.filter(m => m.type === 'video') : [];
              const audioMedia = hasMedia ? ev.media!.filter(m => m.type === 'audio') : [];

              return (
                <motion.div
                  key={itemKey}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="bg-white dark:bg-slate-900/80 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 space-y-2 shadow-2xs"
                >
                  {/* Item Header Row */}
                  <div className="flex items-center justify-between gap-1.5 text-[11px] min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <img
                        src={userAvatarUrl}
                        alt={ev.userName}
                        className="w-5 h-5 rounded-full object-cover bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(ev.userName || 'Citizen')}`;
                        }}
                      />
                      <span className="font-bold text-slate-900 dark:text-slate-100 truncate max-w-[110px] sm:max-w-[160px]">
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

                  {/* Observational Text */}
                  <p className="text-[11.5px] sm:text-xs text-slate-700 dark:text-slate-300 leading-relaxed break-words font-sans">
                    {ev.text}
                  </p>

                  {/* Citizen Audio Evidence Recordings */}
                  {audioMedia.length > 0 && (
                    <div className="space-y-1.5 pt-0.5">
                      {audioMedia.map((aud, aIdx) => {
                        const audId = aud.id || `aud-${itemKey}-${aIdx}`;
                        const isPlaying = playingAudioId === audId;

                        return (
                          <div
                            key={audId}
                            className="bg-slate-100 dark:bg-slate-800/80 rounded-xl p-2 sm:p-2.5 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <button
                                type="button"
                                onClick={() => handleToggleAudio(audId, aud.url)}
                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-xs ${
                                  isPlaying
                                    ? 'bg-amber-600 text-white animate-pulse'
                                    : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-300'
                                }`}
                                title={isPlaying ? 'Pause citizen audio update' : 'Play citizen voice recording'}
                              >
                                {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                              </button>

                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                                  <Mic className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                                  <span className="truncate">{aud.caption || 'Field Voice Note / Audio Recording'}</span>
                                </div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-mono mt-0.5">
                                  <span>{aud.duration ? `${Math.floor(aud.duration / 60)}:${(aud.duration % 60).toString().padStart(2, '0')}` : 'Audio Evidence'}</span>
                                  <span>•</span>
                                  <span className="text-amber-700 dark:text-amber-400/90 font-medium">
                                    {isPlaying ? 'Playing field recording...' : 'Click to listen'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Equalizer Visualizer Bars */}
                            <div className="flex items-center gap-0.5 shrink-0 px-2 py-1 bg-white/60 dark:bg-slate-900/60 rounded-md border border-slate-200/60 dark:border-slate-700/60">
                              {[8, 14, 20, 12, 18, 10, 16, 9].map((height, barIdx) => (
                                <div
                                  key={`bar-${barIdx}`}
                                  className={`w-1 rounded-full transition-all ${
                                    isPlaying
                                      ? 'bg-amber-500 animate-pulse'
                                      : 'bg-slate-300 dark:bg-slate-600'
                                  }`}
                                  style={{
                                    height: isPlaying ? `${Math.max(6, (height + (barIdx % 3) * 4) % 22)}px` : `${Math.min(height, 12)}px`,
                                    animationDuration: `${0.4 + (barIdx % 4) * 0.15}s`
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Citizen Video Evidence Clips */}
                  {videoMedia.length > 0 && (
                    <div className="pt-1 flex flex-wrap gap-2">
                      {videoMedia.map((vid, vIdx) => (
                        <div
                          key={vid.id || `v-${itemKey}-${vIdx}`}
                          onClick={() => setSelectedVideo({ url: vid.url, caption: vid.caption || `Field Video by ${ev.userName}` })}
                          className="relative group cursor-pointer overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-900 h-20 sm:h-24 w-32 sm:w-36 shrink-0 shadow-xs"
                        >
                          <img
                            src={vid.thumbnailUrl || 'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=400&auto=format&fit=crop&q=80'}
                            alt={vid.caption || 'Field video clip'}
                            className="w-full h-full object-cover opacity-85 group-hover:opacity-100 transition-opacity"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-center justify-center">
                            <div className="w-8 h-8 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                              <Play className="w-4 h-4 fill-white ml-0.5" />
                            </div>
                          </div>
                          <div className="absolute top-1 left-1 bg-black/70 px-1.5 py-0.5 rounded text-[9px] text-white font-mono flex items-center gap-1">
                            <Film className="w-2.5 h-2.5 text-red-400" />
                            <span>Video</span>
                          </div>
                          {vid.caption && (
                            <div className="absolute bottom-0 inset-x-0 p-1 text-[9px] text-white font-sans truncate bg-black/60">
                              {vid.caption}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Citizen Image Media Gallery */}
                  {photoMedia.length > 0 && (
                    <div className="pt-0.5 flex flex-wrap gap-2">
                      {photoMedia.map((m, mIdx) => (
                        <div
                          key={m.id || `m-${itemKey}-${mIdx}`}
                          onClick={() => setSelectedPhoto({ url: m.url, caption: m.caption || `Field evidence by ${ev.userName}` })}
                          className="relative group cursor-pointer overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 h-16 sm:h-20 w-24 sm:w-28 shrink-0 shadow-2xs"
                        >
                          <img
                            src={m.url}
                            alt={m.caption || 'Field evidence photo'}
                            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                            <ZoomIn className="w-4 h-4" />
                          </div>
                          {m.caption && (
                            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-1 text-[9px] text-white truncate">
                              {m.caption}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Lightbox: Full-screen Photo Inspection Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="relative max-w-3xl w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl space-y-2 p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between text-slate-300 pb-2 border-b border-slate-800 px-2">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-sky-400" />
                <span className="text-xs sm:text-sm font-bold text-white">Citizen Field Evidence Photo</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={selectedPhoto.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
                  title="Open full size"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  onClick={() => setSelectedPhoto(null)}
                  className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="max-h-[75vh] flex items-center justify-center overflow-hidden rounded-xl bg-slate-950">
              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.caption || 'Evidence'}
                className="max-h-[72vh] w-auto object-contain rounded-lg"
              />
            </div>

            {selectedPhoto.caption && (
              <p className="text-xs text-slate-300 px-2 pt-1 font-sans">{selectedPhoto.caption}</p>
            )}
          </div>
        </div>
      )}

      {/* Video Modal: Full-screen Video Player */}
      {selectedVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in"
          onClick={() => setSelectedVideo(null)}
        >
          <div
            className="relative max-w-3xl w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl space-y-2 p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between text-slate-300 pb-2 border-b border-slate-800 px-2">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-red-400" />
                <span className="text-xs sm:text-sm font-bold text-white">Citizen Field Evidence Video</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedVideo(null)}
                  className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="max-h-[75vh] flex items-center justify-center overflow-hidden rounded-xl bg-black">
              <video
                src={selectedVideo.url}
                controls
                autoPlay
                className="max-h-[70vh] w-full rounded-lg"
              />
            </div>

            {selectedVideo.caption && (
              <p className="text-xs text-slate-300 px-2 pt-1 font-sans">{selectedVideo.caption}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
};
