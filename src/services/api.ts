import {
  CivicPost,
  Institution,
  IssueCluster,
  NationalAnalytics,
  NotificationItem,
  CommunityEvidence,
  PostComment,
  InstitutionResponse
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
  async login(email: string, password: string): Promise<{ token: string; user: any }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Login failed');
    }
    const data = await res.json();
    this.setToken(data.token);
    return data;
  },

  async register(data: { email: string; password: string; name: string; handle?: string; role?: string; phone?: string; institutionId?: string }): Promise<{ token: string; user: any }> {
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

  async toggleRepost(postId: string): Promise<{ reposted: boolean; repostsCount: number }> {
    const res = await fetch(`/api/posts/${postId}/repost`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to toggle repost');
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

  async addComment(postId: string, commentData: { content: string; userName?: string; userHandle?: string }): Promise<PostComment> {
    const res = await fetch(`/api/posts/${postId}/comments`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(commentData)
    });
    if (!res.ok) throw new Error('Failed to add comment');
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
    const res = await fetch('/api/notifications', {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch notifications');
    return res.json();
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
    category: string;
    location: string;
    confirmationsCount: number;
    institutionsTagged: string;
  }): Promise<{ whatsappCopy: string; twitterCopy: string; smsCopy?: string }> {
    const res = await fetch('/api/ai/generate-share-copy', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to generate share copy');
    return res.json();
  }
};
