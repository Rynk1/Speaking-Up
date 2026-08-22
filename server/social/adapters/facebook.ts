import { SocialSharePackage, CreatorContext } from '../types';

export function buildFacebookPackage(
  post: any,
  response: any | null,
  shortUrl: string,
  context: CreatorContext = 'general'
): Partial<SocialSharePackage> {
  const locationStr = `${post.landmark ? post.landmark + ', ' : ''}${post.district} (${post.region})`;

  if (response) {
    const caption = `🏛️ OFFICIAL STATEMENT FROM ${response.institutionName.toUpperCase()}\n\n` +
      `Regarding citizen report in ${locationStr}: "${post.title}"\n\n` +
      `STATEMENT SUMMARY:\n` +
      `"${response.statementTitle || response.message.slice(0, 250)}..."\n\n` +
      `Resolution Status: ${response.resolutionStatus || 'IN PROGRESS'}\n` +
      `Reference Number: ${response.referenceNumber || 'N/A'}\n\n` +
      `Read the full verified statement and track ongoing institutional actions on Speak Up Ghana:\n${shortUrl}\n\n` +
      `#SpeakUpGhana #GhanaCivic #PublicService`;

    return {
      platform: 'facebook',
      creatorContext: context,
      headline: `Official Statement: ${response.institutionName}`,
      caption,
      hashtags: ['#SpeakUpGhana', '#GhanaCivic', '#Accountability'],
      callToAction: `Read statement on Speak Up: ${shortUrl}`,
      shortUrl,
      canonicalUrl: shortUrl
    };
  }

  const caption = `🚨 CITIZEN REPORT: ${post.title}\n\n` +
    `Residents in ${locationStr} have submitted a verified civic observation:\n\n` +
    `"${post.content.slice(0, 300)}..."\n\n` +
    `📍 Location: ${locationStr}\n` +
    `👥 Citizens seeing this too: ${post.confirmations_count || post.engagement?.confirmations || 1}\n` +
    `🏛️ Responsible institution notified: ${post.institutionTags?.map((t: any) => t.shortName || t.acronym).join(', ') || 'Authorities'}\n\n` +
    `Read full details, inspect citizen evidence, and confirm if you are affected:\n${shortUrl}\n\n` +
    `#SpeakUpGhana #GhanaCivic #${post.category.replace(/\s+/g, '')}`;

  return {
    platform: 'facebook',
    creatorContext: context,
    headline: `Facebook Post: ${post.title}`,
    caption,
    hashtags: ['#SpeakUpGhana', '#GhanaCivic'],
    callToAction: `Read report on Speak Up: ${shortUrl}`,
    shortUrl,
    canonicalUrl: shortUrl
  };
}

export function buildFacebookGroupPackage(
  post: any,
  response: any | null,
  shortUrl: string,
  context: CreatorContext = 'general'
): Partial<SocialSharePackage> {
  const locationStr = `${post.district}, ${post.region}`;

  const caption = response
    ? `Has anyone seen the official response from ${response.institutionName} regarding "${post.title}" in ${locationStr}?\n\n` +
      `They stated: "${response.statementTitle || response.message.slice(0, 180)}..."\n\n` +
      `Read the full statement and share your thoughts:\n${shortUrl}`
    : `Has anyone else in ${locationStr} experienced this?\n\n` +
      `A citizen has reported "${post.title}" around ${locationStr}.\n\n` +
      `See the evidence and confirm your experience on Speak Up Ghana:\n${shortUrl}`;

  return {
    platform: 'facebook_group',
    creatorContext: context,
    headline: `Facebook Group Discussion`,
    caption,
    hashtags: ['#SpeakUpGhana'],
    callToAction: `Join discussion: ${shortUrl}`,
    shortUrl,
    canonicalUrl: shortUrl
  };
}
