# Full-Stack Deployment & Operations Guide

## Environment Variables
Ensure the following variables are defined in `.env`:
```env
PORT=3000
DATABASE_PATH=speakup.db
JWT_SECRET=your-secure-random-jwt-secret-key
GEMINI_API_KEY=your-optional-google-gemini-api-key
NODE_ENV=production
```

## Production Build
To build both the React frontend bundle and Express server:
```bash
npm run build
```

## Production Execution
Start the persistent server:
```bash
npm run start
```
The application will run on `http://0.0.0.0:3000`.

## Backup & Recovery
- **Database**: Perform regular file copies or WAL snapshots of `speakup.db`.
- **Media Uploads**: Backup the `/uploads` directory.
