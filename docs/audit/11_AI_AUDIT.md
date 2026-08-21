# 11 - AI & Gemini Engine Audit

## 1. Gemini Integration Model
Speak Up integrates `@google/genai` (Gemini 3.7 Flash) for:
1. **AI Post Assistant (`/api/ai/analyze-post`):** Auto-suggests category, urgency, region, and institution tags from citizen observation text.
2. **Contextual Sensitivity Evaluator (`server/detection/geminiDetector.ts`):** Identifies unverified criminal/corruption allegations against private citizens and detects private person names vs public official mentions.
3. **Share Copy Generator (`/api/ai/generate-share-copy`):** Formats non-sensational share copy for WhatsApp and X.

## 2. AI Firewall & Fallback Directives (PRD Section 202)
- **AI Firewall Principle:** Text sent to Gemini is pre-sanitized by local deterministic regex detectors replacing phone numbers, Ghana Card IDs, and emails with generic tokens (`[PHONE_NUMBER]`, `[GOVERNMENT_ID]`) before hitting external Gemini APIs.
- **Fail-Safe Fallback:** If `GEMINI_API_KEY` is not present, the system returns status `AI_UNAVAILABLE` without throwing unhandled exceptions or inventing fake AI tags.
- **Verification Status:** `VERIFIED_WORKING` in unit tests `tests/golden_journeys.test.ts` and `tests/p3re.test.ts`.
