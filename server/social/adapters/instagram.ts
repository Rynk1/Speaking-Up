import { SocialSharePackage, CreatorContext, CleanMediaAsset } from '../types';

export function buildInstagramPackage(
  post: any,
  response: any | null,
  shortUrl: string,
  context: CreatorContext = 'general'
): Partial<SocialSharePackage> {
  const locationStr = `${post.district}, ${post.region}`;
  const confirmations = post.confirmations_count || post.engagement?.confirmations || 1;
  const instNames = post.institutionTags?.map((t: any) => t.shortName || t.acronym).join(', ') || 'Authorities';

  const caption = response
    ? `🏛️ OFFICIAL STATEMENT: ${response.institutionName}\n\n` +
      `Regarding citizen report in ${locationStr}: "${post.title}"\n\n` +
      `STATEMENT EXCERPT:\n"${response.statementTitle || response.message.slice(0, 220)}..."\n\n` +
      `📍 Location: ${locationStr}\n` +
      `📌 Reference: ${response.referenceNumber || 'N/A'}\n` +
      `🎯 Status: ${response.resolutionStatus || 'IN PROGRESS'}\n\n` +
      `🔗 Read full verified official response & action timeline on Speak Up Ghana (Link in Bio / Story):\n${shortUrl}\n\n` +
      `#SpeakUpGhana #GhanaCivic #Accountability #PublicRecord #Ghana`
    : `🚨 CITIZEN REPORT: ${post.title}\n\n` +
      `Residents in ${locationStr} are raising urgent awareness about this issue.\n\n` +
      `📍 Location: ${locationStr}\n` +
      `👥 ${confirmations} Independent Citizen Confirmations\n` +
      `🏛️ Tagged Authority: ${instNames}\n\n` +
      `🔗 See original citizen evidence & track institution response (Link in Bio / Story):\n${shortUrl}\n\n` +
      `#SpeakUpGhana #GhanaCivic #${(post.category || 'Civic').replace(/\s+/g, '')} #${(post.district || 'Ghana').replace(/\s+/g, '')}`;

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

  const carouselSlides = [
    {
      slideNumber: 1,
      title: response ? `OFFICIAL COMMUNIQUÉ: ${response.institutionName}` : `CITIZEN REPORT: ${post.title}`,
      body: response ? `Official response regarding citizen report in ${locationStr}.` : `Reported in ${locationStr} with ${confirmations} citizen confirmations.`,
      visualPrompt: 'Cover slide with bold high-contrast civic badge and title.'
    },
    {
      slideNumber: 2,
      title: response ? 'OFFICIAL DIRECTIVE' : 'THE CITIZEN OBSERVATION',
      body: response ? (response.statementTitle || response.message.slice(0, 200)) : post.content.slice(0, 200),
      visualPrompt: 'Evidence excerpt and key quote block.'
    },
    {
      slideNumber: 3,
      title: 'COMMUNITY VERIFICATION & REACH',
      body: `Location: ${locationStr}\nNotified Authority: ${instNames}\nIndependent Confirmations: ${confirmations}`,
      visualPrompt: 'Infographic slide with verification metrics.'
    },
    {
      slideNumber: 4,
      title: 'TAKE ACTION ON SPEAK UP GHANA',
      body: `Visit link in bio (${shortUrl}) to read the full report, verify your experience, and track state accountability.`,
      visualPrompt: 'Call to action slide with QR code and link.'
    }
  ];

  return {
    platform: 'instagram',
    creatorContext: context,
    primaryMediaType,
    headline: response ? `Instagram Post: ${response.institutionName}` : `Instagram Post: ${post.title}`,
    caption,
    hashtags: ['#SpeakUpGhana', '#GhanaCivic', '#GhanaNews', '#Accountability'],
    callToAction: 'Read full report via Link in Bio / Story',
    shortUrl,
    canonicalUrl: shortUrl,
    cleanMediaAssets,
    carouselSlides,
    storyCardConfig: {
      title: response ? `Official Response: ${response.institutionName}` : post.title,
      location: locationStr,
      institution: response ? response.institutionName : instNames,
      category: post.category || 'Civic Issue',
      status: response ? `OFFICIAL: ${response.resolutionStatus || 'IN PROGRESS'}` : 'CITIZEN VERIFIED',
      confirmations,
      isOfficial: Boolean(response),
      mediaUrl: post.media?.[0]?.url,
      mediaType: primaryMediaType,
      qrCodeTargetUrl: shortUrl,
      district: post.district || 'District',
      region: post.region || 'Region'
    },
    mediaSummary: {
      image1x1Url: post.media?.[0]?.url,
      story9x16Url: post.media?.[0]?.url,
      video9x16Url: videoMedia?.url
    }
  };
}

