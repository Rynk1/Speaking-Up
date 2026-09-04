import { db } from '../../database/db';
import { logger } from '../../shared/logger';

export type DeskLevel = 'NATIONAL_DESK' | 'REGIONAL_DESK' | 'DISTRICT_DESK' | 'SPECIALIST_DESK';

export interface InstitutionProfile {
  id: string;
  officialName: string;
  shortName: string;
  acronym: string;
  mandate: string;
  category: string;
  jurisdiction: string;
  deskLevel: DeskLevel;
  parentInstitutionId?: string;
  nationalLevel?: string;
  regionalLevel?: string;
  districtLevel?: string;
  jurisdictions: string[];
  specialistDomains: string[];
  notificationPolicy: {
    routine: string[];
    high: string[];
    urgent: string[];
  };
  verifiedStatus: string;
  verificationDate?: string;
  activeMentionsCount: number;
  officialResponsesCount: number;
  avgResponseHours: number;
}

export class InstitutionRegistryService {
  /**
   * Retrieves all verified institutions with hierarchical metadata
   */
  public static getAllInstitutions(): InstitutionProfile[] {
    const rows = db.prepare(`
      SELECT * FROM institutions
      ORDER BY official_name ASC
    `).all() as any[];

    return rows.map(r => this.mapRowToProfile(r));
  }

  /**
   * Finds an institution by ID
   */
  public static getById(id: string): InstitutionProfile | null {
    const row = db.prepare('SELECT * FROM institutions WHERE id = ?').get(id) as any;
    if (!row) return null;
    return this.mapRowToProfile(row);
  }

  /**
   * Routes an issue across National, Regional, District, and Specialist desks
   */
  public static routeIssueDesks(category: string, region: string, district?: string): {
    primaryInstitution: any;
    regionalDesk?: any;
    districtDesk?: any;
    specialistDesks: any[];
  } {
    // 1. Find primary national or specialist institution matching category
    const categoryMatches = db.prepare(`
      SELECT * FROM institutions
      WHERE category = ? OR official_name LIKE ?
      ORDER BY CASE WHEN jurisdiction = 'NATIONAL' THEN 1 ELSE 2 END
      LIMIT 3
    `).all(category, `%${category.split('&')[0].trim()}%`) as any[];

    const primaryInstitution = categoryMatches[0] || db.prepare('SELECT * FROM institutions LIMIT 1').get() as any;

    // 2. Identify regional administrative desk if exists
    let regionalDesk: any = null;
    if (region) {
      regionalDesk = db.prepare(`
        SELECT * FROM institutions
        WHERE regional_level = ? OR official_name LIKE ?
        LIMIT 1
      `).get(region, `%${region}%`) as any;
    }

    // 3. Identify district municipal assembly desk if exists
    let districtDesk: any = null;
    if (district) {
      districtDesk = db.prepare(`
        SELECT * FROM institutions
        WHERE district_level = ? OR official_name LIKE ?
        LIMIT 1
      `).get(district, `%${district}%`) as any;
    }

    // 4. Specialist desks
    const specialistDesks = categoryMatches.slice(1);

    return {
      primaryInstitution: primaryInstitution ? this.mapRowToProfile(primaryInstitution) : null,
      regionalDesk: regionalDesk ? this.mapRowToProfile(regionalDesk) : undefined,
      districtDesk: districtDesk ? this.mapRowToProfile(districtDesk) : undefined,
      specialistDesks: specialistDesks.map(s => this.mapRowToProfile(s))
    };
  }

  /**
   * Retrieves team members and RBAC roles for an institution
   */
  public static getTeamMembers(institutionId: string): any[] {
    return db.prepare(`
      SELECT iu.id, iu.user_id, iu.role, iu.department, iu.regional_scope, iu.district_scope,
             u.name, u.email, u.handle, u.avatar, iu.created_at
      FROM institution_users iu
      JOIN users u ON u.id = iu.user_id
      WHERE iu.institution_id = ?
      ORDER BY iu.created_at ASC
    `).all(institutionId) as any[];
  }

  /**
   * Maps database row to structured profile object
   */
  private static mapRowToProfile(row: any): InstitutionProfile {
    let jurisdictions: string[] = [];
    let specialistDomains: string[] = [];
    let notificationPolicy = {
      routine: ['IN_APP', 'EMAIL'],
      high: ['IN_APP', 'PUSH', 'EMAIL'],
      urgent: ['IN_APP', 'PUSH', 'SMS']
    };

    try {
      jurisdictions = JSON.parse(row.jurisdictions_json || '[]');
    } catch {}

    try {
      specialistDomains = JSON.parse(row.specialist_domains_json || '[]');
    } catch {}

    try {
      if (row.notification_policy_json) {
        notificationPolicy = JSON.parse(row.notification_policy_json);
      }
    } catch {}

    return {
      id: row.id,
      officialName: row.official_name,
      shortName: row.short_name,
      acronym: row.acronym,
      mandate: row.mandate,
      category: row.category,
      jurisdiction: row.jurisdiction || 'NATIONAL',
      deskLevel: (row.desk_level as DeskLevel) || 'NATIONAL_DESK',
      parentInstitutionId: row.parent_institution_id || undefined,
      nationalLevel: row.national_level || 'NATIONAL',
      regionalLevel: row.regional_level || undefined,
      districtLevel: row.district_level || undefined,
      jurisdictions,
      specialistDomains,
      notificationPolicy,
      verifiedStatus: row.verification_status || 'VERIFIED',
      verificationDate: row.verification_date,
      activeMentionsCount: row.active_mentions_count || 0,
      officialResponsesCount: row.official_responses_count || 0,
      avgResponseHours: row.avg_response_hours || 4.0
    };
  }
}
