import { db } from '../../database/db';
import { GHANA_MMDA_BY_REGION } from '../../../shared/ghanaMmda';

/**
 * The national supervision picture. A national body does not need another list
 * of open items — it needs to see, per region, how far reports actually travel
 * (the routing funnel), where work is piling up (backlog by desk tier), how much
 * of the country an agency can actually reach (MMDA coverage), and whether the
 * institutions it supervises are accepting or stonewalling delegations.
 *
 * Everything is derived from live tables; nothing is synthesised.
 */
export class CoordinationAnalyticsService {
  /**
   * The routing funnel per region: how many reports reached each stage. Each
   * stage is cumulative (a resolved report also passed through routed), so the
   * shape of the funnel shows exactly where reports stall.
   */
  public static getRoutingFunnel(params: { region?: string } = {}): {
    regions: {
      region: string;
      reported: number;
      routed: number;
      acknowledged: number;
      inReview: number;
      responded: number;
      resolved: number;
      routedRate: number;
      resolvedRate: number;
      medianHoursToAck: number | null;
      medianHoursToResolve: number | null;
    }[];
    totals: Record<string, number>;
  } {
    const regionFilter = params.region ? 'AND p.region = ?' : '';
    const values: any[] = params.region ? [params.region] : [];

    const rows = db.prepare(`
      SELECT p.region AS region,
             COUNT(*) AS reported,
             SUM(CASE WHEN p.owner_institution_id IS NOT NULL THEN 1 ELSE 0 END) AS routed,
             SUM(CASE WHEN p.accountability_status IN
                  ('ACKNOWLEDGED','UNDER_REVIEW','CITIZEN_FOLLOW_UP','RESPONDED','ACTION_IN_PROGRESS','ACTION_REPORTED','RESOLVED','CLOSED','COMMUNITY_CONFIRMED','CITIZEN_CONFIRMED')
                  THEN 1 ELSE 0 END) AS acknowledged,
             SUM(CASE WHEN p.accountability_status IN
                  ('UNDER_REVIEW','RESPONDED','ACTION_IN_PROGRESS','ACTION_REPORTED','RESOLVED','CLOSED','COMMUNITY_CONFIRMED','CITIZEN_CONFIRMED')
                  THEN 1 ELSE 0 END) AS inReview,
             SUM(CASE WHEN p.accountability_status IN
                  ('RESPONDED','ACTION_IN_PROGRESS','ACTION_REPORTED','RESOLVED','CLOSED','COMMUNITY_CONFIRMED','CITIZEN_CONFIRMED')
                  THEN 1 ELSE 0 END) AS responded,
             SUM(CASE WHEN p.accountability_status IN
                  ('RESOLVED','CLOSED','COMMUNITY_CONFIRMED','CITIZEN_CONFIRMED')
                  THEN 1 ELSE 0 END) AS resolved
      FROM posts p
      WHERE 1 = 1 ${regionFilter}
      GROUP BY p.region
      ORDER BY reported DESC
    `).all(...values) as any[];

    const latency = this.latencyByRegion(params.region);

    const regions = rows.map((r) => {
      const lat = latency.get(r.region) || { ack: null, resolve: null };
      return {
        region: r.region,
        reported: r.reported,
        routed: r.routed,
        acknowledged: r.acknowledged,
        inReview: r.inReview,
        responded: r.responded,
        resolved: r.resolved,
        routedRate: r.reported ? Number((r.routed / r.reported).toFixed(3)) : 0,
        resolvedRate: r.reported ? Number((r.resolved / r.reported).toFixed(3)) : 0,
        medianHoursToAck: lat.ack,
        medianHoursToResolve: lat.resolve
      };
    });

    const totals = regions.reduce(
      (acc, r) => {
        acc.reported += r.reported;
        acc.routed += r.routed;
        acc.acknowledged += r.acknowledged;
        acc.inReview += r.inReview;
        acc.responded += r.responded;
        acc.resolved += r.resolved;
        return acc;
      },
      { reported: 0, routed: 0, acknowledged: 0, inReview: 0, responded: 0, resolved: 0 }
    );

    return { regions, totals };
  }

