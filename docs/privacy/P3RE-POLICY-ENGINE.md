# P³RE Policy Engine & Audience-Specific Projections

## Overview
The Policy Engine evaluates detected PII and contextual findings against stored privacy policies in `privacy_policies` to derive audience-specific representations:

- **PUBLIC**: Redacts all private citizen PII (Ghana Card IDs, phone numbers, personal emails, bystander faces, vehicle plates).
- **INSTITUTION**: Allows official names, verified location data, and protected evidence packages for official investigation.
- **MODERATOR**: Provides full inspection capability, confidence scores, and dual-pane comparison in `/admin/privacy-review`.

---

## Default Rules & Actions
| Finding Type | Audience | Action | Trigger Review |
|--------------|----------|--------|----------------|
| GOVERNMENT_ID (Ghana Card) | PUBLIC | REDACT | Yes (CRITICAL) |
| PHONE_NUMBER | PUBLIC | REDACT | No (if confidence > 0.8) |
| EMAIL | PUBLIC | REDACT | No |
| PRIVATE_LOCATION (GPS) | PUBLIC | REDACT | No |
| LICENSE_PLATE | PUBLIC | REDACT | No |
| UNVERIFIED_ALLEGATION | PUBLIC | REDACT | Yes (HIGH) |
| PUBLIC_OFFICIAL_NAME | PUBLIC | ALLOW | No |
