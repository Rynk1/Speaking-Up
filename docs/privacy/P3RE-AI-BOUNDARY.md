# P³RE AI Boundary & Non-Liability Framework

## Core Directives
1. **AI Privacy Firewall**: Original raw text is pre-sanitized by local deterministic detectors prior to sending payloads to Gemini.
2. **No Liability Conclusions**: Gemini responses are strictly limited to contextual classification (e.g. risk level, public official vs private citizen role identification). Gemini NEVER determines legal guilt, criminal liability, or defamation conclusions.
3. **Graceful Fallback**: If `GEMINI_API_KEY` is absent or API calls fail, the system sets status to `AI_UNAVAILABLE` and deterministic privacy protection continues smoothly without fake fallback data.