  /**
   * Median hours from report creation to the first timeline event marking
   * acknowledgement and resolution, per region. One pass over report_events, so
   * the whole funnel costs a single extra query rather than one per region.
   */
  private static latencyByRegion(region?: string): Map<string, { ack: number | null; resolve: number | null }> {
    const regionFilter = region ? 'AND p.region = ?' : '';
    const values: any[] = region ? [region] : [];

    const rows = db.prepare(`
      SELECT p.region AS region, p.id AS post_id, p.created_at AS created_at,
             e.event_type AS event_type, MIN(e.created_at) AS reached_at
      FROM posts p
      JOIN report_events e ON e.report_id = p.id
      WHERE (e.event_type LIKE '%ACKNOWLEDGED%' OR e.event_type LIKE '%RESOLVED%')
        ${regionFilter}
      GROUP BY p.id, e.event_type
    `).all(...values) as any[];

    const ackByRegion = new Map<string, number[]>();
    const resolveByRegion = new Map<string, number[]>();

    for (const row of rows) {
      const start = new Date(row.created_at).getTime();
      const end = new Date(row.reached_at).getTime();
      if (Number.isNaN(start) || Number.isNaN(end) || end < start) continue;
      const hours = (end - start) / 3_600_000;
      const bucket = row.event_type.includes('RESOLVED') ? resolveByRegion : ackByRegion;
      if (!bucket.has(row.region)) bucket.set(row.region, []);
      bucket.get(row.region)!.push(hours);
    }

    const out = new Map<string, { ack: number | null; resolve: number | null }>();
    const allRegions = new Set([...ackByRegion.keys(), ...resolveByRegion.keys()]);
    for (const r of allRegions) {
      out.set(r, {
        ack: this.median(ackByRegion.get(r) || []),
        resolve: this.median(resolveByRegion.get(r) || [])
      });
    }
    return out;
  }

  /** Open work sitting on desks, grouped by desk tier, with SLA breach counts. */
  public static getBacklogByTier(): {
    tiers: { level: string; openItems: number; breached: number; unassigned: number; desks: number }[];
    totalOpen: number;
    totalBreached: number;
  } {
    const nowIso = new Date().toISOString();
    const rows = db.prepare(`
      SELECT COALESCE(d.level, 'UNROUTED') AS level,
             COUNT(*) AS openItems,
             SUM(CASE WHEN i.due_at IS NOT NULL AND i.due_at < ? THEN 1 ELSE 0 END) AS breached,
             SUM(CASE WHEN i.assigned_officer_user_id IS NULL THEN 1 ELSE 0 END) AS unassigned,
             COUNT(DISTINCT i.desk_id) AS desks
      FROM institutional_inbox_items i
      LEFT JOIN institution_desks d ON d.id = i.desk_id
      WHERE i.action_state NOT IN ('RESOLVED', 'CITIZEN_FOLLOW_UP')
        AND i.mirror_of_item_id IS NULL
      GROUP BY COALESCE(d.level, 'UNROUTED')
    `).all(nowIso) as any[];

    const order = ['NATIONAL', 'REGIONAL', 'METROPOLITAN', 'MUNICIPAL', 'DISTRICT', 'SPECIALIST', 'UNROUTED'];
    const tiers = rows
      .map((r) => ({ ...r }))
      .sort((a, b) => order.indexOf(a.level) - order.indexOf(b.level));

    return {
      tiers,
      totalOpen: tiers.reduce((s, t) => s + t.openItems, 0),
      totalBreached: tiers.reduce((s, t) => s + t.breached, 0)
    };
  }

  /**
   * Coverage heat: for one institution (or all), how many MMDAs in each region
   * have a local desk, versus the full 261-assembly register. This is what tells
   * a national desk where its presence is thin.
   */
  public static getCoverageHeat(institutionId?: string): {
    regions: { region: string; total: number; covered: number; onCall: number; coverageRate: number }[];
    totals: { total: number; covered: number; coverageRate: number };
  } {
    const deskFilter = institutionId ? 'AND institution_id = ?' : '';
    const values: any[] = institutionId ? [institutionId] : [];

    const deskRows = db.prepare(`
      SELECT region,
             COUNT(DISTINCT mmda_code) AS covered,
             SUM(CASE WHEN coverage_mode = 'ON_CALL' THEN 1 ELSE 0 END) AS onCall
      FROM institution_desks
      WHERE status = 'ACTIVE' AND mmda_code IS NOT NULL ${deskFilter}
      GROUP BY region
    `).all(...values) as any[];

    const coveredByRegion = new Map<string, { covered: number; onCall: number }>();
    for (const row of deskRows) {
      coveredByRegion.set(row.region, { covered: row.covered || 0, onCall: row.onCall || 0 });
    }

    const regions = Object.entries(GHANA_MMDA_BY_REGION).map(([region, entries]) => {
      const stats = coveredByRegion.get(region) || { covered: 0, onCall: 0 };
      const total = entries.length;
      return {
        region,
        total,
        covered: stats.covered,
        onCall: stats.onCall,
        coverageRate: total ? Number((stats.covered / total).toFixed(3)) : 0
      };
    }).sort((a, b) => a.coverageRate - b.coverageRate);

    const total = regions.reduce((s, r) => s + r.total, 0);
    const covered = regions.reduce((s, r) => s + r.covered, 0);
    return {
      regions,
      totals: { total, covered, coverageRate: total ? Number((covered / total).toFixed(3)) : 0 }
    };
  }

