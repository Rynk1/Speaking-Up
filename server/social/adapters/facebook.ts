import { SocialSharePackage, CreatorContext, CleanMediaAsset } from '../types';

export function buildFacebookPackage(
  post: any,
  response: any | null,
  shortUrl: string,
  context: CreatorContext = 'general'
): Partial<SocialSharePackage> {
  const locationStr = `${post.landmark ? post.landmark + ', ' : ''}${post.district} (${post.region})`;
  const confirmations = post.confirmations_count || post.engagement?.confirmations || 1;
  const instNames = post.institutionTags?.map((t: any) => t.shortName || t.acronym).join(', ') || 'Authorities';

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
    const caption = `🏛️ OFFICIAL STATEMENT FROM ${response.institutionName.toUpperCase()}\n\n` +
      `Regarding citizen report in ${locationStr}: "${post.title}"\n\n` +
      `STATEMENT SUMMARY:\n` +
      `"${response.statementTitle || response.message.slice(0, 250)}..."\n\n` +
      `Resolution Status: ${response.resolutionStatus || 'IN PROGRESS'}\n` +
      `Reference Number: ${response.referenceNumber || 'N/A'}\n\n` +
      `Read the full verified statement and track ongoing institutional actions on Speak Up Ghana:\n${shortUrl}\n\n` +
      `#SpeakUpGhana #GhanaCivic #PublicService #Accountability`;

    return {
      platform: 'facebook',
      creatorContext: context,
      primaryMediaType,
      headline: `Official Statement: ${response.institutionName}`,
      caption,
      cleanMediaAssets,
      hashtags: ['#SpeakUpGhana', '#GhanaCivic', '#Accountability'],
      callToAction: `Read statement on Speak Up: ${shortUrl}`,
      shortUrl,
      canonicalUrl: shortUrl,
      mediaSummary: {
        image1x1Url: post.media?.[0]?.url,
        video9x16Url: videoMedia?.url
      }
    };
  }

  const caption = `🚨 CITIZEN REPORT: ${post.title}\n\n` +
    `Residents in ${locationStr} have submitted a verified civic observation:\n\n` +
    `"${post.content.slice(0, 300)}..."\n\n` +
    `📍 Location: ${locationStr}\n` +
    `👥 Citizens seeing this too: ${confirmations}\n` +
    `🏛️ Responsible institution notified: ${instNames}\n\n` +
    `Read full details, inspect verified evidence, and confirm if you are affected:\n${shortUrl}\n\n` +
    `#SpeakUpGhana #GhanaCivic #${(post.category || 'Civic').replace(/\s+/g, '')}`;

  return {
    platform: 'facebook',
    creatorContext: context,
    primaryMediaType,
    headline: `Facebook Post: ${post.title}`,
    caption,
    cleanMediaAssets,
    hashtags: ['#SpeakUpGhana', '#GhanaCivic'],
    callToAction: `Read report on Speak Up: ${shortUrl}`,
    shortUrl,
    canonicalUrl: shortUrl,
    mediaSummary: {
      image1x1Url: post.media?.[0]?.url,
      video9x16Url: videoMedia?.url
    }
  };
}

export function buildFacebookGroupPackage(
  post: any,
  response: any | null,
  shortUrl: string,
  context: CreatorContext = 'general'
): Partial<SocialSharePackage> {
  const locationStr = `${post.district}, ${post.region}`;

  const cleanMediaAssets: CleanMediaAsset[] = (post.media || []).map((m: any) => ({
    id: m.id || `media-${Math.random().toString(36).substring(2, 7)}`,
    type: m.type || 'image',
    url: m.url?.startsWith('/uploads/original') ? m.url.replace('/uploads/original', '/uploads/public') : m.url,
    thumbnailUrl: m.thumbnail_url || m.url,
    mimeType: m.mime_type || (m.type === 'video' ? 'video/mp4' : m.type === 'audio' ? 'audio/mpeg' : 'image/jpeg'),
    caption: m.caption || post.title,
    isPiiStripped: true
  }));

  const caption = response
    ? `Has anyone seen the official response from ${response.institutionName} regarding "${post.title}" in ${locationStr}?\n\n` +
      `They stated: "${response.statementTitle || response.message.slice(0, 180)}..."\n\n` +
      `Read the full statement and share your thoughts:\n${shortUrl}`
    : `Has anyone else in ${locationStr} experienced this?\n\n` +
      `A citizen has reported "${post.title}" around ${locationStr}.\n\n` +
      `See the verified evidence and confirm your experience on Speak Up Ghana:\n${shortUrl}`;

  return {
    platform: 'facebook_group',
    creatorContext: context,
    headline: `Facebook Group Discussion`,
    caption,
    cleanMediaAssets,
    hashtags: ['#SpeakUpGhana'],
    callToAction: `Join discussion: ${shortUrl}`,
    shortUrl,
    canonicalUrl: shortUrl
  };
}

