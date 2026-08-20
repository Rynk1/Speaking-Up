# AI Integration Specification & Fallback Policy

## Model Integration
The platform integrates with Google GenAI (`gemini-3.7-flash`) via `@google/genai` on the server side (`server.ts`).

## Capabilities
1. **Multimodal Analysis (`POST /api/ai/analyze-post`)**:
   - Classifies civic reports into primary categories and subcategories.
   - Extracts Ghana regions, districts, and landmarks.
   - Suggests up to 3 relevant state institutions from the registered taxonomy.
   - Assesses urgency (`CRITICAL`, `HIGH`, `NORMAL`, `LOW`) and severity (`EMERGENCY`, `SEVERE`, `MODERATE`, `INFORMATIONAL`).
   - Generates clean headlines and relevant hashtags.
2. **Social Copy Generation (`POST /api/ai/generate-share-copy`)**:
   - Generates non-sensational WhatsApp and X (Twitter) broadcast text.

## Strict AI Failure & Fallback Policy (PRD Section 202)
- **Zero Fake AI Policy**: Under no circumstances does the server generate mock or fake AI classifications if Gemini is unavailable.
- **Unavailable Behavior**: If `GEMINI_API_KEY` is missing or the API call fails/times out, the endpoint returns:
  ```json
  {
    "status": "AI_UNAVAILABLE",
    "message": "AI assistance unavailable. Please select category manually."
  }
  ```
- **User UX**: The client displays a graceful warning toast/banner: *"AI assistance unavailable"*, allowing the citizen to proceed with manual category selection without blocking post publication.
