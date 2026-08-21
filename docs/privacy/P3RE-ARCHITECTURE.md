# P³RE Overall Architecture & Subsystem Design

## Executive Overview
The Privacy-Preserving Public Representation Engine (P³RE) decouples original citizen submissions from audience-specific projections. The system guarantees that original citizen evidence remains immutable and protected while public-facing interfaces consume automatically sanitized projections.

---

## High-Level Architecture Diagram

```
                 Citizen Submission (Web / Mobile / Voice / SMS)
                                │
                                ▼
                       Existing API Layer
                                │
                       Privacy Orchestrator
                                │
        ┌───────────────────────┼──────────────────────┐
        ▼                       ▼                      ▼
  Ghanaian Local         Regex PII Engine      Gemini AI Context
   PII Detectors                                   Firewall
        │                       │                      │
        └───────────────────────┼──────────────────────┘
                                ▼
                          Policy Engine
                                │
             ┌──────────────────┴──────────────────┐
             ▼                                     ▼
   Public Projection                      Protected Evidence
  (Public Feed, Search,                  (Institution Portal,
   OG, Social, Notifs)                    Access Audit Logs)
```

---

## Architectural Principles
1. **Separation of Storage and Presentation**: `submissions` and `submission_sources` store the raw canonical source, while `submission_public_projections` holds sanitized views.
2. **Deterministic-First Detection**: Ghanaian local PII detectors execute first without external dependencies.
3. **AI Boundary**: Gemini AI receives pre-sanitized payloads (`AI-Safe Projections`) for contextual evaluation.
4. **Fail-Closed Processing**: Errors during processing result in `PRIVACY_FAILED` or `PRIVACY_REVIEW_REQUIRED` state; unredacted originals are never exposed.
