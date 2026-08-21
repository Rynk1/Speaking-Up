# P³RE Detection Engine & Ghanaian PII Patterns

## Layered Detection Architecture

### 1. Deterministic Ghanaian Local Detectors
Implemented in `server/detection/ghanaDetectors.ts`:
- **Ghana Card**: `GHA-\d{9}-\d`
- **Ghana Phone Numbers**: `(+233|0)(20|23|24|25|26|27|28|30|50|53|54|55|57|59)\d{7}`
- **GhanaPost GPS**: `[A-Z]{2}-\d{3,4}-\d{3,4}`
- **Vehicle Registration Plates**: `(GR|GW|GE|GN|GT|GS|GB|GA|BA|AS|AH|CR|WR|VR|ER|NR|UW|UE|OR|SV|NE|WN|DV|DP|CD)\s*-?\s*\d{1,4}\s*-?\s*\d{2}`
- **Tax Identification Number (TIN)**: `[P|C|G]\d{10}`
- **Email**: Standard RFC regex.

### 2. Gemini Contextual Evaluator
Implemented in `server/detection/geminiDetector.ts`:
- Analyzes semantic context for unverified criminal allegations and private citizen vs public official distinctions.
- Always receives pre-sanitized payloads (`AI-Safe Projections`).
- If Gemini is unavailable, deterministic detection continues without failing.
