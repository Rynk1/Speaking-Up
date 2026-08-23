# System Architecture Specification

## 1. Executive Summary
SpeakUp is a mobile-first citizen megaphone and institutional accountability network in Ghana. The system decouples citizen observations from public virality and institutional escalation through an evidence-weighted architecture.

## 2. Core Capability Engines
1. **Civic Reporting Engine**: Multimodal low-friction capture with text, voice notes, photos, videos, and GPS coordinates. Supports resilient local offline drafts.
2. **Civic Signal Engine**: Decouples Amplification, Independent Confirmation, Evidence Updates, and Geographic Concentration. Calculates versioned Institutional Priority Scores (IPS).
3. **P³RE Privacy & Safety Engine**: Dual-representation system separating canonical raw evidence (`uploads/original/`, `uploads/protected/`) from sanitized public projections (`submission_public_projections`).
4. **Institutional Intelligence & Routing Engine**: Data-driven registry mapping issue categories and Ghanaian regions/districts to responsible state agencies (ECG, GWCL, GPS, NADMO, GNFS, MMDAs).
5. **Institutional Awareness & Response Engine**: Real multi-channel dispatches (Email, SMS, Webhook) with idempotency constraints and gateway delivery ACKs.
6. **Social Distribution & Creator Amplification Engine (SSDE)**: Platform-tailored share packages, dynamic OpenGraph SSR previews, Level 2 Creator Packs, and referral tracking.
7. **Civic Impact & Accountability Engine**: Transparent public timelines, community outcome confirmation voting (`CONFIRMED_RESOLVED` vs `DISPUTED_STILL_ONGOING`), and opt-in Journalist Media Desk.

## 3. Technology Stack
* **Frontend**: React 19, Tailwind CSS v4, Lucide React, React Router v7, Vite.
* **Backend**: Node.js, Express, TypeScript, better-sqlite3 (WAL mode with foreign key constraints enabled).
* **Asynchronous Jobs**: SQLite job queue (`jobs` & `job_attempts` tables).
* **Real-time Event Streaming**: In-memory EventBus and Server-Sent Events (`/api/events`).
