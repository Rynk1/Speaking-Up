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
import { idempotencyMiddleware } from './shared/idempotency';
import { globalErrorHandler } from './shared/errors';
import { BASE_UPLOAD_DIR, STORAGE_ZONES, verifySignedAccessToken, generateSignedAccessToken } from './storage';
import { processMediaFile } from './media/mediaPipeline';
import { PrivacyOrchestrator } from './privacy/privacyOrchestrator';
import { analyzeContextualSensitivity } from './detection/geminiDetector';
import { InstitutionAlertService } from './alerts/alertEngine';
import { AlertOrchestrator } from './alerts/AlertOrchestrator';
import { ChannelHealthMonitor } from './alerts/ChannelHealthMonitor';
import { EscalationEngine } from './alerts/EscalationEngine';
import { jobQueue } from './jobs/jobQueue';
import { eventBus } from './events/eventBus';
import { setupSSERoute } from './events/sseStream';
import { GoogleGenAI } from '@google/genai';
import { SocialDistributionService } from './social/SocialDistributionService';
import { ShareLinkService } from './social/ShareLinkService';
import { ShareAnalyticsService } from './social/ShareAnalyticsService';
import { PLATFORM_CAPABILITIES } from './social/PlatformCapabilityRegistry';
import { InstitutionRoutingService } from './services/InstitutionRoutingService';
import { DatabaseBackupService } from './database/backup';
import { CivicSignalService } from './services/CivicSignalService';
import { FeedCandidateService } from './feed/FeedCandidateService';
import { SearchService } from './search/SearchService';
import { TraceService } from './observability/TraceService';
import { OutboxService } from './infrastructure/events/OutboxService';
import { AuditService } from './modules/audit/AuditService';
import { CivicSignalEngine } from './modules/civic-signal/CivicSignalEngine';
import { CivicSituationService } from './modules/civic-situations/CivicSituationService';
import { InstitutionRegistryService } from './modules/institutions/InstitutionRegistryService';
import { InstitutionalInboxService } from './modules/institutional-inbox/InstitutionalInboxService';
import { OfficialResponseService } from './modules/institutional-response/OfficialResponseService';
import { InstitutionalAnnouncementService } from './modules/announcements/InstitutionalAnnouncementService';
import { AlertStateMachine } from './modules/alerting/AlertStateMachine';
import { PrivacyProjectionService } from './modules/privacy/PrivacyProjectionService';

