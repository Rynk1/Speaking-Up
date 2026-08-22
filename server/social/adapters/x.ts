import { SocialSharePackage, CreatorContext } from '../types';

export function buildXPackage(
  post: any,
  response: any | null,
  shortUrl: string,
  context: CreatorContext = 'general'
): Partial<SocialSharePackage> {
  const locationStr = `${post.district}, ${post.region}`;
  const instTags = post.institutionTags?.map((t: any) => `@${(t.acronym || t.shortName || '').replace(/\s+/g, '')}`).join(' ') || '';

  if (response) {
    const singlePost = `🏛️ Statement from ${response.institutionName} on "${post.title}" in ${locationStr}: "${(response.statementTitle || response.message).slice(0, 110)}..."\n\nFull official response & timeline:\n${shortUrl}\n\n#SpeakUpGhana #GhanaCivic`;

    const threadParts = [
      `1/4 🏛️ OFFICIAL STATEMENT: ${response.institutionName} has released an official response regarding "${post.title}" reported by citizens in ${locationStr}.\n\n#SpeakUpGhana`,
      `2/4 📢 STATEMENT EXCERPT:\n"${response.statementTitle || response.message.slice(0, 200)}"\n\nRef: ${response.referenceNumber || 'N/A'}`,
      `3/4 📍 CONTEXT:\nReported Location: ${locationStr}\nCitizen Confirmations: ${post.confirmations_count || 1}`,
      `4/4 🔎 Read full verified official response, action timeline, and submit citizen updates:\n${shortUrl}`
    ];

    return {
      platform: 'x',
      creatorContext: context,
      headline: `X Post: ${response.institutionName}`,
      caption: singlePost,
      threadParts,
      hashtags: ['#SpeakUpGhana', '#GhanaCivic', '#PublicRecord'],
      callToAction: `Read full response: ${shortUrl}`,
      shortUrl,
      canonicalUrl: shortUrl
    };
  }

  const singlePost = `🚨 Residents in ${locationStr} are raising concerns about ${post.title}.\n\n${instTags ? `${instTags} notified.\n` : ''}📍 ${locationStr}\n\nSee report + track updates:\n${shortUrl}\n\n#SpeakUpGhana`;

  const threadParts = [
    `1/5 🚨 CITIZEN REPORT: Residents in ${locationStr} are reporting "${post.title}".\n\n#SpeakUpGhana`,
    `2/5 📋 DETAILS:\n"${post.content.slice(0, 220)}..."`,
    `3/5 📍 LOCATION & VERIFICATION:\n${locationStr}\n👥 ${post.confirmations_count || post.engagement?.confirmations || 1} independent citizen confirmations.`,
    `4/5 🏛️ INSTITUTION ALERT:\nNotified: ${post.institutionTags?.map((t: any) => t.shortName).join(', ') || 'Relevant Authorities'}`,
    `5/5 🔎 Follow updates, see evidence, and confirm your experience on Speak Up Ghana:\n${shortUrl}`
  ];

  return {
    platform: 'x',
    creatorContext: context,
    headline: `X Post: ${post.title}`,
    caption: singlePost,
    threadParts,
    hashtags: ['#SpeakUpGhana', '#GhanaNews', '#CivicAction'],
    callToAction: `See report & updates: ${shortUrl}`,
    shortUrl,
    canonicalUrl: shortUrl
  };
}
