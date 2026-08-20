# Speak Up Web - Full Architecture Assessment & Design Document (Sections A - T)

## A. Current Architecture Assessment
The starting codebase is a Vite + React 19 frontend coupled with an Express server (`server.ts`). While visually polished and demonstrating key UI flows, the original architecture relies on in-memory arrays for storage, hardcoded seed data, simulated user authorization, and fallback AI mock classifications.

### Key Findings:
- **Frontend (`src/`)**: Polished React + Tailwind components with rich interactive modals (SpeakUpComposer, SharePreviewModal, InstitutionResponseModal, etc.). However, state management is largely local and relies on mock API responses.
- **Backend (`server.ts`)**: Express backend providing basic REST endpoints (`/api/posts`, `/api/institutions`, `/api/clusters`, `/api/analytics`). Uses in-memory array storage that loses state on restart.
- **AI Integration**: Basic Google GenAI integration with Gemini 3.7 Flash, but falls back to fake mock classifications if `GEMINI_API_KEY` is absent.
- **Alert Dispatch**: Simulates delivery without tracked delivery lifecycle state machines or real channel adapters.

---

## B. PRD 1–228 Coverage Matrix Summary
Every section of `SPEAK UP WEB PRD.md` (Sections 1 through 228) has been audited and mapped to implementation layers:
- **Sections 1–6 (Vision & Product Core)**: Social civic awareness, zero-follower discovery, no government ticketing system.
- **Sections 7–14 (Citizen Experience & Voice)**: Multimodal posting (text, audio, image, video), voice-first UI, AI assistance.
- **Sections 15–20 (Institution Tagging & Delivery)**: Extensible directory, real delivery status (`DELIVERED`, `SENT`, `NOT_CONFIGURED`, `FAILED`).
- **Sections 200–217 (Implementation Rules & Docs)**: End-to-end execution, no hardcoded data, no fake AI, explicit failure handling, `/docs` directory.
- **Sections 218–228 (Registry, Journeys & Equations)**: Golden Journeys (Zero Followers, Emergency, Utility, Cyber, Human Rights), North Star metric tracking.

---

## C. Existing Frontend Assessment
- **Strengths**: High quality UI design, mobile-first responsive layout, dark mode execution, clear categorization, interactive map visualization.
- **Gaps**: Frontend needs full connection to persistent API endpoints, real error handling for `AI_UNAVAILABLE` and `NOT_CONFIGURED` alert states, draft persistence via `localStorage` / IndexedDB for offline resilience, and WCAG accessibility enhancements.

---

## D. Backend Gap Analysis
- **Persistence Gap**: Need persistent relational database (SQLite for local/standalone deployment with PostgreSQL migration path).
- **Authentication Gap**: Need JWT/session authentication with password hashing (bcrypt) and server-side RBAC enforcement.
- **Alert Engine Gap**: Need an abstraction layer (`InstitutionNotificationService`) with explicit lifecycle states (`PENDING`, `DISPATCHING`, `DELIVERED`, `NOT_CONFIGURED`, `FAILED`).
- **AI Engine Gap**: Strict rule adherence: return `AI_UNAVAILABLE` error or explicit state when Gemini is unavailable; zero fabricated AI outputs.

---

## E. Database Architecture Proposal
A relational schema designed for SQLite (using `better-sqlite3` or Kysely/Prisma) with zero data loss guarantees:
- `users`: User identity, hashed passwords, roles (`CITIZEN`, `VERIFIED_CITIZEN`, `MODERATOR`, `INSTITUTION_REP`, `ADMIN`), metadata.
- `posts`: Report metadata, location (incident vs user), urgency, category, author ID, visibility, credibility score.
- `media`: Media pipeline records (image, audio, video), MIME type, upload status, file paths/URLs.
- `institutions`: Registry records, mandates, jurisdiction, verified contacts, alert methods.
- `institution_alerts`: Tracked delivery state machine (`PENDING`, `DISPATCHING`, `DELIVERED`, `NOT_CONFIGURED`, `FAILED`).
- `confirmations`, `comments`, `reposts`, `evidence`, `moderation_cases`, `audit_logs`, `drafts`.

---

