# Civic Reporting Engine & Offline Draft Specification

## 1. UX Principles
The Civic Reporting Engine prioritizes low digital literacy and rapid multimodal observation capture:
1. **WHAT HAPPENED?**: Voice recording in local Ghanaian languages (Twi, Ga, Ewe, Hausa, English) or direct text input.
2. **WHERE?**: Automatic GPS coordinate lookup or landmark selection.
3. **WHO SHOULD KNOW?**: Intelligent institution auto-routing suggestions.
4. **ADD EVIDENCE**: Photos, audio notes, or video clips.

## 2. Offline-First Local Draft Persistence
When network connectivity is disrupted, local report state is persisted in SQLite/localStorage under `drafts` table.
* States: `DRAFT` → `QUEUED` → `UPLOADING` → `SYNCING` → `PUBLISHED` → `FAILED`.
* Reports automatically synchronize once connectivity is restored.
