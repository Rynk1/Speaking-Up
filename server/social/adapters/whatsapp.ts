import { SocialSharePackage, CreatorContext, CleanMediaAsset } from '../types';

export function buildWhatsAppPackage(
  post: any,
  response: any | null,
  shortUrl: string,
  context: CreatorContext = 'general'
): Partial<SocialSharePackage> {
  const locationStr = `${post.landmark ? post.landmark + ', ' : ''}${post.district} (${post.region})`;
  const instTags = post.institutionTags?.map((t: any) => t.shortName || t.acronym).join(', ') || 'Relevant Authorities';
  const confirmations = post.engagement?.confirmations || post.confirmations_count || 1;

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

  if (response) {
    const refStr = response.referenceNumber ? `[Ref: ${response.referenceNumber}]` : '';
    const instName = response.institutionName || 'Ghana State Authority';
    const respType = (response.responseType || 'OFFICIAL_STATEMENT').replace(/_/g, ' ');
    const statementText = response.statementTitle || (response.message ? response.message.slice(0, 180) : '');
    const headline = `🏛️ GHANA OFFICIAL COMMUNIQUÉ: ${instName}`;
    const caption = `*🏛️ GHANA OFFICIAL COMMUNIQUÉ: ${instName.toUpperCase()}*\n\n` +
      `*📌 Reference:* ${response.referenceNumber || 'N/A'}\n` +
      `*🎯 Directive/Status:* ${respType} (${response.resolutionStatus || 'IN PROGRESS'})\n` +
      `*📢 Statement:* "${statementText}..."\n\n` +
      `*📍 In Response To:* "${post.title}" (${locationStr})\n` +
      `*👥 Citizens Impacted:* ${confirmations} verified observations\n\n` +
      `*🔎 Read Full Verified Statement & Action Timeline:* \n${shortUrl}\n\n` +
      `_Shared via Speak Up Ghana — The Public Record Engine_`;

    return {
      platform: 'whatsapp',
      creatorContext: context,
      primaryMediaType,
      headline,
      caption,
      cleanMediaAssets,
      hashtags: ['#SpeakUpGhana', '#Accountability', '#GhanaCivic'],
      callToAction: 'Read full verified official statement & track actions on Speak Up',
      shortUrl,
      canonicalUrl: shortUrl,
      mediaSummary: {
        image1x1Url: post.media?.[0]?.url,
        video9x16Url: videoMedia?.url
      }
    };
  }

  const headline = `🚨 PUBLIC CIVIC REPORT: ${post.title}`;

  let prefix = '🚨 *CITIZEN REPORT*';
  if (context === 'reaction') prefix = '🗣️ *CITIZEN REACTION & REPORT*';
  if (context === 'investigation') prefix = '🔍 *CIVIC INVESTIGATION ALERT*';

  const caption = `${prefix}\n\n` +
    `*Issue:* "${post.title}"\n\n` +
    `*📍 Location:* ${locationStr}\n` +
    `*👥 Citizen Confirmations:* ${confirmations} residents verified this on Speak Up.\n` +
    `*🏛️ Notified Authority:* ${instTags}\n\n` +
    `*🔎 Inspect evidence & confirm if you are affected:* \n${shortUrl}\n\n` +
    `_Shared via Speak Up Ghana_`;

  return {
    platform: 'whatsapp',
    creatorContext: context,
    primaryMediaType,
    headline,
    caption,
    cleanMediaAssets,
    hashtags: ['#SpeakUpGhana', '#Ghana', '#CivicAction'],
    callToAction: 'See full report & confirm your observation on Speak Up',
    shortUrl,
    canonicalUrl: shortUrl,
    mediaSummary: {
      image1x1Url: post.media?.[0]?.url,
      video9x16Url: videoMedia?.url
    }
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
  const confirmations = post.engagement?.confirmations || post.confirmations_count || 1;

  const caption = `🚨 *SPEAK UP GHANA* 🚨\n\n*${title}*\n📍 ${locationStr} (${confirmations} confirmations)\n\n👉 Tap link to see verified evidence:\n${shortUrl}`;

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
    platform: 'whatsapp_status',
    creatorContext: context,
    primaryMediaType,
    headline: `WhatsApp Status Visual: ${title}`,
    caption,
    cleanMediaAssets,
    hashtags: ['#SpeakUpGhana'],
    callToAction: 'View full report: ' + shortUrl,
    shortUrl,
    canonicalUrl: shortUrl,
    storyCardConfig: {
      title,
      location: locationStr,
      institution: response ? response.institutionName : (post.institutionTags?.[0]?.shortName || 'Authorities'),
      category: post.category || 'Civic',
      status: response ? `OFFICIAL: ${response.resolutionStatus || 'IN PROGRESS'}` : 'CITIZEN REPORT',
      confirmations,
      isOfficial: Boolean(response),
      mediaUrl: post.media?.[0]?.url,
      mediaType: primaryMediaType,
      qrCodeTargetUrl: shortUrl,
      district: post.district || '',
      region: post.region || ''
    },
    mediaSummary: {
      story9x16Url: post.media?.[0]?.url,
      video9x16Url: videoMedia?.url
    }
  };
}

