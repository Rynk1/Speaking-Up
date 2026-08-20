# Notifications Architecture

## Overview
Notifications are event-driven records stored persistently in the database and retrieved via API polling or WebSocket streams.

## Event Types
- `CONFIRMATION_SPIKE`: Generated when a citizen's post receives significant independent confirmations from nearby residents.
- `INSTITUTION_RESPONSE`: Generated when an official representative from a tagged state body publishes a response or status update.
- `COMMUNITY_EVIDENCE`: Generated when another citizen uploads follow-up evidence or photos to an existing report.

## Endpoints
- `GET /api/notifications`: Retrieves notification feed for authenticated user.
- `PUT /api/notifications/:id/read`: Marks notification as read.
