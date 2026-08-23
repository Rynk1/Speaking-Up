# Automated Testing & Quality Assurance Specification

## 1. Test Architecture
Testing is executed via Vitest (`npm test`).
* `tests/core.test.ts`: Institution seeding and zero-follower discoverability.
* `tests/p3re.test.ts`: Ghanaian PII detection, redaction, and signed access token verification.
* `tests/system_hardening.test.ts`: IDOR protection, health checks, real alert dispatches, event bus, and durable job queue.
* `tests/admin.test.ts`: RBAC enforcement, user management, content moderation, and job retries.
* `tests/social_engine.test.ts`: SSDE share package generation, short link creation, and referral tracking.
* `tests/golden_journeys.test.ts`: End-to-end citizen reporting to institutional delivery journeys.
