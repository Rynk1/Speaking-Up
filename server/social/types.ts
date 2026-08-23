export type SocialPlatform =
  | 'whatsapp'
  | 'whatsapp_status'
  | 'instagram'
  | 'youtube'
  | 'tiktok'
  | 'x'
  | 'facebook'
  | 'facebook_group'
  | 'blog'
  | 'telegram';

export type CreatorContext =
  | 'general'
  | 'news'
  | 'reaction'
  | 'commentary'
  | 'investigation'
  | 'awareness'
  | 'call_to_action';

export type PrimaryMediaType = 'video' | 'audio' | 'image' | 'text';

export interface PlatformCapabilities {
  platform: SocialPlatform;
  displayName: string;
  supportsImage: boolean;
  supportsVideo: boolean;
  supportsStory: boolean;
  supportsThread: boolean;
  supportsDirectPublish: boolean;
  captionPrefill: boolean;
  urlPrefill: boolean;
  aspectRatios: string[];
  maxCharacterLimit?: number;
}

export interface CleanMediaAsset {
  id: string;
  type: 'image' | 'video' | 'audio';
  url: string;
  thumbnailUrl?: string;
  mimeType?: string;
  caption?: string;
  durationSeconds?: number;
  isPiiStripped: boolean;
}

export interface AudiogramConfig {
  audioUrl?: string;
  transcriptSnippet?: string;
  durationSeconds?: number;
  waveformPoints?: number[];
  speakerLabel?: string;
}

export interface StoryCardConfig {
  title: string;
  location: string;
  institution: string;
  category: string;
  status: string;
  confirmations: number;
  isOfficial: boolean;
  mediaUrl?: string;
  mediaType: PrimaryMediaType;
  qrCodeTargetUrl: string;
  district: string;
  region: string;
}

export interface VideoOverlayConfig {
  topBanner: string;
  locationBadge: string;
  institutionBadge: string;
  citizenCountBadge: string;
  bottomCta: string;
  aspectRatio: '9:16' | '16:9';
}

export interface CarouselSlide {
  slideNumber: number;
  title: string;
  body: string;
  visualPrompt: string;
}

export interface SocialSharePackage {
  id: string;
  postId: string;
  responseId?: string;
  platform: SocialPlatform;
  creatorContext: CreatorContext;
  primaryMediaType: PrimaryMediaType;
  headline: string;
  caption: string;
  body?: string;
  hashtags: string[];
  callToAction: string;
  shortUrl: string;
  canonicalUrl: string;
  pinnedComment?: string;
  threadParts?: string[];
  cleanMediaAssets?: CleanMediaAsset[];
  audiogramConfig?: AudiogramConfig;
  storyCardConfig?: StoryCardConfig;
  videoOverlayConfig?: VideoOverlayConfig;
  carouselSlides?: CarouselSlide[];
  mediaSummary?: {
    image1x1Url?: string;
    story9x16Url?: string;
    video9x16Url?: string;
    thumbnail16x9Url?: string;
    audioUrl?: string;
  };
  disclosures: {
    citizenAllegationNote: string;
    officialStatusNote?: string;
  };
  createdAt: string;
}

export interface CreatorPackFile {
  filename: string;
  mimeType: string;
  content: string;
}

export interface VideoProductionKit {
  hooks: { type: string; hook: string; style: string }[];
  scripts: {
    short30s: string;
    standard60s: string;
    deepDive: string;
  };
  bRollSuggestions: string[];
  onScreenCaptions: string[];
  pinnedComment: string;
}

export interface AudioProductionKit {
  radioBulletinScript: string;
  localDialectPhrasing: string;
  soundbiteQuotes: string[];
  podcastIntroOutro: string;
  transcriptExcerpt: string;
}

export interface ThreadAndCarouselKit {
  xThread: string[];
  instagramCarousel: CarouselSlide[];
  pressReleaseMarkdown: string;
  embedHtml: string;
}

export interface CreatorPack {
  id: string;
  postId: string;
  responseId?: string;
  primaryMediaType: PrimaryMediaType;
  headline: string;
  shortSummary: string;
  longSummary: string;
  hookText: string;
  suggestedNarrationScript: string;
  hashtags: string[];
  attributionText: string;
  sourceUrl: string;
  callToAction: string;
  disclosures: {
    citizenAllegationNote: string;
    officialStatusNote?: string;
    creatorCommentaryDisclaimer: string;
  };
  quoteCardContent: {
    title: string;
    quote: string;
    location: string;
    institution: string;
    status: string;
  };
  cleanMediaAssets: CleanMediaAsset[];
  videoProduction: VideoProductionKit;
  audioProduction: AudioProductionKit;
  threadAndCarousel: ThreadAndCarouselKit;
  platformSpecificPackages: Record<SocialPlatform, Partial<SocialSharePackage>>;
  files: CreatorPackFile[];
}

export interface CreatorProfile {
  id: string;
  userId: string;
  creatorName: string;
  handle: string;
  primaryPlatform: string;
  platformLinks: Record<string, string>;
  isVerifiedCreator: boolean;
  totalShares: number;
  totalClicks: number;
  totalConversions: number;
  createdAt: string;
  updatedAt: string;
}

export interface ShareAnalyticsSummary {
  postId: string;
  totalShares: number;
  totalClicks: number;
  totalRegistrations: number;
  totalConfirmations: number;
  topPlatforms: { platform: string; shares: number; clicks: number }[];
  topCreators: { creatorName: string; shares: number; clicks: number }[];
}

