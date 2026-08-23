import { db } from '../database/db';
import { logger } from '../shared/logger';
import { NotificationProvider, ProviderHealth } from './adapters/types';
import { EmailAdapter } from './adapters/EmailAdapter';
import { SmsAdapter } from './adapters/SmsAdapter';
import { WhatsAppAdapter } from './adapters/WhatsAppAdapter';
import { WebhookAdapter } from './adapters/WebhookAdapter';
import { PushAdapter } from './adapters/PushAdapter';

export class ChannelHealthMonitor {
  private static providers: Record<string, NotificationProvider> = {
    EMAIL: new EmailAdapter(),
    SMS: new SmsAdapter(),
    WHATSAPP: new WhatsAppAdapter(),
    WEBHOOK: new WebhookAdapter(),
    PUSH: new PushAdapter()
  };

  /**
   * Executes a health check across all registered channels
   */
  public static async checkAllChannels(): Promise<ProviderHealth[]> {
    const results: ProviderHealth[] = [];
    const now = new Date().toISOString();

    for (const [type, provider] of Object.entries(this.providers)) {
      try {
        const health = await provider.healthCheck();
        results.push(health);

        // Update institution_channels health status
        db.prepare(`
          UPDATE institution_channels
          SET health_status = ?, last_health_check = ?
          WHERE channel_type = ?
        `).run(health.status, now, type);
      } catch (err: any) {
        const downHealth: ProviderHealth = {
          channelType: type as any,
          status: 'DOWN',
          latencyMs: 0,
          lastChecked: now,
          details: err.message
        };
        results.push(downHealth);

        db.prepare(`
          UPDATE institution_channels
          SET health_status = 'DOWN', last_health_check = ?
          WHERE channel_type = ?
        `).run(now, type);
      }
    }

    return results;
  }

  /**
   * Resolves the best available operational channel for an institution with automatic fallback
   */
  public static resolveOperationalChannel(institutionId: string): any | null {
    const channels = db.prepare(`
      SELECT * FROM institution_channels
      WHERE institution_id = ? AND enabled = 1
      ORDER BY priority ASC
    `).all(institutionId) as any[];

    if (!channels || channels.length === 0) return null;

    // Prefer OPERATIONAL, then DEGRADED, ignore DOWN
    const operational = channels.find(c => c.health_status === 'OPERATIONAL');
    if (operational) return operational;

    const degraded = channels.find(c => c.health_status === 'DEGRADED');
    if (degraded) return degraded;

    // Return primary even if degraded as fallback before total fail
    return channels[0];
  }

  /**
   * Enqueues failed alert into Dead-Letter Queue
   */
  public static enqueueDeadLetter(
    alertId: string,
    postId: string,
    institutionId: string,
    channelType: string,
    lastError: string,
    retryAttempts: number = 3
  ): void {
    const dlqId = `dlq-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO dead_letter_alerts (id, alert_id, post_id, institution_id, channel_type, last_error, retry_attempts, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(dlqId, alertId, postId, institutionId, channelType, lastError, retryAttempts, now);

    logger.warn(`Alert ${alertId} enqueued in Dead-Letter Queue due to repeated delivery failure: ${lastError}`);
  }
}
