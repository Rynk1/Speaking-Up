# Institution Response & Community Outcome Lifecycle Specification

## 1. Official Response Lifecycle
When tagged institutions review reports, officials log into the workspace to record:
* **Acknowledgement**: Official acknowledgment statement and reference ID.
* **Work Order / Action**: Resolution evidence, photo updates, and completion statements (`institution_actions` table).

## 2. Community Outcome Confirmation Voting
To prevent fake claims of resolution, community members in the district vote on reported actions (`outcome_confirmations` table):
* `CONFIRMED_RESOLVED`: Citizens verify the issue is fixed.
* `DISPUTED_STILL_ONGOING`: Citizens report the issue remains unresolved.
* Statuses evolve from `ACTION_REPORTED` → `COMMUNITY_CONFIRMED` or `COMMUNITY_DISPUTED`.
