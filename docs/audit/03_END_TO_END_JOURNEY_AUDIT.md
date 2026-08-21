# 03 - End-to-End User Journey Audit

## 1. Trace of Critical Golden Journeys

### Journey 1: Zero-Follower Discovery (PRD Golden Journey 1)
- **Execution Path:** Unauthenticated visitor opens platform -> views feed -> post created by user with 0 followers immediately appears in "Nearby & Community Hot" and category feeds.
- **Verification Status:** `VERIFIED_WORKING`
- **Code Evidence:** Tested in `tests/golden_journeys.test.ts`. `GET /api/posts` returns all approved posts ordered by `created_at DESC` or confirmation count regardless of author follower count.

### Journey 2: Multimodal Post Creation with Audio/Photo (PRD Golden Journey 2)
- **Execution Path:** Citizen records audio / uploads image -> `api.uploadMedia()` -> Multer stores in `/uploads/` -> metadata stripped -> post submitted with media references.
- **Verification Status:** `VERIFIED_WORKING`
- **Code Evidence:** Tested in `tests/golden_journeys.test.ts` and `tests/p3re.test.ts`. `server/media/mediaPipeline.ts` strips EXIF GPS metadata from JPEG images before public projection.

### Journey 3: P³RE Privacy & Protection (PRD Section 50-52)
- **Execution Path:** Citizen submits text containing Ghana Card (`GHA-712345678-9`) and phone number (`0241234567`) -> `PrivacyOrchestrator.processSubmission()` detects PII -> generates sanitized public text replacing PII with `[REDACTED GHANA CARD]` and `[REDACTED PHONE]` -> protected original stored in `submission_sources`.
- **Verification Status:** `VERIFIED_WORKING`
- **Code Evidence:** Verified in `tests/p3re.test.ts`. Signed tokens generated via `generateSignedAccessToken()` allow authorized institution reps to log and access evidence.

### Journey 4: Institution Response & Public Accountability (PRD Section 40-45)
- **Execution Path:** Institution rep logs in -> views tagged post -> clicks "Submit Response" -> fills statement title, full statement, reference number, resolution status -> POST `/api/posts/:id/response` -> response persisted -> public feed renders response as reverse-hierarchy card -> citizens upvote helpfulness or post replies.
- **Verification Status:** `VERIFIED_WORKING`
- **Code Evidence:** Tested in `tests/core.test.ts` and UI component `OfficialStatementModal.tsx`.

### Journey 5: Institution Alert Dispatch (PRD Section 21-22)
- **Execution Path:** Post created with institution tag -> POST `/api/posts/:id/alert` -> tag status updated in DB.
- **Verification Status:** `PARTIALLY_MOCKED`
- **Code Evidence:** DB status is updated to `DELIVERED` or `SENT`, but no SMTP email or WhatsApp API call is dispatched to external systems.
