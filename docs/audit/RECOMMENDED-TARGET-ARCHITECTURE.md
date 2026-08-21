# Recommended Target Architecture

This document defines the target production technology stack and architectural transitions for Speak Up Ghana.

| Domain | Existing Implementation | Recommended Target | Reason for Recommendation |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React 19 + Vite | React 19 + Vite | Retain fast build speeds and clean UI component tree |
| **UI Styling** | Tailwind CSS v4 | Tailwind CSS v4 | Excellent responsive utility styling & dark mode support |
| **API Server** | Express + TypeScript | Express + TypeScript | Lightweight, fast execution, simple deployment |
| **Authentication** | JWT + bcryptjs | JWT + bcryptjs | Fully functional stateless token model; add cookie option |
| **Database** | SQLite (`better-sqlite3`) | SQLite (Single Node) / PostgreSQL (Scale) | SQLite WAL mode is ideal for MVP; migrate to Postgres at scale |
| **Media Storage** | Local Disk (`uploads/`) | Cloudflare R2 / S3 | Offload bandwidth load and enable global CDN caching |
| **Privacy Engine** | Local Regex + Gemini | Local Regex + Gemini | Retain fail-closed P³RE architecture |
| **Alert Transport** | In-database Status Only | `InstitutionNotificationAdapter` | Enable real Webhook, SMTP email, and Twilio SMS dispatch |
| **Real-time Engine** | REST Polling / Manual | Server-Sent Events (SSE) | Zero-dependency real-time stream at endpoint `/api/events` |
| **Background Tasks** | Synchronous HTTP Handlers | `p-queue` / BullMQ | Prevent AI/processing bottlenecks on API response times |
| **Security Middleware** | None | `express-rate-limit` + `helmet` + `sanitize-html` | Prevent brute-force, XSS, and header vulnerabilities |
| **Observability** | Console Logging | Winston / Pino JSON Logging | Machine-readable structured audit logs for production tracing |
