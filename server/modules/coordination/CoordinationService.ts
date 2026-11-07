import { db } from '../../database/db';
import { OutboxService } from '../../infrastructure/events/OutboxService';
import { AuditService } from '../audit/AuditService';
import { InstitutionalInboxService } from '../institutional-inbox/InstitutionalInboxService';
import { NotificationService } from '../notifications/NotificationService';
import { CitizenNotificationService } from '../notifications/CitizenNotificationService';
import { logger } from '../../shared/logger';
import { AppError } from '../../shared/errors';
import {
  canTransitionDelegation,
  checkCanAssign,
  checkCanHandoff,
  checkCanEscalate,
  workItemStateForDelegationStatus,
  type WorkItemFacts
} from '../../../shared/workflow';
import { listMmdasForRegion } from '../../../shared/ghanaMmda';

export type DeskLevel = 'NATIONAL' | 'REGIONAL' | 'METROPOLITAN' | 'MUNICIPAL' | 'DISTRICT' | 'SPECIALIST';
export type LocalDeskLevel = 'METROPOLITAN' | 'MUNICIPAL' | 'DISTRICT';
export type DelegationType = 'TRANSFER' | 'DELEGATION' | 'ESCALATION' | 'INFORMATION';
export type DelegationStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'COMPLETED' | 'CANCELLED';
export type ActionRequired = 'ACTION' | 'ACKNOWLEDGEMENT' | 'INFORMATION';

/**
 * Governs how a desk covers its jurisdiction. STANDING means the desk is always
 * operational for its area; ON_CALL means the agency mobilises only when a report
 * needs it (a national institution with no permanent MMDA presence).
 */
export type CoverageMode = 'STANDING' | 'ON_CALL';

/**
 * Supervisory ordering used for routing, escalation and coverage. Lower rank is
 * more authoritative. The three local tiers (Metropolitan, Municipal, District)
 * all sit just below REGIONAL: a report is still resolved to its most specific
 * local desk first, but escalation always climbs local -> regional -> national.
 */
export const DESK_LEVEL_RANK: Record<string, number> = {
  NATIONAL: 1,
  REGIONAL: 2,
  METROPOLITAN: 3,
  MUNICIPAL: 4,
  DISTRICT: 5,
  SPECIALIST: 6
};

export const LOCAL_DESK_LEVELS: LocalDeskLevel[] = ['METROPOLITAN', 'MUNICIPAL', 'DISTRICT'];

/** The SQL CASE that orders desks from national command down to specialist units. */
const DESK_LEVEL_ORDER_SQL =
  "CASE d.level WHEN 'NATIONAL' THEN 1 WHEN 'REGIONAL' THEN 2 WHEN 'METROPOLITAN' THEN 3 WHEN 'MUNICIPAL' THEN 4 WHEN 'DISTRICT' THEN 5 ELSE 6 END";

export interface CoordinationActor {
  id: string;
  name: string;
  role: string;
  institutionId?: string;
}

export interface DelegationInput {
  postId?: string;
  situationId?: string;
  fromInstitutionId?: string;
  fromDeskId?: string;
  toInstitutionId: string;
  toDeskId?: string;
  delegationType?: DelegationType;
  actionRequired?: ActionRequired;
  priority?: string;
  reason: string;
  instructions?: string;
  dueAt?: string;
}

const SLA_MINUTES: Record<string, number> = {
  EMERGENCY: 30,
  URGENT: 120,
  ELEVATED: 480,
  ROUTINE: 1440
};

export class CoordinationService {
  // ---------------------------------------------------------------------------
  // DESKS & OFFICERS
  // ---------------------------------------------------------------------------

  public static createDesk(input: {
    institutionId: string;
    name: string;
    code: string;
    level?: DeskLevel;
    parentDeskId?: string;
    region?: string;
    district?: string;
    mmdaCode?: string;
    coverageMode?: CoverageMode;
    mobileReady?: boolean;
    specialization?: string;
    contactEmail?: string;
    contactPhone?: string;
    leadOfficerName?: string;
  }): string {
    const id = `desk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO institution_desks (
        id, institution_id, parent_desk_id, name, code, level, region, district,
        mmda_code, coverage_mode, mobile_ready, specialization, contact_email, contact_phone,
        lead_officer_name, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)
    `).run(
      id,
      input.institutionId,
      input.parentDeskId || null,
      input.name,
      input.code,
      input.level || 'NATIONAL',
      input.region || null,
      input.district || null,
      input.mmdaCode || null,
      input.coverageMode || 'STANDING',
      input.mobileReady ? 1 : 0,
      input.specialization || null,
      input.contactEmail || null,
      input.contactPhone || null,
      input.leadOfficerName || null,
      now,
      now
    );

    // Keep the supervisory chain intact: a local desk is auto-parented to its
    // regional desk (or the national desk when the agency has no regional tier).
    if (!input.parentDeskId) {
      const parent = this.inferParentDesk(input.institutionId, input.level || 'NATIONAL', input.region);
      if (parent && parent.id !== id) {
        db.prepare('UPDATE institution_desks SET parent_desk_id = ?, updated_at = ? WHERE id = ?').run(parent.id, now, id);
      }
    }

    AuditService.log({
      eventType: 'DESK_CREATED',
      actorType: 'INSTITUTION',
      institutionId: input.institutionId,
      targetType: 'DESK',
      targetId: id,
      afterState: { name: input.name, level: input.level || 'NATIONAL' }
    });

