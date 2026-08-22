import { SocialSharePackage, CreatorContext } from '../types';

export function buildTikTokPackage(
  post: any,
  response: any | null,
  shortUrl: string,
  context: CreatorContext = 'general'
): Partial<SocialSharePackage> {
  const locationStr = `${post.district}, ${post.region}`;

  let hook = `Imagine living in ${locationStr} and dealing with THIS every day...`;
  if (context === 'reaction') {
    hook = `Look at what citizens in ${locationStr} just exposed on Speak Up Ghana!`;
  } else if (context === 'investigation') {
    hook = `Is the authority listening? Here is what's happening right now in ${locationStr}...`;
  } else if (response) {
    hook = `${response.institutionName} JUST RESPONDED to the ongoing situation in ${locationStr}!`;
  }

  const instName = response?.institutionName || 'Authority';
  const districtStr = (post.district || 'Ghana').replace(/\s+/g, '');

  const caption = response
    ? `${hook}\n\n${instName} has released an official statement on "${post.title}".\n\nFull official response & evidence link in bio: ${shortUrl}\n\n#SpeakUpGhana #Ghana #Accountability #${instName.replace(/\s+/g, '')}`
    : `${hook}\n\nResidents in ${locationStr} report: "${post.title}". Over ${post.confirmations_count || post.engagement?.confirmations || 1} people have confirmed seeing this.\n\nRead original report + track response: ${shortUrl}\n\n#SpeakUpGhana #Ghana #Accountability #${districtStr}`;

  return {
    platform: 'tiktok',
    creatorContext: context,
    headline: hook,
    caption,
    body: caption,
    hashtags: ['#SpeakUpGhana', '#Ghana', '#Accountability', '#GhanaTikTok', '#Kumasi', '#Accra'],
    callToAction: `Full citizen report: ${shortUrl}`,
    shortUrl,
    canonicalUrl: shortUrl,
    mediaSummary: {
      video9x16Url: post.media?.find((m: any) => m.type === 'video')?.url || post.media?.[0]?.url
    }
  };
}
