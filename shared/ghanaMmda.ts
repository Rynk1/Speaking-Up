/**
 * Ghana MMDA reference registry.
 *
 * The complete register of all 261 Metropolitan, Municipal and District
 * Assemblies, grouped by the 16 administrative regions, so a national
 * institution can roll out its local desk network in one action and store a
 * stable code on each desk. Per-region membership and totals follow the
 * published district register, and the 13 metropolitan assemblies are the six
 * original metros plus the seven upgraded in 2024 (Sunyani, Techiman, Gomoa
 * East, Kpone-Katamanso, New Juaben South, Wa, Ho).
 *
 * Tier labels for the remaining assemblies follow the source register and may
 * differ from the latest Local Government Service designation for a handful of
 * assemblies; treat `tier` as a display hint, not a legal status. Codes are the
 * app's `<REGION>-<ABBR>` convention and are unique within this registry.
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
  'Ahafo': [
    { code: 'AHF-ASU', name: 'Asunafo North Municipal', tier: 'MUNICIPAL' },
    { code: 'AHF-ASU2', name: 'Asunafo South District', tier: 'DISTRICT' },
    { code: 'AHF-ASU3', name: 'Asutifi North District', tier: 'DISTRICT' },
    { code: 'AHF-ASU4', name: 'Asutifi South District', tier: 'DISTRICT' },
    { code: 'AHF-TAN', name: 'Tano North Municipal', tier: 'MUNICIPAL' },
    { code: 'AHF-TAN2', name: 'Tano South Municipal', tier: 'MUNICIPAL' }
  ],
  'Ashanti': [
    { code: 'ASH-ADA', name: 'Adansi Asokwa District', tier: 'DISTRICT' },
    { code: 'ASH-ADA2', name: 'Adansi North District', tier: 'DISTRICT' },
    { code: 'ASH-ADA3', name: 'Adansi South District', tier: 'DISTRICT' },
    { code: 'ASH-AFI', name: 'Afigya-Kwabre North District', tier: 'DISTRICT' },
    { code: 'ASH-AFI2', name: 'Afigya-Kwabre South District', tier: 'DISTRICT' },
    { code: 'ASH-AHA', name: 'Ahafo-Ano North Municipal', tier: 'MUNICIPAL' },
    { code: 'ASH-AHA2', name: 'Ahafo-Ano South East District', tier: 'DISTRICT' },
    { code: 'ASH-AHA3', name: 'Ahafo-Ano South West District', tier: 'DISTRICT' },
    { code: 'ASH-AKR', name: 'Akrofuom District', tier: 'DISTRICT' },
    { code: 'ASH-AMA', name: 'Amansie Central District', tier: 'DISTRICT' },
    { code: 'ASH-AMA2', name: 'Amansie West District', tier: 'DISTRICT' },
    { code: 'ASH-AMA3', name: 'Amansie South District', tier: 'DISTRICT' },
    { code: 'ASH-ASA', name: 'Asante-Akim Central Municipal', tier: 'MUNICIPAL' },
    { code: 'ASH-ASA2', name: 'Asante-Akim North District', tier: 'DISTRICT' },
    { code: 'ASH-ASA3', name: 'Asante-Akim South Municipal', tier: 'MUNICIPAL' },
    { code: 'ASH-ASO', name: 'Asokore-Mampong Municipal', tier: 'MUNICIPAL' },
    { code: 'ASH-ASO2', name: 'Asokwa Municipal', tier: 'MUNICIPAL' },
    { code: 'ASH-ATW', name: 'Atwima-Kwanwoma District', tier: 'DISTRICT' },
    { code: 'ASH-ATW2', name: 'Atwima-Mponua District', tier: 'DISTRICT' },
    { code: 'ASH-ATW3', name: 'Atwima-Nwabiagya Municipal', tier: 'MUNICIPAL' },
    { code: 'ASH-ATW4', name: 'Atwima-Nwabiagya North District', tier: 'DISTRICT' },
    { code: 'ASH-BOK', name: 'Bekwai Municipal', tier: 'MUNICIPAL' },
    { code: 'ASH-BOS', name: 'Bosome Freho District', tier: 'DISTRICT' },
    { code: 'ASH-BOS2', name: 'Bosomtwe District', tier: 'DISTRICT' },
    { code: 'ASH-EJI', name: 'Ejisu Municipal', tier: 'MUNICIPAL' },
    { code: 'ASH-EJU', name: 'Ejura Sekyedumase Municipal', tier: 'MUNICIPAL' },
    { code: 'ASH-JUA', name: 'Juaben Municipal', tier: 'MUNICIPAL' },
    { code: 'ASH-KMA', name: 'Kumasi Metropolitan', tier: 'METROPOLITAN' },
    { code: 'ASH-KWA', name: 'Kwabre East Municipal', tier: 'MUNICIPAL' },
    { code: 'ASH-KWA2', name: 'Kwadaso Municipal', tier: 'MUNICIPAL' },
    { code: 'ASH-MAM', name: 'Mampong Municipal', tier: 'MUNICIPAL' },
    { code: 'ASH-OBU', name: 'Obuasi East Municipal', tier: 'MUNICIPAL' },
    { code: 'ASH-OMA', name: 'Obuasi Municipal', tier: 'MUNICIPAL' },
    { code: 'ASH-OFF', name: 'Offinso Municipal', tier: 'MUNICIPAL' },
    { code: 'ASH-OFF2', name: 'Offinso North District', tier: 'DISTRICT' },
    { code: 'ASH-OFO', name: 'Oforikrom Municipal', tier: 'MUNICIPAL' },
    { code: 'ASH-OLD', name: 'Old Tafo Municipal', tier: 'MUNICIPAL' },
    { code: 'ASH-SEK', name: 'Sekyere Afram Plains District', tier: 'DISTRICT' },
    { code: 'ASH-SEK2', name: 'Sekyere Central District', tier: 'DISTRICT' },
    { code: 'ASH-SEK3', name: 'Sekyere East District', tier: 'DISTRICT' },
    { code: 'ASH-SEK4', name: 'Sekyere Kumawu District', tier: 'DISTRICT' },
    { code: 'ASH-SEK5', name: 'Sekyere South District', tier: 'DISTRICT' },
    { code: 'ASH-SUA', name: 'Suame Municipal', tier: 'MUNICIPAL' }
  ],
  'Bono': [
    { code: 'BON-BAN', name: 'Banda District', tier: 'DISTRICT' },
    { code: 'BON-BER', name: 'Berekum East Municipal', tier: 'MUNICIPAL' },
    { code: 'BON-BER2', name: 'Berekum West District', tier: 'DISTRICT' },
    { code: 'BON-DOR', name: 'Dormaa Central Municipal', tier: 'MUNICIPAL' },
    { code: 'BON-DOR2', name: 'Dormaa East District', tier: 'DISTRICT' },
    { code: 'BON-DOR3', name: 'Dormaa West District', tier: 'DISTRICT' },
    { code: 'BON-JAM', name: 'Jaman North District', tier: 'DISTRICT' },
    { code: 'BON-JAM2', name: 'Jaman South Municipal', tier: 'MUNICIPAL' },
    { code: 'BON-SUN', name: 'Sunyani Metropolitan', tier: 'METROPOLITAN' },
    { code: 'BON-SUN2', name: 'Sunyani West District', tier: 'DISTRICT' },
    { code: 'BON-TAI', name: 'Tain District', tier: 'DISTRICT' },
    { code: 'BON-WEN', name: 'Wenchi Municipal', tier: 'MUNICIPAL' }
  ],
  'Bono East': [
    { code: 'BOE-ATE', name: 'Atebubu-Amantin Municipal', tier: 'MUNICIPAL' },
    { code: 'BOE-KIN', name: 'Kintampo North Municipal', tier: 'MUNICIPAL' },
    { code: 'BOE-KIN2', name: 'Kintampo South District', tier: 'DISTRICT' },
    { code: 'BOE-NKO', name: 'Nkoranza North District', tier: 'DISTRICT' },
    { code: 'BOE-NKO2', name: 'Nkoranza South Municipal', tier: 'MUNICIPAL' },
    { code: 'BOE-PRU', name: 'Pru East District', tier: 'DISTRICT' },
    { code: 'BOE-PRU2', name: 'Pru West District', tier: 'DISTRICT' },
    { code: 'BOE-SEN', name: 'Sene East District', tier: 'DISTRICT' },
    { code: 'BOE-SEN2', name: 'Sene West District', tier: 'DISTRICT' },
    { code: 'BOE-TEC', name: 'Techiman Metropolitan', tier: 'METROPOLITAN' },
    { code: 'BOE-TEC2', name: 'Techiman North District', tier: 'DISTRICT' }
  ],
  'Central': [
    { code: 'CEN-ABU', name: 'Abura Asebu Kwamankese District', tier: 'DISTRICT' },
    { code: 'CEN-AGO', name: 'Agona East District', tier: 'DISTRICT' },
    { code: 'CEN-AGO2', name: 'Agona West Municipal', tier: 'MUNICIPAL' },
    { code: 'CEN-AJU', name: 'Ajumako Enyan Essiam District', tier: 'DISTRICT' },
    { code: 'CEN-ASI', name: 'Asikuma Odoben Brakwa District', tier: 'DISTRICT' },
    { code: 'CEN-ASS', name: 'Assin Central Municipal', tier: 'MUNICIPAL' },
    { code: 'CEN-ASS2', name: 'Assin North District', tier: 'DISTRICT' },
    { code: 'CEN-ASS3', name: 'Assin South District', tier: 'DISTRICT' },
    { code: 'CEN-AWU', name: 'Awutu Senya East Municipal', tier: 'MUNICIPAL' },
    { code: 'CEN-AWU2', name: 'Awutu Senya West District', tier: 'DISTRICT' },
    { code: 'CEN-CAP', name: 'Cape Coast Metropolitan', tier: 'METROPOLITAN' },
    { code: 'CEN-EFF', name: 'Effutu Municipal', tier: 'MUNICIPAL' },
    { code: 'CEN-EKU', name: 'Ekumfi District', tier: 'DISTRICT' },
    { code: 'CEN-GOM', name: 'Gomoa East Metropolitan', tier: 'METROPOLITAN' },
    { code: 'CEN-GOM2', name: 'Gomoa Central District', tier: 'DISTRICT' },
    { code: 'CEN-GOM3', name: 'Gomoa West District', tier: 'DISTRICT' },
    { code: 'CEN-KOM', name: 'Komenda Edina Eguafo Abirem Municipal', tier: 'MUNICIPAL' },
    { code: 'CEN-MFA', name: 'Mfantsiman Municipal', tier: 'MUNICIPAL' },
    { code: 'CEN-TWI', name: 'Twifo Atti Morkwa District', tier: 'DISTRICT' },
    { code: 'CEN-TWI2', name: 'Twifo Hemang Lower Denkyira District', tier: 'DISTRICT' },
    { code: 'CEN-UPP', name: 'Upper Denkyira East Municipal', tier: 'MUNICIPAL' },
    { code: 'CEN-UPP2', name: 'Upper Denkyira West District', tier: 'DISTRICT' }
  ],
  'Eastern': [
    { code: 'EAS-ABU', name: 'Abuakwa North Municipal', tier: 'MUNICIPAL' },
    { code: 'EAS-ABU2', name: 'Abuakwa South Municipal', tier: 'MUNICIPAL' },
    { code: 'EAS-ACH', name: 'Achiase District', tier: 'DISTRICT' },
    { code: 'EAS-AKU', name: 'Akuapim North Municipal', tier: 'MUNICIPAL' },
    { code: 'EAS-AKU2', name: 'Akuapim South District', tier: 'DISTRICT' },
    { code: 'EAS-AKY', name: 'Akyemansa District', tier: 'DISTRICT' },
    { code: 'EAS-ASE', name: 'Asene Manso Akroso District', tier: 'DISTRICT' },
    { code: 'EAS-ASU', name: 'Asuogyaman District', tier: 'DISTRICT' },
    { code: 'EAS-ATI', name: 'Atiwa East District', tier: 'DISTRICT' },
    { code: 'EAS-ATI2', name: 'Atiwa West District', tier: 'DISTRICT' },
    { code: 'EAS-AYE', name: 'Ayensuano District', tier: 'DISTRICT' },
    { code: 'EAS-BIR', name: 'Birim Central Municipal', tier: 'MUNICIPAL' },
    { code: 'EAS-BIR2', name: 'Birim North District', tier: 'DISTRICT' },
    { code: 'EAS-BIR3', name: 'Birim South District', tier: 'DISTRICT' },
    { code: 'EAS-DEN', name: 'Denkyembour District', tier: 'DISTRICT' },
    { code: 'EAS-FAN', name: 'Fanteakwa North District', tier: 'DISTRICT' },
    { code: 'EAS-FAN2', name: 'Fanteakwa South District', tier: 'DISTRICT' },
    { code: 'EAS-KWA', name: 'Kwaebibirem Municipal', tier: 'MUNICIPAL' },
    { code: 'EAS-KWA2', name: 'Kwahu Afram Plains North District', tier: 'DISTRICT' },
    { code: 'EAS-KWA3', name: 'Kwahu Afram Plains South District', tier: 'DISTRICT' },
    { code: 'EAS-KWA4', name: 'Kwahu East District', tier: 'DISTRICT' },
    { code: 'EAS-KWA5', name: 'Kwahu South District', tier: 'DISTRICT' },
    { code: 'EAS-KWA6', name: 'Kwahu West Municipal', tier: 'MUNICIPAL' },
    { code: 'EAS-LOW', name: 'Lower Manya Krobo Municipal', tier: 'MUNICIPAL' },
    { code: 'EAS-NEW', name: 'New Juaben North Municipal', tier: 'MUNICIPAL' },
    { code: 'EAS-NEW2', name: 'New Juaben South Metropolitan', tier: 'METROPOLITAN' },
    { code: 'EAS-NSA', name: 'Nsawam Adoagyire Municipal', tier: 'MUNICIPAL' },
    { code: 'EAS-OKE', name: 'Okere District', tier: 'DISTRICT' },
    { code: 'EAS-SUH', name: 'Suhum Municipal', tier: 'MUNICIPAL' },
    { code: 'EAS-UPP', name: 'Upper Manya Krobo District', tier: 'DISTRICT' },
    { code: 'EAS-UPP2', name: 'Upper West Akim District', tier: 'DISTRICT' },
    { code: 'EAS-WES', name: 'West Akim Municipal', tier: 'MUNICIPAL' },
    { code: 'EAS-YIL', name: 'Yilo-Krobo Municipal', tier: 'MUNICIPAL' }
  ],
  'Greater Accra': [
    { code: 'GAR-ABL', name: 'Ablekuma Central Municipal', tier: 'MUNICIPAL' },
    { code: 'GAR-ABL2', name: 'Ablekuma North Municipal', tier: 'MUNICIPAL' },
    { code: 'GAR-ABL3', name: 'Ablekuma West Municipal', tier: 'MUNICIPAL' },
    { code: 'GAR-AMA', name: 'Accra Metropolitan', tier: 'METROPOLITAN' },
    { code: 'GAR-ADA', name: 'Ada East District', tier: 'DISTRICT' },
    { code: 'GAR-ADA2', name: 'Ada West District', tier: 'DISTRICT' },
    { code: 'GAR-ADE', name: 'Adenta Municipal', tier: 'MUNICIPAL' },
    { code: 'GAR-ASH', name: 'Ashaiman Municipal', tier: 'MUNICIPAL' },
    { code: 'GAR-AYA', name: 'Ayawaso Central Municipal', tier: 'MUNICIPAL' },
    { code: 'GAR-AYA2', name: 'Ayawaso East Municipal', tier: 'MUNICIPAL' },
    { code: 'GAR-AYA3', name: 'Ayawaso North Municipal', tier: 'MUNICIPAL' },
    { code: 'GAR-AYA4', name: 'Ayawaso West Municipal', tier: 'MUNICIPAL' },
    { code: 'GAR-GAG', name: 'Ga Central Municipal', tier: 'MUNICIPAL' },
    { code: 'GAR-GAG2', name: 'Ga East Municipal', tier: 'MUNICIPAL' },
    { code: 'GAR-GAG3', name: 'Ga North Municipal', tier: 'MUNICIPAL' },
    { code: 'GAR-GAG4', name: 'Ga South Municipal', tier: 'MUNICIPAL' },
    { code: 'GAR-GAG5', name: 'Ga West Municipal', tier: 'MUNICIPAL' },
    { code: 'GAR-KOR', name: 'Korle-Klottey Municipal', tier: 'MUNICIPAL' },
    { code: 'GAR-KPO', name: 'Kpone-Katamanso Metropolitan', tier: 'METROPOLITAN' },
    { code: 'GAR-KRO', name: 'Krowor Municipal', tier: 'MUNICIPAL' },
    { code: 'GAR-LAL', name: 'La-Dade-Kotopon Municipal', tier: 'MUNICIPAL' },
    { code: 'GAR-LAL2', name: 'La-Nkwantanang-Madina Municipal', tier: 'MUNICIPAL' },
    { code: 'GAR-LED', name: 'Ledzokuku Municipal', tier: 'MUNICIPAL' },
    { code: 'GAR-NIN', name: 'Ningo-Prampram District', tier: 'DISTRICT' },
    { code: 'GAR-OKA', name: 'Okaikwei North Municipal', tier: 'MUNICIPAL' },
    { code: 'GAR-SHA', name: 'Shai-Osudoku District', tier: 'DISTRICT' },
    { code: 'GAR-TEM', name: 'Tema Metropolitan', tier: 'METROPOLITAN' },
    { code: 'GAR-TEM2', name: 'Tema West Municipal', tier: 'MUNICIPAL' },
    { code: 'GAR-WEI', name: 'Weija Gbawe Municipal', tier: 'MUNICIPAL' }
  ],
  'Northern': [
    { code: 'NOR-GUS', name: 'Gushegu Municipal', tier: 'MUNICIPAL' },
    { code: 'NOR-KAR', name: 'Karaga District', tier: 'DISTRICT' },
    { code: 'NOR-KPA', name: 'Kpandai District', tier: 'DISTRICT' },
    { code: 'NOR-KUM', name: 'Kumbungu District', tier: 'DISTRICT' },
    { code: 'NOR-MIO', name: 'Mion District', tier: 'DISTRICT' },
    { code: 'NOR-NAN', name: 'Nanton District', tier: 'DISTRICT' },
    { code: 'NOR-NAN2', name: 'Nanumba North Municipal', tier: 'MUNICIPAL' },
    { code: 'NOR-NAN3', name: 'Nanumba South District', tier: 'DISTRICT' },
    { code: 'NOR-SAB', name: 'Saboba District', tier: 'DISTRICT' },
    { code: 'NOR-SAG', name: 'Sagnarigu Municipal', tier: 'MUNICIPAL' },
    { code: 'NOR-SAV', name: 'Savelugu Municipal', tier: 'MUNICIPAL' },
    { code: 'NOR-TAM', name: 'Tamale Metropolitan', tier: 'METROPOLITAN' },
    { code: 'NOR-TAT', name: 'Tatale Sanguli District', tier: 'DISTRICT' },
    { code: 'NOR-TOL', name: 'Tolon District', tier: 'DISTRICT' },
    { code: 'NOR-YEN', name: 'Yendi Municipal', tier: 'MUNICIPAL' },
    { code: 'NOR-ZAB', name: 'Zabzugu District', tier: 'DISTRICT' }
  ],
  'North East': [
    { code: 'NEA-BUN', name: 'Bunkpurugu Nyankpanduri District', tier: 'DISTRICT' },
    { code: 'NEA-CHE', name: 'Chereponi District', tier: 'DISTRICT' },
    { code: 'NEA-EAS', name: 'East Mamprusi Municipal', tier: 'MUNICIPAL' },
    { code: 'NEA-MAM', name: 'Mamprugu Moagduri District', tier: 'DISTRICT' },
    { code: 'NEA-WES', name: 'West Mamprusi Municipal', tier: 'MUNICIPAL' },
    { code: 'NEA-YUN', name: 'Yunyoo-Nasuan District', tier: 'DISTRICT' }
  ],
  'Oti': [
    { code: 'OTI-BIA', name: 'Biakoye District', tier: 'DISTRICT' },
    { code: 'OTI-GUA', name: 'Guan District', tier: 'DISTRICT' },
    { code: 'OTI-JAS', name: 'Jasikan Municipal', tier: 'MUNICIPAL' },
    { code: 'OTI-KAD', name: 'Kadjebi District', tier: 'DISTRICT' },
    { code: 'OTI-KRA', name: 'Krachi East Municipal', tier: 'MUNICIPAL' },
    { code: 'OTI-KRA2', name: 'Krachi Nchumuru District', tier: 'DISTRICT' },
    { code: 'OTI-KRA3', name: 'Krachi West Municipal', tier: 'MUNICIPAL' },
    { code: 'OTI-NKW', name: 'Nkwanta North District', tier: 'DISTRICT' },
    { code: 'OTI-NKW2', name: 'Nkwanta South Municipal', tier: 'MUNICIPAL' }
  ],
  'Savannah': [
    { code: 'SAV-BOL', name: 'Bole District', tier: 'DISTRICT' },
    { code: 'SAV-CEN', name: 'Central Gonja District', tier: 'DISTRICT' },
    { code: 'SAV-EAS', name: 'East Gonja Municipal', tier: 'MUNICIPAL' },
    { code: 'SAV-NOR', name: 'North Gonja District', tier: 'DISTRICT' },
    { code: 'SAV-NOR2', name: 'North East Gonja District', tier: 'DISTRICT' },
    { code: 'SAV-SAW', name: 'Sawla-Tuna-Kalba District', tier: 'DISTRICT' },
    { code: 'SAV-WES', name: 'West Gonja Municipal', tier: 'MUNICIPAL' }
  ],
  'Upper East': [
    { code: 'UPE-BAW', name: 'Bawku Municipal', tier: 'MUNICIPAL' },
    { code: 'UPE-BAW2', name: 'Bawku West District', tier: 'DISTRICT' },
    { code: 'UPE-BIN', name: 'Binduri District', tier: 'DISTRICT' },
    { code: 'UPE-BOL', name: 'Bolgatanga East District', tier: 'DISTRICT' },
    { code: 'UPE-BOL2', name: 'Bolgatanga Municipal', tier: 'MUNICIPAL' },
    { code: 'UPE-BON', name: 'Bongo District', tier: 'DISTRICT' },
    { code: 'UPE-BUI', name: 'Builsa North Municipal', tier: 'MUNICIPAL' },
    { code: 'UPE-BUI2', name: 'Builsa South District', tier: 'DISTRICT' },
    { code: 'UPE-GAR', name: 'Garu District', tier: 'DISTRICT' },
    { code: 'UPE-KAS', name: 'Kassena-Nankana Municipal', tier: 'MUNICIPAL' },
    { code: 'UPE-KAS2', name: 'Kassena-Nankana West District', tier: 'DISTRICT' },
    { code: 'UPE-NAB', name: 'Nabdam District', tier: 'DISTRICT' },
    { code: 'UPE-PUS', name: 'Pusiga District', tier: 'DISTRICT' },
    { code: 'UPE-TAL', name: 'Talensi District', tier: 'DISTRICT' },
    { code: 'UPE-TEM', name: 'Tempane District', tier: 'DISTRICT' }
  ],
  'Upper West': [
    { code: 'UPW-DAF', name: 'Daffiama Bussie Issa District', tier: 'DISTRICT' },
    { code: 'UPW-JIR', name: 'Jirapa Municipal', tier: 'MUNICIPAL' },
    { code: 'UPW-LAM', name: 'Lambussie Karni District', tier: 'DISTRICT' },
    { code: 'UPW-LAW', name: 'Lawra Municipal', tier: 'MUNICIPAL' },
    { code: 'UPW-NAD', name: 'Nadowli-Kaleo District', tier: 'DISTRICT' },
    { code: 'UPW-NAN', name: 'Nandom Municipal', tier: 'MUNICIPAL' },
    { code: 'UPW-SIS', name: 'Sissala East Municipal', tier: 'MUNICIPAL' },
    { code: 'UPW-SIS2', name: 'Sissala West District', tier: 'DISTRICT' },
    { code: 'UPW-WAW', name: 'Wa East District', tier: 'DISTRICT' },
    { code: 'UPW-WAW2', name: 'Wa Metropolitan', tier: 'METROPOLITAN' },
    { code: 'UPW-WAW3', name: 'Wa West District', tier: 'DISTRICT' }
  ],
  'Volta': [
    { code: 'VOL-ADA', name: 'Adaklu District', tier: 'DISTRICT' },
    { code: 'VOL-AFA', name: 'Afadzato South District', tier: 'DISTRICT' },
    { code: 'VOL-AGO', name: 'Agotime Ziope District', tier: 'DISTRICT' },
    { code: 'VOL-AKA', name: 'Akatsi North District', tier: 'DISTRICT' },
    { code: 'VOL-AKA2', name: 'Akatsi South District', tier: 'DISTRICT' },
    { code: 'VOL-ANL', name: 'Anloga District', tier: 'DISTRICT' },
    { code: 'VOL-CEN', name: 'Central Tongu District', tier: 'DISTRICT' },
    { code: 'VOL-HOH', name: 'Ho Metropolitan', tier: 'METROPOLITAN' },
    { code: 'VOL-HOH2', name: 'Ho West District', tier: 'DISTRICT' },
    { code: 'VOL-HOH3', name: 'Hohoe Municipal', tier: 'MUNICIPAL' },
    { code: 'VOL-KET', name: 'Keta Municipal', tier: 'MUNICIPAL' },
    { code: 'VOL-KET2', name: 'Ketu North Municipal', tier: 'MUNICIPAL' },
    { code: 'VOL-KET3', name: 'Ketu South Municipal', tier: 'MUNICIPAL' },
    { code: 'VOL-KPA', name: 'Kpando Municipal', tier: 'MUNICIPAL' },
    { code: 'VOL-NOR', name: 'North Dayi District', tier: 'DISTRICT' },
    { code: 'VOL-NOR2', name: 'North Tongu District', tier: 'DISTRICT' },
    { code: 'VOL-SOU', name: 'South Dayi District', tier: 'DISTRICT' },
    { code: 'VOL-SOU2', name: 'South Tongu District', tier: 'DISTRICT' }
  ],
  'Western': [
    { code: 'WES-AHA', name: 'Ahanta West Municipal', tier: 'MUNICIPAL' },
    { code: 'WES-AME', name: 'Amenfi Central District', tier: 'DISTRICT' },
    { code: 'WES-AME2', name: 'Amenfi West Municipal', tier: 'MUNICIPAL' },
    { code: 'WES-EFF', name: 'Effia Kwesimintsim Municipal', tier: 'MUNICIPAL' },
    { code: 'WES-ELL', name: 'Ellembelle District', tier: 'DISTRICT' },
    { code: 'WES-JOM', name: 'Jomoro Municipal', tier: 'MUNICIPAL' },
    { code: 'WES-MPO', name: 'Mpohor District', tier: 'DISTRICT' },
    { code: 'WES-NZE', name: 'Nzema East Municipal', tier: 'MUNICIPAL' },
    { code: 'WES-PRE', name: 'Prestea-Huni Valley Municipal', tier: 'MUNICIPAL' },
    { code: 'WES-SEK', name: 'Sekondi Takoradi Metropolitan', tier: 'METROPOLITAN' },
    { code: 'WES-SHA', name: 'Shama District', tier: 'DISTRICT' },
    { code: 'WES-TAR', name: 'Tarkwa-Nsuaem Municipal', tier: 'MUNICIPAL' },
    { code: 'WES-WAS', name: 'Wassa Amenfi East Municipal', tier: 'MUNICIPAL' },
    { code: 'WES-WAS2', name: 'Wassa East District', tier: 'DISTRICT' }
  ],
  'Western North': [
    { code: 'WNB-AOW', name: 'Aowin Municipal', tier: 'MUNICIPAL' },
    { code: 'WNB-BIA', name: 'Bia East District', tier: 'DISTRICT' },
    { code: 'WNB-BIA2', name: 'Bia West District', tier: 'DISTRICT' },
    { code: 'WNB-BIB', name: 'Bibiani Anhwiaso Bekwai Municipal', tier: 'MUNICIPAL' },
    { code: 'WNB-BOD', name: 'Bodi District', tier: 'DISTRICT' },
    { code: 'WNB-JUA', name: 'Juaboso District', tier: 'DISTRICT' },
    { code: 'WNB-SEF', name: 'Sefwi Akontombra District', tier: 'DISTRICT' },
    { code: 'WNB-SEF2', name: 'Sefwi-Wiawso Municipal', tier: 'MUNICIPAL' },
    { code: 'WNB-SUA', name: 'Suaman District', tier: 'DISTRICT' }
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
