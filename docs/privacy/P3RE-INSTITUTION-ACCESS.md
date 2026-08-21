# P³RE Institutional Evidence Access & Audit Logging

## Access Control & Workflow
1. **Scope Checking**: An institution can only access protected evidence for submissions tagged or assigned to their mandate (`post_institution_tags`).
2. **Short-Lived Signed Tokens**: `/api/institutions/evidence/:id` issues short-lived JWT signed URLs (15 minute TTL) for media viewing.
3. **Audit Trail**: Every access attempt (allowed or denied) inserts an immutable audit row into `evidence_access_logs`:
   - `submission_id`, `actor_id`, `institution_id`, `action` (`VIEW_ORIGINAL`, `DOWNLOAD_ORIGINAL`), `timestamp`, `ip`, `reason`, `result` (`ALLOWED` | `DENIED`).
