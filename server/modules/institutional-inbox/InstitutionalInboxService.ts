import { db } from '../../database/db';
import { OutboxService } from '../../infrastructure/events/OutboxService';
import { AuditService } from '../audit/AuditService';
import { logger } from '../../shared/logger';

export type InboxItemType = 'REPORT' | 'MENTION' | 'FOLLOW_UP' | 'EVIDENCE' | 'RESPONSE' | 'ANNOUNCEMENT' | 'ESCALATION';
export type ActionState =
  | 'NEW'
  | 'SEEN'
  | 'ACKNOWLEDGED'
  | 'UNDER_REVIEW'
  | 'RESPONSE_PREPARED'
  | 'PUBLIC_RESPONSE'
  | 'ACTION_REPORTED'
  | 'RESOLVED'
  | 'CITIZEN_FOLLOW_UP';

export interface InboxItemInput {
  institutionId: string;
  itemType: InboxItemType;
  itemPriority?: 'ROUTINE' | 'ELEVATED' | 'URGENT' | 'EMERGENCY';
  priorityScore?: number;
  postId?: string;
  situationId?: string;
  evidenceId?: string;
  responseId?: string;
  announcementId?: string;
  title: string;
  summary: string;
  region?: string;
  district?: string;
  signalSummary?: Record<string, any>;
}

export class InstitutionalInboxService {
  /**
   * Generates or updates an Awareness Inbox item
   */
  public static createInboxItem(input: InboxItemInput): string {
    const id = `inb-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO institutional_inbox_items (
        id, institution_id, item_type, item_priority, priority_score,
        post_id, situation_id, evidence_id, response_id, announcement_id,
        title, summary, region, district, signal_summary_json, action_state, is_read, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'NEW', 0, ?, ?)
    `).run(
      id,
      input.institutionId,
      input.itemType,
      input.itemPriority || 'ELEVATED',
      input.priorityScore || 50.0,
      input.postId || null,
      input.situationId || null,
      input.evidenceId || null,
      input.responseId || null,
      input.announcementId || null,
      input.title,
      input.summary,
      input.region || null,
      input.district || null,
      JSON.stringify(input.signalSummary || {}),
      now,
      now
    );

    // Increment institution active mentions count
    db.prepare(`
      UPDATE institutions
      SET active_mentions_count = active_mentions_count + 1,
          unanswered_mentions_count = unanswered_mentions_count + 1
      WHERE id = ?
    `).run(input.institutionId);

    OutboxService.enqueueEvent('institution.inbox.item_created', 'INBOX_ITEM', id, {
      itemId: id,
      institutionId: input.institutionId,
      itemType: input.itemType,
      title: input.title,
      priorityScore: input.priorityScore
    });

