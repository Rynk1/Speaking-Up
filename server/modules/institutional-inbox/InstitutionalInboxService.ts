import { db } from '../../database/db';
import { OutboxService } from '../../infrastructure/events/OutboxService';
import { AuditService } from '../audit/AuditService';
import { logger } from '../../shared/logger';
import { AppError } from '../../shared/errors';
import {
  canTransitionWorkItem,
  checkCanResolve,
  WORK_ITEM_SEQUENCE,
  type WorkItemFacts
} from '../../../shared/workflow';

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
   * Creates a read-only visibility mirror of an existing inbox item on a sub-unit
   * desk. Mirrors carry no ownership: they exist so a parent desk's instruction is
   * visible inline in the child desk's queue. State is kept in sync with the source.
   */
  public static createMirrorItem(sourceItemId: string, deskId: string): string | null {
    const source = db.prepare('SELECT * FROM institutional_inbox_items WHERE id = ?').get(sourceItemId) as any;
    if (!source) return null;
    if (source.desk_id === deskId) return null;

    const desk = db.prepare('SELECT * FROM institution_desks WHERE id = ?').get(deskId) as any;
    if (!desk) return null;

    const existing = db.prepare(`
      SELECT id FROM institutional_inbox_items
      WHERE mirror_of_item_id = ? AND desk_id = ?
    `).get(sourceItemId, deskId) as any;
    if (existing) return existing.id;

    const id = `inb-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO institutional_inbox_items (
        id, institution_id, item_type, item_priority, priority_score,
        post_id, situation_id, title, summary, region, district,
        signal_summary_json, action_state, is_read, desk_id, due_at,
        mirror_of_item_id, escalation_level, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      desk.institution_id,
      source.item_type,
      source.item_priority,
      source.priority_score,
      source.post_id || null,
      source.situation_id || null,
      source.title,
      `[Mirror • ${desk.name}] ${source.summary}`,
      source.region || null,
      source.district || null,
      source.signal_summary_json || '{}',
      source.action_state,
      deskId,
      source.due_at || null,
      sourceItemId,
      source.escalation_level || 0,
      now,
      now
    );

    db.prepare(`
      INSERT OR IGNORE INTO inbox_item_routes (id, inbox_item_id, institution_id, desk_id, routing_role, routed_at)
      VALUES (?, ?, ?, ?, 'CC', ?)
    `).run(`rt-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`, id, desk.institution_id, deskId, now);

    OutboxService.enqueueEvent('institution.inbox.item_created', 'INBOX_ITEM', id, {
      itemId: id,
      institutionId: desk.institution_id,
      itemType: source.item_type,
      title: source.title,
      mirrorOf: sourceItemId
    });

    return id;
  }

  /**
   * Records a routing hop for an inbox item: which desk was told about it and in
   * what capacity. PRIMARY owns the work; SECONDARY/SUPPORTING are awareness
   * sub-units (regional or local desks fanned out from the primary). Idempotent
   * per (item, desk) thanks to the unique constraint.
   */
  public static addRoute(input: {
    inboxItemId: string;
    institutionId: string;
    deskId?: string | null;
    routingRole?: 'PRIMARY' | 'SECONDARY' | 'SUPPORTING' | 'CC';
  }): void {
    db.prepare(`
      INSERT OR IGNORE INTO inbox_item_routes (id, inbox_item_id, institution_id, desk_id, routing_role, routed_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      `rt-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      input.inboxItemId,
      input.institutionId,
      input.deskId || null,
      input.routingRole || 'SECONDARY',
      new Date().toISOString()
    );
  }

  /**
   * Returns the routing trail for an item so the console can show which sub-units
   * received it, who owns it, and which are awareness-only.
   */
  public static listRoutes(inboxItemId: string): any[] {
    return db.prepare(`
      SELECT r.*, d.name AS desk_name, d.level AS desk_level, d.coverage_mode AS desk_coverage_mode
      FROM inbox_item_routes r
      LEFT JOIN institution_desks d ON d.id = r.desk_id
      WHERE r.inbox_item_id = ?
      ORDER BY
        CASE r.routing_role WHEN 'PRIMARY' THEN 1 WHEN 'SECONDARY' THEN 2 WHEN 'SUPPORTING' THEN 3 ELSE 4 END,
        r.routed_at ASC
    `).all(inboxItemId) as any[];
  }

  /**
   * Propagates a state change from a source item to all of its visibility mirrors.
   */
  public static syncMirrors(sourceItemId: string, targetState: string, now: string): number {
    const result = db.prepare(`
      UPDATE institutional_inbox_items
      SET action_state = ?, updated_at = ?
      WHERE mirror_of_item_id = ? AND action_state != ?
    `).run(targetState, now, sourceItemId, targetState);
    return result.changes;
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
   * Advances the inbox work item(s) tracking a report when an official response is
   * published for it. Without this the awareness queue keeps showing a report the
   * institution has already answered. Mirrors are skipped (they follow the source).
   * Returns the number of work items advanced.
   */
  public static syncWorkItemFromResponse(
    postId: string,
    targetState: ActionState,
    actor: { id: string; name: string; role: string },
    reason: string
  ): number {
    const order: ActionState[] = [
      'NEW', 'SEEN', 'ACKNOWLEDGED', 'UNDER_REVIEW', 'RESPONSE_PREPARED',
      'PUBLIC_RESPONSE', 'ACTION_REPORTED', 'RESOLVED'
    ];
    const targetRank = order.indexOf(targetState);

    const items = db.prepare(`
      SELECT id, action_state FROM institutional_inbox_items
      WHERE post_id = ? AND mirror_of_item_id IS NULL
    `).all(postId) as any[];

    let advanced = 0;
    for (const item of items) {
      const currentRank = order.indexOf(item.action_state);
      // Only move forward, so a later resolution still advances an already-responded item.
      if (currentRank >= targetRank) continue;
      try {
        this.transitionItemState(item.id, targetState, actor, reason, { system: true });
        advanced++;
      } catch (err: any) {
        logger.warn(`Failed to advance inbox item ${item.id} from response: ${err.message}`);
      }
    }
    return advanced;
  }

  /**
   * Gathers the facts the workflow policy needs to gate an item's transitions:
   * whether the linked report already has an official response or a recorded
   * action, and whether an accountable official is attached.
   */
  private static buildWorkItemFacts(item: any, actorRole: string): WorkItemFacts {
    let hasResponse = false;
    let hasAction = false;
    if (item.post_id) {
      hasResponse = Boolean(db.prepare('SELECT 1 FROM institution_responses WHERE post_id = ? LIMIT 1').get(item.post_id));
      hasAction = Boolean(db.prepare('SELECT 1 FROM institution_actions WHERE post_id = ? LIMIT 1').get(item.post_id));
    }
    return {
      actionState: item.action_state,
      hasResponse,
      hasAction,
      hasOfficer: Boolean(item.assigned_officer_user_id),
      isMirror: Boolean(item.mirror_of_item_id),
      isOversight: actorRole === 'ADMIN' || actorRole === 'MODERATOR'
    };
  }

  public static transitionItemState(
    itemId: string,
    targetState: ActionState,
    actor: { id: string; name: string; role: string },
    notes?: string,
    options: { system?: boolean } = {}
  ): any {
    const item = db.prepare('SELECT * FROM institutional_inbox_items WHERE id = ?').get(itemId) as any;
    if (!item) {
      throw new Error(`Inbox item ${itemId} not found`);
    }
    if (item.mirror_of_item_id) {
      throw new Error('This is a read-only visibility mirror; act on the source work item');
    }

    const beforeState = item.action_state;
    const now = new Date().toISOString();

    // Checks & balances: an operator may only move along a permitted edge of the
    // lifecycle. System-driven advances (an official response, a joint-case
    // resolution, an SLA sweep) are a consequence of a real event and may skip
    // ahead, but they can never move an item *backwards* out of a later stage.
    const facts = this.buildWorkItemFacts(item, actor.role);
    if (options.system) {
      const fromRank = WORK_ITEM_SEQUENCE.indexOf(beforeState as any);
      const toRank = WORK_ITEM_SEQUENCE.indexOf(targetState as any);
      if (beforeState !== 'CITIZEN_FOLLOW_UP' && fromRank !== -1 && toRank !== -1 && toRank < fromRank) {
        throw new AppError(`Cannot move work item backwards from ${beforeState} to ${targetState}`, 409, 'INVALID_TRANSITION');
      }
    } else {
      if (!canTransitionWorkItem(beforeState, targetState)) {
        throw new AppError(
          `Invalid workflow transition ${beforeState} → ${targetState}. The preceding step must be completed first.`,
          409,
          'INVALID_TRANSITION'
        );
      }
      if (targetState === 'RESOLVED') {
        const gate = checkCanResolve(facts, Boolean(notes && notes.trim()));
        if (!gate.ok) throw new AppError(gate.reason || 'Cannot resolve this item yet.', 409, 'PREREQUISITE_UNMET');
      }
    }

    db.prepare(`
      UPDATE institutional_inbox_items
      SET action_state = ?, is_read = 1, updated_at = ?
      WHERE id = ?
    `).run(targetState, now, itemId);

    // Keep read-only mirrors of this item in sync with the source state.
    this.syncMirrors(itemId, targetState, now);

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
