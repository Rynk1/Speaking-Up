# Project File Structure & Directory Summaries

This document outlines the complete directory structure of the SpeakUp project codebase, along with detailed summaries explaining the purpose and responsibility of each directory and key file.

---

## Complete Directory Tree

```
speakup/
├── assets/
│   └── .aistudio/
│       └── .gitignore
├── docs/
│   ├── ai/
│   │   └── specification.md
│   ├── ai.md
│   ├── api.md
│   ├── architecture/
│   │   └── assessment_and_design.md
│   ├── architecture.md
│   ├── audit/
│   │   ├── 00_EXECUTIVE_SUMMARY.md
│   │   ├── 01_PRD_COMPLIANCE_MATRIX.md
│   │   ├── 02_SYSTEM_ARCHITECTURE_AUDIT.md
│   │   ├── 03_END_TO_END_JOURNEY_AUDIT.md
│   │   ├── 04_DATABASE_ARCHITECTURE_AUDIT.md
│   │   ├── 05_API_ARCHITECTURE_AUDIT.md
│   │   ├── 06_AUTH_SECURITY_AUDIT.md
│   │   ├── 07_PRIVACY_DATA_AUDIT.md
│   │   ├── 08_MEDIA_PIPELINE_AUDIT.md
│   │   ├── 09_INSTITUTION_ALERT_AUDIT.md
│   │   ├── 10_INSTITUTION_RESPONSE_AUDIT.md
│   │   ├── 11_AI_AUDIT.md
│   │   ├── 12_NOTIFICATION_AUDIT.md
│   │   ├── 13_SOCIAL_SHARING_AUDIT.md
│   │   ├── 14_REALTIME_AUDIT.md
│   │   ├── 15_PERFORMANCE_AUDIT.md
│   │   ├── 16_SCALABILITY_AUDIT.md
│   │   ├── 17_TECH_STACK_INVENTORY.md
│   │   ├── 18_TECHNOLOGY_GAP_ANALYSIS.md
│   │   ├── 19_SECURITY_THREAT_MODEL.md
│   │   ├── 20_TEST_COVERAGE_AUDIT.md
│   │   ├── 21_PRODUCTION_READINESS.md
│   │   ├── 22_REMEDIATION_ROADMAP.md
│   │   ├── RECOMMENDED-TARGET-ARCHITECTURE.md
│   │   └── SPEAK-UP-PRD-COMPLIANCE-MATRIX.md
│   ├── authentication.md
│   ├── backup-recovery.md
│   ├── civic-reporting.md
│   ├── civic-signal-engine.md
│   ├── creator-engine.md
│   ├── database.md
│   ├── deployment/
│   │   └── deployment_guide.md
│   ├── deployment.md
│   ├── events.md
│   ├── institution-alerts/
│   │   └── alert_engine.md
│   ├── institution-alerts.md
│   ├── institution-registry/
│   │   └── registry_taxonomy.md
│   ├── institution-registry.md
│   ├── institution-response.md
│   ├── jobs.md
│   ├── legal-safeguards.md
│   ├── low-bandwidth/
│   │   └── resilience.md
│   ├── media/
│   │   └── pipeline.md
│   ├── moderation/
│   │   └── moderation_system.md
│   ├── moderation.md
│   ├── notifications/
│   │   └── engine.md
│   ├── operations.md
│   ├── privacy/
│   │   ├── P3RE-AI-BOUNDARY.md
│   │   ├── P3RE-ARCHITECTURE.md
│   │   ├── P3RE-COST-CONTROL.md
│   │   ├── P3RE-DATA-MODEL.md
│   │   ├── P3RE-DETECTION.md
│   │   ├── P3RE-GAP-ANALYSIS.md
│   │   ├── P3RE-INSTITUTION-ACCESS.md
│   │   ├── P3RE-MEDIA-PIPELINE.md
│   │   ├── P3RE-OPERATIONS.md
│   │   ├── P3RE-POLICY-ENGINE.md
│   │   ├── P3RE-STORAGE-SECURITY.md
│   │   ├── P3RE-TESTING.md
│   │   └── P3RE-THREAT-MODEL.md
│   ├── privacy-p3re.md
│   ├── realtime.md
│   ├── security/
│   │   └── security_review.md
│   ├── security.md
│   ├── social-distribution.md
│   ├── social-sharing/
│   │   └── discovery_and_social.md
│   └── testing.md
├── server/
│   ├── alerts/
│   │   ├── adapters/
│   │   │   ├── EmailAdapter.ts
│   │   │   ├── PushAdapter.ts
│   │   │   ├── SmsAdapter.ts
│   │   │   ├── WebhookAdapter.ts
│   │   │   ├── WhatsAppAdapter.ts
│   │   │   └── types.ts
│   │   ├── AlertOrchestrator.ts
│   │   ├── ChannelHealthMonitor.ts
│   │   ├── EscalationEngine.ts
│   │   └── alertEngine.ts
│   ├── config/
│   │   └── index.ts
│   ├── database/
│   │   ├── backup.ts
│   │   └── db.ts
│   ├── detection/
│   │   ├── geminiDetector.ts
│   │   └── ghanaDetectors.ts
│   ├── events/
│   │   ├── eventBus.ts
│   │   └── sseStream.ts
│   ├── jobs/
│   │   ├── workers/
│   │   │   └── index.ts
│   │   └── jobQueue.ts
│   ├── media/
│   │   └── mediaPipeline.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   └── rateLimiters.ts
│   ├── privacy/
│   │   ├── policyEngine.ts
│   │   └── privacyOrchestrator.ts
│   ├── services/
│   │   ├── CivicSignalService.ts
│   │   └── InstitutionRoutingService.ts
│   ├── shared/
│   │   ├── logger.ts
│   │   └── sanitize.ts
│   ├── social/
│   │   ├── adapters/
│   │   │   ├── facebook.ts
│   │   │   ├── instagram.ts
│   │   │   ├── tiktok.ts
│   │   │   ├── whatsapp.ts
│   │   │   ├── x.ts
│   │   │   └── youtube.ts
│   │   ├── CreatorPackService.ts
│   │   ├── PlatformCapabilityRegistry.ts
│   │   ├── ShareAnalyticsService.ts
│   │   ├── ShareLinkService.ts
│   │   ├── SocialContentBuilder.ts
│   │   ├── SocialDistributionService.ts
│   │   └── types.ts
│   ├── app.ts
│   ├── db.ts
│   ├── seedData.ts
│   ├── seedDatabase.ts
│   └── storage.ts
├── src/
│   ├── components/
│   │   ├── AddEvidenceModal.tsx
│   │   ├── AdminDashboardView.tsx
│   │   ├── AuthModal.tsx
│   │   ├── CivicPostCard.tsx
│   │   ├── CivicPostReportModal.tsx
│   │   ├── CommunityIssueClusterModal.tsx
│   │   ├── EmergencyBanner.tsx
│   │   ├── HomeFeedView.tsx
│   │   ├── InstitutionDashboardView.tsx
│   │   ├── InstitutionDetailView.tsx
│   │   ├── InstitutionDirectoryView.tsx
│   │   ├── InstitutionResponseModal.tsx
│   │   ├── JournalistDeskView.tsx
│   │   ├── MobileBottomNav.tsx
│   │   ├── NationalAnalyticsView.tsx
│   │   ├── NationalMapView.tsx
│   │   ├── Navbar.tsx
│   │   ├── OfficialResponseFeedPostCard.tsx
│   │   ├── OfficialStatementModal.tsx
│   │   ├── PostDetailView.tsx
│   │   ├── PrivacyReviewPortal.tsx
│   │   ├── ProtectedRoute.tsx
│   │   ├── ReportAbuseModal.tsx
│   │   ├── SeenTooPromptModal.tsx
│   │   ├── SharePreviewModal.tsx
│   │   ├── SingleClusterView.tsx
│   │   ├── SpeakUpComposer.tsx
│   │   └── StoryEvidencePackModal.tsx
│   ├── context/
│   │   └── ThemeContext.tsx
│   ├── services/
│   │   └── api.ts
│   ├── types/
│   │   ├── index.ts
│   │   └── privacy.ts
│   ├── utils/
│   │   ├── evidencePack.ts
│   │   └── format.ts
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── test-results/
├── tests/
│   ├── admin.test.ts
│   ├── alert_engine.test.ts
│   ├── core.test.ts
│   ├── golden_journeys.test.ts
│   ├── p3re.test.ts
│   ├── social_engine.test.ts
│   └── system_hardening.test.ts
├── .env.example
├── .gitignore
├── IMPLEMENTATION-STATUS.md
├── INTEGRATION-STATUS.md
├── KNOWN-LIMITATIONS.md
├── PRD-COVERAGE-MATRIX.md
├── Rep engine PRD.md
├── SPEAK UP WEB PRD.md
├── SPEAK_UP_PRD_extracted.txt
├── index.html
├── metadata.json
├── package-lock.json
├── package.json
├── rep_engine_prd_text.txt
├── server.ts
├── tsconfig.json
└── vite.config.ts
```

