# REST API Endpoint Reference

## Key Endpoints
* `POST /api/auth/register` & `POST /api/auth/login`: Authentication & JWT issuance.
* `POST /api/posts`: Citizen report creation with P³RE queue trigger.
* `POST /api/posts/:id/repost`: Transactional amplification (`CivicSignalService`).
* `POST /api/posts/:id/confirm`: Independent witness confirmation (`CivicSignalService`).
* `GET /api/institutions/resolve`: Category/region institutional routing resolver.
* `POST /api/posts/:id/response`: Official agency response statement.
* `POST /api/posts/:id/actions`: Resolution action proof submission.
* `POST /api/posts/:id/outcome-confirm`: Community resolution confirmation voting.
* `POST /api/admin/moderation/classify`: Admin moderation classification (`SAFE`, `NEEDS_REVIEW`, `RESTRICTED`, `REMOVED`, `LEGAL_REVIEW`, `EMERGENCY_RISK`).
* `POST /api/admin/backup`: Online database backup execution (`DatabaseBackupService`).
