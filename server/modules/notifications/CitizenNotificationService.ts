import { db } from '../../database/db';
import { NotificationService } from './NotificationService';
import { logger } from '../../shared/logger';

// Reports attributed to the shared anonymous sentinel have no account to reach.
const ANONYMOUS_AUTHOR_ID = 'user-anonymous-reporter';

export type CitizenLifecycleEvent =
  | 'ROUTED'
  | 'ACCEPTED'
  | 'ESCALATED'
  | 'RESOLVED'
  | 'DECLINED'
  | 'RESPONDED';

interface LifecycleMessage {
  title: string;
  buildMessage: (ctx: { institutionName?: string; postTitle?: string; detail?: string }) => string;
}

const MESSAGES: Record<CitizenLifecycleEvent, LifecycleMessage> = {
  ROUTED: {
    title: 'Your report has been routed',
    buildMessage: ({ institutionName }) =>
      `Your report was sent to ${institutionName || 'the responsible institution'} for action. You can follow progress on the report page.`
  },
  ACCEPTED: {
    title: 'An institution accepted your report',
    buildMessage: ({ institutionName }) =>
      `${institutionName || 'The responsible institution'} has accepted your report and will act on it.`
  },
  ESCALATED: {
    title: 'Your report has been escalated',
    buildMessage: ({ detail }) =>
      `Your report was escalated to a higher desk for faster action${detail ? `: ${detail}` : '.'}`
  },
  RESOLVED: {
    title: 'Your report has been resolved',
    buildMessage: ({ institutionName }) =>
      `${institutionName || 'The responsible institution'} has marked your report resolved. Please review the outcome and confirm whether it was addressed.`
  },
  DECLINED: {
    title: 'Your report was returned for follow-up',
    buildMessage: ({ detail }) =>
      `An institution returned your report for citizen follow-up${detail ? `: ${detail}` : '.'}`
  },
  RESPONDED: {
    title: 'An institution responded to your report',
    buildMessage: ({ institutionName }) =>
      `${institutionName || 'The responsible institution'} published an official response to your report.`
  }
};

export class CitizenNotificationService {
  /**
   * Notifies the author of a report about a lifecycle change. Anonymous and
   * non-existent authors are skipped. Returns the notification id, or null when
   * no reachable author exists.
   */
  public static notifyLifecycle(
    postId: string,
    event: CitizenLifecycleEvent,
    options: { institutionName?: string; detail?: string } = {}
  ): string | null {
    try {
      const post = db.prepare('SELECT id, title, author_id FROM posts WHERE id = ?').get(postId) as any;
      if (!post || !post.author_id) return null;
      if (post.author_id === ANONYMOUS_AUTHOR_ID || String(post.author_id).startsWith('anon-actor-')) return null;

      const author = db.prepare('SELECT id FROM users WHERE id = ?').get(post.author_id) as any;
      if (!author) return null;

      const spec = MESSAGES[event];
      return NotificationService.notify({
        userId: post.author_id,
        type: `REPORT_${event}`,
        title: spec.title,
        message: spec.buildMessage({
          institutionName: options.institutionName,
          postTitle: post.title,
          detail: options.detail
        }),
        postId,
        institutionName: options.institutionName
      });
    } catch (err: any) {
      logger.warn(`Citizen lifecycle notification failed (${event}) for ${postId}: ${err.message}`);
      return null;
    }
  }

  private static institutionName(institutionId?: string | null): string | undefined {
    if (!institutionId) return undefined;
    const row = db.prepare('SELECT official_name, short_name FROM institutions WHERE id = ?').get(institutionId) as any;
    return row?.short_name || row?.official_name || undefined;
  }

  public static notifyRouted(postId: string, institutionId?: string | null, detail?: string): string | null {
    return this.notifyLifecycle(postId, 'ROUTED', { institutionName: this.institutionName(institutionId), detail });
  }

  public static notifyAccepted(postId: string, institutionId?: string | null): string | null {
    return this.notifyLifecycle(postId, 'ACCEPTED', { institutionName: this.institutionName(institutionId) });
  }

  public static notifyEscalated(postId: string, institutionId?: string | null, detail?: string): string | null {
    return this.notifyLifecycle(postId, 'ESCALATED', { institutionName: this.institutionName(institutionId), detail });
  }

  public static notifyResolved(postId: string, institutionId?: string | null): string | null {
    return this.notifyLifecycle(postId, 'RESOLVED', { institutionName: this.institutionName(institutionId) });
  }

  public static notifyDeclined(postId: string, institutionId?: string | null, detail?: string): string | null {
    return this.notifyLifecycle(postId, 'DECLINED', { institutionName: this.institutionName(institutionId), detail });
  }
}
