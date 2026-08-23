# Authentication & Identity Architecture Specification

## 1. Identity & RBAC
Authentication uses JWT session tokens and bcrypt password hashing (10 rounds). Supported roles:
* `CITIZEN`: Standard reporting, amplifying, confirming, and outcome voting.
* `VERIFIED_CITIZEN`: Enhanced credibility rating in IPS calculation.
* `INSTITUTION_OFFICIAL`: Access to institutional portal, response publishing, and action reporting.
* `JOURNALIST`: Access to Journalist Desk and verified Story Evidence Packs.
* `MODERATOR`: Content moderation review and safety classification.
* `ADMIN` & `SUPER_ADMIN`: System health, agency management, job retries, and audit logs.
