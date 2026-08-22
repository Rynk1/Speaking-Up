import { SocialPlatform, CreatorContext, SocialSharePackage } from './types';
import { buildWhatsAppPackage, buildWhatsAppStatusPackage } from './adapters/whatsapp';
import { buildYouTubePackage } from './adapters/youtube';
import { buildTikTokPackage } from './adapters/tiktok';
import { buildInstagramPackage } from './adapters/instagram';
import { buildXPackage } from './adapters/x';
import { buildFacebookPackage, buildFacebookGroupPackage } from './adapters/facebook';
import { GoogleGenAI } from '@google/genai';
import { config } from '../config';

export class SocialContentBuilder {
  /**
   * Generates platform specific share package
   */
  static async buildPackage(
    platform: SocialPlatform,
    post: any,
    response: any | null,
    shortUrl: string,
    context: CreatorContext = 'general'
  ): Promise<Partial<SocialSharePackage>> {
    let pkg: Partial<SocialSharePackage> = {};

    switch (platform) {
      case 'whatsapp':
        pkg = buildWhatsAppPackage(post, response, shortUrl, context);
        break;
      case 'whatsapp_status':
        pkg = buildWhatsAppStatusPackage(post, response, shortUrl, context);
        break;
      case 'youtube':
        pkg = buildYouTubePackage(post, response, shortUrl, context);
        break;
      case 'tiktok':
        pkg = buildTikTokPackage(post, response, shortUrl, context);
        break;
      case 'instagram':
        pkg = buildInstagramPackage(post, response, shortUrl, context);
        break;
      case 'x':
        pkg = buildXPackage(post, response, shortUrl, context);
        break;
      case 'facebook':
        pkg = buildFacebookPackage(post, response, shortUrl, context);
        break;
      case 'facebook_group':
        pkg = buildFacebookGroupPackage(post, response, shortUrl, context);
        break;
      default:
        pkg = buildWhatsAppPackage(post, response, shortUrl, context);
    }

    // Attach Legal & Ethical Safeguards Disclosures
    pkg.disclosures = {
      citizenAllegationNote: 'CITIZEN REPORT DISCLOSURE: Content represents citizen observations submitted to Speak Up Ghana.',
      officialStatusNote: response
        ? `VERIFIED OFFICIAL COMMUNIQUÉ: Response issued by ${response.institutionName} [Ref: ${response.referenceNumber || 'N/A'}].`
        : 'INSTITUTION STATUS: Unverified by government authority until official response is published.'
    };

    // AI Enhancement step if Gemini API Key is available
    if (config.geminiApiKey) {
      try {
        const aiEnhanced = await this.enhanceWithGemini(platform, post, response, context, pkg);
        if (aiEnhanced) {
          if (aiEnhanced.headline) pkg.headline = aiEnhanced.headline;
          if (aiEnhanced.caption) pkg.caption = aiEnhanced.caption;
          if (aiEnhanced.hashtags) pkg.hashtags = aiEnhanced.hashtags;
        }
      } catch (err) {
        console.warn('Gemini social content enhancement fallback:', err);
      }
    }

    return pkg;
  }

  private static async enhanceWithGemini(
    platform: SocialPlatform,
    post: any,
    response: any | null,
    context: CreatorContext,
    basePackage: Partial<SocialSharePackage>
  ): Promise<{ headline?: string; caption?: string; hashtags?: string[] } | null> {
    try {
      const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
      const prompt = `
You are a expert Ghanaian social media editor for Speak Up Ghana.
Format social media copy for platform: "${platform}" and creator style: "${context}".

Context Data (PUBLIC PROJECTION ONLY):
Title: "${post.title}"
Category: "${post.category}"
Location: "${post.district}, ${post.region}"
Confirmations: ${post.confirmations_count || 1}
Official Statement: ${response ? `"${response.statementTitle || response.message}" by ${response.institutionName}` : 'None'}

RULES:
1. Maintain strict factual accuracy based ONLY on citizen reports vs official responses.
2. Embed relevant Ghanaian hashtags (#SpeakUpGhana, #Ghana, etc).
3. Do NOT make unverified assertions as fact.

Return JSON strictly in format:
{
  "headline": "string",
  "caption": "string",
  "hashtags": ["string"]
}
`;
      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });

      const text = result.text || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      return null;
    }
    return null;
  }
}
