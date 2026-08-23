# Backup, Disaster Recovery & Data Retention Specification

## 1. Online Database Backup
The system uses `DatabaseBackupService` executing WAL-compatible `VACUUM INTO` operations:
* Triggers automated online snapshot backups without locking or database downtime.
* Snapshots stored in `/backups/speakup-backup-{timestamp}.db`.

## 2. Recovery Objectives
* **Recovery Point Objective (RPO)**: < 1 hour.
* **Recovery Time Objective (RTO)**: < 15 minutes via database file restoration.
