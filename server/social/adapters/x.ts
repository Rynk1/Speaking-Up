import { SocialSharePackage, CreatorContext, CleanMediaAsset } from '../types';

export function buildXPackage(
  post: any,
  response: any | null,
  shortUrl: string,
  context: CreatorContext = 'general'
): Partial<SocialSharePackage> {
  const locationStr = `${post.district}, ${post.region}`;
  const confirmations = post.confirmations_count || post.engagement?.confirmations || 1;
  const instTags = post.institutionTags?.map((t: any) => `@${(t.acronym || t.shortName || '').replace(/[^a-zA-Z0-9_]/g, '')}`).filter(Boolean).join(' ') || '';

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
    const singlePost = `🏛️ Statement from ${response.institutionName} on "${post.title}" in ${locationStr}: "${(response.statementTitle || response.message).slice(0, 110)}..."\n\nFull official response & timeline:\n${shortUrl}\n\n#SpeakUpGhana #GhanaCivic`;

    const threadParts = [
      `1/4 🏛️ OFFICIAL STATEMENT: ${response.institutionName} has released an official response regarding "${post.title}" reported by citizens in ${locationStr}.\n\n#SpeakUpGhana`,
      `2/4 📢 STATEMENT EXCERPT:\n"${response.statementTitle || response.message.slice(0, 200)}"\n\n📌 Ref: ${response.referenceNumber || 'N/A'}\n🎯 Status: ${response.resolutionStatus || 'IN PROGRESS'}`,
      `3/4 📍 CONTEXT & EVIDENCE:\nReported Location: ${locationStr}\nCitizen Confirmations: ${confirmations}\n${videoMedia ? '📹 Video evidence attached in public record.' : ''}`,
      `4/4 🔎 Read full verified official response, action timeline, and submit citizen updates:\n${shortUrl}`
    ];

    return {
      platform: 'x',
      creatorContext: context,
      primaryMediaType,
      headline: `X Post: ${response.institutionName}`,
      caption: singlePost,
      threadParts,
      cleanMediaAssets,
      hashtags: ['#SpeakUpGhana', '#GhanaCivic', '#PublicRecord', '#Ghana'],
      callToAction: `Read full response: ${shortUrl}`,
      shortUrl,
      canonicalUrl: shortUrl,
      mediaSummary: {
        thumbnail16x9Url: post.media?.[0]?.url,
        video9x16Url: videoMedia?.url
      }
    };
  }

  const singlePost = `🚨 Residents in ${locationStr} are raising concerns about ${post.title}.\n\n${instTags ? `${instTags} notified.\n` : ''}📍 ${locationStr} (${confirmations} confirmations)\n\nSee verified evidence + track updates:\n${shortUrl}\n\n#SpeakUpGhana`;

  const threadParts = [
    `1/5 🚨 CITIZEN REPORT: Residents in ${locationStr} are reporting "${post.title}".\n\n#SpeakUpGhana`,
    `2/5 📋 DETAILS:\n"${post.content.slice(0, 220)}..."`,
    `3/5 📍 LOCATION & VERIFICATION:\n${locationStr}\n👥 ${confirmations} independent citizen confirmations on record.`,
    `4/5 🏛️ INSTITUTION ALERT:\nNotified: ${post.institutionTags?.map((t: any) => t.shortName).join(', ') || 'Relevant Authorities'} ${instTags}`,
    `5/5 🔎 Follow updates, see evidence, and confirm your experience on Speak Up Ghana:\n${shortUrl}`
  ];

  return {
    platform: 'x',
    creatorContext: context,
    primaryMediaType,
    headline: `X Post: ${post.title}`,
    caption: singlePost,
    threadParts,
    cleanMediaAssets,
    hashtags: ['#SpeakUpGhana', '#GhanaNews', '#CivicAction', '#Ghana'],
    callToAction: `See report & updates: ${shortUrl}`,
    shortUrl,
    canonicalUrl: shortUrl,
    mediaSummary: {
      thumbnail16x9Url: post.media?.[0]?.url,
      video9x16Url: videoMedia?.url
    }
  };
}

