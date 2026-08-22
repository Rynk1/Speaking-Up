import { SocialSharePackage, CreatorContext } from '../types';

export function buildYouTubePackage(
  post: any,
  response: any | null,
  shortUrl: string,
  context: CreatorContext = 'general'
): Partial<SocialSharePackage> {
  const locationStr = `${post.district}, ${post.region}`;
  const instTags = post.institutionTags?.map((t: any) => t.shortName || t.acronym).join(', ') || 'Ghana Authorities';

  let titlePrefix = 'Residents Raise Alarm Over';
  if (context === 'reaction') titlePrefix = 'REACTION:';
  if (context === 'investigation') titlePrefix = 'INVESTIGATION:';
  if (context === 'news') titlePrefix = 'BREAKING REPORT:';

  const instName = response?.institutionName || 'Authority';
  const categoryStr = (post.category || 'Civic Issue').replace(/\s+/g, '');

  const headline = response
    ? `OFFICIAL RESPONSE: ${instName} Issues Statement on ${post.title}`
    : `${titlePrefix} ${post.title} in ${locationStr}`;

  const description = response
    ? `Official statement released by ${instName} regarding "${post.title}" reported by residents in ${locationStr}.\n\n` +
      `📌 Directive/Response: "${response.statementTitle || (response.message ? response.message.slice(0, 200) : '')}..."\n\n` +
      `🔎 Read original citizen report + full verified official communiqué on Speak Up Ghana:\n${shortUrl}\n\n` +
      `#SpeakUpGhana #${instName.replace(/\s+/g, '')} #GhanaNews #Accountability`
    : `Residents in ${locationStr} have reported ongoing civic concerns regarding "${post.title}".\n\n` +
      `Key Details:\n` +
      `• Location: ${locationStr}\n` +
      `• Tagged Institution: ${instTags}\n` +
      `• Independent Citizen Confirmations: ${post.confirmations_count || post.engagement?.confirmations || 1}\n\n` +
      `🔎 Read the original citizen report, watch verified evidence, and track updates on Speak Up Ghana:\n${shortUrl}\n\n` +
      `#SpeakUpGhana #GhanaNews #Accountability #${categoryStr}`;

  const pinnedComment = response
    ? `🔎 Original report + verified official statement: ${shortUrl}\nFollow state response and add your verified observation.`
    : `🔎 Original citizen report + official responses: ${shortUrl}\nHave you experienced this in ${locationStr}? Add your verified observation on Speak Up Ghana.`;

  return {
    platform: 'youtube',
    creatorContext: context,
    headline,
    caption: description,
    pinnedComment,
    hashtags: ['#SpeakUpGhana', '#GhanaNews', '#Accountability', '#GhanaCivic'],
    callToAction: `Read original report on Speak Up Ghana: ${shortUrl}`,
    shortUrl,
    canonicalUrl: shortUrl,
    mediaSummary: {
      thumbnail16x9Url: post.media?.[0]?.url || '/assets/youtube-thumb-template.jpg'
    }
  };
}
