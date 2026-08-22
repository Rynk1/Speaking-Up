import React, { useState, useEffect } from 'react';
import {
  Share2,
  Copy,
  Check,
  X,
  Sparkles,
  ExternalLink,
  MessageCircle,
  Twitter,
  Send,
  Loader2,
  Building2,
  MapPin,
  CheckCircle2,
  BadgeCheck,
  FileCheck2,
  Landmark,
  FileText,
  Video,
  Download,
  Flame,
  Radio,
  Newspaper,
  Layers,
  BarChart3,
  UserCheck,
  Link,
  ShieldAlert
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
  const [activeTab, setActiveTab] = useState<'quick' | 'creator'>('quick');
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform>('whatsapp');
  const [creatorContext, setCreatorContext] = useState<CreatorContext>('general');
  const [sharePackage, setSharePackage] = useState<Partial<SocialSharePackage> | null>(null);
  const [creatorPack, setCreatorPack] = useState<CreatorPack | null>(null);
  const [analytics, setAnalytics] = useState<ShareAnalyticsSummary | null>(null);

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPackText, setCopiedPackText] = useState(false);
  const [isLoadingPackage, setIsLoadingPackage] = useState(false);
  const [isLoadingPack, setIsLoadingPack] = useState(false);

  const isOfficialResponse = Boolean(response);

  // Fetch or regenerate social package whenever post/response/platform/context changes
  useEffect(() => {
    if (post && isOpen) {
      setIsLoadingPackage(true);
      api
        .prepareSocialPackage({
          postId: post.id,
          responseId: response?.id,
          platform: selectedPlatform,
          creatorContext
        })
        .then(res => setSharePackage(res))
        .catch(err => console.warn('Social package load error:', err))
        .finally(() => setIsLoadingPackage(false));

      // Fetch analytics summary
      api
        .getSocialAnalytics(post.id)
        .then(res => setAnalytics(res))
        .catch(() => {});
    }
  }, [post, response, isOpen, selectedPlatform, creatorContext]);

  // Generate Creator Pack when switching to creator tab or updating context
  useEffect(() => {
    if (post && isOpen && activeTab === 'creator') {
      setIsLoadingPack(true);
      api
        .generateCreatorPack({
          postId: post.id,
          responseId: response?.id,
          creatorContext
        })
        .then(res => setCreatorPack(res))
        .catch(err => console.warn('Creator pack generation error:', err))
        .finally(() => setIsLoadingPack(false));
    }
  }, [post, response, isOpen, activeTab, creatorContext]);

  if (!isOpen || !post) return null;

  const targetShareUrl = sharePackage?.shortUrl || (response
    ? `${window.location.origin}/app/post/${post.id}?responseId=${response.id}`
    : `${window.location.origin}/app/post/${post.id}`);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(targetShareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const recordShare = (plat: SocialPlatform) => {
    if (post) {
      api.recordSocialShare({
        postId: post.id,
        responseId: response?.id,
        platform: plat,
        contentType: activeTab === 'creator' ? 'CREATOR_PACK' : 'SHARE_ASSIST',
        referralCode: sharePackage?.shortUrl?.split('/s/')?.[1]
      }).catch(() => {});
    }
  };

  const handleNativeShare = async () => {
    recordShare(selectedPlatform);
    if (navigator.share) {
      try {
        await navigator.share({
          title: sharePackage?.headline || post.title,
          text: sharePackage?.caption || post.content,
          url: targetShareUrl
        });
      } catch (err) {
        console.warn('Native share cancelled:', err);
      }
    } else {
      handleCopyLink();
    }
  };

  const handleWhatsAppShare = () => {
    recordShare('whatsapp');
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(sharePackage?.caption || targetShareUrl)}`;
    window.open(url, '_blank');
  };

  const handleXShare = () => {
    recordShare('x');
    const text = sharePackage?.caption || `🚨 ${post.title} in ${post.location.district}. Read report on Speak Up Ghana: ${targetShareUrl}`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleTelegramShare = () => {
    recordShare('telegram');
    const url = `https://t.me/share/url?url=${encodeURIComponent(targetShareUrl)}&text=${encodeURIComponent(sharePackage?.caption || post.title)}`;
    window.open(url, '_blank');
  };

  const handleCopyCreatorPackText = () => {
    if (!creatorPack) return;
    const fullText = `=== SPEAK UP GHANA CREATOR PACK ===\n\n` +
      `HEADLINE:\n${creatorPack.headline}\n\n` +
      `SUGGESTED SCRIPT NARRATION:\n${creatorPack.suggestedNarrationScript}\n\n` +
      `HASHTAGS:\n${creatorPack.hashtags.join(' ')}\n\n` +
      `ATTRIBUTION:\n${creatorPack.attributionText}\n\n` +
      `LEGAL DISCLOSURE:\n${creatorPack.disclosures.citizenAllegationNote}\n${creatorPack.disclosures.officialStatusNote}\n`;

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

  const platformButtons: { id: SocialPlatform; label: string; icon: string; badge: string }[] = [
    { id: 'whatsapp', label: 'WhatsApp Chat', icon: '💬', badge: 'Direct Link' },
    { id: 'whatsapp_status', label: 'WhatsApp Status', icon: '🟢', badge: '9:16 Visual' },
    { id: 'youtube', label: 'YouTube Creator', icon: '🎥', badge: 'Pinned Comment' },
    { id: 'tiktok', label: 'TikTok Video', icon: '📱', badge: 'Hook & Script' },
    { id: 'instagram', label: 'Instagram', icon: '📸', badge: 'Story & Feed' },
    { id: 'x', label: 'X (Twitter)', icon: '𝕏', badge: '5-Part Thread' },
    { id: 'facebook', label: 'Facebook Feed', icon: '📘', badge: 'Link Card' },
    { id: 'facebook_group', label: 'FB Group', icon: '👥', badge: 'Community' },
    { id: 'blog', label: 'Blog Press Kit', icon: '📰', badge: 'Full Brief' }
  ];

  const contextOptions: { id: CreatorContext; label: string; icon: string }[] = [
    { id: 'general', label: 'Standard Share', icon: '⚡' },
    { id: 'reaction', label: 'Reaction Video', icon: '🗣️' },
    { id: 'news', label: 'News Report', icon: '📰' },
    { id: 'investigation', label: 'Investigation', icon: '🔍' },
    { id: 'awareness', label: 'Awareness Campaign', icon: '📢' },
    { id: 'call_to_action', label: 'Call for Action', icon: '🎯' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto animate-in fade-in">
      <div
        id="social-share-engine-modal"
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl text-slate-100 shadow-2xl overflow-hidden my-4 max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
              isOfficialResponse
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
            }`}>
              {isOfficialResponse ? <Landmark className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-sm sm:text-base text-white truncate">
                SpeakUp Social Distribution & Creator Amplification Engine
              </h2>
              <p className="text-[11px] text-slate-400 truncate">
                One civic report → platform-tuned packages → measurable journey back
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Engine Subsystem Mode Switcher (Level 1 vs Level 2) */}
        <div className="flex border-b border-slate-800 bg-slate-950/80 px-4 pt-2 gap-2 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('quick')}
            className={`px-4 py-2.5 rounded-t-xl border-t border-x transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'quick'
                ? 'bg-slate-900 text-emerald-400 border-slate-700 font-bold'
                : 'bg-transparent text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <ZapIcon /> Quick Share Assist
          </button>

          <button
            onClick={() => setActiveTab('creator')}
            className={`px-4 py-2.5 rounded-t-xl border-t border-x transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'creator'
                ? 'bg-slate-900 text-amber-400 border-slate-700 font-bold'
                : 'bg-transparent text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Video className="w-3.5 h-3.5" /> 🎬 Creator Pack & Reaction Studio
          </button>
        </div>

        {/* Main Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Creator Context Selector Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-medium text-slate-300 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> What are you creating / sharing?
              </span>
              <span className="text-[11px] text-slate-500 font-mono">Select Tone & Context</span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {contextOptions.map(ctx => (
                <button
                  key={ctx.id}
                  onClick={() => setCreatorContext(ctx.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1 transition-all whitespace-nowrap cursor-pointer ${
                    creatorContext === ctx.id
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                      : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <span>{ctx.icon}</span>
                  <span>{ctx.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* TAB 1: QUICK SHARE ASSIST */}
          {activeTab === 'quick' && (
            <div className="space-y-4">
              {/* Platform Selector Grid */}
              <div className="grid grid-cols-3 sm:grid-cols-3 gap-2">
                {platformButtons.map(p => {
                  const isSelected = selectedPlatform === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPlatform(p.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all relative overflow-hidden cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-950/60 text-white border-emerald-500 ring-1 ring-emerald-500/40'
                          : 'bg-slate-800/60 text-slate-300 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold mb-1">
                        <span className="flex items-center gap-1.5">
                          <span>{p.icon}</span>
                          <span className="truncate">{p.label}</span>
                        </span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                      </div>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-900/80 text-emerald-400 border border-slate-800 inline-block">
                        {p.badge}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Live Platform Content Package Preview Box */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-3 relative">
                <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                  <span className="font-mono text-emerald-400 font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE PLATFORM PACKAGE PREVIEW ({selectedPlatform.toUpperCase()})
                  </span>
                  {isLoadingPackage && (
                    <span className="text-[11px] text-amber-400 flex items-center gap-1">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Preparing package...
                    </span>
                  )}
                </div>

                {/* Main Headline */}
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Suggested Headline</span>
                  <h4 className="font-bold text-sm text-white font-editorial">
                    {sharePackage?.headline || post.title}
                  </h4>
                </div>

                {/* Caption / Body */}
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Formatted Caption & Content</span>
                  <textarea
                    rows={5}
                    value={sharePackage?.caption || ''}
                    onChange={e => setSharePackage(prev => prev ? { ...prev, caption: e.target.value } : null)}
                    className="w-full p-2.5 bg-slate-900 text-xs text-slate-200 rounded-xl border border-slate-800 font-mono resize-none focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Thread Parts if X/Twitter */}
                {selectedPlatform === 'x' && sharePackage?.threadParts && (
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-sky-400 block">5-Part X Thread Preview</span>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {sharePackage.threadParts.map((tp, idx) => (
                        <div key={idx} className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-300">
                          {tp}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggested Pinned Comment if YouTube */}
                {selectedPlatform === 'youtube' && sharePackage?.pinnedComment && (
                  <div className="p-2.5 bg-slate-900 border border-amber-900/40 rounded-xl text-xs space-y-1">
                    <span className="text-[10px] font-bold text-amber-400 uppercase block">Suggested Pinned Comment</span>
                    <p className="font-mono text-slate-300">{sharePackage.pinnedComment}</p>
                  </div>
                )}

                {/* Legal & Ethical Safeguards Note */}
                {sharePackage?.disclosures && (
                  <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-[10px] text-slate-400 space-y-0.5 font-mono">
                    <div className="text-amber-400 font-semibold flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" /> Integrity Disclosure Safeguard:
                    </div>
                    <p>{sharePackage.disclosures.citizenAllegationNote}</p>
                    <p>{sharePackage.disclosures.officialStatusNote}</p>
                  </div>
                )}
              </div>

              {/* Direct Share Action Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  onClick={handleWhatsAppShare}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-95"
                >
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </button>

                <button
                  onClick={handleXShare}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-95"
                >
                  <Twitter className="w-4 h-4" /> Post on X
                </button>

                <button
                  onClick={handleTelegramShare}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-95"
                >
                  <Send className="w-4 h-4" /> Telegram
                </button>

                <button
                  onClick={handleNativeShare}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-95"
                >
                  <Share2 className="w-4 h-4" /> Native Share
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: CREATOR PACK & REACTION STUDIO */}
          {activeTab === 'creator' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/40 border border-amber-500/30 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-300 flex items-center gap-1.5">
                    <Video className="w-4 h-4" /> Complete Creator Production Pack
                  </span>
                  {isLoadingPack && (
                    <span className="text-[11px] text-amber-400 flex items-center gap-1">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Assembling Creator Bundle...
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Download or copy a ready-to-use production kit containing structured headlines, summaries, script narration, quote cards, hashtags, tracking URL, and legal disclosures for YouTubers, bloggers, and TikTokers.
                </p>

                {creatorPack && (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={handleCopyCreatorPackText}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95 shadow-md"
                    >
                      {copiedPackText ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedPackText ? 'Creator Pack Copied!' : 'Copy Full Creator Text'}
                    </button>

                    <button
                      onClick={handleDownloadCreatorPackBundle}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95"
                    >
                      <Download className="w-3.5 h-3.5" /> Download Pack (JSON/TXT Bundle)
                    </button>
                  </div>
                )}
              </div>

              {/* Creator Pack Details Display */}
              {creatorPack && (
                <div className="space-y-3">
                  {/* Hook & Narration Script */}
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                    <span className="text-[10px] font-bold text-amber-400 uppercase block">Suggested Video Hook / Intro</span>
                    <p className="text-xs text-amber-200 font-bold leading-relaxed">"{creatorPack.hookText}"</p>
                  </div>

                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase block">Suggested Video / Podcast Narration Script</span>
                    <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                      {creatorPack.suggestedNarrationScript}
                    </pre>
                  </div>

                  {/* Quote Card Specs */}
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-sky-400 uppercase block">Quote Card Metadata</span>
                    <div className="text-xs text-slate-300 space-y-0.5 font-mono">
                      <div>Title: <span className="text-white font-bold">{creatorPack.quoteCardContent.title}</span></div>
                      <div>Location: {creatorPack.quoteCardContent.location}</div>
                      <div>Institution: {creatorPack.quoteCardContent.institution}</div>
                      <div>Status: <span className="text-emerald-400 font-bold">{creatorPack.quoteCardContent.status}</span></div>
                    </div>
                  </div>

                  {/* Hashtags & Attribution */}
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5 text-xs">
                    <span className="text-[10px] font-bold text-purple-400 uppercase block">Attribution & Hashtags</span>
                    <div className="font-mono text-slate-300">{creatorPack.attributionText}</div>
                    <div className="text-emerald-400 font-bold">{creatorPack.hashtags.join(' ')}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Social Analytics Counter Preview */}
          {analytics && (
            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                <span className="font-medium text-slate-300">Report Social Reach:</span>
              </div>
              <div className="flex items-center gap-3 font-mono">
                <span>Shares: <strong className="text-white">{analytics.totalShares}</strong></span>
                <span>Clicks: <strong className="text-emerald-400">{analytics.totalClicks}</strong></span>
                <span>Impact: <strong className="text-amber-400">{analytics.totalConfirmations}</strong></span>
              </div>
            </div>
          )}
        </div>

        {/* Footer with Tracked Short URL Copy */}
        <div className="px-4 sm:px-5 py-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 min-w-0 font-mono text-xs text-emerald-400 truncate">
            <Link className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{targetShareUrl}</span>
          </div>

          <button
            onClick={handleCopyLink}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer active:scale-95"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedLink ? 'Link Copied!' : 'Copy Tracked Link'}
          </button>
        </div>
      </div>
    </div>
  );
};

function ZapIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}
