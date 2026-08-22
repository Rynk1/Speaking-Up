import { SocialSharePackage, CreatorContext } from '../types';

export function buildWhatsAppPackage(
  post: any,
  response: any | null,
  shortUrl: string,
  context: CreatorContext = 'general'
): Partial<SocialSharePackage> {
  const locationStr = `${post.landmark ? post.landmark + ', ' : ''}${post.district} (${post.region})`;
  const instTags = post.institutionTags?.map((t: any) => t.shortName || t.acronym).join(', ') || 'Relevant Authorities';

  if (response) {
    const refStr = response.referenceNumber ? `[Ref: ${response.referenceNumber}]` : '';
    const instName = response.institutionName || 'Ghana State Authority';
    const respType = (response.responseType || 'OFFICIAL_STATEMENT').replace(/_/g, ' ');
    const statementText = response.statementTitle || (response.message ? response.message.slice(0, 180) : '');
    const headline = `🏛️ GHANA OFFICIAL COMMUNIQUÉ: ${instName}`;
    const caption = `📌 Authority: ${instName} ${refStr}\n🎯 Directive: ${respType}\n📢 Statement: "${statementText}..."\n\n📍 In response to citizen issue: "${post.title}" (${locationStr})\n\n🔎 Read full verified official statement & track actions:\n${shortUrl}\n\n#SpeakUpGhana #Accountability`;

    return {
      platform: 'whatsapp',
      creatorContext: context,
      headline,
      caption,
      hashtags: ['#SpeakUpGhana', '#Accountability', '#GhanaCivic'],
      callToAction: 'Read full verified official statement & track actions on Speak Up',
      shortUrl,
      canonicalUrl: shortUrl
    };
  }

  const headline = `🚨 PUBLIC CIVIC REPORT: ${post.title}`;
  const confirmations = post.engagement?.confirmations || post.confirmations_count || 1;

  let prefix = '🚨 PUBLIC ISSUE';
  if (context === 'reaction') prefix = '🗣️ CITIZEN REACTION & REPORT';
  if (context === 'investigation') prefix = '🔍 CIVIC INVESTIGATION REPORT';

  const caption = `${prefix}\n\nResidents in ${locationStr} are reporting:\n\n"${post.title}"\n\n📍 Location: ${locationStr}\n👥 ${confirmations} citizens independently observed this issue.\n🏛️ Institution notified: ${instTags}\n\n🔎 See full report & confirm your observation:\n${shortUrl}\n\n#SpeakUpGhana #GhanaCivic`;

  return {
    platform: 'whatsapp',
    creatorContext: context,
    headline,
    caption,
    hashtags: ['#SpeakUpGhana', '#Ghana', '#CivicAction'],
    callToAction: 'See full report & confirm your observation on Speak Up',
    shortUrl,
    canonicalUrl: shortUrl
  };
}

export function buildWhatsAppStatusPackage(
  post: any,
  response: any | null,
  shortUrl: string,
  context: CreatorContext = 'general'
): Partial<SocialSharePackage> {
  const locationStr = `${post.district}, ${post.region}`;
  const title = response ? (response.statementTitle || response.institutionName) : post.title;

  const caption = `🚨 SPEAK UP GHANA 🚨\n\n${title}\n📍 ${locationStr}\n\nTap link / type short URL to read full evidence:\n${shortUrl}`;

  return {
    platform: 'whatsapp_status',
    creatorContext: context,
    headline: `WhatsApp Status Visual: ${title}`,
    caption,
    hashtags: ['#SpeakUpGhana'],
    callToAction: 'View full report: ' + shortUrl,
    shortUrl,
    canonicalUrl: shortUrl,
    mediaSummary: {
      story9x16Url: post.media?.[0]?.url || '/assets/status-card-template.jpg'
    }
  };
}
