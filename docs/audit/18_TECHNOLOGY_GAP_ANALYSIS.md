# 18 - Technology Gap Analysis

## 1. Technology Evaluation & Action Matrix

| Proposed Technology | Existing? | Needed? | Why | Complexity | Operational Cost | Recommendation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **React 19 + Tailwind v4** | Yes | Yes | High performance, responsive mobile UI | Low | Free | **KEEP** |
| **Express + TypeScript** | Yes | Yes | Simple, maintainable REST server | Low | Low | **KEEP** |
| **SQLite (`better-sqlite3`)** | Yes | Yes | Zero-config, persistent, fast single-node DB | Low | Free | **KEEP** |
| **Nodemailer / SMTP** | No | Yes | Dispatches real email alerts to institution desks | Low | Low / Free tier | **INTRODUCE** |
| **Twilio / SMS Gateway** | No | Yes | Critical emergency SMS alerts to district officers | Medium | Pay-per-SMS | **INTRODUCE** |
| **`express-rate-limit`** | No | Yes | Prevents API abuse and brute-force attacks | Low | Free | **INTRODUCE** |
| **`sanitize-html`** | No | Yes | Prevents XSS attacks on public comments/statements | Low | Free | **INTRODUCE** |
| **Server-Sent Events (SSE)** | No | Yes | Real-time feed & notification updates | Low | Free | **INTRODUCE** |
| **Kubernetes / Microservices**| No | No | Excessive complexity for current operational scale | High | High | **REMOVE/DEFER** |
| **Kafka / RabbitMQ** | No | No | Unnecessary broker overhead; SQLite queue suffices | High | Medium | **REMOVE/DEFER** |
