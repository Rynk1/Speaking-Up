# P³RE Testing Strategy & Verification Guide

## Automated Test Architecture
Automated testing is implemented in `tests/p3re.test.ts` using Vitest:
- `1. Correctly detects Ghanaian PII`: Validates Ghana Card, phone, GPS, plate, TIN, and email regex detectors.
- `2. PrivacyOrchestrator generates sanitized public projection text`: Verifies PII redaction labels.
- `3. Generates and verifies short-lived signed access tokens`: Tests token creation and expiry.
- `4. Enforces fail-closed protection`: Confirms fail-safe state machine.
- `5. End-to-End P³RE Golden Journey`: Tests full pipeline from submission to evidence logging.

Run tests: `npm test`.
