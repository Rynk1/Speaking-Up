# Known Limitations & Explicit Integration Boundaries

## Overview
In accordance with PRD Section 204 and Section 42, this document explicitly details integration boundaries where live external API credentials or direct government network access are not yet active in this environment, and how the system explicitly represents their state.

### 1. Institutional Direct API / Webhook Integrations
- **Status**: `NOT_CONFIGURED`
- **Boundary**: While the platform includes the `InstitutionNotificationService` adapter pipeline, direct government API endpoints (e.g. internal police dispatch APIs) do not provide open public test endpoints in Ghana.
- **Handling**: When a citizen tags an institution whose direct API integration is not configured, the system explicitly sets `alertStatus: "NOT_CONFIGURED"` and displays: *"Institution could not be directly notified via API. Public tag active."* Success is never fabricated.

### 2. Live SMS Gateway Integration
- **Status**: `NOT_CONFIGURED`
- **Boundary**: Live SMS dispatch requires active carrier credentials (e.g., Twilio / Hubtel Ghana API keys).
- **Handling**: SMS channel adapter checks for `SMS_API_KEY`. If unconfigured, alert status records `NOT_CONFIGURED`.

### 3. WhatsApp Business API Dispatch
- **Status**: `NOT_CONFIGURED`
- **Boundary**: WhatsApp Cloud API requires Meta Verified Business Account access.
- **Handling**: Generates deep-link `https://wa.me/...` share templates for citizens to send directly via their own WhatsApp client, or records `NOT_CONFIGURED` for automated dispatch.

### 4. Gemini AI Key Dependency
- **Status**: Active when `GEMINI_API_KEY` is provided.
- **Boundary**: If `GEMINI_API_KEY` is absent or quota is exceeded.
- **Handling**: API returns `status: "AI_UNAVAILABLE"`. The frontend displays *"AI assistance unavailable. Please select category manually."* No mock AI categories are returned.
