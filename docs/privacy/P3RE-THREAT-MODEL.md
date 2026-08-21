# P³RE Threat Model & Security Mitigations

## Threat Scenarios & Mitigations
1. **Public API Leakage**: Attackers attempt to fetch raw PII via public feed endpoints.
   - *Mitigation*: Public APIs consume ONLY `submission_public_projections`.
2. **Direct Static File Scraping**: Attackers attempt `/uploads/original/filename.jpg`.
   - *Mitigation*: Express static middleware explicitly blocks `/uploads/original` and `/uploads/protected` with 403 Forbidden.
3. **AI Vendor Leakage**: PII leaked to external AI models.
   - *Mitigation*: Pre-sanitization AI Privacy Firewall replaces PII before sending to Gemini.
4. **Unauthorized Institutional Evidence Scraping**: Unassigned institution attempts to view private evidence.
   - *Mitigation*: Strict DB tag scope verification and audit log insertion.
5. **Redaction Failure Exposure**: Processing error during PII scrubbing.
   - *Mitigation*: Fail-closed state machine defaults status to `PRIVACY_FAILED` and holds content for human review.
