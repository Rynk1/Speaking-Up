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

export const api = {
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
    const res = await fetch(`/api/posts?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch posts');
    return res.json();
  },

  async getPostById(id: string): Promise<CivicPost> {
    const res = await fetch(`/api/posts/${id}`);
    if (!res.ok) throw new Error('Failed to fetch post');
    return res.json();
  },

  async createPost(data: Partial<CivicPost>): Promise<CivicPost> {
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create post');
    return res.json();
  },

  async toggleConfirmation(postId: string): Promise<{ success: boolean; confirmed: boolean; confirmationsCount: number }> {
    const res = await fetch(`/api/posts/${postId}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error('Failed to toggle confirmation');
    return res.json();
  },

  async addEvidence(postId: string, evidenceData: Partial<CommunityEvidence>): Promise<CommunityEvidence> {
    const res = await fetch(`/api/posts/${postId}/evidence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(evidenceData)
    });
    if (!res.ok) throw new Error('Failed to add evidence');
    return res.json();
  },

  async toggleRepost(postId: string): Promise<{ reposted: boolean; repostsCount: number }> {
    const res = await fetch(`/api/posts/${postId}/repost`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to toggle repost');
    return res.json();
  },

  async toggleBookmark(postId: string): Promise<{ bookmarked: boolean }> {
    const res = await fetch(`/api/posts/${postId}/bookmark`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to toggle bookmark');
    return res.json();
  },

  async addComment(postId: string, commentData: { content: string; userName?: string; userHandle?: string }): Promise<PostComment> {
    const res = await fetch(`/api/posts/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(commentData)
    });
    if (!res.ok) throw new Error('Failed to add comment');
    return res.json();
  },

  async triggerAlert(postId: string, institutionId: string): Promise<{ success: boolean; tag: any }> {
    const res = await fetch(`/api/posts/${postId}/alert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ institutionId })
    });
    if (!res.ok) throw new Error('Failed to dispatch alert');
    return res.json();
  },

  async submitInstitutionResponse(postId: string, responseData: Partial<InstitutionResponse>): Promise<InstitutionResponse> {
    const res = await fetch(`/api/posts/${postId}/response`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    const res = await fetch(`/api/institutions?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch institutions');
    return res.json();
  },

  async getInstitutionById(id: string): Promise<{ institution: Institution; taggedPosts: CivicPost[] }> {
    const res = await fetch(`/api/institutions/${id}`);
    if (!res.ok) throw new Error('Failed to fetch institution');
    return res.json();
  },

  // Clusters
  async getClusters(): Promise<IssueCluster[]> {
    const res = await fetch('/api/clusters');
    if (!res.ok) throw new Error('Failed to fetch clusters');
    return res.json();
  },

  async getClusterById(id: string): Promise<{ cluster: IssueCluster; posts: CivicPost[] }> {
    const res = await fetch(`/api/clusters/${id}`);
    if (!res.ok) throw new Error('Failed to fetch cluster');
    return res.json();
  },

  // Analytics
  async getAnalytics(): Promise<NationalAnalytics> {
    const res = await fetch('/api/analytics');
    if (!res.ok) throw new Error('Failed to fetch analytics');
    return res.json();
  },

  // Notifications
  async getNotifications(): Promise<NotificationItem[]> {
    const res = await fetch('/api/notifications');
    if (!res.ok) throw new Error('Failed to fetch notifications');
    return res.json();
  },

  async markNotificationRead(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/notifications/${id}/read`, { method: 'PUT' });
    if (!res.ok) throw new Error('Failed to mark read');
    return res.json();
  },

  // Abuse Report
  async reportAbuse(postId: string, reason: string, details?: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/reports/abuse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, reason, details })
    });
    if (!res.ok) throw new Error('Failed to submit abuse report');
    return res.json();
  },

  // AI Services
  async analyzePost(text: string, userLocation?: any): Promise<any> {
    const res = await fetch('/api/ai/analyze-post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to generate share copy');
    return res.json();
  }
};