  /**
   * Delegation health: acceptance, decline and completion rates, plus how many
   * are sitting unanswered past their deadline. A low acceptance rate is a
   * supervision signal that the receiving institution is not engaging.
   */
  public static getDelegationHealth(params: { institutionId?: string } = {}): {
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    acceptanceRate: number;
    declineRate: number;
    completionRate: number;
    overduePending: number;
    avgHoursToDecision: number | null;
    topReceivers: { institutionId: string; institutionName: string; received: number; pending: number; declined: number }[];
  } {
    const instFilter = params.institutionId ? 'WHERE (to_institution_id = ? OR from_institution_id = ?)' : '';
    const values: any[] = params.institutionId ? [params.institutionId, params.institutionId] : [];

    const rows = db.prepare(`
      SELECT * FROM coordination_delegations ${instFilter}
    `).all(...values) as any[];

    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};
    let decided = 0;
    let decidedHoursTotal = 0;
    let decidedCount = 0;

    const now = Date.now();
    let overduePending = 0;

    for (const d of rows) {
      byStatus[d.status] = (byStatus[d.status] || 0) + 1;
      byType[d.delegation_type] = (byType[d.delegation_type] || 0) + 1;
      if (d.status !== 'PENDING' && d.accepted_at) {
        const start = new Date(d.created_at).getTime();
        const end = new Date(d.accepted_at).getTime();
        if (!Number.isNaN(start) && !Number.isNaN(end) && end >= start) {
          decidedHoursTotal += (end - start) / 3_600_000;
          decidedCount++;
        }
      }
      if (d.status !== 'PENDING') decided++;
      if (d.status === 'PENDING' && d.due_at && new Date(d.due_at).getTime() < now) overduePending++;
    }

    const total = rows.length;
    const topReceivers = db.prepare(`
      SELECT d.to_institution_id AS institutionId,
             i.official_name AS institutionName,
             COUNT(*) AS received,
             SUM(CASE WHEN d.status = 'PENDING' THEN 1 ELSE 0 END) AS pending,
             SUM(CASE WHEN d.status = 'DECLINED' THEN 1 ELSE 0 END) AS declined
      FROM coordination_delegations d
      LEFT JOIN institutions i ON i.id = d.to_institution_id
      ${params.institutionId ? 'WHERE d.to_institution_id = ?' : ''}
      GROUP BY d.to_institution_id
      ORDER BY received DESC
      LIMIT 20
    `).all(...(params.institutionId ? [params.institutionId] : [])) as any[];

    return {
      total,
      byStatus,
      byType,
      acceptanceRate: total ? Number(((byStatus.ACCEPTED || 0) / total).toFixed(3)) : 0,
      declineRate: total ? Number(((byStatus.DECLINED || 0) / total).toFixed(3)) : 0,
      completionRate: total ? Number(((byStatus.COMPLETED || 0) / total).toFixed(3)) : 0,
      overduePending,
      avgHoursToDecision: decidedCount ? Number((decidedHoursTotal / decidedCount).toFixed(1)) : null,
      topReceivers
    };
  }

  /**
   * A compact national roll-up for the admin overview: the headline funnel plus
   * the worst coverage region and the delegation acceptance rate, so oversight
   * can see the whole coordination posture at a glance.
   */
  public static getNationalSummary(): {
    funnel: Record<string, number>;
    backlog: { totalOpen: number; totalBreached: number };
    coverage: { total: number; covered: number; coverageRate: number };
    delegations: { total: number; acceptanceRate: number; overduePending: number };
    worstCoverageRegions: { region: string; covered: number; total: number; coverageRate: number }[];
  } {
    const funnel = this.getRoutingFunnel();
    const backlog = this.getBacklogByTier();
    const coverage = this.getCoverageHeat();
    const delegations = this.getDelegationHealth();

    return {
      funnel: funnel.totals,
      backlog: { totalOpen: backlog.totalOpen, totalBreached: backlog.totalBreached },
      coverage: coverage.totals,
      delegations: {
        total: delegations.total,
        acceptanceRate: delegations.acceptanceRate,
        overduePending: delegations.overduePending
      },
      worstCoverageRegions: coverage.regions.slice(0, 5)
    };
  }

  private static median(values: number[]): number | null {
    if (values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const value = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    return Number(value.toFixed(1));
  }
}
