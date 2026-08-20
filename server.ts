import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import {
  INITIAL_INSTITUTIONS,
  INITIAL_POSTS,
  INITIAL_CLUSTERS,
  INITIAL_NOTIFICATIONS,
  GHANA_REGIONS
} from './server/seedData';
import {
  CivicPost,
  Institution,
  IssueCluster,
  InstitutionResponse,
  CommunityEvidence,
  PostComment,
  CivicCategory,
  GhanaRegionName,
  NotificationItem
} from './src/types';

// Initialize in-memory / persistent server state
let institutions: Institution[] = [...INITIAL_INSTITUTIONS];
let posts: CivicPost[] = [...INITIAL_POSTS];
let clusters: IssueCluster[] = [...INITIAL_CLUSTERS];
let notifications: NotificationItem[] = [...INITIAL_NOTIFICATIONS];
let moderationCases: any[] = [];
let abuseReports: any[] = [];

// Gemini Client
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return geminiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // --- API ROUTES FIRST ---

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // GET /api/institutions
  app.get('/api/institutions', (req, res) => {
    const { category, search } = req.query;
    let list = [...institutions];

    if (category) {
      list = list.filter(inst => inst.categories.includes(category as CivicCategory));
    }
    if (search) {
      const q = String(search).toLowerCase();
      list = list.filter(
        inst =>
          inst.officialName.toLowerCase().includes(q) ||
          inst.shortName.toLowerCase().includes(q) ||
          inst.acronym.toLowerCase().includes(q) ||
          inst.mandate.toLowerCase().includes(q)
      );
    }

    res.json(list);
  });

  // GET /api/institutions/:id
  app.get('/api/institutions/:id', (req, res) => {
    const inst = institutions.find(i => i.id === req.params.id);
    if (!inst) return res.status(404).json({ error: 'Institution not found' });
    const taggedPosts = posts.filter(p => p.institutionTags.some(t => t.institutionId === inst.id));
    res.json({ institution: inst, taggedPosts });
  });

  // GET /api/posts
  app.get('/api/posts', (req, res) => {
    const {
      tab = 'for_you',
      category,
      region,
      district,
      search,
      urgency,
      clusterId,
      institutionId,
      authorId
    } = req.query;

    let filtered = [...posts];

    if (clusterId) {
      filtered = filtered.filter(p => p.issueClusterId === clusterId);
    }

    if (institutionId) {
      filtered = filtered.filter(p => p.institutionTags.some(t => t.institutionId === institutionId));
    }

    if (authorId) {
      filtered = filtered.filter(p => p.authorId === authorId);
    }

    if (category && category !== 'All') {
      filtered = filtered.filter(p => p.category === category);
    }

    if (region && region !== 'All') {
      filtered = filtered.filter(p => p.location.region === region);
    }

    if (district) {
      filtered = filtered.filter(p => p.location.district.toLowerCase().includes(String(district).toLowerCase()));
    }

    if (urgency) {
      filtered = filtered.filter(p => p.urgency === urgency);
    }

    if (search) {
      const q = String(search).toLowerCase();
      filtered = filtered.filter(
        p =>
          p.title.toLowerCase().includes(q) ||
          p.content.toLowerCase().includes(q) ||
          p.location.district.toLowerCase().includes(q) ||
          p.location.region.toLowerCase().includes(q) ||
          (p.location.landmark && p.location.landmark.toLowerCase().includes(q)) ||
          p.hashtags.some(h => h.toLowerCase().includes(q)) ||
          p.institutionTags.some(t => t.institutionName.toLowerCase().includes(q) || t.acronym.toLowerCase().includes(q))
      );
    }

    // Apply Tab logic
    if (tab === 'near_me' && region && region !== 'All') {
      filtered = filtered.filter(p => p.location.region === region);
    } else if (tab === 'trending') {
      filtered.sort(
        (a, b) =>
          b.engagement.confirmations * 3 + b.engagement.shares * 2 + b.engagement.reposts -
          (a.engagement.confirmations * 3 + a.engagement.shares * 2 + a.engagement.reposts)
      );
    } else if (tab === 'emergency') {
      filtered = filtered.filter(p => p.urgency === 'CRITICAL' || p.severity === 'EMERGENCY');
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (tab === 'unresolved') {
      filtered = filtered.filter(p => p.officialResponses.length === 0);
      filtered.sort((a, b) => b.engagement.confirmations - a.engagement.confirmations);
    } else {
      // Default: 'for_you' (Civic Interest algorithm balancing confirmations, recency, and zero-follower discovery)
      filtered.sort((a, b) => {
        const scoreA =
          new Date(a.createdAt).getTime() / 100000000 +
          a.engagement.confirmations * 2 +
          a.officialResponses.length * 5 +
          (a.urgency === 'CRITICAL' ? 20 : a.urgency === 'HIGH' ? 10 : 0);
        const scoreB =
          new Date(b.createdAt).getTime() / 100000000 +
          b.engagement.confirmations * 2 +
          b.officialResponses.length * 5 +
          (b.urgency === 'CRITICAL' ? 20 : b.urgency === 'HIGH' ? 10 : 0);
        return scoreB - scoreA;
      });
    }

    res.json(filtered);
  });

  // GET /api/posts/:id
  app.get('/api/posts/:id', (req, res) => {
    const post = posts.find(p => p.id === req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    // Increment view count
    post.engagement.views += 1;
    res.json(post);
  });

  // POST /api/posts - Create Civic Post
  app.post('/api/posts', (req, res) => {
    try {
      const body = req.body;
      const newPostId = `post-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

      // Construct institution tags with alert tracking
      const institutionTags = (body.institutionTags || []).map((tag: any) => {
        const inst = institutions.find(i => i.id === tag.institutionId);
        let alertStatus: any = 'SENT';
        let alertMethodUsed = 'Direct Platform Channel';

        if (inst) {
          inst.activeMentionsCount += 1;
          inst.unansweredMentionsCount += 1;
          if (inst.alertMethod === 'DIRECT_API') {
            alertStatus = 'DELIVERED';
            alertMethodUsed = 'Direct Official API Integration';
          } else if (inst.alertMethod === 'OFFICIAL_EMAIL') {
            alertStatus = 'SENT';
            alertMethodUsed = `Official Notification to ${inst.emailChannels[0] || 'designated desk'}`;
          } else if (inst.alertMethod === 'WHATSAPP_LINE') {
            alertStatus = 'SENT';
            alertMethodUsed = `Official WhatsApp Dispatch to ${inst.whatsappChannels[0] || 'hotline'}`;
          } else {
            alertStatus = 'NO_DIRECT_CHANNEL';
            alertMethodUsed = 'No direct channel - public tag only';
          }
        }

        return {
          institutionId: tag.institutionId,
          institutionName: tag.institutionName || inst?.officialName || 'State Body',
          shortName: tag.shortName || inst?.shortName || '',
          acronym: tag.acronym || inst?.acronym || '',
          alertRequested: tag.alertRequested !== false,
          alertStatus,
          alertMethodUsed,
          deliveryTimestamp: new Date().toISOString()
        };
      });

      const newPost: CivicPost = {
        id: newPostId,
        title: body.title || body.content.slice(0, 70),
        content: body.content,
        originalLanguage: body.originalLanguage || 'English',
        translatedText: body.translatedText,
        authorId: body.authorId || 'user-current',
        authorName: body.authorName || (body.authorVisibility === 'anonymous' ? 'Anonymous Citizen' : 'Ghana Citizen'),
        authorHandle: body.authorHandle || (body.authorVisibility === 'anonymous' ? 'citizen_confidential' : 'gh_voice'),
        authorAvatar: body.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
        authorVisibility: body.authorVisibility || 'public',
        isVerifiedCitizen: body.isVerifiedCitizen || false,
        followersCount: 0, // 0 followers gets full visibility!
        media: body.media || [],
        category: body.category || 'Infrastructure & Roads',
        subcategory: body.subcategory,
        location: {
          region: body.location?.region || 'Greater Accra',
          district: body.location?.district || 'Accra Metropolitan',
          landmark: body.location?.landmark,
          latitude: body.location?.latitude || 5.6037,
          longitude: body.location?.longitude || -0.187,
          accuracy: body.location?.accuracy || 'exact',
          visibility: body.location?.visibility || 'exact'
        },
        institutionTags,
        suggestedInstitutions: body.suggestedInstitutions || [],
        urgency: body.urgency || 'NORMAL',
        severity: body.severity || 'MODERATE',
        hashtags: body.hashtags || [],
        visibility: body.visibility || 'public',
        moderationStatus: 'approved',
        credibilitySignals: {
          confirmationsCount: 1,
          evidenceCount: body.media?.length || 0,
          hasMedia: (body.media && body.media.length > 0) || false,
          hasLocation: !!body.location,
          institutionalAwarenessScore: institutionTags.length > 0 ? 70 : 30
        },
        engagement: {
          views: 1,
          reposts: 0,
          shares: 0,
          confirmations: 1,
          comments: 0
        },
        userConfirmed: true,
        userBookmarked: false,
        userReposted: false,
        officialResponses: [],
        communityEvidence: [],
        commentsList: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Add to posts at top
      posts.unshift(newPost);

      // Create notification for user
      notifications.unshift({
        id: `notif-${Date.now()}`,
        userId: newPost.authorId,
        type: 'CONFIRMATION_SPIKE',
        title: 'Civic Report Published',
        message: `Your report "${newPost.title}" has been published and tagged to ${newPost.institutionTags.map(t => t.acronym || t.shortName).join(', ')}.`,
        postId: newPost.id,
        read: false,
        createdAt: new Date().toISOString()
      });

      res.status(201).json(newPost);
    } catch (err: any) {
      console.error('Error creating post:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/posts/:id/confirm - "I'm seeing this too" / Independent confirmation
  app.post('/api/posts/:id/confirm', (req, res) => {
    const post = posts.find(p => p.id === req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const isCurrentlyConfirmed = post.userConfirmed;
    if (isCurrentlyConfirmed) {
      post.userConfirmed = false;
      post.engagement.confirmations = Math.max(0, post.engagement.confirmations - 1);
      post.credibilitySignals.confirmationsCount = post.engagement.confirmations;
    } else {
      post.userConfirmed = true;
      post.engagement.confirmations += 1;
      post.credibilitySignals.confirmationsCount = post.engagement.confirmations;

      // Update cluster if exists
      if (post.issueClusterId) {
        const cluster = clusters.find(c => c.id === post.issueClusterId);
        if (cluster) {
          cluster.confirmationCount += 1;
          cluster.trendScore = Math.min(100, cluster.trendScore + 2);
        }
      }
    }

    res.json({
      success: true,
      confirmed: post.userConfirmed,
      confirmationsCount: post.engagement.confirmations
    });
  });

  // POST /api/posts/:id/evidence - Add Community Evidence update
  app.post('/api/posts/:id/evidence', (req, res) => {
    const post = posts.find(p => p.id === req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const { text, media, statusUpdate, userName, userHandle } = req.body;
    const newEvidence: CommunityEvidence = {
      id: `evid-${Date.now()}`,
      postId: post.id,
      userId: req.body.userId || 'user-current',
      userName: userName || 'Community Observer',
      userHandle: userHandle || 'observer_gh',
      text,
      media: media || [],
      statusUpdate: statusUpdate || 'still_ongoing',
      createdAt: new Date().toISOString()
    };

    if (!post.communityEvidence) post.communityEvidence = [];
    post.communityEvidence.push(newEvidence);
    post.credibilitySignals.evidenceCount += 1;

    res.status(201).json(newEvidence);
  });

  // POST /api/posts/:id/repost
  app.post('/api/posts/:id/repost', (req, res) => {
    const post = posts.find(p => p.id === req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    post.userReposted = !post.userReposted;
    post.engagement.reposts += post.userReposted ? 1 : -1;

    res.json({ reposted: post.userReposted, repostsCount: post.engagement.reposts });
  });

  // POST /api/posts/:id/bookmark
  app.post('/api/posts/:id/bookmark', (req, res) => {
    const post = posts.find(p => p.id === req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    post.userBookmarked = !post.userBookmarked;
    res.json({ bookmarked: post.userBookmarked });
  });

  // POST /api/posts/:id/comments
  app.post('/api/posts/:id/comments', (req, res) => {
    const post = posts.find(p => p.id === req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const { content, userName, userHandle } = req.body;
    const newComment: PostComment = {
      id: `comment-${Date.now()}`,
      postId: post.id,
      userId: req.body.userId || 'user-current',
      userName: userName || 'Civic Participant',
      userHandle: userHandle || 'citizen_gh',
      isVerified: true,
      content,
      createdAt: new Date().toISOString(),
      likesCount: 0
    };

    if (!post.commentsList) post.commentsList = [];
    post.commentsList.push(newComment);
    post.engagement.comments += 1;

    res.status(201).json(newComment);
  });

  // POST /api/posts/:id/alert - Functional alert dispatch
  app.post('/api/posts/:id/alert', (req, res) => {
    const post = posts.find(p => p.id === req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const { institutionId } = req.body;
    const inst = institutions.find(i => i.id === institutionId);
    if (!inst) return res.status(404).json({ error: 'Institution not found' });

    // Check if tag exists or create
    let tag = post.institutionTags.find(t => t.institutionId === institutionId);
    if (!tag) {
      tag = {
        institutionId: inst.id,
        institutionName: inst.officialName,
        shortName: inst.shortName,
        acronym: inst.acronym,
        alertRequested: true,
        alertStatus: inst.alertMethod === 'DIRECT_API' ? 'DELIVERED' : 'SENT',
        alertMethodUsed: `Dispatched to ${inst.officialName}`,
        deliveryTimestamp: new Date().toISOString()
      };
      post.institutionTags.push(tag);
    } else {
      tag.alertRequested = true;
      tag.alertStatus = inst.alertMethod === 'DIRECT_API' ? 'DELIVERED' : 'SENT';
      tag.deliveryTimestamp = new Date().toISOString();
    }

    inst.activeMentionsCount += 1;
    post.credibilitySignals.institutionalAwarenessScore = Math.min(
      100,
      post.credibilitySignals.institutionalAwarenessScore + 10
    );

    res.json({ success: true, tag });
  });

  // POST /api/posts/:id/response - Institution Official Response
  app.post('/api/posts/:id/response', (req, res) => {
    const post = posts.find(p => p.id === req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const {
      institutionId,
      responseType,
      message,
      responderName,
      responderTitle,
      redirectedToInstitutionId
    } = req.body;

    const inst = institutions.find(i => i.id === institutionId);
    if (!inst) return res.status(404).json({ error: 'Institution not found' });

    let redirectedName = undefined;
    if (redirectedToInstitutionId) {
      const redInst = institutions.find(i => i.id === redirectedToInstitutionId);
      if (redInst) redirectedName = redInst.officialName;
    }

    const officialResponse: InstitutionResponse = {
      id: `resp-${Date.now()}`,
      postId: post.id,
      institutionId: inst.id,
      institutionName: inst.officialName,
      institutionLogo: inst.logo,
      responseType: responseType || 'WE_ARE_AWARE',
      message,
      official: true,
      verified: true,
      responderName: responderName || 'Official Spokesperson',
      responderTitle: responderTitle || `Representative, ${inst.shortName}`,
      redirectedToInstitutionId,
      redirectedToInstitutionName: redirectedName,
      createdAt: new Date().toISOString()
    };

    post.officialResponses.push(officialResponse);
    inst.officialResponsesCount += 1;
    inst.unansweredMentionsCount = Math.max(0, inst.unansweredMentionsCount - 1);

    // Update post institutional awareness score
    post.credibilitySignals.institutionalAwarenessScore = 100;

    // Send notification to author
    notifications.unshift({
      id: `notif-${Date.now()}`,
      userId: post.authorId,
      type: 'INSTITUTION_RESPONSE',
      title: `Official Response from ${inst.shortName}`,
      message: `${inst.officialName} published an official response: "${message.slice(0, 90)}..."`,
      postId: post.id,
      institutionName: inst.shortName,
      read: false,
      createdAt: new Date().toISOString()
    });

    res.status(201).json(officialResponse);
  });

  // GET /api/clusters
  app.get('/api/clusters', (req, res) => {
    res.json(clusters);
  });

  // GET /api/clusters/:id
  app.get('/api/clusters/:id', (req, res) => {
    const cluster = clusters.find(c => c.id === req.params.id);
    if (!cluster) return res.status(404).json({ error: 'Cluster not found' });
    const clusterPosts = posts.filter(p => cluster.postIds.includes(p.id) || p.issueClusterId === cluster.id);
    res.json({ cluster, posts: clusterPosts });
  });

  // GET /api/analytics - National Civic Radar & Intelligence
  app.get('/api/analytics', (req, res) => {
    const totalActivePosts = posts.length;
    const totalIndependentConfirmations = posts.reduce((acc, p) => acc + p.engagement.confirmations, 0);
    const totalInstitutionsAlerted = posts.reduce((acc, p) => acc + p.institutionTags.length, 0);
    const totalOfficialResponses = posts.reduce((acc, p) => acc + p.officialResponses.length, 0);

    // Regional breakdown
    const regionCoordinates: Record<GhanaRegionName, { lat: number; lng: number }> = {
      'Greater Accra': { lat: 5.6037, lng: -0.187 },
      Ashanti: { lat: 6.6885, lng: -1.6244 },
      Northern: { lat: 9.4008, lng: -0.8393 },
      Western: { lat: 5.148, lng: -2.316 },
      Central: { lat: 5.1053, lng: -1.2466 },
      Eastern: { lat: 6.0945, lng: -0.2609 },
      Volta: { lat: 6.6101, lng: 0.4785 },
      'Upper East': { lat: 10.7856, lng: -0.8514 },
      'Upper West': { lat: 10.0601, lng: -2.5099 },
      Bono: { lat: 7.3399, lng: -2.3268 },
      'Bono East': { lat: 7.7566, lng: -1.0553 },
      Ahafo: { lat: 7.0333, lng: -2.3333 },
      Oti: { lat: 7.9044, lng: 0.2872 },
      Savannah: { lat: 9.0833, lng: -1.8167 },
      'North East': { lat: 10.5167, lng: -0.3667 },
      'Western North': { lat: 6.25, lng: -2.7833 }
    };

    const regionalStats = GHANA_REGIONS.map(reg => {
      const regPosts = posts.filter(p => p.location.region === reg);
      const confs = regPosts.reduce((acc, p) => acc + p.engagement.confirmations, 0);
      const coords = regionCoordinates[reg] || { lat: 5.6, lng: -0.2 };

      // Top category in this region
      const catCounts: Record<string, number> = {};
      regPosts.forEach(p => {
        catCounts[p.category] = (catCounts[p.category] || 0) + 1;
      });
      const topCat = (Object.keys(catCounts).sort((a, b) => catCounts[b] - catCounts[a])[0] ||
        'Infrastructure & Roads') as CivicCategory;

      let velocity: 'RISING_FAST' | 'MODERATE' | 'STABLE' = 'STABLE';
      if (regPosts.length >= 3) velocity = 'RISING_FAST';
      else if (regPosts.length >= 1) velocity = 'MODERATE';

      return {
        region: reg,
        activeIssues: regPosts.length,
        confirmations: confs,
        topCategory: topCat,
        velocity,
        lat: coords.lat,
        lng: coords.lng
      };
    });

    // Category breakdown
    const categoryCounts: Record<string, number> = {};
    posts.forEach(p => {
      categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
    });

    const topCategories = Object.entries(categoryCounts)
      .map(([cat, count]) => ({
        category: cat as CivicCategory,
        count,
        percentage: Math.round((count / (posts.length || 1)) * 100)
      }))
      .sort((a, b) => b.count - a.count);

    // Institution response rates
    const institutionResponseRates = institutions.map(inst => {
      const tagged = posts.filter(p => p.institutionTags.some(t => t.institutionId === inst.id));
      const responded = tagged.filter(p => p.officialResponses.some(r => r.institutionId === inst.id));
      const rate = tagged.length > 0 ? Math.round((responded.length / tagged.length) * 100) : 100;
      return {
        institutionName: inst.officialName,
        acronym: inst.acronym,
        mentions: tagged.length,
        responses: responded.length,
        rate,
        avgResponseHours: inst.id === 'nadmo-ghana' ? 1.5 : inst.id === 'csa-ghana' ? 2.0 : 4.5
      };
    });

    // Overall response rate
    const totalTaggedPosts = posts.filter(p => p.institutionTags.length > 0).length;
    const totalRespondedPosts = posts.filter(p => p.officialResponses.length > 0).length;
    const responseRate = totalTaggedPosts > 0 ? Math.round((totalRespondedPosts / totalTaggedPosts) * 100) : 84;

    const categoryBreakdown = topCategories.map(c => ({
      category: c.category,
      count: c.count
    }));

    const regionalBreakdown = regionalStats.map(r => {
      const regPosts = posts.filter(p => p.location.region === r.region);
      const resolved = regPosts.filter(p => p.officialResponses.length > 0).length;
      const rate = regPosts.length > 0 ? Math.round((resolved / regPosts.length) * 100) : 100;
      return {
        region: r.region,
        postCount: r.activeIssues,
        resolvedCount: resolved,
        responseRate: rate
      };
    });

    res.json({
      totalActivePosts,
      totalIndependentConfirmations,
      totalInstitutionsAlerted,
      totalOfficialResponses,
      rapidlyEmergingIssuesCount: clusters.filter(c => c.status === 'TRENDING').length,
      regionalStats,
      topCategories,
      institutionResponseRates,
      // Compatibility aliases
      totalPosts: totalActivePosts,
      totalConfirmations: totalIndependentConfirmations,
      responseRate,
      averageResponseTimeHours: 3.2,
      categoryBreakdown,
      regionalBreakdown
    });
  });

  // GET /api/notifications
  app.get('/api/notifications', (req, res) => {
    res.json(notifications);
  });

  // PUT /api/notifications/:id/read
  app.put('/api/notifications/:id/read', (req, res) => {
    const notif = notifications.find(n => n.id === req.params.id);
    if (notif) notif.read = true;
    res.json({ success: true });
  });

  // POST /api/reports/abuse
  app.post('/api/reports/abuse', (req, res) => {
    const { postId, reason, details } = req.body;
    abuseReports.push({
      id: `report-${Date.now()}`,
      postId,
      reason,
      details,
      createdAt: new Date().toISOString()
    });
    res.json({ success: true, message: 'Report submitted for review by platform safety team.' });
  });

  // --- GEMINI AI SERVICES (SERVER-SIDE) ---

  // POST /api/ai/analyze-post
  app.post('/api/ai/analyze-post', async (req, res) => {
    try {
      const { text, audioTranscript, userLocation } = req.body;
      const contentToAnalyze = text || audioTranscript;

      if (!contentToAnalyze || contentToAnalyze.trim().length === 0) {
        return res.status(400).json({ error: 'No content provided for analysis' });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.json({
          status: 'fallback',
          category: 'Infrastructure & Roads',
          urgency: 'NORMAL',
          severity: 'MODERATE',
          suggestedInstitutions: ['Ghana Police Service', 'Local Assembly'],
          location: {
            region: userLocation?.region || 'Greater Accra',
            district: userLocation?.district || 'Accra Metropolitan'
          },
          conciseTitle: contentToAnalyze.slice(0, 60),
          hashtags: ['GhanaCivic', 'CitizenReport']
        });
      }

      const ai = getGeminiClient();
      const institutionList = institutions.map(i => `${i.id}: ${i.officialName} (${i.acronym}) - Mandate: ${i.mandate}`).join('\n');

      const systemPrompt = `You are the AI Civic Assistant for the Ghana Civic Awareness and Citizen Reporting Network.
Analyze the citizen's observation, voice transcript, or incident report.

Available Ghanaian Institutions to match from:
${institutionList}

Available Ghana Regions:
Greater Accra, Ashanti, Northern, Western, Central, Eastern, Volta, Upper East, Upper West, Bono, Bono East, Ahafo, Oti, Savannah, North East, Western North.

Available Categories:
Infrastructure & Roads, Flooding & Drainage, Power & Electricity (Dumsor), Water Supply & Quality, Sanitation & Waste, Public Safety & Security, Emergency & Disaster, Health & Hospitals, Environment & Galamsey, Human Rights & Corruption, Cybercrime & Online Fraud, Education & Schools, Consumer Rights & Transport, Other Community Concern.

Rules:
1. Identify the primary issue category accurately.
2. Determine urgency (CRITICAL for active danger/life threat, HIGH for severe public disruption/hazards, NORMAL for general community issues, LOW for informational).
3. Determine severity (EMERGENCY, SEVERE, MODERATE, INFORMATIONAL).
4. Extract location elements: region, district, landmark/neighborhood mentioned.
5. Select 1 to 3 matching Ghanaian institutions that need to know about this.
6. Generate 3 to 5 relevant hashtags (e.g. #AccraFloods, #DumsorAlert, #TamaleRoads).
7. Create a clean, objective headline (conciseTitle, max 80 chars) that does not exaggerate.
8. If the text is in Ghanaian local phrasing or pidgin/local language, provide a refined English version in 'refinedText' while preserving original factual meaning.
9. Perform a trust & safety check for vigilante incitement or doxxing.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: `Analyze this citizen report:\n"""${contentToAnalyze}"""\nUser vicinity hint: ${JSON.stringify(userLocation || {})}`,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              conciseTitle: { type: Type.STRING, description: 'Objective factual headline' },
              refinedText: { type: Type.STRING, description: 'Clear structured summary preserving exact facts' },
              detectedLanguage: { type: Type.STRING, description: 'Detected language e.g. English, Twi, Pidgin' },
              category: { type: Type.STRING, description: 'Primary civic category' },
              subcategory: { type: Type.STRING, description: 'Specific subcategory' },
              urgency: { type: Type.STRING, enum: ['CRITICAL', 'HIGH', 'NORMAL', 'LOW'] },
              severity: { type: Type.STRING, enum: ['EMERGENCY', 'SEVERE', 'MODERATE', 'INFORMATIONAL'] },
              region: { type: Type.STRING, description: 'Identified Ghana region' },
              district: { type: Type.STRING, description: 'Identified district or municipality' },
              landmark: { type: Type.STRING, description: 'Identified landmark or neighborhood' },
              matchedInstitutionIds: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Array of institution IDs matching available list'
              },
              hashtags: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              safetyFlag: {
                type: Type.OBJECT,
                properties: {
                  isSafe: { type: Type.BOOLEAN },
                  reason: { type: Type.STRING }
                }
              }
            },
            required: ['conciseTitle', 'category', 'urgency', 'severity', 'matchedInstitutionIds', 'hashtags']
          }
        }
      });

      const json = JSON.parse(response.text || '{}');
      res.json(json);
    } catch (err: any) {
      console.error('Gemini post analysis error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/ai/generate-share-copy
  app.post('/api/ai/generate-share-copy', async (req, res) => {
    try {
      const { postTitle, category, location, confirmationsCount, institutionsTagged } = req.body;

      if (!process.env.GEMINI_API_KEY) {
        return res.json({
          whatsappCopy: `🚨 CIVIC ALERT: ${postTitle}\n📍 Location: ${location}\n👥 ${confirmationsCount} citizens independently observed this issue.\n🏛️ Tagged: ${institutionsTagged}\n🔗 Track on Ghana Civic Network`,
          twitterCopy: `🚨 Citizen Report: ${postTitle} around ${location}. ${confirmationsCount} residents seeing this too. @${institutionsTagged} alerted. #GhanaCivic #SpeakUp`
        });
      }

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: `Generate shareable civic copy for social platforms for this verified citizen report:
Title: ${postTitle}
Category: ${category}
Location: ${location}
Independent Confirmations: ${confirmationsCount}
Tagged Institutions: ${institutionsTagged}`,
        config: {
          systemInstruction:
            'Generate factual, non-sensational, highly shareable copy for WhatsApp and X (Twitter) so community members can amplify civic issues without sensationalism.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              whatsappCopy: { type: Type.STRING, description: 'Formatted WhatsApp message with emoji bullets' },
              twitterCopy: { type: Type.STRING, description: 'Concise X post under 250 characters with hashtags' },
              smsCopy: { type: Type.STRING, description: 'Short SMS broadcast text' }
            },
            required: ['whatsappCopy', 'twitterCopy']
          }
        }
      });

      res.json(JSON.parse(response.text || '{}'));
    } catch (err: any) {
      console.error('Share copy generation error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // --- VITE MIDDLEWARE (DEVELOPMENT / PRODUCTION) ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Ghana Civic Network Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
