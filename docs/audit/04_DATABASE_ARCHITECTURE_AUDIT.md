# 04 - Database Architecture Audit

## 1. Database Overview
- **Engine:** SQLite 3 via `better-sqlite3`
- **Location:** `speakup.db` (configurable via `DATABASE_PATH`)
- **Settings:** Foreign keys enabled (`PRAGMA foreign_keys = ON`), WAL mode enabled (`PRAGMA journal_mode = WAL`).

## 2. Table Inventory & Relational Mapping

```
users (id) ───< posts (author_id) ───< comments (post_id)
  │               │                      │
  │               ├──< media (post_id)   └──< comment_likes (comment_id)
  │               │
  │               ├──< confirmations (post_id)
  │               │
  │               ├──< community_evidence (post_id)
  │               │
  │               ├──< issue_followers (post_id)
  │               │
  │               └──< post_institution_tags (post_id) >── institutions (id)
  │                                                            │
  └──< submissions (author_id)                                 ▼
           │                                          institution_responses (post_id, institution_id)
           ├──< submission_sources                             │
           ├──< submission_public_projections                  ├──< response_comments
           ├──< submission_protected_evidence                  └──< response_votes
           ├──< privacy_findings
           └──< evidence_access_logs
```

## 3. Database Health & Audit Findings

| Category | Finding | Risk Level | Recommendation |
| :--- | :--- | :--- | :--- |
| **Integrity** | Foreign keys properly enforced via ON DELETE CASCADE on child tables. | Low | Retain schema design |
| **Indexes** | B-tree indexes exist on `posts(region)`, `posts(category)`, `posts(urgency)`, `posts(created_at)`, `post_institution_tags(post_id)`, `institution_responses(post_id)`. | Low | Adequate query performance |
| **Migrations** | Schema changes executed ad-hoc using try/catch `ALTER TABLE` in `server/db.ts`. | Medium | Adopt a dedicated migration tool (e.g., Kysely or Prisma or Drizzle) |
| **Concurrency** | SQLite WAL mode supports multi-reader, single-writer concurrency. High volume writes could cause lock contention. | Medium | Consider PostgreSQL for multi-region or high-scale deployment |
