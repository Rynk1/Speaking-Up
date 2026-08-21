# 06 - Authentication & Security Audit

## 1. Authentication Mechanism
- **Implementation:** JSON Web Tokens (JWT) signed with HMAC-SHA256.
- **Password Hashing:** `bcryptjs` with salt rounds = 10.
- **Session Handling:** Bearer token transmitted in `Authorization` HTTP header and stored in client `localStorage`.

## 2. Security Vetting & Vulnerability Assessment

### A. IDOR (Insecure Direct Object Reference)
- **Status:** `VULNERABLE (MEDIUM RISK)`
- **Finding:** Draft endpoints (`GET /api/drafts`, `POST /api/drafts`) fall back to `req.user?.id || 'guest-user'`. Unauthenticated users access the shared `draft-guest-user` key, potentially leaking unauthenticated draft content.
- **Remediation:** Require authenticated token for draft endpoint or isolate unauthenticated drafts using client-side IndexedDB only.

### B. Input Sanitization & XSS
- **Status:** `VULNERABLE (MEDIUM RISK)`
- **Finding:** Post content, comments, and official statements accept HTML/Markdown strings without explicit server-side DOMPurify/sanitize-html filtering prior to rendering.
- **Remediation:** Add `sanitize-html` middleware to clean text inputs.

### C. Rate Limiting & Brute Force Protection
- **Status:** `MISSING (HIGH RISK)`
- **Finding:** Public endpoints (`/api/auth/login`, `/api/auth/register`, `/api/posts`, `/api/reports/abuse`) lack IP-based rate limiting.
- **Remediation:** Install `express-rate-limit` middleware (e.g. 100 requests per 15 minutes per IP; 5 login attempts per 15 mins).

### D. CORS & Headers
- **Status:** `FUNCTIONAL_BUT_WEAK`
- **Finding:** CORS is enabled broadly. Security headers (Helmet) are not attached to Express.
- **Remediation:** Add `helmet()` middleware and configure explicit CORS origins.