---

## Directory Summaries & Module Descriptions

### Root Directory (`/`)
The root directory houses platform configuration files, node execution scripts, dependencies, build configurations, and high-level PRD (Product Requirements Document) specifications.

* **Key Files:**
  * `package.json` & `package-lock.json`: Node.js dependency specifications and scripts (`dev`, `build`, `start`, `test`).
  * `server.ts`: Entry point script that boots the Express backend server listening on configured ports.
  * `vite.config.ts`: Vite bundling configuration for React and Tailwind CSS v4 integration.
  * `tsconfig.json`: TypeScript compiler settings for client and server code compilation.
  * `index.html`: Main HTML template housing Google Fonts (`Newsreader`, `Plus Jakarta Sans`) and client app root.
  * `SPEAK UP WEB PRD.md`, `Rep engine PRD.md`, `PRD-COVERAGE-MATRIX.md`, `IMPLEMENTATION-STATUS.md`, `INTEGRATION-STATUS.md`, `KNOWN-LIMITATIONS.md`: Product specifications, system requirements, coverage tracking, and known limitations.

---

### 1. `assets/`
Contains static assets and local development configuration files.

* **Subdirectories:**
  * `assets/.aistudio/`: Contains AI studio workspace settings and git ignore definitions.

---

### 2. `docs/`
Comprehensive architectural, technical, operational, and audit documentation for the SpeakUp platform.

