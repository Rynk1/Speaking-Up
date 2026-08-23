import { SocialSharePackage, CreatorContext, CleanMediaAsset } from '../types';

export function buildYouTubePackage(
  post: any,
  response: any | null,
  shortUrl: string,
  context: CreatorContext = 'general'
): Partial<SocialSharePackage> {
  const locationStr = `${post.district}, ${post.region}`;
  const instTags = post.institutionTags?.map((t: any) => t.shortName || t.acronym).join(', ') || 'Ghana Authorities';
  const confirmations = post.confirmations_count || post.engagement?.confirmations || 1;

  let titlePrefix = 'Residents Raise Alarm Over';
  if (context === 'reaction') titlePrefix = 'REACTION:';
  if (context === 'investigation') titlePrefix = 'INVESTIGATION:';
  if (context === 'news') titlePrefix = 'BREAKING REPORT:';

  const instName = response?.institutionName || 'Authority';
  const categoryStr = (post.category || 'Civic Issue').replace(/\s+/g, '');

  const headline = response
    ? `OFFICIAL RESPONSE: ${instName} Issues Statement on "${post.title}"`
    : `${titlePrefix} ${post.title} in ${locationStr}`;

  const description = response
    ? `Official statement released by ${instName} regarding "${post.title}" reported by residents in ${locationStr}.\n\n` +
      `📌 Directive/Response: "${response.statementTitle || (response.message ? response.message.slice(0, 200) : '')}..."\n` +
      `📌 Status: ${response.resolutionStatus || 'IN PROGRESS'}\n` +
      `📌 Reference Number: ${response.referenceNumber || 'N/A'}\n\n` +
      `🔎 Read original citizen report + full verified official communiqué on Speak Up Ghana:\n${shortUrl}\n\n` +
      `#SpeakUpGhana #${instName.replace(/\s+/g, '')} #GhanaNews #Accountability #Ghana`
    : `Residents in ${locationStr} have reported ongoing civic concerns regarding "${post.title}".\n\n` +
      `Key Public Details:\n` +
      `• Location: ${locationStr}\n` +
      `• Tagged Institution: ${instTags}\n` +
      `• Independent Citizen Confirmations: ${confirmations}\n\n` +
      `🔎 Read the original citizen report, inspect verified evidence, and track updates on Speak Up Ghana:\n${shortUrl}\n\n` +
      `#SpeakUpGhana #GhanaNews #Accountability #${categoryStr} #Ghana`;

  const pinnedComment = response
    ? `🔎 Original report + verified official statement: ${shortUrl}\nFollow state response and add your verified observation on Speak Up Ghana.`
    : `🔎 Original citizen report + official responses: ${shortUrl}\nHave you experienced this in ${locationStr}? Add your verified observation on Speak Up Ghana.`;

  const cleanMediaAssets: CleanMediaAsset[] = (post.media || []).map((m: any) => ({
    id: m.id || `media-${Math.random().toString(36).substring(2, 7)}`,
    type: m.type || 'image',
    url: m.url?.startsWith('/uploads/original') ? m.url.replace('/uploads/original', '/uploads/public') : m.url,
    thumbnailUrl: m.thumbnail_url || m.url,
    mimeType: m.mime_type || (m.type === 'video' ? 'video/mp4' : m.type === 'audio' ? 'audio/mpeg' : 'image/jpeg'),
    caption: m.caption || post.title,
    isPiiStripped: true
  }));

  const videoMedia = post.media?.find((m: any) => m.type === 'video');
  const audioMedia = post.media?.find((m: any) => m.type === 'audio');
  const imageMedia = post.media?.find((m: any) => m.type === 'image');
  const primaryMediaType = videoMedia ? 'video' : audioMedia ? 'audio' : imageMedia ? 'image' : 'text';

  return {
    platform: 'youtube',
    creatorContext: context,
    primaryMediaType,
    headline,
    caption: description,
    pinnedComment,
    cleanMediaAssets,
    hashtags: ['#SpeakUpGhana', '#GhanaNews', '#Accountability', '#GhanaCivic'],
    callToAction: `Read original report on Speak Up Ghana: ${shortUrl}`,
    shortUrl,
    canonicalUrl: shortUrl,
    mediaSummary: {
      thumbnail16x9Url: post.media?.[0]?.url,
      video9x16Url: videoMedia?.url
    }
  };
}

