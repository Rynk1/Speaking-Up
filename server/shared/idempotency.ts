import { Request, Response, NextFunction } from 'express';
import { db } from '../database/db';
import { logger } from './logger';

db.exec(`
  CREATE TABLE IF NOT EXISTS idempotency_keys (
    key TEXT PRIMARY KEY,
    route TEXT NOT NULL,
    response_status INTEGER NOT NULL,
    response_body_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

export function idempotencyMiddleware(req: Request, res: Response, next: NextFunction) {
  const idempotencyKey = req.headers['x-idempotency-key'] as string;
  if (!idempotencyKey) {
    return next();
  }

  try {
    const existing = db.prepare('SELECT * FROM idempotency_keys WHERE key = ? AND route = ?')
      .get(idempotencyKey, req.originalUrl) as any;

    if (existing) {
      logger.info(`[Idempotency] Returning cached response for key: ${idempotencyKey}`);
      return res.status(existing.response_status).json(JSON.parse(existing.response_body_json));
    }

    // Intercept response write to cache idempotency key
    const originalJson = res.json.bind(res);
    res.json = (body: any): Response => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          db.prepare(`
            INSERT INTO idempotency_keys (key, route, response_status, response_body_json, created_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(key) DO NOTHING
          `).run(idempotencyKey, req.originalUrl, res.statusCode, JSON.stringify(body), new Date().toISOString());
        } catch (err: any) {
          logger.error(`Failed to store idempotency key: ${err.message}`);
        }
      }
      return originalJson(body);
    };

    next();
  } catch (err: any) {
    logger.error(`Idempotency error: ${err.message}`);
    next();
  }
}
