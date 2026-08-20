import { Institution, CivicPost, IssueCluster, GhanaRegionName } from '../src/types';

export const GHANA_REGIONS: GhanaRegionName[] = [
  'Greater Accra',
  'Ashanti',
  'Northern',
  'Western',
  'Central',
  'Eastern',
  'Volta',
  'Upper East',
  'Upper West',
  'Bono',
  'Bono East',
  'Ahafo',
  'Oti',
  'Savannah',
  'North East',
  'Western North'
];

export const INITIAL_INSTITUTIONS: Institution[] = [
  {
    id: 'ghana-police-service',
    officialName: 'Ghana Police Service',
    shortName: 'Ghana Police',
    acronym: 'GPS',
    verified: true,
    logo: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=150&auto=format&fit=crop&q=80',
    mandate: 'Maintenance of law and order, protection of life and property, prevention and detection of crime, and apprehension of offenders throughout Ghana.',
    description: 'National policing agency under the Ministry of the Interior responsible for civic safety, crime prevention, and emergency response.',
    categories: ['Public Safety & Security', 'Emergency & Disaster', 'Human Rights & Corruption'],
    geographicScope: 'National',
    website: 'https://police.gov.gh',
    emergencyChannels: ['191', '112', '18555'],
    phoneChannels: ['+233302773906', '+233302787373'],
    whatsappChannels: ['+233206639121'],
    socialChannels: [
      { platform: 'X', handle: '@GhPoliceService', url: 'https://x.com/GhPoliceService', verified: true },
      { platform: 'Facebook', handle: 'GhanaPoliceService', url: 'https://facebook.com/GhPoliceService', verified: true }
    ],
    reportingChannels: [
      { name: 'National Emergency Response Centre', url: 'tel:112', description: 'Immediate emergency dispatch across all regions', supportsMultimedia: false },
      { name: 'Police Social Media Monitoring Desk', url: 'https://police.gov.gh/report', description: 'Digital intelligence and citizen reporting portal', supportsMultimedia: true }
    ],
    alertMethod: 'DIRECT_API',
    activeMentionsCount: 28,
    unansweredMentionsCount: 5,
    officialResponsesCount: 42,
    verifiedBy: 'National Cybersecurity & Civic Registry',
    lastVerifiedAt: '2026-08-01'
  },
  {
    id: 'nadmo-ghana',
    officialName: 'National Disaster Management Organisation',
    shortName: 'NADMO',
    acronym: 'NADMO',
    verified: true,
    logo: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=150&auto=format&fit=crop&q=80',
    mandate: 'Disaster prevention, risk reduction, emergency relief, flood response, and management of man-made and natural disasters across Ghana.',
    description: 'Primary disaster response agency under Ministry for the Interior coordinating national disaster relief, flood drainage rescues, and rehabilitation.',
    categories: ['Flooding & Drainage', 'Emergency & Disaster', 'Environment & Galamsey'],
    geographicScope: 'National',
    website: 'https://nadmo.gov.gh',
    emergencyChannels: ['112', '+233302772926'],
    phoneChannels: ['+233302772926', '+233302780774'],
    whatsappChannels: ['+233244000000'],
    socialChannels: [
      { platform: 'X', handle: '@NADMO_Gh', url: 'https://x.com/NADMO_Gh', verified: true },
      { platform: 'Facebook', handle: 'NADMOghana', url: 'https://facebook.com/NADMOghana', verified: true }
    ],
    reportingChannels: [
      { name: 'NADMO Flood & Storm Incident Desk', url: 'https://nadmo.gov.gh/report', description: 'Early warning and rapid evacuation reporting line', supportsMultimedia: true }
    ],
    alertMethod: 'DIRECT_API',
    activeMentionsCount: 34,
    unansweredMentionsCount: 4,
    officialResponsesCount: 38,
    verifiedBy: 'National Disaster Command Registry',
    lastVerifiedAt: '2026-08-05'
  },
  {
    id: 'purc-ghana',
    officialName: 'Public Utilities Regulatory Commission',
    shortName: 'PURC',
    acronym: 'PURC',
    verified: true,
    logo: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=150&auto=format&fit=crop&q=80',
    mandate: 'Independent multi-sector regulator for electricity and water utility services, protecting consumers from poor service delivery and resolving utility complaints.',
    description: 'Statutory commission receiving consumer complaints on electricity quality, persistent dumsor, water shortages, and tariff irregularities. Accepts video/photo evidence.',
    categories: ['Power & Electricity (Dumsor)', 'Water Supply & Quality', 'Consumer Rights & Transport'],
    geographicScope: 'National',
    website: 'https://purc.com.gh',
    emergencyChannels: ['+233302244181'],
    phoneChannels: ['+233302244181', '+233302240046'],
    whatsappChannels: ['+233596919004'],
    socialChannels: [
      { platform: 'X', handle: '@PURCGhana', url: 'https://x.com/PURCGhana', verified: true },
      { platform: 'Facebook', handle: 'PURCGH', url: 'https://facebook.com/PURCGH', verified: true }
    ],
    reportingChannels: [
      { name: 'PURC Consumer Complaints Portal', url: 'https://purc.com.gh/complaints', description: 'Multimedia-supported consumer complaints portal for water & power outages', supportsMultimedia: true }
    ],
    alertMethod: 'DIRECT_API',
    activeMentionsCount: 41,
    unansweredMentionsCount: 6,
    officialResponsesCount: 52,
    verifiedBy: 'Ministry of Utilities Oversight',
    lastVerifiedAt: '2026-07-28'
  },
  {
    id: 'ecg-ghana',
    officialName: 'Electricity Company of Ghana',
    shortName: 'ECG',
    acronym: 'ECG',
    verified: true,
    logo: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&auto=format&fit=crop&q=80',
    mandate: 'Distribution of electricity across southern Ghana, maintaining distribution infrastructure, transformer repair, and power fault restoration.',
    description: 'State electricity distributor handling outage complaints, broken power poles, sparking transformers, and prepaid meter faults.',
    categories: ['Power & Electricity (Dumsor)', 'Infrastructure & Roads'],
    geographicScope: 'National',
    website: 'https://ecg.com.gh',
    emergencyChannels: ['+233302611611'],
    phoneChannels: ['+233302611611', '+233302676727'],
    whatsappChannels: ['+233501234567'],
    socialChannels: [
      { platform: 'X', handle: '@ECGghOfficial', url: 'https://x.com/ECGghOfficial', verified: true }
    ],
    reportingChannels: [
      { name: 'ECG PowerApp Fault Reporting', url: 'https://ecg.com.gh/faults', description: 'Direct outage and burnt transformer reporting channel', supportsMultimedia: true }
    ],
    alertMethod: 'OFFICIAL_EMAIL',
    activeMentionsCount: 62,
    unansweredMentionsCount: 12,
    officialResponsesCount: 45,
    verifiedBy: 'Energy Ministry Secretariat',
    lastVerifiedAt: '2026-08-10'
  },
  {
    id: 'gwcl-ghana',
    officialName: 'Ghana Water Company Limited',
    shortName: 'GWCL',
    acronym: 'GWCL',
    verified: true,
    logo: 'https://images.unsplash.com/photo-1527061011665-3652c757a4d4?w=150&auto=format&fit=crop&q=80',
    mandate: 'Production and distribution of potable drinking water across urban Ghana, pipeline maintenance, and leakage repair.',
    description: 'National urban water utility responsible for treating drinking water, resolving pipe bursts, and addressing chronic tap dryness.',
    categories: ['Water Supply & Quality', 'Infrastructure & Roads', 'Sanitation & Waste'],
    geographicScope: 'National',
    website: 'https://gwcl.com.gh',
    emergencyChannels: ['+23380040000'],
    phoneChannels: ['+233302774127', '+23380040000'],
    whatsappChannels: ['+233207385087'],
    socialChannels: [
      { platform: 'X', handle: '@GWCL_Ghana', url: 'https://x.com/GWCL_Ghana', verified: true }
    ],
    reportingChannels: [
      { name: 'GWCL Pipe Burst & Shortage Hotdesk', url: 'https://gwcl.com.gh/report-leak', description: 'Report burst mains and dry taps with geo-coordinates', supportsMultimedia: true }
    ],
    alertMethod: 'WHATSAPP_LINE',
    activeMentionsCount: 22,
    unansweredMentionsCount: 3,
    officialResponsesCount: 26,
    verifiedBy: 'Sanitation and Water Resources Ministry',
    lastVerifiedAt: '2026-07-30'
  },
  {
    id: 'csa-ghana',
    officialName: 'Cyber Security Authority',
    shortName: 'Cyber Security Authority',
    acronym: 'CSA',
    verified: true,
    logo: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=150&auto=format&fit=crop&q=80',
    mandate: 'Regulation of cybersecurity activities, protection of critical information infrastructure, and national incident response against online fraud and cyber attacks.',
    description: 'National cybersecurity agency providing 24/7 incident response for MoMo fraud, hacking, digital blackmail, and child online exploitation.',
    categories: ['Cybercrime & Online Fraud', 'Public Safety & Security'],
    geographicScope: 'National',
    website: 'https://csa.gov.gh',
    emergencyChannels: ['292'],
    phoneChannels: ['292', '+233244000292'],
    whatsappChannels: ['+233501603111'],
    socialChannels: [
      { platform: 'X', handle: '@CSAGhana', url: 'https://x.com/CSAGhana', verified: true },
      { platform: 'Facebook', handle: 'CSAGhana', url: 'https://facebook.com/CSAGhana', verified: true }
    ],
    reportingChannels: [
      { name: 'CSA 292 Incident Reporting Point of Contact', url: 'https://csa.gov.gh/report', description: 'Instant SMS 292, Web reporting and WhatsApp +233501603111 line', supportsMultimedia: true }
    ],
    alertMethod: 'DIRECT_API',
    activeMentionsCount: 19,
    unansweredMentionsCount: 2,
    officialResponsesCount: 31,
    verifiedBy: 'Ministry of Communications and Digitalisation',
    lastVerifiedAt: '2026-08-12'
  },
  {
    id: 'chraj-ghana',
    officialName: 'Commission on Human Rights and Administrative Justice',
    shortName: 'CHRAJ',
    acronym: 'CHRAJ',
    verified: true,
    logo: 'https://images.unsplash.com/photo-1589994965851-a8f479c573a9?w=150&auto=format&fit=crop&q=80',
    mandate: 'Constitutional watchdog protecting fundamental human rights and freedoms, combating administrative injustice, and investigating public corruption.',
    description: 'Independent constitutional body investigating abuse of power by public officials, unlawful detention, discrimination, and corruption.',
    categories: ['Human Rights & Corruption', 'Public Safety & Security'],
    geographicScope: 'National',
    website: 'https://chraj.gov.gh',
    emergencyChannels: ['+233302662150'],
    phoneChannels: ['+233302662150', '+233302664868'],
    whatsappChannels: ['+233244111222'],
    socialChannels: [
      { platform: 'X', handle: '@CHRAJ_Ghana', url: 'https://x.com/CHRAJ_Ghana', verified: true }
    ],
    reportingChannels: [
      { name: 'CHRAJ Public Complaints & Whistleblower System', url: 'https://chraj.gov.gh/complaints', description: 'Confidential complaint filing for administrative injustice & human rights abuses', supportsMultimedia: true }
    ],
    alertMethod: 'DIRECT_API',
    activeMentionsCount: 15,
    unansweredMentionsCount: 2,
    officialResponsesCount: 19,
    verifiedBy: 'Judicial Council Accreditation',
    lastVerifiedAt: '2026-07-25'
  },
  {
    id: 'gha-roads',
    officialName: 'Ghana Highway Authority & Urban Roads',
    shortName: 'Highways & Urban Roads',
    acronym: 'GHA',
    verified: true,
    logo: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=150&auto=format&fit=crop&q=80',
    mandate: 'Planning, development, maintenance, and administration of trunk roads, highway bridges, and urban road safety infrastructure across Ghana.',
    description: 'State agency responsible for highway safety, pothole repair, bridge integrity, and major road corridor rehabilitation.',
    categories: ['Infrastructure & Roads', 'Public Safety & Security'],
    geographicScope: 'National',
    website: 'https://highways.gov.gh',
    emergencyChannels: ['+233302664921'],
    phoneChannels: ['+233302664921', '+233302663922'],
    whatsappChannels: ['+233202998877'],
    socialChannels: [
      { platform: 'X', handle: '@GhanaHighways', url: 'https://x.com/GhanaHighways', verified: true }
    ],
    reportingChannels: [
      { name: 'National Road Hazard Early Warning Desk', url: 'https://highways.gov.gh/hazards', description: 'Report dangerous potholes, broken culverts and unlit highway sections', supportsMultimedia: true }
    ],
    alertMethod: 'OFFICIAL_EMAIL',
    activeMentionsCount: 53,
    unansweredMentionsCount: 9,
    officialResponsesCount: 36,
    verifiedBy: 'Ministry of Roads and Highways',
    lastVerifiedAt: '2026-08-08'
  },
  {
    id: 'ama-accra',
    officialName: 'Accra Metropolitan Assembly',
    shortName: 'AMA Accra',
    acronym: 'AMA',
    verified: true,
    logo: 'https://images.unsplash.com/photo-1477959858617-67f30bc75b82?w=150&auto=format&fit=crop&q=80',
    mandate: 'Local governance, waste sanitation management, building permits, public health compliance, and local infrastructure in Accra metropolis.',
    description: 'Metropolitan local authority governing central Accra, overseeing markets, public drains, sanitation enforcement, and municipal safety.',
    categories: ['Sanitation & Waste', 'Flooding & Drainage', 'Infrastructure & Roads', 'Health & Hospitals'],
    geographicScope: 'District',
    website: 'https://ama.gov.gh',
    emergencyChannels: ['+233302662095'],
    phoneChannels: ['+233302662095', '+233302663812'],
    whatsappChannels: ['+233550001122'],
    socialChannels: [
      { platform: 'X', handle: '@AccraMetropolis', url: 'https://x.com/AccraMetropolis', verified: true }
    ],
    reportingChannels: [
      { name: 'AMA Citizen Sanitation & Drain Desk', url: 'https://ama.gov.gh/report-issue', description: 'Municipal reporting for blocked drains, illegal dumping, and market hazards', supportsMultimedia: true }
    ],
    alertMethod: 'DIRECT_API',
    activeMentionsCount: 39,
    unansweredMentionsCount: 7,
    officialResponsesCount: 31,
    verifiedBy: 'Ministry of Local Government and Rural Development',
    lastVerifiedAt: '2026-08-09'
  },
  {
    id: 'epa-ghana',
    officialName: 'Environmental Protection Agency',
    shortName: 'EPA Ghana',
    acronym: 'EPA',
    verified: true,
    logo: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=150&auto=format&fit=crop&q=80',
    mandate: 'Co-management of the environment, enforcement of environmental laws, regulating pollution, combating illegal mining (galamsey) and chemical discharge.',
    description: 'Statutory agency regulating air, water and soil quality, investigating galamsey river contamination, industrial noise, and hazardous emissions.',
    categories: ['Environment & Galamsey', 'Health & Hospitals'],
    geographicScope: 'National',
    website: 'https://epa.gov.gh',
    emergencyChannels: ['+233302664697'],
    phoneChannels: ['+233302664697', '+233302664698'],
    whatsappChannels: ['+233502345678'],
    socialChannels: [
      { platform: 'X', handle: '@EPAGhanaOfficial', url: 'https://x.com/EPAGhanaOfficial', verified: true }
    ],
    reportingChannels: [
      { name: 'EPA Environmental Hotline', url: 'https://epa.gov.gh/citizen-report', description: 'Citizen reporting line for river pollution, illegal mining and factory fumes', supportsMultimedia: true }
    ],
    alertMethod: 'DIRECT_API',
    activeMentionsCount: 29,
    unansweredMentionsCount: 4,
    officialResponsesCount: 22,
    verifiedBy: 'Ministry of Environment, Science and Technology',
    lastVerifiedAt: '2026-08-03'
  },
  {
    id: 'ghs-health',
    officialName: 'Ghana Health Service',
    shortName: 'Ghana Health Service',
    acronym: 'GHS',
    verified: true,
    logo: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=150&auto=format&fit=crop&q=80',
    mandate: 'Implementation of national health policies, administration of public healthcare facilities, disease surveillance, and epidemic response.',
    description: 'Autonomous health body operating public clinics, regional hospitals, emergency maternal care, and public disease outbreak investigations.',
    categories: ['Health & Hospitals', 'Emergency & Disaster'],
    geographicScope: 'National',
    website: 'https://ghs.gov.gh',
    emergencyChannels: ['112', '193'],
    phoneChannels: ['+233302682709', '+233302681534'],
    whatsappChannels: ['+233552233445'],
    socialChannels: [
      { platform: 'X', handle: '@GhanasHealth', url: 'https://x.com/GhanasHealth', verified: true }
    ],
    reportingChannels: [
      { name: 'GHS Public Health Surveillance Line', url: 'https://ghs.gov.gh/surveillance', description: 'Report infectious outbreaks and public clinic emergency shortages', supportsMultimedia: true }
    ],
    alertMethod: 'DIRECT_API',
    activeMentionsCount: 18,
    unansweredMentionsCount: 1,
    officialResponsesCount: 24,
    verifiedBy: 'Ministry of Health',
    lastVerifiedAt: '2026-08-11'
  },
  {
    id: 'gnfs-fire',
    officialName: 'Ghana National Fire Service',
    shortName: 'Fire Service',
    acronym: 'GNFS',
    verified: true,
    logo: 'https://images.unsplash.com/photo-1523741543316-beb7fc7023d8?w=150&auto=format&fit=crop&q=80',
    mandate: 'Prevention and containment of fire outbreaks, rescue operations during road traffic accidents and structural collapses.',
    description: 'National emergency service dedicated to fire containment, hazmat extraction, building fire safety inspections, and rescue services.',
    categories: ['Emergency & Disaster', 'Public Safety & Security', 'Infrastructure & Roads'],
    geographicScope: 'National',
    website: 'https://gnfs.gov.gh',
    emergencyChannels: ['192', '112'],
    phoneChannels: ['192', '+233302772446'],
    whatsappChannels: ['+233244192192'],
    socialChannels: [
      { platform: 'X', handle: '@GNFS_Ghana', url: 'https://x.com/GNFS_Ghana', verified: true }
    ],
    reportingChannels: [
      { name: 'Fire Control Command Room', url: 'tel:192', description: 'Instant emergency line for active fire and entrapment rescue', supportsMultimedia: false }
    ],
    alertMethod: 'DIRECT_API',
    activeMentionsCount: 14,
    unansweredMentionsCount: 1,
    officialResponsesCount: 29,
    verifiedBy: 'Ministry of the Interior',
    lastVerifiedAt: '2026-08-04'
  }
];