* **Primary Folder Responsibility:**
  Serves as the central repository for technical specifications, system design, data models, privacy engine specifications, security audits, and deployment guides.

* **Subdirectories & key files:**
  * `docs/ai/` & `docs/ai.md`: Specifications for Gemini AI integration, contextual analysis, emergency detection, and AI-P³RE boundaries.
  * `docs/architecture/` & `docs/architecture.md`: High-level system architecture, component interaction, and design decision documents.
  * `docs/audit/`: Comprehensive 23-part production readiness and PRD compliance audit deliverables (covering PRD compliance matrix, database architecture, authentication, privacy/P³RE, media pipeline, alert engine, AI integration, notification engine, social sharing, security threat modeling, test coverage, and remediation roadmap).
  * `docs/deployment/` & `docs/deployment.md`: Server setup, production environment configuration, and infrastructure deployment guidelines.
  * `docs/institution-alerts/` & `docs/institution-alerts.md`: Technical documentation for multi-channel alert engine routing and dispatch.
  * `docs/institution-registry/` & `docs/institution-registry.md`: Taxonomy and mapping of Ghanaian ministries, MMDAs, utility agencies, and regional authorities.
  * `docs/low-bandwidth/`: Specifications for offline resilience and low-bandwidth client optimization.
  * `docs/media/`: Technical specifications for the upload pipeline, virus scanning, and thumbnail fallbacks.
  * `docs/moderation/` & `docs/moderation.md`: Content moderation protocols, flagged content workflows, and user rep calculation.
  * `docs/notifications/`: Design documentation for multi-channel user and official notification delivery.
  * `docs/privacy/` & `docs/privacy-p3re.md`: Deep specifications for the Privacy-Preserving Public Representation Engine (P³RE), PII detection algorithms, data boundaries, and institution access policies.
  * `docs/security/` & `docs/security.md`: Security threat modeling, RBAC controls, and vulnerability assessment reviews.
  * `docs/social-sharing/` & `docs/social-distribution.md`: Documentation for the SpeakUp Social Distribution & Creator Amplification Engine (SSDE).
  * `docs/api.md`, `docs/authentication.md`, `docs/backup-recovery.md`, `docs/civic-reporting.md`, `docs/civic-signal-engine.md`, `docs/creator-engine.md`, `docs/database.md`, `docs/events.md`, `docs/institution-response.md`, `docs/jobs.md`, `docs/legal-safeguards.md`, `docs/operations.md`, `docs/realtime.md`, `docs/testing.md`: Specialized documentation for API contracts, database schemas, backup procedures, event bus design, job queue architecture, and testing strategies.

