import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { eventBus } from './eventBus';
import { logger } from '../shared/logger';

interface SSEClient {
  id: string;
  res: Response;
  userId?: string;
  userRole?: string;
}

const clients = new Set<SSEClient>();

export function setupSSERoute(req: AuthenticatedRequest, res: Response): void {
  const clientId = `sse-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', clientId, timestamp: new Date().toISOString() })}\n\n`);

  const client: SSEClient = {
    id: clientId,
    res,
    userId: req.user?.id,
    userRole: req.user?.role
  };

  clients.add(client);
  logger.info(`SSE Client Connected: ${clientId}`, { userId: req.user?.id });

  // Heartbeat every 15 seconds to prevent mobile connection drops
  const heartbeatTimer = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeatTimer);
    clients.delete(client);
    logger.info(`SSE Client Disconnected: ${clientId}`);
  });
}

// Broadcast events to connected clients
eventBus.on('*', (eventData: any) => {
  const payload = JSON.stringify(eventData);

  for (const client of clients) {
    try {
      // Scoped event filtering
      if (eventData.visibility === 'protected' && client.userRole !== 'INSTITUTION_REP' && client.userRole !== 'ADMIN') {
        continue;
      }
      client.res.write(`data: ${payload}\n\n`);
    } catch (err) {
      clients.delete(client);
    }
  }
});
