# 12 - Notification Architecture Audit

## 1. Current Notification Pipeline
Notifications are persisted in SQLite table `notifications`:
- **Triggers:** Official institution responses, community evidence updates, new comments on followed issues.
- **Delivery Mechanism:** Pull-based REST API (`GET /api/notifications` and `PUT /api/notifications/:id/read`).

## 2. Notification Audit Findings
- **Status:** `Level 2 (Connected Prototype)`
- **Strengths:** Database persistence, read state toggling, and user filtering work correctly.
- **Gaps:** Push notifications (Web Push / FCM) and real-time socket events are not implemented. Users must refresh or navigate to see unread notification count updates.
