# Content Moderation & Anti-Abuse Pipeline Specification

## 1. Classification Classifications
The moderation pipeline classifies citizen content into six distinct safety states:
* `SAFE`: Standard public civic report.
* `NEEDS_REVIEW`: Held for moderator verification.
* `RESTRICTED`: Geo-restricted or age-restricted content.
* `REMOVED`: Violates platform guidelines (doxxing, child sexual material, hate speech, incitement).
* `LEGAL_REVIEW`: Requires legal counsel evaluation.
* `EMERGENCY_RISK`: Life-safety hazard requiring immediate emergency intercept banner.

## 2. Moderation Principles
Moderation focuses strictly on platform safety, lawful privacy protection, and abuse prevention. Legitimate civic criticism of public officials or state services is never suppressed.
