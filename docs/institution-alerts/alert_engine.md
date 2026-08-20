# Institution Alert Engine & Adapter Architecture

## Overview
The `InstitutionNotificationService` handles institutional alerts across multiple channels. Per PRD Section 204 & 207, every alert delivery attempt follows a strict delivery state machine and never fabricates delivery success.

## Lifecycle States
- `PENDING`: Post created and tag queued for processing.
- `DISPATCHING`: Notification adapter actively attempting delivery.
- `DELIVERED`: Confirmed successful delivery to official API endpoint.
- `SENT`: Dispatched to official email / SMS gateway.
- `NOT_CONFIGURED`: Displayed when an institution does not have an active channel adapter configured.
- `FAILED`: Alert failed due to provider error or timeout.

## Adapter Architecture
```
                     InstitutionNotificationService
                                   │
       ┌───────────────────────────┼───────────────────────────┐
       ▼                           ▼                           ▼
DirectAPIAdapter            EmailAdapter              WhatsAppAdapter
 (e.g. GPS / NADMO)       (e.g. ECG / GHA)             (e.g. GWCL)
       │                           │                           │
  Status: DELIVERED           Status: SENT               Status: SENT / Link
```

If an adapter is not configured or fails, the user is shown:
> *"Institution could not be directly notified via API (NOT_CONFIGURED). Public awareness tag active."*