    return id;
  }

  /**
   * Retrieves inbox items for an institution with search and filtering
   */
  public static getInbox(params: {
    institutionId: string;
    itemType?: string;
    actionState?: string;
    priority?: string;
    search?: string;
    limit?: number;
    cursor?: string;
  }): { items: any[]; totalCount: number } {
    const limit = Math.min(params.limit || 30, 100);
    const conditions: string[] = ['institution_id = ?'];
    const values: any[] = [params.institutionId];

    if (params.itemType && params.itemType !== 'ALL') {
      conditions.push('item_type = ?');
      values.push(params.itemType);
    }
    if (params.actionState && params.actionState !== 'ALL') {
      conditions.push('action_state = ?');
      values.push(params.actionState);
    }
    if (params.priority && params.priority !== 'ALL') {
      conditions.push('item_priority = ?');
      values.push(params.priority);
    }
    if (params.search) {
      conditions.push('(title LIKE ? OR summary LIKE ? OR district LIKE ?)');
      const s = `%${params.search}%`;
      values.push(s, s, s);
    }
    if (params.cursor) {
      conditions.push('created_at < ?');
      values.push(params.cursor);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countRow = db.prepare(`
      SELECT COUNT(*) as total FROM institutional_inbox_items
      ${whereClause}
    `).get(...values) as any;

    const query = `
      SELECT * FROM institutional_inbox_items
      ${whereClause}
      ORDER BY priority_score DESC, created_at DESC
      LIMIT ?
    `;

    values.push(limit);
    const items = db.prepare(query).all(...values) as any[];

    // Parse signal_summary_json
    for (const item of items) {
      try {
        item.signalSummary = JSON.parse(item.signal_summary_json || '{}');
      } catch {
        item.signalSummary = {};
      }
    }

    return {
      items,
      totalCount: countRow?.total || items.length
    };
  }

  /**
   * Transitions an inbox item through the state model
   * NEW -> SEEN -> ACKNOWLEDGED -> UNDER_REVIEW -> RESPONSE_PREPARED -> PUBLIC_RESPONSE -> ACTION_REPORTED -> RESOLVED -> CITIZEN_FOLLOW_UP
   */
  public static transitionItemState(
    itemId: string,
    targetState: ActionState,
    actor: { id: string; name: string; role: string },
    notes?: string
  ): any {
    const item = db.prepare('SELECT * FROM institutional_inbox_items WHERE id = ?').get(itemId) as any;
    if (!item) {
      throw new Error(`Inbox item ${itemId} not found`);
    }

    const beforeState = item.action_state;
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE institutional_inbox_items
      SET action_state = ?, is_read = 1, updated_at = ?
      WHERE id = ?
    `).run(targetState, now, itemId);

    // If associated with a post, synchronize post accountability_status
    if (item.post_id) {
      let mappedPostStatus = 'UNDER_REVIEW';
      if (targetState === 'ACKNOWLEDGED') mappedPostStatus = 'ACKNOWLEDGED';
      else if (targetState === 'UNDER_REVIEW') mappedPostStatus = 'UNDER_REVIEW';
      else if (targetState === 'PUBLIC_RESPONSE') mappedPostStatus = 'RESPONDED';
      else if (targetState === 'ACTION_REPORTED') mappedPostStatus = 'ACTION_IN_PROGRESS';
      else if (targetState === 'RESOLVED') mappedPostStatus = 'RESOLVED';

      db.prepare(`
        UPDATE posts
        SET accountability_status = ?, updated_at = ?
        WHERE id = ?
      `).run(mappedPostStatus, now, item.post_id);

      // Add to report_events timeline
      const evtId = `rev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      db.prepare(`
        INSERT INTO report_events (id, report_id, event_type, actor_type, actor_id, institution_id, metadata_json, created_at)
        VALUES (?, ?, ?, 'INSTITUTION', ?, ?, ?, ?)
      `).run(
        evtId,
        item.post_id,
        `INSTITUTION_${targetState}`,
        actor.id,
        item.institution_id,
        JSON.stringify({ notes, actorName: actor.name, actorRole: actor.role }),
        now
      );
    }

    // If associated with a Civic Situation, record situation timeline event
    if (item.situation_id) {
      const sevId = `sev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      db.prepare(`
        INSERT INTO situation_events (id, situation_id, event_type, actor_type, actor_id, actor_name, institution_id, description, metadata_json, created_at)
        VALUES (?, ?, ?, 'INSTITUTION', ?, ?, ?, ?, ?, ?)
      `).run(
        sevId,
        item.situation_id,
        `SITUATION_${targetState}`,
        actor.id,
        actor.name,
        item.institution_id,
        notes || `Action state moved to ${targetState}`,
        JSON.stringify({ targetState, beforeState }),
        now
      );
    }

    // Immutable audit record
    AuditService.log({
      eventType: 'INBOX_ITEM_TRANSITION',
      userId: actor.id,
      actorType: 'INSTITUTION',
      institutionId: item.institution_id,
      targetType: 'INBOX_ITEM',
      targetId: itemId,
      beforeState: { action_state: beforeState },
      afterState: { action_state: targetState },
      reason: notes || `Operational status updated to ${targetState}`,
      metadata: { actorName: actor.name, actorRole: actor.role }
    });

    OutboxService.enqueueEvent('institution.inbox.transitioned', 'INBOX_ITEM', itemId, {
      itemId,
      institutionId: item.institution_id,
      beforeState,
      targetState,
      actorId: actor.id,
      actorName: actor.name
    });

    return {
      itemId,
      institutionId: item.institution_id,
      beforeState,
      currentState: targetState,
      updatedAt: now
    };
  }
}
