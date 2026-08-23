import { SocialSharePackage, CreatorContext, CleanMediaAsset } from '../types';

export function buildTikTokPackage(
  post: any,
  response: any | null,
  shortUrl: string,
  context: CreatorContext = 'general'
): Partial<SocialSharePackage> {
  const locationStr = `${post.district}, ${post.region}`;
  const confirmations = post.confirmations_count || post.engagement?.confirmations || 1;
  const instName = response?.institutionName || post.institutionTags?.[0]?.shortName || 'Authorities';
  const districtStr = (post.district || 'Ghana').replace(/\s+/g, '');

  let hook = `Imagine living in ${locationStr} and having to deal with THIS every day...`;
  if (context === 'reaction') {
    hook = `Look at what citizens in ${locationStr} just exposed on Speak Up Ghana!`;
  } else if (context === 'investigation') {
    hook = `Is ${instName} listening? Here is what is happening right now in ${locationStr}...`;
  } else if (context === 'news') {
    hook = `BREAKING: Major civic alert reported in ${locationStr} with ${confirmations} citizen confirmations.`;
  } else if (response) {
    hook = `${response.institutionName} JUST RESPONDED to the citizen report in ${locationStr}!`;
  }

  const caption = response
    ? `${hook}\n\n${instName} has released an official statement regarding "${post.title}".\n\n📌 Status: ${response.resolutionStatus || 'IN PROGRESS'}\n🔗 Full official response & evidence in bio: ${shortUrl}\n\n#SpeakUpGhana #Ghana #Accountability #${instName.replace(/\s+/g, '')} #GhanaTikTok`
    : `${hook}\n\nResidents in ${locationStr} report: "${post.title}". Over ${confirmations} citizens have independently confirmed this.\n\n🔗 Read original report + track response in bio: ${shortUrl}\n\n#SpeakUpGhana #Ghana #Accountability #${districtStr} #GhanaTikTok`;

  const videoMedia = post.media?.find((m: any) => m.type === 'video');
  const imageMedia = post.media?.find((m: any) => m.type === 'image');
  const audioMedia = post.media?.find((m: any) => m.type === 'audio');

  const primaryMediaType = videoMedia ? 'video' : audioMedia ? 'audio' : imageMedia ? 'image' : 'text';

  const cleanMediaAssets: CleanMediaAsset[] = (post.media || []).map((m: any) => ({
    id: m.id || `media-${Math.random().toString(36).substring(2, 7)}`,
    type: m.type || 'image',
    url: m.url?.startsWith('/uploads/original') ? m.url.replace('/uploads/original', '/uploads/public') : m.url,
    thumbnailUrl: m.thumbnail_url || m.url,
    mimeType: m.mime_type || (m.type === 'video' ? 'video/mp4' : m.type === 'audio' ? 'audio/mpeg' : 'image/jpeg'),
    caption: m.caption || post.title,
    isPiiStripped: true
  }));

  return {
    platform: 'tiktok',
    creatorContext: context,
    primaryMediaType,
    headline: hook,
    caption,
    body: caption,
    hashtags: ['#SpeakUpGhana', '#Ghana', '#Accountability', '#GhanaTikTok', '#Kumasi', '#Accra', `#${districtStr}`],
    callToAction: `Full citizen report + track updates: ${shortUrl}`,
    shortUrl,
    canonicalUrl: shortUrl,
    pinnedComment: response
      ? `🚨 Read full verified official communiqué from ${response.institutionName} + follow action timeline: ${shortUrl}`
      : `🚨 Have you seen or experienced this in ${locationStr}? Confirm your experience on Speak Up Ghana: ${shortUrl}`,
    cleanMediaAssets,
    videoOverlayConfig: {
      topBanner: response ? 'GHANA STATE COMMUNIQUÉ' : 'SPEAK UP GHANA - CITIZEN REPORT',
      locationBadge: `📍 ${locationStr}`,
      institutionBadge: `🏛️ ${instName}`,
      citizenCountBadge: `👥 ${confirmations} Citizens Confirmed`,
      bottomCta: `Link in bio / visit ${shortUrl}`,
      aspectRatio: '9:16'
    },
    mediaSummary: {
      video9x16Url: videoMedia?.url || post.media?.[0]?.url,
      story9x16Url: post.media?.[0]?.url,
      image1x1Url: post.media?.[0]?.url
    }
  };
}