    return id;
  }

  /**
   * Picks the natural parent for a new desk by level and region: local desks hang
   * off the regional desk for their region, regional desks off national.
   */
  private static inferParentDesk(institutionId: string, level: DeskLevel, region?: string): any | null {
    const national = db.prepare(`
      SELECT * FROM institution_desks
      WHERE institution_id = ? AND level = 'NATIONAL' AND status = 'ACTIVE'
      ORDER BY created_at ASC LIMIT 1
    `).get(institutionId) as any;

    if (LOCAL_DESK_LEVELS.includes(level as LocalDeskLevel)) {
      if (region) {
        const regional = db.prepare(`
          SELECT * FROM institution_desks
          WHERE institution_id = ? AND level = 'REGIONAL' AND region = ? AND status = 'ACTIVE'
          ORDER BY created_at ASC LIMIT 1
        `).get(institutionId, region) as any;
        if (regional) return regional;
      }
      return national || null;
    }

    if (level === 'REGIONAL') return national || null;
    return null;
  }

  /**
   * Rolls out an institution's desk network from the Ghana MMDA registry in one
   * action. For each selected region it ensures a REGIONAL desk exists (creating a
   * national desk first if the agency has none) and creates a local MMDA desk for
   * every selected assembly. Idempotent: existing desks are reported as `skipped`,
   * so a national administrator can re-run the rollout safely after adding a
   * region. Returns a per-desk outcome the console renders as a summary.
   */
  public static provisionHierarchy(input: {
    institutionId: string;
    regions: { region: string; mmdaCodes?: string[]; coverageMode?: CoverageMode; mobileReady?: boolean }[];
    actor: CoordinationActor;
  }): {
    created: number;
    skipped: number;
    desks: { region: string; name: string; level: DeskLevel; mmdaCode?: string; status: 'created' | 'skipped' }[];
  } {
    const institution = db.prepare('SELECT * FROM institutions WHERE id = ?').get(input.institutionId) as any;
    if (!institution) throw new Error(`Institution ${input.institutionId} not found`);
    if (!Array.isArray(input.regions) || input.regions.length === 0) {
      throw new Error('Select at least one region to roll out');
    }

    const results: { region: string; name: string; level: DeskLevel; mmdaCode?: string; status: 'created' | 'skipped' }[] = [];
    const existing = () => db.prepare(`
      SELECT * FROM institution_desks WHERE institution_id = ? AND status = 'ACTIVE'
    `).all(input.institutionId) as any[];

    // Ensure the institution has a national command desk to hang the network from.
    let all = existing();
    if (!all.some((d) => d.level === 'NATIONAL')) {
      this.createDesk({
        institutionId: input.institutionId,
        name: `${institution.short_name || institution.official_name} National Command Desk`,
        code: `${(institution.acronym || 'INST').toUpperCase()}-NAT`,
        level: 'NATIONAL',
        specialization: 'National command and oversight'
      });
      results.push({ region: '-', name: `${institution.acronym} National Command Desk`, level: 'NATIONAL', status: 'created' });
      all = existing();
    }

    for (const sel of input.regions) {
      const region = sel.region;
      const regionDesk = all.find((d) => d.level === 'REGIONAL' && d.region === region);
      if (!regionDesk) {
        this.createDesk({
          institutionId: input.institutionId,
          name: `${region} Regional Operations Desk`,
          code: `${(institution.acronym || 'INST').toUpperCase()}-${region.replace(/[^a-z0-9]/gi, '').slice(0, 4).toUpperCase()}`,
          level: 'REGIONAL',
          region,
          specialization: `Regional coordination for ${region}`
        });
        results.push({ region, name: `${region} Regional Operations Desk`, level: 'REGIONAL', status: 'created' });
        all = existing();
      } else {
        results.push({ region, name: regionDesk.name, level: 'REGIONAL', status: 'skipped' });
      }

      const registry = listMmdasForRegion(region);
      const wanted = sel.mmdaCodes && sel.mmdaCodes.length
        ? registry.filter((m) => sel.mmdaCodes!.includes(m.code))
        : registry;

      for (const mmda of wanted) {
        const already = all.find((d) => d.mmda_code === mmda.code || (d.district === mmda.name && d.region === region));
        if (already) {
          results.push({ region, name: already.name, level: already.level, mmdaCode: already.mmda_code || undefined, status: 'skipped' });
          continue;
        }
        this.createDesk({
          institutionId: input.institutionId,
          name: `${mmda.name} ${institution.acronym || ''} Desk`.replace(/\s+/g, ' ').trim(),
          code: `${mmda.code}-${Date.now().toString().slice(-4)}`,
          level: mmda.tier,
          region,
          district: mmda.name,
          mmdaCode: mmda.code,
          coverageMode: sel.coverageMode || 'STANDING',
          mobileReady: sel.mobileReady ?? false,
          specialization: `Local response for ${mmda.name}`
        });
        results.push({ region, name: `${mmda.name} Desk`, level: mmda.tier, mmdaCode: mmda.code, status: 'created' });
        all = existing();
      }
    }

    const created = results.filter((r) => r.status === 'created').length;
    const skipped = results.filter((r) => r.status === 'skipped').length;

    AuditService.log({
      eventType: 'HIERARCHY_PROVISIONED',
      userId: input.actor.id,
      actorType: 'INSTITUTION',
      institutionId: input.institutionId,
      targetType: 'INSTITUTION',
      targetId: input.institutionId,
      afterState: { created, skipped, regions: input.regions.map((r) => r.region) }
    });

    return { created, skipped, desks: results };
  }

  public static listDesks(institutionId: string): any[] {
    return db.prepare(`
      SELECT d.*, (
        SELECT COUNT(*) FROM institution_desk_officers o
        WHERE o.desk_id = d.id AND o.status = 'ACTIVE'
      ) AS officer_count
      FROM institution_desks d
      WHERE d.institution_id = ? AND d.status != 'ARCHIVED'
      ORDER BY
        ${DESK_LEVEL_ORDER_SQL},
        d.name ASC
    `).all(institutionId) as any[];
  }

  public static assignDeskOfficer(input: {
    deskId: string;
    userId: string;
    role?: string;
    isPrimary?: boolean;
    actor: CoordinationActor;
  }): string {
    const desk = db.prepare('SELECT * FROM institution_desks WHERE id = ?').get(input.deskId) as any;
    if (!desk) throw new Error(`Desk ${input.deskId} not found`);

    const existing = db.prepare('SELECT id FROM institution_desk_officers WHERE desk_id = ? AND user_id = ?')
      .get(input.deskId, input.userId) as any;
    const now = new Date().toISOString();

    if (existing) {
      db.prepare(`
        UPDATE institution_desk_officers
        SET role = ?, is_primary = ?, status = 'ACTIVE', updated_at = ?
        WHERE id = ?
      `).run(input.role || 'CASE_OFFICER', input.isPrimary ? 1 : 0, now, existing.id);
      return existing.id;
    }

    const id = `dof-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    db.prepare(`
      INSERT INTO institution_desk_officers (id, desk_id, institution_id, user_id, role, is_primary, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)
    `).run(id, input.deskId, desk.institution_id, input.userId, input.role || 'CASE_OFFICER', input.isPrimary ? 1 : 0, now, now);

    NotificationService.notify({
      userId: input.userId,
      type: 'DESK_ASSIGNMENT',
      title: `Assigned to ${desk.name}`,
      message: `You have been attached to the ${desk.name} desk as ${(input.role || 'CASE_OFFICER').replace(/_/g, ' ')}.`,
      institutionName: desk.name
    });

    AuditService.log({
      eventType: 'DESK_OFFICER_ASSIGNED',
      userId: input.actor.id,
      actorType: 'INSTITUTION',
      institutionId: desk.institution_id,
      targetType: 'DESK',
      targetId: input.deskId,
      afterState: { userId: input.userId, role: input.role || 'CASE_OFFICER' }
    });

    return id;
  }

  public static listDeskOfficers(deskId: string): any[] {
    return db.prepare(`
      SELECT o.*, u.name, u.email, u.handle, u.avatar
      FROM institution_desk_officers o
      JOIN users u ON u.id = o.user_id
      WHERE o.desk_id = ? AND o.status != 'SUSPENDED'
      ORDER BY o.is_primary DESC, u.name ASC
    `).all(deskId) as any[];
  }

  /**
   * Resolves the most specific operational desk within an institution for a
   * location, walking the local tiers first (Metropolitan, Municipal, District)
   * and falling back to REGIONAL then NATIONAL.
   *
   * Two rules keep this honest for agencies with no permanent local presence:
   *  - A local desk that is ON_CALL is only returned when it is already mobilised
   *    for that jurisdiction (mmda_code set); otherwise the report escalates to the
   *    regional desk, which owns the on-call arrangement.
   *  - A STANDING desk is always eligible.
   */
  public static resolveDeskForLocation(
    institutionId: string,
    location: { region?: string; district?: string; mmdaCode?: string }
  ): any | null {
    if (location.district) {
      const localDesk = this.findLocalDesk(institutionId, location);
      if (localDesk) return localDesk;
    }

    if (location.region) {
      const regionalDesk = db.prepare(`
        SELECT * FROM institution_desks
        WHERE institution_id = ? AND level = 'REGIONAL' AND region = ? AND status = 'ACTIVE'
        LIMIT 1
      `).get(institutionId, location.region) as any;
      if (regionalDesk) return regionalDesk;
    }

    return db.prepare(`
      SELECT * FROM institution_desks
      WHERE institution_id = ? AND level = 'NATIONAL' AND status = 'ACTIVE'
      ORDER BY created_at ASC LIMIT 1
    `).get(institutionId) as any || null;
  }

  /**
   * Finds the local-tier desk (Metropolitan/Municipal/District) covering a
   * jurisdiction. When several local tiers could match, the more specific one wins:
   * an exact district match on the standing desk, then a mobilised on-call desk.
   */
  private static findLocalDesk(
    institutionId: string,
    location: { region?: string; district?: string; mmdaCode?: string }
  ): any | null {
    const tiers = ['METROPOLITAN', 'MUNICIPAL', 'DISTRICT'];
    for (const tier of tiers) {
      const desk = db.prepare(`
        SELECT * FROM institution_desks
        WHERE institution_id = ? AND level = ? AND district = ? AND status = 'ACTIVE'
          AND (coverage_mode IS NULL OR coverage_mode != 'ON_CALL' OR mmda_code IS NOT NULL)
        ORDER BY CASE WHEN coverage_mode = 'STANDING' THEN 0 ELSE 1 END, created_at ASC
        LIMIT 1
      `).get(institutionId, tier, location.district) as any;
      if (desk) return desk;
    }

    if (location.mmdaCode) {
      const byCode = db.prepare(`
        SELECT * FROM institution_desks
        WHERE institution_id = ? AND mmda_code = ? AND status = 'ACTIVE'
        LIMIT 1
      `).get(institutionId, location.mmdaCode) as any;
      if (byCode) return byCode;
    }

    return null;
  }

  /**
   * Returns the full supervisory chain for a resolved desk, ordered from the desk
   * itself up to the national command desk. Used to fan a report out to the
   * regional and local sub-units that must be aware of it.
   */
  public static resolveDeskChain(institutionId: string, startDeskId: string | null): any[] {
    const chain: any[] = [];
    const seen = new Set<string>();
    let cursorId = startDeskId;
    while (cursorId && !seen.has(cursorId)) {
      seen.add(cursorId);
      const desk = db.prepare('SELECT * FROM institution_desks WHERE id = ? AND institution_id = ?')
        .get(cursorId, institutionId) as any;
      if (!desk) break;
      chain.push(desk);
      cursorId = desk.parent_desk_id;
    }
    return chain;
  }

  /**
   * Resolves how a report should be routed inside one institution: the single
   * accountable primary desk, the awareness chain of supervisory desks it climbs
   * through (regional/national), and the downward cascade of local MMDA desks in
   * the report's region that should be *informed* even when they do not own it.
   *
   * The cascade is what lets a national or regional desk's intake reach the
   * MMDA desks on the ground. Those desks are INFORMED (FYI), not SUPPORTING:
   * they are told, but the accountable owner is still the primary desk, so a
   * report can never appear to have several owners. Honours the institution's
   * desk_fanout_enabled toggle.
   */
  public static resolveRoutingChain(
    institutionId: string,
    location: { region?: string; district?: string; mmdaCode?: string }
  ): { primary: any | null; chain: any[]; informed: any[] } {
    const primary = this.resolveDeskForLocation(institutionId, location);
    if (!primary) return { primary: null, chain: [], informed: [] };

    const fanout = db.prepare('SELECT desk_fanout_enabled FROM institutions WHERE id = ?')
      .get(institutionId) as any;
    const enabled = fanout ? Boolean(fanout.desk_fanout_enabled) : true;
    if (!enabled) return { primary, chain: [], informed: [] };

    const chain = this.resolveDeskChain(institutionId, primary.id)
      .filter((d) => d.id !== primary.id);

    const informed = this.resolveInformedLocalDesks(institutionId, primary, location, chain);
    return { primary, chain, informed };
  }

  /**
   * The downward cascade: local MMDA desks in the report's region that are not
   * already the primary or on its supervisory chain. Only standing or mobilised
   * desks are included, so an agency is never shown an on-call desk it has not
   * actually stood up for that jurisdiction.
   */
  private static resolveInformedLocalDesks(
    institutionId: string,
    primary: any,
    location: { region?: string; district?: string; mmdaCode?: string },
    chain: any[]
  ): any[] {
    if (!location.region) return [];

    const exclude = new Set<string>([primary.id, ...chain.map((d) => d.id)]);
    const localDesks = db.prepare(`
      SELECT d.* FROM institution_desks d
      WHERE d.institution_id = ? AND d.status = 'ACTIVE'
        AND d.level IN ('METROPOLITAN', 'MUNICIPAL', 'DISTRICT')
        AND d.region = ?
        AND (d.coverage_mode IS NULL OR d.coverage_mode != 'ON_CALL' OR d.mmda_code IS NOT NULL)
      ORDER BY ${DESK_LEVEL_ORDER_SQL}, d.created_at ASC
    `).all(institutionId, location.region) as any[];

    // A district-named report informs its own local desk even if the primary is
    // that desk already (excluded above); everything else in the region is FYI.
    return localDesks.filter((d) => !exclude.has(d.id));
  }

  /**
   * Reports the local-jurisdiction coverage an institution has for a region: which
   * MMDA tiers are standing, which are on-call, and which districts have no desk.
   * Surfaces the "mobilise when needed" gap so a national desk can act on it.
   */
  public static getRoutingCoverage(institutionId: string, region: string): {
    region: string;
    nationalDesk: any | null;
    regionalDesk: any | null;
    localDesks: any[];
    onCallDesks: any[];
    coveredDistricts: string[];
    gapDistricts: string[];
  } {
    const desks = db.prepare(`
      SELECT d.* FROM institution_desks d
      WHERE d.institution_id = ? AND d.status = 'ACTIVE'
        AND (d.region = ? OR d.level = 'NATIONAL')
      ORDER BY ${DESK_LEVEL_ORDER_SQL}, d.name ASC
    `).all(institutionId, region) as any[];

    const localDesks = desks.filter((d) => LOCAL_DESK_LEVELS.includes(d.level));
    const onCallDesks = localDesks.filter((d) => d.coverage_mode === 'ON_CALL' && !d.mmda_code);
    const coveredDistricts = Array.from(new Set(localDesks.filter((d) => d.district).map((d) => d.district)));

    // Districts that raised reports in this region but have no local desk.
    const reported = db.prepare(`
      SELECT DISTINCT district FROM posts
      WHERE region = ? AND district IS NOT NULL AND district != ''
    `).all(region) as any[];
    const covered = new Set(coveredDistricts);
    const gapDistricts = reported.map((r) => r.district).filter((d: string) => !covered.has(d));

    return {
      region,
      nationalDesk: desks.find((d) => d.level === 'NATIONAL') || null,
      regionalDesk: desks.find((d) => d.level === 'REGIONAL') || null,
      localDesks,
      onCallDesks,
      coveredDistricts,
      gapDistricts
    };
  }

  /**
   * Extends an institution's operation into a specific MMDA jurisdiction by
   * creating a local desk for it (or activating an existing dormant one). This is
   * how a national agency with no permanent local presence mobilises when needed.
   * The new desk is auto-linked to its regional/national supervisor, and any
   * existing reports already routed to the regional desk for that district are
   * re-homed onto it so the local desk starts with the real backlog.
   */
  public static mobiliseLocalDesk(input: {
    institutionId: string;
    region: string;
    district: string;
    level?: LocalDeskLevel;
    mmdaCode?: string;
    coverageMode?: CoverageMode;
    mobileReady?: boolean;
    name?: string;
    code?: string;
    actor: CoordinationActor;
  }): { deskId: string; created: boolean; adoptedItemIds: string[] } {
    const level: LocalDeskLevel = input.level || 'MUNICIPAL';

    const existing = db.prepare(`
      SELECT * FROM institution_desks
      WHERE institution_id = ? AND district = ? AND status = 'ACTIVE'
      ORDER BY created_at ASC LIMIT 1
    `).get(input.institutionId, input.district) as any;

    let deskId: string;
    let created = false;
    const now = new Date().toISOString();

    if (existing) {
      deskId = existing.id;
      db.prepare(`
        UPDATE institution_desks
        SET coverage_mode = ?, mobile_ready = ?, mmda_code = COALESCE(?, mmda_code),
            region = COALESCE(region, ?), level = ?, updated_at = ?
        WHERE id = ?
      `).run(
        input.coverageMode || 'STANDING',
        input.mobileReady ? 1 : 0,
        input.mmdaCode || null,
        input.region,
        level,
        now,
        deskId
      );
    } else {
      created = true;
      deskId = this.createDesk({
        institutionId: input.institutionId,
        name: input.name || `${input.district} Local Operations Desk`,
        code: input.code || `LOCAL-${input.district.replace(/[^a-z0-9]/gi, '').slice(0, 6).toUpperCase()}-${Date.now().toString().slice(-4)}`,
        level,
        region: input.region,
        district: input.district,
        mmdaCode: input.mmdaCode,
        coverageMode: input.coverageMode || 'STANDING',
        mobileReady: input.mobileReady ?? true,
        specialization: `Local response for ${input.district}`
      });
    }

    AuditService.log({
      eventType: created ? 'DESK_MOBILISED' : 'DESK_EXTENDED',
      userId: input.actor.id,
      actorType: 'INSTITUTION',
      institutionId: input.institutionId,
      targetType: 'DESK',
      targetId: deskId,
      afterState: { district: input.district, level, coverageMode: input.coverageMode || 'STANDING' }
    });

    const adoptedItemIds = this.adoptJurisdictionItems(input.institutionId, deskId, {
      region: input.region,
      district: input.district
    });

    return { deskId, created, adoptedItemIds };
  }

  /**
   * Re-homes open inbox items already sitting on a supervisory desk onto a newly
   * mobilised local desk for the same jurisdiction, and records the routing hop.
   * Only items that are not already resolved and not owned by another local desk
   * are moved, so a mobilisation never steals another jurisdiction's work.
   */
  public static adoptJurisdictionItems(
    institutionId: string,
    localDeskId: string,
    location: { region: string; district: string }
  ): string[] {
    const now = new Date().toISOString();
    const localDesk = db.prepare('SELECT * FROM institution_desks WHERE id = ? AND institution_id = ?')
      .get(localDeskId, institutionId) as any;
    if (!localDesk) return [];

    const items = db.prepare(`
      SELECT i.id, i.desk_id FROM institutional_inbox_items i
      LEFT JOIN institution_desks d ON d.id = i.desk_id
      WHERE i.institution_id = ? AND i.district = ?
        AND i.mirror_of_item_id IS NULL
        AND i.action_state NOT IN ('RESOLVED')
        AND (d.id IS NULL OR d.level IN ('NATIONAL', 'REGIONAL'))
    `).all(institutionId, location.district) as any[];

    const adopted: string[] = [];
    for (const item of items) {
      db.prepare(`
        UPDATE institutional_inbox_items
        SET desk_id = ?, assigned_officer_user_id = NULL, assigned_at = NULL, updated_at = ?
        WHERE id = ?
      `).run(localDeskId, now, item.id);

      // The local desk takes over ownership: demote the supervisory desk's PRIMARY
      // route to SUPPORTING so exactly one desk is accountable for the work item.
      db.prepare(`
        UPDATE inbox_item_routes SET routing_role = 'SUPPORTING'
        WHERE inbox_item_id = ? AND routing_role = 'PRIMARY' AND desk_id != ?
      `).run(item.id, localDeskId);

      db.prepare(`
        INSERT OR IGNORE INTO inbox_item_routes (id, inbox_item_id, institution_id, desk_id, routing_role, routed_at)
        VALUES (?, ?, ?, ?, 'PRIMARY', ?)
      `).run(`rt-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`, item.id, institutionId, localDeskId, now);

      if (item.desk_id) {
        InstitutionalInboxService.createMirrorItem(item.id, item.desk_id);
      }
      adopted.push(item.id);
    }
    return adopted;
  }

  // ---------------------------------------------------------------------------
  // DELEGATION, TRANSFER & ESCALATION
  // ---------------------------------------------------------------------------

  public static createDelegation(input: DelegationInput, actor: CoordinationActor): any {
    if (!input.toInstitutionId) throw new Error('Target institution is required');
    if (!input.reason || input.reason.trim().length < 3) throw new Error('A reason is required for delegation');

    const targetInstitution = db.prepare('SELECT * FROM institutions WHERE id = ?').get(input.toInstitutionId) as any;
    if (!targetInstitution) throw new Error(`Target institution ${input.toInstitutionId} not found`);

    const now = new Date().toISOString();
    const id = `dlg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const delegationType = input.delegationType || 'TRANSFER';
    const actionRequired = input.actionRequired || 'ACTION';
    const priority = input.priority || 'NORMAL';

    // Resolve the destination desk: explicit, otherwise the most specific desk for the location.
    let toDeskId = input.toDeskId || null;
    let post: any = null;
    if (input.postId) {
      post = db.prepare('SELECT * FROM posts WHERE id = ?').get(input.postId) as any;
    }
    if (!toDeskId) {
      const resolved = this.resolveDeskForLocation(input.toInstitutionId, {
        region: post?.region,
        district: post?.district
      });
      toDeskId = resolved?.id || null;
    }

    const dueAt = input.dueAt || this.computeDueAt(priority);

    db.prepare(`
      INSERT INTO coordination_delegations (
        id, post_id, situation_id, from_institution_id, from_desk_id,
        to_institution_id, to_desk_id, delegation_type, action_required, reason,
        instructions, status, priority, actor_id, actor_name, actor_role, due_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.postId || null,
      input.situationId || null,
      input.fromInstitutionId || actor.institutionId || null,
      input.fromDeskId || null,
      input.toInstitutionId,
      toDeskId,
      delegationType,
      actionRequired,
      input.reason.trim(),
      input.instructions || null,
      priority,
      actor.id,
      actor.name,
      actor.role,
      dueAt,
      now,
      now
    );

    // Create an awareness inbox item at the receiving institution so the work lands
    // directly on the responsible desk instead of being lost in a public tag.
    let inboxItemId: string | null = null;
    if (input.postId) {
      inboxItemId = InstitutionalInboxService.createInboxItem({
        institutionId: input.toInstitutionId,
        itemType: delegationType === 'ESCALATION' ? 'ESCALATION' : 'FOLLOW_UP',
        itemPriority: this.mapPriorityToInbox(priority),
        priorityScore: priority === 'EMERGENCY' ? 95 : priority === 'URGENT' ? 80 : 55,
        postId: input.postId,
        situationId: input.situationId || post?.situation_id || undefined,
        title: `${delegationType} from ${actor.name}: ${post?.title || 'Civic report'}`,
        summary: input.reason,
        region: post?.region,
        district: post?.district
      });

      db.prepare(`
        UPDATE institutional_inbox_items
        SET desk_id = ?, delegation_id = ?, due_at = ?, assigned_officer_user_id = NULL, updated_at = ?
        WHERE id = ?
      `).run(toDeskId, id, dueAt, now, inboxItemId);

      if (toDeskId) {
        db.prepare(`
          INSERT OR IGNORE INTO inbox_item_routes (id, inbox_item_id, institution_id, desk_id, routing_role, routed_at)
          VALUES (?, ?, ?, ?, 'PRIMARY', ?)
        `).run(`rt-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`, inboxItemId, input.toInstitutionId, toDeskId, now);
      }

      // Ownership handover for action-bearing transfers
      if (actionRequired === 'ACTION') {
        db.prepare(`
          UPDATE posts
          SET owner_institution_id = ?, owner_desk_id = ?, workflow_stage = 'TRANSFERRED',
              accountability_status = 'ROUTED', updated_at = ?
          WHERE id = ?
        `).run(input.toInstitutionId, toDeskId, now, input.postId);
      }

      this.recordReportEvent(input.postId, delegationType === 'ESCALATION' ? 'INSTITUTION_ESCALATED' : 'INSTITUTION_DELEGATED', actor, {
        delegationId: id,
        fromInstitutionId: input.fromInstitutionId || actor.institutionId,
        toInstitutionId: input.toInstitutionId,
        toDeskId,
        delegationType,
        reason: input.reason
      });
    }

    // Notify the receiving institution's desk officers (and the wider roster as fallback)
    const recipientCount = NotificationService.notifyInstitution(
      input.toInstitutionId,
      {
        type: delegationType === 'ESCALATION' ? 'DELEGATION_ESCALATED' : 'DELEGATION_RECEIVED',
        title: `${delegationType} from ${actor.name}`,
        message: `${targetInstitution.official_name} received a ${delegationType.toLowerCase()} requiring ${actionRequired.toLowerCase()}. Reason: ${input.reason}`,
        postId: input.postId,
        institutionName: targetInstitution.official_name
      },
      toDeskId || undefined
    );

    AuditService.log({
      eventType: 'DELEGATION_CREATED',
      userId: actor.id,
      actorType: 'INSTITUTION',
      institutionId: input.fromInstitutionId || actor.institutionId,
      targetType: 'DELEGATION',
      targetId: id,
      afterState: {
        toInstitutionId: input.toInstitutionId,
        toDeskId,
        delegationType,
        actionRequired,
        status: 'PENDING'
      },
      reason: input.reason,
      metadata: { postId: input.postId, recipientCount, actorName: actor.name }
    });

    OutboxService.enqueueEvent('coordination.delegation.created', 'DELEGATION', id, {
      delegationId: id,
      postId: input.postId || null,
      toInstitutionId: input.toInstitutionId,
      toDeskId,
      delegationType
    });

    return {
      id,
      status: 'PENDING',
      toInstitutionId: input.toInstitutionId,
      toDeskId,
      delegationType,
      actionRequired,
      priority,
      dueAt,
      inboxItemId,
      notifiedOfficers: recipientCount,
      createdAt: now
    };
  }

  public static transitionDelegation(
    delegationId: string,
    targetStatus: DelegationStatus,
    actor: CoordinationActor,
    note?: string
  ): any {
    const delegation = db.prepare('SELECT * FROM coordination_delegations WHERE id = ?').get(delegationId) as any;
    if (!delegation) throw new Error(`Delegation ${delegationId} not found`);

    if (!canTransitionDelegation(delegation.status, targetStatus)) {
      throw new AppError(`Invalid delegation transition ${delegation.status} -> ${targetStatus}`, 409, 'INVALID_TRANSITION');
    }

    const now = new Date().toISOString();
    const patch: Record<string, any> = { status: targetStatus, updated_at: now };
    if (targetStatus === 'ACCEPTED') patch.accepted_at = now;
    if (targetStatus === 'DECLINED') patch.declined_reason = note || 'Declined';
    if (targetStatus === 'COMPLETED') patch.completed_at = now;

    db.prepare(`
      UPDATE coordination_delegations
      SET status = ?, accepted_at = COALESCE(?, accepted_at), declined_reason = COALESCE(?, declined_reason),
          completed_at = COALESCE(?, completed_at), updated_at = ?
      WHERE id = ?
    `).run(targetStatus, patch.accepted_at || null, patch.declined_reason || null, patch.completed_at || null, now, delegationId);

    // Synchronise the linked inbox item so the receiver's queue reflects the decision.
    if (delegation.post_id) {
      const linkedItem = db.prepare('SELECT * FROM institutional_inbox_items WHERE delegation_id = ?').get(delegationId) as any;
      if (linkedItem) {
        const mappedState = workItemStateForDelegationStatus(targetStatus);
        if (mappedState) {
          db.prepare('UPDATE institutional_inbox_items SET action_state = ?, updated_at = ? WHERE id = ?')
            .run(mappedState, now, linkedItem.id);
          InstitutionalInboxService.syncMirrors(linkedItem.id, mappedState, now);
        }
      }

      if (targetStatus === 'ACCEPTED') {
        db.prepare("UPDATE posts SET workflow_stage = 'ACCEPTED', updated_at = ? WHERE id = ?").run(now, delegation.post_id);
        CitizenNotificationService.notifyAccepted(delegation.post_id, delegation.to_institution_id);
      } else if (targetStatus === 'COMPLETED') {
        db.prepare("UPDATE posts SET workflow_stage = 'RESOLVED', resolved_at = ?, updated_at = ? WHERE id = ?")
          .run(now, now, delegation.post_id);
        CitizenNotificationService.notifyResolved(delegation.post_id, delegation.to_institution_id);
      } else if (targetStatus === 'DECLINED') {
        db.prepare("UPDATE posts SET owner_institution_id = ?, owner_desk_id = ?, workflow_stage = 'ROUTED', updated_at = ? WHERE id = ?")
          .run(delegation.from_institution_id || null, delegation.from_desk_id || null, now, delegation.post_id);
        CitizenNotificationService.notifyDeclined(delegation.post_id, delegation.to_institution_id, note);
      }

      this.recordReportEvent(delegation.post_id, `DELEGATION_${targetStatus}`, actor, {
        delegationId,
        toInstitutionId: delegation.to_institution_id,
        note: note || null
      });
    }

    // Inform the originating institution (and desk) of the decision so the loop is closed.
    if (delegation.from_institution_id) {
      NotificationService.notifyInstitution(delegation.from_institution_id, {
        type: 'DELEGATION_UPDATE',
        title: `Delegation ${targetStatus.toLowerCase()}`,
        message: `A ${delegation.delegation_type.toLowerCase()} you raised was ${targetStatus.toLowerCase()} by ${actor.name}.${note ? ` Note: ${note}` : ''}`,
        postId: delegation.post_id || undefined
      }, delegation.from_desk_id || undefined);
    }

    AuditService.log({
      eventType: 'DELEGATION_TRANSITION',
      userId: actor.id,
      actorType: actor.role === 'ADMIN' ? 'ADMIN' : actor.role === 'MODERATOR' ? 'MODERATOR' : 'INSTITUTION',
      institutionId: delegation.to_institution_id,
      targetType: 'DELEGATION',
      targetId: delegationId,
      beforeState: { status: delegation.status },
      afterState: { status: targetStatus },
      reason: note || `Delegation marked ${targetStatus}`,
      metadata: { actorName: actor.name, actorRole: actor.role, oversight: actor.role === 'ADMIN' || actor.role === 'MODERATOR' }
    });

    OutboxService.enqueueEvent('coordination.delegation.transitioned', 'DELEGATION', delegationId, {
      delegationId,
      beforeStatus: delegation.status,
      status: targetStatus,
      postId: delegation.post_id
    });

    return { delegationId, beforeStatus: delegation.status, status: targetStatus, updatedAt: now };
  }

  public static listDelegations(params: {
    institutionId: string;
    direction?: 'INCOMING' | 'OUTGOING' | 'ALL';
    status?: string;
    limit?: number;
  }): any[] {
    const limit = Math.min(params.limit || 50, 200);
    const direction = params.direction || 'ALL';
    const conditions: string[] = [];
    const values: any[] = [];

    if (direction === 'INCOMING') {
      conditions.push('d.to_institution_id = ?');
      values.push(params.institutionId);
    } else if (direction === 'OUTGOING') {
      conditions.push('d.from_institution_id = ?');
      values.push(params.institutionId);
    } else {
      conditions.push('(d.to_institution_id = ? OR d.from_institution_id = ?)');
      values.push(params.institutionId, params.institutionId);
    }
    if (params.status && params.status !== 'ALL') {
      conditions.push('d.status = ?');
      values.push(params.status);
    }

    values.push(limit);
    return db.prepare(`
      SELECT d.*,
             p.title AS post_title, p.region, p.district, p.urgency,
             ti.official_name AS to_institution_name, ti.acronym AS to_institution_acronym,
             fi.official_name AS from_institution_name, fi.acronym AS from_institution_acronym,
             td.name AS to_desk_name
      FROM coordination_delegations d
      LEFT JOIN posts p ON p.id = d.post_id
      LEFT JOIN institutions ti ON ti.id = d.to_institution_id
      LEFT JOIN institutions fi ON fi.id = d.from_institution_id
      LEFT JOIN institution_desks td ON td.id = d.to_desk_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY d.created_at DESC
      LIMIT ?
    `).all(...values) as any[];
  }

  // ---------------------------------------------------------------------------
  // ASSIGNMENT & WORKLOAD
  // ---------------------------------------------------------------------------

  public static assignOfficer(input: {
    postId: string;
    institutionId: string;
    deskId?: string;
    officerUserId?: string;
    assignedBy: CoordinationActor;
    notes?: string;
  }): any {
    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(input.postId) as any;
    if (!post) throw new Error(`Report ${input.postId} not found`);

    const now = new Date().toISOString();
    const assignId = `asgn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    db.prepare(`
      INSERT INTO institution_assignments (id, post_id, institution_id, assigned_to_user_id, assigned_by_user_id, status, notes, created_at)
      VALUES (?, ?, ?, ?, ?, 'ASSIGNED', ?, ?)
    `).run(
      assignId,
      input.postId,
      input.institutionId,
      input.officerUserId || (input.deskId ? `desk:${input.deskId}` : 'unassigned-desk'),
      input.assignedBy.id,
      input.notes || null,
      now
    );

    db.prepare(`
      UPDATE posts
      SET owner_institution_id = ?, owner_desk_id = COALESCE(?, owner_desk_id),
          assigned_officer_user_id = ?, workflow_stage = 'ASSIGNED', updated_at = ?
      WHERE id = ?
    `).run(input.institutionId, input.deskId || null, input.officerUserId || null, now, input.postId);

    if (input.officerUserId) {
      NotificationService.notify({
        userId: input.officerUserId,
        type: 'REPORT_ASSIGNED',
        title: 'A civic report was assigned to you',
        message: `${input.assignedBy.name} assigned report "${post.title}" to you.`,
        postId: input.postId
      });
    }

    this.recordReportEvent(input.postId, 'INSTITUTION_ASSIGNED', input.assignedBy, {
      assignId,
      institutionId: input.institutionId,
      deskId: input.deskId || null,
      officerUserId: input.officerUserId || null
    });

    AuditService.log({
      eventType: 'REPORT_ASSIGNED',
      userId: input.assignedBy.id,
      actorType: 'INSTITUTION',
      institutionId: input.institutionId,
      targetType: 'POST',
      targetId: input.postId,
      afterState: { deskId: input.deskId, officerUserId: input.officerUserId },
      metadata: { assignId }
    });

    return { assignId, postId: input.postId, deskId: input.deskId, officerUserId: input.officerUserId, assignedAt: now };
  }

  public static getWorkload(institutionId: string): any {
    const rows = db.prepare(`
      SELECT
        COALESCE(workflow_stage, 'REPORTED') AS stage,
        COUNT(*) AS count
      FROM posts
      WHERE owner_institution_id = ?
      GROUP BY COALESCE(workflow_stage, 'REPORTED')
    `).all(institutionId) as any[];

    const byStage: Record<string, number> = {};
    let total = 0;
    for (const r of rows) {
      byStage[r.stage] = r.count;
      total += r.count;
    }

    const deskRows = db.prepare(`
      SELECT d.id AS desk_id, d.name AS desk_name, d.level,
             COUNT(i.id) AS open_items
      FROM institution_desks d
      LEFT JOIN institutional_inbox_items i
        ON i.desk_id = d.id AND i.action_state NOT IN ('RESOLVED', 'CITIZEN_FOLLOW_UP')
      WHERE d.institution_id = ? AND d.status = 'ACTIVE'
      GROUP BY d.id
      ORDER BY open_items DESC
    `).all(institutionId) as any[];

    const overdue = (db.prepare(`
      SELECT COUNT(*) AS c FROM institutional_inbox_items
      WHERE institution_id = ? AND due_at IS NOT NULL AND due_at < ?
        AND action_state NOT IN ('RESOLVED', 'CITIZEN_FOLLOW_UP')
    `).get(institutionId, new Date().toISOString()) as any)?.c || 0;

    const pendingDelegations = (db.prepare(`
      SELECT COUNT(*) AS c FROM coordination_delegations
      WHERE to_institution_id = ? AND status = 'PENDING'
    `).get(institutionId) as any)?.c || 0;

    return { institutionId, total, byStage, byDesk: deskRows, overdueItems: overdue, pendingDelegations };
  }

  public static listAssignedReports(institutionId: string, officerUserId?: string): any[] {
    const conditions = ['owner_institution_id = ?'];
    const values: any[] = [institutionId];
    if (officerUserId) {
      conditions.push('assigned_officer_user_id = ?');
      values.push(officerUserId);
    }
    return db.prepare(`
      SELECT id, title, category, urgency, severity, region, district, workflow_stage,
             accountability_status, owner_desk_id, assigned_officer_user_id, sla_due_at,
             created_at, updated_at
      FROM posts
      WHERE ${conditions.join(' AND ')}
      ORDER BY
        CASE urgency WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 ELSE 3 END,
        created_at DESC
      LIMIT 200
    `).all(...values) as any[];
  }

  // ---------------------------------------------------------------------------
  // INTERNAL HANDOFF, ASSIGNMENT & ESCALATION LADDER
  // ---------------------------------------------------------------------------

  /**
   * Hands a work item down, up or sideways between desks inside a single
   * institution. Ownership moves to the target desk so the receiving sub-unit can
   * act, while the source desk keeps a read-only mirror for two-way visibility.
   * Any additional sub-units in ccDeskIds receive a read-only mirror too.
   */
  public static handoffToDesk(input: {
    institutionId: string;
    toDeskId: string;
    fromDeskId?: string;
    postId?: string;
    inboxItemId?: string;
    reason: string;
    instructions?: string;
    priority?: string;
    ccDeskIds?: string[];
    parentDelegationId?: string;
    actor: CoordinationActor;
  }): any {
    const targetDesk = db.prepare('SELECT * FROM institution_desks WHERE id = ? AND institution_id = ?')
      .get(input.toDeskId, input.institutionId) as any;
    if (!targetDesk) throw new Error(`Desk ${input.toDeskId} does not belong to institution ${input.institutionId}`);
    if (!input.reason || input.reason.trim().length < 3) throw new Error('A reason is required for a handoff');

    const now = new Date().toISOString();
    let item = input.inboxItemId
      ? db.prepare('SELECT * FROM institutional_inbox_items WHERE id = ?').get(input.inboxItemId) as any
      : null;

    if (!item && input.postId) {
      item = db.prepare(`
        SELECT * FROM institutional_inbox_items
        WHERE post_id = ? AND institution_id = ? AND mirror_of_item_id IS NULL
        ORDER BY created_at DESC LIMIT 1
      `).get(input.postId, input.institutionId) as any;
    }

    const fromDeskId = input.fromDeskId || item?.desk_id || null;

    // Checks & balances: work must be acknowledged before it can be routed.
    if (item) {
      const gate = checkCanHandoff(this.buildWorkItemFacts(item, input.actor));
      if (!gate.ok) throw new AppError(gate.reason || 'Handoff not permitted yet.', 409, 'PREREQUISITE_UNMET');
    }

    const direction = this.resolveHandoffDirection(input.institutionId, fromDeskId, input.toDeskId);
    const delegationType: DelegationType = direction === 'UPWARD' ? 'ESCALATION' : 'DELEGATION';
    const priority = input.priority || item?.item_priority || 'ELEVATED';
    const dueAt = this.computeDueAt(priority);

    const delegationId = `dlg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    db.prepare(`
      INSERT INTO coordination_delegations (
        id, post_id, situation_id, from_institution_id, from_desk_id,
        to_institution_id, to_desk_id, delegation_type, action_required, reason,
        instructions, status, priority, actor_id, actor_name, actor_role,
        due_at, parent_delegation_id, escalation_level, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTION', ?, ?, 'PENDING', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      delegationId,
      input.postId || item?.post_id || null,
      item?.situation_id || null,
      input.institutionId,
      fromDeskId,
      input.institutionId,
      input.toDeskId,
      delegationType,
      input.reason.trim(),
      input.instructions || null,
      priority,
      input.actor.id,
      input.actor.name,
      input.actor.role,
      dueAt,
      input.parentDelegationId || item?.delegation_id || null,
      direction === 'UPWARD' ? 1 : 0,
      now,
      now
    );

    // Ownership moves to the acting desk.
    let mirrorIds: string[] = [];
    if (item) {
      db.prepare(`
        UPDATE institutional_inbox_items
        SET desk_id = ?, delegation_id = ?, due_at = ?, handoff_notes = ?,
            assigned_officer_user_id = NULL, assigned_at = NULL, updated_at = ?
        WHERE id = ?
      `).run(input.toDeskId, delegationId, dueAt, input.instructions || input.reason, now, item.id);

      db.prepare(`
        INSERT OR IGNORE INTO inbox_item_routes (id, inbox_item_id, institution_id, desk_id, routing_role, routed_at)
        VALUES (?, ?, ?, ?, 'PRIMARY', ?)
      `).run(`rt-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`, item.id, input.institutionId, input.toDeskId, now);

      // The source desk keeps a read-only mirror so it can follow the handoff.
      if (fromDeskId) {
        const m = InstitutionalInboxService.createMirrorItem(item.id, fromDeskId);
        if (m) mirrorIds.push(m);
      }
      for (const cc of input.ccDeskIds || []) {
        if (cc && cc !== input.toDeskId && cc !== fromDeskId) {
          const m = InstitutionalInboxService.createMirrorItem(item.id, cc);
          if (m) mirrorIds.push(m);
        }
      }

      if (input.postId || item.post_id) {
        this.recordReportEvent(input.postId || item.post_id, direction === 'UPWARD' ? 'INSTITUTION_ESCALATED' : 'INSTITUTION_HANDOFF', input.actor, {
          delegationId,
          fromDeskId,
          toDeskId: input.toDeskId,
          direction,
          reason: input.reason
        });
      }
    }

    const notified = NotificationService.notifyInstitution(
      input.institutionId,
      {
        type: direction === 'UPWARD' ? 'DELEGATION_ESCALATED' : 'DESK_HANDOFF',
        title: `${direction === 'UPWARD' ? 'Escalated' : 'Handoff'} to ${targetDesk.name}`,
        message: `${input.actor.name} routed work to ${targetDesk.name}. Reason: ${input.reason}`,
        postId: input.postId || item?.post_id || undefined,
        institutionName: targetDesk.name
      },
      input.toDeskId
    );

    AuditService.log({
      eventType: direction === 'UPWARD' ? 'DESK_ESCALATION' : 'DESK_HANDOFF',
      userId: input.actor.id,
      actorType: 'INSTITUTION',
      institutionId: input.institutionId,
      targetType: 'DELEGATION',
      targetId: delegationId,
      afterState: { fromDeskId, toDeskId: input.toDeskId, direction, delegationType },
      reason: input.reason,
      metadata: { actorName: input.actor.name, mirrorIds, notified }
    });

    OutboxService.enqueueEvent('coordination.handoff.created', 'DELEGATION', delegationId, {
      delegationId,
      institutionId: input.institutionId,
      fromDeskId,
      toDeskId: input.toDeskId,
      direction
    });

    return {
      delegationId,
      direction,
      delegationType,
      fromDeskId,
      toDeskId: input.toDeskId,
      inboxItemId: item?.id || null,
      mirrorIds,
      notifiedOfficers: notified,
      dueAt
    };
  }

  /**
   * Assigns a named official to an inbox work item (the ASSIGN transition).
   * Optionally re-homes the item onto the officer's desk.
   */
  public static assignInboxItem(input: {
    inboxItemId: string;
    officerUserId?: string;
    deskId?: string;
    notes?: string;
    actor: CoordinationActor;
  }): any {
    const item = db.prepare('SELECT * FROM institutional_inbox_items WHERE id = ?').get(input.inboxItemId) as any;
    if (!item) throw new Error(`Inbox item ${input.inboxItemId} not found`);
    if (item.mirror_of_item_id) throw new Error('Cannot assign a read-only mirror');

    const assignGate = checkCanAssign(this.buildWorkItemFacts(item, input.actor));
    if (!assignGate.ok) throw new AppError(assignGate.reason || 'Assignment not permitted yet.', 409, 'PREREQUISITE_UNMET');

    if (input.deskId) {
      const desk = db.prepare('SELECT id FROM institution_desks WHERE id = ? AND institution_id = ?')
        .get(input.deskId, item.institution_id) as any;
      if (!desk) throw new Error(`Desk ${input.deskId} does not belong to this institution`);
    }

    if (input.officerUserId && !this.isInstitutionOfficer(item.institution_id, input.officerUserId)) {
      throw new Error('Officer is not attached to this institution');
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE institutional_inbox_items
      SET assigned_officer_user_id = ?, assigned_by_user_id = ?, assigned_at = ?,
          desk_id = COALESCE(?, desk_id), action_state = CASE WHEN action_state = 'NEW' THEN 'ACKNOWLEDGED' ELSE action_state END,
          is_read = 1, updated_at = ?
      WHERE id = ?
    `).run(input.officerUserId || null, input.actor.id, now, input.deskId || null, now, input.inboxItemId);

    if (item.post_id) {
      db.prepare(`
        UPDATE posts
        SET assigned_officer_user_id = COALESCE(?, assigned_officer_user_id),
            owner_desk_id = COALESCE(?, owner_desk_id),
            workflow_stage = 'ASSIGNED', updated_at = ?
        WHERE id = ?
      `).run(input.officerUserId || null, input.deskId || null, now, item.post_id);

      this.recordReportEvent(item.post_id, 'INSTITUTION_ASSIGNED', input.actor, {
        inboxItemId: input.inboxItemId,
        officerUserId: input.officerUserId || null,
        deskId: input.deskId || item.desk_id || null,
        notes: input.notes || null
      });
    }

    if (input.officerUserId) {
      NotificationService.notify({
        userId: input.officerUserId,
        type: 'WORK_ITEM_ASSIGNED',
        title: 'A work item was assigned to you',
        message: `${input.actor.name} assigned "${item.title}" to you.${input.notes ? ` Note: ${input.notes}` : ''}`,
        postId: item.post_id || undefined
      });
    }

    AuditService.log({
      eventType: 'INBOX_ITEM_ASSIGNED',
      userId: input.actor.id,
      actorType: 'INSTITUTION',
      institutionId: item.institution_id,
      targetType: 'INBOX_ITEM',
      targetId: input.inboxItemId,
      afterState: { officerUserId: input.officerUserId || null, deskId: input.deskId || item.desk_id || null },
      reason: input.notes || 'Work item assigned',
      metadata: { actorName: input.actor.name }
    });

    OutboxService.enqueueEvent('institution.inbox.assigned', 'INBOX_ITEM', input.inboxItemId, {
      itemId: input.inboxItemId,
      institutionId: item.institution_id,
      officerUserId: input.officerUserId || null,
      deskId: input.deskId || item.desk_id || null
    });

    return {
      itemId: input.inboxItemId,
      officerUserId: input.officerUserId || null,
      deskId: input.deskId || item.desk_id || null,
      assignedAt: now
    };
  }

  /**
   * Escalates an inbox work item up the desk hierarchy: to an explicit desk, else
   * the parent desk, else the institution's national desk. Every escalation moves
   * ownership, mirrors the item back to the raising desk, and at level 2+ alerts
   * platform oversight.
   */
  public static escalateInboxItem(input: {
    inboxItemId: string;
    reason?: string;
    toDeskId?: string;
    actor: CoordinationActor;
  }): any {
    const item = db.prepare('SELECT * FROM institutional_inbox_items WHERE id = ?').get(input.inboxItemId) as any;
    if (!item) throw new Error(`Inbox item ${input.inboxItemId} not found`);
    if (item.mirror_of_item_id) throw new Error('Cannot escalate a read-only mirror');

    const escalateGate = checkCanEscalate(this.buildWorkItemFacts(item, input.actor), {
      isSystem: input.actor.role === 'SYSTEM'
    });
    if (!escalateGate.ok) throw new AppError(escalateGate.reason || 'Escalation not permitted yet.', 409, 'PREREQUISITE_UNMET');

    const target = this.resolveEscalationTarget(item.institution_id, item.desk_id, input.toDeskId);
    if (!target) throw new Error('No escalation target available for this institution');
    if (target.id === item.desk_id) throw new Error('Work item is already at the top of its desk hierarchy');

    const level = (item.escalation_level || 0) + 1;
    const now = new Date().toISOString();
    // Open a fresh SLA window for the new desk so the next breach is genuinely later,
    // and mark this breach as handled to keep the sweep idempotent.
    const nextDueAt = this.computeDueAt('URGENT');

    const delegationId = `dlg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    db.prepare(`
      INSERT INTO coordination_delegations (
        id, post_id, situation_id, from_institution_id, from_desk_id,
        to_institution_id, to_desk_id, delegation_type, action_required, reason,
        instructions, status, priority, actor_id, actor_name, actor_role,
        due_at, parent_delegation_id, escalation_level, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'ESCALATION', 'ACTION', ?, NULL, 'PENDING', 'URGENT', ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      delegationId,
      item.post_id || null,
      item.situation_id || null,
      item.institution_id,
      item.desk_id || null,
      item.institution_id,
      target.id,
      input.reason?.trim() || 'SLA breach — escalated to the next supervisory level',
      input.actor.id,
      input.actor.name,
      input.actor.role,
      this.computeDueAt('URGENT'),
      item.delegation_id || null,
      level,
      now,
      now
    );

    db.prepare(`
      UPDATE institutional_inbox_items
      SET desk_id = ?, delegation_id = ?, escalation_level = ?, last_escalated_at = ?,
          due_at = ?, sla_notified_at = ?,
          item_priority = CASE WHEN item_priority IN ('ROUTINE', 'ELEVATED') THEN 'URGENT' ELSE item_priority END,
          updated_at = ?
      WHERE id = ?
    `).run(target.id, delegationId, level, now, nextDueAt, now, now, item.id);

    db.prepare(`
      INSERT OR IGNORE INTO inbox_item_routes (id, inbox_item_id, institution_id, desk_id, routing_role, routed_at)
      VALUES (?, ?, ?, ?, 'PRIMARY', ?)
    `).run(`rt-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`, item.id, item.institution_id, target.id, now);

    const mirrorIds: string[] = [];
    if (item.desk_id) {
      const m = InstitutionalInboxService.createMirrorItem(item.id, item.desk_id);
      if (m) mirrorIds.push(m);
    }

    const notified = NotificationService.notifyInstitution(
      item.institution_id,
      {
        type: 'WORK_ITEM_ESCALATED',
        title: `Escalated to ${target.name}`,
        message: `"${item.title}" was escalated to ${target.name} (level ${level}).`,
        postId: item.post_id || undefined,
        institutionName: target.name
      },
      target.id
    );

    let oversightNotified = 0;
    if (level >= 2) {
      oversightNotified = this.notifyOversight({
        type: 'WORK_ITEM_ESCALATED_OVERSIGHT',
        title: 'Escalation reached platform oversight',
        message: `"${item.title}" has been escalated ${level} levels within ${item.institution_id} without resolution.`,
        postId: item.post_id || undefined
      });
    }

    if (item.post_id) {
      this.recordReportEvent(item.post_id, 'INSTITUTION_ESCALATED', input.actor, {
        delegationId,
        toDeskId: target.id,
        escalationLevel: level,
        reason: input.reason || null
      });
      CitizenNotificationService.notifyEscalated(
        item.post_id,
        item.institution_id,
        `escalated to ${target.name} (level ${level})`
      );
    }

    AuditService.log({
      eventType: 'INBOX_ITEM_ESCALATED',
      userId: input.actor.id,
      actorType: 'INSTITUTION',
      institutionId: item.institution_id,
      targetType: 'INBOX_ITEM',
      targetId: item.id,
      beforeState: { deskId: item.desk_id, escalationLevel: item.escalation_level || 0 },
      afterState: { deskId: target.id, escalationLevel: level },
      reason: input.reason || 'Escalated to next supervisory level',
      metadata: { actorName: input.actor.name, delegationId, notified, oversightNotified }
    });

    OutboxService.enqueueEvent('coordination.escalation.created', 'DELEGATION', delegationId, {
      delegationId,
      institutionId: item.institution_id,
      toDeskId: target.id,
      escalationLevel: level
    });

    return {
      itemId: item.id,
      delegationId,
      toDeskId: target.id,
      toDeskName: target.name,
      escalationLevel: level,
      mirrorIds,
      notifiedOfficers: notified,
      oversightNotified
    };
  }

  // ---------------------------------------------------------------------------
  // SLA MONITORING & ESCALATION SWEEP
  // ---------------------------------------------------------------------------

  /**
   * Sweeps for breached and soon-to-breach SLAs, notifies the responsible desk
   * officers, escalates pending delegations, and returns a structured report.
   * Intended to run periodically (see startCoordinationSlaWorker).
   */
  public static runSlaSweep(): {
    overdueItems: number;
    warningItems: number;
    escalatedDelegations: number;
    ladderEscalations: number;
    notified: number;
  } {
    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    const warningIso = new Date(now + 2 * 60 * 60 * 1000).toISOString();
    let notified = 0;
    let ladderEscalations = 0;

    // 1. Overdue inbox items: notify desk officers, then climb the escalation ladder
    const overdue = db.prepare(`
      SELECT * FROM institutional_inbox_items
      WHERE due_at IS NOT NULL AND due_at < ?
        AND action_state NOT IN ('RESOLVED', 'CITIZEN_FOLLOW_UP')
        AND mirror_of_item_id IS NULL
        AND (sla_notified_at IS NULL OR sla_notified_at < due_at)
      LIMIT 200
    `).all(nowIso) as any[];

    for (const item of overdue) {
      const recipients = NotificationService.resolveInstitutionOfficers(item.institution_id, item.desk_id);
      for (const r of recipients) {
        NotificationService.notify({
          userId: r.user_id,
          type: 'SLA_BREACH',
          title: 'SLA deadline breached',
          message: `Work item "${item.title}" is past its response deadline. Immediate action required.`,
          postId: item.post_id
        });
        notified++;
      }
      db.prepare('UPDATE institutional_inbox_items SET sla_notified_at = ?, updated_at = ? WHERE id = ?')
        .run(nowIso, nowIso, item.id);
      db.prepare('UPDATE institutional_inbox_items SET item_priority = ? WHERE id = ? AND item_priority != ?')
        .run('EMERGENCY', item.id, 'EMERGENCY');

      // Automatic escalation ladder: move breached work up to the next supervisory desk
      try {
        const target = this.resolveEscalationTarget(item.institution_id, item.desk_id);
        if (target && target.id !== item.desk_id) {
          this.escalateInboxItem({
            inboxItemId: item.id,
            reason: 'Automatic escalation: SLA deadline breached',
            actor: { id: 'system', name: 'SLA Monitor', role: 'SYSTEM' }
          });
          ladderEscalations++;
        }
      } catch (err: any) {
        logger.warn(`Automatic escalation failed for item ${item.id}: ${err.message}`);
      }
    }

    // 2. Items approaching SLA: warn the desk once
    const approaching = db.prepare(`
      SELECT * FROM institutional_inbox_items
      WHERE due_at IS NOT NULL AND due_at >= ? AND due_at < ?
        AND action_state NOT IN ('RESOLVED', 'CITIZEN_FOLLOW_UP')
        AND sla_notified_at IS NULL
      LIMIT 200
    `).all(nowIso, warningIso) as any[];

    for (const item of approaching) {
      const recipients = NotificationService.resolveInstitutionOfficers(item.institution_id, item.desk_id);
      for (const r of recipients) {
        NotificationService.notify({
          userId: r.user_id,
          type: 'SLA_WARNING',
          title: 'SLA deadline approaching',
          message: `Work item "${item.title}" is due soon. Please review and act.`,
          postId: item.post_id
        });
        notified++;
      }
      db.prepare('UPDATE institutional_inbox_items SET sla_notified_at = ?, updated_at = ? WHERE id = ?')
        .run(nowIso, nowIso, item.id);
    }

    // 3. Auto-escalate delegations that have sat pending past their due date
    const staleDelegations = db.prepare(`
      SELECT * FROM coordination_delegations
      WHERE status = 'PENDING' AND due_at IS NOT NULL AND due_at < ?
        AND (sla_notified_at IS NULL OR sla_notified_at < due_at)
      LIMIT 100
    `).all(nowIso) as any[];

    let escalatedDelegations = 0;
    for (const d of staleDelegations) {
      const recipients = NotificationService.resolveInstitutionOfficers(d.to_institution_id, d.to_desk_id);
      for (const r of recipients) {
        NotificationService.notify({
          userId: r.user_id,
          type: 'DELEGATION_OVERDUE',
          title: 'Delegation overdue',
          message: `A ${d.delegation_type.toLowerCase()} from ${d.actor_name || 'another institution'} is past its due date and needs a decision.`,
          postId: d.post_id
        });
        notified++;
      }
      db.prepare('UPDATE coordination_delegations SET priority = ?, sla_notified_at = ?, updated_at = ? WHERE id = ?')
        .run('EMERGENCY', nowIso, nowIso, d.id);
      escalatedDelegations++;
    }

    if (overdue.length || approaching.length || staleDelegations.length) {
      AuditService.log({
        eventType: 'SLA_SWEEP',
        actorType: 'SYSTEM',
        targetType: 'SYSTEM',
        targetId: 'sla-sweep',
        afterState: {
          overdueItems: overdue.length,
          warningItems: approaching.length,
          escalatedDelegations,
          ladderEscalations,
          notified
        }
      });
    }

    return {
      overdueItems: overdue.length,
      warningItems: approaching.length,
      escalatedDelegations,
      ladderEscalations,
      notified
    };
  }

  private static slaWorkerTimer: NodeJS.Timeout | null = null;

  public static startCoordinationSlaWorker(intervalMs: number = 15 * 60 * 1000): void {
    if (this.slaWorkerTimer) return;
    this.slaWorkerTimer = setInterval(() => {
      try {
        this.runSlaSweep();
      } catch (err: any) {
        logger.error(`Coordination SLA sweep failed: ${err.message}`);
      }
    }, intervalMs);
    if (typeof this.slaWorkerTimer.unref === 'function') this.slaWorkerTimer.unref();
    logger.info('Coordination SLA escalation worker started.');
  }

  public static stopCoordinationSlaWorker(): void {
    if (this.slaWorkerTimer) {
      clearInterval(this.slaWorkerTimer);
      this.slaWorkerTimer = null;
    }
  }

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  /**
   * Resolves the next supervisory desk for escalation: an explicit desk wins,
   * otherwise the parent desk, otherwise the institution's national desk.
   */
  public static resolveEscalationTarget(institutionId: string, currentDeskId?: string | null, explicitDeskId?: string): any | null {
    if (explicitDeskId) {
      const explicit = db.prepare('SELECT * FROM institution_desks WHERE id = ? AND institution_id = ? AND status = ?')
        .get(explicitDeskId, institutionId, 'ACTIVE') as any;
      if (explicit) return explicit;
    }

    if (currentDeskId) {
      const parent = db.prepare(`
        SELECT p.* FROM institution_desks c
        JOIN institution_desks p ON p.id = c.parent_desk_id
        WHERE c.id = ? AND p.status = 'ACTIVE'
      `).get(currentDeskId) as any;
      if (parent) return parent;
    }

    return db.prepare(`
      SELECT * FROM institution_desks
      WHERE institution_id = ? AND level = 'NATIONAL' AND status = 'ACTIVE'
      ORDER BY created_at ASC LIMIT 1
    `).get(institutionId) as any || null;
  }

  /**
   * Classifies an intra-institution desk move as upward (escalation) or
   * lateral/downward (handoff) using desk hierarchy and level ordering.
   */
  public static resolveHandoffDirection(institutionId: string, fromDeskId: string | null, toDeskId: string): 'UPWARD' | 'LATERAL' | 'DOWNWARD' {
    const rank: Record<string, number> = { NATIONAL: 1, REGIONAL: 2, SPECIALIST: 2, METROPOLITAN: 3, MUNICIPAL: 4, DISTRICT: 5 };
    const to = db.prepare('SELECT * FROM institution_desks WHERE id = ?').get(toDeskId) as any;
    if (!to) return 'LATERAL';
    if (!fromDeskId) return 'LATERAL';

    // Walk ancestors of the target: if we pass through the source, it is downward.
    let cursor: any = to;
    const seen = new Set<string>();
    while (cursor?.parent_desk_id && !seen.has(cursor.parent_desk_id)) {
      seen.add(cursor.parent_desk_id);
      if (cursor.parent_desk_id === fromDeskId) return 'DOWNWARD';
      cursor = db.prepare('SELECT * FROM institution_desks WHERE id = ?').get(cursor.parent_desk_id) as any;
    }

    // Walk ancestors of the source: if we pass through the target, it is upward.
    let up: any = db.prepare('SELECT * FROM institution_desks WHERE id = ?').get(fromDeskId) as any;
    const upSeen = new Set<string>();
    while (up?.parent_desk_id && !upSeen.has(up.parent_desk_id)) {
      upSeen.add(up.parent_desk_id);
      if (up.parent_desk_id === toDeskId) return 'UPWARD';
      up = db.prepare('SELECT * FROM institution_desks WHERE id = ?').get(up.parent_desk_id) as any;
    }

    const from = db.prepare('SELECT * FROM institution_desks WHERE id = ?').get(fromDeskId) as any;
    const fromRank = rank[from?.level] ?? 4;
    const toRank = rank[to.level] ?? 4;
    if (toRank < fromRank) return 'UPWARD';
    if (toRank > fromRank) return 'DOWNWARD';
    return 'LATERAL';
  }

  /**
   * Gathers the facts the shared workflow policy needs to gate a work item's
   * actions: whether the linked report already has an official response or a
   * recorded action, and whether an accountable official is attached.
   */
  private static buildWorkItemFacts(item: any, actor: CoordinationActor): WorkItemFacts {
    let hasResponse = false;
    let hasAction = false;
    if (item?.post_id) {
      hasResponse = Boolean(db.prepare('SELECT 1 FROM institution_responses WHERE post_id = ? LIMIT 1').get(item.post_id));
      hasAction = Boolean(db.prepare('SELECT 1 FROM institution_actions WHERE post_id = ? LIMIT 1').get(item.post_id));
    }
    return {
      actionState: item?.action_state,
      hasResponse,
      hasAction,
      hasOfficer: Boolean(item?.assigned_officer_user_id),
      isMirror: Boolean(item?.mirror_of_item_id),
      isOversight: actor.role === 'ADMIN' || actor.role === 'MODERATOR'
    };
  }

  /**
   * True when the user acts on behalf of the institution through the roster or a desk.
   */
  public static isInstitutionOfficer(institutionId: string, userId: string): boolean {
    const roster = db.prepare(`
      SELECT 1 FROM institution_users WHERE institution_id = ? AND user_id = ? AND COALESCE(status, 'ACTIVE') = 'ACTIVE'
    `).get(institutionId, userId);
    if (roster) return true;
    const desk = db.prepare(`
      SELECT 1 FROM institution_desk_officers WHERE institution_id = ? AND user_id = ? AND status = 'ACTIVE'
    `).get(institutionId, userId);
    if (desk) return true;
    const verified = db.prepare(`
      SELECT 1 FROM institution_verifications WHERE institution_id = ? AND user_id = ? AND verification_status = 'VERIFIED'
    `).get(institutionId, userId);
    return Boolean(verified);
  }

  /**
   * Notifies platform oversight (administrators and moderators) about an event
   * that needs central attention, such as an escalation that reached level 2.
   */
  public static notifyOversight(notification: { type: string; title: string; message: string; postId?: string }): number {
    const overseers = db.prepare(`
      SELECT id FROM users WHERE role IN ('ADMIN', 'MODERATOR') AND COALESCE(is_verified, 0) = 1
    `).all() as any[];
    for (const o of overseers) {
      NotificationService.notify({ userId: o.id, ...notification });
    }
    return overseers.length;
  }

  private static computeDueAt(priority: string): string {
    const minutes = SLA_MINUTES[priority] || SLA_MINUTES.ROUTINE;
    return new Date(Date.now() + minutes * 60 * 1000).toISOString();
  }

  private static mapPriorityToInbox(priority: string): 'ROUTINE' | 'ELEVATED' | 'URGENT' | 'EMERGENCY' {
    if (priority === 'EMERGENCY') return 'EMERGENCY';
    if (priority === 'URGENT') return 'URGENT';
    if (priority === 'ELEVATED') return 'ELEVATED';
    return 'ROUTINE';
  }

  private static recordReportEvent(
    postId: string,
    eventType: string,
    actor: CoordinationActor,
    metadata: Record<string, any>
  ): void {
    const id = `rev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    db.prepare(`
      INSERT INTO report_events (id, report_id, event_type, actor_type, actor_id, institution_id, metadata_json, created_at)
      VALUES (?, ?, ?, 'INSTITUTION', ?, ?, ?, ?)
    `).run(
      id,
      postId,
      eventType,
      actor.id,
      actor.institutionId || null,
      JSON.stringify({ ...metadata, actorName: actor.name, actorRole: actor.role }),
      new Date().toISOString()
    );
  }
}
