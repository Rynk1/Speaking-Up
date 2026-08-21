# 02 - System Architecture Audit

## 1. Current Architecture Overview
The current Speak Up application is constructed as a full-stack Node.js + Express + React application.

```
                    ┌─────────────────────────────────────────┐
                    │               React 19 UI               │
                    │   (Vite + Tailwind v4 + Lucide Icons)   │
                    └────────────────────┬────────────────────┘
                                         │ HTTP REST APIs
                                         ▼
                    ┌─────────────────────────────────────────┐
                    │           Express TS Server             │
                    │              (server.ts)                │
                    └────┬───────────────┬───────────────┬────┘
                         │               │               │
                         ▼               ▼               ▼
                   ┌───────────┐   ┌───────────┐   ┌───────────┐
                   │  SQLite   │   │   P³RE    │   │  Gemini   │
                   │ (db.ts)   │   │ Engine    │   │   3.7     │
                   └───────────┘   └───────────┘   └───────────┘
```

## 2. Traced End-to-End Execution Path Analysis

### Primary Flow: Citizen Creates Report
`UI (SpeakUpComposer.tsx)` -> `api.createPost()` -> `POST /api/posts` -> `authMiddleware` -> `PrivacyOrchestrator.processSubmission()` -> `SQLite (submissions, posts, media)` -> `Response (CivicPost JSON)` -> `React State (setPosts)` -> `UI Update (CivicPostCard.tsx)`

- **Broken / Weak Link:** Privacy processing and Gemini AI calls occur synchronously inside the HTTP handler. If Gemini or DB query stalls, the post creation HTTP request hangs.

### Secondary Flow: Institution Alert
`UI (CivicPostCard.tsx)` -> `api.triggerAlert()` -> `POST /api/posts/:id/alert` -> `SQLite (post_institution_tags)` -> `Response`

- **Broken / Weak Link:** The server updates the database status to `SENT` or `DELIVERED` but does NOT invoke an external email, SMS, or webhook adapter.

---

## 3. Component Architecture Level Ratings

1. **Frontend (React 19 + Vite):** Level 3 (Functional) - Clean component modularization, full responsive layout, persona toggling.
2. **Backend API Layer (Express):** Level 3 (Functional) - Clean REST endpoints, JSON responses, error handlers.
3. **Database (SQLite / `better-sqlite3`):** Level 3 (Functional) - Relational schema, WAL mode, foreign key enforcement, indexes.
4. **Privacy Engine (P³RE):** Level 3 (Functional) - Ghana Card/Phone/GPS regex + Gemini contextual analysis + sanitized public projection generation.
5. **Alert Engine:** Level 1 (UI Prototype) - In-database tag insertion without outbound transport dispatchers.
6. **Background Queues:** Level 0 (Concept) - Absent. All work executed synchronously in Express event loop.
