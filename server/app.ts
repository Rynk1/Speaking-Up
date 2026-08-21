import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from './config';
import { db } from './database/db';
import { authMiddleware, requireAuth, requireRole, AuthenticatedRequest } from './middleware/auth.middleware';
import { authLimiter, createPostLimiter, commentLimiter, draftLimiter, abuseReportLimiter, apiLimiter } from './middleware/rateLimiters';
import { sanitizeText, sanitizePlainText } from './shared/sanitize';
import { logger } from './shared/logger';
import { BASE_UPLOAD_DIR, STORAGE_ZONES, verifySignedAccessToken, generateSignedAccessToken } from './storage';
import { processMediaFile } from './media/mediaPipeline';
import { PrivacyOrchestrator } from './privacy/privacyOrchestrator';
import { analyzeContextualSensitivity } from './detection/geminiDetector';
import { InstitutionAlertService } from './alerts/alertEngine';
import { jobQueue } from './jobs/jobQueue';
import { eventBus } from './events/eventBus';
import { setupSSERoute } from './events/sseStream';
import { GoogleGenAI } from '@google/genai';

export function createApp() {
  const app = express();

  // Middleware
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(authMiddleware);

  // Correlation ID middleware
  app.use((req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    req.correlationId = (req.headers['x-correlation-id'] as string) || `corr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    res.setHeader('X-Correlation-ID', req.correlationId);
    next();
  });

  // Serve uploads directory
  app.use('/uploads', express.static(BASE_UPLOAD_DIR));

  // Multer Storage Configuration
  const storageConfig = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, STORAGE_ZONES.PROCESSING);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
      cb(null, uniqueName);
    }
  });

  const upload = multer({
    storage: storageConfig,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB
  });

  // Health Checks
  app.get('/health/live', (req, res) => {
    res.json({ status: 'UP', uptimeSeconds: Math.floor(process.uptime()) });
  });

  app.get('/health/ready', (req, res) => {
    try {
      db.prepare('SELECT 1').get();
      res.json({ status: 'READY', database: 'HEALTHY' });
    } catch (err: any) {
      res.status(500).json({ status: 'UNHEALTHY', database: err.message });
    }
  });

  // Real-time SSE Stream
  app.get('/api/events', setupSSERoute);

  // AUTH ROUTES
  app.post('/api/auth/register', authLimiter, async (req, res) => {
    try {
      const { email, password, name, handle, role, phone, institutionId } = req.body;
      if (!email || !password || !name) {
        return res.status(400).json({ error: 'Email, password, and name are required' });
      }

      const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      if (existingUser) {
        return res.status(400).json({ error: 'Email is already registered' });
      }

      const userHandle = handle ? sanitizePlainText(handle) : `@${name.toLowerCase().replace(/\s+/g, '')}_${Math.floor(Math.random() * 1000)}`;
      const passwordHash = await bcrypt.hash(password, 10);
      const userId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const userRole = role || 'CITIZEN';
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO users (id, email, password_hash, name, handle, avatar, role, is_verified, followers_count, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)
      `).run(userId, email, passwordHash, sanitizePlainText(name), userHandle, `https://api.dicebear.com/7.x/bottts/svg?seed=${userHandle}`, userRole, now, now);

      if (userRole === 'INSTITUTION_REP' && institutionId) {
        db.prepare(`
          INSERT INTO institution_verifications (id, user_id, institution_id, verification_status, created_at)
          VALUES (?, ?, ?, 'PENDING', ?)
        `).run(`ver-${Date.now()}`, userId, institutionId, now);
      }

      const token = jwt.sign(
        { id: userId, email, name: sanitizePlainText(name), handle: userHandle, role: userRole, institutionId },
        config.jwtSecret,
        { expiresIn: '7d' }
      );

      res.status(201).json({
        token,
        user: { id: userId, email, name: sanitizePlainText(name), handle: userHandle, role: userRole, institutionId }
      });
    } catch (err: any) {
      logger.error(`Registration error: ${err.message}`);
      res.status(500).json({ error: 'Failed to register account' });
    }
  });

  app.post('/api/auth/login', authLimiter, async (req, res) => {
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

      const instVer = db.prepare('SELECT institution_id FROM institution_verifications WHERE user_id = ?').get(user.id) as any;
      const institutionId = instVer ? instVer.institution_id : undefined;

      const token = jwt.sign(
        { id: user.id, email: user.email, name: user.name, handle: user.handle, role: user.role, institutionId },
        config.jwtSecret,
        { expiresIn: '7d' }
      );

      res.json({
        token,
        user: { id: user.id, email: user.email, name: user.name, handle: user.handle, role: user.role, institutionId }
      });
    } catch (err: any) {
      logger.error(`Login error: ${err.message}`);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  app.get('/api/auth/me', (req: AuthenticatedRequest, res) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    const user = db.prepare('SELECT id, email, name, handle, role, avatar, is_verified FROM users WHERE id = ?').get(req.user.id);
    res.json(user);
  });

  // DRAFTS ROUTES - Protected against IDOR
  app.post('/api/drafts', requireAuth, draftLimiter, (req: AuthenticatedRequest, res) => {
    const userId = req.user!.id;
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

  app.get('/api/drafts', requireAuth, draftLimiter, (req: AuthenticatedRequest, res) => {
    const userId = req.user!.id;
    const draftId = `draft-${userId}`;
    const row = db.prepare('SELECT draft_data_json FROM drafts WHERE id = ? AND user_id = ?').get(draftId, userId) as any;
    if (!row) return res.json(null);
    res.json(JSON.parse(row.draft_data_json));
  });

  // MEDIA ROUTES
  app.post('/api/media/upload', upload.single('file'), async (req: AuthenticatedRequest, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const processResult = await processMediaFile(req.file.filename);
    const publicUrl = `/uploads/public/${req.file.filename}`;

    let fileType = 'image';
    if (req.file.mimetype.startsWith('audio/')) fileType = 'audio';
    else if (req.file.mimetype.startsWith('video/')) fileType = 'video';

    res.json({
      id: `media-${Date.now()}`,
      url: publicUrl,
      type: fileType,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size
    });
  });

  app.get('/api/media/protected/:filename', authMiddleware, (req: AuthenticatedRequest, res) => {
    const filename = req.params.filename;
    const token = req.query.token as string;

    if (!token) return res.status(403).json({ error: 'Access token required for protected evidence' });

    const verified = verifySignedAccessToken(token);
    if (!verified) return res.status(403).json({ error: 'Invalid or expired evidence access token' });

    const protectedFilePath = path.join(STORAGE_ZONES.PROTECTED, filename);
    if (!fs.existsSync(protectedFilePath)) {
      return res.status(404).json({ error: 'Protected evidence object not found' });
    }

    if (req.user) {
      db.prepare(`
        INSERT INTO evidence_access_logs (id, submission_id, actor_id, institution_id, action, timestamp, ip, reason, result)
        VALUES (?, ?, ?, ?, 'VIEW_PROTECTED', ?, ?, 'INVESTIGATION', 'ALLOWED')
      `).run(`log-${Date.now()}`, verified.submissionId, req.user.id, req.user.institutionId || null, new Date().toISOString(), req.ip || '127.0.0.1');
    }

    res.sendFile(protectedFilePath);
  });

  // POSTS ROUTES
  app.get('/api/posts', (req, res) => {
    try {
      const { category, region, district, urgency, search } = req.query;
      let sql = 'SELECT * FROM posts WHERE moderation_status = "approved"';
      const params: any[] = [];

      if (category && category !== 'ALL') {
        sql += ' AND category = ?';
        params.push(category);
      }
      if (region && region !== 'ALL') {
        sql += ' AND region = ?';
        params.push(region);
      }
      if (district && district !== 'ALL') {
        sql += ' AND district = ?';
        params.push(district);
      }
      if (urgency && urgency !== 'ALL') {
        sql += ' AND urgency = ?';
        params.push(urgency);
      }

      sql += ' ORDER BY created_at DESC';
      const rows = db.prepare(sql).all(...params) as any[];

      const posts = rows.map(row => {
        const tagsRows = db.prepare('SELECT * FROM post_institution_tags WHERE post_id = ?').all(row.id) as any[];
        const mediaRows = db.prepare('SELECT * FROM media WHERE post_id = ?').all(row.id) as any[];
        const responsesRows = db.prepare('SELECT * FROM institution_responses WHERE post_id = ? ORDER BY created_at DESC').all(row.id) as any[];

        return {
          id: row.id,
          title: row.title,
          content: row.content,
          originalLanguage: row.original_language,
          author: {
            id: row.author_id,
            name: row.author_name,
            handle: row.author_handle,
            avatar: row.author_avatar,
            visibility: row.author_visibility,
            isVerifiedCitizen: Boolean(row.is_verified_citizen)
          },
          category: row.category,
          subcategory: row.subcategory,
          urgency: row.urgency,
          severity: row.severity,
          location: {
            region: row.region,
            district: row.district,
            landmark: row.landmark,
            latitude: row.latitude || undefined,
            longitude: row.longitude || undefined
          },
          institutionTags: tagsRows.map(t => ({
            institutionId: t.institution_id,
            institutionName: t.institution_name,
            shortName: t.short_name,
            acronym: t.acronym,
            alertRequested: Boolean(t.alert_requested),
            alertStatus: t.alert_status,
            alertMethodUsed: t.alert_method_used,
            deliveryTimestamp: t.delivery_timestamp
          })),
          media: mediaRows.map(m => ({ id: m.id, url: m.url, type: m.type })),
          officialResponses: responsesRows.map(r => ({
            id: r.id,
            institutionId: r.institution_id,
            institutionName: r.institution_name,
            institutionLogo: r.institution_logo,
            responseType: r.response_type,
            message: r.message,
            statementTitle: r.statement_title,
            fullStatement: r.full_statement,
            referenceNumber: r.reference_number,
            resolutionStatus: r.resolution_status || 'IN_PROGRESS',
            helpfulCount: r.helpful_count || 0,
            unhelpfulCount: r.unhelpful_count || 0,
            official: Boolean(r.official),
            verified: Boolean(r.verified),
            responderName: r.responder_name,
            responderTitle: r.responder_title,
            createdAt: r.created_at
          })),
          confirmationsCount: row.confirmations_count,
          repostsCount: row.reposts_count,
          sharesCount: row.shares_count,
          commentsCount: row.comments_count,
          createdAt: row.created_at,
          reportLifecycleStatus: row.report_lifecycle_status || 'PUBLISHED',
          accountabilityStatus: row.accountability_status || 'NOT_ROUTED'
        };
      });

      res.json(posts);
    } catch (err: any) {
      logger.error(`Error fetching posts: ${err.message}`);
      res.status(500).json({ error: 'Failed to fetch posts' });
    }
  });

  app.post('/api/posts', requireAuth, createPostLimiter, async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user!;
      const { title, content, category, subcategory, urgency, severity, location, institutionTags, media } = req.body;

      if (!title || !content || !category || !location || !location.region || !location.district) {
        return res.status(400).json({ error: 'Missing required report fields' });
      }

      const postId = `post-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();
      const sanitizedTitle = sanitizePlainText(title);
      const sanitizedContent = sanitizeText(content);

      // Insert post immediately into SQLite
      db.prepare(`
        INSERT INTO posts (id, title, content, author_id, author_name, author_handle, author_avatar, category, subcategory, urgency, severity, region, district, landmark, latitude, longitude, hashtags_json, report_lifecycle_status, accountability_status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', 'PUBLISHED', 'NOT_ROUTED', ?, ?)
      `).run(
        postId,
        sanitizedTitle,
        sanitizedContent,
        user.id,
        user.name,
        user.handle,
        `https://api.dicebear.com/7.x/bottts/svg?seed=${user.handle}`,
        category,
        subcategory || null,
        urgency || 'NORMAL',
        severity || 'MODERATE',
        location.region,
        location.district,
        location.landmark ? sanitizePlainText(location.landmark) : null,
        location.latitude || null,
        location.longitude || null,
        now,
        now
      );

      // Media persistence
      if (Array.isArray(media)) {
        for (const m of media) {
          db.prepare(`
            INSERT INTO media (id, post_id, type, url, mime_type, uploaded_at)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(`med-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`, postId, m.type || 'image', m.url, m.mimeType || 'image/jpeg', now);
        }
      }

      // Tag persistence & alert queuing
      if (Array.isArray(institutionTags)) {
        for (const tag of institutionTags) {
          const instId = tag.institutionId || tag.id;
          const instRow = db.prepare('SELECT * FROM institutions WHERE id = ?').get(instId) as any;
          if (instRow) {
            db.prepare(`
              INSERT INTO post_institution_tags (id, post_id, institution_id, institution_name, short_name, acronym, alert_requested, alert_status, created_at)
              VALUES (?, ?, ?, ?, ?, ?, 1, 'QUEUED', ?)
            `).run(`tag-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`, postId, instRow.id, instRow.official_name, instRow.short_name, instRow.acronym, now);

            // Enqueue durable background job for alert dispatch
            await jobQueue.enqueue('DISPATCH_ALERT', { postId, institutionId: instRow.id });
          }
        }
      }

      // Enqueue durable background job for P³RE privacy processing
      await jobQueue.enqueue('PROCESS_PRIVACY', {
        submissionId: postId,
        authorId: user.id,
        title: sanitizedTitle,
        content: sanitizedContent,
        media
      });

      // Emit REPORT_CREATED event
      eventBus.emitReportEvent({
        reportId: postId,
        eventType: 'REPORT_CREATED',
        actorType: 'CITIZEN',
        actorId: user.id,
        metadata: { title: sanitizedTitle, region: location.region, district: location.district }
      });

      const newPost = db.prepare('SELECT * FROM posts WHERE id = ?').get(postId) as any;
      res.status(201).json({
        id: newPost.id,
        title: newPost.title,
        content: newPost.content,
        category: newPost.category,
        urgency: newPost.urgency,
        location: { region: newPost.region, district: newPost.district, landmark: newPost.landmark },
        createdAt: newPost.created_at,
        reportLifecycleStatus: newPost.report_lifecycle_status,
        accountabilityStatus: newPost.accountability_status
      });
    } catch (err: any) {
      logger.error(`Post creation failure: ${err.message}`);
      res.status(500).json({ error: 'Failed to publish civic report' });
    }
  });

  // ALERT DISPATCH API
  app.post('/api/posts/:id/alert', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const postId = req.params.id;
      const { institutionId } = req.body;
      const result = await InstitutionAlertService.dispatchAlert(postId, institutionId);
      res.json({ success: true, alertResult: result });
    } catch (err: any) {
      logger.error(`Alert dispatch endpoint error: ${err.message}`);
      res.status(500).json({ error: err.message || 'Alert dispatch failed' });
    }
  });

  // INSTITUTION RESPONSE API
  app.post('/api/posts/:id/response', requireRole(['INSTITUTION_REP', 'ADMIN']), async (req: AuthenticatedRequest, res) => {
    try {
      const postId = req.params.id;
      const user = req.user!;
      const { institutionId, responseType, message, statementTitle, fullStatement, referenceNumber, resolutionStatus, responderName, responderTitle } = req.body;

      if (!message || !institutionId) {
        return res.status(400).json({ error: 'Message and institution ID are required' });
      }

      const instRow = db.prepare('SELECT * FROM institutions WHERE id = ?').get(institutionId) as any;
      if (!instRow) return res.status(404).json({ error: 'Institution not found' });

      const respId = `resp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO institution_responses (id, post_id, institution_id, institution_name, institution_logo, response_type, message, statement_title, full_statement, reference_number, resolution_status, responder_name, responder_title, official, verified, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?)
      `).run(
        respId,
        postId,
        instRow.id,
        instRow.official_name,
        instRow.logo || null,
        responseType || 'WE_ARE_AWARE',
        sanitizeText(message),
        statementTitle ? sanitizePlainText(statementTitle) : null,
        fullStatement ? sanitizeText(fullStatement) : null,
        referenceNumber ? sanitizePlainText(referenceNumber) : null,
        resolutionStatus || 'IN_PROGRESS',
        responderName ? sanitizePlainText(responderName) : user.name,
        responderTitle ? sanitizePlainText(responderTitle) : 'Official Spokesperson',
        now
      );

      db.prepare("UPDATE posts SET accountability_status = ? WHERE id = ?")
        .run(resolutionStatus === 'RESOLVED' ? 'RESOLVED' : 'RESPONDED', postId);

      eventBus.emitReportEvent({
        reportId: postId,
        eventType: resolutionStatus === 'RESOLVED' ? 'REPORT_RESOLVED' : 'INSTITUTION_RESPONSE_CREATED',
        actorType: 'INSTITUTION',
        actorId: user.id,
        institutionId: instRow.id,
        metadata: { responseId: respId, status: resolutionStatus }
      });

      res.status(201).json({ success: true, responseId: respId });
    } catch (err: any) {
      logger.error(`Response submission error: ${err.message}`);
      res.status(500).json({ error: 'Failed to submit official response' });
    }
  });

  // INSTITUTION DIRECTORY API
  app.get('/api/institutions', (req, res) => {
    const insts = db.prepare('SELECT * FROM institutions ORDER BY official_name ASC').all() as any[];
    res.json(insts.map(i => ({
      id: i.id,
      officialName: i.official_name,
      shortName: i.short_name,
      acronym: i.acronym,
      mandate: i.mandate,
      category: i.category,
      jurisdiction: i.jurisdiction,
      logo: i.logo,
      alertMethod: i.alert_method,
      activeMentionsCount: i.active_mentions_count,
      unansweredMentionsCount: i.unanswered_mentions_count,
      officialResponsesCount: i.official_responses_count,
      avgResponseTimeHours: i.avg_response_hours,
      verificationStatus: i.verification_status
    })));
  });

  // CLUSTERS & ANALYTICS
  app.get('/api/clusters', (req, res) => {
    const clusters = db.prepare('SELECT * FROM issue_clusters ORDER BY trend_score DESC').all() as any[];
    res.json(clusters.map(c => ({
      id: c.id,
      title: c.title,
      category: c.category,
      region: c.region,
      district: c.district,
      summary: c.summary,
      totalConfirmations: c.total_confirmations,
      trendScore: c.trend_score,
      status: c.status,
      primaryInstitutions: JSON.parse(c.primary_institutions_json || '[]')
    })));
  });

  app.get('/api/analytics', (req, res) => {
    const totalPosts = (db.prepare('SELECT COUNT(*) as c FROM posts').get() as any)?.c || 0;
    const totalConfirmations = (db.prepare('SELECT SUM(confirmations_count) as c FROM posts').get() as any)?.c || 0;
    const totalResponses = (db.prepare('SELECT COUNT(*) as c FROM institution_responses').get() as any)?.c || 0;

    res.json({
      totalPosts,
      totalConfirmations,
      totalResponses,
      activeClustersCount: 8,
      avgResponseHours: 4.2
    });
  });

  // NOTIFICATIONS
  app.get('/api/notifications', requireAuth, (req: AuthenticatedRequest, res) => {
    const notifs = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30').all(req.user!.id) as any[];
    res.json(notifs.map(n => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      postId: n.post_id,
      read: Boolean(n.read),
      createdAt: n.created_at
    })));
  });

  // AI SERVICES
  app.post('/api/ai/analyze-post', async (req, res) => {
    if (!config.geminiApiKey) {
      return res.json({ status: 'AI_UNAVAILABLE', message: 'AI assistance unavailable. Please select category manually.' });
    }
    try {
      const { text } = req.body;
      const result = await analyzeContextualSensitivity(text || '', []);
      res.json({ status: 'SUCCESS', ...result });
    } catch (err) {
      res.json({ status: 'AI_UNAVAILABLE', message: 'AI service unavailable.' });
    }
  });

  app.post('/api/ai/generate-share-copy', async (req, res) => {
    const { postTitle, location, confirmationsCount, institutionsTagged } = req.body;
    res.json({
      whatsappCopy: `🚨 CIVIC ALERT: ${postTitle}\n📍 Location: ${location}\n👥 ${confirmationsCount || 1} citizens independently observed this issue.\n🏛️ Tagged: ${institutionsTagged}\n🔗 Track on Speak Up Ghana`,
      twitterCopy: `🚨 Citizen Report: ${postTitle} around ${location}. ${confirmationsCount || 1} residents seeing this too. @${institutionsTagged} #GhanaCivic #SpeakUp`
    });
  });

  return app;
}
