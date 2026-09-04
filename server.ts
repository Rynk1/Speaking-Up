import express, { Request } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { config } from './server/config/index';
import { initDatabase, db } from './server/database/db';
import { seedDatabaseIfEmpty } from './server/seedDatabase';
import { initStorageZones } from './server/storage/index';
import { initializeJobWorkers } from './server/jobs/workers';
import { OutboxService } from './server/infrastructure/events/OutboxService';
import { createApp } from './server/app';
import { logger } from './server/shared/logger';

// Helper to inject dynamic OpenGraph and Twitter meta tags for crawler and link previews
function injectOpenGraphTags(html: string, req: Request): string {
  const urlPath = req.path;
  let postId = '';
  const postMatch = urlPath.match(/\/(?:posts|app\/post)\/([a-zA-Z0-9_-]+)/);
  if (postMatch) {
    postId = postMatch[1];
  } else if (req.query.postId) {
    postId = req.query.postId as string;
  }

  if (!postId) return html;

  try {
    const post = db.prepare(`
      SELECT p.*, spp.text as public_text
      FROM posts p
      LEFT JOIN submission_public_projections spp ON spp.submission_id = p.id
      WHERE p.id = ?
    `).get(postId) as any;

    if (post) {
      const mediaRow = db.prepare("SELECT url FROM media WHERE post_id = ? AND type = 'image' LIMIT 1").get(postId) as any;
      const host = req.get('host') || 'localhost:3000';
      const protocol = req.protocol || 'http';
      const fullPostUrl = `${protocol}://${host}/app/post/${post.id}`;
      let mediaUrl = mediaRow?.url || '';
      if (mediaUrl.startsWith('/')) {
        mediaUrl = `${protocol}://${host}${mediaUrl}`;
      }
      if (!mediaUrl) {
        mediaUrl = 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=1200&q=80';
      }

      const safeTitle = `🚨 [${post.urgency || 'CIVIC REPORT'}] ${post.title} | Ghana Civic Network`
        .replace(/"/g, '&quot;');
      const locationStr = `${post.landmark ? post.landmark + ', ' : ''}${post.district} (${post.region})`;
      const snippet = (post.public_text || post.content || '').replace(/\s+/g, ' ').slice(0, 180);
      const safeDesc = `${locationStr}: ${snippet}... (${post.confirmations_count || 1} verified citizen observations)`
        .replace(/"/g, '&quot;');

      let modifiedHtml = html;
      if (modifiedHtml.includes('<title>')) {
        modifiedHtml = modifiedHtml.replace(/<title>.*?<\/title>/, `<title>${safeTitle}</title>`);
      }

      const ogTags = `
    <meta name="description" content="${safeDesc}" />
    <meta property="og:title" content="${safeTitle}" />
    <meta property="og:description" content="${safeDesc}" />
    <meta property="og:image" content="${mediaUrl}" />
    <meta property="og:url" content="${fullPostUrl}" />
    <meta property="og:type" content="article" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${safeTitle}" />
    <meta name="twitter:description" content="${safeDesc}" />
    <meta name="twitter:image" content="${mediaUrl}" />`;

      // Remove default meta tags to prevent duplicates
      modifiedHtml = modifiedHtml
        .replace(/<meta property="og:[^"]+" content="[^"]*"\s*\/?>/gi, '')
        .replace(/<meta name="twitter:[^"]+" content="[^"]*"\s*\/?>/gi, '')
        .replace(/<meta name="description" content="[^"]*"\s*\/?>/gi, '');

      modifiedHtml = modifiedHtml.replace('</head>', `${ogTags}\n  </head>`);
      return modifiedHtml;
    }
  } catch (err: any) {
    logger.error('Error generating dynamic OpenGraph tags:', { error: err.message });
  }

  return html;
}

async function bootstrap() {
  logger.info('Bootstrapping Speak Up Platform Server...');

  // 1. Initialize Relational SQLite Database & Migrations
  initDatabase();
  await seedDatabaseIfEmpty();

  // 2. Initialize P³RE Media Storage Zones
  initStorageZones();

  // 3. Initialize Background Job Processing Workers & Transactional Outbox
  initializeJobWorkers();
  OutboxService.startOutboxWorker();

  // 4. Create Express Application with API & Health Endpoints
  const app = createApp();

  // 5. Mount Vite Dev Middleware OR Production Static Files with OpenGraph SSR
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });

    app.use(vite.middlewares);

    app.use('*', async (req, res, next) => {
      if (req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/health') || req.originalUrl.startsWith('/uploads')) {
        return next();
      }

      try {
        const indexPath = path.resolve(process.cwd(), 'index.html');
        let template = fs.readFileSync(indexPath, 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        const transformedWithOg = injectOpenGraphTags(template, req);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(transformedWithOg);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    const indexPath = path.join(distPath, 'index.html');

    app.use(express.static(distPath, { index: false }));

    app.get('*', (req, res, next) => {
      if (req.url.startsWith('/api') || req.url.startsWith('/health') || req.url.startsWith('/uploads')) {
        return next();
      }
      try {
        if (fs.existsSync(indexPath)) {
          let html = fs.readFileSync(indexPath, 'utf-8');
          html = injectOpenGraphTags(html, req);
          res.status(200).set({ 'Content-Type': 'text/html' }).send(html);
        } else {
          res.status(404).send('Application build not found');
        }
      } catch (err: any) {
        next(err);
      }
    });
  }

  // 6. Start HTTP Server on Port 3000
  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Speak Up Production API Server running on port ${PORT} (${config.env} mode)`);
    logger.info(`Live Web Preview: http://localhost:${PORT}/`);
    logger.info(`Health Live Endpoint: http://localhost:${PORT}/health/live`);
    logger.info(`Health Ready Endpoint: http://localhost:${PORT}/health/ready`);
    logger.info(`Real-Time SSE Stream Endpoint: http://localhost:${PORT}/api/events`);
  });
}

bootstrap().catch(err => {
  logger.error(`Server bootstrap failure: ${err.message}`, { error: err });
  process.exit(1);
});