---

### 3. `server/`
The complete backend application codebase powered by Express.js, TypeScript, and SQLite.

* **Primary Folder Responsibility:**
  Handles REST API routes, persistent storage (`speakup.db`), background job queues, institutional routing, multi-channel alerting, privacy engine transformations, real-time Server-Sent Events (SSE), and AI contextual analysis.

* **Core Root Files in `server/`:**
  * `server/app.ts`: Express application initialization, middleware wiring, and endpoint routing.
  * `server/db.ts` & `server/storage.ts`: Main data access layer abstractions and database helper interface.
  * `server/seedData.ts` & `server/seedDatabase.ts`: Database seeding logic with realistic Ghanaian civic reports, institutions, official responses, and user accounts.

* **Subdirectories:**
  * `server/alerts/`:
    * *Description:* Institutional alert orchestrator, SLA escalation engine, health monitoring, and transport adapters.
    * *Files:* `AlertOrchestrator.ts`, `ChannelHealthMonitor.ts`, `EscalationEngine.ts`, `alertEngine.ts`.
    * `server/alerts/adapters/`: Transport adapters for multi-channel alerts (`EmailAdapter.ts`, `SmsAdapter.ts`, `WhatsAppAdapter.ts`, `WebhookAdapter.ts`, `PushAdapter.ts`, `types.ts`).
  * `server/config/`:
    * *Description:* Application environment configuration reader loading JWT secrets, database paths, and API credentials (`index.ts`).
  * `server/database/`:
    * *Description:* Database persistence setup (`db.ts`) using `better-sqlite3`, WAL mode configuration, foreign key enforcement, and online backups (`backup.ts`).
  * `server/detection/`:
    * *Description:* PII (Personally Identifiable Information) detection routines. Includes local deterministic regex detectors (`ghanaDetectors.ts` for Ghana Card, phone numbers, GPS addresses, license plates, TIN) and fallback/contextual analysis using Google Gemini (`geminiDetector.ts`).
  * `server/events/`:
    * *Description:* Event-driven messaging components. `eventBus.ts` handles decoupled in-memory domain events; `sseStream.ts` manages Server-Sent Event clients for real-time frontend updates.
  * `server/jobs/`:
    * *Description:* Asynchronous background job queue (`jobQueue.ts`) powered by SQLite (`jobs` and `job_attempts` tables).
    * `server/jobs/workers/`: Process worker handlers for privacy engine transformations, Gemini contextual analysis, and alert dispatches.
  * `server/media/`:
    * *Description:* Media upload pipeline (`mediaPipeline.ts`) supporting image, video, audio, and document validation, file hashing, and P³RE directory storage (`uploads/original/` and `uploads/protected/`).
  * `server/middleware/`:
    * *Description:* HTTP request interceptors. `auth.middleware.ts` handles JWT verification and RBAC permission checks; `rateLimiters.ts` prevents API abuse.
  * `server/privacy/`:
    * *Description:* Core Privacy-Preserving Public Representation Engine (P³RE). `policyEngine.ts` enforces privacy rules; `privacyOrchestrator.ts` coordinates raw content redaction before generating public projections.
  * `server/services/`:
    * *Description:* Primary domain business logic services.
    * *Files:* `CivicSignalService.ts` (calculates Institutional Priority Score - IPS) and `InstitutionRoutingService.ts` (routes reports to relevant Ghanaian authorities based on category and geography).
  * `server/shared/`:
    * *Description:* Cross-cutting backend utilities. `logger.ts` provides structured logging; `sanitize.ts` provides HTML sanitization.
  * `server/social/`:
    * *Description:* SpeakUp Social Distribution & Creator Amplification Engine (SSDE). Handles social media formatting, short links (`/s/:code`), analytics tracking, and Creator Pack bundling.
    * *Files:* `CreatorPackService.ts`, `PlatformCapabilityRegistry.ts`, `ShareAnalyticsService.ts`, `ShareLinkService.ts`, `SocialContentBuilder.ts`, `SocialDistributionService.ts`, `types.ts`.
    * `server/social/adapters/`: Specialized social platform adapters for WhatsApp, YouTube, TikTok, Instagram, X (Twitter), and Facebook.

