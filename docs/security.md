# Security Architecture & Data Protection Specification

## 1. Authentication & Role-Based Access Control (RBAC)
* Roles: `CITIZEN`, `VERIFIED_CITIZEN`, `INSTITUTION_OFFICIAL`, `JOURNALIST`, `MODERATOR`, `ADMIN`, `SUPER_ADMIN`.
* Passwords hashed using `bcrypt` (10 rounds).
* Stateless JWT session tokens verified via Express auth middleware.

## 2. Evidence Protection & IDOR Mitigation
* Protected original media stored in isolated zone (`uploads/protected/`).
* Access to protected evidence requires short-lived signed HMAC access tokens (`verifySignedAccessToken`).
* Every access by institution officials or moderators is immutably recorded in `evidence_access_logs`.
