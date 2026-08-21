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
  app.use(
    helmet({
      contentSecurityPolicy: false,
      frameguard: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: false,
      crossOriginOpenerPolicy: false,
    })
  );
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

  // AUTH UTILITIES & NORMALIZERS
  const normalizeEmail = (input?: string | null): string | null => {
    if (!input) return null;
    const trimmed = input.trim().toLowerCase();
    return trimmed.length > 0 ? trimmed : null;
  };

  const normalizePhone = (input?: string | null): string | null => {
    if (!input) return null;
    let cleaned = input.trim().replace(/[\s\-\(\)]/g, '');
    if (!cleaned) return null;
    // Ghana local format: 0244123456 -> +233244123456
    if (/^0\d{9}$/.test(cleaned)) {
      return `+233${cleaned.substring(1)}`;
    }
    // Ghana prefix without plus: 233244123456 -> +233244123456
    if (/^233\d{9}$/.test(cleaned)) {
      return `+${cleaned}`;
    }
    return cleaned;
  };

  // REAL-TIME DUPLICATE ACCOUNT CHECK ENDPOINT
  app.post('/api/auth/check-duplicate', authLimiter, async (req, res) => {
    try {
      const { email, phone } = req.body;
      const normEmail = normalizeEmail(email);
      const normPhone = normalizePhone(phone);

      let emailUser: any = null;
      let phoneUser: any = null;

      if (normEmail) {
        emailUser = db.prepare('SELECT id, email, name, role, auth_provider FROM users WHERE LOWER(email) = ?').get(normEmail);
      }
      if (normPhone) {
        phoneUser = db.prepare('SELECT id, phone, name, role, auth_provider FROM users WHERE phone = ?').get(normPhone);
      }

      if (emailUser || phoneUser) {
        const matchUser = emailUser || phoneUser;
        const isEmailConflict = !!emailUser;
        const isPhoneConflict = !!phoneUser;

        let conflictType = 'email';
        if (isEmailConflict && isPhoneConflict) conflictType = 'both';
        else if (isPhoneConflict) conflictType = 'phone';

        let suggestedAction = 'signin';
        if (matchUser.auth_provider === 'google') suggestedAction = 'google_signin';
        else if (matchUser.auth_provider === 'phone' || isPhoneConflict) suggestedAction = 'phone_signin';

        return res.json({
          exists: true,
          conflictType,
          authProvider: matchUser.auth_provider || 'email',
          suggestedAction,
          message: isEmailConflict
            ? `An account with ${normEmail} is already registered (${matchUser.auth_provider === 'google' ? 'Google Sign-In' : 'Email/Password'}).`
            : `Mobile number ${normPhone} is already registered.`
        });
      }

      res.json({ exists: false, message: 'Available' });
    } catch (err: any) {
      logger.error(`Duplicate check error: ${err.message}`);
      res.status(500).json({ error: 'Failed to verify account availability' });
    }
  });

  // AUTH ROUTES
  app.post('/api/auth/register', authLimiter, async (req, res) => {
    try {
      const { email, password, name, handle, phone } = req.body;
      const normEmail = normalizeEmail(email);
      const normPhone = normalizePhone(phone);

      if (!normEmail || !password || !name) {
        return res.status(400).json({ error: 'Email, password, and full name are required' });
      }

      const existingUser = db.prepare('SELECT id, auth_provider FROM users WHERE LOWER(email) = ?').get(normEmail) as any;
      if (existingUser) {
        if (existingUser.auth_provider === 'google') {
          return res.status(400).json({
            error: 'An account with this email is already registered via Google Sign-In. Please sign in with Google.',
            suggestedAction: 'google_signin'
          });
        }
        return res.status(400).json({
          error: 'An account with this email already exists. Please sign in instead.',
          suggestedAction: 'signin'
        });
      }

      if (normPhone) {
        const existingPhone = db.prepare('SELECT id, auth_provider FROM users WHERE phone = ?').get(normPhone) as any;
        if (existingPhone) {
          return res.status(400).json({
            error: 'An account with this mobile number already exists. Please sign in or use a different number.',
            suggestedAction: 'phone_signin'
          });
        }
      }

      // ENFORCED: Public signup is strictly for CITIZENS (No admin or institutional signups)
      const userRole = 'CITIZEN';
      const userHandle = handle ? sanitizePlainText(handle) : `@${name.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Math.floor(100 + Math.random() * 900)}`;
      const passwordHash = await bcrypt.hash(password, 10);
      const userId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();
      const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(userHandle)}`;

      db.prepare(`
        INSERT INTO users (id, email, password_hash, name, handle, avatar, role, is_verified, followers_count, phone, auth_provider, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, ?, 'email', ?, ?)
      `).run(userId, normEmail, passwordHash, sanitizePlainText(name.trim()), userHandle, avatarUrl, userRole, normPhone, now, now);

      const token = jwt.sign(
        { id: userId, email: normEmail, name: sanitizePlainText(name.trim()), handle: userHandle, role: userRole, phone: normPhone },
        config.jwtSecret,
        { expiresIn: '7d' }
      );

      res.status(201).json({
        token,
        user: { id: userId, email: normEmail, name: sanitizePlainText(name.trim()), handle: userHandle, role: userRole, avatar: avatarUrl, phone: normPhone }
      });
    } catch (err: any) {
      logger.error(`Registration error: ${err.message}`);
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'An account with these credentials already exists. Please sign in.' });
      }
      res.status(500).json({ error: 'Failed to register citizen account. Please try again.' });
    }
  });

  app.post('/api/auth/login', authLimiter, async (req, res) => {
    try {
      const { email, password, identifier } = req.body;
      const rawId = (identifier || email || '').trim();
      if (!rawId || !password) {
        return res.status(400).json({ error: 'Email/mobile number and password are required' });
      }

      const normEmail = normalizeEmail(rawId);
      const normPhone = normalizePhone(rawId);

      // Check by email or phone
      const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = ? OR phone = ?').get(normEmail || rawId.toLowerCase(), normPhone || rawId) as any;
      if (!user) {
        return res.status(401).json({ error: 'Invalid email/phone or password' });
      }

      if (!user.password_hash) {
        return res.status(400).json({ error: `This account was created with ${user.auth_provider || 'Google/Phone'}. Please use that sign-in method.` });
      }

      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid email/phone or password' });
      }

      const instVer = db.prepare('SELECT institution_id FROM institution_verifications WHERE user_id = ?').get(user.id) as any;
      const institutionId = instVer ? instVer.institution_id : undefined;

      const token = jwt.sign(
        { id: user.id, email: user.email, name: user.name, handle: user.handle, role: user.role, institutionId, phone: user.phone },
        config.jwtSecret,
        { expiresIn: '7d' }
      );

      res.json({
        token,
        user: { id: user.id, email: user.email, name: user.name, handle: user.handle, role: user.role, avatar: user.avatar, phone: user.phone, institutionId }
      });
    } catch (err: any) {
      logger.error(`Login error: ${err.message}`);
      res.status(500).json({ error: 'Login failed. Please verify credentials.' });
    }
  });

  // GOOGLE SIGN-IN / SIGN-UP (Automatic Account Unification & Deduplication)
  app.post('/api/auth/google', authLimiter, async (req, res) => {
    try {
      const { email, name, avatar, googleId } = req.body;
      const normEmail = normalizeEmail(email);
      if (!normEmail) {
        return res.status(400).json({ error: 'Valid Google email is required' });
      }

      let user = db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(normEmail) as any;
      const now = new Date().toISOString();

      if (user) {
        // Link existing user without creating a duplicate record
        if (avatar && (!user.avatar || user.avatar.includes('dicebear'))) {
          db.prepare('UPDATE users SET avatar = ?, updated_at = ? WHERE id = ?').run(avatar, now, user.id);
          user.avatar = avatar;
        }
        if (googleId && !user.google_id) {
          db.prepare('UPDATE users SET google_id = ?, updated_at = ? WHERE id = ?').run(googleId, now, user.id);
          user.google_id = googleId;
        }
      } else {
        // Create new citizen user via Google
        const displayName = name ? sanitizePlainText(name.trim()) : normEmail.split('@')[0];
        const userHandle = `@${displayName.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Math.floor(100 + Math.random() * 900)}`;
        const userId = `user-g-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const avatarUrl = avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(userHandle)}`;
        const dummyHash = await bcrypt.hash(`google-auth-${Date.now()}-${Math.random()}`, 10);

        db.prepare(`
          INSERT INTO users (id, email, password_hash, name, handle, avatar, role, is_verified, followers_count, auth_provider, google_id, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, 'CITIZEN', 1, 0, 'google', ?, ?, ?)
        `).run(userId, normEmail, dummyHash, displayName, userHandle, avatarUrl, googleId || `g-${Date.now()}`, now, now);

        user = {
          id: userId,
          email: normEmail,
          name: displayName,
          handle: userHandle,
          avatar: avatarUrl,
          role: 'CITIZEN'
        };
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, name: user.name, handle: user.handle, role: user.role, phone: user.phone },
        config.jwtSecret,
        { expiresIn: '7d' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          handle: user.handle,
          avatar: user.avatar,
          role: user.role || 'CITIZEN',
          phone: user.phone
        }
      });
    } catch (err: any) {
      logger.error(`Google auth error: ${err.message}`);
      res.status(500).json({ error: 'Google authentication failed' });
    }
  });

  // MOBILE PHONE OTP DISPATCH
  app.post('/api/auth/phone/send-otp', authLimiter, async (req, res) => {
    try {
      const { phone } = req.body;
      const cleanPhone = normalizePhone(phone);
      if (!cleanPhone || cleanPhone.length < 8) {
        return res.status(400).json({ error: 'Please provide a valid mobile number (e.g. 0244123456 or +233...)' });
      }

      // Generate a secure 6-digit OTP code
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO phone_verifications (phone, otp_code, expires_at, created_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(phone) DO UPDATE SET otp_code = excluded.otp_code, expires_at = excluded.expires_at, created_at = excluded.created_at
      `).run(cleanPhone, otpCode, expiresAt, now);

      logger.info(`[SMS Dispatch Simulation] Verification OTP for mobile ${cleanPhone}: ${otpCode}`);

      // Check if user already exists for phone
      const existingUser = db.prepare('SELECT id, name, email FROM users WHERE phone = ?').get(cleanPhone) as any;

      res.json({
        success: true,
        message: `Verification code dispatched to ${cleanPhone}`,
        phone: cleanPhone,
        isExistingUser: !!existingUser,
        demoOtp: otpCode // Provided for quick auto-fill testing in web container
      });
    } catch (err: any) {
      logger.error(`Phone OTP send error: ${err.message}`);
      res.status(500).json({ error: 'Failed to send SMS verification code' });
    }
  });

  // MOBILE PHONE OTP VERIFY & SIGN IN / SIGN UP (Deduplicated)
  app.post('/api/auth/phone/verify-otp', authLimiter, async (req, res) => {
    try {
      const { phone, otpCode, name } = req.body;
      const cleanPhone = normalizePhone(phone);
      if (!cleanPhone || !otpCode) {
        return res.status(400).json({ error: 'Phone number and 6-digit verification code are required' });
      }

      const verification = db.prepare('SELECT * FROM phone_verifications WHERE phone = ?').get(cleanPhone) as any;

      if (!verification) {
        return res.status(400).json({ error: 'No verification code requested for this number. Please request a code first.' });
      }

      if (new Date(verification.expires_at).getTime() < Date.now()) {
        return res.status(400).json({ error: 'Verification code has expired. Please request a new code.' });
      }

      if (verification.otp_code !== otpCode.trim()) {
        return res.status(400).json({ error: 'Invalid verification code. Please check and try again.' });
      }

      // Clear the used OTP
      db.prepare('DELETE FROM phone_verifications WHERE phone = ?').run(cleanPhone);

      const now = new Date().toISOString();
      let user = db.prepare('SELECT * FROM users WHERE phone = ?').get(cleanPhone) as any;

      if (!user) {
        // Create new citizen user via Mobile
        const displayName = name ? sanitizePlainText(name.trim()) : `Citizen ${cleanPhone.slice(-4)}`;
        const userHandle = `@citizen_${cleanPhone.replace(/[^0-9]/g, '').slice(-6)}_${Math.floor(10 + Math.random() * 90)}`;
        const dummyEmail = `${cleanPhone.replace(/[^0-9]/g, '')}@mobile.speakup.gov.gh`;
        const userId = `user-p-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(userHandle)}`;
        const dummyHash = await bcrypt.hash(`phone-auth-${Date.now()}`, 10);

        db.prepare(`
          INSERT INTO users (id, email, password_hash, name, handle, avatar, role, is_verified, followers_count, phone, auth_provider, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, 'CITIZEN', 1, 0, ?, 'phone', ?, ?)
        `).run(userId, dummyEmail, dummyHash, displayName, userHandle, avatarUrl, cleanPhone, now, now);

        user = {
          id: userId,
          email: dummyEmail,
          name: displayName,
          handle: userHandle,
          avatar: avatarUrl,
          phone: cleanPhone,
          role: 'CITIZEN'
        };
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, name: user.name, handle: user.handle, role: user.role, phone: user.phone },
        config.jwtSecret,
        { expiresIn: '7d' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          handle: user.handle,
          avatar: user.avatar,
          phone: user.phone,
          role: user.role || 'CITIZEN'
        }
      });
    } catch (err: any) {
      logger.error(`Phone verify error: ${err.message}`);
      res.status(500).json({ error: 'Failed to verify phone code' });
    }
  });

  app.get('/api/auth/me', (req: AuthenticatedRequest, res) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    const user = db.prepare('SELECT id, email, name, handle, role, avatar, phone, auth_provider, is_verified FROM users WHERE id = ?').get(req.user.id);
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
      let sql = "SELECT * FROM posts WHERE moderation_status = 'approved'";
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

        let hashtags: string[] = [];
        try {
          if (row.hashtags_json) {
            hashtags = JSON.parse(row.hashtags_json);
          }
        } catch {
          hashtags = [];
        }

        return {
          id: row.id,
          title: row.title,
          content: row.content,
          originalLanguage: row.original_language || 'English',
          translatedText: row.translated_text || undefined,
          authorId: row.author_id,
          authorName: row.author_name,
          authorHandle: row.author_handle,
          authorAvatar: row.author_avatar || undefined,
          authorVisibility: row.author_visibility || 'public',
          isVerifiedCitizen: Boolean(row.is_verified_citizen),
          followersCount: 0,
          category: row.category,
          subcategory: row.subcategory || undefined,
          urgency: row.urgency,
          severity: row.severity,
          hashtags,
          issueClusterId: row.issue_cluster_id || undefined,
          visibility: row.visibility || 'public',
          moderationStatus: row.moderation_status || 'approved',
          location: {
            region: row.region,
            district: row.district,
            landmark: row.landmark,
            latitude: row.latitude || undefined,
            longitude: row.longitude || undefined,
            accuracy: row.location_accuracy || 'exact',
            visibility: row.location_visibility || 'exact'
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
          suggestedInstitutions: [],
          media: mediaRows.map(m => ({
            id: m.id,
            type: m.type || 'image',
            url: m.url,
            thumbnailUrl: m.thumbnail_url,
            caption: m.caption,
            uploadedAt: m.uploaded_at
          })),
          credibilitySignals: {
            confirmationsCount: row.confirmations_count || 0,
            evidenceCount: 0,
            hasMedia: mediaRows.length > 0,
            hasLocation: Boolean(row.region && row.district),
            institutionalAwarenessScore: responsesRows.length > 0 ? 90 : 50
          },
          engagement: {
            views: row.views_count || 1,
            reposts: row.reposts_count || 0,
            shares: row.shares_count || 0,
            confirmations: row.confirmations_count || 0,
            comments: row.comments_count || 0,
            followersCount: 0
          },
          officialResponses: responsesRows.map(r => ({
            id: r.id,
            postId: r.post_id || row.id,
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
          communityEvidence: [],
          commentsList: [],
          confirmationsCount: row.confirmations_count,
          repostsCount: row.reposts_count,
          sharesCount: row.shares_count,
          commentsCount: row.comments_count,
          createdAt: row.created_at,
          updatedAt: row.updated_at || row.created_at,
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

  app.get('/api/clusters/:id', (req, res) => {
    try {
      const clusterId = req.params.id;
      const clusterRow = db.prepare('SELECT * FROM issue_clusters WHERE id = ?').get(clusterId) as any;
      if (!clusterRow) {
        return res.status(404).json({ error: 'Cluster not found' });
      }

      const cluster = {
        id: clusterRow.id,
        title: clusterRow.title,
        category: clusterRow.category,
        region: clusterRow.region,
        district: clusterRow.district,
        summary: clusterRow.summary,
        totalConfirmations: clusterRow.total_confirmations,
        trendScore: clusterRow.trend_score,
        status: clusterRow.status,
        primaryInstitutions: JSON.parse(clusterRow.primary_institutions_json || '[]')
      };

      // Get posts belonging to or associated with this cluster
      let postsRows = db.prepare("SELECT * FROM posts WHERE (issue_cluster_id = ? OR (category = ? AND district = ?)) AND moderation_status = 'approved' ORDER BY created_at DESC LIMIT 20")
        .all(clusterId, clusterRow.category, clusterRow.district) as any[];

      // If no exact match, grab top posts in that category as fallback
      if (postsRows.length === 0) {
        postsRows = db.prepare("SELECT * FROM posts WHERE category = ? AND moderation_status = 'approved' ORDER BY confirmations_count DESC LIMIT 10")
          .all(clusterRow.category) as any[];
      }

      const posts = postsRows.map(row => {
        const tagsRows = db.prepare('SELECT * FROM post_institution_tags WHERE post_id = ?').all(row.id) as any[];
        const mediaRows = db.prepare('SELECT * FROM media WHERE post_id = ?').all(row.id) as any[];
        const responsesRows = db.prepare('SELECT * FROM institution_responses WHERE post_id = ? ORDER BY created_at DESC').all(row.id) as any[];

        return {
          id: row.id,
          title: row.title,
          content: row.content,
          authorName: row.author_name,
          authorHandle: row.author_handle,
          category: row.category,
          urgency: row.urgency,
          location: { region: row.region, district: row.district, landmark: row.landmark },
          engagement: { confirmations: row.confirmations_count || 0 },
          institutionTags: tagsRows.map(t => ({ shortName: t.short_name, alertStatus: t.alert_status })),
          officialResponses: responsesRows.map(r => ({
            id: r.id,
            institutionName: r.institution_name,
            message: r.message,
            responderName: r.responder_name,
            responderTitle: r.responder_title
          })),
          createdAt: row.created_at
        };
      });

      res.json({ cluster, posts });
    } catch (err: any) {
      logger.error(`Error fetching cluster details: ${err.message}`);
      res.status(500).json({ error: 'Failed to fetch cluster details' });
    }
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
  app.get('/api/notifications', (req: AuthenticatedRequest, res) => {
    try {
      const authHeader = req.headers.authorization;
      let userId: string | null = null;
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
          const decoded = jwt.verify(token, config.jwtSecret) as any;
          userId = decoded.id;
        } catch {
          // invalid token, fallback to guest
        }
      }

      let notifs: any[] = [];
      if (userId) {
        notifs = db.prepare("SELECT * FROM notifications WHERE user_id = ? OR user_id IS NULL OR user_id = 'all' ORDER BY created_at DESC LIMIT 30").all(userId) as any[];
      } else {
        notifs = db.prepare("SELECT * FROM notifications WHERE user_id IS NULL OR user_id = 'user-current' OR user_id = 'all' ORDER BY created_at DESC LIMIT 20").all() as any[];
      }

      res.json(notifs.map(n => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        postId: n.post_id,
        read: Boolean(n.read),
        createdAt: n.created_at
      })));
    } catch (err: any) {
      logger.error(`Notifications fetch error: ${err.message}`);
      res.json([]);
    }
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

  // ADMIN & SYSTEM MANAGEMENT ENDPOINTS
  app.get('/api/admin/overview', requireRole(['ADMIN', 'MODERATOR']), (req, res) => {
    try {
      const totalUsers = (db.prepare('SELECT COUNT(*) as c FROM users').get() as any)?.c || 0;
      const totalPosts = (db.prepare('SELECT COUNT(*) as c FROM posts').get() as any)?.c || 0;
      const pendingAbuse = (db.prepare("SELECT COUNT(*) as c FROM abuse_reports WHERE status = 'PENDING'").get() as any)?.c || 0;
      const queuedJobs = (db.prepare("SELECT COUNT(*) as c FROM jobs WHERE status = 'QUEUED'").get() as any)?.c || 0;
      const failedJobs = (db.prepare("SELECT COUNT(*) as c FROM jobs WHERE status = 'FAILED'").get() as any)?.c || 0;
      const activeInstitutions = (db.prepare('SELECT COUNT(*) as c FROM institutions').get() as any)?.c || 0;
      const pendingPrivacy = (db.prepare("SELECT COUNT(*) as c FROM submissions WHERE privacy_status = 'PRIVACY_PROCESSING'").get() as any)?.c || 0;

      res.json({
        totalUsers,
        totalPosts,
        pendingAbuse,
        queuedJobs,
        failedJobs,
        activeInstitutions,
        pendingPrivacy,
        systemHealth: 'HEALTHY',
        databaseStatus: 'CONNECTED'
      });
    } catch (err: any) {
      logger.error(`Admin overview error: ${err.message}`);
      res.status(500).json({ error: 'Failed to fetch admin overview' });
    }
  });

  app.get('/api/admin/users', requireRole(['ADMIN', 'MODERATOR']), (req, res) => {
    try {
      const { search, role, isVerified } = req.query;
      let sql = 'SELECT id, email, name, handle, avatar, role, is_verified, followers_count, created_at FROM users WHERE 1=1';
      const params: any[] = [];

      if (role && role !== 'ALL') {
        sql += ' AND role = ?';
        params.push(role);
      }
      if (isVerified !== undefined && isVerified !== 'ALL') {
        sql += ' AND is_verified = ?';
        params.push(isVerified === 'true' || isVerified === '1' ? 1 : 0);
      }
      if (search) {
        sql += ' AND (name LIKE ? OR handle LIKE ? OR email LIKE ?)';
        const term = `%${search}%`;
        params.push(term, term, term);
      }

      sql += ' ORDER BY created_at DESC LIMIT 100';
      const users = db.prepare(sql).all(...params);
      res.json(users);
    } catch (err: any) {
      logger.error(`Admin get users error: ${err.message}`);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  app.put('/api/admin/users/:id/role', requireRole(['ADMIN']), (req, res) => {
    try {
      const { role } = req.body;
      const userId = req.params.id;
      if (!role) return res.status(400).json({ error: 'Role is required' });

      db.prepare('UPDATE users SET role = ?, updated_at = ? WHERE id = ?').run(role, new Date().toISOString(), userId);
      res.json({ success: true, userId, role });
    } catch (err: any) {
      logger.error(`Admin update role error: ${err.message}`);
      res.status(500).json({ error: 'Failed to update user role' });
    }
  });

  app.put('/api/admin/users/:id/verify', requireRole(['ADMIN', 'MODERATOR']), (req, res) => {
    try {
      const { isVerified } = req.body;
      const userId = req.params.id;

      db.prepare('UPDATE users SET is_verified = ?, updated_at = ? WHERE id = ?').run(isVerified ? 1 : 0, new Date().toISOString(), userId);
      res.json({ success: true, userId, isVerified: Boolean(isVerified) });
    } catch (err: any) {
      logger.error(`Admin verify user error: ${err.message}`);
      res.status(500).json({ error: 'Failed to update user verification' });
    }
  });

  app.get('/api/admin/posts', requireRole(['ADMIN', 'MODERATOR']), (req, res) => {
    try {
      const { moderationStatus, category, search } = req.query;
      let sql = 'SELECT * FROM posts WHERE 1=1';
      const params: any[] = [];

      if (moderationStatus && moderationStatus !== 'ALL') {
        sql += ' AND moderation_status = ?';
        params.push(moderationStatus);
      }
      if (category && category !== 'ALL') {
        sql += ' AND category = ?';
        params.push(category);
      }
      if (search) {
        sql += ' AND (title LIKE ? OR content LIKE ? OR author_name LIKE ?)';
        const term = `%${search}%`;
        params.push(term, term, term);
      }

      sql += ' ORDER BY created_at DESC LIMIT 100';
      const posts = db.prepare(sql).all(...params);
      res.json(posts);
    } catch (err: any) {
      logger.error(`Admin get posts error: ${err.message}`);
      res.status(500).json({ error: 'Failed to fetch admin posts' });
    }
  });

  app.put('/api/admin/posts/:id/moderation', requireRole(['ADMIN', 'MODERATOR']), (req, res) => {
    try {
      const { moderationStatus, reportLifecycleStatus } = req.body;
      const postId = req.params.id;

      db.prepare(`
        UPDATE posts
        SET moderation_status = COALESCE(?, moderation_status),
            report_lifecycle_status = COALESCE(?, report_lifecycle_status),
            updated_at = ?
        WHERE id = ?
      `).run(moderationStatus || null, reportLifecycleStatus || null, new Date().toISOString(), postId);

      eventBus.emitReportEvent({
        reportId: postId,
        eventType: moderationStatus === 'approved' ? 'MODERATION_APPROVED' : 'REPORT_HELD',
        actorType: 'MODERATOR',
        actorId: (req as AuthenticatedRequest).user?.id || 'admin',
        metadata: { moderationStatus, reportLifecycleStatus }
      });

      res.json({ success: true, postId, moderationStatus, reportLifecycleStatus });
    } catch (err: any) {
      logger.error(`Admin update post moderation error: ${err.message}`);
      res.status(500).json({ error: 'Failed to update post moderation status' });
    }
  });

  app.get('/api/admin/abuse-reports', requireRole(['ADMIN', 'MODERATOR']), (req, res) => {
    try {
      const { status } = req.query;
      let sql = 'SELECT ar.*, p.title as post_title FROM abuse_reports ar LEFT JOIN posts p ON ar.post_id = p.id WHERE 1=1';
      const params: any[] = [];

      if (status && status !== 'ALL') {
        sql += ' AND ar.status = ?';
        params.push(status);
      }

      sql += ' ORDER BY ar.created_at DESC LIMIT 100';
      const reports = db.prepare(sql).all(...params);
      res.json(reports);
    } catch (err: any) {
      logger.error(`Admin get abuse reports error: ${err.message}`);
      res.status(500).json({ error: 'Failed to fetch abuse reports' });
    }
  });

  app.put('/api/admin/abuse-reports/:id', requireRole(['ADMIN', 'MODERATOR']), (req, res) => {
    try {
      const { status } = req.body;
      const reportId = req.params.id;

      db.prepare('UPDATE abuse_reports SET status = ? WHERE id = ?').run(status || 'RESOLVED', reportId);
      res.json({ success: true, reportId, status });
    } catch (err: any) {
      logger.error(`Admin update abuse report error: ${err.message}`);
      res.status(500).json({ error: 'Failed to update abuse report' });
    }
  });

  app.post('/api/admin/institutions', requireRole(['ADMIN']), (req, res) => {
    try {
      const { id, officialName, shortName, acronym, mandate, category, jurisdiction, alertMethod } = req.body;
      if (!officialName || !shortName || !acronym) {
        return res.status(400).json({ error: 'Official name, short name, and acronym are required' });
      }

      const instId = id || `inst-${Date.now()}`;
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO institutions (id, official_name, short_name, acronym, mandate, category, jurisdiction, alert_method, verification_status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'VERIFIED', ?)
        ON CONFLICT(id) DO UPDATE SET
          official_name = excluded.official_name,
          short_name = excluded.short_name,
          acronym = excluded.acronym,
          mandate = excluded.mandate,
          category = excluded.category,
          jurisdiction = excluded.jurisdiction,
          alert_method = excluded.alert_method
      `).run(instId, officialName, shortName, acronym, mandate || '', category || 'GOVERNMENT', jurisdiction || 'NATIONAL', alertMethod || 'OFFICIAL_EMAIL', now);

      res.status(201).json({ success: true, id: instId });
    } catch (err: any) {
      logger.error(`Admin create/update institution error: ${err.message}`);
      res.status(500).json({ error: 'Failed to manage institution' });
    }
  });

  app.get('/api/admin/jobs', requireRole(['ADMIN', 'MODERATOR']), (req, res) => {
    try {
      const { status } = req.query;
      let sql = 'SELECT * FROM jobs WHERE 1=1';
      const params: any[] = [];

      if (status && status !== 'ALL') {
        sql += ' AND status = ?';
        params.push(status);
      }

      sql += ' ORDER BY created_at DESC LIMIT 100';
      const jobs = db.prepare(sql).all(...params);
      res.json(jobs);
    } catch (err: any) {
      logger.error(`Admin get jobs error: ${err.message}`);
      res.status(500).json({ error: 'Failed to fetch background jobs' });
    }
  });

  app.post('/api/admin/jobs/:id/retry', requireRole(['ADMIN']), (req, res) => {
    try {
      const jobId = req.params.id;
      const now = new Date().toISOString();

      db.prepare("UPDATE jobs SET status = 'QUEUED', attempts = 0, available_at = ?, updated_at = ? WHERE id = ?")
        .run(now, now, jobId);

      res.json({ success: true, jobId, message: 'Job requeued successfully' });
    } catch (err: any) {
      logger.error(`Admin retry job error: ${err.message}`);
      res.status(500).json({ error: 'Failed to retry job' });
    }
  });

  app.get('/api/admin/audit-logs', requireRole(['ADMIN', 'MODERATOR']), (req, res) => {
    try {
      const events = db.prepare('SELECT * FROM report_events ORDER BY created_at DESC LIMIT 100').all();
      res.json(events);
    } catch (err: any) {
      logger.error(`Admin get audit logs error: ${err.message}`);
      res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
  });

  return app;
}
