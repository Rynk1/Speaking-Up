# 05 - API Architecture Audit

## 1. REST Endpoints Inventory & Audit Findings

| Endpoint | Method | Auth | Authorization | Status | Audit Findings / Security Gaps |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/auth/register` | POST | None | Public | FULLY_IMPLEMENTED | Password hashed with bcrypt; JWT issued |
| `/api/auth/login` | POST | None | Public | FULLY_IMPLEMENTED | Returns JWT token |
| `/api/auth/me` | GET | Token | Self | FULLY_IMPLEMENTED | Returns current authenticated user |
| `/api/posts` | GET | Opt | Public | FULLY_IMPLEMENTED | Filters by region, category, search, urgency |
| `/api/posts/:id` | GET | Opt | Public | FULLY_IMPLEMENTED | Fetches single post with comments & responses |
| `/api/posts` | POST | Token | CITIZEN | FULLY_IMPLEMENTED | Executes P³RE orchestrator & stores post |
| `/api/posts/:id/confirm` | POST | Token | CITIZEN | FULLY_IMPLEMENTED | Toggles confirmation ("I'm seeing this too") |
| `/api/posts/:id/follow` | POST | Token | CITIZEN | FULLY_IMPLEMENTED | Toggles issue followership |
| `/api/posts/:id/repost` | POST | Token | CITIZEN | FULLY_IMPLEMENTED | Increments repost count |
| `/api/posts/:id/share` | POST | Token | CITIZEN | FULLY_IMPLEMENTED | Increments share count |
| `/api/posts/:id/evidence` | POST | Token | CITIZEN | FULLY_IMPLEMENTED | Adds community evidence update |
| `/api/posts/:id/comments` | POST | Token | CITIZEN | FULLY_IMPLEMENTED | Adds comment with `@` mentions tag support |
| `/api/comments/:commentId/like` | POST | Token | CITIZEN | FULLY_IMPLEMENTED | Toggles comment like |
| `/api/posts/:id/alert` | POST | Token | CITIZEN | MOCKED | Sets alert status in DB; no external dispatch |
| `/api/posts/:id/response` | POST | Token | INST_REP, ADMIN | FULLY_IMPLEMENTED | Submits official response statement |
| `/api/responses/:id` | GET | Opt | Public | FULLY_IMPLEMENTED | Fetches response statement with thread |
| `/api/responses/:id/comments` | POST | Token | CITIZEN | FULLY_IMPLEMENTED | Adds citizen reply to official response |
| `/api/responses/:id/vote` | POST | Token | CITIZEN | FULLY_IMPLEMENTED | Votes helpful/unhelpful on response |
| `/api/drafts` | GET/POST | Token | Self | FUNCTIONAL_BUT_WEAK | **IDOR Gap:** Defaults to `guest-user` without token |
| `/api/media/upload` | POST | Token | CITIZEN | FULLY_IMPLEMENTED | Handles Multer upload & metadata stripping |
| `/api/admin/privacy-review` | GET/POST | Token | MODERATOR, ADMIN | FULLY_IMPLEMENTED | Privacy review queue for human review |
| `/api/ai/analyze-post` | POST | Opt | Public | FULLY_IMPLEMENTED | Returns AI_UNAVAILABLE when key missing |
| `/api/ai/generate-share-copy` | POST | Opt | Public | FULLY_IMPLEMENTED | Returns share text for WhatsApp and X |