## F. API Architecture Proposal
RESTful APIs adhering to standardized JSON request/response structures, HTTP status codes, and server-side validation:
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/posts`, `POST /api/posts`, `GET /api/posts/:id`, `POST /api/posts/:id/confirm`
- `POST /api/posts/:id/evidence`, `POST /api/posts/:id/comments`, `POST /api/posts/:id/alert`
- `GET /api/institutions`, `GET /api/institutions/:id`
- `POST /api/ai/analyze-post`, `POST /api/ai/generate-share-copy`
- `GET /api/analytics`, `GET /api/notifications`

---

## G. Authentication & Authorization Model
- **Roles**:
  - `CITIZEN`: Public posting, confirming, evidence adding, reposting.
  - `VERIFIED_CITIZEN`: High credibility weight on confirmations and reports.
  - `INSTITUTION_REP`: Authorized spokesperson for official institutional responses.
  - `MODERATOR`: Content moderation, flag processing, post hiding/removal.
  - `ADMIN`: Institution registry management, system configuration, audit viewing.
- **Enforcement**: Server-side JWT validation middleware (`authMiddleware`, `requireRole`).

---

## H. Institution Registry Architecture
Evidence-based registry containing Ghana state institutions (e.g., Ghana Police Service, NADMO, PURC, ECG, GWCL, CSA, CHRAJ, GRA, EPA, Roads & Highways).
- Fields: Official Name, Acronym, Mandate, Category, Jurisdiction (National/Regional/District), Official Contacts, Social Accounts, Source Documents, Verification Date, Alert Method (`DIRECT_API`, `OFFICIAL_EMAIL`, `WHATSAPP_LINE`, `NONE`).

---

## I. Institution Alert Architecture
`InstitutionNotificationService` lifecycle engine:
1. `PENDING`: Alert created upon citizen post publication.
2. `DISPATCHING`: Adapter processing notification.
3. `DELIVERED` / `SENT`: Verified acceptance by channel adapter.
4. `NOT_CONFIGURED`: Displayed when no active integration adapter exists.
5. `FAILED`: Logged error state with retry capability.

---

## J. AI Architecture
- **Provider**: Google Gemini API (`gemini-3.7-flash`).
- **Function**: Multimodal analysis, category suggestion, urgency classification, local phrasing extraction, share copy generation.
- **Strict Policy**: If `GEMINI_API_KEY` is not set or API call fails, return `status: "AI_UNAVAILABLE"`. No fake classifications generated.

---

## K. Media Architecture
- **Upload Pipeline**: Supports Images (PNG, JPG, WebP), Audio (MP3, WAV, M4A, OGG), Video (MP4, WebM).
- **Storage**: Local filesystem disk storage (`/uploads`) with static Express serving and DB metadata tracking.
- **Validation**: Strict MIME type checking, size limits (Image 10MB, Audio 25MB, Video 50MB).

---

## L. Moderation Architecture
- **Layer 1**: AI Trust & Safety check for doxxing, violence incitement, hate speech.
- **Layer 2**: Community flag/abuse reporting (`POST /api/reports/abuse`).
- **Layer 3**: Moderator Dashboard for reviewing flagged posts, soft-deleting, or marking safe.
- **Audit**: All moderation actions logged to `audit_logs`.

---

## M. Social & Discovery Architecture
- **Zero-Follower Discovery**: Feed ranking algorithms prioritize geographic proximity, urgency, and recent community confirmations over author follower count.
- **Feed Views**: `Nearby & Hot`, `Urgent Threats`, `Official Responded`, `All Recent`.
- **Amplification**: Deep-linking, native social sharing, WhatsApp & X formatted text copy generation.

---

## N. Notification Architecture
- Event-driven notifications stored in database and delivered via API polling / WebSocket:
  - `INSTITUTION_RESPONSE`: Alerting author when an official institution responds.
  - `CONFIRMATION_SPIKE`: Alerting author when report reaches confirmation milestones.
  - `COMMUNITY_EVIDENCE`: Alerting author when new evidence/photos are added.

---

## O. Low-Bandwidth & Offline Resilience
- Client-side draft auto-saving via `localStorage`.
- Resilient retry queue for network drops.
- Compact JSON payload optimization.

---

## P. Security Assessment
- **Input Sanitization**: Escape user text, prevent XSS.
- **Rate Limiting**: Express rate limiters for post creation and authentication endpoints.
- **Password Security**: Bcrypt password hashing.
- **Secrets Protection**: Environment variable configuration (`.env`), zero credentials in source code.

---

## Q. Testing Strategy
- **Unit Tests**: Utility functions, schema validations.
- **Integration Tests**: API endpoint testing, database CRUD verification.
- **E2E & Verification Tests**: Playwright scripts testing Golden User Journeys (Zero-follower posting, Voice reporting, Emergency alerts, AI failure handling).

---

## R. Deployment Architecture
- Full-stack single binary/process deployment option (Express serving Vite static build + SQLite DB + API endpoints).
- Clean environment variable configuration (`PORT`, `DATABASE_PATH`, `JWT_SECRET`, `GEMINI_API_KEY`).

---

## S. Documentation Plan
Maintain comprehensive documentation in `/docs`:
- `/docs/architecture/`
- `/docs/database/`
- `/docs/api/`
- `/docs/security/`
- `/docs/institution-registry/`
- `/docs/institution-alerts/`
- `/docs/ai/`
- `/docs/testing/`
- `PRD-COVERAGE-MATRIX.md`, `IMPLEMENTATION-STATUS.md`, `KNOWN-LIMITATIONS.md`, `INTEGRATION-STATUS.md`.

---

## T. Ordered Implementation Roadmap
1. Database Schema & Persistence Setup
2. Server Auth & RBAC
3. Core Post APIs & Zero-Follower Feed
4. Institution Registry & Real Alert Delivery Engine
5. Real Gemini AI & AI_UNAVAILABLE Fallback
6. Media Pipeline & Storage
7. Moderation & Abuse Reporting
8. Offline Drafts & Accessibility
9. Comprehensive Testing & Verification
10. Final PRD Matrix Audit
