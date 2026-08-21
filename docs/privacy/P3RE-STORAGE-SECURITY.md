# P³RE Storage Security & Isolated Storage Zones

## Zone Isolation Structure
- `uploads/original/`: Canonical immutable citizen uploads. Never publicly accessible. Static route access returns HTTP 403 Forbidden.
- `uploads/protected/`: Authorised institutional evidence packages. Access restricted to authenticated endpoints requiring signed tokens or `INSTITUTION_REP`/`ADMIN` session roles.
- `uploads/public/`: Redacted derivative media. Public static serving permitted (`app.use('/uploads/public', ...)`).
- `uploads/processing/`: Staging directory for incoming file streams.