export const INITIAL_CLUSTERS: IssueCluster[] = [
  {
    id: 'cluster-odawna-floods-2026',
    title: 'Severe Storm Drain Overflow & Market Flooding at Kwame Nkrumah Circle / Odawna',
    category: 'Flooding & Drainage',
    region: 'Greater Accra',
    district: 'Accra Metropolitan',
    locationSummary: 'Circle Interchange, Odawna Market, Klottey Korle border',
    postIds: ['post-circle-flood-1', 'post-circle-flood-2', 'post-circle-flood-3'],
    postsCount: 3,
    confirmationCount: 47,
    evidenceCount: 5,
    firstSeenAt: '2026-08-20T01:30:00Z',
    latestSeenAt: '2026-08-20T04:15:00Z',
    trendScore: 98,
    publicInterestScore: 95,
    taggedInstitutionIds: ['nadmo-ghana', 'ama-accra'],
    status: 'TRENDING',
    summary: 'Heavy overnight rainfall has caused the Odaw drain to overflow near Odawna market. 47 citizens have independently confirmed water entering ground-floor stalls and stranded vehicles on Circle-Kaneshie stretch. NADMO and AMA have acknowledged the alerts.',
    primaryImage: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=800&auto=format&fit=crop&q=80'
  },
  {
    id: 'cluster-kumasi-dumsor-2026',
    title: '72-Hour Unscheduled Power Outage & Sparking Transformer in Ahodwo / Nhyiaeso',
    category: 'Power & Electricity (Dumsor)',
    region: 'Ashanti',
    district: 'Kumasi Metropolitan',
    locationSummary: 'Ahodwo Roundabout, Nhyiaeso Residential Area, Kumasi',
    postIds: ['post-kumasi-dumsor-1', 'post-kumasi-dumsor-2'],
    postsCount: 2,
    confirmationCount: 38,
    evidenceCount: 4,
    firstSeenAt: '2026-08-19T14:00:00Z',
    latestSeenAt: '2026-08-20T03:45:00Z',
    trendScore: 88,
    publicInterestScore: 91,
    taggedInstitutionIds: ['ecg-ghana', 'purc-ghana'],
    status: 'UNDER_ATTENTION',
    summary: 'Continuous 3-day outage in Ahodwo following an explosion at the sub-station transformer. Small businesses and clinics operating on generators. PURC consumer desk has issued inquiry to ECG technical team.',
    primaryImage: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80'
  },
  {
    id: 'cluster-motorway-potholes-2026',
    title: 'Dangerous Deep Craters on Accra-Tema Motorway (Near Abattoir Bridge)',
    category: 'Infrastructure & Roads',
    region: 'Greater Accra',
    district: 'Tema Metropolitan',
    locationSummary: 'Accra-Tema Motorway, westbound lane near Tema Abattoir overhead',
    postIds: ['post-motorway-pothole-1'],
    postsCount: 1,
    confirmationCount: 64,
    evidenceCount: 6,
    firstSeenAt: '2026-08-18T08:00:00Z',
    latestSeenAt: '2026-08-20T02:10:00Z',
    trendScore: 92,
    publicInterestScore: 89,
    taggedInstitutionIds: ['gha-roads', 'ghana-police-service'],
    status: 'TRENDING',
    summary: 'Multiple vehicle tyre punctures and sudden braking incidents reported at night due to unlit deep craters on the high-speed Accra-bound carriageway.',
    primaryImage: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=800&auto=format&fit=crop&q=80'
  }
];

