# Production Deployment & Environment Configuration Specification

## 1. Environment Requirements
* Node.js v20+, npm v10+.
* Environment variables: `PORT=3000`, `DATABASE_PATH=speakup.db`, `JWT_SECRET=...`, `IP_HASH_SALT=...`, `GEMINI_API_KEY=...`.

## 2. Build & Startup Commands
```bash
npm install
npm run build
npm start
```
Server runs on Express with Vite production static file serving and dynamic OpenGraph SSR tag injection.
