# Media Pipeline Architecture

## Specification & Limits
The Speak Up media pipeline processes and validates citizen evidence uploads for photos, voice notes, and video recordings.

### Upload Limits
- **Photos / Images**: PNG, JPEG, WebP (Max: 10MB)
- **Voice Notes / Audio**: MP3, WAV, M4A, OGG (Max: 25MB)
- **Videos**: MP4, WebM (Max: 50MB)

### Endpoint
- `POST /api/media/upload` (Requires `multipart/form-data`)

### Persistence & Storage
- Uploaded files are assigned a unique filename (`upload-[timestamp]-[hash].[ext]`) and stored on disk in the persistent `/uploads` directory.
- Metadata (URL, MIME type, size in bytes, post association) is persisted in the SQLite `media` table.
- Files are served statically via Express at `/uploads/:filename`.
