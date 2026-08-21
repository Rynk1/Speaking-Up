import rateLimit from 'express-rate-limit';

/**
 * Strict limiter for authentication endpoints (login/register)
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  message: { error: 'Too many authentication attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Moderate limiter for report submission
 */
export const createPostLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Report creation limit reached. Please wait a few minutes before submitting another report.' },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Limiter for comments and evidence updates
 */
export const commentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  message: { error: 'Too many comments submitted. Please wait a moment.' },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Limiter for drafts endpoint
 */
export const draftLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Draft rate limit exceeded.' },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Limiter for abuse reporting
 */
export const abuseReportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Abuse report rate limit reached.' },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * General API request limiter
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: 'API rate limit exceeded.' },
  standardHeaders: true,
  legacyHeaders: false
});
