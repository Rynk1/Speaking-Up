# Real-Time Architecture & Server-Sent Events (SSE) Specification

## 1. SSE Stream Endpoint (`/api/events`)
Provides real-time updates to connected web and mobile clients without polling overhead.

## 2. Event Filtering & Mobile Connection Keep-Alive
* In-memory `EventBus` listener streams domain events (`REPORT_AMPLIFIED`, `ALERT_DELIVERED`, `REPORT_RESOLVED`) to active client connections.
* 15-second heartbeat ping (`: heartbeat\n\n`) prevents mobile network dropouts.
* Role-scoped filtering prevents unauthorized access to protected events.
