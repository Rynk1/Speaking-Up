import crypto from 'crypto';
import { db } from '../../database/db';
import { AuditService } from '../audit/AuditService';

export type ProjectionAudience = 'PUBLIC' | 'INSTITUTION' | 'MODERATOR' | 'OWNER';

export class PrivacyProjectionService {
  private static SECRET = process.env.PRIVACY_TOKEN_SECRET || 'speakup-privacy-token-secret-2026';

  /**
   * Generates a signed access token for sensitive media
   */
  public static generateSignedMediaToken(mediaId: string, audience: ProjectionAudience, expiresInMinutes: number = 60): string {
    const expiresAt = Date.now() + expiresInMinutes * 60 * 1000;
    const data = `${mediaId}:${audience}:${expiresAt}`;
    const hmac = crypto.createHmac('sha256', this.SECRET).update(data).digest('hex');
    return `${Buffer.from(data).toString('base64url')}.${hmac}`;
  }

  /**
   * Validates a signed media token
   */
  public static verifySignedMediaToken(token: string): { valid: boolean; mediaId?: string; audience?: ProjectionAudience } {
    try {
      const [payloadPart, signature] = token.split('.');
      if (!payloadPart || !signature) return { valid: false };

      const data = Buffer.from(payloadPart, 'base64url').toString('utf-8');
      const [mediaId, audience, expiresAtStr] = data.split(':');
      const expiresAt = parseInt(expiresAtStr, 10);

      if (Date.now() > expiresAt) {
        return { valid: false };
      }

      const expectedHmac = crypto.createHmac('sha256', this.SECRET).update(data).digest('hex');
      if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedHmac))) {
        return { valid: true, mediaId, audience: audience as ProjectionAudience };
      }
    } catch {}

    return { valid: false };
  }

  /**
   * Projects a raw report row into the appropriate audience-safe representation
   */
  public static projectReport(rawReport: any, audience: ProjectionAudience, currentUserId?: string): any {
    if (!rawReport) return null;

    const isOwner = currentUserId && rawReport.author_id === currentUserId;
    const effectiveAudience: ProjectionAudience = isOwner ? 'OWNER' : audience;

    // Base projection fields
    const projected = {
      id: rawReport.id,
      title: rawReport.title,
      category: rawReport.category,
      severity: rawReport.severity || 'MODERATE',
      urgency: rawReport.urgency || 'NORMAL',
      status: rawReport.status,
      accountabilityStatus: rawReport.accountability_status || 'NEW',
      priorityScore: rawReport.priority_score || 0.0,
      priorityBand: rawReport.priority_band || 'MODERATE',
      region: rawReport.region,
      district: rawReport.district,
      confirmationsCount: rawReport.confirmations_count || 0,
      repostsCount: rawReport.reposts_count || 0,
      sharesCount: rawReport.shares_count || 0,
      viewsCount: rawReport.views_count || 0,
      createdAt: rawReport.created_at,
      updatedAt: rawReport.updated_at
    };

    if (effectiveAudience === 'OWNER' || effectiveAudience === 'MODERATOR') {
      return {
        ...projected,
        content: rawReport.content,
        landmark: rawReport.landmark,
        coordinates: rawReport.coordinates_lat ? { lat: rawReport.coordinates_lat, lng: rawReport.coordinates_lng } : null,
        author: {
          id: rawReport.author_id,
          name: rawReport.author_name,
          phone: rawReport.phone,
          isVerifiedCitizen: rawReport.is_verified_citizen
        },
        projectionTier: 'CANONICAL'
      };
    }

    if (effectiveAudience === 'INSTITUTION') {
      return {
        ...projected,
        content: rawReport.content,
        landmark: rawReport.landmark,
        coordinates: rawReport.coordinates_lat ? {
          lat: rawReport.coordinates_lat,
          lng: rawReport.coordinates_lng
        } : null,
        author: {
          id: rawReport.author_id,
          name: rawReport.is_anonymous ? 'Verified Citizen (Identity Protected)' : rawReport.author_name,
          isVerifiedCitizen: rawReport.is_verified_citizen
        },
        projectionTier: 'PROTECTED'
      };
    }

    // Public-Safe Projection: PII redacted, exact coordinates generalized to 2 decimal places (~1.1km)
    let generalizedCoords = null;
    if (rawReport.coordinates_lat && rawReport.coordinates_lng) {
      generalizedCoords = {
        lat: Math.round(rawReport.coordinates_lat * 100) / 100,
        lng: Math.round(rawReport.coordinates_lng * 100) / 100
      };
    }

    // Redact phone numbers and email from public text
    const sanitizedContent = (rawReport.content || '')
      .replace(/\b(?:\+?233|0)[2-9]\d{8}\b/g, '[PHONE REDACTED]')
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL REDACTED]');

    return {
      ...projected,
      content: sanitizedContent,
      landmark: rawReport.landmark,
      coordinates: generalizedCoords,
      author: {
        id: rawReport.author_id,
        name: rawReport.is_anonymous ? 'Citizen' : rawReport.author_name,
        isVerifiedCitizen: rawReport.is_verified_citizen
      },
      projectionTier: 'PUBLIC_SAFE'
    };
  }
}
