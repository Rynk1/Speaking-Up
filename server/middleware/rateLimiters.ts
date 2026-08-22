import rateLimit from 'express-rate-limit';

const baseRateLimitOptions = {
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    trustProxy: false,
    xForwardedForHeader: false,
    forwardedHeader: false,
  },
};

/**
 * Strict limiter for authentication endpoints (login/register)
 */
export const authLimiter = rateLimit({
  ...baseRateLimitOptions,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  message: { error: 'Too many authentication attempts. Please try again after 15 minutes.' },
});

/**
 * Moderate limiter for report submission
 */
export const createPostLimiter = rateLimit({
  ...baseRateLimitOptions,
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Report creation limit reached. Please wait a few minutes before submitting another report.' },
});

/**
 * Limiter for comments and evidence updates
 */
export const commentLimiter = rateLimit({
  ...baseRateLimitOptions,
  windowMs: 15 * 60 * 1000,
  max: 40,
  message: { error: 'Too many comments submitted. Please wait a moment.' },
});

/**
 * Limiter for drafts endpoint
 */
export const draftLimiter = rateLimit({
  ...baseRateLimitOptions,
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Draft rate limit exceeded.' },
});

/**
 * Limiter for abuse reporting
 */
export const abuseReportLimiter = rateLimit({
  ...baseRateLimitOptions,
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Abuse report rate limit reached.' },
});

/**
 * General API request limiter
 */
export const apiLimiter = rateLimit({
  ...baseRateLimitOptions,
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: 'API rate limit exceeded.' },
});
