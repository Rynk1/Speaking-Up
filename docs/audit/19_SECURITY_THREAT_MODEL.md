# 19 - Security Threat Model

## 1. Threat Vectors & Vulnerability Matrix

| Threat ID | Threat Vector | Target Component | Likelihood | Impact | Severity | Countermeasure / Fix |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **STR-01** | IDOR on Draft Endpoint | `GET/POST /api/drafts` | High | Medium | **HIGH** | Require authenticated user JWT token |
| **STR-02** | Direct Access to Protected Media | `/uploads/public/` | Medium | High | **HIGH** | Serve protected assets through authenticated API proxy |
| **STR-03** | Brute Force Auth / API Abuse | `/api/auth/login`, `/api/posts` | High | Medium | **HIGH** | Attach `express-rate-limit` middleware |
| **STR-04** | Stored XSS via Rich Comments | `Comment`, `InstitutionResponse` | Medium | High | **HIGH** | Sanitize inputs with `sanitize-html` |
| **STR-05** | Weak JWT Secret Fallback | `server/storage.ts`, `server.ts` | Low | High | **MEDIUM** | Enforce non-default `JWT_SECRET` on server start |
| **STR-06** | Institutional Impersonation | Account Registration | Low | Critical | **HIGH** | Manual admin verification for INSTITUTION_REP role |
