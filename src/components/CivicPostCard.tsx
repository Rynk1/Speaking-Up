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
  BellCheck,
  BadgeCheck
} from 'lucide-react';
import { CivicPost, InstitutionResponse, CommunityEvidence } from '../types';
import { api } from '../services/api';

interface CivicPostCardProps {
  post: CivicPost;
  onOpenShare: (post: CivicPost) => void;
  onOpenAddEvidence: (post: CivicPost) => void;
  onOpenReportAbuse: (postId: string) => void;
  onOpenCluster?: (clusterId: string) => void;
  onPostUpdated: () => void;
  userRole?: 'citizen' | 'institution_rep' | 'journalist' | 'moderator';
  onOpenInstitutionResponse?: (post: CivicPost) => void;
}

export const CivicPostCard: React.FC<CivicPostCardProps> = ({
  post,
  onOpenShare,
  onOpenAddEvidence,
  onOpenReportAbuse,
  onOpenCluster,
  onPostUpdated,
  userRole,
  onOpenInstitutionResponse
}) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isFollowingIssue, setIsFollowingIssue] = useState(false);

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
        userName: 'Citizen Participant',
        userHandle: 'citizen_gh'
      });
      setCommentText('');
      onPostUpdated();
    } catch (err) {
      console.error('Error adding comment:', err);
    } finally {
      setIsSubmittingComment(false);
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
      className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg transition-all hover:border-slate-700/80 space-y-3.5 relative"
    >
      {/* Zero Follower Megaphone Badge & Issue Followership Banner */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 text-[11px]">
        <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Community Megaphone Discovery</span>
          <span className="text-slate-400 text-[10px] hidden sm:inline">• Zero User Followers Needed</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Issue Followership CTA */}
          <button
            onClick={handleToggleFollowIssue}
            disabled={isFollowingIssue}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
              post.userFollowed
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
            title="Follow this specific civic issue to get push updates whenever state bodies respond"
          >
            {post.userFollowed ? (
              <>
                <BellCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Following Issue</span>
              </>
            ) : (
              <>
                <BellPlus className="w-3.5 h-3.5 text-amber-400" />
                <span>Follow Issue ({post.engagement.followersCount || 0})</span>
              </>
            )}
          </button>

          {getUrgencyBadge()}

          {/* Menu Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-1 w-44 bg-slate-900 border border-slate-700 rounded-xl shadow-xl p-1.5 z-30">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onOpenShare(post);
                  }}
                  className="w-full text-left px-2 py-1.5 text-xs text-slate-300 hover:bg-slate-800 rounded flex items-center gap-2"
                >
                  <Share2 className="w-3.5 h-3.5" /> Share / Export
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onOpenReportAbuse(post.id);
                  }}
                  className="w-full text-left px-2 py-1.5 text-xs text-red-400 hover:bg-slate-800 rounded flex items-center gap-2"
                >
                  <Flag className="w-3.5 h-3.5" /> Report Violation
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Author & Location Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden flex-shrink-0">
            {post.authorAvatar && post.authorVisibility !== 'anonymous' ? (
              <img src={post.authorAvatar} alt={post.authorName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold text-sm">
                {post.authorVisibility === 'anonymous' ? '🛡️' : post.authorName.charAt(0)}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-sm text-slate-100">{post.authorName}</span>
              {post.authorVisibility === 'anonymous' && (
                <span className="text-[10px] font-semibold bg-purple-950 text-purple-300 border border-purple-800/60 px-1.5 py-0.2 rounded">
                  Confidential Reporter
                </span>
              )}
              {post.isVerifiedCitizen && (
                <span className="text-emerald-400" title="Verified Ghanaian Citizen">
                  <UserCheck className="w-3.5 h-3.5" />
                </span>
              )}
              <span className="text-xs text-slate-400">@{post.authorHandle}</span>
            </div>

            {/* Location & Time */}
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 flex-wrap">
              <span className="flex items-center gap-1 text-slate-300 font-medium">
                <MapPin className="w-3 h-3 text-emerald-400" />
                {post.location.landmark ? `${post.location.landmark}, ` : ''}
                {post.location.district} ({post.location.region})
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-[11px] text-slate-400">
                <Clock className="w-3 h-3" />
                {new Date(post.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} at{' '}
                {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Title & Post Content */}
      <div className="space-y-1.5">
        <h3 className="font-bold text-base sm:text-lg text-white leading-snug tracking-tight">
          {post.title}
        </h3>
        <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
          {post.content}
        </p>

        {/* Refined translation/caption if available */}
        {post.translatedText && post.translatedText !== post.content && (
          <div className="mt-2 p-2.5 bg-slate-800/60 border border-slate-700/60 rounded-xl text-xs">
            <div className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1 mb-1">
              <Sparkles className="w-3 h-3" /> Clarified Civic Summary:
            </div>
            <p className="text-slate-300 italic text-xs leading-relaxed">"{post.translatedText}"</p>
          </div>
        )}
      </div>

      {/* Voice Note Audio Player */}
      {voiceMedia && (
        <div className="bg-slate-800/90 border border-emerald-900/40 p-3 rounded-xl flex items-center justify-between gap-3">
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
                <span className="font-semibold text-emerald-400 flex items-center gap-1">
                  <Volume2 className="w-3.5 h-3.5" /> Citizen Voice Recording
                </span>
                <span className="text-[10px] text-slate-400">{voiceMedia.duration || 12}s</span>
              </div>
              {/* Audio Waveform visualization */}
              <div className="flex items-center gap-1 h-4">
                {(voiceMedia.waveform || [30, 60, 80, 45, 90, 75, 40, 85, 60, 35, 70, 95, 50, 65, 40]).map((h, i) => (
                  <div
                    key={i}
                    style={{ height: `${isPlayingAudio ? Math.max(20, (h + (i % 3) * 20) % 100) : h}%` }}
                    className={`flex-1 rounded-full transition-all duration-150 ${isPlayingAudio ? 'bg-emerald-400' : 'bg-slate-600'}`}
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
          {visualMedia.map(m => (
            <div key={m.id} className="relative bg-slate-950 rounded-xl overflow-hidden aspect-video border border-slate-800">
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

      {/* Tagged State Institutions Bar (Core Requirement) */}
      {post.institutionTags.length > 0 && (
        <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-slate-400 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-emerald-400" />
              Institutions Alerted:
            </span>
            <span className="text-[10px] text-slate-400">
              Awareness Score: <strong className="text-emerald-400">{post.credibilitySignals.institutionalAwarenessScore}%</strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {post.institutionTags.map(tag => (
              <div
                key={tag.institutionId}
                className="px-2.5 py-1 bg-slate-800/90 border border-slate-700 rounded-lg text-xs flex items-center gap-1.5"
              >
                <span className="font-semibold text-slate-200">@{tag.shortName || tag.acronym}</span>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                    tag.alertStatus === 'ACKNOWLEDGED'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                      : tag.alertStatus === 'DELIVERED'
                      ? 'bg-sky-950 text-sky-300 border border-sky-800/60'
                      : 'bg-amber-950 text-amber-300 border border-amber-800/60'
                  }`}
                >
                  {tag.alertStatus === 'ACKNOWLEDGED'
                    ? '✓ Acknowledged'
                    : tag.alertStatus === 'DELIVERED'
                    ? '⚡ Dispatched'
                    : '✉️ Tagged'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Official State Institution Responses Section (Premium Social-Media Premium Layout) */}
      {post.officialResponses && post.officialResponses.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
            <BadgeCheck className="w-4 h-4 text-emerald-400" />
            <span>Official State Institution Public Statement & Updates</span>
          </div>

          {post.officialResponses.map(resp => (
            <div
              key={resp.id}
              className="bg-slate-950/90 border-l-4 border-l-emerald-500 border-y border-r border-slate-800 rounded-2xl p-4 shadow-xl space-y-3"
            >
              {/* Institution Premium Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 p-0.5 flex items-center justify-center shadow-md">
                    <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-emerald-400" />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-extrabold text-sm text-white">{resp.institutionName}</span>
                      <BadgeCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/80">
                        VERIFIED STATE DESK
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>{resp.responderName}</span>
                      <span>•</span>
                      <span className="text-slate-300 font-medium">{resp.responderTitle}</span>
                    </div>
                  </div>
                </div>

                {/* Status Badge & Timestamp */}
                <div className="text-right shrink-0">
                  <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider block">
                    {resp.responseType.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    {new Date(resp.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} •{' '}
                    {new Date(resp.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              {/* Formatted Official Message Box */}
              <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-3.5 text-sm text-slate-100 leading-relaxed font-sans shadow-inner whitespace-pre-line">
                {resp.message}
              </div>

              {/* Action Footer for Official Response */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-900">
                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" /> Tracked & Logged under Ghana Data & Public Standards
                </span>
                <span className="text-slate-500">Public Record ID: #{resp.id.slice(0, 8)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Community Evidence Updates (Distributed Observation Network) */}
      {post.communityEvidence && post.communityEvidence.length > 0 && (
        <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/80 space-y-2">
          <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-sky-400" />
            Community Evidence & Field Updates ({post.communityEvidence.length}):
          </div>
          {post.communityEvidence.map(ev => (
            <div key={ev.id} className="text-xs text-slate-300 bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                <span className="font-medium text-slate-300">{ev.userName}</span>
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
          {post.hashtags.map(tag => (
            <span key={tag} className="text-emerald-400/90 hover:text-emerald-300 cursor-pointer">
              {tag.startsWith('#') ? tag : `#${tag}`}
            </span>
          ))}
        </div>
      )}

      {/* Core Action Bar: "I'M SEEING THIS TOO", Add Evidence, Share, Comments */}
      <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
        {/* "I'M SEEING THIS TOO" Button (Replaces shallow likes with community truth signal) */}
        <button
          id={`confirm-post-btn-${post.id}`}
          onClick={handleToggleConfirm}
          disabled={isConfirming}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            post.userConfirmed
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/60 scale-102'
              : 'bg-slate-800 hover:bg-slate-700/80 text-emerald-400 border border-slate-700'
          }`}
          title="Independently confirm that you observe or experience this issue"
        >
          <CheckCircle2 className={`w-4 h-4 ${post.userConfirmed ? 'text-white' : 'text-emerald-400'}`} />
          <span>I’M SEEING THIS TOO</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-xs ${
              post.userConfirmed ? 'bg-emerald-800 text-white' : 'bg-slate-900 text-emerald-300'
            }`}
          >
            {post.engagement.confirmations}
          </span>
        </button>

        {/* Action Group */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Add Evidence CTA */}
          <button
            onClick={() => onOpenAddEvidence(post)}
            className="px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors"
            title="Add field photos or status update"
          >
            <Camera className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Add Evidence</span>
          </button>

          {/* Social Share & Amplify */}
          <button
            id={`share-post-btn-${post.id}`}
            onClick={() => onOpenShare(post)}
            className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors"
            title="Share to WhatsApp, X, Facebook or Telegram"
          >
            <Share2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Share</span>
            <span className="text-[11px] text-slate-400">{post.engagement.shares}</span>
          </button>

          {/* Repost / Amplify inside platform */}
          <button
            onClick={handleToggleRepost}
            className={`p-2 rounded-xl text-xs border transition-colors ${
              post.userReposted
                ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 border-slate-700'
            }`}
            title="Amplify on platform"
          >
            <Repeat2 className="w-3.5 h-3.5" />
          </button>

          {/* Comments Toggle */}
          <button
            onClick={() => setShowComments(!showComments)}
            className="px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="text-[11px]">{post.commentsList?.length || post.engagement.comments}</span>
          </button>

          {/* Institution Rep CTA if viewing in official mode */}
          {userRole === 'institution_rep' && onOpenInstitutionResponse && (
            <button
              onClick={() => onOpenInstitutionResponse(post)}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Building2 className="w-3.5 h-3.5" />
              Respond Officially
            </button>
          )}
        </div>
      </div>

      {/* Expanded Comments Section */}
      {showComments && (
        <div className="pt-3 border-t border-slate-800 space-y-2.5 animate-in fade-in">
          <form onSubmit={handleAddComment} className="flex items-center gap-2">
            <input
              type="text"
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="Add factual context or observation..."
              className="flex-1 p-2 bg-slate-800 text-xs text-slate-100 placeholder-slate-400 rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={isSubmittingComment || !commentText.trim()}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1"
            >
              <Send className="w-3 h-3" />
            </button>
          </form>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {post.commentsList && post.commentsList.length > 0 ? (
              post.commentsList.map(c => (
                <div key={c.id} className="p-2 bg-slate-800/50 rounded-lg text-xs space-y-0.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-300">@{c.userHandle}</span>
                    <span>{new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-slate-200">{c.content}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-1 text-center">No comments yet. Add community context above.</p>
            )}
          </div>
        </div>
      )}
    </article>
  );
};
