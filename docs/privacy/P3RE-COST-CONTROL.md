# P³RE Cost Control Architecture

## Optimization Directives
1. **Local Deterministic First**: Runs regex and Ghanaian PII rules locally without cloud charges.
2. **Gemini Pre-Filtering**: Calls Gemini only when contextual ambiguity exists.
3. **Media Derivatives**: Strips metadata locally in Node.js buffer streams without expensive third-party OCR services.
4. **Caching Projections**: `submission_public_projections` are generated once per submission/update and cached in SQLite.
