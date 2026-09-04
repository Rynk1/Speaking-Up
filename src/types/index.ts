export type CivicCategory =
  | 'Infrastructure & Roads'
  | 'Flooding & Drainage'
  | 'Power & Electricity (Dumsor)'
  | 'Water Supply & Quality'
  | 'Sanitation & Waste'
  | 'Public Safety & Security'
  | 'Emergency & Disaster'
  | 'Health & Hospitals'
  | 'Environment & Galamsey'
  | 'Human Rights & Corruption'
  | 'Cybercrime & Online Fraud'
  | 'Education & Schools'
  | 'Consumer Rights & Transport'
  | 'Other Community Concern';

export type GhanaRegionName =
  | 'Greater Accra'
  | 'Ashanti'
  | 'Northern'
  | 'Western'
  | 'Central'
  | 'Eastern'
  | 'Volta'
  | 'Upper East'
  | 'Upper West'
  | 'Bono'
  | 'Bono East'
  | 'Ahafo'
  | 'Oti'
  | 'Savannah'
  | 'North East'
  | 'Western North';

export type AuthorVisibility = 'public' | 'pseudonymous' | 'anonymous' | 'confidential';

export type UrgencyLevel = 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW';
export type SeverityLevel = 'EMERGENCY' | 'SEVERE' | 'MODERATE' | 'INFORMATIONAL';
export type ModerationStatus = 'approved' | 'under_review' | 'restricted' | 'hidden';

export interface PostMedia {
  id: string;
  type: 'image' | 'video' | 'audio' | 'document';
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  duration?: number;
  waveform?: number[];
  blurred?: boolean;
  uploadedAt: string;
  mimeType?: string;
  sizeBytes?: number;
  fileName?: string;
  isSystemThumbnail?: boolean;
}

export interface PostLocation {
  region: GhanaRegionName;
  district: string;
  landmark?: string;
  latitude: number;
  longitude: number;
  lat?: number;
  lng?: number;
  accuracy?: 'exact' | 'approximate' | 'district_only' | 'hidden';
  visibility: 'exact' | 'approximate' | 'hidden';
}

export interface PostInstitutionTag {
  institutionId: string;
  institutionName: string;
  shortName: string;
  acronym: string;
  alertRequested: boolean;
  alertStatus: 'NOT_ATTEMPTED' | 'QUEUED' | 'SENT' | 'DELIVERED' | 'ACKNOWLEDGED' | 'NO_DIRECT_CHANNEL';
  alertMethodUsed?: string;
  deliveryTimestamp?: string;
}

export interface ResponseTimelineStep {
  step: string;
  status: 'completed' | 'in_progress' | 'scheduled';
  timestamp?: string;
  description?: string;
}

export interface ResponseDocument {
  title: string;
  url: string;
  fileType: string;
  size?: string;
}

export interface ResponseComment {
  id: string;
  responseId: string;
  postId?: string;
  userId: string;
  userName: string;
  userHandle: string;
  userAvatar?: string;
  isVerified?: boolean;
  content: string;
  createdAt: string;
  likesCount: number;
  userLiked?: boolean;
}

export interface InstitutionResponse {
  id: string;
  postId: string;
  institutionId: string;
  institutionName: string;
  institutionLogo?: string;
  responseType:
    | 'WE_ARE_AWARE'
    | 'INVESTIGATING'
    | 'ACTION_TAKEN'
    | 'PUBLIC_GUIDANCE'
    | 'OUTSIDE_MANDATE'
    | 'CONTACT_DIRECTLY';
  message: string;
  statementTitle?: string;
  fullStatement?: string;
  referenceNumber?: string;
  actionTimeline?: ResponseTimelineStep[];
  resolutionStatus?: 'IN_PROGRESS' | 'RESOLVED' | 'UNDER_REVIEW' | 'MONITORING' | 'REFERRED';
  status?: string;
  documents?: ResponseDocument[];
  hotlines?: string[];
  helpfulCount?: number;
  unhelpfulCount?: number;
  userHelpfulVote?: 'helpful' | 'unhelpful';
  commentsCount?: number;
  commentsList?: ResponseComment[];
  official: boolean;
  verified: boolean;
  responderName: string;
  responderTitle: string;
  redirectedToInstitutionId?: string;
  redirectedToInstitutionName?: string;
  createdAt: string;
}

