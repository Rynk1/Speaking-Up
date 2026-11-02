import { db } from '../../database/db';
import { OutboxService } from '../../infrastructure/events/OutboxService';
import { logger } from '../../shared/logger';

export interface NotificationInput {
  userId: string;
  type: string;
  title: string;
  message: string;
  postId?: string;
  institutionName?: string;
}

export class NotificationService {
  /**
   * Persists an in-app notification for a single user and publishes it on the outbox
   * so it can reach the user through the real-time SSE stream.
   */
  public static notify(input: NotificationInput): string {
    const id = `ntf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO notifications (id, user_id, type, title, message, post_id, institution_name, read, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
    `).run(
      id,
      input.userId,
      input.type,
      input.title,
      input.message,
      input.postId || null,
      input.institutionName || null,
      now
    );

    OutboxService.enqueueEvent('notification.created', 'USER', input.userId, {
      notificationId: id,
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      postId: input.postId || null
    });

    return id;
  }

  /**
   * Fans a notification out to every active official attached to an institution,
   * optionally scoped to a specific desk. Returns the number of recipients reached.
   */
  public static notifyInstitution(
    institutionId: string,
    notification: Omit<NotificationInput, 'userId'>,
    deskId?: string
  ): number {
    const officers = this.resolveInstitutionOfficers(institutionId, deskId);
    for (const officer of officers) {
      this.notify({ ...notification, userId: officer.user_id });
    }
    return officers.length;
  }

  /**
   * Resolves the active user accounts that act on behalf of an institution.
   * Falls back from desk officers, to the institution roster, to verified
   * institution representatives, so routing never silently drops a notification.
   */
  public static resolveInstitutionOfficers(institutionId: string, deskId?: string): { user_id: string }[] {
    try {
      if (deskId) {
        const deskOfficers = db.prepare(`
          SELECT user_id FROM institution_desk_officers
          WHERE desk_id = ? AND status = 'ACTIVE'
        `).all(deskId) as any[];
        if (deskOfficers.length > 0) return deskOfficers;
      }

      const deskScoped = db.prepare(`
        SELECT DISTINCT o.user_id
        FROM institution_desk_officers o
        JOIN institution_desks d ON d.id = o.desk_id
        WHERE d.institution_id = ? AND o.status = 'ACTIVE'
      `).all(institutionId) as any[];
      if (deskScoped.length > 0) return deskScoped;

      const roster = db.prepare(`
        SELECT user_id FROM institution_users
        WHERE institution_id = ? AND COALESCE(status, 'ACTIVE') = 'ACTIVE'
      `).all(institutionId) as any[];
      if (roster.length > 0) return roster;

      return db.prepare(`
        SELECT user_id FROM institution_verifications
        WHERE institution_id = ? AND verification_status = 'VERIFIED'
      `).all(institutionId) as any[];
    } catch (err: any) {
      logger.warn(`Failed to resolve institution officers for ${institutionId}: ${err.message}`);
      return [];
    }
  }
}
