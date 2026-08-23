# Database Architecture & Relational Schema Specification

## 1. Overview
The database uses persistent SQLite (`better-sqlite3`) configured with Write-Ahead Logging (`PRAGMA journal_mode = WAL;`) and Foreign Key enforcement (`PRAGMA foreign_keys = ON;`).

## 2. Primary Relational Entities
* `users`: Authenticated citizen, institution, journalist, moderator, and admin accounts.
* `posts`: Civic reports containing location, category, severity, urgency, and engagement counts.
* `amplifications`: Transaction-attributed user amplifications (`UNIQUE(post_id, user_id)`).
* `confirmations`: Independent witness confirmations (`UNIQUE(post_id, user_id)`).
* `post_signal_scores`: Institutional Priority Scores (IPS) and component variables (`severity_score`, `confidence_score`, `ips_score`).
* `institutions`: Authoritative registry of Ghanaian public agencies, utilities, and MMDAs.
* `institution_channels`: Data-driven alert dispatches (Email, SMS, Webhook).
* `institution_deliveries` & `alert_attempts`: Delivery tracking logs with idempotency keys.
* `institution_responses` & `institution_actions`: Official agency public statements and completion evidence.
* `outcome_confirmations`: Community outcome verification votes (`CONFIRMED_RESOLVED` vs `DISPUTED_STILL_ONGOING`).
* `submissions`, `submission_public_projections`, `submission_protected_evidence`: P³RE dual-representation entities.
* `jobs` & `job_attempts`: Durable background processing queue.
* `report_events` & `audit_logs`: Immutable domain timeline logs.