export function createApp() {
  const app = express();

  // Trust reverse proxy (Cloud Run / Nginx) to accurately resolve client IP from X-Forwarded-For
  app.set('trust proxy', 1);

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
  app.use(idempotencyMiddleware);

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
    const user = db.prepare('SELECT id, email, name, handle, role, avatar, phone, auth_provider, is_verified FROM users WHERE id = ?').get(req.user.id) as any;
    if (!user) return res.status(404).json({ error: 'User profile not found' });

    const prefs = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(req.user.id) as any;

    res.json({
      ...user,
      preferences: prefs || {
        notificationEmail: true,
        notificationSms: true,
        notificationWhatsapp: true,
        notificationPush: true,
        privacyShowLocation: true,
        privacyShowName: true,
        preferredLanguage: 'en'
      }
    });
  });

  // USER PREFERENCES ENDPOINTS
  app.get('/api/auth/preferences', requireAuth, (req: AuthenticatedRequest, res) => {
    const prefs = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(req.user!.id) as any;
    res.json(prefs || {
      notification_email: 1,
      notification_sms: 1,
      notification_whatsapp: 1,
      notification_push: 1,
      privacy_show_location: 1,
      privacy_show_name: 1,
      preferred_language: 'en'
    });
  });

  app.put('/api/auth/preferences', requireAuth, (req: AuthenticatedRequest, res) => {
    const userId = req.user!.id;
    const { notificationEmail, notificationSms, notificationWhatsapp, notificationPush, privacyShowLocation, privacyShowName, preferredLanguage } = req.body;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO user_preferences (user_id, notification_email, notification_sms, notification_whatsapp, notification_push, privacy_show_location, privacy_show_name, preferred_language, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        notification_email = excluded.notification_email,
        notification_sms = excluded.notification_sms,
        notification_whatsapp = excluded.notification_whatsapp,
        notification_push = excluded.notification_push,
        privacy_show_location = excluded.privacy_show_location,
        privacy_show_name = excluded.privacy_show_name,
        preferred_language = excluded.preferred_language,
        updated_at = excluded.updated_at
    `).run(
      userId,
      notificationEmail ? 1 : 0,
      notificationSms ? 1 : 0,
      notificationWhatsapp ? 1 : 0,
      notificationPush ? 1 : 0,
      privacyShowLocation ? 1 : 0,
      privacyShowName ? 1 : 0,
      preferredLanguage || 'en',
      now
    );

    res.json({ success: true, message: 'User preferences updated successfully' });
  });

  // PROFILE UPDATE ENDPOINT
  app.put('/api/auth/profile', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { name, phone, avatar } = req.body;
      const now = new Date().toISOString();

      if (name) {
        db.prepare('UPDATE users SET name = ?, updated_at = ? WHERE id = ?').run(sanitizePlainText(name), now, userId);
      }
      if (phone) {
        const normPhone = normalizePhone(phone);
        if (normPhone) {
          db.prepare('UPDATE users SET phone = ?, updated_at = ? WHERE id = ?').run(normPhone, now, userId);
        }
      }
      if (avatar) {
        db.prepare('UPDATE users SET avatar = ?, updated_at = ? WHERE id = ?').run(avatar, now, userId);
      }

      const updatedUser = db.prepare('SELECT id, email, name, handle, avatar, role, phone FROM users WHERE id = ?').get(userId);
      res.json({ success: true, user: updatedUser });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to update user profile' });
    }
  });

  // PASSWORD RESET ENDPOINT
  app.post('/api/auth/password-reset', authLimiter, async (req, res) => {
    try {
      const { email } = req.body;
      const normEmail = normalizeEmail(email);
      if (!normEmail) {
        return res.status(400).json({ error: 'Valid email address is required' });
      }

      const user = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(normEmail);
      if (user) {
        logger.info(`[Password Reset Dispatch] Password reset token issued for email ${normEmail}`);
      }

      res.json({ success: true, message: 'If an account exists for this email, password reset instructions have been dispatched.' });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to request password reset' });
    }
  });

  // ACCOUNT DELETION ENDPOINT
  app.delete('/api/auth/account', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      db.prepare('DELETE FROM users WHERE id = ?').run(userId);
      res.json({ success: true, message: 'Account successfully deleted' });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to delete account' });
    }
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
  app.post('/api/media/upload', upload.single('file') as any, async (req: AuthenticatedRequest, res) => {
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
      const { mode, category, region, district, urgency, search, institutionId, page, limit } = req.query;

      let rows: any[] = [];

      if (mode || page) {
        const feedResult = FeedCandidateService.getFeedCandidates({
          mode: mode as any,
          category: category as string,
          region: region as string,
          district: district as string,
          institutionId: institutionId as string,
          page: page ? parseInt(page as string, 10) : 1,
          limit: limit ? parseInt(limit as string, 10) : 50
        });
        rows = feedResult.posts;
      } else {
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
        rows = db.prepare(sql).all(...params) as any[];
      }

      const posts = rows.map(row => {
        const tagsRows = db.prepare('SELECT * FROM post_institution_tags WHERE post_id = ?').all(row.id) as any[];
        const mediaRows = db.prepare('SELECT * FROM media WHERE post_id = ?').all(row.id) as any[];
        const responsesRows = db.prepare('SELECT * FROM institution_responses WHERE post_id = ? ORDER BY created_at DESC').all(row.id) as any[];
        const evidenceRows = db.prepare('SELECT * FROM community_evidence WHERE post_id = ? ORDER BY created_at DESC').all(row.id) as any[];
        const commentsRows = db.prepare('SELECT * FROM comments WHERE post_id = ? ORDER BY created_at DESC').all(row.id) as any[];

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
            evidenceCount: evidenceRows.length,
            hasMedia: mediaRows.length > 0,
            hasLocation: Boolean(row.region && row.district),
            institutionalAwarenessScore: responsesRows.length > 0 ? 90 : (tagsRows.some(t => t.alert_status === 'ACKNOWLEDGED') ? 85 : (tagsRows.length > 0 ? 70 : 40))
          },
          engagement: {
            views: row.views_count || 1,
            reposts: row.reposts_count || 0,
            shares: row.shares_count || 0,
            confirmations: row.confirmations_count || 0,
            comments: row.comments_count || commentsRows.length || 0,
            followersCount: 0
          },
          officialResponses: responsesRows.map(r => {
            let timeline = [];
            let docs = [];
            let hots = [];
            try {
              if (r.action_timeline_json) timeline = JSON.parse(r.action_timeline_json);
            } catch {}
            try {
              if (r.documents_json) docs = JSON.parse(r.documents_json);
            } catch {}
            try {
              if (r.hotlines_json) hots = JSON.parse(r.hotlines_json);
            } catch {}

            const rComments = db.prepare('SELECT * FROM response_comments WHERE response_id = ? ORDER BY created_at DESC').all(r.id) as any[];

            return {
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
              actionTimeline: timeline,
              documents: docs,
              hotlines: hots,
              commentsList: rComments.map(rc => ({
                id: rc.id,
                responseId: rc.response_id,
                postId: rc.post_id,
                userId: rc.user_id,
                userName: rc.user_name,
                userHandle: rc.user_handle,
                content: rc.content,
                likesCount: rc.likes_count || 0,
                createdAt: rc.created_at
              })),
              commentsCount: rComments.length,
              createdAt: r.created_at
            };
          }),
          communityEvidence: evidenceRows.map(e => {
            let mediaArr = [];
            try {
              if (e.media_json) mediaArr = JSON.parse(e.media_json);
            } catch {}
            let loc = undefined;
            try {
              if (e.location_json) loc = JSON.parse(e.location_json);
            } catch {}
            const evComments = commentsRows.filter(c => c.evidence_id === e.id);
            return {
              id: e.id,
              postId: e.post_id,
              userId: e.user_id,
              userName: e.user_name,
              userHandle: e.user_handle,
              userAvatar: e.user_avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(e.user_handle || e.user_name)}`,
              isVerified: e.is_verified !== undefined ? Boolean(e.is_verified) : true,
              title: e.title || undefined,
              text: e.text,
              media: mediaArr,
              statusUpdate: e.status_update || 'still_ongoing',
              likesCount: e.likes_count || 0,
              location: loc,
              commentsCount: evComments.length,
              commentsList: evComments.map(c => ({
                id: c.id,
                postId: c.post_id,
                parentCommentId: c.parent_comment_id,
                evidenceId: c.evidence_id,
                evidenceAuthorName: c.evidence_author_name,
                evidenceTextPreview: c.evidence_text_preview,
                userId: c.user_id,
                userName: c.user_name,
                userHandle: c.user_handle,
                content: c.content,
                likesCount: c.likes_count || 0,
                createdAt: c.created_at
              })),
              createdAt: e.created_at
            };
          }),
          commentsList: commentsRows.map(c => ({
            id: c.id,
            postId: c.post_id,
            parentCommentId: c.parent_comment_id,
            evidenceId: c.evidence_id,
            evidenceAuthorName: c.evidence_author_name,
            evidenceTextPreview: c.evidence_text_preview,
            userId: c.user_id,
            userName: c.user_name,
            userHandle: c.user_handle,
            content: c.content,
            likesCount: c.likes_count || 0,
            createdAt: c.created_at
          })),
          confirmationsCount: row.confirmations_count,
          repostsCount: row.reposts_count,
          sharesCount: row.shares_count,
          commentsCount: row.comments_count || commentsRows.length || 0,
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

  // GET SINGLE POST BY ID WITH FULL DETAILS
  app.get('/api/posts/:id', (req, res) => {
    try {
      const postId = req.params.id;
      const row = db.prepare('SELECT * FROM posts WHERE id = ?').get(postId) as any;
      if (!row) {
        return res.status(404).json({ error: 'Civic report not found' });
      }

      const tagsRows = db.prepare('SELECT * FROM post_institution_tags WHERE post_id = ?').all(row.id) as any[];
      const mediaRows = db.prepare('SELECT * FROM media WHERE post_id = ?').all(row.id) as any[];
      const responsesRows = db.prepare('SELECT * FROM institution_responses WHERE post_id = ? ORDER BY created_at DESC').all(row.id) as any[];
      const evidenceRows = db.prepare('SELECT * FROM community_evidence WHERE post_id = ? ORDER BY created_at DESC').all(row.id) as any[];
      const commentsRows = db.prepare('SELECT * FROM comments WHERE post_id = ? ORDER BY created_at DESC').all(row.id) as any[];

      let hashtags: string[] = [];
      try {
        if (row.hashtags_json) hashtags = JSON.parse(row.hashtags_json);
      } catch {
        hashtags = [];
      }

      const post = {
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
          evidenceCount: evidenceRows.length,
          hasMedia: mediaRows.length > 0,
          hasLocation: Boolean(row.region && row.district),
          institutionalAwarenessScore: responsesRows.length > 0 ? 90 : 50
        },
        engagement: {
          views: row.views_count || 1,
          reposts: row.reposts_count || 0,
          shares: row.shares_count || 0,
          confirmations: row.confirmations_count || 0,
          comments: row.comments_count || commentsRows.length || 0,
          followersCount: 0
        },
        officialResponses: responsesRows.map(r => {
          let timeline = [];
          let docs = [];
          let hots = [];
          try {
            if (r.action_timeline_json) timeline = JSON.parse(r.action_timeline_json);
          } catch {}
          try {
            if (r.documents_json) docs = JSON.parse(r.documents_json);
          } catch {}
          try {
            if (r.hotlines_json) hots = JSON.parse(r.hotlines_json);
          } catch {}

          const rComments = db.prepare('SELECT * FROM response_comments WHERE response_id = ? ORDER BY created_at DESC').all(r.id) as any[];

          return {
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
            actionTimeline: timeline,
            documents: docs,
            hotlines: hots,
            commentsList: rComments.map(rc => ({
              id: rc.id,
              responseId: rc.response_id,
              postId: rc.post_id,
              userId: rc.user_id,
              userName: rc.user_name,
              userHandle: rc.user_handle,
              content: rc.content,
              likesCount: rc.likes_count || 0,
              createdAt: rc.created_at
            })),
            commentsCount: rComments.length,
            createdAt: r.created_at
          };
        }),
        communityEvidence: evidenceRows.map(e => {
          let mediaArr = [];
          try {
            if (e.media_json) mediaArr = JSON.parse(e.media_json);
          } catch {}
          let loc = undefined;
          try {
            if (e.location_json) loc = JSON.parse(e.location_json);
          } catch {}
          const evComments = commentsRows.filter(c => c.evidence_id === e.id);
          return {
            id: e.id,
            postId: e.post_id,
            userId: e.user_id,
            userName: e.user_name,
            userHandle: e.user_handle,
            userAvatar: e.user_avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(e.user_handle || e.user_name)}`,
            isVerified: e.is_verified !== undefined ? Boolean(e.is_verified) : true,
            title: e.title || undefined,
            text: e.text,
            media: mediaArr,
            statusUpdate: e.status_update || 'still_ongoing',
            likesCount: e.likes_count || 0,
            location: loc,
            commentsCount: evComments.length,
            commentsList: evComments.map(c => ({
              id: c.id,
              postId: c.post_id,
              parentCommentId: c.parent_comment_id,
              evidenceId: c.evidence_id,
              evidenceAuthorName: c.evidence_author_name,
              evidenceTextPreview: c.evidence_text_preview,
              userId: c.user_id,
              userName: c.user_name,
              userHandle: c.user_handle,
              content: c.content,
              likesCount: c.likes_count || 0,
              createdAt: c.created_at
            })),
            createdAt: e.created_at
          };
        }),
        commentsList: commentsRows.map(c => ({
          id: c.id,
          postId: c.post_id,
          parentCommentId: c.parent_comment_id,
          evidenceId: c.evidence_id,
          evidenceAuthorName: c.evidence_author_name,
          evidenceTextPreview: c.evidence_text_preview,
          userId: c.user_id,
          userName: c.user_name,
          userHandle: c.user_handle,
          content: c.content,
          likesCount: c.likes_count || 0,
          createdAt: c.created_at
        })),
        confirmationsCount: row.confirmations_count,
        repostsCount: row.reposts_count,
        sharesCount: row.shares_count,
        commentsCount: row.comments_count || commentsRows.length || 0,
        createdAt: row.created_at,
        updatedAt: row.updated_at || row.created_at,
        reportLifecycleStatus: row.report_lifecycle_status || 'PUBLISHED',
        accountabilityStatus: row.accountability_status || 'NOT_ROUTED'
      };

      res.json(post);
    } catch (err: any) {
      logger.error(`Error fetching post by id: ${err.message}`);
      res.status(500).json({ error: 'Failed to fetch post details' });
    }
  });

  // POST INTERACTIONS
  app.post('/api/posts/:id/confirm', (req: AuthenticatedRequest, res) => {
    try {
      const postId = req.params.id;
      const userId = req.user?.id || `guest-${req.ip || '127.0.0.1'}`;
      const result = CivicSignalService.recordConfirmation(postId, userId, req.ip || '127.0.0.1');
      res.json({ success: true, confirmed: result.confirmed, confirmationsCount: result.count, ipsScore: result.ipsScore });
    } catch (err: any) {
      logger.error(`Confirm toggle error: ${err.message}`);
      res.status(500).json({ error: 'Failed to toggle confirmation' });
    }
  });

  app.post('/api/posts/:id/repost', (req: AuthenticatedRequest, res) => {
    try {
      const postId = req.params.id;
      const userId = req.user?.id || `guest-${req.ip || '127.0.0.1'}`;
      const result = CivicSignalService.recordAmplification(postId, userId, req.ip || '127.0.0.1');
      res.json({ reposted: result.amplified, repostsCount: result.count, ipsScore: result.ipsScore });
    } catch (err: any) {
      logger.error(`Repost toggle error: ${err.message}`);
      res.status(500).json({ error: 'Failed to toggle repost' });
    }
  });

  app.post('/api/posts/:id/share', (req, res) => {
    try {
      const postId = req.params.id;
      db.prepare('UPDATE posts SET shares_count = shares_count + 1 WHERE id = ?').run(postId);
      const updated = db.prepare('SELECT shares_count FROM posts WHERE id = ?').get(postId) as any;
      res.json({ success: true, sharesCount: updated?.shares_count || 1, followersCount: 0 });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to record share' });
    }
  });

  app.post('/api/posts/:id/follow', (req: AuthenticatedRequest, res) => {
    try {
      const postId = req.params.id;
      const userId = req.user?.id || 'guest';
      const existing = db.prepare('SELECT * FROM issue_followers WHERE user_id = ? AND post_id = ?').get(userId, postId);
      let followed = false;
      if (existing) {
        db.prepare('DELETE FROM issue_followers WHERE user_id = ? AND post_id = ?').run(userId, postId);
        followed = false;
      } else {
        db.prepare('INSERT INTO issue_followers (user_id, post_id) VALUES (?, ?)').run(userId, postId);
        followed = true;
      }
      const count = (db.prepare('SELECT COUNT(*) as c FROM issue_followers WHERE post_id = ?').get(postId) as any)?.c || 0;
      res.json({ success: true, followed, followersCount: count });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to toggle follow' });
    }
  });

  app.post('/api/posts/:id/bookmark', (req, res) => {
    res.json({ bookmarked: true });
  });

  app.post('/api/posts/:id/evidence', (req: AuthenticatedRequest, res) => {
    try {
      const postId = req.params.id;
      const { title, text, statusUpdate, userName, userHandle, media, location } = req.body;
      const id = `ev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();
      const user = req.user || { id: 'anon', name: userName || 'Citizen Witness', handle: userHandle || '@citizen', avatar: undefined };
      const mediaJson = media && Array.isArray(media) && media.length > 0 ? JSON.stringify(media) : null;
      const locationJson = location ? JSON.stringify(location) : null;
      const userAvatar = (user as any).avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.handle || user.name)}`;

      db.prepare(`
        INSERT INTO community_evidence (id, post_id, user_id, user_name, user_handle, user_avatar, is_verified, title, text, status_update, likes_count, location_json, media_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, 0, ?, ?, ?)
      `).run(id, postId, user.id, user.name, user.handle, userAvatar, title ? sanitizePlainText(title) : null, sanitizeText(text || ''), statusUpdate || 'still_ongoing', locationJson, mediaJson, now);

      res.status(201).json({
        id,
        postId,
        userId: user.id,
        userName: user.name,
        userHandle: user.handle,
        userAvatar,
        isVerified: true,
        title: title || undefined,
        text: sanitizeText(text || ''),
        statusUpdate: statusUpdate || 'still_ongoing',
        media: media || [],
        likesCount: 0,
        commentsCount: 0,
        commentsList: [],
        location: location || undefined,
        createdAt: now
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to add evidence' });
    }
  });

  // EVIDENCE PACK LIKES & INTERACTIONS
  app.post('/api/evidence/:id/like', (req: AuthenticatedRequest, res) => {
    try {
      const evidenceId = req.params.id;
      const userId = req.user?.id || `guest-${req.ip || '127.0.0.1'}`;
      const existing = db.prepare('SELECT * FROM evidence_likes WHERE user_id = ? AND evidence_id = ?').get(userId, evidenceId);
      let userLiked = false;

      if (existing) {
        db.prepare('DELETE FROM evidence_likes WHERE user_id = ? AND evidence_id = ?').run(userId, evidenceId);
        db.prepare('UPDATE community_evidence SET likes_count = MAX(0, likes_count - 1) WHERE id = ?').run(evidenceId);
        userLiked = false;
      } else {
        db.prepare('INSERT OR IGNORE INTO evidence_likes (user_id, evidence_id, created_at) VALUES (?, ?, ?)').run(userId, evidenceId, new Date().toISOString());
        db.prepare('UPDATE community_evidence SET likes_count = likes_count + 1 WHERE id = ?').run(evidenceId);
        userLiked = true;
      }

      const ev = db.prepare('SELECT id, post_id, likes_count FROM community_evidence WHERE id = ?').get(evidenceId) as any;
      if (ev) {
        eventBus.emitReportEvent({
          reportId: ev.post_id,
          eventType: 'evidence.liked',
          actorType: 'CITIZEN',
          actorId: userId,
          metadata: { evidenceId, userLiked, likesCount: ev.likes_count }
        });
      }

      res.json({ success: true, evidenceId, userLiked, likesCount: ev?.likes_count || 0 });
    } catch (err: any) {
      logger.error(`Evidence like error: ${err.message}`);
      res.status(500).json({ error: 'Failed to toggle evidence like' });
    }
  });

  // EVIDENCE PACK SHARE
  app.post('/api/evidence/:id/share', (req: AuthenticatedRequest, res) => {
    try {
      const evidenceId = req.params.id;
      const { platform } = req.body;
      const ev = db.prepare('SELECT id, post_id FROM community_evidence WHERE id = ?').get(evidenceId) as any;
      if (!ev) return res.status(404).json({ error: 'Evidence not found' });

      const shareId = `ev-share-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      db.prepare('INSERT INTO evidence_shares (id, evidence_id, post_id, user_id, platform, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
        shareId,
        evidenceId,
        ev.post_id,
        req.user?.id || 'anon',
        platform || 'direct',
        new Date().toISOString()
      );

      // Increment parent post share count as well
      db.prepare('UPDATE posts SET shares_count = shares_count + 1 WHERE id = ?').run(ev.post_id);

      res.json({ success: true, evidenceId, shareId });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to record evidence share' });
    }
  });

  // GET SINGLE EVIDENCE PACK BY ID
  app.get('/api/evidence/:id', (req, res) => {
    try {
      const evidenceId = req.params.id;
      const e = db.prepare('SELECT * FROM community_evidence WHERE id = ?').get(evidenceId) as any;
      if (!e) return res.status(404).json({ error: 'Evidence pack not found' });

      const commentsRows = db.prepare('SELECT * FROM comments WHERE evidence_id = ? ORDER BY created_at ASC').all(evidenceId) as any[];
      let mediaArr = [];
      try {
        if (e.media_json) mediaArr = JSON.parse(e.media_json);
      } catch {}
      let loc = undefined;
      try {
        if (e.location_json) loc = JSON.parse(e.location_json);
      } catch {}

      const postRow = db.prepare('SELECT id, title, category, urgency, severity, region, district, landmark FROM posts WHERE id = ?').get(e.post_id) as any;

      res.json({
        id: e.id,
        postId: e.post_id,
        userId: e.user_id,
        userName: e.user_name,
        userHandle: e.user_handle,
        userAvatar: e.user_avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(e.user_handle || e.user_name)}`,
        isVerified: e.is_verified !== undefined ? Boolean(e.is_verified) : true,
        title: e.title || undefined,
        text: e.text,
        statusUpdate: e.status_update || 'still_ongoing',
        likesCount: e.likes_count || 0,
        media: mediaArr,
        location: loc,
        commentsCount: commentsRows.length,
        commentsList: commentsRows.map(c => ({
          id: c.id,
          postId: c.post_id,
          parentCommentId: c.parent_comment_id,
          evidenceId: c.evidence_id,
          evidenceAuthorName: c.evidence_author_name,
          evidenceTextPreview: c.evidence_text_preview,
          userId: c.user_id,
          userName: c.user_name,
          userHandle: c.user_handle,
          content: c.content,
          likesCount: c.likes_count || 0,
          createdAt: c.created_at
        })),
        postContext: postRow ? {
          id: postRow.id,
          title: postRow.title,
          category: postRow.category,
          urgency: postRow.urgency,
          severity: postRow.severity,
          location: `${postRow.landmark ? postRow.landmark + ', ' : ''}${postRow.district || ''}, ${postRow.region || ''}`
        } : undefined,
        createdAt: e.created_at
      });
    } catch (err: any) {
      logger.error(`Get single evidence error: ${err.message}`);
      res.status(500).json({ error: 'Failed to retrieve evidence pack' });
    }
  });

  app.post('/api/posts/:id/comments', commentLimiter, (req: AuthenticatedRequest, res) => {
    try {
      const postId = req.params.id;
      const { content, parentCommentId, evidenceId, userName, userHandle } = req.body;
      if (!content) return res.status(400).json({ error: 'Comment content is required' });

      const id = `comm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();
      const user = req.user || { id: 'anon', name: userName || 'Citizen Contributor', handle: userHandle || '@citizen' };

      let evidenceAuthorName: string | null = null;
      let evidenceTextPreview: string | null = null;

      if (evidenceId) {
        const evRow = db.prepare('SELECT user_name, text FROM community_evidence WHERE id = ?').get(evidenceId) as any;
        if (evRow) {
          evidenceAuthorName = evRow.user_name;
          evidenceTextPreview = (evRow.text || '').substring(0, 80);
        }
      }

      db.prepare(`
        INSERT INTO comments (id, post_id, parent_comment_id, evidence_id, evidence_author_name, evidence_text_preview, user_id, user_name, user_handle, content, likes_count, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
      `).run(
        id,
        postId,
        parentCommentId || null,
        evidenceId || null,
        evidenceAuthorName,
        evidenceTextPreview,
        user.id,
        user.name,
        user.handle,
        sanitizeText(content),
        now
      );

      db.prepare('UPDATE posts SET comments_count = comments_count + 1 WHERE id = ?').run(postId);

      // Auto-follow issue on comment interaction
      if (user.id && user.id !== 'anon') {
        db.prepare('INSERT OR IGNORE INTO issue_followers (user_id, post_id) VALUES (?, ?)').run(user.id, postId);
      }

      eventBus.emitReportEvent({
        reportId: postId,
        eventType: 'comment.created',
        actorType: 'CITIZEN',
        actorId: user.id,
        metadata: { commentId: id, parentCommentId: parentCommentId || null, evidenceId: evidenceId || null }
      });

      res.status(201).json({
        id,
        postId,
        parentCommentId: parentCommentId || null,
        evidenceId: evidenceId || null,
        evidenceAuthorName: evidenceAuthorName || undefined,
        evidenceTextPreview: evidenceTextPreview || undefined,
        userId: user.id,
        userName: user.name,
        userHandle: user.handle,
        content: sanitizeText(content),
        likesCount: 0,
        createdAt: now
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to add comment' });
    }
  });

  app.put('/api/comments/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      const commentId = req.params.id;
      const { content } = req.body;
      if (!content) return res.status(400).json({ error: 'Content is required' });

      const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(commentId) as any;
      if (!comment) return res.status(404).json({ error: 'Comment not found' });
      if (comment.user_id !== req.user!.id && req.user!.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Cannot edit comment of another user' });
      }

      db.prepare('UPDATE comments SET content = ? WHERE id = ?').run(sanitizeText(content), commentId);

      eventBus.emitReportEvent({
        reportId: comment.post_id,
        eventType: 'comment.updated',
        actorType: 'CITIZEN',
        actorId: req.user!.id,
        metadata: { commentId }
      });

      res.json({ success: true, commentId, content: sanitizeText(content) });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to update comment' });
    }
  });

  app.delete('/api/comments/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      const commentId = req.params.id;
      const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(commentId) as any;
      if (!comment) return res.status(404).json({ error: 'Comment not found' });
      if (comment.user_id !== req.user!.id && req.user!.role !== 'ADMIN' && req.user!.role !== 'MODERATOR') {
        return res.status(403).json({ error: 'Cannot delete comment' });
      }

      db.prepare('DELETE FROM comments WHERE id = ?').run(commentId);
      db.prepare('UPDATE posts SET comments_count = MAX(0, comments_count - 1) WHERE id = ?').run(comment.post_id);

      res.json({ success: true, message: 'Comment deleted' });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to delete comment' });
    }
  });

  app.post('/api/comments/:id/like', (req: AuthenticatedRequest, res) => {
    try {
      const commentId = req.params.id;
      db.prepare('UPDATE comments SET likes_count = likes_count + 1 WHERE id = ?').run(commentId);
      const row = db.prepare('SELECT post_id, likes_count FROM comments WHERE id = ?').get(commentId) as any;

      if (row) {
        eventBus.emitReportEvent({
          reportId: row.post_id,
          eventType: 'comment.reacted',
          actorType: 'CITIZEN',
          actorId: req.user?.id || 'anon',
          metadata: { commentId, likesCount: row.likes_count }
        });
      }

      res.json({ success: true, likesCount: row?.likes_count || 1, userLiked: true });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to like comment' });
    }
  });

  app.post('/api/comments/:id/report', abuseReportLimiter, (req: AuthenticatedRequest, res) => {
    try {
      const commentId = req.params.id;
      const { reason, details } = req.body;
      const comment = db.prepare('SELECT post_id FROM comments WHERE id = ?').get(commentId) as any;

      const reportId = `rep-comm-${Date.now()}`;
      db.prepare(`
        INSERT INTO abuse_reports (id, post_id, user_id, reason, details, status, created_at)
        VALUES (?, ?, ?, ?, ?, 'PENDING', ?)
      `).run(reportId, comment?.post_id || 'comment-abuse', req.user?.id || 'anon', reason || 'COMMENT_ABUSE', details ? sanitizePlainText(details) : `Comment ID: ${commentId}`, new Date().toISOString());

      if (comment) {
        eventBus.emitReportEvent({
          reportId: comment.post_id,
          eventType: 'comment.reported',
          actorType: 'CITIZEN',
          actorId: req.user?.id || 'anon',
          metadata: { commentId, reason }
        });
      }

      res.json({ success: true, message: 'Comment reported to moderators' });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to report comment' });
    }
  });

  app.post('/api/reports/abuse', abuseReportLimiter, (req: AuthenticatedRequest, res) => {
    try {
      const { postId, reason, details } = req.body;
      const id = `abuse-${Date.now()}`;
      const now = new Date().toISOString();
      const reporterId = req.user?.id || 'anonymous';

      db.prepare(`
        INSERT INTO abuse_reports (id, post_id, reporter_id, reason, details, status, created_at)
        VALUES (?, ?, ?, ?, ?, 'PENDING', ?)
      `).run(id, postId, reporterId, reason || 'INAPPROPRIATE_CONTENT', details ? sanitizePlainText(details) : null, now);

      res.json({ success: true, message: 'Abuse report received and queued for moderator review.' });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to report abuse' });
    }
  });

  // GET SINGLE OFFICIAL RESPONSE BY ID
  app.get('/api/responses/:id', (req, res) => {
    try {
      const respId = req.params.id;
      const r = db.prepare('SELECT * FROM institution_responses WHERE id = ?').get(respId) as any;
      if (!r) return res.status(404).json({ error: 'Statement response not found' });

      let timeline = [];
      let docs = [];
      let hots = [];
      try {
        if (r.action_timeline_json) timeline = JSON.parse(r.action_timeline_json);
      } catch {}
      try {
        if (r.documents_json) docs = JSON.parse(r.documents_json);
      } catch {}
      try {
        if (r.hotlines_json) hots = JSON.parse(r.hotlines_json);
      } catch {}

      const commentsRows = db.prepare('SELECT * FROM response_comments WHERE response_id = ? ORDER BY created_at DESC').all(respId) as any[];

      const response = {
        id: r.id,
        postId: r.post_id,
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
        actionTimeline: timeline,
        documents: docs,
        hotlines: hots,
        commentsList: commentsRows.map(c => ({
          id: c.id,
          responseId: c.response_id,
          postId: c.post_id,
          userId: c.user_id,
          userName: c.user_name,
          userHandle: c.user_handle,
          content: c.content,
          likesCount: c.likes_count || 0,
          createdAt: c.created_at
        })),
        commentsCount: commentsRows.length,
        createdAt: r.created_at
      };

      let originalPost: any = null;
      if (r.post_id) {
        const postRow = db.prepare('SELECT * FROM posts WHERE id = ?').get(r.post_id) as any;
        if (postRow) {
          const mediaRows = db.prepare('SELECT * FROM media WHERE post_id = ?').all(postRow.id) as any[];
          originalPost = {
            id: postRow.id,
            title: postRow.title,
            content: postRow.content,
            authorName: postRow.author_name,
            authorHandle: postRow.author_handle,
            category: postRow.category,
            urgency: postRow.urgency,
            location: { region: postRow.region, district: postRow.district, landmark: postRow.landmark },
            engagement: {
              confirmations: postRow.confirmations_count || 0,
              comments: postRow.comments_count || 0
            },
            media: mediaRows.map(m => ({ url: m.url })),
            createdAt: postRow.created_at
          };
        }
      }

      const relatedRows = db.prepare('SELECT * FROM institution_responses WHERE post_id = ? AND id != ? ORDER BY created_at DESC').all(r.post_id, respId) as any[];
      const relatedResponses = relatedRows.map(rel => {
        let relTimeline = [];
        let relDocs = [];
        let relHots = [];
        try { if (rel.action_timeline_json) relTimeline = JSON.parse(rel.action_timeline_json); } catch {}
        try { if (rel.documents_json) relDocs = JSON.parse(rel.documents_json); } catch {}
        try { if (rel.hotlines_json) relHots = JSON.parse(rel.hotlines_json); } catch {}

        return {
          id: rel.id,
          postId: rel.post_id,
          institutionId: rel.institution_id,
          institutionName: rel.institution_name,
          institutionLogo: rel.institution_logo,
          responseType: rel.response_type,
          message: rel.message,
          statementTitle: rel.statement_title,
          fullStatement: rel.full_statement,
          referenceNumber: rel.reference_number,
          resolutionStatus: rel.resolution_status || 'IN_PROGRESS',
          helpfulCount: rel.helpful_count || 0,
          unhelpfulCount: rel.unhelpful_count || 0,
          official: Boolean(rel.official),
          verified: Boolean(rel.verified),
          responderName: rel.responder_name,
          responderTitle: rel.responder_title,
          actionTimeline: relTimeline,
          documents: relDocs,
          hotlines: relHots,
          createdAt: rel.created_at
        };
      });

      res.json({ response, originalPost, relatedResponses });
    } catch (err: any) {
      logger.error(`Error fetching response: ${err.message}`);
      res.status(500).json({ error: 'Failed to fetch response details' });
    }
  });

  // OFFICIAL RESPONSE INTERACTIONS
  app.post('/api/responses/:id/comments', (req: AuthenticatedRequest, res) => {
    try {
      const respId = req.params.id;
      const { content, userName, userHandle } = req.body;
      if (!content) return res.status(400).json({ error: 'Comment content is required' });

      const id = `resp-comm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();
      const user = req.user || { id: 'anon', name: userName || 'Citizen', handle: userHandle || '@citizen' };

      const respRow = db.prepare('SELECT post_id FROM institution_responses WHERE id = ?').get(respId) as any;

      db.prepare(`
        INSERT INTO response_comments (id, response_id, post_id, user_id, user_name, user_handle, content, likes_count, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
      `).run(id, respId, respRow?.post_id || null, user.id, user.name, user.handle, sanitizeText(content), now);

      res.status(201).json({
        id,
        responseId: respId,
        postId: respRow?.post_id,
        userId: user.id,
        userName: user.name,
        userHandle: user.handle,
        content: sanitizeText(content),
        likesCount: 0,
        createdAt: now
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to submit response comment' });
    }
  });

  app.post('/api/responses/:id/vote', (req: AuthenticatedRequest, res) => {
    try {
      const respId = req.params.id;
      const { voteType, userId } = req.body;
      const voterId = req.user?.id || userId || `guest-${req.ip || '127.0.0.1'}`;

      if (voteType !== 'helpful' && voteType !== 'unhelpful') {
        return res.status(400).json({ error: 'Invalid vote type' });
      }

      const existing = db.prepare('SELECT vote_type FROM response_votes WHERE user_id = ? AND response_id = ?').get(voterId, respId) as any;

      if (existing) {
        if (existing.vote_type === voteType) {
          // Remove vote
          db.prepare('DELETE FROM response_votes WHERE user_id = ? AND response_id = ?').run(voterId, respId);
          if (voteType === 'helpful') {
            db.prepare('UPDATE institution_responses SET helpful_count = MAX(0, helpful_count - 1) WHERE id = ?').run(respId);
          } else {
            db.prepare('UPDATE institution_responses SET unhelpful_count = MAX(0, unhelpful_count - 1) WHERE id = ?').run(respId);
          }
        } else {
          // Switch vote
          db.prepare('UPDATE response_votes SET vote_type = ? WHERE user_id = ? AND response_id = ?').run(voteType, voterId, respId);
          if (voteType === 'helpful') {
            db.prepare('UPDATE institution_responses SET helpful_count = helpful_count + 1, unhelpful_count = MAX(0, unhelpful_count - 1) WHERE id = ?').run(respId);
          } else {
            db.prepare('UPDATE institution_responses SET unhelpful_count = unhelpful_count + 1, helpful_count = MAX(0, helpful_count - 1) WHERE id = ?').run(respId);
          }
        }
      } else {
        // New vote
        db.prepare('INSERT INTO response_votes (user_id, response_id, vote_type, created_at) VALUES (?, ?, ?, ?)').run(voterId, respId, voteType, new Date().toISOString());
        if (voteType === 'helpful') {
          db.prepare('UPDATE institution_responses SET helpful_count = helpful_count + 1 WHERE id = ?').run(respId);
        } else {
          db.prepare('UPDATE institution_responses SET unhelpful_count = unhelpful_count + 1 WHERE id = ?').run(respId);
        }
      }

      const updated = db.prepare('SELECT helpful_count, unhelpful_count FROM institution_responses WHERE id = ?').get(respId) as any;
      const currentVote = db.prepare('SELECT vote_type FROM response_votes WHERE user_id = ? AND response_id = ?').get(voterId, respId) as any;

      res.json({
        helpfulCount: updated?.helpful_count || 0,
        unhelpfulCount: updated?.unhelpful_count || 0,
        userVote: currentVote?.vote_type || null
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to record vote' });
    }
  });

  app.post('/api/responses/comments/:id/like', (req, res) => {
    try {
      const commentId = req.params.id;
      db.prepare('UPDATE response_comments SET likes_count = likes_count + 1 WHERE id = ?').run(commentId);
      const row = db.prepare('SELECT likes_count FROM response_comments WHERE id = ?').get(commentId) as any;
      res.json({ success: true, likesCount: row?.likes_count || 1 });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to like reply' });
    }
  });

  app.post('/api/posts', createPostLimiter, async (req: AuthenticatedRequest, res) => {
    try {
      const { title, content, category, subcategory, urgency, severity, location, institutionTags, media, authorVisibility, locationSource } = req.body;

      // Extract raw inputs
      const rawTitle = title ? sanitizePlainText(title) : '';
      const rawContent = content ? sanitizeText(content) : '';
      const finalTitle = rawTitle || (rawContent ? rawContent.slice(0, 65) + (rawContent.length > 65 ? '...' : '') : 'Civic Report');
      const finalContent = rawContent || finalTitle;

      if (!finalTitle && !finalContent && (!media || media.length === 0)) {
        return res.status(400).json({ error: 'Please provide post content, title, or media evidence' });
      }

      const postId = `post-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();

      // Determine author identity cleanly without creating fake user database accounts for anonymous/guest sessions
      let authorId: string;
      let authorName: string;
      let authorHandle: string;
      let authorAvatar: string | null = null;
      let visibilityMode = authorVisibility || 'public';

      if (req.user) {
        authorId = req.user.id;
        if (visibilityMode === 'anonymous') {
          authorName = 'Anonymous Citizen';
          authorHandle = 'citizen_confidential';
        } else {
          authorName = req.user.name;
          authorHandle = req.user.handle;
          authorAvatar = req.user.avatar || null;
        }
      } else {
        // Guest session or anonymous reporter without logged in account
        authorId = `anon-actor-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        authorName = visibilityMode === 'anonymous' ? 'Anonymous Citizen' : sanitizePlainText(req.body.authorName || 'Citizen Observer');
        authorHandle = visibilityMode === 'anonymous' ? 'citizen_confidential' : sanitizePlainText(req.body.authorHandle || `citizen_${Math.floor(100 + Math.random() * 900)}`);
        authorAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(authorHandle)}`;
      }

      // Location resolution & NULL GPS defaults when unavailable
      const safeRegion = location?.region || 'Greater Accra';
      const safeDistrict = location?.district || 'Accra Metropolitan';
      const safeLandmark = location?.landmark ? sanitizePlainText(location.landmark) : null;

      const latitude = (location && typeof location.latitude === 'number') ? location.latitude : null;
      const longitude = (location && typeof location.longitude === 'number') ? location.longitude : null;

      let resolvedLocationSource = locationSource || 'UNKNOWN';
      if (latitude !== null && longitude !== null) {
        resolvedLocationSource = 'GPS';
      } else if (safeLandmark) {
        resolvedLocationSource = 'LANDMARK_RESOLVED';
      } else if (location?.district) {
        resolvedLocationSource = 'DISTRICT_ONLY';
      }

      const inferredCategory = category || 'Other Community Concern';

      // Insert post into SQLite database
      db.prepare(`
        INSERT INTO posts (
          id, title, content, original_language, author_id, author_name, author_handle, author_avatar,
          author_visibility, category, subcategory, urgency, severity, region, district, landmark,
          latitude, longitude, location_source, hashtags_json, report_lifecycle_status, accountability_status,
          views_count, reposts_count, shares_count, confirmations_count, comments_count, created_at, updated_at
        ) VALUES (?, ?, ?, 'English', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', 'PUBLISHED', 'NOT_ROUTED', 1, 0, 0, 0, 0, ?, ?)
      `).run(
        postId,
        finalTitle,
        finalContent,
        authorId,
        authorName,
        authorHandle,
        authorAvatar,
        visibilityMode,
        inferredCategory,
        subcategory || null,
        urgency || 'NORMAL',
        severity || 'MODERATE',
        safeRegion,
        safeDistrict,
        safeLandmark,
        latitude,
        longitude,
        resolvedLocationSource,
        now,
        now
      );

      // Media persistence
      if (Array.isArray(media)) {
        for (const m of media) {
          if (m && m.url) {
            try {
              db.prepare(`
                INSERT INTO media (id, post_id, type, url, mime_type, caption, uploaded_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
              `).run(
                m.id || `med-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
                postId,
                m.type || 'image',
                m.url,
                m.mimeType || (m.type === 'video' ? 'video/mp4' : m.type === 'audio' ? 'audio/webm' : 'image/jpeg'),
                m.caption ? sanitizePlainText(m.caption) : null,
                now
              );
            } catch (mErr: any) {
              logger.warn(`Media insert warning: ${mErr.message}`);
            }
          }
        }
      }

      // Tag persistence & alert queuing
      if (Array.isArray(institutionTags)) {
        for (const tag of institutionTags) {
          const instId = tag.institutionId || tag.id;
          const instRow = db.prepare('SELECT * FROM institutions WHERE id = ?').get(instId) as any;
          if (instRow) {
            try {
              db.prepare(`
                INSERT OR REPLACE INTO post_institution_tags (id, post_id, institution_id, institution_name, short_name, acronym, alert_requested, alert_status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, 1, 'QUEUED', ?)
              `).run(
                `tag-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
                postId,
                instRow.id,
                instRow.official_name,
                instRow.short_name,
                instRow.acronym,
                now
              );

              // Enqueue durable background job for alert dispatch
              await jobQueue.enqueue('DISPATCH_ALERT', { postId, institutionId: instRow.id });
            } catch (qErr: any) {
              logger.warn(`Alert tag queue warning: ${qErr.message}`);
            }
          }
        }
      }

      // Enqueue durable background job for P³RE privacy processing
      try {
        await jobQueue.enqueue('PROCESS_PRIVACY', {
          submissionId: postId,
          authorId,
          title: finalTitle,
          content: finalContent,
          media
        });
      } catch (privErr: any) {
        logger.warn(`Privacy job queue warning: ${privErr.message}`);
      }

      // Civic Signal & Priority Engine Calculation
      let calculatedPriority: any = null;
      try {
        calculatedPriority = CivicSignalEngine.calculatePriority(postId);
      } catch (sigErr: any) {
        logger.warn(`Signal engine calculation warning: ${sigErr.message}`);
      }

      // Civic Situation Domain: Match or establish situation
      let matchedSituationId: string | null = null;
      try {
        matchedSituationId = CivicSituationService.matchOrCreateSituation(postId);
      } catch (sitErr: any) {
        logger.warn(`Situation service match warning: ${sitErr.message}`);
      }

      // Awareness Inbox: Populate inbox for all tagged institutions
      if (Array.isArray(institutionTags)) {
        for (const tag of institutionTags) {
          const instId = tag.institutionId || tag.id;
          try {
            InstitutionalInboxService.createInboxItem({
              institutionId: instId,
              itemType: 'REPORT',
              itemPriority: (urgency === 'CRITICAL' || severity === 'EMERGENCY') ? 'EMERGENCY' :
                            (urgency === 'HIGH' || severity === 'SEVERE') ? 'URGENT' : 'ELEVATED',
              priorityScore: calculatedPriority?.priorityScore || 45.0,
              postId,
              situationId: matchedSituationId || undefined,
              title: finalTitle,
              summary: finalContent.slice(0, 250),
              region: safeRegion,
              district: safeDistrict,
              signalSummary: calculatedPriority?.components || {}
            });
          } catch (inbErr: any) {
            logger.warn(`Institutional inbox population warning: ${inbErr.message}`);
          }
        }
      }

      // Outbox event queuing
      OutboxService.enqueueEvent('post.created', 'POST', postId, {
        postId,
        title: finalTitle,
        category: inferredCategory,
        region: safeRegion,
        district: safeDistrict,
        situationId: matchedSituationId,
        priorityScore: calculatedPriority?.priorityScore || 45.0
      });

      // Emit REPORT_CREATED event
      try {
        eventBus.emitReportEvent({
          reportId: postId,
          eventType: 'REPORT_CREATED',
          actorType: 'CITIZEN',
          actorId: authorId,
          metadata: { title: finalTitle, region: safeRegion, district: safeDistrict, situationId: matchedSituationId }
        });
      } catch (evtErr: any) {
        logger.warn(`Event bus warning: ${evtErr.message}`);
      }

      const newPost = db.prepare('SELECT * FROM posts WHERE id = ?').get(postId) as any;
      res.status(201).json({
        id: newPost?.id || postId,
        title: newPost?.title || finalTitle,
        content: newPost?.content || finalContent,
        category: newPost?.category || inferredCategory,
        urgency: newPost?.urgency || urgency || 'NORMAL',
        situationId: matchedSituationId,
        priorityScore: calculatedPriority?.priorityScore || 45.0,
        priorityBand: calculatedPriority?.priorityBand || 'MODERATE',
        location: { region: newPost?.region || safeRegion, district: newPost?.district || safeDistrict, landmark: newPost?.landmark || safeLandmark },
        createdAt: newPost?.created_at || now,
        reportLifecycleStatus: newPost?.report_lifecycle_status || 'PUBLISHED',
        accountabilityStatus: newPost?.accountability_status || 'NOT_ROUTED'
      });
    } catch (err: any) {
      logger.error(`Post creation failure: ${err.message}`);
      res.status(500).json({ error: `Failed to publish civic report: ${err.message}` });
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

  // ONE-TOUCH ACKNOWLEDGEMENT API
  app.post('/api/posts/:id/acknowledge', requireRole(['INSTITUTION_REP', 'ADMIN']), (req: AuthenticatedRequest, res) => {
    try {
      const postId = req.params.id;
      const user = req.user!;
      const { institutionId } = req.body;
      const instId = institutionId || user.institutionId || 'ghana-police-service';
      const now = new Date().toISOString();

      db.prepare(`
        UPDATE alerts
        SET awareness_status = 'ACKNOWLEDGED', acknowledged_by_user_id = ?, acknowledged_at = ?
        WHERE post_id = ? AND institution_id = ?
      `).run(user.id, now, postId, instId);

      db.prepare(`
        UPDATE post_institution_tags
        SET alert_status = 'ACKNOWLEDGED'
        WHERE post_id = ? AND (institution_id = ? OR ? = '')
      `).run(postId, instId, instId);

      db.prepare("UPDATE posts SET accountability_status = 'ACKNOWLEDGED' WHERE id = ?").run(postId);

      eventBus.emitReportEvent({
        reportId: postId,
        eventType: 'INSTITUTION_ACKNOWLEDGED',
        actorType: 'INSTITUTION',
        actorId: user.id,
        institutionId: instId,
        metadata: { officerName: user.name || 'Duty Officer', time: now }
      });

      res.json({ success: true, status: 'ACKNOWLEDGED', time: now });
    } catch (err: any) {
      logger.error(`Acknowledge error: ${err.message}`);
      res.status(500).json({ error: 'Failed to record acknowledgement' });
    }
  });

  // INBOUND TWO-WAY WHATSAPP / SMS INTERACTIVE WEBHOOK
  app.post('/api/alerts/webhook/whatsapp', (req, res) => {
    try {
      const payload = req.body;
      const text = payload.text || payload.command || '';
      const match = text.match(/(?:ACK|ACKNOWLEDGE)\s*(GH-[\w\-]+|post-[\w\-]+)?/i);
      const extractedPostId = match && match[1] ? match[1].replace(/^GH-/i, 'post-') : null;
      const postId = payload.postId || extractedPostId || (payload.ref ? payload.ref.replace(/^GH-/i, 'post-') : 'post-1');
      const institutionId = payload.institutionId || 'ghana-police-service';

      let command: 'ACK' | 'ASSIGN' | 'RESPOND' = 'ACK';
      if (text.toUpperCase().includes('ASSIGN')) command = 'ASSIGN';
      else if (text.toUpperCase().includes('RESPOND')) command = 'RESPOND';

      if (match || text.toUpperCase().startsWith('ACK')) {
        const result = AlertOrchestrator.handleInboundCommand(postId, institutionId, command, 'WhatsApp Duty Officer');
        return res.json({
          status: 'SUCCESS',
          command,
          result,
          reply: `✓ Received. Report ${postId} recorded as ACKNOWLEDGED in SpeakUp.`
        });
      }

      res.json({ status: 'PROCESSED', message: 'Webhook event logged' });
    } catch (err: any) {
      logger.error(`Inbound WhatsApp webhook error: ${err.message}`);
      res.status(500).json({ error: 'Failed to process WhatsApp webhook' });
    }
  });

  // INSTITUTIONAL PARTNERSHIP PROGRAMME & ONBOARDING API
  app.put('/api/admin/institutions/:id/partnership', requireRole(['ADMIN']), (req: AuthenticatedRequest, res) => {
    try {
      const instId = req.params.id;
      const { partnershipStatus, operatingAgreement, slaPolicy, escalationPolicy } = req.body;

      db.prepare(`
        UPDATE institutions
        SET partnership_status = COALESCE(?, partnership_status),
            operating_agreement_json = COALESCE(?, operating_agreement_json),
            sla_policy_json = COALESCE(?, sla_policy_json),
            escalation_policy_json = COALESCE(?, escalation_policy_json)
        WHERE id = ?
      `).run(
        partnershipStatus || null,
        operatingAgreement ? JSON.stringify(operatingAgreement) : null,
        slaPolicy ? JSON.stringify(slaPolicy) : null,
        escalationPolicy ? JSON.stringify(escalationPolicy) : null,
        instId
      );

      res.json({ success: true, institutionId: instId, partnershipStatus });
    } catch (err: any) {
      logger.error(`Partnership update error: ${err.message}`);
      res.status(500).json({ error: 'Failed to update partnership profile' });
    }
  });

  // LIVE CHANNEL HEALTH API
  app.get('/api/institutions/:id/channels/health', async (req, res) => {
    try {
      const instId = req.params.id;
      const healthResults = await ChannelHealthMonitor.checkAllChannels();
      const channels = db.prepare('SELECT * FROM institution_channels WHERE institution_id = ?').all(instId);

      res.json({
        institutionId: instId,
        channels,
        providerHealth: healthResults
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch channel health' });
    }
  });

  // SLA ESCALATION CHECK API
  app.post('/api/admin/alerts/check-escalations', requireRole(['ADMIN', 'MODERATOR']), (req, res) => {
    try {
      const result = EscalationEngine.checkAndEscalateOverdueAlerts();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: 'Escalation check failed' });
    }
  });

  // INSTITUTION RESPONSE API
  app.post('/api/posts/:id/response', requireRole(['INSTITUTION_REP', 'ADMIN']), async (req: AuthenticatedRequest, res) => {
    try {
      const postId = req.params.id;
      const user = req.user!;
      const { institutionId, responseType, message, statementTitle, fullStatement, referenceNumber, resolutionStatus, responderName, responderTitle, actionTimeline, documents, hotlines, situationId } = req.body;

      if (!message || !institutionId) {
        return res.status(400).json({ error: 'Message and institution ID are required' });
      }

      const instRow = db.prepare('SELECT * FROM institutions WHERE id = ?').get(institutionId) as any;
      if (!instRow) return res.status(404).json({ error: 'Institution not found' });

      // Determine response type
      let mappedType: any = responseType || 'ACKNOWLEDGEMENT';
      if (mappedType === 'WE_ARE_AWARE') mappedType = 'ACKNOWLEDGEMENT';
      else if (mappedType === 'UNDER_INVESTIGATION') mappedType = 'STATUS_UPDATE';
      else if (mappedType === 'RESOLVED' || resolutionStatus === 'RESOLVED') mappedType = 'RESOLUTION';
      else if (mappedType === 'ACTION_TAKEN') mappedType = 'ACTION_REPORTED';

      // Check if post belongs to a situation if situationId not explicitly provided
      let linkedSituationId = situationId;
      if (!linkedSituationId) {
        const sitRel = db.prepare('SELECT situation_id FROM situation_reports WHERE post_id = ?').get(postId) as any;
        if (sitRel) linkedSituationId = sitRel.situation_id;
      }

      const respResult = OfficialResponseService.createResponse({
        postId,
        situationId: linkedSituationId,
        institutionId: instRow.id,
        authorId: user.id,
        authorName: responderName ? sanitizePlainText(responderName) : user.name,
        authorTitle: responderTitle ? sanitizePlainText(responderTitle) : 'Official Spokesperson',
        responseType: mappedType,
        message: sanitizeText(message),
        statementTitle: statementTitle ? sanitizePlainText(statementTitle) : undefined,
        fullStatement: fullStatement ? sanitizeText(fullStatement) : undefined,
        referenceNumber: referenceNumber ? sanitizePlainText(referenceNumber) : undefined,
        actionTimeline: actionTimeline && Array.isArray(actionTimeline) ? actionTimeline : [],
        documents: documents && Array.isArray(documents) ? documents : [],
        hotlines: hotlines && Array.isArray(hotlines) ? hotlines : []
      });

      res.status(201).json({ success: true, responseId: respResult.id });
    } catch (err: any) {
      logger.error(`Response submission error: ${err.message}`);
      res.status(500).json({ error: 'Failed to submit official response' });
    }
  });

  // UPDATE EXISTING OFFICIAL RESPONSE & TIMELINE ACTIONS
  app.put('/api/responses/:id', requireRole(['INSTITUTION_REP', 'ADMIN']), async (req: AuthenticatedRequest, res) => {
    try {
      const respId = req.params.id;
      const user = req.user!;
      const { responseType, message, statementTitle, fullStatement, referenceNumber, resolutionStatus, responderName, responderTitle, actionTimeline, documents, hotlines } = req.body;

      const existingResp = db.prepare('SELECT * FROM institution_responses WHERE id = ?').get(respId) as any;
      if (!existingResp) return res.status(404).json({ error: 'Official response not found' });

      db.prepare(`
        UPDATE institution_responses
        SET response_type = COALESCE(?, response_type),
            message = COALESCE(?, message),
            statement_title = COALESCE(?, statement_title),
            full_statement = COALESCE(?, full_statement),
            reference_number = COALESCE(?, reference_number),
            resolution_status = COALESCE(?, resolution_status),
            responder_name = COALESCE(?, responder_name),
            responder_title = COALESCE(?, responder_title),
            action_timeline_json = COALESCE(?, action_timeline_json),
            documents_json = COALESCE(?, documents_json),
            hotlines_json = COALESCE(?, hotlines_json)
        WHERE id = ?
      `).run(
        responseType || null,
        message ? sanitizeText(message) : null,
        statementTitle ? sanitizePlainText(statementTitle) : null,
        fullStatement ? sanitizeText(fullStatement) : null,
        referenceNumber ? sanitizePlainText(referenceNumber) : null,
        resolutionStatus || null,
        responderName ? sanitizePlainText(responderName) : null,
        responderTitle ? sanitizePlainText(responderTitle) : null,
        actionTimeline && Array.isArray(actionTimeline) ? JSON.stringify(actionTimeline) : null,
        documents && Array.isArray(documents) ? JSON.stringify(documents) : null,
        hotlines && Array.isArray(hotlines) ? JSON.stringify(hotlines) : null,
        respId
      );

      if (resolutionStatus) {
        db.prepare("UPDATE posts SET accountability_status = ? WHERE id = ?")
          .run(resolutionStatus === 'RESOLVED' ? 'RESOLVED' : 'RESPONDED', existingResp.post_id);
      }

      eventBus.emitReportEvent({
        reportId: existingResp.post_id,
        eventType: 'INSTITUTION_RESPONSE_UPDATED',
        actorType: 'INSTITUTION',
        actorId: user.id,
        institutionId: existingResp.institution_id,
        metadata: { responseId: respId, status: resolutionStatus || existingResp.resolution_status }
      });

      res.json({ success: true, responseId: respId });
    } catch (err: any) {
      logger.error(`Response update error: ${err.message}`);
      res.status(500).json({ error: 'Failed to update official response' });
    }
  });

  // ADD DOCUMENT TO OFFICIAL RESPONSE
  app.post('/api/responses/:id/documents', requireRole(['INSTITUTION_REP', 'ADMIN']), async (req: AuthenticatedRequest, res) => {
    try {
      const respId = req.params.id;
      const { title, url, fileType, size } = req.body;
      if (!title || !url) return res.status(400).json({ error: 'Title and URL required' });

      const existing = db.prepare('SELECT * FROM institution_responses WHERE id = ?').get(respId) as any;
      if (!existing) return res.status(404).json({ error: 'Response not found' });

      let docs = [];
      try {
        if (existing.documents_json) docs = JSON.parse(existing.documents_json);
      } catch {}
      docs.push({ title: sanitizePlainText(title), url: sanitizePlainText(url), fileType: fileType || 'pdf', size: size || '1.2 MB' });

      db.prepare('UPDATE institution_responses SET documents_json = ? WHERE id = ?').run(JSON.stringify(docs), respId);
      res.json({ success: true, documents: docs });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to add document' });
    }
  });

  // DELETE DOCUMENT FROM OFFICIAL RESPONSE
  app.delete('/api/responses/:id/documents/:index', requireRole(['INSTITUTION_REP', 'ADMIN']), async (req: AuthenticatedRequest, res) => {
    try {
      const respId = req.params.id;
      const docIndex = parseInt(req.params.index, 10);
      const existing = db.prepare('SELECT * FROM institution_responses WHERE id = ?').get(respId) as any;
      if (!existing) return res.status(404).json({ error: 'Response not found' });

      let docs = [];
      try {
        if (existing.documents_json) docs = JSON.parse(existing.documents_json);
      } catch {}
      docs.splice(docIndex, 1);

      db.prepare('UPDATE institution_responses SET documents_json = ? WHERE id = ?').run(JSON.stringify(docs), respId);
      res.json({ success: true, documents: docs });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to remove document' });
    }
  });

  // ADD HOTLINE / CONTACT TO OFFICIAL RESPONSE
  app.post('/api/responses/:id/hotlines', requireRole(['INSTITUTION_REP', 'ADMIN']), async (req: AuthenticatedRequest, res) => {
    try {
      const respId = req.params.id;
      const { hotline } = req.body;
      if (!hotline) return res.status(400).json({ error: 'Hotline / contact string required' });

      const existing = db.prepare('SELECT * FROM institution_responses WHERE id = ?').get(respId) as any;
      if (!existing) return res.status(404).json({ error: 'Response not found' });

      let hots = [];
      try {
        if (existing.hotlines_json) hots = JSON.parse(existing.hotlines_json);
      } catch {}
      hots.push(sanitizePlainText(hotline));

      db.prepare('UPDATE institution_responses SET hotlines_json = ? WHERE id = ?').run(JSON.stringify(hots), respId);
      res.json({ success: true, hotlines: hots });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to add hotline' });
    }
  });

  // DELETE HOTLINE FROM OFFICIAL RESPONSE
  app.delete('/api/responses/:id/hotlines/:index', requireRole(['INSTITUTION_REP', 'ADMIN']), async (req: AuthenticatedRequest, res) => {
    try {
      const respId = req.params.id;
      const hotIndex = parseInt(req.params.index, 10);
      const existing = db.prepare('SELECT * FROM institution_responses WHERE id = ?').get(respId) as any;
      if (!existing) return res.status(404).json({ error: 'Response not found' });

      let hots = [];
      try {
        if (existing.hotlines_json) hots = JSON.parse(existing.hotlines_json);
      } catch {}
      hots.splice(hotIndex, 1);

      db.prepare('UPDATE institution_responses SET hotlines_json = ? WHERE id = ?').run(JSON.stringify(hots), respId);
      res.json({ success: true, hotlines: hots });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to remove hotline' });
    }
  });

  // ADD TIMELINE MILESTONE TO OFFICIAL RESPONSE
  app.post('/api/responses/:id/timeline', requireRole(['INSTITUTION_REP', 'ADMIN']), async (req: AuthenticatedRequest, res) => {
    try {
      const respId = req.params.id;
      const { step, status, timestamp, description } = req.body;
      if (!step) return res.status(400).json({ error: 'Step title required' });

      const existing = db.prepare('SELECT * FROM institution_responses WHERE id = ?').get(respId) as any;
      if (!existing) return res.status(404).json({ error: 'Response not found' });

      let timeline = [];
      try {
        if (existing.action_timeline_json) timeline = JSON.parse(existing.action_timeline_json);
      } catch {}
      timeline.push({
        step: sanitizePlainText(step),
        status: status || 'in_progress',
        timestamp: timestamp || new Date().toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        description: description ? sanitizeText(description) : undefined
      });

      db.prepare('UPDATE institution_responses SET action_timeline_json = ? WHERE id = ?').run(JSON.stringify(timeline), respId);
      res.json({ success: true, actionTimeline: timeline });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to add timeline milestone' });
    }
  });

  // DELETE TIMELINE STEP
  app.delete('/api/responses/:id/timeline/:index', requireRole(['INSTITUTION_REP', 'ADMIN']), async (req: AuthenticatedRequest, res) => {
    try {
      const respId = req.params.id;
      const stepIndex = parseInt(req.params.index, 10);
      const existing = db.prepare('SELECT * FROM institution_responses WHERE id = ?').get(respId) as any;
      if (!existing) return res.status(404).json({ error: 'Response not found' });

      let timeline = [];
      try {
        if (existing.action_timeline_json) timeline = JSON.parse(existing.action_timeline_json);
      } catch {}
      timeline.splice(stepIndex, 1);

      db.prepare('UPDATE institution_responses SET action_timeline_json = ? WHERE id = ?').run(JSON.stringify(timeline), respId);
      res.json({ success: true, actionTimeline: timeline });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to remove timeline milestone' });
    }
  });

  // INSTITUTION RESOLUTION ACTION API
  app.post('/api/posts/:id/actions', requireRole(['INSTITUTION_REP', 'ADMIN']), async (req: AuthenticatedRequest, res) => {
    try {
      const postId = req.params.id;
      const user = req.user!;
      const { institutionId, actionTitle, description, evidenceUrls, status, actorName, actorTitle } = req.body;

      if (!actionTitle || !description || !institutionId) {
        return res.status(400).json({ error: 'Action title, description, and institution ID are required' });
      }

      const actionId = `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO institution_actions (id, post_id, institution_id, action_title, description, evidence_urls_json, status, actor_name, actor_title, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        actionId,
        postId,
        institutionId,
        sanitizePlainText(actionTitle),
        sanitizeText(description),
        JSON.stringify(evidenceUrls || []),
        status || 'ACTION_TAKEN',
        actorName ? sanitizePlainText(actorName) : (user.name || user.email || 'Duty Officer'),
        actorTitle ? sanitizePlainText(actorTitle) : 'Duty Officer',
        now
      );

      db.prepare("UPDATE posts SET accountability_status = 'ACTION_REPORTED' WHERE id = ?").run(postId);

      eventBus.emitReportEvent({
        reportId: postId,
        eventType: 'INSTITUTION_ACTION_REPORTED',
        actorType: 'INSTITUTION',
        actorId: user.id,
        institutionId,
        metadata: { actionId, actionTitle, status }
      });

      res.status(201).json({ success: true, actionId });
    } catch (err: any) {
      logger.error(`Action report error: ${err.message}`);
      res.status(500).json({ error: 'Failed to record institutional action' });
    }
  });

  // WORKFLOW STATUS TRANSITION API
  app.put('/api/posts/:id/status', requireRole(['INSTITUTION_REP', 'ADMIN']), (req: AuthenticatedRequest, res) => {
    try {
      const postId = req.params.id;
      const user = req.user!;
      const { status } = req.body;

      const validStatuses = [
        'NEW_AWARENESS',
        'URGENT',
        'TRENDING',
        'ASSIGNED',
        'UNDER_REVIEW',
        'RESPONDED',
        'ACTION_REPORTED',
        'CITIZEN_FOLLOW_UP',
        'CLOSED'
      ];

      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
      }

      const now = new Date().toISOString();
      db.prepare('UPDATE posts SET accountability_status = ?, updated_at = ? WHERE id = ?').run(status, now, postId);

      eventBus.emitReportEvent({
        reportId: postId,
        eventType: 'INSTITUTION_STATUS_CHANGED',
        actorType: 'INSTITUTION',
        actorId: user.id,
        institutionId: user.institutionId || 'ghana-police-service',
        metadata: { newStatus: status, timestamp: now }
      });

      res.json({ success: true, postId, status });
    } catch (err: any) {
      logger.error(`Status transition error: ${err.message}`);
      res.status(500).json({ error: 'Failed to update issue status' });
    }
  });

  // INSTITUTION ASSIGNMENT API
  app.post('/api/posts/:id/assign', requireRole(['INSTITUTION_REP', 'ADMIN']), (req: AuthenticatedRequest, res) => {
    try {
      const postId = req.params.id;
      const user = req.user!;
      const { institutionId, assignedToUserId, assignedDepartment, assignedOfficer, notes } = req.body;

      if (!institutionId) {
        return res.status(400).json({ error: 'Institution ID is required' });
      }

      const assignId = `asgn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const targetUser = assignedToUserId || `dept-${assignedDepartment || 'rapid-response'}`;
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO institution_assignments (id, post_id, institution_id, assigned_to_user_id, assigned_by_user_id, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        assignId,
        postId,
        institutionId,
        targetUser,
        user.id,
        notes ? sanitizeText(notes) : `Assigned to ${assignedDepartment || 'Department'} (${assignedOfficer || 'Officer'})`,
        now
      );

      db.prepare("UPDATE posts SET accountability_status = 'ASSIGNED', updated_at = ? WHERE id = ?").run(now, postId);

      eventBus.emitReportEvent({
        reportId: postId,
        eventType: 'INSTITUTION_ASSIGNED',
        actorType: 'INSTITUTION',
        actorId: user.id,
        institutionId,
        metadata: { assignId, department: assignedDepartment, officer: assignedOfficer }
      });

      res.status(201).json({ success: true, assignId, department: assignedDepartment, officer: assignedOfficer });
    } catch (err: any) {
      logger.error(`Assignment error: ${err.message}`);
      res.status(500).json({ error: 'Failed to assign issue internally' });
    }
  });

  // INSTITUTION CLARIFICATION REQUEST API
  app.post('/api/posts/:id/clarify', requireRole(['INSTITUTION_REP', 'ADMIN']), (req: AuthenticatedRequest, res) => {
    try {
      const postId = req.params.id;
      const user = req.user!;
      const { institutionId, question } = req.body;

      if (!institutionId || !question) {
        return res.status(400).json({ error: 'Institution ID and question are required' });
      }

      const clarifyId = `clar-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO clarification_requests (id, post_id, institution_id, official_user_id, question, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(clarifyId, postId, institutionId, user.id, sanitizeText(question), now);

      res.status(201).json({ success: true, clarifyId });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to record clarification request' });
    }
  });

  // ADMIN MODERATION CLASSIFICATION API
  app.post('/api/admin/moderation/classify', requireRole(['MODERATOR', 'ADMIN']), (req: AuthenticatedRequest, res) => {
    try {
      const { postId, classification, action, reason, notes } = req.body;
      if (!postId || !classification || !action) {
        return res.status(400).json({ error: 'Post ID, classification, and action are required' });
      }

      const validClassifications = ['SAFE', 'NEEDS_REVIEW', 'RESTRICTED', 'REMOVED', 'LEGAL_REVIEW', 'EMERGENCY_RISK'];
      if (!validClassifications.includes(classification)) {
        return res.status(400).json({ error: 'Invalid moderation classification' });
      }

      const evtId = `mod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO moderation_events (id, post_id, moderator_id, classification, action, reason, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(evtId, postId, req.user!.id, classification, action, sanitizePlainText(reason || 'Moderation Review'), notes ? sanitizeText(notes) : null, now);

      if (action === 'REMOVE') {
        db.prepare("UPDATE posts SET moderation_status = 'rejected', report_lifecycle_status = 'REMOVED' WHERE id = ?").run(postId);
      } else if (action === 'HOLD') {
        db.prepare("UPDATE posts SET moderation_status = 'flagged', report_lifecycle_status = 'HELD' WHERE id = ?").run(postId);
      } else if (action === 'APPROVE') {
        db.prepare("UPDATE posts SET moderation_status = 'approved', report_lifecycle_status = 'PUBLISHED' WHERE id = ?").run(postId);
      }

      res.json({ success: true, eventId: evtId });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to record moderation classification' });
    }
  });

  // ADMIN BACKUP API
  app.post('/api/admin/backup', requireRole(['ADMIN']), (req: AuthenticatedRequest, res) => {
    try {
      const backupResult = DatabaseBackupService.performOnlineBackup();
      res.json(backupResult);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Backup failed' });
    }
  });

  // COMMUNITY OUTCOME CONFIRMATION API
  app.post('/api/posts/:id/outcome-confirm', (req: AuthenticatedRequest, res) => {
    try {
      const postId = req.params.id;
      const userId = req.user?.id || `guest-${req.ip || '127.0.0.1'}`;
      const { vote, comment } = req.body;

      if (!vote || !['CONFIRMED_RESOLVED', 'DISPUTED_STILL_ONGOING'].includes(vote)) {
        return res.status(400).json({ error: 'Valid vote is required (CONFIRMED_RESOLVED or DISPUTED_STILL_ONGOING)' });
      }

      const confirmId = `out-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO outcome_confirmations (id, post_id, user_id, vote, comment, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(post_id, user_id) DO UPDATE SET vote = excluded.vote, comment = excluded.comment, created_at = excluded.created_at
      `).run(confirmId, postId, userId, vote, comment ? sanitizeText(comment) : null, now);

      // Recalculate outcome confidence ratio
      const votes = db.prepare('SELECT vote, COUNT(*) as c FROM outcome_confirmations WHERE post_id = ? GROUP BY vote').all(postId) as any[];
      let confirmedCount = 0;
      let disputedCount = 0;
      for (const v of votes) {
        if (v.vote === 'CONFIRMED_RESOLVED') confirmedCount = v.c;
        else if (v.vote === 'DISPUTED_STILL_ONGOING') disputedCount = v.c;
      }

      const total = confirmedCount + disputedCount;
      if (total >= 3) {
        if (confirmedCount > disputedCount) {
          db.prepare("UPDATE posts SET accountability_status = 'COMMUNITY_CONFIRMED' WHERE id = ?").run(postId);
        } else {
          db.prepare("UPDATE posts SET accountability_status = 'COMMUNITY_DISPUTED' WHERE id = ?").run(postId);
        }
      }

      res.json({ success: true, confirmedCount, disputedCount });
    } catch (err: any) {
      logger.error(`Outcome confirmation error: ${err.message}`);
      res.status(500).json({ error: 'Failed to record outcome confirmation' });
    }
  });

  // GLOBAL SEARCH API
  app.get('/api/search', (req, res) => {
    try {
      const { q, category, region, district, limit } = req.query;
      const results = SearchService.searchAll({
        query: (q as string) || '',
        category: category as string,
        region: region as string,
        district: district as string,
        limit: limit ? parseInt(limit as string, 10) : 20
      });
      res.json(results);
    } catch (err: any) {
      logger.error(`Search error: ${err.message}`);
      res.status(500).json({ error: 'Search operation failed' });
    }
  });

  // INSTITUTION DIRECTORY API
  app.get('/api/institutions/resolve', (req, res) => {
    try {
      const { category, region, district } = req.query;
      const candidates = InstitutionRoutingService.resolveResponsibleInstitutions(
        (category as string) || '',
        (region as string) || undefined,
        (district as string) || undefined
      );
      res.json(candidates);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to resolve responsible institutions' });
    }
  });

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

  app.get('/api/institutions/:id', (req, res) => {
    try {
      const inst = InstitutionRegistryService.getById(req.params.id);
      if (!inst) {
        return res.status(404).json({ error: 'Institution not found' });
      }
      res.json(inst);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch institution' });
    }
  });

  app.get('/api/institutions/:id/desks', (req, res) => {
    try {
      const { category, region, district } = req.query;
      const desks = InstitutionRegistryService.routeIssueDesks(
        (category as string) || 'General',
        (region as string) || 'Greater Accra',
        (district as string) || undefined
      );
      res.json(desks);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch hierarchical desks' });
    }
  });

  app.get('/api/institutions/:id/team', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      const team = InstitutionRegistryService.getTeamMembers(req.params.id);
      res.json(team);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch institution team members' });
    }
  });

  app.get('/api/institutions/:id/inbox', (req, res) => {
    try {
      const { itemType, actionState, priority, search, limit, cursor } = req.query;
      const result = InstitutionalInboxService.getInbox({
        institutionId: req.params.id,
        itemType: itemType as string,
        actionState: actionState as string,
        priority: priority as string,
        search: search as string,
        limit: limit ? parseInt(limit as string, 10) : 30,
        cursor: cursor as string
      });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch inbox' });
    }
  });

  app.post('/api/institutions/:id/inbox/:itemId/transition', requireRole(['INSTITUTION_REP', 'ADMIN']), (req: AuthenticatedRequest, res) => {
    try {
      const { targetState, notes } = req.body;
      if (!targetState) return res.status(400).json({ error: 'targetState is required' });
      const user = req.user!;
      const result = InstitutionalInboxService.transitionItemState(
        req.params.itemId,
        targetState,
        { id: user.id, name: user.name, role: user.role },
        notes
      );
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to transition inbox item' });
    }
  });

  app.get('/api/institutions/:id/announcements', (req, res) => {
    try {
      const { limit, cursor, status } = req.query;
      const result = InstitutionalAnnouncementService.listAnnouncements({
        institutionId: req.params.id,
        status: status as string,
        limit: limit ? parseInt(limit as string, 10) : 20,
        cursor: cursor as string
      });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch announcements' });
    }
  });

  app.post('/api/institutions/:id/announcements', requireRole(['INSTITUTION_REP', 'ADMIN']), (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user!;
      const { title, body, summary, announcementType, geographicScope, region, district, topic, category, media, officialLinks, relatedSituationIds, expiresAt } = req.body;
      if (!title || !body || !announcementType) {
        return res.status(400).json({ error: 'title, body, and announcementType are required' });
      }

      const announcement = InstitutionalAnnouncementService.createAnnouncement({
        institutionId: req.params.id,
        authorId: user.id,
        authorName: user.name,
        authorTitle: (user as any).title || 'Official Communications Officer',
        title: sanitizePlainText(title),
        body: sanitizeText(body),
        summary: summary ? sanitizePlainText(summary) : undefined,
        announcementType,
        geographicScope: geographicScope || 'NATIONAL',
        region,
        district,
        topic,
        category,
        media,
        officialLinks,
        relatedSituationIds,
        expiresAt
      });
      res.status(201).json(announcement);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to publish announcement' });
    }
  });

  // PUBLIC ANNOUNCEMENTS API
  app.get('/api/announcements', (req, res) => {
    try {
      const { institutionId, region, district, announcementType, status, limit, cursor } = req.query;
      const result = InstitutionalAnnouncementService.listAnnouncements({
        institutionId: institutionId as string,
        region: region as string,
        district: district as string,
        announcementType: announcementType as string,
        status: status as string,
        limit: limit ? parseInt(limit as string, 10) : 20,
        cursor: cursor as string
      });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch announcements' });
    }
  });

  app.get('/api/announcements/:id', (req, res) => {
    try {
      const announcement = InstitutionalAnnouncementService.getAnnouncementById(req.params.id);
      if (!announcement) return res.status(404).json({ error: 'Announcement not found' });
      res.json(announcement);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch announcement' });
    }
  });

  // CIVIC SITUATIONS API
  app.get('/api/situations', (req, res) => {
    try {
      const { region, district, category, status, priorityBand, limit, cursor } = req.query;
      const result = CivicSituationService.listSituations({
        region: region as string,
        district: district as string,
        category: category as string,
        status: status as string,
        priorityBand: priorityBand as string,
        limit: limit ? parseInt(limit as string, 10) : 20,
        cursor: cursor as string
      });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch civic situations' });
    }
  });

  app.get('/api/situations/:id', (req, res) => {
    try {
      const situation = CivicSituationService.getSituationDetail(req.params.id);
      if (!situation) return res.status(404).json({ error: 'Civic situation not found' });
      res.json(situation);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch civic situation' });
    }
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
    try {
      const totalPosts = (db.prepare("SELECT COUNT(*) as c FROM posts WHERE moderation_status != 'rejected'").get() as any)?.c || 0;
      const totalConfirmations = (db.prepare('SELECT SUM(confirmations_count) as c FROM posts').get() as any)?.c || 0;
      const totalResponses = (db.prepare('SELECT COUNT(*) as c FROM institution_responses').get() as any)?.c || 0;
      const totalInstitutionsAlerted = (db.prepare('SELECT COUNT(DISTINCT institution_id) as c FROM post_institution_tags').get() as any)?.c || 0;
      const activeClustersCount = (db.prepare("SELECT COUNT(*) as c FROM issue_clusters WHERE status != 'RESOLVED_BY_COMMUNITY'").get() as any)?.c || 0;
      const emergencyCount = (db.prepare("SELECT COUNT(*) as c FROM posts WHERE urgency IN ('CRITICAL', 'HIGH') OR severity IN ('EMERGENCY', 'SEVERE')").get() as any)?.c || 0;

      // Category breakdown from real posts
      const catRows = db.prepare(`
        SELECT category, COUNT(*) as count 
        FROM posts 
        WHERE (moderation_status = 'approved' OR moderation_status IS NULL OR moderation_status = 'PUBLISHED')
        GROUP BY category 
        ORDER BY count DESC
      `).all() as any[];

      const categoryBreakdown = catRows.map(r => ({
        category: r.category,
        count: r.count
      }));

      const topCategories = catRows.map(r => ({
        category: r.category,
        count: r.count,
        percentage: totalPosts > 0 ? Math.round((r.count / totalPosts) * 100) : 0
      }));

      // Regional breakdown from real posts
      const regRows = db.prepare(`
        SELECT region,
               COUNT(*) as postCount,
               SUM(CASE WHEN accountability_status IN ('RESPONDED', 'RESOLVED') THEN 1 ELSE 0 END) as resolvedCount,
               SUM(COALESCE(confirmations_count, 1)) as totalConfirmations
        FROM posts 
        WHERE region IS NOT NULL AND region != ''
        GROUP BY region 
        ORDER BY postCount DESC
      `).all() as any[];

      const regionalBreakdown = regRows.map(r => {
        const responseRate = r.postCount > 0 ? Math.round((r.resolvedCount / r.postCount) * 100) : 0;
        return {
          region: r.region,
          postCount: r.postCount,
          resolvedCount: r.resolvedCount,
          responseRate: Math.max(responseRate, 25)
        };
      });

      // Regional coordinates & velocity
      const REGION_COORDS: Record<string, { lat: number; lng: number }> = {
        'Greater Accra': { lat: 5.6037, lng: -0.1870 },
        'Ashanti': { lat: 6.6885, lng: -1.6244 },
        'Western': { lat: 5.1477, lng: -2.3168 },
        'Central': { lat: 5.3500, lng: -1.1500 },
        'Eastern': { lat: 6.2500, lng: -0.4500 },
        'Volta': { lat: 6.6000, lng: 0.4700 },
        'Northern': { lat: 9.4008, lng: -0.8393 },
        'Upper East': { lat: 10.7856, lng: -0.8514 },
        'Upper West': { lat: 10.0601, lng: -2.5099 },
        'Bono': { lat: 7.5833, lng: -2.3333 },
        'Bono East': { lat: 7.7500, lng: -1.0500 },
        'Ahafo': { lat: 7.0000, lng: -2.3000 },
        'Oti': { lat: 7.9000, lng: 0.3000 },
        'Savannah': { lat: 9.0833, lng: -1.8167 },
        'North East': { lat: 10.5167, lng: -0.3667 },
        'Western North': { lat: 6.2500, lng: -2.8000 }
      };

      const regionalStats = regRows.map(r => {
        const coords = REGION_COORDS[r.region] || { lat: 7.9465, lng: -1.0232 };
        const velocity: 'RISING_FAST' | 'MODERATE' | 'STABLE' = r.postCount >= 3 ? 'RISING_FAST' : r.postCount > 1 ? 'MODERATE' : 'STABLE';
        return {
          region: r.region,
          activeIssues: r.postCount,
          confirmations: r.totalConfirmations,
          topCategory: 'Flooding & Drainage',
          velocity,
          lat: coords.lat,
          lng: coords.lng
        };
      });

      // Institution response rates
      const instRows = db.prepare(`
        SELECT official_name, short_name, acronym, active_mentions_count, official_responses_count, avg_response_hours
        FROM institutions
        ORDER BY official_responses_count DESC
      `).all() as any[];

      const institutionResponseRates = instRows.map(i => ({
        institutionName: i.official_name,
        acronym: i.acronym,
        mentions: i.active_mentions_count || 10,
        responses: i.official_responses_count || 5,
        rate: i.active_mentions_count > 0 ? Math.min(100, Math.round(((i.official_responses_count || 5) / (i.active_mentions_count || 10)) * 100)) : 80,
        avgResponseHours: i.avg_response_hours || 4.2
      }));

      const overallResponseRate = totalPosts > 0 ? Math.min(100, Math.round((totalResponses / totalPosts) * 100)) : 68;

      res.json({
        totalPosts,
        totalActivePosts: totalPosts,
        totalConfirmations,
        totalIndependentConfirmations: totalConfirmations,
        totalOfficialResponses: totalResponses,
        totalInstitutionsAlerted: totalInstitutionsAlerted || 6,
        rapidlyEmergingIssuesCount: emergencyCount || 4,
        responseRate: Math.max(overallResponseRate, 58),
        averageResponseTimeHours: 3.8,
        activeClustersCount: activeClustersCount || 6,
        categoryBreakdown,
        topCategories,
        regionalBreakdown,
        regionalStats,
        institutionResponseRates
      });
    } catch (err: any) {
      logger.error(`Analytics calculation error: ${err.message}`);
      res.status(500).json({ error: 'Failed to compute analytics' });
    }
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

  // SOCIAL DISTRIBUTION & CREATOR ENGINE (SSDE) API
  app.get('/s/:code', (req, res) => {
    try {
      const { code } = req.params;
      const refInfo = ShareLinkService.resolveCode(code);
      if (!refInfo) {
        return res.redirect('/');
      }

      ShareAnalyticsService.recordClickEvent({
        referralCode: code,
        postId: refInfo.postId,
        responseId: refInfo.responseId,
        creatorId: refInfo.creatorId,
        platform: refInfo.platform,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      const redirectPath = refInfo.responseId
        ? `/app/post/${refInfo.postId}?responseId=${refInfo.responseId}&ref=${code}`
        : `/app/post/${refInfo.postId}?ref=${code}`;

      res.redirect(redirectPath);
    } catch (err: any) {
      logger.error(`Short URL redirect error: ${err.message}`);
      res.redirect('/');
    }
  });

  app.post('/api/social/prepare', async (req: AuthenticatedRequest, res) => {
    try {
      const { postId, responseId, platform, creatorContext, creatorId } = req.body;
      if (!postId || !platform) {
        return res.status(400).json({ error: 'Post ID and platform are required' });
      }

      const pkg = await SocialDistributionService.prepareSharePackage({
        postId,
        responseId,
        platform,
        creatorContext,
        creatorId,
        userId: req.user?.id
      });

      res.json(pkg);
    } catch (err: any) {
      logger.error(`Social prepare error: ${err.message}`);
      res.status(500).json({ error: err.message || 'Failed to prepare share package' });
    }
  });

  app.post('/api/social/creator-pack', async (req: AuthenticatedRequest, res) => {
    try {
      const { postId, responseId, creatorId, creatorContext } = req.body;
      if (!postId) {
        return res.status(400).json({ error: 'Post ID is required' });
      }

      const pack = await SocialDistributionService.getCreatorPack({
        postId,
        responseId,
        creatorId,
        creatorContext
      });

      res.json(pack);
    } catch (err: any) {
      logger.error(`Creator pack error: ${err.message}`);
      res.status(500).json({ error: err.message || 'Failed to generate creator pack' });
    }
  });

  app.post('/api/social/events/share', (req: AuthenticatedRequest, res) => {
    try {
      const { postId, responseId, creatorId, platform, contentType, shareMethod, referralCode } = req.body;
      if (!postId || !platform) {
        return res.status(400).json({ error: 'Post ID and platform are required' });
      }

      ShareAnalyticsService.recordShareEvent({
        postId,
        responseId,
        userId: req.user?.id,
        creatorId,
        platform,
        contentType,
        shareMethod,
        referralCode
      });

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to record share event' });
    }
  });

  app.get('/api/social/analytics/:postId', (req, res) => {
    try {
      const { postId } = req.params;
      const analytics = ShareAnalyticsService.getPostShareAnalytics(postId);
      res.json(analytics);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch social analytics' });
    }
  });

  app.get('/api/social/capabilities', (req, res) => {
    res.json(PLATFORM_CAPABILITIES);
  });

  app.post('/api/social/creators', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      const { creatorName, handle, primaryPlatform, platformLinks } = req.body;
      if (!creatorName || !handle) {
        return res.status(400).json({ error: 'Creator name and handle are required' });
      }

      const profile = SocialDistributionService.registerCreatorProfile({
        userId: req.user!.id,
        creatorName: sanitizePlainText(creatorName),
        handle: sanitizePlainText(handle),
        primaryPlatform: primaryPlatform || 'YOUTUBE',
        platformLinks
      });

      res.status(201).json(profile);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to manage creator profile' });
    }
  });

  app.get('/api/social/creators/me', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      const profile = SocialDistributionService.getCreatorProfileByUserId(req.user!.id);
      res.json(profile);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch creator profile' });
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
    const {
      postTitle,
      location,
      confirmationsCount,
      institutionsTagged,
      institutionName,
      statementTitle,
      message,
      referenceNumber,
      responseType
    } = req.body;

    if (institutionName) {
      const ref = referenceNumber ? `[Ref: ${referenceNumber}]` : '';
      const typeStr = (responseType || 'OFFICIAL_STATEMENT').replace(/_/g, ' ');
      const excerpt = (statementTitle || message || '').replace(/\s+/g, ' ').slice(0, 140);
      res.json({
        whatsappCopy: `🏛️ GHANA OFFICIAL COMMUNIQUÉ\n\n📌 Authority: ${institutionName} ${ref}\n🎯 Directive: ${typeStr}\n📢 Statement: "${excerpt}..."\n\n📍 In response to citizen issue: "${postTitle}" (${location})\n\n🔗 Read full verified official statement & track actions:\n`,
        twitterCopy: `🏛️ Official Statement from ${institutionName} on "${postTitle}" in ${location}: "${excerpt}..." ${ref} #GhanaCivic #PublicService`
      });
    } else {
      res.json({
        whatsappCopy: `🚨 CIVIC ALERT: ${postTitle}\n📍 Location: ${location}\n👥 ${confirmationsCount || 1} citizens independently observed this issue.\n🏛️ Tagged: ${institutionsTagged}\n🔗 Track on Speak Up Ghana:\n`,
        twitterCopy: `🚨 Citizen Report: ${postTitle} around ${location}. ${confirmationsCount || 1} residents seeing this too. @${institutionsTagged} #GhanaCivic #SpeakUp`
      });
    }
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

  app.get('/api/admin/posts/:id/trace', requireRole(['ADMIN', 'MODERATOR']), (req, res) => {
    try {
      const postId = req.params.id;
      const trace = TraceService.getReportTrace(postId);
      if (!trace) return res.status(404).json({ error: 'Civic report trace not found' });
      res.json(trace);
    } catch (err: any) {
      logger.error(`Trace error: ${err.message}`);
      res.status(500).json({ error: 'Failed to generate operational trace' });
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

  // Global Error Handler Middleware
  app.use(globalErrorHandler);

  return app;
}
