# P³RE Data Model & Entity Specifications

## Core Entities & Schemas

### 1. `submissions`
Canonical citizen submission record.
- `id`: PRIMARY KEY TEXT
- `author_id`: FOREIGN KEY -> `users(id)`
- `post_type`: CIVIC_REPORT
- `claim_type`: OBSERVATION
- `privacy_status`: PRIVACY_PROCESSING | PRIVACY_READY | PRIVACY_REVIEW_REQUIRED | PRIVACY_FAILED | AI_UNAVAILABLE
- `moderation_status`: approved | restricted | under_review | hidden

### 2. `submission_sources`
Immutable references to original submission components.
- `id`: PRIMARY KEY TEXT
- `submission_id`: FOREIGN KEY -> `submissions(id)`
- `source_type`: TEXT | IMAGE | VIDEO | AUDIO | DOCUMENT
- `storage_object_id`: Storage path
- `content_text`: Raw original text

### 3. `submission_public_projections`
Sanitized public view consumed by public APIs, search, social sharing, and notifications.
- `id`: PRIMARY KEY TEXT
- `submission_id`: FOREIGN KEY -> `submissions(id)`
- `version`: INTEGER
- `title`: TEXT
- `text`: Sanitized public text
- `media_references_json`: JSON array of public derivative media URLs

### 4. `submission_protected_evidence`
- `id`: PRIMARY KEY TEXT
- `submission_id`: FOREIGN KEY -> `submissions(id)`
- `source_id`: FOREIGN KEY -> `submission_sources(id)`
- `access_policy`: INSTITUTION_ONLY

### 5. `privacy_findings`
Log of all detected PII findings.
- `id`: PRIMARY KEY TEXT
- `submission_id`: FOREIGN KEY -> `submissions(id)`
- `type`: PERSON_NAME | PHONE_NUMBER | EMAIL | GOVERNMENT_ID | PRIVATE_LOCATION | LICENSE_PLATE
- `confidence`: REAL (0.0 to 1.0)
- `detector`: Detector identifier
- `policy_action`: REDACT | MASK | ALLOW | OVERRIDE

### 6. `privacy_policies`
Rules engine configuration.
- `id`: PRIMARY KEY TEXT
- `policy_name`: TEXT
- `audience`: PUBLIC | INSTITUTION | MODERATOR
- `action`: REDACT | MASK | ALLOW | BLOCK

### 7. `representation_versions`
Auditable derivative generation log.

### 8. `evidence_access_logs`
Audit trail of institutional access to protected evidence.
- `submission_id`, `actor_id`, `institution_id`, `action`, `timestamp`, `ip`, `reason`, `result`.
