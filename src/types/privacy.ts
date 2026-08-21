export type PrivacyStatus =
  | 'PRIVACY_PROCESSING'
  | 'PRIVACY_READY'
  | 'PRIVACY_REVIEW_REQUIRED'
  | 'PRIVACY_FAILED'
  | 'AI_UNAVAILABLE';

export type FindingType =
  | 'PERSON_NAME'
  | 'PHONE_NUMBER'
  | 'EMAIL'
  | 'ADDRESS'
  | 'GOVERNMENT_ID' // e.g. Ghana Card
  | 'BANK_ACCOUNT'
  | 'CRIMINAL_ALLEGATION'
  | 'PRIVATE_LOCATION'
  | 'FACE'
  | 'LICENSE_PLATE'
  | 'SIGNATURE'
  | 'CUSTOM_GHANA_PII';

export type PolicyAction = 'REDACT' | 'MASK' | 'ALLOW' | 'BLOCK' | 'OVERRIDE';

export type AudienceType = 'PUBLIC' | 'INSTITUTION' | 'MODERATOR' | 'AI_SAFE' | 'SOCIAL';

export interface CanonicalSubmission {
  id: string;
  authorId: string;
  postType: string;
  claimType: string;
  createdAt: string;
  updatedAt: string;
  visibility: string;
  status: string;
  privacyStatus: PrivacyStatus;
  moderationStatus: string;
  verificationStatus: string;
}

export interface SubmissionSource {
  id: string;
  submissionId: string;
  sourceType: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT';
  storageObjectId: string;
  mimeType?: string;
  size?: number;
  sha256?: string;
  contentText?: string;
  createdAt: string;
}

export interface SubmissionPublicProjection {
  id: string;
  submissionId: string;
  version: number;
  title: string;
  text: string;
  mediaReferences: string[]; // JSON array of redacted media URLs
  caption?: string;
  summary?: string;
  createdAt: string;
  generatedBy: string;
  policyVersion: string;
  redactionVersion: string;
  status: PrivacyStatus;
}

export interface SubmissionProtectedEvidence {
  id: string;
  submissionId: string;
  sourceId: string;
  storageObjectId: string;
  accessPolicy: string;
  classification: string;
  retentionPolicy: string;
  createdAt: string;
}

export interface PrivacyFinding {
  id: string;
  submissionId: string;
  sourceId?: string;
  type: FindingType;
  confidence: number;
  severity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  startOffset?: number;
  endOffset?: number;
  boundingBox?: { x: number; y: number; width: number; height: number };
  detector: string;
  detectorVersion: string;
  policyAction: PolicyAction;
  createdAt: string;
}

export interface PrivacyPolicy {
  id: string;
  policyName: string;
  version: string;
  jurisdiction: string;
  contentType: string;
  findingType: FindingType;
  audience: AudienceType;
  action: PolicyAction;
  enabled: boolean;
}

export interface RepresentationVersion {
  id: string;
  submissionId: string;
  representationType: AudienceType;
  version: number;
  sourceHash: string;
  policyVersion: string;
  detectorVersion: string;
  createdAt: string;
  status: string;
}

export interface EvidenceAccessLog {
  id: string;
  submissionId: string;
  actorId: string;
  institutionId?: string;
  action: 'VIEW_ORIGINAL' | 'DOWNLOAD_ORIGINAL' | 'VIEW_LOCATION' | 'VIEW_IDENTITY' | 'VIEW_MEDIA' | 'EXPORT_EVIDENCE';
  timestamp: string;
  ip?: string;
  reason?: string;
  result: 'ALLOWED' | 'DENIED' | 'FLAGGED';
}