export const INITIAL_POSTS: CivicPost[] = [
  {
    id: 'post-circle-flood-1',
    title: 'Odaw Drain overflowing at Odawna Market — water entering shops',
    content: 'The major storm drain at Odawna is completely filled and spilling onto the road. Water is knee-deep around the transport terminal. Traders are moving wares. We need NADMO and AMA desilting trucks on site before the evening rush.',
    originalLanguage: 'English',
    authorId: 'user-kofi-mensah',
    authorName: 'Kofi Mensah',
    authorHandle: 'kofimensah_gh',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    authorVisibility: 'public',
    isVerifiedCitizen: true,
    followersCount: 0, // Zero followers! Still reaches national spotlight
    media: [
      {
        id: 'media-flood-1',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=800&auto=format&fit=crop&q=80',
        caption: 'Water surging across pedestrian walkways at 3:30 AM',
        uploadedAt: '2026-08-20T02:00:00Z'
      }
    ],
    category: 'Flooding & Drainage',
    subcategory: 'Storm Drain Overflow',
    location: {
      region: 'Greater Accra',
      district: 'Accra Metropolitan',
      landmark: 'Near Odawna Railway line, Circle',
      latitude: 5.5588,
      longitude: -0.2137,
      accuracy: 'exact',
      visibility: 'exact'
    },
    institutionTags: [
      {
        institutionId: 'nadmo-ghana',
        institutionName: 'National Disaster Management Organisation',
        shortName: 'NADMO',
        acronym: 'NADMO',
        alertRequested: true,
        alertStatus: 'ACKNOWLEDGED',
        alertMethodUsed: 'Direct Platform Channel',
        deliveryTimestamp: '2026-08-20T02:15:00Z'
      },
      {
        institutionId: 'ama-accra',
        institutionName: 'Accra Metropolitan Assembly',
        shortName: 'AMA Accra',
        acronym: 'AMA',
        alertRequested: true,
        alertStatus: 'DELIVERED',
        alertMethodUsed: 'Direct Platform Channel',
        deliveryTimestamp: '2026-08-20T02:16:00Z'
      }
    ],
    suggestedInstitutions: ['Ghana National Fire Service'],
    urgency: 'HIGH',
    severity: 'SEVERE',
    hashtags: ['AccraFloods', 'Odawna', 'NADMO', 'CircleDrain'],
    issueClusterId: 'cluster-odawna-floods-2026',
    issueClusterTitle: 'Severe Storm Drain Overflow at Kwame Nkrumah Circle',
    visibility: 'public',
    moderationStatus: 'approved',
    credibilitySignals: {
      confirmationsCount: 47,
      evidenceCount: 5,
      hasMedia: true,
      hasLocation: true,
      institutionalAwarenessScore: 92
    },
    engagement: {
      views: 1420,
      reposts: 28,
      shares: 63,
      confirmations: 47,
      comments: 19
    },
    userConfirmed: true,
    userBookmarked: false,
    userReposted: false,
    officialResponses: [
      {
        id: 'resp-nadmo-1',
        postId: 'post-circle-flood-1',
        institutionId: 'nadmo-ghana',
        institutionName: 'National Disaster Management Organisation (NADMO)',
        institutionLogo: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=150&auto=format&fit=crop&q=80',
        responseType: 'ACTION_TAKEN',
        message: 'NADMO Rapid Response Team and Greater Accra regional coordinators have arrived at Odawna with dewatering pumps. Citizens are urged to avoid the lower ground pathway near the railway bridge.',
        official: true,
        verified: true,
        responderName: 'George Ayisi',
        responderTitle: 'Director of Communications, NADMO',
        createdAt: '2026-08-20T03:10:00Z'
      }
    ],
    communityEvidence: [
      {
        id: 'evid-1',
        postId: 'post-circle-flood-1',
        userId: 'user-abena-2',
        userName: 'Abena Serwaa',
        userHandle: 'abena_s',
        text: 'I just crossed the overhead bridge. Water level is still rising towards the VIP bus station as of 4:00 AM.',
        statusUpdate: 'still_ongoing',
        createdAt: '2026-08-20T03:45:00Z'
      }
    ],
    createdAt: '2026-08-20T01:30:00Z',
    updatedAt: '2026-08-20T03:45:00Z'
  },
  {
    id: 'post-motorway-pothole-1',
    title: 'Massive unlit pothole crater causing burst tyres on Accra-Tema Motorway',
    content: 'Extremely dangerous pothole right in the middle lane just past the Tema Abattoir bridge heading towards Accra. At 90km/h drivers cannot see it until the last second. Saw two private cars with shredded front tyres changing wheels in the dark on the shoulder. Very high risk of fatal collision!',
    originalLanguage: 'English',
    authorId: 'user-yaw-boateng',
    authorName: 'Kwame Boateng',
    authorHandle: 'kwame_motorway',
    authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    authorVisibility: 'public',
    isVerifiedCitizen: true,
    followersCount: 0,
    media: [
      {
        id: 'media-motorway-1',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=800&auto=format&fit=crop&q=80',
        caption: 'Deep asphalt detachment measuring approx 1.5m wide',
        uploadedAt: '2026-08-18T08:10:00Z'
      }
    ],
    category: 'Infrastructure & Roads',
    subcategory: 'Highway Hazard',
    location: {
      region: 'Greater Accra',
      district: 'Tema Metropolitan',
      landmark: 'Tema Abattoir Overpass (Accra-bound)',
      latitude: 5.6542,
      longitude: -0.0124,
      accuracy: 'exact',
      visibility: 'exact'
    },
    institutionTags: [
      {
        institutionId: 'gha-roads',
        institutionName: 'Ghana Highway Authority',
        shortName: 'GHA Roads',
        acronym: 'GHA',
        alertRequested: true,
        alertStatus: 'ACKNOWLEDGED',
        alertMethodUsed: 'Official Platform Channel',
        deliveryTimestamp: '2026-08-18T09:00:00Z'
      },
      {
        institutionId: 'ghana-police-service',
        institutionName: 'Ghana Police Service (MTTD)',
        shortName: 'Ghana Police',
        acronym: 'GPS',
        alertRequested: true,
        alertStatus: 'DELIVERED',
        alertMethodUsed: 'Direct Platform Channel',
        deliveryTimestamp: '2026-08-18T09:01:00Z'
      }
    ],
    suggestedInstitutions: ['National Road Safety Authority'],
    urgency: 'HIGH',
    severity: 'SEVERE',
    hashtags: ['MotorwayHazard', 'GhanaRoads', 'RoadSafetyGh', 'GHA'],
    issueClusterId: 'cluster-motorway-potholes-2026',
    issueClusterTitle: 'Dangerous Deep Craters on Accra-Tema Motorway',
    visibility: 'public',
    moderationStatus: 'approved',
    credibilitySignals: {
      confirmationsCount: 64,
      evidenceCount: 6,
      hasMedia: true,
      hasLocation: true,
      institutionalAwarenessScore: 94
    },
    engagement: {
      views: 2840,
      reposts: 74,
      shares: 112,
      confirmations: 64,
      comments: 35
    },
    userConfirmed: false,
    userBookmarked: true,
    userReposted: false,
    officialResponses: [
      {
        id: 'resp-gha-1',
        postId: 'post-motorway-pothole-1',
        institutionId: 'gha-roads',
        institutionName: 'Ghana Highway Authority & Urban Roads',
        institutionLogo: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=150&auto=format&fit=crop&q=80',
        responseType: 'INVESTIGATING',
        message: 'GHA Maintenance Directorate has dispatched an emergency asphalt patch crew with warning retro-reflective signage. MTTD patrol team is staging warning lights.',
        official: true,
        verified: true,
        responderName: 'Ing. Christian Nti',
        responderTitle: 'Chief Executive, GHA',
        createdAt: '2026-08-18T14:20:00Z'
      }
    ],
    communityEvidence: [],
    createdAt: '2026-08-18T08:00:00Z',
    updatedAt: '2026-08-19T18:00:00Z'
  },
  {
    id: 'post-kumasi-dumsor-1',
    title: 'Ahodwo & Nhyiaeso on 3rd day without light — local clinics struggling',
    content: 'Three continuous days without power in Ahodwo residential area. Vaccine storage fridges at the community maternal clinic are relying on fuel generators which are running out. We called ECG helpline multiple times without ETA. Tagging PURC for regulatory intervention.',
    originalLanguage: 'English',
    authorId: 'user-dr-owusu',
    authorName: 'Dr. Emmanuel Owusu',
    authorHandle: 'drowusu_kumasi',
    authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
    authorVisibility: 'public',
    isVerifiedCitizen: true,
    followersCount: 0,
    media: [
      {
        id: 'media-dumsor-1',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80',
        caption: 'Burnt 33kV line fuse at Ahodwo substation junction',
        uploadedAt: '2026-08-19T14:30:00Z'
      }
    ],
    category: 'Power & Electricity (Dumsor)',
    subcategory: 'Transformer Outage',
    location: {
      region: 'Ashanti',
      district: 'Kumasi Metropolitan',
      landmark: 'Ahodwo Roundabout, near Vienna City',
      latitude: 6.6745,
      longitude: -1.6287,
      accuracy: 'exact',
      visibility: 'exact'
    },
    institutionTags: [
      {
        institutionId: 'ecg-ghana',
        institutionName: 'Electricity Company of Ghana',
        shortName: 'ECG',
        acronym: 'ECG',
        alertRequested: true,
        alertStatus: 'SENT',
        alertMethodUsed: 'Platform Alert Channel',
        deliveryTimestamp: '2026-08-19T15:00:00Z'
      },
      {
        institutionId: 'purc-ghana',
        institutionName: 'Public Utilities Regulatory Commission',
        shortName: 'PURC',
        acronym: 'PURC',
        alertRequested: true,
        alertStatus: 'ACKNOWLEDGED',
        alertMethodUsed: 'Direct Platform Channel',
        deliveryTimestamp: '2026-08-19T15:10:00Z'
      }
    ],
    suggestedInstitutions: ['Ghana Health Service'],
    urgency: 'HIGH',
    severity: 'SEVERE',
    hashtags: ['Dumsor', 'Kumasi', 'ECGGhana', 'PURC', 'Ahodwo'],
    issueClusterId: 'cluster-kumasi-dumsor-2026',
    issueClusterTitle: '72-Hour Unscheduled Power Outage in Ahodwo / Nhyiaeso',
    visibility: 'public',
    moderationStatus: 'approved',
    credibilitySignals: {
      confirmationsCount: 38,
      evidenceCount: 4,
      hasMedia: true,
      hasLocation: true,
      institutionalAwarenessScore: 89
    },
    engagement: {
      views: 1980,
      reposts: 42,
      shares: 89,
      confirmations: 38,
      comments: 24
    },
    userConfirmed: true,
    userBookmarked: false,
    userReposted: true,
    officialResponses: [
      {
        id: 'resp-purc-1',
        postId: 'post-kumasi-dumsor-1',
        institutionId: 'purc-ghana',
        institutionName: 'Public Utilities Regulatory Commission (PURC)',
        institutionLogo: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=150&auto=format&fit=crop&q=80',
        responseType: 'WE_ARE_AWARE',
        message: 'PURC Ashanti Regional Secretariat has logged this case (Ref: PURC-ASH-2026-088) and instructed ECG Ashanti Technical Director to restore supply or provide alternate mobile generator backup to health facilities within 6 hours.',
        official: true,
        verified: true,
        responderName: 'Ing. M. A. Kabo',
        responderTitle: 'Regional Director, PURC Ashanti',
        createdAt: '2026-08-19T16:30:00Z'
      }
    ],
    communityEvidence: [],
    createdAt: '2026-08-19T14:00:00Z',
    updatedAt: '2026-08-20T03:00:00Z'
  },
  {
    id: 'post-tamale-drain-1',
    title: 'Deep Uncovered Drain along Tamale Central Market Road — Hazard to Children',
    content: 'There is a 2-meter deep uncovered concrete gutter directly adjacent to the primary school pathway and vegetable market. Two pupils slipped yesterday during the rainstorm. No warning barrier or slab. Tamale Metropolitan Assembly must cover this immediately before tragedy occurs.',
    originalLanguage: 'Dagbani / English',
    authorId: 'user-fatima-tamale',
    authorName: 'Fatima Alhassan',
    authorHandle: 'fatima_tamale',
    authorAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80',
    authorVisibility: 'public',
    isVerifiedCitizen: false,
    followersCount: 0,
    media: [
      {
        id: 'media-tamale-1',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=800&auto=format&fit=crop&q=80',
        caption: 'Uncovered open culvert measuring 2m deep along market sidewalk',
        uploadedAt: '2026-08-19T10:00:00Z'
      }
    ],
    category: 'Public Safety & Security',
    subcategory: 'Open Drain Hazard',
    location: {
      region: 'Northern',
      district: 'Tamale Metropolitan',
      landmark: 'Near Tamale Central Market, Aboabo lane',
      latitude: 9.4008,
      longitude: -0.8393,
      accuracy: 'exact',
      visibility: 'exact'
    },
    institutionTags: [
      {
        institutionId: 'ama-accra', // mapped to local assembly
        institutionName: 'Tamale Metropolitan Assembly (TaMA)',
        shortName: 'TaMA',
        acronym: 'TaMA',
        alertRequested: true,
        alertStatus: 'SENT',
        alertMethodUsed: 'Assembly Liaison Desk',
        deliveryTimestamp: '2026-08-19T11:00:00Z'
      }
    ],
    suggestedInstitutions: ['National Disaster Management Organisation'],
    urgency: 'HIGH',
    severity: 'SEVERE',
    hashtags: ['Tamale', 'TaMA', 'ChildSafety', 'OpenGutters', 'NorthernRegion'],
    visibility: 'public',
    moderationStatus: 'approved',
    credibilitySignals: {
      confirmationsCount: 29,
      evidenceCount: 3,
      hasMedia: true,
      hasLocation: true,
      institutionalAwarenessScore: 78
    },
    engagement: {
      views: 940,
      reposts: 15,
      shares: 41,
      confirmations: 29,
      comments: 11
    },
    userConfirmed: false,
    userBookmarked: false,
    userReposted: false,
    officialResponses: [],
    communityEvidence: [],
    createdAt: '2026-08-19T09:30:00Z',
    updatedAt: '2026-08-19T17:00:00Z'
  },
  {
    id: 'post-momo-scam-1',
    title: 'Fake SMS impersonating Bank of Ghana / Telco asking for PIN confirmation',
    content: 'Widespread phishing SMS circulating today claiming to be "BOG Mobile Money Re-verification" linking to fake domain bit.ly/bog-gh-verify. Do not click or enter your PIN! Tagging Cyber Security Authority so the domain is blocked at ISP level.',
    originalLanguage: 'English',
    authorId: 'user-selorm-it',
    authorName: 'Selorm Dotse',
    authorHandle: 'selorm_tech',
    authorAvatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=120&auto=format&fit=crop&q=80',
    authorVisibility: 'pseudonymous',
    isVerifiedCitizen: true,
    followersCount: 0,
    media: [
      {
        id: 'media-momo-1',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&auto=format&fit=crop&q=80',
        caption: 'Screenshot of fraudulent SMS sender spoofing "BOG-ALERT"',
        uploadedAt: '2026-08-20T00:30:00Z'
      }
    ],
    category: 'Cybercrime & Online Fraud',
    subcategory: 'Mobile Money Phishing',
    location: {
      region: 'Greater Accra',
      district: 'Accra Metropolitan',
      landmark: 'National digital broadcast',
      latitude: 5.6037,
      longitude: -0.187,
      accuracy: 'district_only',
      visibility: 'approximate'
    },
    institutionTags: [
      {
        institutionId: 'csa-ghana',
        institutionName: 'Cyber Security Authority',
        shortName: 'CSA Ghana',
        acronym: 'CSA',
        alertRequested: true,
        alertStatus: 'ACKNOWLEDGED',
        alertMethodUsed: 'CSA 292 Digital Incident Line',
        deliveryTimestamp: '2026-08-20T01:00:00Z'
      }
    ],
    suggestedInstitutions: ['National Communications Authority (NCA)'],
    urgency: 'NORMAL',
    severity: 'MODERATE',
    hashtags: ['MoMoSecurity', 'CSAGhana', 'PhishingAlert', 'CyberSecurity', '292'],
    visibility: 'public',
    moderationStatus: 'approved',
    credibilitySignals: {
      confirmationsCount: 53,
      evidenceCount: 7,
      hasMedia: true,
      hasLocation: false,
      institutionalAwarenessScore: 96
    },
    engagement: {
      views: 3100,
      reposts: 110,
      shares: 215,
      confirmations: 53,
      comments: 42
    },
    userConfirmed: true,
    userBookmarked: true,
    userReposted: false,
    officialResponses: [
      {
        id: 'resp-csa-1',
        postId: 'post-momo-scam-1',
        institutionId: 'csa-ghana',
        institutionName: 'Cyber Security Authority (CSA)',
        institutionLogo: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=150&auto=format&fit=crop&q=80',
        responseType: 'PUBLIC_GUIDANCE',
        message: 'CSA Computer Emergency Response Team (CERT-GH) has taken down the fraudulent phishing URL. Citizens are reminded that neither Bank of Ghana nor any Telco will ever ask for your MoMo PIN via SMS. Report suspicious texts to CSA on shortcode 292 or WhatsApp 0501603111.',
        official: true,
        verified: true,
        responderName: 'Dr. Albert Antwi-Boasiako',
        responderTitle: 'Director-General, Cyber Security Authority',
        createdAt: '2026-08-20T02:30:00Z'
      }
    ],
    communityEvidence: [],
    createdAt: '2026-08-20T00:15:00Z',
    updatedAt: '2026-08-20T02:30:00Z'
  },
  {
    id: 'post-cape-coast-water-1',
    title: 'Major water pipeline burst flooding commercial street in Cape Coast',
    content: 'Huge high-pressure GWCL main pipeline ruptured near Kotokuraba market. Clean treated water is gushing into the road and causing massive soil erosion, while surrounding residential areas in Pedu and Abura have completely dry taps for 48 hours. GWCL repair team needed on site.',
    originalLanguage: 'Fante / English',
    authorId: 'user-mensah-cc',
    authorName: 'Ekow Mensah',
    authorHandle: 'ekow_capecoast',
    authorAvatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=120&auto=format&fit=crop&q=80',
    authorVisibility: 'public',
    isVerifiedCitizen: false,
    followersCount: 0,
    media: [
      {
        id: 'media-cc-water-1',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1527061011665-3652c757a4d4?w=800&auto=format&fit=crop&q=80',
        caption: 'Treated water jet gushing from underground pipe near market entrance',
        uploadedAt: '2026-08-19T16:00:00Z'
      }
    ],
    category: 'Water Supply & Quality',
    subcategory: 'Pipe Burst & Tap Dryness',
    location: {
      region: 'Central',
      district: 'Cape Coast Metropolitan',
      landmark: 'Kotokuraba Market perimeter road',
      latitude: 5.1053,
      longitude: -1.2466,
      accuracy: 'exact',
      visibility: 'exact'
    },
    institutionTags: [
      {
        institutionId: 'gwcl-ghana',
        institutionName: 'Ghana Water Company Limited',
        shortName: 'GWCL',
        acronym: 'GWCL',
        alertRequested: true,
        alertStatus: 'ACKNOWLEDGED',
        alertMethodUsed: 'GWCL Regional WhatsApp Hotdesk',
        deliveryTimestamp: '2026-08-19T16:45:00Z'
      },
      {
        institutionId: 'purc-ghana',
        institutionName: 'Public Utilities Regulatory Commission',
        shortName: 'PURC',
        acronym: 'PURC',
        alertRequested: true,
        alertStatus: 'DELIVERED',
        alertMethodUsed: 'Direct Platform Channel',
        deliveryTimestamp: '2026-08-19T16:46:00Z'
      }
    ],
    suggestedInstitutions: ['Cape Coast Metropolitan Assembly'],
    urgency: 'HIGH',
    severity: 'MODERATE',
    hashtags: ['CapeCoast', 'GWCL', 'WaterShortage', 'Kotokuraba', 'CentralRegion'],
    visibility: 'public',
    moderationStatus: 'approved',
    credibilitySignals: {
      confirmationsCount: 31,
      evidenceCount: 2,
      hasMedia: true,
      hasLocation: true,
      institutionalAwarenessScore: 88
    },
    engagement: {
      views: 1120,
      reposts: 19,
      shares: 48,
      confirmations: 31,
      comments: 14
    },
    userConfirmed: false,
    userBookmarked: false,
    userReposted: false,
    officialResponses: [
      {
        id: 'resp-gwcl-1',
        postId: 'post-cape-coast-water-1',
        institutionId: 'gwcl-ghana',
        institutionName: 'Ghana Water Company Limited (GWCL)',
        institutionLogo: 'https://images.unsplash.com/photo-1527061011665-3652c757a4d4?w=150&auto=format&fit=crop&q=80',
        responseType: 'ACTION_TAKEN',
        message: 'GWCL Central Region maintenance unit has isolated the Kotokuraba distribution valve to stop the overflow. Replacement ductile iron pipe sections are being installed today. Full pressure restoration estimated by 6:00 PM.',
        official: true,
        verified: true,
        responderName: 'Proscovia Ofori',
        responderTitle: 'Public Relations Officer, GWCL Central Region',
        createdAt: '2026-08-19T19:00:00Z'
      }
    ],
    communityEvidence: [],
    createdAt: '2026-08-19T15:30:00Z',
    updatedAt: '2026-08-19T19:00:00Z'
  }
];

