import { db } from '../../database/db';
import { OutboxService } from '../../infrastructure/events/OutboxService';
import { AuditService } from '../audit/AuditService';
import { InstitutionalInboxService } from '../institutional-inbox/InstitutionalInboxService';
import { NotificationService } from '../notifications/NotificationService';
import { CitizenNotificationService } from '../notifications/CitizenNotificationService';
import { CoordinationService, CoordinationActor } from './CoordinationService';
import { logger } from '../../shared/logger';
import { AppError } from '../../shared/errors';
import { checkCanResolveCase, canTransitionParticipant } from '../../../shared/workflow';

export type CaseStatus = 'OPEN' | 'ACTIVE' | 'RESOLVED' | 'CLOSED';
export type ParticipantRole = 'LEAD' | 'SUPPORTING' | 'REGULATOR' | 'OBSERVER';
export type ParticipantStatus = 'INVITED' | 'ACCEPTED' | 'DECLINED' | 'COMPLETED';

export interface JointCaseParticipantInput {
  institutionId: string;
  deskId?: string | null;
  role?: ParticipantRole;
  responsibility?: string;
}

export interface CreateJointCaseInput {
  postId?: string;
  situationId?: string;
  title: string;
  category?: string;
  region?: string;
  district?: string;
  summary?: string;
  priority?: string;
  leadInstitutionId: string;
  participants?: JointCaseParticipantInput[];
}

const CLOSED_STATES: CaseStatus[] = ['RESOLVED', 'CLOSED'];

export class JointCaseService {
  /**
   * Opens a joint coordination case that binds several state institutions (and
   * their sub-unit desks) to one civic issue. Each participant receives an
   * actionable inbox item on the most specific desk for the case location, so a
   * multi-agency response is coordinated from a single shared record.
   */
  public static createCase(input: CreateJointCaseInput, actor: CoordinationActor): any {
    if (!input.title || input.title.trim().length < 3) throw new Error('A case title is required');
    if (!input.leadInstitutionId) throw new Error('A lead institution is required');

    const lead = db.prepare('SELECT * FROM institutions WHERE id = ?').get(input.leadInstitutionId) as any;
    if (!lead) throw new Error(`Lead institution ${input.leadInstitutionId} not found`);

    const now = new Date().toISOString();
    const caseId = `case-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const priority = input.priority || 'ELEVATED';

    db.prepare(`
      INSERT INTO coordination_cases (
        id, post_id, situation_id, title, category, region, district, summary,
        status, priority, lead_institution_id, created_by_id, created_by_name, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?, ?, ?, ?, ?)
    `).run(
      caseId,
      input.postId || null,
      input.situationId || null,
      input.title.trim(),
      input.category || null,
      input.region || null,
      input.district || null,
      input.summary || null,
      priority,
      input.leadInstitutionId,
      actor.id,
      actor.name,
      now,
      now
    );

    // De-duplicate participants; the lead is always a participant.
    const participantMap = new Map<string, JointCaseParticipantInput>();
    participantMap.set(input.leadInstitutionId, { institutionId: input.leadInstitutionId, role: 'LEAD' });
    for (const p of input.participants || []) {
      if (p?.institutionId && !participantMap.has(p.institutionId)) {
        participantMap.set(p.institutionId, p);
      } else if (p?.institutionId) {
        // Preserve a non-lead role if it was supplied for an existing entry.
        const existing = participantMap.get(p.institutionId)!;
        if (!existing.role || existing.role === 'SUPPORTING') existing.role = p.role || existing.role;
        if (!existing.responsibility) existing.responsibility = p.responsibility;
      }
    }

    const invited: any[] = [];
    for (const p of participantMap.values()) {
      const institution = db.prepare('SELECT * FROM institutions WHERE id = ?').get(p.institutionId) as any;
      if (!institution) {
        logger.warn(`Joint case ${caseId}: skipping unknown institution ${p.institutionId}`);
        continue;
      }
      const role: ParticipantRole = p.institutionId === input.leadInstitutionId ? 'LEAD' : (p.role || 'SUPPORTING');
      const desk = p.deskId
        ? { id: p.deskId }
        : CoordinationService.resolveDeskForLocation(p.institutionId, { region: input.region, district: input.district });

      db.prepare(`
        INSERT INTO coordination_case_participants (
          id, case_id, institution_id, desk_id, role, responsibility, status, invited_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'INVITED', ?)
      `).run(
        `cp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        caseId,
        p.institutionId,
        desk?.id || null,
        role,
        p.responsibility || null,
        now
      );

