import { CreatorPack, CreatorContext, SocialPlatform, CreatorPackFile } from './types';
import { SocialContentBuilder } from './SocialContentBuilder';
import { ShareLinkService } from './ShareLinkService';

export class CreatorPackService {
  /**
   * Generates a complete Creator Pack bundle for bloggers, YouTubers, TikTok creators, and journalists
   */
  static async buildCreatorPack(
    post: any,
    response: any | null,
    creatorId?: string,
    context: CreatorContext = 'general'
  ): Promise<CreatorPack> {
    const packId = `pack-${post.id}-${Date.now().toString(36)}`;
    const linkInfo = ShareLinkService.generateReferralCode(
      post.id,
      response?.id,
      creatorId,
      'youtube',
      'creator-pack'
    );

    const locationStr = `${post.landmark ? post.landmark + ', ' : ''}${post.district}, ${post.region}`;
    const instNames = post.institutionTags?.map((t: any) => t.shortName || t.acronym).join(', ') || 'Relevant Ghanaian Authorities';

    const headline = response
      ? `OFFICIAL STATEMENT: ${response.institutionName} Responds to "${post.title}"`
      : `CITIZEN REPORT: ${post.title} (${locationStr})`;

    const shortSummary = response
      ? `Official statement released by ${response.institutionName} regarding citizen report in ${locationStr}: "${post.title}". Status: ${response.resolutionStatus || 'IN_PROGRESS'}.`
      : `Residents in ${locationStr} have reported "${post.title}". ${post.confirmations_count || 1} citizens independently confirmed this issue. Tagged: ${instNames}.`;

    const longSummary = `SPEAK UP GHANA CIVIC REPORT PACK\n\n` +
      `===================================================\n` +
      `ISSUE TITLE: ${post.title}\n` +
      `LOCATION: ${locationStr}\n` +
      `CATEGORY: ${post.category}\n` +
      `URGENCY: ${post.urgency || 'NORMAL'}\n` +
      `CITIZEN CONFIRMATIONS: ${post.confirmations_count || 1}\n` +
      `TAGGED INSTITUTIONS: ${instNames}\n` +
      `===================================================\n\n` +
      `CITIZEN OBSERVATION:\n"${post.content}"\n\n` +
      (response
        ? `===================================================\n` +
          `OFFICIAL INSTITUTION RESPONSE:\n` +
          `Institution: ${response.institutionName}\n` +
          `Spokesperson: ${response.responderName} (${response.responderTitle})\n` +
          `Reference Number: ${response.referenceNumber || 'N/A'}\n` +
          `Statement Title: ${response.statementTitle || 'Official Communiqué'}\n` +
          `Full Message: "${response.message}"\n` +
          `===================================================\n\n`
        : '') +
      `CANONICAL PUBLIC RECORD URL:\n${linkInfo.canonicalUrl}\n` +
      `TRACKED CREATOR LINK:\n${linkInfo.shortUrl}\n`;

    const hookText = response
      ? `🚨 BREAKING: ${response.institutionName} HAS JUST RESPONDED to the citizen report in ${locationStr}!`
      : `🚨 Imagine dealing with THIS on the road every day in ${locationStr}...`;

    const suggestedNarrationScript = response
      ? `[INTRO HOOK]\n"${hookText}"\n\n` +
        `[BODY]\n"Residents in ${locationStr} previously raised concerns over '${post.title}'. Today, ${response.institutionName} issued an official communiqué stating: '${(response.statementTitle || response.message).slice(0, 150)}...'\n\n` +
        `[OUTRO & CTA]\n"You can read the full verified official statement, inspect the action timeline, and submit your own updates on Speak Up Ghana using my link below!"`
      : `[INTRO HOOK]\n"${hookText}"\n\n` +
        `[BODY]\n"Residents in ${locationStr} have reported '${post.title}'. Over ${post.confirmations_count || 1} local residents have independently confirmed this observation on Speak Up Ghana, and ${instNames} has been alerted.\n\n` +
        `[OUTRO & CTA]\n"Check out the original citizen evidence, follow live institutional responses, and confirm your experience on Speak Up Ghana using my link below!"`;

    const hashtags = [
      '#SpeakUpGhana',
      '#GhanaNews',
      '#Accountability',
      '#CivicAction',
      `#${post.category.replace(/[^a-zA-Z0-9]/g, '')}`,
      `#${post.district.replace(/[^a-zA-Z0-9]/g, '')}`
    ];

    const attributionText = `Source: Speak Up Ghana — Original Citizen Report & Public Record (${linkInfo.shortUrl})`;

    const disclosures = {
      citizenAllegationNote: 'CITIZEN REPORT DISCLOSURE: Source material contains citizen observations submitted to Speak Up Ghana.',
      officialStatusNote: response
        ? `OFFICIAL STATEMENT VERIFIED: Statement published by ${response.institutionName} [Ref: ${response.referenceNumber || 'N/A'}].`
        : 'UNVERIFIED ALLEGATION: No official state response published yet.',
      creatorCommentaryDisclaimer: 'CREATOR COMMENTARY NOTICE: Commentary and reactions are produced independently by the creator.'
    };

    const quoteCardContent = {
      title: post.title,
      quote: response ? (response.statementTitle || response.message) : post.content,
      location: locationStr,
      institution: response ? response.institutionName : instNames,
      status: response ? `OFFICIAL: ${response.resolutionStatus || 'IN PROGRESS'}` : 'CITIZEN REPORT'
    };

    // Platform specific packages
    const platforms: SocialPlatform[] = ['whatsapp', 'youtube', 'tiktok', 'instagram', 'x', 'facebook'];
    const platformSpecificPackages: Record<string, any> = {};

    for (const plat of platforms) {
      platformSpecificPackages[plat] = await SocialContentBuilder.buildPackage(
        plat,
        post,
        response,
        linkInfo.shortUrl,
        context
      );
    }

    // Creator Pack Files for Download
    const files: CreatorPackFile[] = [
      {
        filename: 'README.txt',
        mimeType: 'text/plain',
        content: `SPEAK UP GHANA - CREATOR PACK\nReport ID: ${post.id}\nCreated At: ${new Date().toISOString()}\n\nInclusions:\n- report-summary.txt\n- suggested-script.txt\n- hashtags.txt\n- creator-link.txt\n- LEGAL-DISCLOSURE.txt\n`
      },
      {
        filename: 'report-summary.txt',
        mimeType: 'text/plain',
        content: longSummary
      },
      {
        filename: 'suggested-script.txt',
        mimeType: 'text/plain',
        content: suggestedNarrationScript
      },
      {
        filename: 'hashtags.txt',
        mimeType: 'text/plain',
        content: hashtags.join(' ')
      },
      {
        filename: 'creator-link.txt',
        mimeType: 'text/plain',
        content: `Your Unique Creator Attribution Link:\n${linkInfo.shortUrl}\n\nCanonical Public URL:\n${linkInfo.canonicalUrl}\n`
      },
      {
        filename: 'LEGAL-DISCLOSURE.txt',
        mimeType: 'text/plain',
        content: `${disclosures.citizenAllegationNote}\n${disclosures.officialStatusNote}\n${disclosures.creatorCommentaryDisclaimer}\n`
      }
    ];

    return {
      id: packId,
      postId: post.id,
      responseId: response?.id,
      headline,
      shortSummary,
      longSummary,
      hookText,
      suggestedNarrationScript,
      hashtags,
      attributionText,
      sourceUrl: linkInfo.shortUrl,
      callToAction: `Read original report on Speak Up Ghana: ${linkInfo.shortUrl}`,
      disclosures,
      quoteCardContent,
      platformSpecificPackages: platformSpecificPackages as any,
      files
    };
  }
}
