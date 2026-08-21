# 07 - Privacy & Data Protection Audit (P³RE Engine)

## 1. P³RE Architecture Assessment
The Privacy-Preserving Public Representation Engine (P³RE) decouples canonical citizen submissions from public projections.

```
                    ┌──────────────────────────────────────────┐
                    │      Canonical Submission (Immutable)    │
                    │   (Stored in `submissions` + `sources`) │
                    └────────────────────┬─────────────────────┘
                                         │
                   ┌─────────────────────┴─────────────────────┐
                   │           P³RE Privacy Pipeline           │
                   │  1. Deterministic Local Regex Detectors   │
                   │  2. Gemini Contextual Sensitivity Check    │
                   │  3. Policy Engine Evaluation              │
                   └─────────────────────┬─────────────────────┘
                                         │
                     ┌───────────────────┴───────────────────┐
                     ▼                                       ▼
       ┌───────────────────────────┐           ┌───────────────────────────┐
       │ Public Projection (Public)│           │ Protected Evidence (Inst.)│
       │  [REDACTED] Sanitized Text│           │ Signed JWT Token Access   │
       └───────────────────────────┘           └───────────────────────────┘
```

## 2. Deterministic Detection Capability

| Sensitive PII Type | Detector Mechanism | Sample Pattern | Test Result |
| :--- | :--- | :--- | :--- |
| **Ghana Card** | `DETERMINISTIC_GHANA_CARD` | `GHA-712345678-9` | PASS |
| **Ghana Phone Number** | `DETERMINISTIC_GHANA_PHONE` | `0241234567`, `+233201234567` | PASS |
| **GhanaPost GPS** | `DETERMINISTIC_GHANAPOST_GPS` | `GA-183-9023` | PASS |
| **Vehicle License Plate** | `DETERMINISTIC_LICENSE_PLATE` | `GR 1234-22`, `GW-5678-21` | PASS |
| **Ghana Tax ID (TIN)** | `DETERMINISTIC_GHANA_TIN` | `P0001234567` | PASS |
| **Email Address** | `DETERMINISTIC_EMAIL` | `user@example.com` | PASS |

## 3. Evidence Access Logging & Policy Engine
- **Access Verification:** Access to protected evidence requires a signed token generated via `generateSignedAccessToken(submissionId, actorId)`. Every access event is immutably logged into `evidence_access_logs`.
- **Fail-Closed Guarantee:** If an exception occurs during orchestrator execution, the submission status is set to `PRIVACY_FAILED` and text is replaced with `[PRIVACY PROCESSING FAILED - CONTENT HELD FOR HUMAN REVIEW]`. Tested and verified in `tests/p3re.test.ts`.

## 4. Privacy Gap
- Uploaded media files copied to `/uploads/public/` are accessible via static Express file routes without token authorization if the URL path is guessed.
- **Fix:** Move public media derivatives through a tokenized proxy or generate randomized unguessable file hashes for public assets.
