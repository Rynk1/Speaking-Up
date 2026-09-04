import { db } from '../../database/db';
import { OutboxService } from '../../infrastructure/events/OutboxService';
import { AuditService } from '../audit/AuditService';
import { logger } from '../../shared/logger';

export type OfficialResponseType =
  | 'ACKNOWLEDGEMENT'
  | 'CLARIFICATION'
  | 'REQUEST_INFORMATION'
  | 'REFERRAL'
  | 'STATUS_UPDATE'
  | 'ACTION_REPORTED'
  | 'RESOLUTION';

export interface CreateResponseInput {
  postId: string;
  situationId?: string;
  institutionId: string;
  authorId: string;
  authorName: string;
  authorTitle: string;
  responseType: OfficialResponseType;
  message: string;
  statementTitle?: string;
  fullStatement?: string;
  referenceNumber?: string;
  actionTimeline?: any[];
  documents?: any[];
  hotlines?: string[];
  redirectedToInstitutionId?: string;
  redirectedToInstitutionName?: string;
}

export class OfficialResponseService {
  /**
   * Publishes an authoritative official response to a post and linked situation
   */
  public static createResponse(input: CreateResponseInput): any {
    const institution = db.prepare('SELECT * FROM institutions WHERE id = ?').get(input.institutionId) as any;
    if (!institution) {
      throw new Error(`Institution ${input.institutionId} not found`);
    }

    const responseId = `resp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO institution_responses (
        id, post_id, situation_id, institution_id, institution_name, institution_logo,
        response_type, message, statement_title, full_statement, reference_number,
        action_timeline_json, resolution_status, documents_json, hotlines_json,
        official, verified, responder_name, responder_title, redirected_to_institution_id,
        redirected_to_institution_name, published_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?, ?, ?, ?, ?)
    `).run(
      responseId,
      input.postId,
      input.situationId || null,
      input.institutionId,
      institution.official_name,
      institution.logo || null,
      input.responseType,
      input.message,
      input.statementTitle || null,
      input.fullStatement || null,
      input.referenceNumber || null,
      JSON.stringify(input.actionTimeline || []),
      input.responseType === 'RESOLUTION' ? 'RESOLVED' : 'IN_PROGRESS',
      JSON.stringify(input.documents || []),
      JSON.stringify(input.hotlines || []),
      input.authorName,
      input.authorTitle,
      input.redirectedToInstitutionId || null,
      input.redirectedToInstitutionName || null,
      now,
      now
    );

    // Update post accountability status
    const postStatus = input.responseType === 'RESOLUTION' ? 'RESOLVED' :
                       input.responseType === 'ACTION_REPORTED' ? 'ACTION_IN_PROGRESS' : 'RESPONDED';

    db.prepare(`
      UPDATE posts
      SET accountability_status = ?, updated_at = ?
      WHERE id = ?
    `).run(postStatus, now, input.postId);

    // Increment official responses count for the institution
    db.prepare(`
      UPDATE institutions
      SET official_responses_count = official_responses_count + 1,
          unanswered_mentions_count = MAX(0, unanswered_mentions_count - 1)
      WHERE id = ?
    `).run(input.institutionId);

    // If associated with a Civic Situation, record situation event
    if (input.situationId) {
      const sevId = `sev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      db.prepare(`
        INSERT INTO situation_events (id, situation_id, event_type, actor_type, actor_id, actor_name, institution_id, description, metadata_json, created_at)
        VALUES (?, ?, 'OFFICIAL_RESPONSE', 'INSTITUTION', ?, ?, ?, ?, ?, ?)
      `).run(
        sevId,
        input.situationId,
        input.authorId,
        input.authorName,
        input.institutionId,
        `Official ${input.responseType} published by ${institution.short_name}`,
        JSON.stringify({ responseId, responseType: input.responseType, title: input.statementTitle }),
        now
      );
    }

    // Add report event timeline
    const revId = `rev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    db.prepare(`
      INSERT INTO report_events (id, report_id, event_type, actor_type, actor_id, institution_id, metadata_json, created_at)
      VALUES (?, ?, 'INSTITUTION_RESPONSE_CREATED', 'INSTITUTION', ?, ?, ?, ?)
    `).run(
      revId,
      input.postId,
      input.authorId,
      input.institutionId,
      JSON.stringify({ responseId, responseType: input.responseType, referenceNumber: input.referenceNumber }),
      now
    );

    // Audit log
    AuditService.log({
      eventType: 'OFFICIAL_RESPONSE_PUBLISHED',
      userId: input.authorId,
      actorType: 'INSTITUTION',
      institutionId: input.institutionId,
      targetType: 'RESPONSE',
      targetId: responseId,
      reason: `Published ${input.responseType}`,
      metadata: { postId: input.postId, situationId: input.situationId, responderTitle: input.authorTitle }
    });

    OutboxService.enqueueEvent('institution.response.published', 'OFFICIAL_RESPONSE', responseId, {
      responseId,
      postId: input.postId,
      institutionId: input.institutionId,
      responseType: input.responseType,
      message: input.message
    });

    return {
      id: responseId,
      postId: input.postId,
      institutionId: input.institutionId,
      responseType: input.responseType,
      message: input.message,
      createdAt: now
    };
  }

