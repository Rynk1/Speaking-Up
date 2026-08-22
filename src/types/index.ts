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
  type: 'image' | 'video' | 'audio';
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
}

export interface PostLocation {
  region: GhanaRegionName;
  district: string;
  landmark?: string;
  latitude: number;
  longitude: number;
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
  actionTimeline?: ResponseTimelineStep[] | string;
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
  text: string;
  media?: PostMedia[];
  statusUpdate: 'still_ongoing' | 'worsened' | 'improving' | 'resolved';
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
