import { db } from '../database/db';

export interface InstitutionCandidate {
  id: string;
  officialName: string;
  shortName: string;
  acronym: string;
  category: string;
  jurisdiction: string;
  scope: string;
  tier: 'PRIMARY' | 'SECONDARY' | 'SAFETY' | 'INFRASTRUCTURE';
  matchReason: string;
  alertMethod: string;
}

export class InstitutionRoutingService {
  /**
   * Resolves responsible institutions dynamically based on category, region, district, title, and content
   */
  static resolveResponsibleInstitutions(
    category: string,
    region?: string,
    district?: string,
    title?: string,
    content?: string
  ): InstitutionCandidate[] {
    const candidates: InstitutionCandidate[] = [];
    const textToMatch = `${category} ${title || ''} ${content || ''}`.toLowerCase();

    const rows = db.prepare('SELECT * FROM institutions').all() as any[];

    for (const inst of rows) {
      const acronym = (inst.acronym || '').toUpperCase();
      const shortName = (inst.short_name || '').toLowerCase();
      const mandate = (inst.mandate || '').toLowerCase();
      const instCategory = (inst.category || '').toLowerCase();

      let tier: 'PRIMARY' | 'SECONDARY' | 'SAFETY' | 'INFRASTRUCTURE' | null = null;
      let matchReason = '';

      // Match logic per category domain
      if (textToMatch.includes('flood') || textToMatch.includes('disaster') || textToMatch.includes('drain')) {
        if (acronym === 'NADMO') {
          tier = 'PRIMARY';
          matchReason = 'National Disaster Management Mandate';
        } else if (acronym === 'AMA' || acronym === 'KMA' || inst.category === 'LOCAL_GOVERNMENT' || acronym.endsWith('MA') || acronym.endsWith('DA')) {
          tier = 'SECONDARY';
          matchReason = 'Metropolitan/Municipal Local Assembly Jurisdiction';
        } else if (acronym === 'GPS' || acronym === 'GNFS') {
          tier = 'SAFETY';
          matchReason = 'Emergency Rescue & Life Safety Service';
        } else if (acronym === 'GHA' || acronym === 'DUR') {
          tier = 'INFRASTRUCTURE';
          matchReason = 'Highways & Urban Roads Engineering';
        }
      } else if (textToMatch.includes('road') || textToMatch.includes('bridge') || textToMatch.includes('pothole') || textToMatch.includes('traffic')) {
        if (acronym === 'GHA' || acronym === 'DUR' || acronym === 'MRH') {
          tier = 'PRIMARY';
          matchReason = 'Road Infrastructure & Highways Authority Mandate';
        } else if (acronym === 'GPS' || acronym === 'MTTD') {
          tier = 'SAFETY';
          matchReason = 'Traffic Safety & Law Enforcement';
        } else if (inst.category === 'LOCAL_GOVERNMENT' || acronym.endsWith('MA')) {
          tier = 'SECONDARY';
          matchReason = 'Local Feeder Roads & Assembly Oversight';
        }
      } else if (textToMatch.includes('power') || textToMatch.includes('electricity') || textToMatch.includes('dumsor') || textToMatch.includes('transformer')) {
        if (acronym === 'ECG' || acronym === 'NEDCO' || acronym === 'VRA' || acronym === 'GRIDCO') {
          tier = 'PRIMARY';
          matchReason = 'Primary Electricity Distribution Utility';
        } else if (acronym === 'PURC') {
          tier = 'SECONDARY';
          matchReason = 'Public Utilities Regulatory Commission';
        }
      } else if (textToMatch.includes('water') || textToMatch.includes('pipe') || textToMatch.includes('leak') || textToMatch.includes('sewage')) {
        if (acronym === 'GWCL' || acronym === 'CWSA') {
          tier = 'PRIMARY';
          matchReason = 'Urban & Rural Water Supply Mandate';
        } else if (acronym === 'MSWR' || acronym === 'PURC') {
          tier = 'SECONDARY';
          matchReason = 'Water & Sanitation Ministry Oversight';
        }
      } else if (textToMatch.includes('cyber') || textToMatch.includes('online') || textToMatch.includes('scam') || textToMatch.includes('fraud')) {
        if (acronym === 'CSA' || shortName.includes('cyber')) {
          tier = 'PRIMARY';
          matchReason = 'Cyber Security Authority Incident Hotline';
        } else if (acronym === 'GPS') {
          tier = 'SAFETY';
          matchReason = 'Ghana Police Cybercrime Unit';
        }
      } else if (textToMatch.includes('security') || textToMatch.includes('crime') || textToMatch.includes('robbery') || textToMatch.includes('attack')) {
        if (acronym === 'GPS') {
          tier = 'PRIMARY';
          matchReason = 'Ghana Police Service Security & Protection Mandate';
        } else if (acronym === 'GAF') {
          tier = 'SAFETY';
          matchReason = 'National Defence & Armed Forces';
        }
      } else if (textToMatch.includes('health') || textToMatch.includes('hospital') || textToMatch.includes('clinic') || textToMatch.includes('ambulance')) {
        if (acronym === 'GHS' || acronym === 'MOH') {
          tier = 'PRIMARY';
          matchReason = 'Ghana Health Service Public Health Oversight';
        } else if (acronym === 'NAS') {
          tier = 'SAFETY';
          matchReason = 'National Ambulance Service Emergency Medical Dispatch';
        }
      }

      // Fallback matching if tier not assigned yet
      if (!tier) {
        if (instCategory && textToMatch.includes(instCategory)) {
          tier = 'PRIMARY';
          matchReason = `Category Match: ${inst.category}`;
        } else if (mandate && (mandate.includes(category.toLowerCase()) || textToMatch.split(' ').some(w => w.length > 4 && mandate.includes(w)))) {
          tier = 'SECONDARY';
          matchReason = `Mandate Relevance: ${inst.mandate.slice(0, 50)}...`;
        }
      }

      if (tier) {
        candidates.push({
          id: inst.id,
          officialName: inst.official_name,
          shortName: inst.short_name,
          acronym: inst.acronym,
          category: inst.category,
          jurisdiction: inst.jurisdiction,
          scope: inst.scope || 'NATIONAL',
          tier,
          matchReason,
          alertMethod: inst.alert_method || 'OFFICIAL_EMAIL'
        });
      }
    }

    // Sort by Tier priority
    const tierOrder = { PRIMARY: 1, SECONDARY: 2, SAFETY: 3, INFRASTRUCTURE: 4 };
    candidates.sort((a, b) => tierOrder[a.tier] - tierOrder[b.tier]);

    return candidates;
  }
}
