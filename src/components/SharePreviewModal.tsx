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
  FileText
} from 'lucide-react';
import { CivicPost, InstitutionResponse } from '../types';
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
  const [whatsappText, setWhatsappText] = useState('');
  const [twitterText, setTwitterText] = useState('');
  const [copied, setCopied] = useState(false);
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);

  const isOfficialResponse = Boolean(response);

  useEffect(() => {
    if (post && isOpen) {
      const locationStr = `${post.location.landmark ? post.location.landmark + ', ' : ''}${post.location.district} (${post.location.region})`;
      const institutionsStr = post.institutionTags.map(t => t.shortName || t.acronym).join(', ') || 'Relevant Authorities';

      const shareUrl = response
        ? `${window.location.origin}/app/post/${post.id}?responseId=${response.id}`
        : `${window.location.origin}/app/post/${post.id}`;

      if (response) {
        // Default share copy for Official Response / Communiqué
        const refStr = response.referenceNumber ? `[Ref: ${response.referenceNumber}]` : '';
        const excerpt = (response.statementTitle || response.message || '').replace(/\s+/g, ' ').slice(0, 160);
        const typeStr = response.responseType.replace(/_/g, ' ');

        const defaultWA = `🏛️ GHANA OFFICIAL COMMUNIQUÉ\n\n📌 Authority: ${response.institutionName} ${refStr}\n🎯 Directive: ${typeStr}\n📢 Statement: "${excerpt}..."\n\n📍 In response to citizen issue: "${post.title}" (${locationStr})\n\n🔗 Read full verified official statement & track actions:\n${shareUrl}`;
        const defaultTW = `🏛️ Official Statement from ${response.institutionName} on "${post.title}" in ${post.location.district}: "${excerpt.slice(0, 120)}..." ${refStr} #GhanaCivic #PublicRecord`;

        setWhatsappText(defaultWA);
        setTwitterText(defaultTW);

        // Request AI share copy
        setIsGeneratingCopy(true);
        api
          .generateShareCopy({
            postTitle: post.title,
            category: post.category,
            location: locationStr,
            confirmationsCount: post.engagement?.confirmations || 1,
            institutionsTagged: institutionsStr,
            institutionName: response.institutionName,
            statementTitle: response.statementTitle,
            message: response.fullStatement || response.message,
            referenceNumber: response.referenceNumber,
            responseType: response.responseType
          })
          .then(res => {
            if (res.whatsappCopy) {
              setWhatsappText(`${res.whatsappCopy.trim()}\n${shareUrl}`);
            }
            if (res.twitterCopy) setTwitterText(res.twitterCopy);
          })
          .catch(err => {
            console.warn('AI share copy generation fallback:', err);
          })
          .finally(() => {
            setIsGeneratingCopy(false);
          });
      } else {
        // Default share copy for Citizen Report
        const defaultWA = `🚨 GHANA CIVIC REPORT: ${post.title}\n\n📍 Location: ${locationStr}\n👥 ${post.engagement.confirmations} citizens independently observed this issue.\n🏛️ Tagged: ${institutionsStr}\n\n👉 Track live updates & confirm on Ghana Civic Network:\n${shareUrl}`;
        const defaultTW = `🚨 Citizen Observation in ${post.location.district}: "${post.title}". ${post.engagement.confirmations} residents seeing this too. @${institutionsStr.replace(/\s+/g, '')} alerted. #GhanaCivic #SpeakUp`;

        setWhatsappText(defaultWA);
        setTwitterText(defaultTW);

        // Attempt AI smart copy generation
        setIsGeneratingCopy(true);
        api
          .generateShareCopy({
            postTitle: post.title,
            category: post.category,
            location: locationStr,
            confirmationsCount: post.engagement.confirmations,
            institutionsTagged: institutionsStr
          })
          .then(res => {
            if (res.whatsappCopy) {
              setWhatsappText(`${res.whatsappCopy.trim()}\n${shareUrl}`);
            }
            if (res.twitterCopy) setTwitterText(res.twitterCopy);
          })
          .catch(err => {
            console.warn('AI share copy generation fallback:', err);
          })
          .finally(() => {
            setIsGeneratingCopy(false);
          });
      }
    }
  }, [post, response, isOpen]);

  if (!isOpen || !post) return null;

  const targetShareUrl = response
    ? `${window.location.origin}/app/post/${post.id}?responseId=${response.id}`
    : `${window.location.origin}/app/post/${post.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(targetShareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const recordShare = () => {
    if (post) {
      api.sharePost(post.id).catch(() => {});
    }
  };

  const handleWhatsAppShare = () => {
    recordShare();
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappText)}`;
    window.open(url, '_blank');
  };

  const handleTwitterShare = () => {
    recordShare();
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(twitterText)}`;
    window.open(url, '_blank');
  };

  const handleTelegramShare = () => {
    recordShare();
    const url = `https://t.me/share/url?url=${encodeURIComponent(targetShareUrl)}&text=${encodeURIComponent(whatsappText)}`;
    window.open(url, '_blank');
  };

  const handleNativeShare = async () => {
    recordShare();
    if (navigator.share) {
      try {
        await navigator.share({
          title: response ? (response.statementTitle || `Official Statement from ${response.institutionName}`) : post.title,
          text: whatsappText,
          url: targetShareUrl
        });
      } catch (err) {
        console.warn('Native share cancelled or failed', err);
      }
    } else {
      handleCopyLink();
    }
  };

  const primaryImage = post.media?.find(m => m.type === 'image')?.url;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto animate-in fade-in">
      <div
        id="social-share-preview-modal"
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl text-slate-100 shadow-2xl overflow-hidden my-4 max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
              isOfficialResponse
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
            }`}>
              {isOfficialResponse ? <Landmark className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-[13px] sm:text-base text-white truncate">
                {isOfficialResponse ? 'Share Official Communiqué' : 'Amplify Citizen Report'}
              </h2>
              <p className="text-[11px] text-slate-400 truncate">
                {isOfficialResponse
                  ? `Official state directive from ${response?.institutionName}`
                  : 'Put this citizen report on the radar of broader Ghanaian public & authorities'}
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

        {/* Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* OpenGraph Social Card Preview */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="text-[10px] font-bold text-slate-400 px-3 py-1.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-mono">
                {isOfficialResponse ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    OFFICIAL STATE DIRECTIVE
                  </>
                ) : (
                  'SOCIAL PREVIEW CARD'
                )}
              </span>
              <span className="text-emerald-400 font-mono">REPUBLIC OF GHANA</span>
            </div>

            {isOfficialResponse && response ? (
              /* Official Response Custom Share Preview Card */
              <div className="p-4 space-y-3 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
                {/* Institution & Badge Header */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700/80 overflow-hidden shrink-0">
                      {response.institutionLogo ? (
                        <img src={response.institutionLogo} alt={response.institutionName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-tr from-emerald-600 to-teal-700 flex items-center justify-center text-white font-bold text-sm">
                          <Landmark className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 leading-tight">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-[13px] sm:text-sm text-white truncate">
                          {response.institutionName}
                        </span>
                        <BadgeCheck className="w-4 h-4 text-emerald-400 fill-emerald-500/20 shrink-0" />
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">
                        {response.responderName} {response.responderTitle ? `• ${response.responderTitle}` : ''}
                      </div>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
                    {response.responseType.replace(/_/g, ' ')}
                  </span>
                </div>

                {/* Statement Title & Excerpt */}
                <div className="p-3 rounded-xl bg-slate-900/90 border-l-3 border-emerald-500 border-t border-r border-b border-slate-800/80 space-y-1.5">
                  <h4 className="font-bold text-sm text-white leading-snug">
                    {response.statementTitle || 'Official Communiqué & Action Update'}
                  </h4>
                  <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">
                    "{response.fullStatement || response.message}"
                  </p>
                  {response.referenceNumber && (
                    <div className="pt-1 flex items-center gap-1 text-[10px] font-mono text-slate-400">
                      <FileCheck2 className="w-3 h-3 text-emerald-400" />
                      <span>Ref Number: <strong className="text-slate-200">{response.referenceNumber}</strong></span>
                    </div>
                  )}
                </div>

                {/* In Response To Context Bar */}
                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs flex items-center gap-2.5 text-slate-400">
                  <div className="w-6 h-6 rounded bg-slate-800 flex items-center justify-center shrink-0 text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Regarding Citizen Report</span>
                    <span className="text-[11px] text-slate-300 font-medium truncate block">
                      "{post.title}" • {post.location.district}, {post.location.region}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* Citizen Post Share Card */
              <div>
                {primaryImage && (
                  <div className="aspect-video relative bg-slate-900 overflow-hidden">
                    <img src={primaryImage} alt="Post preview" className="w-full h-full object-cover" />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-slate-950/80 text-amber-300 text-[10px] font-bold border border-amber-800/60">
                      {post.category}
                    </div>
                  </div>
                )}

                <div className="p-3.5 space-y-2">
                  <h4 className="font-bold text-sm text-white leading-snug">{post.title}</h4>

                  <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                    <span className="flex items-center gap-1 text-slate-300">
                      <MapPin className="w-3 h-3 text-emerald-400" />
                      {post.location.district}, {post.location.region}
                    </span>
                    <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                      <CheckCircle2 className="w-3 h-3" />
                      {post.engagement.confirmations} Independent Confirmations
                    </span>
                  </div>

                  {post.institutionTags.length > 0 && (
                    <div className="text-[11px] text-slate-400">
                      Tagged: <span className="text-slate-200 font-semibold">{post.institutionTags.map(t => t.shortName || t.acronym).join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* AI-Generated Share Text for WhatsApp */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                WhatsApp Message (Ready to Send):
              </label>
              {isGeneratingCopy && (
                <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> AI crafting summary...
                </span>
              )}
            </div>
            <textarea
              rows={4}
              value={whatsappText}
              onChange={e => setWhatsappText(e.target.value)}
              className="w-full p-2.5 bg-slate-800 text-xs text-slate-200 rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-500 font-mono resize-none"
            />
          </div>

          {/* Social Platform Action Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <button
              onClick={handleWhatsAppShare}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-md active:scale-95 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </button>

            <button
              onClick={handleTwitterShare}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors active:scale-95 cursor-pointer"
            >
              <Twitter className="w-4 h-4" />
              Post to X
            </button>

            <button
              onClick={handleTelegramShare}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors active:scale-95 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              Telegram
            </button>

            <button
              onClick={handleNativeShare}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors active:scale-95 cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              Share Direct
            </button>
          </div>
        </div>

        {/* Footer with Copy Link */}
        <div className="px-4 sm:px-5 py-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400 truncate max-w-[240px] sm:max-w-[340px] font-mono">
            {targetShareUrl}
          </div>

          <button
            onClick={handleCopyLink}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors shrink-0 active:scale-95 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Link Copied!' : 'Copy Link'}
          </button>
        </div>
      </div>
    </div>
  );
};

