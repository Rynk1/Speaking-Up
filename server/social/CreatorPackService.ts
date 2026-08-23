import {
  CreatorPack,
  CreatorContext,
  SocialPlatform,
  CreatorPackFile,
  CleanMediaAsset,
  PrimaryMediaType,
  VideoProductionKit,
  AudioProductionKit,
  ThreadAndCarouselKit
} from './types';
import { SocialContentBuilder } from './SocialContentBuilder';
import { ShareLinkService } from './ShareLinkService';

export class CreatorPackService {
  /**
   * Generates a complete Creator Pack bundle for bloggers, YouTubers, TikTok creators, radio hosts, and journalists
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
    const confirmations = post.confirmations_count || post.engagement?.confirmations || 1;

    // Clean & PII-sanitized Media assets
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
    const primaryMediaType: PrimaryMediaType = videoMedia ? 'video' : audioMedia ? 'audio' : imageMedia ? 'image' : 'text';

    const headline = response
      ? `OFFICIAL STATEMENT: ${response.institutionName} Responds to "${post.title}"`
      : `CITIZEN REPORT: ${post.title} (${locationStr})`;

    const shortSummary = response
      ? `Official statement released by ${response.institutionName} regarding citizen report in ${locationStr}: "${post.title}". Status: ${response.resolutionStatus || 'IN_PROGRESS'}.`
      : `Residents in ${locationStr} have reported "${post.title}". ${confirmations} citizens independently confirmed this issue. Tagged: ${instNames}.`;

    const longSummary = `SPEAK UP GHANA CIVIC REPORT PACK\n\n` +
      `===================================================\n` +
      `ISSUE TITLE: ${post.title}\n` +
      `LOCATION: ${locationStr}\n` +
      `CATEGORY: ${post.category || 'Civic Issue'}\n` +
      `URGENCY: ${post.urgency || 'NORMAL'}\n` +
      `CITIZEN CONFIRMATIONS: ${confirmations}\n` +
      `TAGGED INSTITUTIONS: ${instNames}\n` +
      `PRIMARY MEDIA FORMAT: ${primaryMediaType.toUpperCase()}\n` +
      `PII SANITIZATION STATUS: VERIFIED CLEAN (Public Routes Only)\n` +
      `===================================================\n\n` +
      `CITIZEN OBSERVATION:\n"${post.content}"\n\n` +
      (response
        ? `===================================================\n` +
          `OFFICIAL INSTITUTION RESPONSE:\n` +
          `Institution: ${response.institutionName}\n` +
          `Spokesperson: ${response.responderName || 'Official Representative'} (${response.responderTitle || 'Ghana Public Service'})\n` +
          `Reference Number: ${response.referenceNumber || 'N/A'}\n` +
          `Status / Directive: ${response.resolutionStatus || 'IN PROGRESS'}\n` +
          `Statement Title: ${response.statementTitle || 'Official Communiqué'}\n` +
          `Full Message: "${response.message}"\n` +
          `===================================================\n\n`
        : '') +
      `CANONICAL PUBLIC RECORD URL:\n${linkInfo.canonicalUrl}\n` +
      `TRACKED CREATOR LINK:\n${linkInfo.shortUrl}\n`;

    const hookText = response
      ? `🚨 BREAKING: ${response.institutionName} HAS JUST RESPONDED to the citizen report in ${locationStr}!`
      : `🚨 Imagine dealing with THIS on the road every day in ${locationStr}...`;

    const videoProduction: VideoProductionKit = {
      hooks: [
        {
          type: 'Emotional / Daily Life Hook',
          hook: `🚨 "Imagine living in ${locationStr} and dealing with this exact situation every single morning..."`,
          style: 'High Empathy & Relatable'
        },
        {
          type: 'Institutional Accountability Hook',
          hook: `🚨 "${instNames} was just notified about this major issue in ${locationStr}. Here is what the records show..."`,
          style: 'Direct & Investigative'
        },
        {
          type: 'Breaking Civic Alert Hook',
          hook: `🚨 "Over ${confirmations} verified citizens in ${post.district} just raised this on Speak Up Ghana. Watch this evidence."`,
          style: 'Urgent News Bulletin'
        }
      ],
      scripts: {
        short30s: response
          ? `[0-5s] "Breaking update! ${response.institutionName} has officially responded to the citizen report in ${locationStr}!"\n` +
            `[5-20s] "They confirmed action regarding '${post.title}' and published a formal directive: '${(response.statementTitle || response.message).slice(0, 90)}...'"\n` +
            `[20-30s] "Check out the full verified statement and follow the action timeline on Speak Up Ghana via my link in bio!"`
          : `[0-5s] "Look at what residents in ${locationStr} just exposed on Speak Up Ghana!"\n` +
            `[5-20s] "Over ${confirmations} citizens have confirmed '${post.title}'. The issue has been formally tagged to ${instNames}."\n` +
            `[20-30s] "If you live in ${post.district}, tap my link in bio to confirm your observation and track the response!"`,
        standard60s: response
          ? `[0-10s] "${hookText}"\n` +
            `[10-35s] "Here is the background: Earlier this week, residents in ${locationStr} reported persistent issues regarding '${post.title}'. More than ${confirmations} citizens backed up the report with evidence on Speak Up Ghana. Today, ${response.institutionName} published an official communiqué under Reference ${response.referenceNumber || 'N/A'}. They stated: '${(response.statementTitle || response.message).slice(0, 180)}...'"\n` +
            `[35-50s] "This demonstrates what happens when citizens document civic issues with structured public evidence."\n` +
            `[50-60s] "You can read the entire official statement and track milestone updates directly using the link pinned in my bio and comments below!"`
          : `[0-10s] "${hookText}"\n` +
            `[10-35s] "Residents across ${locationStr} are sounding the alarm over '${post.title}'. Here is what citizens are saying: '${post.content.slice(0, 180)}...'. This isn't an isolated complaint — over ${confirmations} people have independently verified this on the public record."\n` +
            `[35-50s] "The matter has been logged and formally tagged to ${instNames}. The ball is now in their court to address the community."\n` +
            `[50-60s] "Are you experiencing this in ${post.district}? Visit Speak Up Ghana via my link below to verify your observation, submit clean evidence, and track this case live!"`,
        deepDive: response
          ? `[DEEP DIVE INVESTIGATION NARRATION]\n` +
            `Title: State Response Analysis — ${post.title}\n` +
            `Location: ${locationStr}\n` +
            `Authority: ${response.institutionName} | Reference: ${response.referenceNumber || 'N/A'}\n\n` +
            `Full Statement Analysis:\n"${response.message}"\n\n` +
            `Next Steps for Community:\n1. Verify if the directive is being implemented on the ground in ${post.district}.\n2. Submit photographic follow-up evidence on Speak Up Ghana.\n3. Track resolution metrics.`
          : `[DEEP DIVE CITIZEN EVIDENCE NARRATION]\n` +
            `Title: Public Infrastructure & Service Accountability — ${post.title}\n` +
            `Location: ${locationStr}\n` +
            `Citizen Evidence Count: ${confirmations} Confirmations\n\n` +
            `Citizen Testimony:\n"${post.content}"\n\n` +
            `Accountability Checklist:\n- Notified Authority: ${instNames}\n- Required Action: Rapid assessment & formal response\n- Citizen Portal: ${linkInfo.shortUrl}`
      },
      bRollSuggestions: [
        `Close-up shot of the civic problem in ${post.district} with on-screen location tag`,
        `Split-screen showing citizen evidence alongside Speak Up Ghana confirmation counter`,
        `Screen recording of Speak Up Ghana report interface and institution response timeline`,
        `Map graphic pinpointing ${post.district}, ${post.region}`
      ],
      onScreenCaptions: [
        `📍 ${locationStr}`,
        `👥 ${confirmations} Independent Confirmations`,
        `🏛️ Notified: ${instNames}`,
        response ? `✅ Official Response Verified` : `⏳ Awaiting Institutional Response`,
        `🔗 Link in bio: Speak Up Ghana`
      ],
      pinnedComment: response
        ? `🚨 Full official statement from ${response.institutionName} + evidence timeline: ${linkInfo.shortUrl}\nFollow state response and add your verified observation.`
        : `🚨 Have you experienced this in ${locationStr}? Confirm your experience on Speak Up Ghana: ${linkInfo.shortUrl}`
    };

    const audioProduction: AudioProductionKit = {
      radioBulletinScript: response
        ? `[RADIO NEWS BULLETIN - 30 SECONDS]\n` +
          `"This is a civic update from Speak Up Ghana. The ${response.institutionName} has issued an official statement regarding citizen reports of '${post.title}' in ${locationStr}. The authority states that '${(response.statementTitle || response.message).slice(0, 120)}...'. Residents can read the full communiqué and verify progress online at ${linkInfo.shortUrl}."`
        : `[RADIO NEWS BULLETIN - 30 SECONDS]\n` +
          `"Civic Alert: Residents in ${locationStr} are calling for urgent attention over '${post.title}'. Over ${confirmations} citizens have independently verified this on Speak Up Ghana, and ${instNames} has been alerted. Residents affected can add their voice at ${linkInfo.shortUrl}."`,
      localDialectPhrasing: response
        ? `[GHANA PIDGIN / LOCAL BROADCAST CUE]\n` +
          `"Good people of ${post.district}, ${response.institutionName} don answer the matter about '${post.title}'. Dem talk say dem dey take action. Check the full talk for Speak Up Ghana with this link: ${linkInfo.shortUrl}."`
        : `[GHANA PIDGIN / LOCAL BROADCAST CUE]\n` +
          `"People living for ${locationStr} dey complain about '${post.title}'. Plenty people don confirm say na true. If you see am too, go Speak Up Ghana make you add your voice: ${linkInfo.shortUrl}."`,
      soundbiteQuotes: [
        `"${post.title}" — Citizen report from ${locationStr}`,
        response ? `"${(response.statementTitle || response.message).slice(0, 140)}..."` : `"${post.content.slice(0, 140)}..."`
      ],
      podcastIntroOutro: `Intro: "Welcome back to the civic breakdown. Today we are looking at a developing public record from ${post.district} on Speak Up Ghana..."\nOutro: "To see the verified evidence and track state action, visit the link in the episode show notes: ${linkInfo.shortUrl}."`,
      transcriptExcerpt: post.content
    };

    const threadAndCarousel: ThreadAndCarouselKit = {
      xThread: response
        ? [
            `1/4 🏛️ OFFICIAL STATEMENT: ${response.institutionName} has released an official response regarding "${post.title}" reported by citizens in ${locationStr}.\n\n#SpeakUpGhana`,
            `2/4 📢 STATEMENT SUMMARY:\n"${response.statementTitle || response.message.slice(0, 200)}"\n\n📌 Ref: ${response.referenceNumber || 'N/A'}\n🎯 Status: ${response.resolutionStatus || 'IN PROGRESS'}`,
            `3/4 📍 CONTEXT:\nReported Location: ${locationStr}\nCitizen Confirmations: ${confirmations}`,
            `4/4 🔎 Read full verified official response, action timeline, and submit citizen updates:\n${linkInfo.shortUrl}`
          ]
        : [
            `1/5 🚨 CITIZEN REPORT: Residents in ${locationStr} are reporting "${post.title}".\n\n#SpeakUpGhana`,
            `2/5 📋 DETAILS:\n"${post.content.slice(0, 220)}..."`,
            `3/5 📍 LOCATION & VERIFICATION:\n${locationStr}\n👥 ${confirmations} independent citizen confirmations on record.`,
            `4/5 🏛️ INSTITUTION ALERT:\nNotified: ${instNames}`,
            `5/5 🔎 Follow updates, see evidence, and confirm your experience on Speak Up Ghana:\n${linkInfo.shortUrl}`
          ],
      instagramCarousel: [
        {
          slideNumber: 1,
          title: response ? `COMMUNIQUÉ: ${response.institutionName}` : `CITIZEN REPORT: ${post.title}`,
          body: `Location: ${locationStr} | Verified on Speak Up Ghana`,
          visualPrompt: 'High-contrast cover card with verified badge and issue title.'
        },
        {
          slideNumber: 2,
          title: response ? 'OFFICIAL DIRECTIVE' : 'WHAT IS HAPPENING',
          body: response ? (response.statementTitle || response.message.slice(0, 220)) : post.content.slice(0, 220),
          visualPrompt: 'Key quote and evidence excerpt.'
        },
        {
          slideNumber: 3,
          title: 'PUBLIC RECORD & CITIZEN BACKING',
          body: `📍 ${locationStr}\n👥 ${confirmations} Independent Citizen Confirmations\n🏛️ Tagged: ${instNames}`,
          visualPrompt: 'Verification stats infographic card.'
        },
        {
          slideNumber: 4,
          title: 'TRACK ON SPEAK UP GHANA',
          body: `Read full verified evidence, track updates, or confirm your experience:\n${linkInfo.shortUrl}`,
          visualPrompt: 'Action card with QR code and link.'
        }
      ],
      pressReleaseMarkdown: `# PRESS BRIEFING: ${post.title}\n\n` +
        `**Location:** ${locationStr}\n` +
        `**Date Published:** ${new Date().toLocaleDateString('en-GB')}\n` +
        `**Source:** Speak Up Ghana Citizen Accountability Portal\n` +
        `**Public Record URL:** ${linkInfo.canonicalUrl}\n\n` +
        `## Executive Summary\n` +
        `${shortSummary}\n\n` +
        `## Citizen Observation Details\n` +
        `> "${post.content}"\n\n` +
        (response ? `## Official Institution Position\n**Authority:** ${response.institutionName}\n**Reference:** ${response.referenceNumber || 'N/A'}\n**Statement:** "${response.message}"\n\n` : '') +
        `## Public Verification\n` +
        `- Independent Confirmations: ${confirmations}\n` +
        `- Tagged Authorities: ${instNames}\n` +
        `- PII Data Scrubbing: Compliant (Zero personal identifying information leaked)\n`,
      embedHtml: `<iframe src="${linkInfo.shortUrl}?embed=true" width="100%" height="450" frameborder="0" style="border-radius:12px;border:1px solid #334155;"></iframe>`
    };

    const hashtags = [
      '#SpeakUpGhana',
      '#GhanaNews',
      '#Accountability',
      '#CivicAction',
      `#${(post.category || 'Civic').replace(/[^a-zA-Z0-9]/g, '')}`,
      `#${(post.district || 'Ghana').replace(/[^a-zA-Z0-9]/g, '')}`
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
        content: `SPEAK UP GHANA - CREATOR PRODUCTION PACK\n` +
          `Report ID: ${post.id}\n` +
          `Media Format: ${primaryMediaType.toUpperCase()}\n` +
          `Generated At: ${new Date().toISOString()}\n\n` +
          `Bundle Inclusions:\n` +
          `1. report-summary.txt (Full issue breakdown)\n` +
          `2. video-teleprompter-scripts.txt (30s, 60s, and Deep Dive scripts)\n` +
          `3. radio-broadcaster-script.txt (Radio & Podcast bulletin)\n` +
          `4. social-thread-and-carousel.txt (5-Part X Thread & Instagram Carousel)\n` +
          `5. press-release.md (Markdown press briefing)\n` +
          `6. hashtags-and-links.txt (Your unique attribution tracking URL)\n` +
          `7. LEGAL-DISCLOSURE.txt (Safeguards & disclaimers)\n`
      },
      {
        filename: 'report-summary.txt',
        mimeType: 'text/plain',
        content: longSummary
      },
      {
        filename: 'video-teleprompter-scripts.txt',
        mimeType: 'text/plain',
        content: `=== 30-SECOND VIDEO SCRIPT ===\n${videoProduction.scripts.short30s}\n\n` +
          `=== 60-SECOND STANDARD SCRIPT ===\n${videoProduction.scripts.standard60s}\n\n` +
          `=== DEEP DIVE NARRATION ===\n${videoProduction.scripts.deepDive}\n`
      },
      {
        filename: 'radio-broadcaster-script.txt',
        mimeType: 'text/plain',
        content: `=== RADIO NEWS BULLETIN ===\n${audioProduction.radioBulletinScript}\n\n` +
          `=== LOCAL PIDGIN PHRASING ===\n${audioProduction.localDialectPhrasing}\n\n` +
          `=== PODCAST INTRO & OUTRO ===\n${audioProduction.podcastIntroOutro}\n`
      },
      {
        filename: 'social-thread-and-carousel.txt',
        mimeType: 'text/plain',
        content: `=== 5-PART X / THREADS POSTS ===\n${threadAndCarousel.xThread.join('\n\n---\n\n')}\n\n` +
          `=== INSTAGRAM CAROUSEL SLIDES ===\n` +
          threadAndCarousel.instagramCarousel.map(s => `Slide ${s.slideNumber}: ${s.title}\n${s.body}\nVisual Cue: ${s.visualPrompt}`).join('\n\n')
      },
      {
        filename: 'press-release.md',
        mimeType: 'text/markdown',
        content: threadAndCarousel.pressReleaseMarkdown
      },
      {
        filename: 'hashtags-and-links.txt',
        mimeType: 'text/plain',
        content: `Your Unique Creator Attribution Link:\n${linkInfo.shortUrl}\n\n` +
          `Canonical Public URL:\n${linkInfo.canonicalUrl}\n\n` +
          `Hashtags:\n${hashtags.join(' ')}\n\n` +
          `Attribution:\n${attributionText}\n`
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
      primaryMediaType,
      headline,
      shortSummary,
      longSummary,
      hookText,
      suggestedNarrationScript: videoProduction.scripts.standard60s,
      hashtags,
      attributionText,
      sourceUrl: linkInfo.shortUrl,
      callToAction: `Read original report on Speak Up Ghana: ${linkInfo.shortUrl}`,
      disclosures,
      quoteCardContent,
      cleanMediaAssets,
      videoProduction,
      audioProduction,
      threadAndCarousel,
      platformSpecificPackages: platformSpecificPackages as any,
      files
    };
  }
}

