# 09 - Institution Alert Pipeline Audit

## 1. Alert Pipeline Overview
Institution alerting is a core differentiator of the Speak Up platform. When a citizen tags an institution (e.g. Ghana Police Service, Ghana National Fire Service, ECG, GWCL) on a report, the platform records tag metadata in `post_institution_tags`.

## 2. Channel Verification & Transport Audit

```
Citizen Post Creation -> Post Tagged -> POST /api/posts/:id/alert
                                               │
                                 ┌─────────────┴─────────────┐
                                 ▼                           ▼
                     `alert_method = DIRECT_API`    `alert_method = NONE`
                                 │                           │
                                 ▼                           ▼
                      `status = DELIVERED`       `status = NOT_CONFIGURED`
```

## 3. Delivery Transport Reality Check

| Alert Method | Transport Status | Delivery Verification |
| :--- | :--- | :--- |
| **DIRECT_API** | MOCKED | Sets status `DELIVERED` in DB without issuing HTTP webhook request. |
| **OFFICIAL_EMAIL** | MOCKED | Sets status `SENT` in DB without invoking SMTP / Nodemailer. |
| **WHATSAPP_CHANNEL**| MOCKED | Sets status `SENT` in DB without invoking WhatsApp Business API. |
| **NONE** | FUNCTIONAL | Sets status `NOT_CONFIGURED` with message `"No direct channel configured; public tag active"`. |

## 4. Required Remediation: `InstitutionNotificationAdapter`
To achieve production readiness, the alert handler must route dispatches through a modular adapter architecture:

```typescript
export interface InstitutionNotificationAdapter {
  sendAlert(payload: AlertPayload): Promise<AlertDeliveryResult>;
}
```

Implementations:
1. `WebhookNotificationAdapter` (HTTP POST with HMAC signature).
2. `SmtpNotificationAdapter` (Nodemailer dispatch).
3. `TwilioSmsNotificationAdapter` (SMS alert to emergency desks).
