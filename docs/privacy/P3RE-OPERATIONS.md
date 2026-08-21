# P³RE Operations & Maintenance Guide

## Operational Workflows
1. **Moderation Queue Management**: Moderators monitor `/admin/privacy-review` for submissions flagged with `PRIVACY_REVIEW_REQUIRED`.
2. **Policy Updates**: Policy rules in `privacy_policies` can be enabled, disabled, or updated dynamically without redeploying code.
3. **Audit Log Inspection**: Institutional evidence access can be audited via `/api/institutions/evidence-logs`.
4. **Database Maintenance**: SQLite WAL mode ensures concurrent read/write throughput during high submission spikes.
