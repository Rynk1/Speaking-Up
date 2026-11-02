/**
 * Ghana MMDA reference registry.
 *
 * A curated, region-keyed list of Metropolitan, Municipal and District Assemblies
 * so a national institution can roll out its local desk network in one action and
 * store a stable, GSS-aligned assembly code on each desk. This is a seed-quality
 * subset (the capital and the most-populated districts per region), not the full
 * 261-MMDA register; agencies can add unlisted jurisdictions via the single-desk
 * endpoint. Codes follow the common `<REGION>-<ABBR>` convention used elsewhere in
 * the app and are unique within this registry.
 *
 * Shared by the Express layer and the React console so both agree on the tiers.
 */

export type MmdaTier = 'METROPOLITAN' | 'MUNICIPAL' | 'DISTRICT';

export interface MmdaEntry {
  /** Stable assembly code stored on the desk (`institution_desks.mmda_code`). */
  code: string;
  /** Assembly name as citizens would recognise it. */
  name: string;
  tier: MmdaTier;
}

export const GHANA_MMDA_BY_REGION: Record<string, MmdaEntry[]> = {
  'Greater Accra': [
    { code: 'GAR-AMA', name: 'Accra Metropolitan', tier: 'METROPOLITAN' },
    { code: 'GAR-TMA', name: 'Tema Metropolitan', tier: 'METROPOLITAN' },
    { code: 'GAR-LMA', name: 'Ledzokuku Municipal', tier: 'MUNICIPAL' },
    { code: 'GAR-GEM', name: 'Ga East Municipal', tier: 'MUNICIPAL' },
    { code: 'GAR-GWM', name: 'Ga West Municipal', tier: 'MUNICIPAL' },
    { code: 'GAR-ADM', name: 'Adentan Municipal', tier: 'MUNICIPAL' },
    { code: 'GAR-ASH', name: 'Ashaiman Municipal', tier: 'MUNICIPAL' },
    { code: 'GAR-GSM', name: 'Ga South Municipal', tier: 'MUNICIPAL' }
  ],
  Ashanti: [
    { code: 'ASH-KMA', name: 'Kumasi Metropolitan', tier: 'METROPOLITAN' },
    { code: 'ASH-OMA', name: 'Obuasi Municipal', tier: 'MUNICIPAL' },
    { code: 'ASH-EJM', name: 'Ejisu Municipal', tier: 'MUNICIPAL' },
    { code: 'ASH-BOK', name: 'Bekwai Municipal', tier: 'MUNICIPAL' },
    { code: 'ASH-OFM', name: 'Offinso Municipal', tier: 'MUNICIPAL' }
  ],
  Northern: [
    { code: 'NOR-TMA', name: 'Tamale Metropolitan', tier: 'METROPOLITAN' },
    { code: 'NOR-SVM', name: 'Savelugu Municipal', tier: 'MUNICIPAL' },
    { code: 'NOR-YEM', name: 'Yendi Municipal', tier: 'MUNICIPAL' }
  ],
  Western: [
    { code: 'WES-STMA', name: 'Sekondi-Takoradi Metropolitan', tier: 'METROPOLITAN' },
    { code: 'WES-TKM', name: 'Tarkwa-Nsuaem Municipal', tier: 'MUNICIPAL' },
    { code: 'WES-PRM', name: 'Prestea-Huni Valley Municipal', tier: 'MUNICIPAL' }
  ],
  Central: [
    { code: 'CEN-CMA', name: 'Cape Coast Metropolitan', tier: 'METROPOLITAN' },
    { code: 'CEN-WNM', name: 'Winneba Municipal', tier: 'MUNICIPAL' },
    { code: 'CEN-AGM', name: 'Agona West Municipal', tier: 'MUNICIPAL' }
  ],
  Eastern: [
    { code: 'EAS-NJS', name: 'New Juaben South Municipal', tier: 'MUNICIPAL' },
    { code: 'EAS-BIC', name: 'Birim Central Municipal', tier: 'MUNICIPAL' },
    { code: 'EAS-LMK', name: 'Lower Manya Krobo Municipal', tier: 'MUNICIPAL' }
  ],
  Volta: [
    { code: 'VOL-HMA', name: 'Ho Municipal', tier: 'MUNICIPAL' },
    { code: 'VOL-KMA', name: 'Keta Municipal', tier: 'MUNICIPAL' }
  ],
  'Upper East': [
    { code: 'UPE-BMA', name: 'Bolgatanga Municipal', tier: 'MUNICIPAL' },
    { code: 'UPE-KAS', name: 'Kassena-Nankana Municipal', tier: 'MUNICIPAL' }
  ],
  'Upper West': [
    { code: 'UPW-WMA', name: 'Wa Municipal', tier: 'MUNICIPAL' },
    { code: 'UPW-LAW', name: 'Lawra Municipal', tier: 'MUNICIPAL' }
  ],
  Bono: [
    { code: 'BON-SMA', name: 'Sunyani Municipal', tier: 'MUNICIPAL' },
    { code: 'BON-BEM', name: 'Berekum East Municipal', tier: 'MUNICIPAL' }
  ],
  'Bono East': [
    { code: 'BOE-TEM', name: 'Techiman Municipal', tier: 'MUNICIPAL' },
    { code: 'BOE-KIM', name: 'Kintampo Municipal', tier: 'MUNICIPAL' }
  ],
  Ahafo: [
    { code: 'AHF-GOM', name: 'Goaso Municipal', tier: 'MUNICIPAL' },
    { code: 'AHF-DUM', name: 'Duayaw-Nkwanta Municipal', tier: 'MUNICIPAL' }
  ],
  Oti: [
    { code: 'OTI-DAM', name: 'Dambai Municipal', tier: 'MUNICIPAL' },
    { code: 'OTI-KRM', name: 'Krachi East Municipal', tier: 'MUNICIPAL' }
  ],
  Savannah: [
    { code: 'SAV-DAM', name: 'Damongo Municipal', tier: 'MUNICIPAL' },
    { code: 'SAV-BOL', name: 'Bole Municipal', tier: 'MUNICIPAL' }
  ],
  'North East': [
    { code: 'NOR-NAL', name: 'Nalerigu Municipal', tier: 'MUNICIPAL' },
    { code: 'NOR-CHE', name: 'Chereponi Municipal', tier: 'MUNICIPAL' }
  ],
  'Western North': [
    { code: 'WNB-SEW', name: 'Sefwi Wiawso Municipal', tier: 'MUNICIPAL' },
    { code: 'WNB-BIB', name: 'Bibiani-Anhwiaso-Bekwai Municipal', tier: 'MUNICIPAL' }
  ]
};

/** All regions that have a registry entry, in the order defined above. */
export const MMDA_REGIONS: string[] = Object.keys(GHANA_MMDA_BY_REGION);

export function listMmdasForRegion(region: string): MmdaEntry[] {
  return GHANA_MMDA_BY_REGION[region] || [];
}

/** Resolves an assembly by code (case-insensitive) across all regions. */
export function findMmdaByCode(code: string): (MmdaEntry & { region: string }) | null {
  const needle = code.trim().toLowerCase();
  for (const [region, entries] of Object.entries(GHANA_MMDA_BY_REGION)) {
    const match = entries.find((e) => e.code.toLowerCase() === needle);
    if (match) return { ...match, region };
  }
  return null;
}
