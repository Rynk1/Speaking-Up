# P³RE Privacy-Preserving Public Representation Engine Specification

## 1. Dual-Representation Architecture
P³RE isolates canonical citizen submissions in `uploads/original/` and `uploads/protected/` (accessible only via signed tokens by authorized roles) while generating sanitized public projections (`submission_public_projections`).

## 2. Local Ghanaian PII Redaction Pipeline
* **Deterministic Detectors**: Local regex and NER detectors for Ghana Card Numbers (`GHA-XXXXXXXXX-X`), Ghanaian phone numbers (`+233...`), GPS Digital Addresses (`GA-XXX-XXXX`), License Plates, and Tax Identification Numbers (TIN).
* **Pre-Sanitized AI Firewall**: Gemini contextual analysis evaluates sensitivity before public projection generation.
* **Fail-Closed Guarantee**: Processing failures automatically hold submissions for human moderation rather than publishing un-redacted content.
