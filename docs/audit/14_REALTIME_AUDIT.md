# 14 - Real-Time Architecture Audit

## 1. Current State
- **Status:** `Level 1 (UI Prototype)`
- **Mechanism:** HTTP REST polling / manual UI refresh button (`refreshPosts` in `App.tsx`).

## 2. Recommendation: Economical Server-Sent Events (SSE)
Rather than introducing heavy WebSocket infrastructure or complex message brokers, Speak Up should adopt Server-Sent Events (SSE) at endpoint `/api/events`.

```
Server -> Broadcast Event (POST_CREATED, RESPONSE_SUBMITTED, ALERT_STATUS_CHANGED) -> EventSource in React -> Query Cache Invalidation
```

- **Cost:** Zero additional infrastructure dependencies (uses existing Express HTTP connections).
- **Bandwidth:** Extremely efficient for mobile devices on 2G/3G connections in Ghana.
