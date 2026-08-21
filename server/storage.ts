import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'speakup-secret-key-ghana-2025';

export const BASE_UPLOAD_DIR = path.join(process.cwd(), 'uploads');

export const STORAGE_ZONES = {
  ORIGINAL: path.join(BASE_UPLOAD_DIR, 'original'),
  PROTECTED: path.join(BASE_UPLOAD_DIR, 'protected'),
  PUBLIC: path.join(BASE_UPLOAD_DIR, 'public'),
  PROCESSING: path.join(BASE_UPLOAD_DIR, 'processing')
};

export function initStorageZones() {
  for (const zonePath of Object.values(STORAGE_ZONES)) {
    if (!fs.existsSync(zonePath)) {
      fs.mkdirSync(zonePath, { recursive: true });
    }
  }
  console.log('P³RE Storage Zones initialized successfully.');
}

/**
 * Generate short-lived signed access token for protected evidence viewing
 */
export function generateSignedAccessToken(submissionId: string, actorId: string, expiresInSeconds: number = 900): string {
  return jwt.sign(
    {
      submissionId,
      actorId,
      scope: 'PROTECTED_EVIDENCE_READ'
    },
    JWT_SECRET,
    { expiresIn: expiresInSeconds }
  );
}

/**
 * Verify signed access token for protected media access
 */
export function verifySignedAccessToken(token: string): { submissionId: string; actorId: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded && decoded.scope === 'PROTECTED_EVIDENCE_READ') {
      return { submissionId: decoded.submissionId, actorId: decoded.actorId };
    }
    return null;
  } catch (err) {
    return null;
  }
}
