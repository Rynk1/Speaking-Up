import React, { useState, useEffect } from 'react';
import {
  Share2,
  Copy,
  Check,
  X,
  MessageCircle,
  Twitter,
  Send,
  Loader2,
  Landmark,
  Video,
  Download,
  Radio,
  Layers,
  Link,
  ShieldCheck,
  Volume2,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  FileText,
  AlertCircle
} from 'lucide-react';
import { CivicPost, InstitutionResponse, SocialPlatform, CreatorContext, SocialSharePackage, CreatorPack, ShareAnalyticsSummary } from '../types';
import { api } from '../services/api';

interface SharePreviewModalProps {
  post: CivicPost | null;
  response?: InstitutionResponse | null;
  isOpen: boolean;
  onClose: () => void;
}

export const SharePreviewModal: React.FC<SharePreviewModalProps> = ({
  post,
  response,
  isOpen,
  onClose
}) => {
  const [sharePackage, setSharePackage] = useState<Partial<SocialSharePackage> | null>(null);
  const [creatorPack, setCreatorPack] = useState<CreatorPack | null>(null);
  const [analytics, setAnalytics] = useState<ShareAnalyticsSummary | null>(null);

  // Simple user action feedbacks
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [downloadSuccessMessage, setDownloadSuccessMessage] = useState<string | null>(null);
  const [isDownloadingMedia, setIsDownloadingMedia] = useState<string | null>(null);
  const [isLoadingPackage, setIsLoadingPackage] = useState(false);

  // Creator pack accordion state (kept separate so simple users aren't overwhelmed)
  const [showCreatorPack, setShowCreatorPack] = useState(false);
  const [creatorTab, setCreatorTab] = useState<'video' | 'radio' | 'thread'>('video');
  const [activeScriptTab, setActiveScriptTab] = useState<'30s' | '60s' | 'deep'>('60s');
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedPackText, setCopiedPackText] = useState(false);
  const [isLoadingPack, setIsLoadingPack] = useState(false);

  const isOfficialResponse = Boolean(response);

  // Compute public canonical URL
  const targetShareUrl = sharePackage?.shortUrl || (response
    ? `${window.location.origin}/app/post/${post?.id}?responseId=${response.id}`
    : `${window.location.origin}/app/post/${post?.id}`);

  // Fetch standard share package
  useEffect(() => {
    if (post && isOpen) {
      setIsLoadingPackage(true);
      api
        .prepareSocialPackage({
          postId: post.id,
          responseId: response?.id,
          platform: 'whatsapp',
          creatorContext: 'general'
        })
        .then(res => setSharePackage(res))
        .catch(err => console.warn('Social package load error:', err))
        .finally(() => setIsLoadingPackage(false));

      api
        .getSocialAnalytics(post.id)
        .then(res => setAnalytics(res))
        .catch(() => {});
    }
  }, [post, response, isOpen]);

  // Fetch Creator Pack only when user expands creator tools
  useEffect(() => {
    if (post && isOpen && showCreatorPack && !creatorPack) {
      setIsLoadingPack(true);
      api
        .generateCreatorPack({
          postId: post.id,
          responseId: response?.id,
          creatorContext: 'general'
        })
        .then(res => setCreatorPack(res))
        .catch(err => console.warn('Creator pack error:', err))
        .finally(() => setIsLoadingPack(false));
    }
  }, [post, response, isOpen, showCreatorPack, creatorPack]);

  if (!isOpen || !post) return null;

  // Gather privacy-sanitized clean media assets
  const cleanMedia = creatorPack?.cleanMediaAssets || (sharePackage?.cleanMediaAssets || (post.media || []));

  const recordShare = (platform: SocialPlatform, contentType: string = 'LINK') => {
    if (post) {
      api.recordSocialShare({
        postId: post.id,
        responseId: response?.id,
        platform,
        contentType,
        referralCode: sharePackage?.shortUrl?.split('/s/')?.[1]
      }).catch(() => {});
    }
  };

  // 1. Copy direct website link
  const handleCopyLink = () => {
    recordShare('whatsapp', 'LINK');
    navigator.clipboard.writeText(targetShareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // 2. Copy summary caption
  const handleCopyTextOnly = () => {
    const text = sharePackage?.caption || `${post.title}\n📍 ${post.location?.district || post.location?.region || 'Ghana'}\n🔗 Read on Speak Up Ghana: ${targetShareUrl}`;
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  // 3. Simple 1-Tap App Shares
  const handleWhatsAppShare = () => {
    recordShare('whatsapp', 'DIRECT_APP');
    const text = sharePackage?.caption || `${post.title}\n📍 ${post.location?.district || ''}\n🔗 Read more on Speak Up Ghana: ${targetShareUrl}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleFacebookShare = () => {
    recordShare('facebook', 'DIRECT_APP');
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(targetShareUrl)}&quote=${encodeURIComponent(sharePackage?.caption || post.title)}`;
    window.open(url, '_blank');
  };

  const handleXShare = () => {
    recordShare('x', 'DIRECT_APP');
    const text = sharePackage?.caption || `🚨 ${post.title} in ${post.location?.district || ''}. Read full report on Speak Up Ghana: ${targetShareUrl}`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleTelegramShare = () => {
    recordShare('telegram', 'DIRECT_APP');
    const text = sharePackage?.caption || `${post.title} - Read on Speak Up Ghana: ${targetShareUrl}`;
    const url = `https://t.me/share/url?url=${encodeURIComponent(targetShareUrl)}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleNativeShare = async () => {
    recordShare('whatsapp', 'NATIVE_DEVICE');
    if (navigator.share) {
      try {
        await navigator.share({
          title: sharePackage?.headline || post.title,
          text: sharePackage?.caption || post.content,
          url: targetShareUrl
        });
      } catch (err) {
        console.warn('Native share dismissed:', err);
      }
    } else {
      handleCopyLink();
    }
  };

  // 4. Download Clean Media & Copy Summary for Social Circulation
  const handleDownloadCleanMediaAndCopySummary = async (mediaItem: any) => {
    if (!mediaItem || !mediaItem.url) return;
    const mediaId = mediaItem.id || 'default';
    setIsDownloadingMedia(mediaId);

    // Copy formatted caption + link to clipboard
    const captionText = sharePackage?.caption || `${post.title}\n📍 ${post.location?.district || ''}\n🔗 Read full report: ${targetShareUrl}`;
    try {
      await navigator.clipboard.writeText(captionText);
      setCopiedText(true);
    } catch (e) {
      console.warn('Clipboard write failed:', e);
    }

    // Trigger download of sanitized media file
    try {
      const ext = mediaItem.type === 'video' ? 'mp4' : mediaItem.type === 'audio' ? 'mp3' : 'jpg';
      const filename = `SpeakUp-${post.id.slice(0, 8)}-clean.${ext}`;

      const res = await fetch(mediaItem.url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);

      recordShare('whatsapp', 'MEDIA_DOWNLOAD');
      setDownloadSuccessMessage(`✅ Clean ${mediaItem.type || 'photo'} downloaded & summary copied to clipboard! You can now attach it on WhatsApp, TikTok, Facebook, or Instagram.`);
      setTimeout(() => setDownloadSuccessMessage(null), 7000);
    } catch (err) {
      // Direct link fallback
      const a = document.createElement('a');
      a.href = mediaItem.url;
      a.download = `SpeakUp-CleanMedia-${post.id}`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setDownloadSuccessMessage(`✅ Media opened & summary copied! You can save the file and paste the summary text anywhere.`);
      setTimeout(() => setDownloadSuccessMessage(null), 7000);
    } finally {
      setIsDownloadingMedia(null);
    }
  };

  // 5. Creator Pack Helpers
  const handleCopyScript = (script: string) => {
    navigator.clipboard.writeText(script);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  const handleCopyCreatorPackText = () => {
    if (!creatorPack) return;
    const fullText = `=== SPEAK UP GHANA CREATOR & BROADCAST PACK ===\n\n` +
      `HEADLINE:\n${creatorPack.headline}\n\n` +
      `SUGGESTED SCRIPT NARRATION:\n${creatorPack.suggestedNarrationScript}\n\n` +
      `HASHTAGS:\n${creatorPack.hashtags.join(' ')}\n\n` +
      `ATTRIBUTION:\n${creatorPack.attributionText}\n\n` +
      `OFFICIAL STATUS:\n${creatorPack.disclosures.officialStatusNote}\n`;

    navigator.clipboard.writeText(fullText);
    setCopiedPackText(true);
    setTimeout(() => setCopiedPackText(false), 2500);
  };

  const handleDownloadCreatorPackBundle = () => {
    if (!creatorPack) return;
    const bundleText = JSON.stringify(creatorPack, null, 2);
    const blob = new Blob([bundleText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SpeakUp-CreatorPack-${post.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-in fade-in">
      <div
        id="simple-social-share-modal"
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg text-slate-100 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-800 bg-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
              isOfficialResponse
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            }`}>
              {isOfficialResponse ? <Landmark className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-sm sm:text-base text-white truncate">
                {isOfficialResponse ? 'Share Official Statement' : 'Share Citizen Report'}
              </h2>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>Privacy Protected • Safe to Circulate</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors shrink-0 cursor-pointer touch-manipulation"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scroll Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 bg-slate-900/60 text-slate-200">
          {/* Success Banner when Media is Downloaded & Text Copied */}
          {downloadSuccessMessage && (
            <div className="p-3 bg-emerald-950/90 border border-emerald-500/60 rounded-xl text-xs text-emerald-200 flex items-start gap-2 shadow-sm animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1 text-[12px] leading-relaxed">
                {downloadSuccessMessage}
              </div>
            </div>
          )}

          {/* Section 1: Quick 1-Tap App Sharing */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-300 block uppercase tracking-wider">
              1. Tap App to Share Link
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* WhatsApp (Primary in Ghana) */}
              <button
                onClick={handleWhatsAppShare}
                className="p-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer touch-manipulation min-h-[58px]"
              >
                <MessageCircle className="w-5 h-5" />
                <span>WhatsApp</span>
              </button>

              {/* Facebook */}
              <button
                onClick={handleFacebookShare}
                className="p-3 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer touch-manipulation min-h-[58px]"
              >
                <Share2 className="w-5 h-5" />
                <span>Facebook</span>
              </button>

              {/* X (Twitter) */}
              <button
                onClick={handleXShare}
                className="p-3 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white border border-slate-700 font-bold text-xs rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer touch-manipulation min-h-[58px]"
              >
                <Twitter className="w-5 h-5 text-sky-400" />
                <span>Post on X</span>
              </button>

              {/* Device Share (More) */}
              <button
                onClick={handleNativeShare}
                className="p-3 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer touch-manipulation min-h-[58px]"
              >
                <Share2 className="w-5 h-5 text-amber-400" />
                <span>More Apps</span>
              </button>
            </div>
          </div>

          {/* Section 2: Clean Media Share & Download (When Report has Media) */}
          {cleanMedia.length > 0 && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-emerald-400" />
                  <span>2. Share Photo/Video with Summary</span>
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">Clean & Safe</span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Downloads the privacy-safe media to your device and copies the summary text so you can easily post on WhatsApp Status, Facebook, or TikTok.
              </p>

              {/* Media Thumbnails & Single-Click Action Buttons */}
              <div className="space-y-2.5">
                {cleanMedia.map((m, idx) => {
                  const mediaId = m.id || `media-${idx}`;
                  const isDownloading = isDownloadingMedia === mediaId;
                  const isVideo = m.type === 'video';
                  const isAudio = m.type === 'audio';

                  return (
                    <div
                      key={mediaId}
                      className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-12 h-12 rounded-lg bg-slate-800 overflow-hidden shrink-0 flex items-center justify-center border border-slate-700">
                          {isVideo ? (
                            <Video className="w-5 h-5 text-amber-400" />
                          ) : isAudio ? (
                            <Volume2 className="w-5 h-5 text-purple-400" />
                          ) : (
                            <img
                              src={m.url}
                              alt="Clean attachment"
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-white block truncate">
                            {isVideo ? 'Clean Video Clip' : isAudio ? 'Clean Audio Recording' : 'Clean Report Photo'}
                          </span>
                          <span className="text-[11px] text-slate-400 block truncate">
                            PII & Location EXIF Scrubbed
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDownloadCleanMediaAndCopySummary(m)}
                        disabled={isDownloading}
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer touch-manipulation min-h-[38px]"
                        title="Download clean file and copy caption"
                      >
                        {isDownloading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                        <span className="hidden xs:inline sm:inline">Download & Copy Summary</span>
                        <span className="xs:hidden sm:hidden">Download & Copy</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 3: Simple Summary Text Preview & Copy */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="font-bold uppercase tracking-wider">
                {cleanMedia.length > 0 ? '3. Text Summary & Direct Link' : '2. Text Summary & Direct Link'}
              </span>
              <button
                onClick={handleCopyTextOnly}
                className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 transition-colors cursor-pointer text-xs"
              >
                {copiedText ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedText ? 'Text Copied!' : 'Copy Text'}</span>
              </button>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <h4 className="font-bold text-sm text-white leading-snug">
                {sharePackage?.headline || post.title}
              </h4>
              <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                {sharePackage?.caption || post.content}
              </p>
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-emerald-400 font-mono">
                <span className="truncate">{targetShareUrl}</span>
                <button
                  onClick={handleCopyLink}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-sans font-bold shrink-0 ml-2 transition-colors"
                >
                  {copiedLink ? 'Link Copied' : 'Copy Link'}
                </button>
              </div>
            </div>
          </div>

          {/* Section 4: Expandable Creator & Broadcast Pack (Complexities Subjected Here) */}
          <div className="border border-slate-800 bg-slate-950/60 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowCreatorPack(prev => !prev)}
              className="w-full p-3 flex items-center justify-between text-left hover:bg-slate-800/40 transition-colors cursor-pointer touch-manipulation"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 border border-amber-500/30">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-xs text-slate-200 block truncate">
                    Creator & Media Broadcast Pack
                  </span>
                  <span className="text-[11px] text-slate-400 block truncate">
                    Teleprompter scripts, radio bulletins, X threads & carousels
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 text-slate-400 text-xs font-semibold shrink-0">
                <span>{showCreatorPack ? 'Hide' : 'Open'}</span>
                {showCreatorPack ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {/* Creator Pack Detailed Studio View (When expanded) */}
            {showCreatorPack && (
              <div className="p-3.5 border-t border-slate-800 bg-slate-900/90 space-y-3.5 animate-in fade-in">
                {isLoadingPack ? (
                  <div className="py-6 flex flex-col items-center justify-center gap-2 text-amber-400 text-xs font-medium">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Assembling teleprompter scripts & broadcast pack...</span>
                  </div>
                ) : (
                  <>
                    {/* Creator Tab Switcher */}
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-slate-800 pb-2">
                      <button
                        onClick={() => setCreatorTab('video')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer touch-manipulation ${
                          creatorTab === 'video'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Video className="w-3.5 h-3.5 inline mr-1" /> Video Scripts
                      </button>
                      <button
                        onClick={() => setCreatorTab('radio')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer touch-manipulation ${
                          creatorTab === 'radio'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                            : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Radio className="w-3.5 h-3.5 inline mr-1" /> Radio & Pidgin
                      </button>
                      <button
                        onClick={() => setCreatorTab('thread')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer touch-manipulation ${
                          creatorTab === 'thread'
                            ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                            : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Layers className="w-3.5 h-3.5 inline mr-1" /> Threads & Carousel
                      </button>
                    </div>

                    {/* SUBTAB 1: VIDEO SCRIPTS */}
                    {creatorTab === 'video' && creatorPack?.videoProduction && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1">
                            {(['30s', '60s', 'deep'] as const).map(tab => (
                              <button
                                key={tab}
                                onClick={() => setActiveScriptTab(tab)}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors ${
                                  activeScriptTab === tab
                                    ? 'bg-amber-500 text-slate-950'
                                    : 'bg-slate-800 text-slate-400 hover:text-white'
                                }`}
                              >
                                {tab === '30s' ? '30s Short' : tab === '60s' ? '60s Reel' : 'Deep Dive'}
                              </button>
                            ))}
                          </div>

                          <button
                            onClick={() => {
                              const s = activeScriptTab === '30s'
                                ? creatorPack.videoProduction?.scripts.short30s
                                : activeScriptTab === '60s'
                                ? creatorPack.videoProduction?.scripts.standard60s
                                : creatorPack.videoProduction?.scripts.deepDive;
                              if (s) handleCopyScript(s);
                            }}
                            className="text-amber-400 hover:text-amber-300 font-bold text-xs flex items-center gap-1"
                          >
                            {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedScript ? 'Copied' : 'Copy Script'}</span>
                          </button>
                        </div>

                        <pre className="text-xs text-slate-200 font-mono whitespace-pre-wrap p-3 bg-slate-950 rounded-xl border border-slate-800 leading-relaxed max-h-48 overflow-y-auto">
                          {activeScriptTab === '30s' && creatorPack.videoProduction.scripts.short30s}
                          {activeScriptTab === '60s' && creatorPack.videoProduction.scripts.standard60s}
                          {activeScriptTab === 'deep' && creatorPack.videoProduction.scripts.deepDive}
                        </pre>

                        {/* Hooks preview */}
                        {creatorPack.videoProduction.hooks && creatorPack.videoProduction.hooks.length > 0 && (
                          <div className="space-y-1 text-xs">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Alternative Hooks:</span>
                            <div className="space-y-1">
                              {creatorPack.videoProduction.hooks.slice(0, 2).map((h, i) => (
                                <div key={i} className="p-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-300">
                                  <span className="text-[9px] text-amber-400 font-mono uppercase block">{h.type}</span>
                                  {h.hook}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* SUBTAB 2: RADIO & PIDGIN */}
                    {creatorTab === 'radio' && creatorPack?.audioProduction && (
                      <div className="space-y-3 text-xs">
                        <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                          <div className="flex items-center justify-between text-purple-300 font-bold">
                            <span>30s Radio News Bulletin</span>
                            <button
                              onClick={() => handleCopyScript(creatorPack.audioProduction?.radioBulletinScript || '')}
                              className="text-purple-400 hover:text-purple-300 flex items-center gap-1"
                            >
                              <Copy className="w-3 h-3" /> Copy
                            </button>
                          </div>
                          <p className="text-slate-300 font-mono leading-relaxed">
                            {creatorPack.audioProduction.radioBulletinScript}
                          </p>
                        </div>

                        <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                          <div className="flex items-center justify-between text-amber-300 font-bold">
                            <span>Ghana Pidgin Cue</span>
                            <button
                              onClick={() => handleCopyScript(creatorPack.audioProduction?.localDialectPhrasing || '')}
                              className="text-amber-400 hover:text-amber-300 flex items-center gap-1"
                            >
                              <Copy className="w-3 h-3" /> Copy
                            </button>
                          </div>
                          <p className="text-slate-300 font-mono leading-relaxed">
                            {creatorPack.audioProduction.localDialectPhrasing}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* SUBTAB 3: THREADS & CAROUSEL */}
                    {creatorTab === 'thread' && creatorPack?.threadAndCarousel && (
                      <div className="space-y-3 text-xs">
                        <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                          <span className="font-bold text-sky-400 block uppercase">5-Part X (Twitter) Thread</span>
                          <div className="space-y-1.5 max-h-48 overflow-y-auto">
                            {creatorPack.threadAndCarousel.xThread.map((t, idx) => (
                              <div key={idx} className="p-2 bg-slate-900 border border-slate-800 rounded text-slate-300 font-mono text-[11px]">
                                {t}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Creator Pack Export Buttons */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                      <button
                        onClick={handleCopyCreatorPackText}
                        className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-95"
                      >
                        {copiedPackText ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedPackText ? 'Creator Pack Copied' : 'Copy All Text'}</span>
                      </button>

                      <button
                        onClick={handleDownloadCreatorPackBundle}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-95"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download JSON</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Simple Footer */}
        <div className="px-4 sm:px-5 py-3 border-t border-slate-800 bg-slate-900 flex items-center justify-between gap-2">
          <span className="text-[11px] text-slate-400 truncate">
            Speak Up Ghana • Transparent Citizen Reporting
          </span>

          <button
            onClick={handleCopyLink}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer active:scale-95 touch-manipulation min-h-[38px]"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
