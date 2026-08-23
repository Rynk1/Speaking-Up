# System Operations & Monitoring Specification

## 1. Health Endpoints
* `GET /health/live`: Basic liveness check returning `{ status: 'UP' }`.
* `GET /health/ready`: Readiness check verifying SQLite database connection and table integrity.

## 2. Admin Operations Workspace
Admin Dashboard (`src/components/AdminDashboardView.tsx`) provides operational visibility into:
* Platform overview & engagement statistics.
* User roles, verification status, and ban management.
* Content moderation queue & report holding.
* Public agency registry & channel verification.
* Background job queue backlog & job retry controls.
* Audit trail log search.
