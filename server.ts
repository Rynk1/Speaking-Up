import { config } from './server/config';
import { initDatabase } from './server/database/db';
import { seedDatabaseIfEmpty } from './server/seedDatabase';
import { initStorageZones } from './server/storage';
import { initializeJobWorkers } from './server/jobs/workers';
import { createApp } from './server/app';
import { logger } from './server/shared/logger';

async function bootstrap() {
  logger.info('Bootstrapping Speak Up Platform Server...');

  // 1. Initialize Relational SQLite Database & Migrations
  initDatabase();
  await seedDatabaseIfEmpty();

  // 2. Initialize P³RE Media Storage Zones
  initStorageZones();

  // 3. Initialize Background Job Processing Workers
  initializeJobWorkers();

  // 4. Create Express Application
  const app = createApp();

  // 5. Start HTTP Server
  app.listen(config.port, () => {
    logger.info(`Speak Up Production API Server running on port ${config.port} (${config.env} mode)`);
    logger.info(`Health Live Endpoint: http://localhost:${config.port}/health/live`);
    logger.info(`Health Ready Endpoint: http://localhost:${config.port}/health/ready`);
    logger.info(`Real-Time SSE Stream Endpoint: http://localhost:${config.port}/api/events`);
  });
}

bootstrap().catch(err => {
  logger.error(`Server bootstrap failure: ${err.message}`, { error: err });
  process.exit(1);
});