      let inboxItemId: string | null = null;
      if (input.postId) {
        inboxItemId = InstitutionalInboxService.createInboxItem({
          institutionId: p.institutionId,
          itemType: role === 'LEAD' ? 'REPORT' : 'FOLLOW_UP',
          itemPriority: this.mapPriorityToInbox(priority),
          priorityScore: priority === 'EMERGENCY' ? 95 : priority === 'URGENT' ? 80 : 60,
          postId: input.postId,
          situationId: input.situationId,
          title: `${role === 'LEAD' ? 'Joint case lead' : 'Joint case'}: ${input.title}`,
          summary: input.summary || `${institution.official_name} is a ${role.toLowerCase()} on a multi-institution civic case.`,
          region: input.region,
          district: input.district
        });
        if (desk?.id) {
          db.prepare('UPDATE institutional_inbox_items SET desk_id = ?, updated_at = ? WHERE id = ?')
            .run(desk.id, now, inboxItemId);
          db.prepare(`
            INSERT OR IGNORE INTO inbox_item_routes (id, inbox_item_id, institution_id, desk_id, routing_role, routed_at)
            VALUES (?, ?, ?, ?, 'PRIMARY', ?)
          `).run(`rt-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`, inboxItemId, p.institutionId, desk.id, now);
        }
      }

      const notified = NotificationService.notifyInstitution(
        p.institutionId,
        {
          type: 'JOINT_CASE_INVITED',
          title: `Joint case: ${input.title}`,
          message: `${actor.name} opened a joint coordination case where ${institution.official_name} is a ${role.toLowerCase()}.${p.responsibility ? ` Responsibility: ${p.responsibility}` : ''}`,
          postId: input.postId,
          institutionName: institution.official_name
        },
        desk?.id || undefined
      );

