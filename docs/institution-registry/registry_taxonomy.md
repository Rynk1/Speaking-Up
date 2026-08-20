# Institution Directory & Responsibility Taxonomy (Ghana Civic Awareness Network)

## Authoritative Register & Research Standards
In compliance with PRD Section 218 & 219, all registered institutions have been research-mapped with verified mandates, official website domains, channels, and responsibility taxonomies.

| Institution | Acronym | Primary Mandate | Categories Covered | Alert Method | Verified Contact | Source Document |
|-------------|---------|-----------------|-------------------|--------------|------------------|-----------------|
| Ghana Police Service | GPS / MTTD | Public safety, emergency response, crime prevention, highway traffic control. | Public Safety, Cybercrime, Emergency | `DIRECT_API` | `18555 / 191`, `info@police.gov.gh` | Police Service Act (Act 321) |
| National Disaster Management Organisation | NADMO | Disaster prevention, flood relief, emergency response. | Flooding, Emergency & Disaster | `DIRECT_API` | `0302-772926`, `info@nadmo.gov.gh` | NADMO Act 2016 (Act 927) |
| Electricity Company of Ghana | ECG | Power distribution, transformer repair, billing, outages. | Power & Electricity (Dumsor) | `OFFICIAL_EMAIL` | `0302-611611`, `callcentre@ecggh.com` | PURC Act 1997 (Act 538) |
| Public Utilities Regulatory Commission | PURC | Consumer utility rights, water & electricity regulatory oversight. | Power, Water Supply | `DIRECT_API` | `0302-246000`, `info@purc.com.gh` | PURC Act 1997 (Act 538) |
| Ghana Water Company Limited | GWCL | Urban water supply, pipe burst repair, water quality. | Water Supply & Quality | `WHATSAPP_LINE` | `0800-40000`, `info@gwcl.com.gh` | GWCL Act / PURC Framework |
| Cyber Security Authority | CSA | National cyber security incident handling, online fraud, hacking. | Cybercrime & Online Fraud | `DIRECT_API` | `292`, `report@csa.gov.gh` | Cybersecurity Act 2020 (Act 1038) |
| Commission on Human Rights and Administrative Justice | CHRAJ | Human rights violations, administrative injustice, corruption. | Human Rights & Corruption | `OFFICIAL_EMAIL` | `0302-662150`, `info@chraj.gov.gh` | 1992 Constitution / CHRAJ Act 456 |
| Ghana Highway Authority | GHA | National trunk roads maintenance, highway potholes, bridges. | Infrastructure & Roads | `OFFICIAL_EMAIL` | `0302-663922`, `info@highways.gov.gh` | GHA Act 1997 (Act 540) |
| Accra Metropolitan Assembly | AMA / MMDAs | Local sanitation, waste management, market drainage, local governance. | Sanitation & Waste, Local Infra | `OFFICIAL_EMAIL` | `0302-663947`, `info@ama.gov.gh` | Local Governance Act 2016 (Act 936) |
| Environmental Protection Agency | EPA | Pollution control, Illegal mining (Galamsey), environmental safety. | Environment & Galamsey | `OFFICIAL_EMAIL` | `0302-664697`, `info@epa.gov.gh` | EPA Act 1994 (Act 490) |

---

## Routing & Dispatch Architecture
When a citizen creates a report or records a voice note:
1. Category and location are mapped against institution mandates.
2. The platform matches national bodies (e.g. ECG/PURC for Dumsor) alongside local assemblies (e.g. AMA/TaMA for local drainage).
3. Alerts are logged into the `post_institution_tags` database with explicit status (`DELIVERED`, `SENT`, `NOT_CONFIGURED`, `FAILED`). Success is never simulated.
