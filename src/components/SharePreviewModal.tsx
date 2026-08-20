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
  CheckCircle2
} from 'lucide-react';
import { CivicPost } from '../types';
import { api } from '../services/api';

interface SharePreviewModalProps {
  post: CivicPost | null;
  isOpen: boolean;
  onClose: () => void;
}

export const SharePreviewModal: React.FC<SharePreviewModalProps> = ({
  post,
  isOpen,
  onClose
}) => {
  const [whatsappText, setWhatsappText] = useState('');
  const [twitterText, setTwitterText] = useState('');
  const [copied, setCopied] = useState(false);
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);

  useEffect(() => {
    if (post && isOpen) {
      const locationStr = `${post.location.landmark ? post.location.landmark + ', ' : ''}${post.location.district} (${post.location.region})`;
      const institutionsStr = post.institutionTags.map(t => t.shortName || t.acronym).join(', ') || 'Relevant Authorities';

      // Default share text
      const defaultWA = `🚨 GHANA CIVIC REPORT: ${post.title}\n\n📍 Location: ${locationStr}\n👥 ${post.engagement.confirmations} citizens independently observed this issue.\n🏛️ Tagged: ${institutionsStr}\n\n👉 Track live updates & confirm on Ghana Civic Network:\n${window.location.origin}/app/post/${post.id}`;
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
          if (res.whatsappCopy) setWhatsappText(res.whatsappCopy);
          if (res.twitterCopy) setTwitterText(res.twitterCopy);
        })
        .catch(err => {
          console.warn('AI share copy generation fallback:', err);
        })
        .finally(() => {
          setIsGeneratingCopy(false);
        });
    }
  }, [post, isOpen]);

  if (!isOpen || !post) return null;

  const handleCopyLink = () => {
    const postUrl = `${window.location.origin}/app/post/${post.id}`;
    navigator.clipboard.writeText(postUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWhatsAppShare = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappText)}`;
    window.open(url, '_blank');
  };

  const handleTwitterShare = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(twitterText)}`;
    window.open(url, '_blank');
  };

  const handleTelegramShare = () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent(`${window.location.origin}/app/post/${post.id}`)}&text=${encodeURIComponent(whatsappText)}`;
    window.open(url, '_blank');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: whatsappText,
          url: `${window.location.origin}/app/post/${post.id}`
        });
      } catch (err) {
        console.warn('Native share cancelled or failed', err);
      }
    } else {
      handleCopyLink();
    }
  };

  const primaryImage = post.media.find(m => m.type === 'image')?.url;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto animate-in fade-in">
      <div
        id="social-share-preview-modal"
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl text-slate-100 shadow-2xl overflow-hidden my-4 max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base text-white">Amplify on Social Media</h2>
              <p className="text-[11px] text-slate-400">Put this citizen report on the radar of broader Ghanaian public & authorities</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* OpenGraph Social Card Preview (What recipients see on WhatsApp / X) */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="text-[10px] font-bold text-slate-400 px-3 py-1.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <span>SOCIAL PREVIEW CARD</span>
              <span className="text-emerald-400">GHANA CIVIC NETWORK</span>
            </div>

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

          {/* AI-Generated Share Text for WhatsApp */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                WhatsApp Message (Factual & Share-Ready):
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
            <button
              onClick={handleWhatsAppShare}
              className="px-3 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-md"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </button>

            <button
              onClick={handleTwitterShare}
              className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
            >
              <Twitter className="w-4 h-4" />
              Post to X
            </button>

            <button
              onClick={handleTelegramShare}
              className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
            >
              <Send className="w-4 h-4" />
              Telegram
            </button>

            <button
              onClick={handleNativeShare}
              className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
            >
              <Share2 className="w-4 h-4" />
              More / Share
            </button>
          </div>
        </div>

        {/* Footer with Copy Link */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400 truncate max-w-[280px]">
            {window.location.origin}/app/post/{post.id}
          </div>

          <button
            onClick={handleCopyLink}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Link Copied!' : 'Copy Direct Link'}
          </button>
        </div>
      </div>
    </div>
  );
};
