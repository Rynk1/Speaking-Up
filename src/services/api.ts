import {
  CivicPost,
  Institution,
  IssueCluster,
  NationalAnalytics,
  NotificationItem,
  CommunityEvidence,
  PostComment,
  InstitutionResponse,
  SocialPlatform,
  CreatorContext,
  SocialSharePackage,
  CreatorPack,
  CreatorProfile,
  ShareAnalyticsSummary
} from '../types';

const TOKEN_KEY = 'speakup_jwt_token';

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  // Auth Token helpers
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },
  setToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
  },
  clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  },

  // Auth endpoints
  async login(identifier: string, password: string): Promise<{ token: string; user: any }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Login failed');
    }
    const data = await res.json();
    this.setToken(data.token);
    return data;
  },

  async checkDuplicate(params: { email?: string; phone?: string }): Promise<{ exists: boolean; conflictType?: string; authProvider?: string; suggestedAction?: string; message: string }> {
    const res = await fetch('/api/auth/check-duplicate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!res.ok) {
      return { exists: false, message: 'Available' };
    }
    return res.json();
  },

  async register(data: { email: string; password: string; name: string; handle?: string; phone?: string }): Promise<{ token: string; user: any }> {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Registration failed');
    }
    const result = await res.json();
    this.setToken(result.token);
    return result;
  },

  async googleAuth(payload: { email: string; name: string; avatar?: string; googleId?: string; credential?: string }): Promise<{ token: string; user: any }> {
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Google authentication failed');
    }
    const data = await res.json();
    this.setToken(data.token);
    return data;
  },

  async sendPhoneOtp(phone: string): Promise<{ success: boolean; message: string; phone: string; isExistingUser: boolean; demoOtp?: string }> {
    const res = await fetch('/api/auth/phone/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to send mobile verification code');
    }
    return res.json();
  },

  async verifyPhoneOtp(phone: string, otpCode: string, name?: string): Promise<{ token: string; user: any }> {
    const res = await fetch('/api/auth/phone/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otpCode, name })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Invalid mobile verification code');
    }
    const data = await res.json();
    this.setToken(data.token);
    return data;
  },

  async logout(): Promise<void> {
    this.clearToken();
  },

  async getCurrentUser(): Promise<any> {
    const res = await fetch('/api/auth/me', {
      headers: getAuthHeaders()
    });
    if (!res.ok) return null;
    return res.json();
  },

  // Media File Upload
  async uploadMedia(file: File): Promise<{ id: string; url: string; type: string; mimeType: string; sizeBytes: number }> {
    const formData = new FormData();
    formData.append('file', file);
    const token = this.getToken();

    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/media/upload', {
      method: 'POST',
      headers,
      body: formData
    });
    if (!res.ok) throw new Error('Failed to upload media file');
    return res.json();
  },

  // Draft persistence (Low Bandwidth)
  async saveDraft(draftData: any): Promise<{ success: boolean; draftId: string }> {
    const res = await fetch('/api/drafts', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(draftData)
    });
    if (!res.ok) throw new Error('Failed to save draft');
    return res.json();
  },

  async getDraft(): Promise<any> {
    const res = await fetch('/api/drafts', {
      headers: getAuthHeaders()
    });
    if (!res.ok) return null;
    return res.json();
  },

  // Posts
  async getPosts(params?: {
    tab?: string;
    category?: string;
    region?: string;
    district?: string;
    search?: string;
    urgency?: string;
    clusterId?: string;
    institutionId?: string;
  }): Promise<CivicPost[]> {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          query.append(key, String(val));
        }
      });
    }
    const res = await fetch(`/api/posts?${query.toString()}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch posts');
    return res.json();
  },

  async getPostById(id: string): Promise<CivicPost> {
    const res = await fetch(`/api/posts/${id}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch post');
    return res.json();
  },

  async createPost(data: Partial<CivicPost>): Promise<CivicPost> {
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create post');
    return res.json();
  },

  async toggleConfirmation(postId: string): Promise<{ success: boolean; confirmed: boolean; confirmationsCount: number }> {
    const res = await fetch(`/api/posts/${postId}/confirm`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to toggle confirmation');
    return res.json();
  },

  async toggleFollowIssue(postId: string): Promise<{ success: boolean; followed: boolean; followersCount: number }> {
    const res = await fetch(`/api/posts/${postId}/follow`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to toggle follow issue');
    return res.json();
  },

  async addEvidence(postId: string, evidenceData: Partial<CommunityEvidence>): Promise<CommunityEvidence> {
    const res = await fetch(`/api/posts/${postId}/evidence`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(evidenceData)
    });
    if (!res.ok) throw new Error('Failed to add evidence');
    return res.json();
  },

  async toggleRepost(postId: string): Promise<{ reposted: boolean; repostsCount: number; followersCount?: number }> {
    const res = await fetch(`/api/posts/${postId}/repost`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to toggle repost');
    return res.json();
  },

  async sharePost(postId: string): Promise<{ success: boolean; sharesCount: number; followersCount: number }> {
    const res = await fetch(`/api/posts/${postId}/share`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to record post share');
    return res.json();
  },

  async toggleBookmark(postId: string): Promise<{ bookmarked: boolean }> {
    const res = await fetch(`/api/posts/${postId}/bookmark`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to toggle bookmark');
    return res.json();
  },

  async addComment(postId: string, commentData: { content: string; parentCommentId?: string; userName?: string; userHandle?: string; tags?: string[] }): Promise<PostComment> {
    const res = await fetch(`/api/posts/${postId}/comments`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(commentData)
    });
    if (!res.ok) throw new Error('Failed to add comment');
    return res.json();
  },

  async likeComment(commentId: string): Promise<{ success: boolean; likesCount: number; userLiked: boolean }> {
    const res = await fetch(`/api/comments/${commentId}/like`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to like comment');
    return res.json();
  },

  async triggerAlert(postId: string, institutionId: string): Promise<{ success: boolean; tag: any }> {
    const res = await fetch(`/api/posts/${postId}/alert`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ institutionId })
    });
    if (!res.ok) throw new Error('Failed to dispatch alert');
    return res.json();
  },

  async submitInstitutionResponse(postId: string, responseData: Partial<InstitutionResponse>): Promise<InstitutionResponse> {
    const res = await fetch(`/api/posts/${postId}/response`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(responseData)
    });
    if (!res.ok) throw new Error('Failed to submit response');
    return res.json();
  },

  async updateInstitutionResponse(responseId: string, responseData: Partial<InstitutionResponse>): Promise<{ success: boolean; responseId: string }> {
    const res = await fetch(`/api/responses/${responseId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(responseData)
    });
    if (!res.ok) throw new Error('Failed to update response statement');
    return res.json();
  },

  async updatePostStatus(postId: string, status: string): Promise<{ success: boolean; status: string }> {
    const res = await fetch(`/api/posts/${postId}/status`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error('Failed to update issue status');
    return res.json();
  },

  async assignPost(postId: string, data: { institutionId: string; assignedDepartment?: string; assignedOfficer?: string; notes?: string }): Promise<{ success: boolean; assignId: string }> {
    const res = await fetch(`/api/posts/${postId}/assign`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to assign post');
    return res.json();
  },

  async requestClarification(postId: string, data: { institutionId: string; question: string }): Promise<{ success: boolean; clarifyId: string }> {
    const res = await fetch(`/api/posts/${postId}/clarify`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to request clarification');
    return res.json();
  },

  // Institutions
  async getInstitutions(category?: string, search?: string): Promise<Institution[]> {
    const query = new URLSearchParams();
    if (category) query.append('category', category);
    if (search) query.append('search', search);
    const res = await fetch(`/api/institutions?${query.toString()}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch institutions');
    return res.json();
  },

  async getInstitutionById(id: string): Promise<{ institution: Institution; taggedPosts: CivicPost[] }> {
    const res = await fetch(`/api/institutions/${id}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch institution');
    return res.json();
  },

  // Clusters
  async getClusters(): Promise<IssueCluster[]> {
    const res = await fetch('/api/clusters', {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch clusters');
    return res.json();
  },

  async getClusterById(id: string): Promise<{ cluster: IssueCluster; posts: CivicPost[] }> {
    const res = await fetch(`/api/clusters/${id}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch cluster');
    return res.json();
  },

  // Analytics
  async getAnalytics(): Promise<NationalAnalytics> {
    const res = await fetch('/api/analytics', {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch analytics');
    return res.json();
  },

  // Notifications
  async getNotifications(): Promise<NotificationItem[]> {
    try {
      const res = await fetch('/api/notifications', {
        headers: getAuthHeaders()
      });
      if (!res.ok) return [];
      return await res.json();
    } catch (err) {
      console.warn('Unable to fetch notifications:', err);
      return [];
    }
  },

  async markNotificationRead(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/notifications/${id}/read`, {
      method: 'PUT',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to mark read');
    return res.json();
  },

  // Abuse Report
  async reportAbuse(postId: string, reason: string, details?: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/reports/abuse', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ postId, reason, details })
    });
    if (!res.ok) throw new Error('Failed to submit abuse report');
    return res.json();
  },

  // Official Responses & Communiqués
  async getResponseById(id: string): Promise<{ response: InstitutionResponse; originalPost: CivicPost | null; relatedResponses: InstitutionResponse[] }> {
    const res = await fetch(`/api/responses/${id}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch response statement');
    return res.json();
  },

  async addResponseComment(responseId: string, content: string, authorInfo?: { userName?: string; userHandle?: string }): Promise<any> {
    const res = await fetch(`/api/responses/${responseId}/comments`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ content, ...authorInfo })
    });
    if (!res.ok) throw new Error('Failed to submit comment on statement');
    return res.json();
  },

  async voteResponseHelpful(responseId: string, voteType: 'helpful' | 'unhelpful', userId?: string): Promise<{ helpfulCount: number; unhelpfulCount: number; userVote: string | null }> {
    const res = await fetch(`/api/responses/${responseId}/vote`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ voteType, userId })
    });
    if (!res.ok) throw new Error('Failed to vote on response');
    return res.json();
  },

  async likeResponseComment(commentId: string): Promise<{ success: boolean; likesCount: number }> {
    const res = await fetch(`/api/responses/comments/${commentId}/like`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to like statement reply');
    return res.json();
  },

  // Social Distribution & Creator Engine (SSDE)
  async prepareSocialPackage(params: {
    postId: string;
    responseId?: string;
    platform: SocialPlatform;
    creatorContext?: CreatorContext;
    creatorId?: string;
  }): Promise<SocialSharePackage> {
    const res = await fetch('/api/social/prepare', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(params)
    });
    if (!res.ok) throw new Error('Failed to prepare social package');
    return res.json();
  },

  async generateCreatorPack(params: {
    postId: string;
    responseId?: string;
    creatorId?: string;
    creatorContext?: CreatorContext;
  }): Promise<CreatorPack> {
    const res = await fetch('/api/social/creator-pack', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(params)
    });
    if (!res.ok) throw new Error('Failed to generate creator pack');
    return res.json();
  },

  async recordSocialShare(params: {
    postId: string;
    responseId?: string;
    creatorId?: string;
    platform: SocialPlatform;
    contentType?: string;
    shareMethod?: string;
    referralCode?: string;
  }): Promise<{ success: boolean }> {
    const res = await fetch('/api/social/events/share', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(params)
    });
    if (!res.ok) throw new Error('Failed to record social share');
    return res.json();
  },

  async getSocialAnalytics(postId: string): Promise<ShareAnalyticsSummary> {
    const res = await fetch(`/api/social/analytics/${postId}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch social analytics');
    return res.json();
  },

  async getMyCreatorProfile(): Promise<CreatorProfile | null> {
    const res = await fetch('/api/social/creators/me', {
      headers: getAuthHeaders()
    });
    if (!res.ok) return null;
    return res.json();
  },

  async registerCreatorProfile(data: {
    creatorName: string;
    handle: string;
    primaryPlatform?: string;
    platformLinks?: Record<string, string>;
  }): Promise<CreatorProfile> {
    const res = await fetch('/api/social/creators', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to register creator profile');
    return res.json();
  },

  // AI Services
  async analyzePost(text: string, userLocation?: any): Promise<any> {
    const res = await fetch('/api/ai/analyze-post', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ text, userLocation })
    });
    if (!res.ok) throw new Error('Failed to analyze post');
    return res.json();
  },

  async generateShareCopy(payload: {
    postTitle: string;
    category?: string;
    location: string;
    confirmationsCount?: number;
    institutionsTagged?: string;
    institutionName?: string;
    statementTitle?: string;
    message?: string;
    referenceNumber?: string;
    responseType?: string;
  }): Promise<{ whatsappCopy: string; twitterCopy: string; smsCopy?: string }> {
    const res = await fetch('/api/ai/generate-share-copy', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to generate share copy');
    return res.json();
  },

  // Admin & Moderation Services
  async getAdminOverview(): Promise<any> {
    const res = await fetch('/api/admin/overview', {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch admin overview');
    return res.json();
  },

  async getAdminUsers(params?: { search?: string; role?: string; isVerified?: string }): Promise<any[]> {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') query.append(k, String(v));
      });
    }
    const res = await fetch(`/api/admin/users?${query.toString()}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch admin users');
    return res.json();
  },

  async updateUserRole(userId: string, role: string): Promise<any> {
    const res = await fetch(`/api/admin/users/${userId}/role`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ role })
    });
    if (!res.ok) throw new Error('Failed to update user role');
    return res.json();
  },

  async updateUserVerification(userId: string, isVerified: boolean): Promise<any> {
    const res = await fetch(`/api/admin/users/${userId}/verify`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ isVerified })
    });
    if (!res.ok) throw new Error('Failed to update user verification');
    return res.json();
  },

  async getAdminPosts(params?: { moderationStatus?: string; category?: string; search?: string }): Promise<any[]> {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') query.append(k, String(v));
      });
    }
    const res = await fetch(`/api/admin/posts?${query.toString()}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch admin posts');
    return res.json();
  },

  async updatePostModeration(postId: string, data: { moderationStatus?: string; reportLifecycleStatus?: string }): Promise<any> {
    const res = await fetch(`/api/admin/posts/${postId}/moderation`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update post moderation');
    return res.json();
  },

  async getAdminAbuseReports(status?: string): Promise<any[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    const res = await fetch(`/api/admin/abuse-reports${query}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch abuse reports');
    return res.json();
  },

  async updateAbuseReport(reportId: string, status: string): Promise<any> {
    const res = await fetch(`/api/admin/abuse-reports/${reportId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error('Failed to update abuse report');
    return res.json();
  },

  async manageInstitution(data: any): Promise<any> {
    const res = await fetch('/api/admin/institutions', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to manage institution');
    return res.json();
  },

  async getAdminJobs(status?: string): Promise<any[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    const res = await fetch(`/api/admin/jobs${query}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch admin jobs');
    return res.json();
  },

  async retryAdminJob(jobId: string): Promise<any> {
    const res = await fetch(`/api/admin/jobs/${jobId}/retry`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to retry background job');
    return res.json();
  },

  async getAdminAuditLogs(): Promise<any[]> {
    const res = await fetch('/api/admin/audit-logs', {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch audit logs');
    return res.json();
  }
};
