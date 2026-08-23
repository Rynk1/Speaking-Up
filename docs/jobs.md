# Durable Job Queue Architecture Specification

## 1. Asynchronous Workload Queue
Offloads intensive tasks from primary HTTP request threads using SQLite queue (`jobs` & `job_attempts` tables):
* `PROCESS_PRIVACY`: P³RE PII detection and public projection generation.
* `DISPATCH_ALERT`: Multi-channel institution notifications.
* `GENERATE_SOCIAL_PACK`: Social asset bundle creation.

## 2. Resiliency & Backoff
Supports configurable retry limits, exponential backoff, dead-letter job logging, and idempotency guarantees.
