import { PostMedia } from '../types';

export interface EvidencePackSummary {
  typeLabel: string;
  badgeColor: string;
  description: string;
  hasAudio: boolean;
  hasVideo: boolean;
  hasUserImage: boolean;
  hasSystemThumbnail: boolean;
  hasDocument: boolean;
  hasText: boolean;
  audioMedia?: PostMedia;
  backgroundThumbnailUrl?: string;
}

export const SYSTEM_AUDIO_THUMBNAILS = [
  'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=800&auto=format&fit=crop&q=80', // Civic Mic / Sound Studio
  'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop&q=80', // Civic Authority / Safety
  'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=800&auto=format&fit=crop&q=80', // Community Water / Weather
  'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=800&auto=format&fit=crop&q=80'  // Infrastructure / Roads
];

export function getRandomSystemAudioThumbnail(): string {
  const idx = Math.floor(Math.random() * SYSTEM_AUDIO_THUMBNAILS.length);
  return SYSTEM_AUDIO_THUMBNAILS[idx];
}

export function determineEvidencePack(mediaList: PostMedia[], contentText: string): EvidencePackSummary {
  const audioMedia = mediaList.find(m => m.type === 'audio');
  const userImages = mediaList.filter(m => m.type === 'image' && !m.isSystemThumbnail);
  const systemThumbnails = mediaList.filter(m => m.type === 'image' && m.isSystemThumbnail);
  const videos = mediaList.filter(m => m.type === 'video');
  const documents = mediaList.filter(m => m.type === 'document');

  const hasAudio = !!audioMedia;
  const hasVideo = videos.length > 0;
  const hasUserImage = userImages.length > 0;
  const hasSystemThumbnail = systemThumbnails.length > 0;
  const hasDocument = documents.length > 0;
  const hasText = contentText.trim().length > 0;

  let backgroundThumbnailUrl: string | undefined = undefined;

  if (hasAudio) {
    if (hasUserImage) {
      backgroundThumbnailUrl = userImages[0].url;
    } else if (hasSystemThumbnail) {
      backgroundThumbnailUrl = systemThumbnails[0].url;
    } else if (audioMedia?.thumbnailUrl) {
      backgroundThumbnailUrl = audioMedia.thumbnailUrl;
    } else {
      backgroundThumbnailUrl = SYSTEM_AUDIO_THUMBNAILS[0];
    }
  }

  // 1. Video only - evidence is video
  if (hasVideo && !hasAudio && !hasUserImage && !hasDocument && (!hasText || contentText.length < 15)) {
    return {
      typeLabel: 'Video Evidence',
      badgeColor: 'bg-purple-900/60 text-purple-200 border-purple-700',
      description: 'Evidence is raw video footage',
      hasAudio,
      hasVideo,
      hasUserImage,
      hasSystemThumbnail,
      hasDocument,
      hasText,
      backgroundThumbnailUrl
    };
  }

  // 2. Texts with video - evidence is both text & video
  if (hasVideo && (hasText || hasUserImage || hasDocument)) {
    return {
      typeLabel: 'Video & Text Evidence',
      badgeColor: 'bg-indigo-900/60 text-indigo-200 border-indigo-700',
      description: 'Evidence combines video recording & detailed citizen observations',
      hasAudio,
      hasVideo,
      hasUserImage,
      hasSystemThumbnail,
      hasDocument,
      hasText,
      backgroundThumbnailUrl
    };
  }

  // 3. Audio with user uploaded images - evidence is both audio and images
  if (hasAudio && hasUserImage) {
    return {
      typeLabel: 'Audio & Photo Evidence',
      badgeColor: 'bg-emerald-900/60 text-emerald-200 border-emerald-700',
      description: 'Evidence includes spoken voice recording and user-uploaded photos',
      hasAudio,
      hasVideo,
      hasUserImage,
      hasSystemThumbnail,
      hasDocument,
      hasText,
      audioMedia,
      backgroundThumbnailUrl
    };
  }

  // 4. Audio with system generated thumbnail - evidence is audio only
  if (hasAudio && !hasUserImage) {
    return {
      typeLabel: 'Audio Evidence Only',
      badgeColor: 'bg-amber-900/60 text-amber-200 border-amber-700',
      description: 'Evidence is spoken citizen testimony (with automated system thumbnail)',
      hasAudio,
      hasVideo,
      hasUserImage,
      hasSystemThumbnail: true,
      hasDocument,
      hasText,
      audioMedia,
      backgroundThumbnailUrl
    };
  }

  // 5. Documents attached
  if (hasDocument) {
    return {
      typeLabel: 'Documentary Evidence',
      badgeColor: 'bg-sky-900/60 text-sky-200 border-sky-700',
      description: 'Evidence includes official documents, receipts, or legal records',
      hasAudio,
      hasVideo,
      hasUserImage,
      hasSystemThumbnail,
      hasDocument,
      hasText,
      backgroundThumbnailUrl
    };
  }

  // 6. Text posts only - texts is evidence and related media
  return {
    typeLabel: 'Text & Media Evidence',
    badgeColor: 'bg-slate-800 text-slate-200 border-slate-700',
    description: 'Evidence comprises citizen statement & submitted attachments',
    hasAudio,
    hasVideo,
    hasUserImage,
    hasSystemThumbnail,
    hasDocument,
    hasText,
    backgroundThumbnailUrl
  };
}
