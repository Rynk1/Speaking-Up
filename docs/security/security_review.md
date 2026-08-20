# Security Architecture & Release Verification

## Security Review Checklist (PRD Section 21)

### 1. Authentication & Authorization
- Server-side JWT signature verification (`authMiddleware`) on all mutation endpoints.
- Role-based authorization (`requireRole`) enforcing permission checks on official institutional responses and administrative actions.
- Password storage strictly protected with bcrypt (cost factor 10).

### 2. Secret Exposure Prevention
- Server-side API key isolation: `GEMINI_API_KEY` and `JWT_SECRET` are read strictly from server environment variables. Zero credentials are embedded in client bundle.

### 3. IDOR & Access Control (PRD Section 206)
- User privacy levels (`public`, `anonymous`) enforced. Private/anonymous internal user metadata is strictly filtered prior to returning JSON to client interfaces.

### 4. Input Sanitization & SQL Injection Protection
- SQLite queries use parameterized prepared statements (`db.prepare(...)`) across all endpoints, eliminating SQL injection risk.
- HTML input sanitization on citizen post rendering.
