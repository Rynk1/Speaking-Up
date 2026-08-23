# System Event Model Specification

## 1. Domain Event Lifecycle
Domain events are emitted through `eventBus` and recorded immutably in `report_events`:
* `REPORT_CREATED`: Citizen submission public projection published.
* `REPORT_AMPLIFIED`: User amplifies issue; triggers signal score recalculation.
* `REPORT_CONFIRMED`: Witness confirms report.
* `ALERT_SENT` / `ALERT_DELIVERED` / `ALERT_FAILED`: Institution dispatch result.
* `INSTITUTION_RESPONSE_CREATED`: Official statement published.
* `INSTITUTION_ACTION_REPORTED`: Completion proof uploaded.
* `COMMUNITY_OUTCOME_CONFIRMED` / `COMMUNITY_OUTCOME_DISPUTED`: Citizen verification vote.