export interface CommunityEvidence {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userHandle: string;
  userAvatar?: string;
  isVerified?: boolean;
  title?: string;
  text: string;
  media?: PostMedia[];
  statusUpdate: 'still_ongoing' | 'worsened' | 'improving' | 'resolved';
  likesCount?: number;
  userLiked?: boolean;
  commentsCount?: number;
  commentsList?: PostComment[];
  location?: { landmark?: string; district?: string; region?: string };
  createdAt: string;
}

export interface PostConfirmation {
  id: string;
  postId: string;
  userId: string;
  userDisplayName: string;
  confirmationType: 'seeing_too' | 'experienced_too' | 'resolved' | 'changed';
  note?: string;
  district?: string;
  createdAt: string;
}

export interface PostComment {
  id: string;
  postId: string;
  parentCommentId?: string;
  evidenceId?: string;
  evidenceAuthorName?: string;
  evidenceTextPreview?: string;
  userId: string;
  userName: string;
  userHandle: string;
  userAvatar?: string;
  isVerified?: boolean;
  content: string;
  createdAt: string;
  likesCount: number;
  tags?: string[];
  userLiked?: boolean;
}

export interface CivicPost {
  id: string;
  title: string;
  content: string;
  originalLanguage: 'English' | 'Twi' | 'Ga' | 'Ewe' | 'Dagbani' | 'Hausa' | string;
  translatedText?: string;
  authorId: string;
  authorName: string;
  authorHandle: string;
  authorAvatar?: string;
  authorVisibility: AuthorVisibility;
  isVerifiedCitizen?: boolean;
  followersCount: number; // Notice: 0 followers posts get equal discovery reach!
  media: PostMedia[];
  category: CivicCategory;
  subcategory?: string;
  location: PostLocation;
  institutionTags: PostInstitutionTag[];
  suggestedInstitutions: string[];
  urgency: UrgencyLevel;
  severity: SeverityLevel;
  hashtags: string[];
  issueClusterId?: string;
  issueClusterTitle?: string;
  visibility: 'public' | 'local_community' | 'followers' | 'institution_only';
  moderationStatus: ModerationStatus;
  credibilitySignals: {
    confirmationsCount: number;
    evidenceCount: number;
    hasMedia: boolean;
    hasLocation: boolean;
    institutionalAwarenessScore: number; // 0-100
  };
  engagement: {
    views: number;
    reposts: number;
    shares: number;
    confirmations: number;
    comments: number;
    followersCount?: number;
    amplifies?: number;
  };
  confirmationsCount?: number;
  sharesCount?: number;
  repostsCount?: number;
  commentsCount?: number;
  userFollowed?: boolean;
  userConfirmed?: boolean;
  userBookmarked?: boolean;
  userReposted?: boolean;
  officialResponses: InstitutionResponse[];
  communityEvidence: CommunityEvidence[];
  commentsList?: PostComment[];
  reportLifecycleStatus?: string;
  accountabilityStatus?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Institution {
  id: string;
  officialName: string;
  shortName: string;
  acronym: string;
  verified?: boolean;
  logo?: string;
  mandate: string;
  category?: string;
  categories: CivicCategory[];
  geographicScope?: 'National' | 'Regional' | 'District';
  website?: string;
  jurisdiction?: string;
  officialWebsite?: string;
  officialContacts?: any[];
  officialSocialAccounts?: any[];
  emergencyChannels?: string[];
  emergencyHotline?: string;
  whatsappDesk?: string;
  whatsappNumber?: string;
  tollFree?: string;
  officialEmail?: string;
  emailChannels?: string[];
  phoneChannels?: string[];
  whatsappChannels?: string[];
  socialChannels?: { platform: 'X' | 'Facebook' | 'Instagram' | 'LinkedIn'; handle: string; url: string; verified: boolean }[];
  reportingChannels?: { name: string; url: string; description: string; supportsMultimedia: boolean }[];
  alertMethod: 'DIRECT_API' | 'OFFICIAL_EMAIL' | 'PORTAL_DEEP_LINK' | 'WHATSAPP_LINE' | 'NO_DIRECT_CHANNEL';
  activeMentionsCount?: number;
  unansweredMentionsCount?: number;
  officialResponsesCount?: number;
  avgResponseTimeHours?: number;
  verificationStatus?: string;
  sourceDocuments?: any[];
  verificationDate?: string;
  nextReviewDate?: string;
  verifiedBy?: string;
  lastVerifiedAt?: string;
  description?: string;
}

export interface IssueCluster {
  id: string;
  title: string;
  category: CivicCategory;
  region: GhanaRegionName;
  district: string;
  locationSummary?: string;
  postIds: string[];
  memberPostIds?: string[];
  primaryPostId?: string;
  postsCount?: number;
  postCount?: number;
  confirmationCount?: number;
  totalConfirmations?: number;
  evidenceCount?: number;
  firstSeenAt?: string;
  latestSeenAt?: string;
  firstReportedAt?: string;
  lastUpdatedAt?: string;
  trendScore?: number;
  publicInterestScore?: number;
  taggedInstitutionIds?: string[];
  primaryInstitutions?: string[];
  status: 'EMERGING' | 'TRENDING' | 'UNDER_ATTENTION' | 'RESOLVED_BY_COMMUNITY' | string;
  summary: string;
  primaryImage?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  handle: string;
  avatar?: string;
  region: GhanaRegionName;
  district: string;
  role: 'citizen' | 'institution_rep' | 'journalist' | 'moderator' | 'admin';
  institutionId?: string;
  civicContributions: {
    postsCount: number;
    confirmationsCount: number;
    evidenceUpdatesCount: number;
    verifiedImpactsCount: number;
  };
  followedTopics: string[];
  followedRegions: GhanaRegionName[];
  followedInstitutions: string[];
  joinedDate: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: 'INSTITUTION_RESPONSE' | 'ISSUE_TRENDING' | 'CONFIRMATION_SPIKE' | 'EMERGENCY_ALERT' | 'EVIDENCE_ADDED' | 'REPOST';
  title: string;
  message: string;
  postId?: string;
  clusterId?: string;
  institutionName?: string;
  read: boolean;
  createdAt: string;
}

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
  primaryMediaType?: PrimaryMediaType;
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
  primaryMediaType?: PrimaryMediaType;
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
  cleanMediaAssets?: CleanMediaAsset[];
  videoProduction?: VideoProductionKit;
  audioProduction?: AudioProductionKit;
  threadAndCarousel?: ThreadAndCarouselKit;
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

export interface NationalAnalytics {
  totalActivePosts: number;
  totalIndependentConfirmations: number;
  totalInstitutionsAlerted: number;
  totalOfficialResponses: number;
  rapidlyEmergingIssuesCount: number;
  regionalStats: {
    region: GhanaRegionName;
    activeIssues: number;
    confirmations: number;
    topCategory: CivicCategory;
    velocity: 'RISING_FAST' | 'MODERATE' | 'STABLE';
    lat: number;
    lng: number;
  }[];
  topCategories: {
    category: CivicCategory;
    count: number;
    percentage: number;
  }[];
  institutionResponseRates: {
    institutionName: string;
    acronym: string;
    mentions: number;
    responses: number;
    rate: number;
    avgResponseHours: number;
  }[];
  // Optional convenience aliases
  totalPosts?: number;
  totalConfirmations?: number;
  responseRate?: number;
  averageResponseTimeHours?: number;
  categoryBreakdown?: { category: CivicCategory; count: number }[];
  regionalBreakdown?: {
    region: GhanaRegionName;
    postCount: number;
    resolvedCount: number;
    responseRate: number;
  }[];
}

// Institutional Monolith Domain Types
export interface CivicSituation {
  id: string;
  title: string;
  summary: string;
  category: string;
  region: string;
  district: string;
  locationSummary?: string;
  severity: string;
  urgency: string;
  status: 'REPORTED' | 'VERIFYING' | 'ACTIVE_MONITORING' | 'OFFICIAL_RESPONSE_ISSUED' | 'INTERVENTION_IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priorityScore: number;
  priorityBand: 'LOW' | 'MODERATE' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
  priorityFactors?: Record<string, any>;
  firstReportedAt: string;
  latestActivityAt: string;
  reportCount: number;
  confirmationCount: number;
  evidenceCount: number;
  amplificationCount: number;
  primaryInstitutionId?: string;
  createdAt: string;
  updatedAt: string;
  reports?: any[];
  events?: any[];
  announcements?: any[];
  officialResponses?: any[];
}

export type InboxItemType = 'REPORT' | 'MENTION' | 'FOLLOW_UP' | 'EVIDENCE' | 'RESPONSE' | 'ANNOUNCEMENT' | 'ESCALATION';
export type InboxActionState =
  | 'NEW'
  | 'SEEN'
  | 'ACKNOWLEDGED'
  | 'UNDER_REVIEW'
  | 'RESPONSE_PREPARED'
  | 'PUBLIC_RESPONSE'
  | 'ACTION_REPORTED'
  | 'RESOLVED'
  | 'CITIZEN_FOLLOW_UP';

export interface InstitutionalInboxItem {
  id: string;
  institutionId: string;
  itemType: InboxItemType;
  itemPriority: 'ROUTINE' | 'ELEVATED' | 'URGENT' | 'EMERGENCY';
  priorityScore: number;
  postId?: string;
  situationId?: string;
  evidenceId?: string;
  responseId?: string;
  announcementId?: string;
  title: string;
  summary: string;
  region?: string;
  district?: string;
  signalSummary?: Record<string, any>;
  assignedDeskId?: string;
  assignedDeskName?: string;
  assignedOfficerId?: string;
  assignedOfficerName?: string;
  actionState: InboxActionState;
  isRead: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type AnnouncementType =
  | 'PRESS_RELEASE'
  | 'PUBLIC_ADVISORY'
  | 'SERVICE_DISRUPTION'
  | 'SCHEDULED_MAINTENANCE'
  | 'POLICY_UPDATE'
  | 'FACT_CHECK_CLARIFICATION'
  | 'SITUATION_BRIEF'
  | 'EMERGENCY_ALERT';

export interface InstitutionalAnnouncement {
  id: string;
  institutionId: string;
  institutionName?: string;
  institutionLogo?: string;
  authorId: string;
  authorName: string;
  authorTitle: string;
  title: string;
  body: string;
  summary?: string;
  announcementType: AnnouncementType;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'PUBLISHED' | 'EXPIRED' | 'RETRACTED';
  geographicScope: 'NATIONAL' | 'REGIONAL' | 'DISTRICT' | 'CORRIDOR';
  region?: string;
  district?: string;
  topic?: string;
  category?: string;
  media?: { type: string; url: string; caption?: string }[];
  officialLinks?: { label: string; url: string }[];
  relatedSituationIds?: string[];
  viewCount: number;
  shareCount: number;
  publishedAt?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InstitutionalDesk {
  id: string;
  institutionId: string;
  name: string;
  code: string;
  level: 'NATIONAL' | 'REGIONAL' | 'DISTRICT' | 'SPECIALIST';
  region?: string;
  district?: string;
  specialization?: string;
  contactEmail?: string;
  contactPhone?: string;
  leadOfficerName?: string;
}

export interface InstitutionTeamMember {
  id: string;
  institutionId: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'COMMUNICATIONS_OFFICER' | 'DUTY_INSPECTOR' | 'ANALYST' | 'VIEWER';
  title?: string;
  deskId?: string;
  deskName?: string;
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED';
}