---

### 4. `src/`
The frontend React 19 single-page web application.

* **Primary Folder Responsibility:**
  Provides user interface views, interactive civic reporting tools, dashboards for citizens, institutions, journalists, and administrators, theme switching, dynamic mapping, and social share modals.

* **Core Root Files in `src/`:**
  * `src/App.tsx`: Top-level React component establishing client routes (`react-router-dom`), view layouts, and global modals.
  * `src/main.tsx`: Client entry file initializing React DOM rendering.
  * `src/index.css`: Tailwind v4 styling system, font definitions (`Newsreader` serif and `Plus Jakarta Sans`), and custom utilities.

* **Subdirectories:**
  * `src/components/`:
    * *Description:* Comprehensive UI component library containing view pages, navigation bars, modals, post cards, and controls.
    * *Key Components:*
      * `HomeFeedView.tsx`: Main citizen feed displaying civic issue reports, filtering, and sorting.
      * `AdminDashboardView.tsx`: Operational dashboard for platform administrators and moderators.
      * `InstitutionDashboardView.tsx`: Dashboard for official agency representatives to review issues and log official responses.
      * `JournalistDeskView.tsx`: Dedicated desk for verified journalists to research clusters and generate Story Evidence Packs.
      * `SpeakUpComposer.tsx`: Full-featured citizen post creation form with media attachments, privacy settings, and location selection.
      * `CivicPostCard.tsx` & `OfficialResponseFeedPostCard.tsx`: Compact social post cards rendering citizen issues and official agency responses.
      * `NationalMapView.tsx` & `NationalAnalyticsView.tsx`: Interactive geospatial visualization and analytical reporting widgets.
      * `EmergencyBanner.tsx`: Top banner advising citizens on calling official emergency services (112, 191, 192, 193) during severe events.
      * `PrivacyReviewPortal.tsx`: Public portal for inspecting raw vs. protected data handling policies.
      * Modals: `AddEvidenceModal.tsx`, `AuthModal.tsx`, `CivicPostReportModal.tsx`, `CommunityIssueClusterModal.tsx`, `InstitutionResponseModal.tsx`, `OfficialStatementModal.tsx`, `ReportAbuseModal.tsx`, `SeenTooPromptModal.tsx`, `SharePreviewModal.tsx`, `StoryEvidencePackModal.tsx`.
  * `src/context/`:
    * *Description:* React Context providers. `ThemeContext.tsx` handles dark mode state toggling on the `<html>` root element.
  * `src/services/`:
    * *Description:* Frontend API communication layer. `api.ts` houses typed `fetch` wrappers for all backend endpoints (posts, auth, alerts, institutions, admin, social links).
  * `src/types/`:
    * *Description:* TypeScript interface and type declarations used across the frontend. `index.ts` defines Post, User, Institution, Comment, Cluster, and Analytics types; `privacy.ts` defines P³RE privacy states.
  * `src/utils/`:
    * *Description:* Client utility modules. `format.ts` formats numbers compactly (`1k`, `1.2M`) and dates; `evidencePack.ts` processes media classifications and thumbnail fallbacks.

