# AI Integration & Deterministic Fallback Specification

## 1. Role of AI (Gemini 2.5)
AI operates strictly as a supplementary layer for contextual sensitivity checks, text translation, and summary generation. It never manufactures facts, evidence, or delivery statuses.

## 2. Unconfigured AI Fallback (`AI_UNAVAILABLE`)
If `GEMINI_API_KEY` is unconfigured or the API call fails:
* The system returns `AI_UNAVAILABLE` status internally.
* P³RE falls back to deterministic Ghanaian regex and local NER detectors for PII sanitization.
* Post publishing proceeds safely without fabricated classifications.
