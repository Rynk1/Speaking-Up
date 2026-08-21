# 16 - Scalability Audit

## 1. Scale Projections & Architectural Bottlenecks

| Load Tier | Active Users | Daily Posts | Bottleneck Analysis | Architectural Change Needed |
| :--- | :--- | :--- | :--- | :--- |
| **Tier 1 (Current)** | 1,000 | 50 | Single Node Express + SQLite works flawlessly. | None |
| **Tier 2 (MVP)** | 10,000 | 500 | SQLite write locks during peak reporting bursts. | Enable WAL mode (already done) or move to PostgreSQL. |
| **Tier 3 (National)** | 100,000 | 5,000 | Static file serving for media saturates single server bandwidth. | Offload `/uploads/` to S3/Cloudflare R2 + CDN. |
| **Tier 4 (Enterprise)** | 1,000,000 | 50,000 | Monolithic Express CPU saturation during AI analysis. | Decouple background workers (Redis + BullMQ). |

## 2. Recommendation
Maintain single-node Express + SQLite for Tier 1 and Tier 2. Prepare migration scripts for PostgreSQL and Cloudflare R2 object storage before scaling to Tier 3.
