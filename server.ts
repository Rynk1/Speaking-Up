import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { initDatabase, db } from './server/db';
import { seedDatabaseIfEmpty } from './server/seedDatabase';
import { GHANA_REGIONS } from './server/seedData';
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

const JWT_SECRET = process.env.JWT_SECRET || 'speakup-secret-key-ghana-2025';

// Setup file uploads storage directory
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `upload-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'audio/mpeg', 'audio/wav', 'audio/m4a', 'audio/ogg', 'video/mp4', 'video/webm'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error(`Invalid file type: ${file.mimetype}`));
  }
});

// Auth Middleware
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    handle: string;
    role: string;
  };
}

function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(); // Guest request allowed where applicable
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

function requireRole(roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

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

// Helper DB functions to hydrate complex objects from SQLite
function rowToPost(row: any): CivicPost {
  const tagsRows = db.prepare('SELECT * FROM post_institution_tags WHERE post_id = ?').all(row.id) as any[];
  const mediaRows = db.prepare('SELECT * FROM media WHERE post_id = ?').all(row.id) as any[];
  const responseRows = db.prepare('SELECT * FROM institution_responses WHERE post_id = ?').all(row.id) as any[];
  const evidenceRows = db.prepare('SELECT * FROM community_evidence WHERE post_id = ?').all(row.id) as any[];
  const commentRows = db.prepare('SELECT * FROM comments WHERE post_id = ?').all(row.id) as any[];

  return {
    id: row.id,
    title: row.title,
    content: row.content,
    originalLanguage: row.original_language,
    translatedText: row.translated_text || undefined,
    authorId: row.author_id,
    authorName: row.author_name,
    authorHandle: row.author_handle,
    authorAvatar: row.author_avatar || undefined,
    authorVisibility: row.author_visibility,
    isVerifiedCitizen: Boolean(row.is_verified_citizen),
    followersCount: 0,
    media: mediaRows.map(m => ({
      id: m.id,
      type: m.type,
      url: m.url,
      thumbnailUrl: m.thumbnail_url || undefined,
      caption: m.caption || undefined,
      mimeType: m.mime_type || undefined,
      uploadedAt: m.uploaded_at
    })),
    category: row.category,
    subcategory: row.subcategory || undefined,
    location: {
      region: row.region,
      district: row.district,
      landmark: row.landmark || undefined,
      latitude: row.latitude || undefined,
      longitude: row.longitude || undefined,
      accuracy: row.location_accuracy || 'exact',
      visibility: row.location_visibility || 'exact'
    },
    institutionTags: tagsRows.map(t => ({
      institutionId: t.institution_id,
      institutionName: t.institution_name,
      shortName: t.short_name || undefined,
      acronym: t.acronym || undefined,
      alertRequested: Boolean(t.alert_requested),
      alertStatus: t.alert_status,
      alertMethodUsed: t.alert_method_used || undefined,
      deliveryTimestamp: t.delivery_timestamp || undefined
    })),
    suggestedInstitutions: [],
    urgency: row.urgency,
    severity: row.severity,
    hashtags: JSON.parse(row.hashtags_json || '[]'),
    visibility: row.visibility,
    moderationStatus: row.moderation_status,
    issueClusterId: row.issue_cluster_id || undefined,
    credibilitySignals: {
      confirmationsCount: row.confirmations_count,
      evidenceCount: evidenceRows.length,
      hasMedia: mediaRows.length > 0,
      hasLocation: Boolean(row.district && row.region),
      institutionalAwarenessScore: tagsRows.length > 0 ? (responseRows.length > 0 ? 100 : 70) : 30
    },
    engagement: {
      views: row.views_count,
      reposts: row.reposts_count,
      shares: row.shares_count,
      confirmations: row.confirmations_count,
      comments: row.comments_count
    },
    userConfirmed: true,
    userBookmarked: false,
    userReposted: false,
    officialResponses: responseRows.map(r => {
      let timeline = undefined;
      try {
        if (r.action_timeline_json) timeline = JSON.parse(r.action_timeline_json);
      } catch (e) {}

      let docs = [];
      try {
        if (r.documents_json) docs = JSON.parse(r.documents_json);
      } catch (e) {}

      let hots = [];
      try {
        if (r.hotlines_json) hots = JSON.parse(r.hotlines_json);
      } catch (e) {}

      let respComments: any[] = [];
      try {
        respComments = db.prepare('SELECT * FROM response_comments WHERE response_id = ? ORDER BY created_at ASC').all(r.id) as any[];
      } catch (e) {}

      return {
        id: r.id,
        postId: r.post_id,
        institutionId: r.institution_id,
        institutionName: r.institution_name,
        institutionLogo: r.institution_logo || undefined,
        responseType: r.response_type,
        message: r.message,
        statementTitle: r.statement_title || undefined,
        fullStatement: r.full_statement || r.message,
        referenceNumber: r.reference_number || undefined,
        actionTimeline: timeline,
        resolutionStatus: r.resolution_status || 'IN_PROGRESS',
        documents: docs,
        hotlines: hots,
        helpfulCount: r.helpful_count || 0,
        unhelpfulCount: r.unhelpful_count || 0,
        commentsCount: respComments.length,
        commentsList: respComments.map(c => ({
          id: c.id,
          responseId: c.response_id,
          postId: c.post_id,
          userId: c.user_id,
          userName: c.user_name,
          userHandle: c.user_handle,
          userAvatar: c.user_avatar || undefined,
          isVerified: Boolean(c.is_verified),
          content: c.content,
          createdAt: c.created_at,
          likesCount: c.likes_count || 0
        })),
        official: Boolean(r.official),
        verified: Boolean(r.verified),
        responderName: r.responder_name,
        responderTitle: r.responder_title,
        redirectedToInstitutionId: r.redirected_to_institution_id || undefined,
        redirectedToInstitutionName: r.redirected_to_institution_name || undefined,
        createdAt: r.created_at
      };
    }),
    communityEvidence: evidenceRows.map(e => ({
      id: e.id,
      postId: e.post_id,
      userId: e.user_id,
      userName: e.user_name,
      userHandle: e.user_handle,
      text: e.text,
      media: [],
      statusUpdate: e.status_update,
      createdAt: e.created_at
    })),
    commentsList: commentRows.map(c => ({
      id: c.id,
      postId: c.post_id,
      userId: c.user_id,
      userName: c.user_name,
      userHandle: c.user_handle,
      isVerified: Boolean(c.is_verified),
      content: c.content,
      createdAt: c.created_at,
      likesCount: c.likes_count
    })),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function rowToInstitution(row: any): Institution {
  return {
    id: row.id,
    officialName: row.official_name,
    shortName: row.short_name,
    acronym: row.acronym,
    mandate: row.mandate,
    categories: [row.category as CivicCategory],
    jurisdiction: row.jurisdiction,
    logo: row.logo || undefined,
    officialWebsite: row.official_website || undefined,
    officialContacts: JSON.parse(row.official_contacts_json || '[]'),
    officialSocialAccounts: JSON.parse(row.social_accounts_json || '[]'),
    emailChannels: JSON.parse(row.email_channels_json || '[]'),
    whatsappChannels: JSON.parse(row.whatsapp_channels_json || '[]'),
    alertMethod: row.alert_method,
    activeMentionsCount: row.active_mentions_count,
    unansweredMentionsCount: row.unanswered_mentions_count,
    officialResponsesCount: row.official_responses_count,
    avgResponseTimeHours: row.avg_response_hours,
    verificationStatus: row.verification_status,
    sourceDocuments: JSON.parse(row.source_documents_json || '[]'),
    verificationDate: row.verification_date || undefined,
    verifiedBy: row.verified_by || undefined,
    nextReviewDate: row.next_review_date || undefined
  };
}

async function startServer() {
  initDatabase();
  await seedDatabaseIfEmpty();

  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.use(authMiddleware);

  // Serve static media uploads
  app.use('/uploads', express.static(uploadDir));

  // --- AUTHENTICATION API ROUTES ---

  // POST /api/auth/register
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password, name, handle, role } = req.body;
      if (!email || !password || !name) {
        return res.status(400).json({ error: 'Email, password, and name are required' });
      }

      const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      if (existing) {
        return res.status(400).json({ error: 'Email address is already registered' });
      }

      const userId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const userHandle = handle || email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_');
      const hashedPassword = await bcrypt.hash(password, 10);
      const userRole = role || 'CITIZEN';
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO users (id, email, password_hash, name, handle, avatar, role, is_verified, followers_count, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)
      `).run(
        userId,
        email,
        hashedPassword,
        name,
        userHandle,
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
        userRole,
        now,
        now
      );

      const token = jwt.sign(
        { id: userId, email, name, handle: userHandle, role: userRole },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.status(201).json({
        token,
        user: { id: userId, email, name, handle: userHandle, role: userRole }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/auth/login
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, name: user.name, handle: user.handle, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        token,
        user: { id: user.id, email: user.email, name: user.name, handle: user.handle, role: user.role }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/auth/me
  app.get('/api/auth/me', (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const user = db.prepare('SELECT id, email, name, handle, role, avatar, is_verified FROM users WHERE id = ?').get(req.user.id);
    res.json(user);
  });

  // --- MEDIA UPLOAD ROUTE ---
  app.post('/api/media/upload', upload.single('file'), (req: AuthenticatedRequest, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    let fileType = 'image';
    if (req.file.mimetype.startsWith('audio/')) fileType = 'audio';
    else if (req.file.mimetype.startsWith('video/')) fileType = 'video';

    res.json({
      id: `media-${Date.now()}`,
      url: fileUrl,
      type: fileType,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size
    });
  });

  // --- DRAFTS / LOW-BANDWIDTH OFFLINE APIS ---
  app.post('/api/drafts', (req: AuthenticatedRequest, res) => {
    const userId = req.user?.id || 'guest-user';
    const draftId = `draft-${userId}`;
    const draftData = JSON.stringify(req.body);
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO drafts (id, user_id, draft_data_json, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET draft_data_json = excluded.draft_data_json, updated_at = excluded.updated_at
    `).run(draftId, userId, draftData, now);

    res.json({ success: true, draftId });
  });

  app.get('/api/drafts', (req: AuthenticatedRequest, res) => {
    const userId = req.user?.id || 'guest-user';
    const draftId = `draft-${userId}`;
    const row = db.prepare('SELECT draft_data_json FROM drafts WHERE id = ?').get(draftId) as any;
    if (!row) return res.json(null);
    res.json(JSON.parse(row.draft_data_json));
  });

  // --- INSTITUTIONS API ROUTES ---

  // GET /api/institutions
  app.get('/api/institutions', (req, res) => {
    const { category, search } = req.query;
    let query = 'SELECT * FROM institutions';
    const params: any[] = [];

    if (category) {
      query += ' WHERE category = ?';
      params.push(category);
    }

    const rows = db.prepare(query).all(...params) as any[];
    let list = rows.map(rowToInstitution);

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
    const row = db.prepare('SELECT * FROM institutions WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Institution not found' });
    const inst = rowToInstitution(row);

    const postRows = db.prepare(`
      SELECT DISTINCT p.* FROM posts p
      JOIN post_institution_tags t ON p.id = t.post_id
      WHERE t.institution_id = ?
    `).all(inst.id);

    const taggedPosts = postRows.map(rowToPost);
    res.json({ institution: inst, taggedPosts });
  });

  // --- POSTS API ROUTES ---

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

    let query = 'SELECT p.* FROM posts p';
    const params: any[] = [];
    const whereClauses: string[] = ["p.moderation_status = 'approved'"];

    if (clusterId) {
      whereClauses.push('p.issue_cluster_id = ?');
      params.push(clusterId);
    }

    if (institutionId) {
      query += ' JOIN post_institution_tags t ON p.id = t.post_id';
      whereClauses.push('t.institution_id = ?');
      params.push(institutionId);
    }

    if (authorId) {
      whereClauses.push('p.author_id = ?');
      params.push(authorId);
    }

    if (category && category !== 'ALL' && category !== 'All') {
      whereClauses.push('p.category = ?');
      params.push(category);
    }

    if (region && region !== 'ALL' && region !== 'All') {
      whereClauses.push('p.region = ?');
      params.push(region);
    }

    if (urgency && urgency !== 'ALL' && urgency !== 'All') {
      whereClauses.push('p.urgency = ?');
      params.push(urgency);
    }

    if (whereClauses.length > 0) {
      query += ' WHERE ' + whereClauses.join(' AND ');
    }

    query += ' ORDER BY p.created_at DESC';

    const rows = db.prepare(query).all(...params) as any[];
    let postsList = rows.map(rowToPost);

    if (search) {
      const q = String(search).toLowerCase();
      postsList = postsList.filter(
        p =>
          p.title.toLowerCase().includes(q) ||
          p.content.toLowerCase().includes(q) ||
          p.location.district.toLowerCase().includes(q) ||
          p.location.region.toLowerCase().includes(q) ||
          (p.location.landmark && p.location.landmark.toLowerCase().includes(q)) ||
          p.hashtags.some(h => h.toLowerCase().includes(q)) ||
          p.institutionTags.some(t => t.institutionName.toLowerCase().includes(q) || t.acronym?.toLowerCase().includes(q))
      );
    }

    // Apply Tab filtering/sorting
    if (tab === 'urgent') {
      postsList = postsList.filter(p => p.urgency === 'CRITICAL' || p.urgency === 'HIGH');
    } else if (tab === 'official_responded') {
      postsList = postsList.filter(p => p.officialResponses && p.officialResponses.length > 0);
    } else if (tab === 'nearby_hot') {
      postsList.sort(
        (a, b) =>
          b.engagement.confirmations * 3 + b.engagement.shares * 2 + b.engagement.reposts -
          (a.engagement.confirmations * 3 + a.engagement.shares * 2 + a.engagement.reposts)
      );
    }

    res.json(postsList);
  });

  // GET /api/posts/:id
  app.get('/api/posts/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Post not found' });
    db.prepare('UPDATE posts SET views_count = views_count + 1 WHERE id = ?').run(req.params.id);
    const post = rowToPost(row);
    res.json(post);
  });

  // POST /api/posts - Persistent Civic Post Creation
  app.post('/api/posts', (req: AuthenticatedRequest, res) => {
    try {
      const body = req.body;
      const newPostId = `post-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();

      const authorId = req.user?.id || body.authorId || 'user-current';
      const authorName = req.user?.name || body.authorName || (body.authorVisibility === 'anonymous' ? 'Anonymous Citizen' : 'Kofi Mensah');
      const authorHandle = req.user?.handle || body.authorHandle || (body.authorVisibility === 'anonymous' ? 'citizen_confidential' : 'kofi_speakup');

      const title = body.title || body.content.slice(0, 70);
      const category = body.category || 'Infrastructure & Roads';
      const region = body.location?.region || 'Greater Accra';
      const district = body.location?.district || 'Accra Metropolitan';
      const landmark = body.location?.landmark || null;
      const latitude = body.location?.latitude || 5.6037;
      const longitude = body.location?.longitude || -0.187;
      const urgency = body.urgency || 'NORMAL';
      const severity = body.severity || 'MODERATE';

      // Insert post into SQLite
      db.prepare(`
        INSERT INTO posts (
          id, title, content, original_language, translated_text, author_id, author_name, author_handle,
          author_avatar, author_visibility, is_verified_citizen, category, subcategory, urgency, severity,
          region, district, landmark, latitude, longitude, location_accuracy, location_visibility,
          hashtags_json, visibility, moderation_status, issue_cluster_id, views_count, reposts_count,
          shares_count, confirmations_count, comments_count, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, 1, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, 'exact', 'exact',
          ?, 'public', 'approved', null, 1, 0,
          0, 1, 0, ?, ?
        )
      `).run(
        newPostId,
        title,
        body.content,
        body.originalLanguage || 'English',
        body.translatedText || null,
        authorId,
        authorName,
        authorHandle,
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
        body.authorVisibility || 'public',
        category,
        body.subcategory || null,
        urgency,
        severity,
        region,
        district,
        landmark,
        latitude,
        longitude,
        JSON.stringify(body.hashtags || ['#SpeakUpGhana', '#CitizenVoice']),
        now,
        now
      );

      // Process Institution Tags with tracked delivery states
      const insertTagStmt = db.prepare(`
        INSERT INTO post_institution_tags (
          id, post_id, institution_id, institution_name, short_name, acronym, alert_requested, alert_status, alert_method_used, delivery_timestamp, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const tag of body.institutionTags || []) {
        const instRow = db.prepare('SELECT * FROM institutions WHERE id = ?').get(tag.institutionId) as any;
        let alertStatus = 'SENT';
        let alertMethodUsed = 'Direct Platform Channel';

        if (instRow) {
          db.prepare(`
            UPDATE institutions
            SET active_mentions_count = active_mentions_count + 1,
                unanswered_mentions_count = unanswered_mentions_count + 1
            WHERE id = ?
          `).run(instRow.id);

          if (instRow.alert_method === 'DIRECT_API') {
            alertStatus = 'DELIVERED';
            alertMethodUsed = 'Direct Official API Integration';
          } else if (instRow.alert_method === 'OFFICIAL_EMAIL') {
            alertStatus = 'SENT';
            alertMethodUsed = `Official Notification Dispatch`;
          } else if (instRow.alert_method === 'WHATSAPP_LINE') {
            alertStatus = 'SENT';
            alertMethodUsed = `Official WhatsApp Channel`;
          } else {
            alertStatus = 'NOT_CONFIGURED';
            alertMethodUsed = 'No direct channel integration configured';
          }
        } else {
          alertStatus = 'NOT_CONFIGURED';
          alertMethodUsed = 'Institution Registry record unconfigured';
        }

        insertTagStmt.run(
          `tag-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          newPostId,
          tag.institutionId,
          tag.institutionName || instRow?.official_name || 'State Institution',
          tag.shortName || instRow?.short_name || '',
          tag.acronym || instRow?.acronym || '',
          tag.alertRequested !== false ? 1 : 0,
          alertStatus,
          alertMethodUsed,
          now,
          now
        );
      }

      // Insert Media records
      const insertMediaStmt = db.prepare(`
        INSERT INTO media (id, post_id, type, url, thumbnail_url, caption, mime_type, uploaded_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const m of body.media || []) {
        insertMediaStmt.run(
          m.id || `media-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          newPostId,
          m.type,
          m.url,
          m.thumbnailUrl || null,
          m.caption || null,
          m.mimeType || 'image/jpeg',
          now
        );
      }

      // Record initial Confirmation for author
      db.prepare(`
        INSERT INTO confirmations (id, post_id, user_id, created_at)
        VALUES (?, ?, ?, ?)
      `).run(`conf-${Date.now()}`, newPostId, authorId, now);

      // Create notification
      db.prepare(`
        INSERT INTO notifications (id, user_id, type, title, message, post_id, institution_name, read, created_at)
        VALUES (?, ?, ?, ?, ?, ?, null, 0, ?)
      `).run(
        `notif-${Date.now()}`,
        authorId,
        'CONFIRMATION_SPIKE',
        'Civic Report Published',
        `Your report "${title}" has been published and tagged to state authorities. Zero followers needed for reach!`,
        newPostId,
        now
      );

      // Fetch newly created post from SQLite
      const createdRow = db.prepare('SELECT * FROM posts WHERE id = ?').get(newPostId);
      const createdPost = rowToPost(createdRow);

      res.status(201).json(createdPost);
    } catch (err: any) {
      console.error('Error creating post:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/posts/:id/confirm - Toggle "I'm seeing this too"
  app.post('/api/posts/:id/confirm', (req: AuthenticatedRequest, res) => {
    const postId = req.params.id;
    const userId = req.user?.id || 'user-current';
    const now = new Date().toISOString();

    const existing = db.prepare('SELECT * FROM confirmations WHERE post_id = ? AND user_id = ?').get(postId, userId);

    if (existing) {
      db.prepare('DELETE FROM confirmations WHERE post_id = ? AND user_id = ?').run(postId, userId);
      db.prepare('UPDATE posts SET confirmations_count = MAX(0, confirmations_count - 1) WHERE id = ?').run(postId);
    } else {
      db.prepare('INSERT INTO confirmations (id, post_id, user_id, created_at) VALUES (?, ?, ?, ?)').run(
        `conf-${Date.now()}`,
        postId,
        userId,
        now
      );
      db.prepare('UPDATE posts SET confirmations_count = confirmations_count + 1 WHERE id = ?').run(postId);
    }

    const updatedRow = db.prepare('SELECT confirmations_count FROM posts WHERE id = ?').get(postId) as any;
    res.json({
      success: true,
      confirmed: !existing,
      confirmationsCount: updatedRow ? updatedRow.confirmations_count : 0
    });
  });

  // POST /api/posts/:id/evidence
  app.post('/api/posts/:id/evidence', (req: AuthenticatedRequest, res) => {
    const postId = req.params.id;
    const { text, statusUpdate, userName, userHandle } = req.body;
    const userId = req.user?.id || 'user-current';
    const now = new Date().toISOString();
    const evidenceId = `evid-${Date.now()}`;

    db.prepare(`
      INSERT INTO community_evidence (id, post_id, user_id, user_name, user_handle, text, status_update, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      evidenceId,
      postId,
      userId,
      userName || req.user?.name || 'Community Observer',
      userHandle || req.user?.handle || 'observer_gh',
      text,
      statusUpdate || 'still_ongoing',
      now
    );

    res.status(201).json({
      id: evidenceId,
      postId,
      userId,
      userName: userName || req.user?.name || 'Community Observer',
      userHandle: userHandle || req.user?.handle || 'observer_gh',
      text,
      media: [],
      statusUpdate: statusUpdate || 'still_ongoing',
      createdAt: now
    });
  });

  // POST /api/posts/:id/comments
  app.post('/api/posts/:id/comments', (req: AuthenticatedRequest, res) => {
    const postId = req.params.id;
    const { content, userName, userHandle } = req.body;
    const userId = req.user?.id || 'user-current';
    const now = new Date().toISOString();
    const commentId = `comment-${Date.now()}`;

    db.prepare(`
      INSERT INTO comments (id, post_id, user_id, user_name, user_handle, is_verified, content, likes_count, created_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, 0, ?)
    `).run(
      commentId,
      postId,
      userId,
      userName || req.user?.name || 'Civic Participant',
      userHandle || req.user?.handle || 'citizen_gh',
      content,
      now
    );

    db.prepare('UPDATE posts SET comments_count = comments_count + 1 WHERE id = ?').run(postId);

    res.status(201).json({
      id: commentId,
      postId,
      userId,
      userName: userName || req.user?.name || 'Civic Participant',
      userHandle: userHandle || req.user?.handle || 'citizen_gh',
      isVerified: true,
      content,
      createdAt: now,
      likesCount: 0
    });
  });

  // POST /api/posts/:id/alert - Dispatch alert to institution
  app.post('/api/posts/:id/alert', (req, res) => {
    const postId = req.params.id;
    const { institutionId } = req.body;
    const now = new Date().toISOString();

    const instRow = db.prepare('SELECT * FROM institutions WHERE id = ?').get(institutionId) as any;
    if (!instRow) return res.status(404).json({ error: 'Institution not found' });

    let alertStatus = 'SENT';
    let alertMethodUsed = `Alert dispatched to ${instRow.official_name}`;

    if (instRow.alert_method === 'DIRECT_API') {
      alertStatus = 'DELIVERED';
      alertMethodUsed = 'Direct Official API Delivery';
    } else if (instRow.alert_method === 'NONE') {
      alertStatus = 'NOT_CONFIGURED';
      alertMethodUsed = 'No direct channel configured; public tag active';
    }

    db.prepare(`
      INSERT INTO post_institution_tags (id, post_id, institution_id, institution_name, short_name, acronym, alert_requested, alert_status, alert_method_used, delivery_timestamp, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
    `).run(
      `tag-${Date.now()}`,
      postId,
      instRow.id,
      instRow.official_name,
      instRow.short_name,
      instRow.acronym,
      alertStatus,
      alertMethodUsed,
      now,
      now
    );

    db.prepare('UPDATE institutions SET active_mentions_count = active_mentions_count + 1 WHERE id = ?').run(instRow.id);

    res.json({
      success: true,
      tag: {
        institutionId: instRow.id,
        institutionName: instRow.official_name,
        shortName: instRow.short_name,
        acronym: instRow.acronym,
        alertRequested: true,
        alertStatus,
        alertMethodUsed,
        deliveryTimestamp: now
      }
    });
  });

  // POST /api/posts/:id/response - Official Institution Response
  app.post('/api/posts/:id/response', requireRole(['INSTITUTION_REP', 'ADMIN']), (req: AuthenticatedRequest, res) => {
    const postId = req.params.id;
    const {
      institutionId,
      responseType,
      message,
      statementTitle,
      fullStatement,
      referenceNumber,
      actionTimeline,
      resolutionStatus,
      documents,
      hotlines,
      responderName,
      responderTitle,
      redirectedToInstitutionId
    } = req.body;

    const instRow = db.prepare('SELECT * FROM institutions WHERE id = ?').get(institutionId) as any;
    if (!instRow) return res.status(404).json({ error: 'Institution not found' });

    let redirectedName = undefined;
    if (redirectedToInstitutionId) {
      const redInst = db.prepare('SELECT official_name FROM institutions WHERE id = ?').get(redirectedToInstitutionId) as any;
      if (redInst) redirectedName = redInst.official_name;
    }

    const responseId = `resp-${Date.now()}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO institution_responses (
        id, post_id, institution_id, institution_name, institution_logo, response_type, message,
        statement_title, full_statement, reference_number, action_timeline_json, resolution_status,
        documents_json, hotlines_json, helpful_count, unhelpful_count,
        official, verified, responder_name, responder_title, redirected_to_institution_id,
        redirected_to_institution_name, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 1, 1, ?, ?, ?, ?, ?)
    `).run(
      responseId,
      postId,
      instRow.id,
      instRow.official_name,
      instRow.logo || null,
      responseType || 'WE_ARE_AWARE',
      message,
      statementTitle || null,
      fullStatement || message,
      referenceNumber || `REF-${instRow.acronym}-${Date.now().toString().slice(-6)}`,
      actionTimeline ? JSON.stringify(actionTimeline) : null,
      resolutionStatus || 'IN_PROGRESS',
      documents ? JSON.stringify(documents) : null,
      hotlines ? JSON.stringify(hotlines) : null,
      responderName || req.user?.name || 'Official Spokesperson',
      responderTitle || `Representative, ${instRow.short_name}`,
      redirectedToInstitutionId || null,
      redirectedName || null,
      now
    );

    db.prepare(`
      UPDATE institutions
      SET official_responses_count = official_responses_count + 1,
          unanswered_mentions_count = MAX(0, unanswered_mentions_count - 1)
      WHERE id = ?
    `).run(instRow.id);

    const postRow = db.prepare('SELECT author_id, title FROM posts WHERE id = ?').get(postId) as any;
    if (postRow) {
      db.prepare(`
        INSERT INTO notifications (id, user_id, type, title, message, post_id, institution_name, read, created_at)
        VALUES (?, ?, 'INSTITUTION_RESPONSE', ?, ?, ?, ?, 0, ?)
      `).run(
        `notif-${Date.now()}`,
        postRow.author_id,
        `Official Response from ${instRow.short_name}`,
        `${instRow.official_name} responded: "${message.slice(0, 90)}..."`,
        postId,
        instRow.short_name,
        now
      );
    }

    res.status(201).json({
      id: responseId,
      postId,
      institutionId: instRow.id,
      institutionName: instRow.official_name,
      institutionLogo: instRow.logo,
      responseType: responseType || 'WE_ARE_AWARE',
      message,
      statementTitle,
      fullStatement: fullStatement || message,
      referenceNumber: referenceNumber || `REF-${instRow.acronym}-${Date.now().toString().slice(-6)}`,
      actionTimeline,
      resolutionStatus: resolutionStatus || 'IN_PROGRESS',
      documents: documents || [],
      hotlines: hotlines || [],
      helpfulCount: 0,
      unhelpfulCount: 0,
      commentsCount: 0,
      commentsList: [],
      official: true,
      verified: true,
      responderName: responderName || req.user?.name || 'Official Spokesperson',
      responderTitle: responderTitle || `Representative, ${instRow.short_name}`,
      redirectedToInstitutionId,
      redirectedToInstitutionName: redirectedName,
      createdAt: now
    });
  });

  // GET /api/responses/:id - Get full response with comments & parent post
  app.get('/api/responses/:id', (req, res) => {
    const responseId = req.params.id;
    const r = db.prepare('SELECT * FROM institution_responses WHERE id = ?').get(responseId) as any;
    if (!r) return res.status(404).json({ error: 'Response statement not found' });

    let timeline = undefined;
    try {
      if (r.action_timeline_json) timeline = JSON.parse(r.action_timeline_json);
    } catch (e) {}

    let docs = [];
    try {
      if (r.documents_json) docs = JSON.parse(r.documents_json);
    } catch (e) {}

    let hots = [];
    try {
      if (r.hotlines_json) hots = JSON.parse(r.hotlines_json);
    } catch (e) {}

    const respComments = db.prepare('SELECT * FROM response_comments WHERE response_id = ? ORDER BY created_at ASC').all(responseId) as any[];

    // Fetch original post
    const postRow = db.prepare('SELECT * FROM posts WHERE id = ?').get(r.post_id) as any;
    const originalPost = postRow ? rowToPost(postRow) : null;

    // Fetch other responses to this post
    const relatedResponseRows = db.prepare('SELECT * FROM institution_responses WHERE post_id = ? AND id != ?').all(r.post_id, responseId) as any[];
    const relatedResponses = relatedResponseRows.map(rel => ({
      id: rel.id,
      postId: rel.post_id,
      institutionId: rel.institution_id,
      institutionName: rel.institution_name,
      institutionLogo: rel.institution_logo || undefined,
      responseType: rel.response_type,
      message: rel.message,
      statementTitle: rel.statement_title || undefined,
      fullStatement: rel.full_statement || rel.message,
      referenceNumber: rel.reference_number || undefined,
      resolutionStatus: rel.resolution_status || 'IN_PROGRESS',
      official: Boolean(rel.official),
      verified: Boolean(rel.verified),
      responderName: rel.responder_name,
      responderTitle: rel.responder_title,
      createdAt: rel.created_at
    }));

    res.json({
      response: {
        id: r.id,
        postId: r.post_id,
        institutionId: r.institution_id,
        institutionName: r.institution_name,
        institutionLogo: r.institution_logo || undefined,
        responseType: r.response_type,
        message: r.message,
        statementTitle: r.statement_title || undefined,
        fullStatement: r.full_statement || r.message,
        referenceNumber: r.reference_number || undefined,
        actionTimeline: timeline,
        resolutionStatus: r.resolution_status || 'IN_PROGRESS',
        documents: docs,
        hotlines: hots,
        helpfulCount: r.helpful_count || 0,
        unhelpfulCount: r.unhelpful_count || 0,
        commentsCount: respComments.length,
        commentsList: respComments.map(c => ({
          id: c.id,
          responseId: c.response_id,
          postId: c.post_id,
          userId: c.user_id,
          userName: c.user_name,
          userHandle: c.user_handle,
          userAvatar: c.user_avatar || undefined,
          isVerified: Boolean(c.is_verified),
          content: c.content,
          createdAt: c.created_at,
          likesCount: c.likes_count || 0
        })),
        official: Boolean(r.official),
        verified: Boolean(r.verified),
        responderName: r.responder_name,
        responderTitle: r.responder_title,
        redirectedToInstitutionId: r.redirected_to_institution_id || undefined,
        redirectedToInstitutionName: r.redirected_to_institution_name || undefined,
        createdAt: r.created_at
      },
      originalPost,
      relatedResponses
    });
  });

  // POST /api/responses/:id/comments - Add citizen comment directly to state statement
  app.post('/api/responses/:id/comments', (req: AuthenticatedRequest, res) => {
    const responseId = req.params.id;
    const { content, userName, userHandle } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content cannot be empty' });
    }

    const r = db.prepare('SELECT id, post_id, institution_name FROM institution_responses WHERE id = ?').get(responseId) as any;
    if (!r) return res.status(404).json({ error: 'Response statement not found' });

    const commentId = `resp-comment-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const userId = req.user?.id || 'user-citizen';
    const authorName = userName || req.user?.name || 'Concerned Citizen';
    const authorHandle = userHandle || req.user?.handle || 'citizen_gh';
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO response_comments (
        id, response_id, post_id, user_id, user_name, user_handle, user_avatar, is_verified, content, likes_count, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, 0, ?)
    `).run(
      commentId,
      responseId,
      r.post_id,
      userId,
      authorName,
      authorHandle,
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
      content.trim(),
      now
    );

    res.status(201).json({
      id: commentId,
      responseId,
      postId: r.post_id,
      userId,
      userName: authorName,
      userHandle: authorHandle,
      userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
      isVerified: true,
      content: content.trim(),
      createdAt: now,
      likesCount: 0
    });
  });

  // POST /api/responses/:id/vote - Upvote clarity/helpfulness of official statement
  app.post('/api/responses/:id/vote', (req: AuthenticatedRequest, res) => {
    const responseId = req.params.id;
    const { voteType } = req.body; // 'helpful' | 'unhelpful'
    const userId = req.user?.id || req.body.userId || 'guest-user';
    const now = new Date().toISOString();

    if (!['helpful', 'unhelpful'].includes(voteType)) {
      return res.status(400).json({ error: 'Invalid vote type' });
    }

    const existing = db.prepare('SELECT vote_type FROM response_votes WHERE user_id = ? AND response_id = ?').get(userId, responseId) as any;

    if (existing) {
      if (existing.vote_type === voteType) {
        // Remove vote
        db.prepare('DELETE FROM response_votes WHERE user_id = ? AND response_id = ?').run(userId, responseId);
        if (voteType === 'helpful') {
          db.prepare('UPDATE institution_responses SET helpful_count = MAX(0, helpful_count - 1) WHERE id = ?').run(responseId);
        } else {
          db.prepare('UPDATE institution_responses SET unhelpful_count = MAX(0, unhelpful_count - 1) WHERE id = ?').run(responseId);
        }
      } else {
        // Switch vote
        db.prepare('UPDATE response_votes SET vote_type = ?, created_at = ? WHERE user_id = ? AND response_id = ?').run(voteType, now, userId, responseId);
        if (voteType === 'helpful') {
          db.prepare('UPDATE institution_responses SET helpful_count = helpful_count + 1, unhelpful_count = MAX(0, unhelpful_count - 1) WHERE id = ?').run(responseId);
        } else {
          db.prepare('UPDATE institution_responses SET unhelpful_count = unhelpful_count + 1, helpful_count = MAX(0, helpful_count - 1) WHERE id = ?').run(responseId);
        }
      }
    } else {
      // New vote
      db.prepare('INSERT INTO response_votes (user_id, response_id, vote_type, created_at) VALUES (?, ?, ?, ?)').run(userId, responseId, voteType, now);
      if (voteType === 'helpful') {
        db.prepare('UPDATE institution_responses SET helpful_count = helpful_count + 1 WHERE id = ?').run(responseId);
      } else {
        db.prepare('UPDATE institution_responses SET unhelpful_count = unhelpful_count + 1 WHERE id = ?').run(responseId);
      }
    }

    const updated = db.prepare('SELECT helpful_count, unhelpful_count FROM institution_responses WHERE id = ?').get(responseId) as any;
    res.json({
      helpfulCount: updated?.helpful_count || 0,
      unhelpfulCount: updated?.unhelpful_count || 0,
      userVote: existing?.vote_type === voteType ? null : voteType
    });
  });

  // POST /api/responses/comments/:commentId/like - Like a statement comment
  app.post('/api/responses/comments/:commentId/like', (req, res) => {
    const commentId = req.params.commentId;
    db.prepare('UPDATE response_comments SET likes_count = likes_count + 1 WHERE id = ?').run(commentId);
    const row = db.prepare('SELECT likes_count FROM response_comments WHERE id = ?').get(commentId) as any;
    res.json({ success: true, likesCount: row?.likes_count || 1 });
  });

  // GET /api/clusters
  app.get('/api/clusters', (req, res) => {
    const rows = db.prepare('SELECT * FROM issue_clusters').all() as any[];
    const clusters: IssueCluster[] = rows.map(r => ({
      id: r.id,
      title: r.title,
      category: r.category as CivicCategory,
      region: r.region as GhanaRegionName,
      district: r.district,
      summary: r.summary,
      totalConfirmations: r.total_confirmations,
      trendScore: r.trend_score,
      status: r.status,
      primaryInstitutions: JSON.parse(r.primary_institutions_json || '[]'),
      postIds: [],
      firstReportedAt: r.created_at,
      lastUpdatedAt: r.updated_at
    }));
    res.json(clusters);
  });

  // GET /api/analytics
  app.get('/api/analytics', (req, res) => {
    const postRows = db.prepare("SELECT * FROM posts WHERE moderation_status = 'approved'").all() as any[];
    const postsList = postRows.map(rowToPost);

    const totalActivePosts = postsList.length;
    const totalIndependentConfirmations = postsList.reduce((acc, p) => acc + p.engagement.confirmations, 0);
    const totalInstitutionsAlerted = postsList.reduce((acc, p) => acc + p.institutionTags.length, 0);
    const totalOfficialResponses = postsList.reduce((acc, p) => acc + p.officialResponses.length, 0);

    const categoryCounts: Record<string, number> = {};
    postsList.forEach(p => {
      categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
    });

    const topCategories = Object.entries(categoryCounts).map(([category, count]) => ({
      category: category as CivicCategory,
      count,
      percentage: Math.round((count / (totalActivePosts || 1)) * 100)
    }));

    res.json({
      totalActivePosts,
      totalIndependentConfirmations,
      totalInstitutionsAlerted,
      totalOfficialResponses,
      totalPosts: totalActivePosts,
      totalConfirmations: totalIndependentConfirmations,
      responseRate: totalActivePosts > 0 ? Math.round((totalOfficialResponses / totalActivePosts) * 100) : 85,
      averageResponseTimeHours: 3.2,
      categoryBreakdown: topCategories,
      topCategories
    });
  });

  // GET /api/notifications
  app.get('/api/notifications', (req: AuthenticatedRequest, res) => {
    const userId = req.user?.id || 'user-current';
    const rows = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC').all(userId) as any[];
    const list: NotificationItem[] = rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      type: r.type,
      title: r.title,
      message: r.message,
      postId: r.post_id || undefined,
      institutionName: r.institution_name || undefined,
      read: Boolean(r.read),
      createdAt: r.created_at
    }));
    res.json(list);
  });

  // PUT /api/notifications/:id/read
  app.put('/api/notifications/:id/read', (req, res) => {
    db.prepare('UPDATE notifications SET read = 1 WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // POST /api/reports/abuse
  app.post('/api/reports/abuse', (req: AuthenticatedRequest, res) => {
    const { postId, reason, details } = req.body;
    const userId = req.user?.id || null;
    const reportId = `report-${Date.now()}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO abuse_reports (id, post_id, user_id, reason, details, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'PENDING', ?)
    `).run(reportId, postId, userId, reason, details || null, now);

    res.json({ success: true, message: 'Report submitted for review by platform safety team.' });
  });

  // --- GEMINI AI SERVICES WITH STRICT AI_UNAVAILABLE FALLBACK (PRD 202) ---

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
          status: 'AI_UNAVAILABLE',
          message: 'AI assistance unavailable. Please select category manually.'
        });
      }

      const instRows = db.prepare('SELECT id, official_name, acronym, mandate FROM institutions').all() as any[];
      const institutionList = instRows.map(i => `${i.id}: ${i.official_name} (${i.acronym}) - Mandate: ${i.mandate}`).join('\n');

      const ai = getGeminiClient();
      const systemPrompt = `You are the AI Civic Assistant for the Ghana Civic Awareness and Citizen Reporting Network.
Analyze the citizen's observation, voice transcript, or incident report.

Available Ghanaian Institutions to match from:
${institutionList}

Rules:
1. Identify primary category accurately.
2. Determine urgency (CRITICAL, HIGH, NORMAL, LOW) and severity.
3. Extract region, district, landmark.
4. Select 1 to 3 matching Ghanaian institution IDs.
5. Generate concise title and relevant hashtags.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: `Analyze this report:\n"""${contentToAnalyze}"""`,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              conciseTitle: { type: Type.STRING },
              refinedText: { type: Type.STRING },
              category: { type: Type.STRING },
              urgency: { type: Type.STRING, enum: ['CRITICAL', 'HIGH', 'NORMAL', 'LOW'] },
              severity: { type: Type.STRING, enum: ['EMERGENCY', 'SEVERE', 'MODERATE', 'INFORMATIONAL'] },
              region: { type: Type.STRING },
              district: { type: Type.STRING },
              matchedInstitutionIds: { type: Type.ARRAY, items: { type: Type.STRING } },
              hashtags: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ['conciseTitle', 'category', 'urgency', 'severity', 'matchedInstitutionIds', 'hashtags']
          }
        }
      });

      const json = JSON.parse(response.text || '{}');
      json.status = 'SUCCESS';
      res.json(json);
    } catch (err: any) {
      console.error('Gemini post analysis error:', err);
      res.json({
        status: 'AI_UNAVAILABLE',
        message: 'AI assistance unavailable. Please select category manually.'
      });
    }
  });

  // POST /api/ai/generate-share-copy
  app.post('/api/ai/generate-share-copy', async (req, res) => {
    const { postTitle = 'Civic Issue', category = 'Community Concern', location = 'Ghana', confirmationsCount = 0, institutionsTagged = 'Ghana Civic Authorities' } = req.body || {};
    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.json({
          whatsappCopy: `🚨 CIVIC ALERT: ${postTitle}\n📍 Location: ${location}\n👥 ${confirmationsCount} citizens independently observed this issue.\n🏛️ Tagged: ${institutionsTagged}\n🔗 Track on Ghana Civic Network`,
          twitterCopy: `🚨 Citizen Report: ${postTitle} around ${location}. ${confirmationsCount} residents seeing this too. @${institutionsTagged} #GhanaCivic #SpeakUp`
        });
      }

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: `Generate shareable copy for: ${postTitle} at ${location}`,
        config: {
          systemInstruction: 'Generate clear, non-sensational share copy for WhatsApp and X.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              whatsappCopy: { type: Type.STRING },
              twitterCopy: { type: Type.STRING }
            },
            required: ['whatsappCopy', 'twitterCopy']
          }
        }
      });

      res.json(JSON.parse(response.text || '{}'));
    } catch (err: any) {
      res.json({
        whatsappCopy: `🚨 CIVIC ALERT: ${postTitle}\n📍 Location: ${location}\n👥 ${confirmationsCount} citizens independently observed this issue.\n🏛️ Tagged: ${institutionsTagged}\n🔗 Track on Ghana Civic Network`,
        twitterCopy: `🚨 Citizen Report: ${postTitle} around ${location}. ${confirmationsCount} residents seeing this too. @${institutionsTagged} #GhanaCivic #SpeakUp`
      });
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
