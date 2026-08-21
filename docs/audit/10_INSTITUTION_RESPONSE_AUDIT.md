# 10 - Institution Response & Public Accountability Audit

## 1. Response Workflow Tracing
The official institution response pipeline allows verified officials (`INSTITUTION_REP`, `ADMIN`) to issue direct communiqués, action timelines, hotline updates, and status changes.

```
Institution Rep Login -> View Tagged Reports -> Click "Submit Official Response"
                                                           │
                                                           ▼
                                                POST /api/posts/:id/response
                                                           │
                                                           ▼
                                         Persist to `institution_responses`
                                                           │
                                                           ▼
                                            Public Feed Updates Immediately
                                            (Reverse Hierarchy & Statement Modal)
```

## 2. Response Status Lifecycle
The system distinguishes between:
1. **Response Received / Acknowledged** (`WE_ARE_AWARE`, `UNDER_INVESTIGATION`).
2. **Action Planned / In Progress** (`ACTION_PLANNED`, `WORK_IN_PROGRESS`).
3. **Issue Resolved** (`RESOLVED`, `FALSE_REPORT`).

- **Verification Status:** `FULLY_IMPLEMENTED`
- **Database Table:** `institution_responses`
- **UI Components:** `OfficialResponseFeedPostCard.tsx`, `OfficialStatementModal.tsx`, `InstitutionDashboardView.tsx`.
- **Public Interactivity:** Citizens can vote helpfulness (`/api/responses/:id/vote`) and reply directly to official statements (`/api/responses/:id/comments`).
