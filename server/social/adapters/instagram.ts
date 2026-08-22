import { SocialSharePackage, CreatorContext } from '../types';

export function buildInstagramPackage(
  post: any,
  response: any | null,
  shortUrl: string,
  context: CreatorContext = 'general'
): Partial<SocialSharePackage> {
  const locationStr = `${post.district}, ${post.region}`;

  const caption = response
    ? `🏛️ OFFICIAL STATEMENT: ${response.institutionName}\n\n` +
      `Regarding citizen report in ${locationStr}: "${post.title}"\n\n` +
      `STATEMENT EXCERPT:\n"${response.statementTitle || response.message.slice(0, 220)}..."\n\n` +
      `📍 Location: ${locationStr}\n` +
      `📌 Reference: ${response.referenceNumber || 'N/A'}\n\n` +
      `🔗 Read full verified official response & action timeline on Speak Up Ghana (Link in Bio / Story):\n${shortUrl}\n\n` +
      `#SpeakUpGhana #GhanaCivic #Accountability #PublicRecord`
    : `🚨 CITIZEN REPORT: ${post.title}\n\n` +
      `Residents in ${locationStr} are raising urgent awareness about this issue.\n\n` +
      `📍 Location: ${locationStr}\n` +
      `👥 ${post.confirmations_count || post.engagement?.confirmations || 1} Independent Citizen Confirmations\n` +
      `🏛️ Tagged Authority: ${post.institutionTags?.map((t: any) => t.shortName || t.acronym).join(', ') || 'Authorities'}\n\n` +
      `🔗 See original citizen evidence & track institution response (Link in Bio):\n${shortUrl}\n\n` +
      `#SpeakUpGhana #GhanaCivic #${post.category.replace(/\s+/g, '')} #${post.district.replace(/\s+/g, '')}`;

  return {
    platform: 'instagram',
    creatorContext: context,
    headline: response ? `Instagram Post: ${response.institutionName}` : `Instagram Post: ${post.title}`,
    caption,
    hashtags: ['#SpeakUpGhana', '#GhanaCivic', '#GhanaNews', '#Accountability'],
    callToAction: 'Read full report via Link in Bio / Story',
    shortUrl,
    canonicalUrl: shortUrl,
    mediaSummary: {
      image1x1Url: post.media?.[0]?.url || '/assets/instagram-square-template.jpg',
      story9x16Url: post.media?.[0]?.url || '/assets/instagram-story-template.jpg'
    }
  };
}
