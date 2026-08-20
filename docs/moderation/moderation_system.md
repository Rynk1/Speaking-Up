# Content Moderation & Abuse Prevention Architecture

## Overview
As an open citizen reporting network, Speak Up enforces multi-layered content safety to prevent vigilante incitement, doxxing, harassment, and misinformation while protecting citizen free expression.

## Moderation Layers

### 1. Pre-Publication AI Safety Filter
- AI checks incoming text and transcripts for doxxing (private phone numbers/addresses of individuals), hate speech, and incitement to vigilante violence.
- High-risk posts flagging private individuals are held for manual moderator review rather than automatically going viral (PRD Section 211).

### 2. Community Abuse Reporting
- Any citizen can flag a post via `POST /api/reports/abuse` with reasons such as:
  - Doxxing / Private individual targeting
  - Fake news / Misinformation
  - Violence / Incitement
  - Spam / Commercial promotion
  - Impersonation
- Reports are persisted in the `abuse_reports` table with status `PENDING`.

### 3. Moderator Operations
- Moderators (`MODERATOR` / `ADMIN` role) access flag backlogs and take action:
  - `APPROVED`: Post verified safe.
  - `SOFT_DELETED` / `HIDDEN`: Post removed from public feeds.
  - `WARNING_ISSUED`: User account notified.
- All moderator actions are logged in `audit_logs`.
