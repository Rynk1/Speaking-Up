# Integration Status Register

## Registered Adapters & Channels

| Channel / Adapter | Type | Provider | Configured Env Var | Current Status | Delivery Behavior |
|-------------------|------|----------|--------------------|----------------|-------------------|
| Email Adapter | Email | SMTP / SendGrid | `SMTP_HOST`, `SMTP_USER` | `NOT_CONFIGURED` | Records `NOT_CONFIGURED` status. |
| SMS Adapter | SMS | Hubtel / Twilio | `SMS_API_KEY` | `NOT_CONFIGURED` | Records `NOT_CONFIGURED` status. |
| WhatsApp Adapter | Direct Messaging | Meta WhatsApp Cloud API | `WHATSAPP_TOKEN` | `NOT_CONFIGURED` | Fallback to WhatsApp deep-link trigger. |
| Institutional Webhook | Webhook | Custom REST Endpoint | `INSTITUTION_WEBHOOK_URL` | `NOT_CONFIGURED` | Records `NOT_CONFIGURED` status. |
| Gemini AI Adapter | AI | Google GenAI | `GEMINI_API_KEY` | `CONFIGURED` / `ACTIVE` | Returns structured JSON analysis or `AI_UNAVAILABLE`. |