---

### 5. `test-results/`
Directory reserved for storing automated test execution artifacts, output logs, and coverage reports generated during test runs.

---

### 6. `tests/`
Automated test suite directory containing Vitest tests for verifying full-stack functionality.

* **Primary Folder Responsibility:**
  Maintains unit, integration, system hardening, and golden journey tests across backend APIs, privacy engines, alert dispatches, and social engines.

* **Files:**
  * `tests/core.test.ts`: Tests core post creation, comment threading, voting, and basic API endpoints.
  * `tests/admin.test.ts`: Verifies administrative endpoints, role checks, moderation workflows, and user management.
  * `tests/alert_engine.test.ts`: Tests multi-channel alerting orchestrator, channel health monitoring, and escalation dispatches.
  * `tests/p3re.test.ts`: Verifies P³RE privacy engine transformations, deterministic PII detection (Ghana Card, phone numbers), and token-based raw access.
  * `tests/social_engine.test.ts`: Tests Creator Pack bundling, short link generation, and social platform adapter formatting.
  * `tests/golden_journeys.test.ts`: End-to-end user and institution lifecycle workflow integration tests.
  * `tests/system_hardening.test.ts`: Hardening, security rate limiting, edge cases, and error recovery test coverage.

---

## Summary Table of Key Folders

| Folder | Purpose & Responsibility |
| :--- | :--- |
| `/` (Root) | Repository config, package dependencies, TS/Vite settings, PRD specification files. |
| `assets/` | Static media assets and development studio configurations. |
| `docs/` | Comprehensive technical architecture, PRD compliance matrices, audit reports, and domain specs. |
| `server/` | Express backend server, SQLite database, business domain services, job queue, privacy engine, and alert orchestrator. |
| `server/alerts/` | Multi-channel institutional alert engine, transport adapters (Email, SMS, WhatsApp, Webhooks), health monitor, and escalation engine. |
| `server/database/` | SQLite database connection setup (`better-sqlite3`), WAL mode configuration, migrations, and WAL backup service. |
| `server/detection/` | Local deterministic Ghanaian PII detectors and Google Gemini contextual analysis routines. |
| `server/events/` | EventBus for decoupled in-memory domain events and Server-Sent Events (SSE) streaming. |
| `server/jobs/` | Persistent SQLite asynchronous job queue and worker processes. |
| `server/media/` | Media upload pipeline, sanitization, hashing, and P³RE storage partitioning. |
| `server/middleware/` | JWT authentication, RBAC authorization guards, and Express rate limiting middleware. |
| `server/privacy/` | Privacy-Preserving Public Representation Engine (P³RE) policy engine and orchestrator. |
| `server/services/` | Civic Signal Engine (IPS calculation) and dynamic Ghanaian institutional routing logic. |
| `server/social/` | SpeakUp Social Distribution & Creator Amplification Engine (SSDE) with adapters and Creator Packs. |
| `src/` | Frontend React 19 application codebase with Tailwind v4 CSS. |
| `src/components/` | Reusable UI widgets, page views (Home, Admin, Institution, Journalist, Maps), modals, and post cards. |
| `src/context/` | React Context providers (`ThemeContext` for dark mode support). |
| `src/services/` | REST API client interface functions (`api.ts`). |
| `src/types/` | TypeScript type definitions for domain entities, personas, and privacy models. |
| `src/utils/` | Client utility helpers for compact formatting, relative time, and evidence processing. |
| `test-results/` | Output directory for automated test run artifacts and logs. |
| `tests/` | Comprehensive Vitest test suite testing backend APIs, privacy engines, alerts, administration, and golden journeys. |
