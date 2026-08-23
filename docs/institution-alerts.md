# Institutional Alert Engine & Multi-Channel Dispatch Specification

## 1. Multi-Channel Dispatch Architecture
Alerts route through data-driven channel resolution (`institution_channels` table):
* **Webhook Adapter**: Transmits HTTP POST payloads signed with HMAC SHA-256 signatures.
* **Email Adapter**: Dispatches official notification emails.
* **SMS Adapter**: Sends emergency SMS alerts to duty officers via gateway aggregators.

## 2. Idempotency & Delivery Tracking
* Idempotency keys (`alert-{postId}-{institutionId}`) prevent duplicate alerts.
* Delivery statuses: `QUEUED` → `DISPATCHING` → `SENT` → `DELIVERED` → `FAILED` / `NOT_CONFIGURED`.
* An alert is never marked as `DELIVERED` without a valid gateway HTTP 200 or gateway ACK.
