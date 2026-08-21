# P³RE Gap Analysis & Repository Audit

## Executive Summary
This document provides a comprehensive audit of the Speak Up platform codebase against the Privacy-Preserving Public Representation Engine (P³RE) specification. P³RE decouples original canonical citizen submissions from public and audience-specific projections, enforcing automatic privacy protection, PII minimization, metadata stripping, and audience-scoped evidence access.

---

## 1. Existing Implementation
- **Data Model**: Current SQLite database (`server/db.ts`) handles posts via a unified `posts` table storing raw titles and content in plain text. Media metadata is tracked in a single `media` table.
- **Media Uploads**: `POST /api/media/upload` stores files directly on disk under `/uploads` with public static file serving enabled via Express (`app.use('/uploads', express.static(uploadDir))`).
- **Authentication & Authorization**: JWT authentication with `authMiddleware`, `requireAuth`, and `requireRole` supporting `CITIZEN`, `INSTITUTION_REP`, and `ADMIN`.
- **Institution Alerting**: `post_institution_tags` tracks tagging and alert delivery statuses (`SENT`, `DELIVERED`, `NOT_CONFIGURED`).
- **AI Integrations**: Gemini 3.7 Flash integrated in `/api/ai/analyze-post` and `/api/ai/generate-share-copy`, with strict `AI_UNAVAILABLE` fallback when `GEMINI_API_KEY` is missing or unconfigured.
- **Public Feed & APIs**: `GET /api/posts` returns the raw `posts` rows directly to anonymous and logged-in clients without privacy sanitization or projection layer isolation.

---

## 2. Missing Components
- **P³RE Data Entities**:
  - `submissions` (canonical citizen submission records)
  - `submission_sources` (input source tracking: web, mobile, voice, SMS)
  - `submission_public_projections` (sanitized public views)
  - `submission_protected_evidence` (secure evidence packages)
  - `privacy_findings` (detected PII & sensitive findings log)
  - `privacy_policies` (policy rules engine configuration)
  - `representation_versions` (versioned derivative history)
  - `evidence_access_logs` (audit log for institution evidence views/downloads)
- **Isolated Storage Architecture**:
  - Missing distinct storage zones: `original/`, `protected/`, `public/`, and `processing/`.
  - Missing signed URL / authorization token verification for protected media.
- **Privacy Orchestrator & Layered Detection**:
  - Missing `PrivacyOrchestrator` workflow coordinator.
  - Missing deterministic local detectors for Ghanaian PII (Ghana Card IDs, phone numbers, TINs, vehicle plates, GPS locations, addresses, names).
  - Missing regex-based PII scanners and contextual Gemini ambiguity analyzer.
- **Media Privacy Pipeline**:
  - Missing EXIF/GPS metadata stripper.
  - Missing OCR text detector and face/plate blurring/redaction creating derivative files.
- **Moderator Privacy Review Portal**:
  - Missing `/admin/privacy-review` endpoints and UI for reviewing flagged submissions and overriding findings.
- **Institutional Evidence Portal**:
  - Missing protected evidence access endpoints (`/api/institutions/evidence/:id`) with strict authorization checks and audit logging.
- **AI Privacy Firewall**:
  - Current AI endpoints receive raw post contents instead of sanitized `AI-Safe Projections`.
- **Fail-Closed Processing State Machine**:
  - Missing privacy states: `PRIVACY_PROCESSING`, `PRIVACY_READY`, `PRIVACY_REVIEW_REQUIRED`, `PRIVACY_FAILED`, `AI_UNAVAILABLE`.

---

## 3. Reusable Components
- **SQLite Database Setup (`server/db.ts`)**: Built-in support for foreign keys and WAL mode allows seamless addition of P³RE tables.
- **JWT & RBAC Infrastructure**: Existing `requireRole(['INSTITUTION_REP', 'ADMIN'])` can be reused directly for protected evidence and moderator review endpoints.
- **Gemini SDK Setup (`@google/genai`)**: Reusable for contextual ambiguity checks and AI-safe copy generation.
- **Upload File Filter (`multer`)**: Reusable staging pipeline for incoming canonical files.
- **Frontend State & Components**: Post cards, feeds, and forms can easily consume public projections with minimal UI changes.

---

## 4. Architectural Conflicts & Security Weaknesses
- **Conflict 1: Single Content Storage**: Currently, `posts.content` stores original citizen text and exposes it directly via `GET /api/posts`. P³RE mandates that public APIs consume ONLY `submission_public_projections`.
- **Conflict 2: Direct Static Upload Access**: `/uploads` route serves raw uploaded files without checking permissions or performing EXIF/PII redaction.
- **Security Weakness 1: Unredacted PII Exposure**: Submissions containing phone numbers, Ghana Card numbers, personal names, or exact GPS metadata are currently visible to all public viewers.
- **Security Weakness 2: Direct Raw Payload to Gemini**: Raw text is sent to Gemini before privacy inspection, violating the AI Privacy Boundary directive.
- **Security Weakness 3: Lack of Evidence Audit Trail**: Institutions viewing posts have no audit trail tracking evidence access or unmasking.

---

## 5. Migration Requirements
1. **Schema Migration**: Create all 8 core P³RE tables with appropriate foreign key relationships to existing `users`, `posts`, and `institutions`.
2. **Backfill/Adapter Layer**: Existing posts must be adapted into canonical submissions and corresponding public projections so existing data remains accessible.
3. **Storage Relocation**: Re-organize `/uploads` directory into zone subdirectories (`/uploads/original/`, `/uploads/protected/`, `/uploads/public/`, `/uploads/processing/`).
4. **API Route Migration**: Redirect public feed endpoints (`GET /api/posts`, `GET /api/posts/:id`) to query `submission_public_projections` instead of raw `posts`.

---

## 6. Recommended Implementation Order
1. **Phase 1: Data Foundation** — Implement P³RE database tables, models, and TypeScript types.
2. **Phase 2: Storage Security** — Establish isolated storage zones and signed/authorised media access controllers.
3. **Phase 3 & 4: Privacy Orchestrator & Multi-Layered Detection Engine** — Build local Ghanaian PII detectors, regex scanners, Gemini context evaluator, and the Privacy Orchestrator.
4. **Phase 5 & 6: Public Projection & Media Pipeline** — Implement text sanitization, EXIF stripping, OCR image redaction, and derivative generator.
5. **Phase 7: Privacy Review Portal** — Build moderator interface and review APIs at `/admin/privacy-review`.
6. **Phase 8: Institutional Evidence Portal** — Build authorized evidence access endpoints and `evidence_access_logs`.
7. **Phase 9 & 10: AI Privacy Firewall & Fail-Closed State Machine** — Implement input firewalling and processing state handlers.
8. **Phase 11: Workflow Integration & Golden Journey Testing** — Wire P³RE into post submission workflow and run automated test suite.
9. **Phase 12: Architectural Documentation Suite** — Complete the 12 P³RE markdown documentation guides.