  /**
   * Records an official action taken by the institution
   */
  public static recordAction(input: {
    postId: string;
    institutionId: string;
    actionTitle: string;
    description: string;
    evidenceUrls?: string[];
    actorName: string;
    actorTitle: string;
  }): any {
    const actionId = `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO institution_actions (
        id, post_id, institution_id, action_title, description, evidence_urls_json, status, actor_name, actor_title, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'IN_PROGRESS', ?, ?, ?)
    `).run(
      actionId,
      input.postId,
      input.institutionId,
      input.actionTitle,
      input.description,
      JSON.stringify(input.evidenceUrls || []),
      input.actorName,
      input.actorTitle,
      now
    );

    // Update post accountability status to ACTION_IN_PROGRESS
    db.prepare(`
      UPDATE posts SET accountability_status = 'ACTION_IN_PROGRESS', updated_at = ? WHERE id = ?
    `).run(now, input.postId);

    AuditService.log({
      eventType: 'INSTITUTION_ACTION_REPORTED',
      actorType: 'INSTITUTION',
      institutionId: input.institutionId,
      targetType: 'POST',
      targetId: input.postId,
      reason: input.actionTitle,
      metadata: { actionId, actorName: input.actorName, actorTitle: input.actorTitle }
    });

    OutboxService.enqueueEvent('institution.action.reported', 'ACTION', actionId, {
      actionId,
      postId: input.postId,
      institutionId: input.institutionId,
      actionTitle: input.actionTitle
    });

    return { id: actionId, ...input, createdAt: now };
  }

  /**
   * Records an independent community outcome confirmation
   * Distinguishes ACTION_REPORTED (by agency) from CITIZEN_CONFIRMED_OUTCOME (by community vote)
   */
  public static recordOutcomeConfirmation(postId: string, userId: string, vote: 'CONFIRMED_FIXED' | 'NOT_FIXED' | 'PARTIAL', comment?: string): any {
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO outcome_confirmations (id, post_id, user_id, vote, comment, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(post_id, user_id) DO UPDATE SET
        vote = excluded.vote,
        comment = excluded.comment,
        created_at = excluded.created_at
    `).run(`outc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`, postId, userId, vote, comment || null, now);

    // Check ratio of confirmations
    const votes = db.prepare('SELECT vote, COUNT(*) as c FROM outcome_confirmations WHERE post_id = ? GROUP BY vote').all(postId) as any[];
    const fixedVotes = votes.find(v => v.vote === 'CONFIRMED_FIXED')?.c || 0;
    const notFixedVotes = votes.find(v => v.vote === 'NOT_FIXED')?.c || 0;

    // If >= 3 citizen confirmations and > 70% positive, mark post as CITIZEN_CONFIRMED
    if (fixedVotes >= 3 && fixedVotes / (fixedVotes + notFixedVotes) >= 0.7) {
      db.prepare("UPDATE posts SET accountability_status = 'CITIZEN_CONFIRMED' WHERE id = ?").run(postId);

      OutboxService.enqueueEvent('outcome.confirmed', 'POST', postId, {
        postId,
        fixedVotes,
        notFixedVotes,
        status: 'CITIZEN_CONFIRMED'
      });
    }

    return { postId, userId, vote, fixedVotes, notFixedVotes };
  }
}
