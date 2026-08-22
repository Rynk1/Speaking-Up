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

export interface SocialSharePackage {
  id: string;
  postId: string;
  responseId?: string;
  platform: SocialPlatform;
  creatorContext: CreatorContext;
  headline: string;
  caption: string;
  body?: string;
  hashtags: string[];
  callToAction: string;
  shortUrl: string;
  canonicalUrl: string;
  pinnedComment?: string;
  threadParts?: string[];
  mediaSummary?: {
    image1x1Url?: string;
    story9x16Url?: string;
    video9x16Url?: string;
    thumbnail16x9Url?: string;
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

export interface CreatorPack {
  id: string;
  postId: string;
  responseId?: string;
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
