# Low-Bandwidth & Offline Draft Resilience

## Overview
Ghanaian citizens frequently face unstable 3G/EDGE connectivity or sudden data drops. PRD Section 210 dictates that a citizen must **never lose text, audio recordings, photos, or draft posts** due to network failure.

## Resilience Architecture

### 1. Client-Side Auto-Save & Storage
- As the citizen types or attaches media in the `SpeakUpComposer`, state is serialized and cached in client `localStorage` under `speakup_active_draft`.
- In addition, drafts are synchronized to the SQLite database via `POST /api/drafts` when connectivity is available.

### 2. Connection Loss Recovery
- If network connection drops while composing or submitting:
  1. The composer retains all entered text, voice recording Blob, and selected image files.
  2. The submission button transitions to a retry state: *"Network dropped — Draft saved locally (Tap to Retry)"*.
  3. Upon network reconnection, tapping retry seamlessly completes the upload without requiring re-entry.

### 3. Progressive Asset Upload
- Media files are compressed client-side before submission.
- Metadata and text are uploaded first, returning a valid post ID immediately, followed by asynchronous media attachment.
