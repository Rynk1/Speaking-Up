# 08 - Media Pipeline Audit

## 1. Storage Layout & Media Processing

Media storage is organized in four discrete zones (`server/storage.ts`):
- `uploads/original/`: Immutable raw uploads.
- `uploads/protected/`: Protected evidence for authorized institution review.
- `uploads/public/`: Sanitized, metadata-stripped public derivatives.
- `uploads/processing/`: Temporary upload staging area.

## 2. EXIF Metadata Stripping
- **Implementation:** `stripJpegMetadata()` in `server/media/mediaPipeline.ts` parses JPEG binary buffer chunks and strips the `APP1` (0xE1) marker containing EXIF, GPS coordinates, and camera metadata before writing to `uploads/public/`.
- **Verification Status:** `VERIFIED_WORKING` in unit test `tests/golden_journeys.test.ts`.

## 3. Media Pipeline Gaps

| Media Type | Feature | Current Implementation | Status | Gap |
| :--- | :--- | :--- | :--- | :--- |
| **Image** | Metadata Stripping | Pure JS JPEG EXIF parser | Level 3 (Functional) | WebP/PNG EXIF stripping missing |
| **Image** | Watermarking | Omitted | Level 1 (UI Prototype) | Public image watermark omitted |
| **Video** | Transcoding | Omitted | Level 0 (Concept) | Videos saved as raw MP4/WebM uploads without HLS/DASH |
| **Audio** | Transcription | Audio playback functional | Level 2 (Connected) | Speech-to-text transcript generation omitted |