export const INITIAL_NOTIFICATIONS = [
  {
    id: 'notif-1',
    userId: 'user-kofi-mensah',
    type: 'INSTITUTION_RESPONSE' as const,
    title: 'Official Response from NADMO',
    message: 'NADMO responded to your report on Odawna Market Flooding: "Rapid Response Team has arrived with dewatering pumps..."',
    postId: 'post-circle-flood-1',
    institutionName: 'NADMO',
    read: false,
    createdAt: '2026-08-20T03:10:00Z'
  },
  {
    id: 'notif-2',
    userId: 'user-kofi-mensah',
    type: 'CONFIRMATION_SPIKE' as const,
    title: '47 citizens confirmed your observation',
    message: 'Your report "Odaw Drain overflowing at Odawna Market" has gained massive community momentum in Accra.',
    postId: 'post-circle-flood-1',
    read: false,
    createdAt: '2026-08-20T03:30:00Z'
  },
  {
    id: 'notif-3',
    userId: 'user-current',
    type: 'EMERGENCY_ALERT' as const,
    title: 'Urgent Weather Advisory for Greater Accra & Volta',
    message: 'Ghana Meteorological Agency warns of persistent heavy thunderstorms and localized flash floods across coastal belt.',
    read: false,
    createdAt: '2026-08-20T01:00:00Z'
  }
];
