# 22 - Remediation Roadmap

## Priority Implementation Sequence

### Phase P0 — Critical Blockers (Security & IDOR)
1. **Remediate IDOR on Drafts Endpoint:**
   - *Requirement:* Enforce mandatory JWT authentication on `GET /api/drafts` and `POST /api/drafts`.
   - *Files Affected:* `server.ts`
   - *Acceptance Criteria:* Unauthenticated draft requests return `401 Unauthorized`.
2. **Add Input Sanitization & Rate Limiting Middleware:**
   - *Requirement:* Install `express-rate-limit` and `sanitize-html`.
   - *Files Affected:* `server.ts`, `package.json`
   - *Acceptance Criteria:* Rate limit triggers after 100 requests / 15 min per IP. All text inputs sanitized against XSS.

---

### Phase P1 — Core Functional Integrations (Alert Engine & Real Transport)
1. **Implement Real Outbound `InstitutionNotificationAdapter`:**
   - *Requirement:* Create webhook, SMTP email, and SMS transport adapters for alert dispatching.
   - *Files Affected:* `server/notifications/alertEngine.ts` (new), `server.ts`
   - *Acceptance Criteria:* External POST to webhook endpoint or email dispatched when post tagged.

---

### Phase P2 — Security & Privacy Enhancements (Protected Assets)
1. **Secure Protected Media Routes:**
   - *Requirement:* Proxy access to protected assets via signed tokens.
   - *Files Affected:* `server.ts`, `server/storage.ts`
   - *Acceptance Criteria:* Accessing raw protected evidence without valid token returns `403 Forbidden`.

---

### Phase P3 — Reliability & Real-time (Server-Sent Events)
1. **Implement Server-Sent Events (SSE) Stream:**
   - *Requirement:* Create `/api/events` SSE route broadcasting `POST_CREATED` and `RESPONSE_SUBMITTED` events.
   - *Files Affected:* `server.ts`, `src/App.tsx`
   - *Acceptance Criteria:* Feed automatically updates in real-time without manual browser refresh.

---

### Phase P4 — Scale & Performance
1. **Asynchronous Background Task Queue:**
   - *Requirement:* Offload P³RE privacy processing and Gemini AI analysis to lightweight background queue.
   - *Files Affected:* `server.ts`, `server/privacy/privacyOrchestrator.ts`
   - *Acceptance Criteria:* `POST /api/posts` returns within <200ms.

---

### Phase P5 — Enhancements
1. **Dynamic Server-Side OpenGraph Link Previews:**
   - *Requirement:* Dynamic meta tag injection for social media crawlers.
   - *Files Affected:* `server.ts`
   - *Acceptance Criteria:* WhatsApp/X link previews show post title, region, and thumbnail image.