      invited.push({
        institutionId: p.institutionId,
        institutionName: institution.official_name,
        role,
        deskId: desk?.id || null,
        inboxItemId,
        notifiedOfficers: notified
      });
    }

    this.recordCaseEvent(caseId, 'CASE_CREATED', actor, {
      description: `Joint case opened with ${invited.length} participating institution(s)`,
      metadata: { leadInstitutionId: input.leadInstitutionId, participantCount: invited.length, priority }
    });

    // The lead institution owns the report while the case is active.
    if (input.postId) {
      const leadDesk = CoordinationService.resolveDeskForLocation(input.leadInstitutionId, {
        region: input.region,
        district: input.district
      });
      db.prepare(`
        UPDATE posts
        SET owner_institution_id = ?, owner_desk_id = COALESCE(owner_desk_id, ?), workflow_stage = 'ROUTED', updated_at = ?
        WHERE id = ?
      `).run(input.leadInstitutionId, leadDesk?.id || null, now, input.postId);
    }

    AuditService.log({
      eventType: 'JOINT_CASE_CREATED',
      userId: actor.id,
      actorType: actor.role === 'ADMIN' ? 'ADMIN' : actor.role === 'MODERATOR' ? 'MODERATOR' : 'INSTITUTION',
      institutionId: input.leadInstitutionId,
      targetType: 'COORDINATION_CASE',
      targetId: caseId,
      afterState: { status: 'OPEN', participants: invited.map(i => i.institutionId), priority },
      reason: input.summary || 'Joint multi-institution coordination case opened',
      metadata: { actorName: actor.name, actorRole: actor.role, postId: input.postId }
    });

    OutboxService.enqueueEvent('coordination.case.created', 'COORDINATION_CASE', caseId, {
      caseId,
      postId: input.postId || null,
      leadInstitutionId: input.leadInstitutionId,
      participantCount: invited.length
    });

    return { ...this.getCase(caseId), participants: invited };
  }

  /**
   * A participant institution accepts, declines, or completes its part of a case.
   */
  public static respondToCase(
    caseId: string,
    institutionId: string,
    status: ParticipantStatus,
    actor: CoordinationActor,
    note?: string
  ): any {
    const participant = db.prepare('SELECT * FROM coordination_case_participants WHERE case_id = ? AND institution_id = ?')
      .get(caseId, institutionId) as any;
    if (!participant) throw new Error('This institution is not a participant on the case');

    if (!canTransitionParticipant(participant.status, status)) {
      throw new AppError(`Invalid participant transition ${participant.status} -> ${status}`, 409, 'INVALID_TRANSITION');
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE coordination_case_participants
      SET status = ?, responded_at = ?, completed_at = ?, response_note = ?
      WHERE id = ?
    `).run(status, now, status === 'COMPLETED' ? now : participant.completed_at, note || null, participant.id);

    const institution = db.prepare('SELECT * FROM institutions WHERE id = ?').get(institutionId) as any;

    this.recordCaseEvent(caseId, `PARTICIPANT_${status}`, actor, {
      description: `${institution?.official_name || institutionId} marked its part ${status.toLowerCase()}${note ? `: ${note}` : ''}`,
      institutionId,
      metadata: { note: note || null }
    });

    // When every non-observer participant has completed, the case is resolvable.
    const outstanding = db.prepare(`
      SELECT COUNT(*) AS c FROM coordination_case_participants
      WHERE case_id = ? AND role <> 'OBSERVER' AND status NOT IN ('COMPLETED', 'DECLINED')
    `).get(caseId) as any;
    const caseRow = db.prepare('SELECT * FROM coordination_cases WHERE id = ?').get(caseId) as any;

    if (caseRow && caseRow.status === 'OPEN') {
      db.prepare("UPDATE coordination_cases SET status = 'ACTIVE', updated_at = ? WHERE id = ?").run(now, caseId);
    }
    if (caseRow && !CLOSED_STATES.includes(caseRow.status) && (outstanding?.c || 0) === 0) {
      this.recordCaseEvent(caseId, 'CASE_READY_FOR_RESOLUTION', { id: 'system', name: 'Joint Case Coordinator', role: 'SYSTEM' }, {
        description: 'All participants have completed or declined; the case is ready for resolution'
      });
    }

    NotificationService.notifyInstitution(caseRow.lead_institution_id, {
      type: 'JOINT_CASE_UPDATE',
      title: `Joint case update: ${caseRow.title}`,
      message: `${institution?.official_name || institutionId} marked its part ${status.toLowerCase()}${note ? `: ${note}` : ''}`,
      postId: caseRow.post_id || undefined
    }, participant.desk_id || undefined);

    AuditService.log({
      eventType: 'JOINT_CASE_PARTICIPANT_RESPONSE',
      userId: actor.id,
      actorType: actor.role === 'ADMIN' ? 'ADMIN' : actor.role === 'MODERATOR' ? 'MODERATOR' : 'INSTITUTION',
      institutionId,
      targetType: 'COORDINATION_CASE',
      targetId: caseId,
      beforeState: { participantStatus: participant.status },
      afterState: { participantStatus: status },
      reason: note || `Participant marked ${status}`,
      metadata: { actorName: actor.name, actorRole: actor.role }
    });

    OutboxService.enqueueEvent('coordination.case.participant_responded', 'COORDINATION_CASE', caseId, {
      caseId,
      institutionId,
      status
    });

    return { caseId, institutionId, status, outstandingParticipants: outstanding?.c || 0 };
  }

  /**
   * Resolves (or closes) a joint case. Only the lead institution or oversight may
   * do so. Citizens tracking the report are notified of the resolution.
   */
  public static resolveCase(
    caseId: string,
    actor: CoordinationActor,
    resolutionSummary: string,
    close: boolean = false
  ): any {
    const caseRow = db.prepare('SELECT * FROM coordination_cases WHERE id = ?').get(caseId) as any;
    if (!caseRow) throw new Error(`Joint case ${caseId} not found`);
    if (CLOSED_STATES.includes(caseRow.status)) throw new Error('Case is already resolved or closed');
    if (!resolutionSummary || resolutionSummary.trim().length < 3) throw new Error('A resolution summary is required');

    const isOversight = ['ADMIN', 'MODERATOR'].includes(actor.role);
    if (!isOversight && actor.institutionId !== caseRow.lead_institution_id) {
      throw new Error('Only the lead institution or platform oversight may resolve this case');
    }

    // Checks & balances: a joint case cannot be closed while participants still
    // have work outstanding. Oversight may force a close, but only with a
    // recorded reason, which lands in the audit trail.
    const outstanding = db.prepare(`
      SELECT COUNT(*) AS c FROM coordination_case_participants
      WHERE case_id = ? AND role <> 'OBSERVER' AND status NOT IN ('COMPLETED', 'DECLINED')
    `).get(caseId) as any;
    const caseGate = checkCanResolveCase({
      outstandingParticipants: outstanding?.c || 0,
      isOversight
    });
    if (!caseGate.ok) throw new AppError(caseGate.reason || 'Cannot resolve this case yet.', 409, 'PREREQUISITE_UNMET');

    const now = new Date().toISOString();
    const nextStatus: CaseStatus = close ? 'CLOSED' : 'RESOLVED';
    db.prepare(`
      UPDATE coordination_cases
      SET status = ?, resolution_summary = ?, resolved_at = ?, updated_at = ?
      WHERE id = ?
    `).run(nextStatus, resolutionSummary.trim(), now, now, caseId);

    // Close out any still-open inbox items attached to the case's report.
    if (caseRow.post_id) {
      db.prepare(`
        UPDATE institutional_inbox_items
        SET action_state = 'RESOLVED', updated_at = ?
        WHERE post_id = ? AND action_state NOT IN ('RESOLVED', 'CITIZEN_FOLLOW_UP')
      `).run(now, caseRow.post_id);
      db.prepare(`
        UPDATE posts SET workflow_stage = 'RESOLVED', accountability_status = 'RESOLVED', resolved_at = ?, updated_at = ?
        WHERE id = ?
      `).run(now, now, caseRow.post_id);
    }

    this.recordCaseEvent(caseId, nextStatus === 'CLOSED' ? 'CASE_CLOSED' : 'CASE_RESOLVED', actor, {
      description: resolutionSummary.trim(),
      metadata: { status: nextStatus }
    });

    const participants = db.prepare(`
      SELECT p.institution_id, p.desk_id, i.official_name
      FROM coordination_case_participants p
      JOIN institutions i ON i.id = p.institution_id
      WHERE p.case_id = ?
    `).all(caseId) as any[];
    for (const p of participants) {
      NotificationService.notifyInstitution(p.institution_id, {
        type: 'JOINT_CASE_RESOLVED',
        title: `Joint case ${nextStatus.toLowerCase()}: ${caseRow.title}`,
        message: `${actor.name} recorded the outcome: ${resolutionSummary.trim()}`,
        postId: caseRow.post_id || undefined,
        institutionName: p.official_name
      }, p.desk_id || undefined);
    }

    if (caseRow.post_id) {
      CitizenNotificationService.notifyResolved(caseRow.post_id, caseRow.lead_institution_id);
    }

    AuditService.log({
      eventType: nextStatus === 'CLOSED' ? 'JOINT_CASE_CLOSED' : 'JOINT_CASE_RESOLVED',
      userId: actor.id,
      actorType: actor.role === 'ADMIN' ? 'ADMIN' : actor.role === 'MODERATOR' ? 'MODERATOR' : 'INSTITUTION',
      institutionId: caseRow.lead_institution_id,
      targetType: 'COORDINATION_CASE',
      targetId: caseId,
      beforeState: { status: caseRow.status },
      afterState: { status: nextStatus },
      reason: resolutionSummary.trim(),
      metadata: { actorName: actor.name, actorRole: actor.role, participants: participants.length }
    });

    OutboxService.enqueueEvent('coordination.case.resolved', 'COORDINATION_CASE', caseId, {
      caseId,
      postId: caseRow.post_id || null,
      status: nextStatus
    });

    return this.getCase(caseId);
  }

  /**
   * Adds a participant to an existing open case.
   */
  public static addParticipant(
    caseId: string,
    input: JointCaseParticipantInput,
    actor: CoordinationActor
  ): any {
    const caseRow = db.prepare('SELECT * FROM coordination_cases WHERE id = ?').get(caseId) as any;
    if (!caseRow) throw new Error(`Joint case ${caseId} not found`);
    if (CLOSED_STATES.includes(caseRow.status)) throw new Error('Cannot add participants to a closed case');

    const institution = db.prepare('SELECT * FROM institutions WHERE id = ?').get(input.institutionId) as any;
    if (!institution) throw new Error(`Institution ${input.institutionId} not found`);

    const existing = db.prepare('SELECT id FROM coordination_case_participants WHERE case_id = ? AND institution_id = ?')
      .get(caseId, input.institutionId);
    if (existing) throw new Error('Institution is already a participant on this case');

    const now = new Date().toISOString();
    const role: ParticipantRole = input.role || 'SUPPORTING';
    const desk = input.deskId
      ? { id: input.deskId }
      : CoordinationService.resolveDeskForLocation(input.institutionId, {
          region: caseRow.region,
          district: caseRow.district
        });

    db.prepare(`
      INSERT INTO coordination_case_participants (
        id, case_id, institution_id, desk_id, role, responsibility, status, invited_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'INVITED', ?)
    `).run(
      `cp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      caseId,
      input.institutionId,
      desk?.id || null,
      role,
      input.responsibility || null,
      now
    );

    if (caseRow.post_id) {
      const inboxItemId = InstitutionalInboxService.createInboxItem({
        institutionId: input.institutionId,
        itemType: 'FOLLOW_UP',
        itemPriority: this.mapPriorityToInbox(caseRow.priority),
        priorityScore: 60,
        postId: caseRow.post_id,
        situationId: caseRow.situation_id || undefined,
        title: `Joint case: ${caseRow.title}`,
        summary: input.responsibility || `${institution.official_name} was added as a ${role.toLowerCase()} on a joint civic case.`,
        region: caseRow.region,
        district: caseRow.district
      });
      if (desk?.id) {
        db.prepare('UPDATE institutional_inbox_items SET desk_id = ?, updated_at = ? WHERE id = ?').run(desk.id, now, inboxItemId);
      }
    }

    NotificationService.notifyInstitution(input.institutionId, {
      type: 'JOINT_CASE_INVITED',
      title: `Joint case: ${caseRow.title}`,
      message: `${actor.name} added ${institution.official_name} as a ${role.toLowerCase()} on a joint civic case.`,
      postId: caseRow.post_id || undefined,
      institutionName: institution.official_name
    }, desk?.id || undefined);

    this.recordCaseEvent(caseId, 'PARTICIPANT_ADDED', actor, {
      description: `${institution.official_name} added as ${role.toLowerCase()}`,
      institutionId: input.institutionId,
      metadata: { role, responsibility: input.responsibility || null }
    });

    db.prepare('UPDATE coordination_cases SET updated_at = ? WHERE id = ?').run(now, caseId);

    AuditService.log({
      eventType: 'JOINT_CASE_PARTICIPANT_ADDED',
      userId: actor.id,
      actorType: actor.role === 'ADMIN' ? 'ADMIN' : actor.role === 'MODERATOR' ? 'MODERATOR' : 'INSTITUTION',
      institutionId: input.institutionId,
      targetType: 'COORDINATION_CASE',
      targetId: caseId,
      afterState: { institutionId: input.institutionId, role },
      reason: `Added participant ${institution.official_name}`,
      metadata: { actorName: actor.name, actorRole: actor.role }
    });

    return this.getCase(caseId);
  }

  public static getCase(caseId: string): any {
    const caseRow = db.prepare(`
      SELECT c.*, li.official_name AS lead_institution_name, li.short_name AS lead_institution_short_name,
             p.title AS post_title
      FROM coordination_cases c
      LEFT JOIN institutions li ON li.id = c.lead_institution_id
      LEFT JOIN posts p ON p.id = c.post_id
      WHERE c.id = ?
    `).get(caseId) as any;
    if (!caseRow) return null;

    const participants = db.prepare(`
      SELECT p.*, i.official_name AS institution_name, i.short_name AS institution_short_name,
             d.name AS desk_name, d.level AS desk_level
      FROM coordination_case_participants p
      JOIN institutions i ON i.id = p.institution_id
      LEFT JOIN institution_desks d ON d.id = p.desk_id
      WHERE p.case_id = ?
      ORDER BY CASE p.role WHEN 'LEAD' THEN 1 WHEN 'SUPPORTING' THEN 2 WHEN 'REGULATOR' THEN 3 ELSE 4 END, i.official_name
    `).all(caseId) as any[];

    const events = db.prepare(`
      SELECT * FROM coordination_case_events WHERE case_id = ? ORDER BY created_at ASC
    `).all(caseId) as any[];

    return { ...caseRow, participants, events };
  }

  /**
   * Lists cases visible to an institution (as lead or participant), or all cases
   * for platform oversight when no institutionId is supplied.
   */
  public static listCases(params: {
    institutionId?: string;
    status?: string;
    limit?: number;
    postId?: string;
  }): any[] {
    const limit = Math.min(params.limit || 50, 200);
    const conditions: string[] = [];
    const args: any[] = [];

    if (params.status && params.status !== 'ALL') {
      conditions.push('c.status = ?');
      args.push(params.status);
    }
    if (params.postId) {
      conditions.push('c.post_id = ?');
      args.push(params.postId);
    }
    if (params.institutionId) {
      conditions.push(`(c.lead_institution_id = ? OR EXISTS (
        SELECT 1 FROM coordination_case_participants cp
        WHERE cp.case_id = c.id AND cp.institution_id = ?
      ))`);
      args.push(params.institutionId, params.institutionId);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    args.push(limit);

    const rows = db.prepare(`
      SELECT c.*, li.official_name AS lead_institution_name, li.short_name AS lead_institution_short_name,
             p.title AS post_title,
             (SELECT COUNT(*) FROM coordination_case_participants cp WHERE cp.case_id = c.id) AS participant_count,
             (SELECT COUNT(*) FROM coordination_case_participants cp WHERE cp.case_id = c.id AND cp.status = 'COMPLETED') AS completed_count
      FROM coordination_cases c
      LEFT JOIN institutions li ON li.id = c.lead_institution_id
      LEFT JOIN posts p ON p.id = c.post_id
      ${where}
      ORDER BY CASE c.priority WHEN 'EMERGENCY' THEN 1 WHEN 'URGENT' THEN 2 WHEN 'ELEVATED' THEN 3 ELSE 4 END,
               c.updated_at DESC
      LIMIT ?
    `).all(...args) as any[];

    return rows;
  }

  private static recordCaseEvent(
    caseId: string,
    eventType: string,
    actor: CoordinationActor,
    detail: { description: string; institutionId?: string; metadata?: Record<string, any> }
  ): void {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO coordination_case_events (
        id, case_id, event_type, actor_type, actor_id, actor_name, institution_id, description, metadata_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `cev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      caseId,
      eventType,
      actor.role === 'ADMIN' ? 'ADMIN' : actor.role === 'MODERATOR' ? 'MODERATOR' : actor.role === 'SYSTEM' ? 'SYSTEM' : 'INSTITUTION',
      actor.id,
      actor.name,
      detail.institutionId || actor.institutionId || null,
      detail.description,
      JSON.stringify(detail.metadata || {}),
      now
    );
  }

  private static mapPriorityToInbox(priority: string): 'ROUTINE' | 'ELEVATED' | 'URGENT' | 'EMERGENCY' {
    switch (priority) {
      case 'EMERGENCY': return 'EMERGENCY';
      case 'URGENT': return 'URGENT';
      case 'ELEVATED': return 'ELEVATED';
      default: return 'ROUTINE';
    }
  }
}
