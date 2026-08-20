# Social Discovery Engine & Zero-Follower Algorithm

## Core Equation
The platform's discovery engine optimizes for:
$$\text{Civic Impact} = \text{Proximity} \times \text{Urgency} \times \text{Community Confirmations} \times \text{Recency}$$

## Zero-Follower Discovery Guarantee (PRD Section 17 & 208)
- Unlike traditional social networks where post reach depends on author follower counts, Speak Up assigns **0 weight** to follower counts in feed ranking.
- A report posted by a user with **0 followers** receives identical feed indexing and geographic visibility as a report by a high-profile user.

## Feed Streams
1. **Nearby & Community Hot**: Ranked by proximity, community confirmations ("I'm seeing this too"), and recent reposts.
2. **Urgent Threats**: Filtered for `CRITICAL` or `HIGH` urgency reports (e.g. open drains, unlit highway pits, active floods).
3. **Official Responses**: Posts that have received official verified responses from state institutions.
4. **All Recent**: Chronological feed of approved public posts.
