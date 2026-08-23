import { db } from '../database/db';

export interface InstitutionCandidate {
  id: string;
  officialName: string;
  acronym: string;
  shortName: string;
  category: string;
  jurisdiction: string;
  matchType: 'EXACT_CATEGORY' | 'JURISDICTION_MATCH' | 'USER_TAGGED';
}

export class InstitutionRoutingService {
  /**
   * Resolves responsible institutions based on issue category, region, and district
   */
  static resolveResponsibleInstitutions(
    category: string,
    region?: string,
    district?: string
  ): InstitutionCandidate[] {
    const candidates: InstitutionCandidate[] = [];

    // Query institutions matching category or mandate
    const rows = db.prepare('SELECT * FROM institutions').all() as any[];

    for (const inst of rows) {
      const instCategory = inst.category || '';
      const instMandate = inst.mandate || '';

      let isCategoryMatch = false;

      if (
        category === instCategory ||
        instMandate.toLowerCase().includes(category.toLowerCase())
      ) {
        isCategoryMatch = true;
      }

      // Map common categories
      if (
        (category.includes('Power') || category.includes('Electricity')) &&
        (inst.acronym === 'ECG' || inst.acronym === 'NEDCo')
      ) {
        isCategoryMatch = true;
      } else if (
        (category.includes('Water') || category.includes('Sanitation')) &&
        (inst.acronym === 'GWCL' || inst.acronym === 'MSWR')
      ) {
        isCategoryMatch = true;
      } else if (
        (category.includes('Road') || category.includes('Traffic') || category.includes('Flood')) &&
        (inst.acronym === 'GHA' || inst.acronym === 'DUR' || inst.acronym === 'GPS' || inst.acronym === 'NADMO')
      ) {
        isCategoryMatch = true;
      } else if (
        category.includes('Security') &&
        (inst.acronym === 'GPS' || inst.acronym === 'GAF')
      ) {
        isCategoryMatch = true;
      }

      if (isCategoryMatch) {
        candidates.push({
          id: inst.id,
          officialName: inst.official_name,
          acronym: inst.acronym,
          shortName: inst.short_name,
          category: inst.category,
          jurisdiction: inst.jurisdiction,
          matchType: 'EXACT_CATEGORY'
        });
      }
    }

    return candidates;
  }
}
