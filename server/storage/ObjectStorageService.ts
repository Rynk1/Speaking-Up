import path from 'path';
import fs from 'fs';
import { STORAGE_ZONES, generateSignedAccessToken } from '../storage';
import { logger } from '../shared/logger';

export interface StorageObjectMetadata {
  id: string;
  zone: 'original' | 'protected' | 'public' | 'thumbnails' | 'social';
  filename: string;
  mimeType: string;
  sizeBytes: number;
  publicUrl?: string;
  signedToken?: string;
  createdAt: string;
}

export class ObjectStorageService {
  /**
   * Stores a file in the target object storage zone and returns metadata
   */
  public static async storeObject(
    filename: string,
    zone: 'original' | 'protected' | 'public' | 'thumbnails' | 'social',
    submissionId?: string
  ): Promise<StorageObjectMetadata> {
    const zonePathMap = {
      original: STORAGE_ZONES.ORIGINAL,
      protected: STORAGE_ZONES.PROTECTED,
      public: STORAGE_ZONES.PUBLIC,
      thumbnails: STORAGE_ZONES.THUMBNAILS,
      social: STORAGE_ZONES.SOCIAL
    };

    const targetDir = zonePathMap[zone] || STORAGE_ZONES.PUBLIC;
    const sourcePath = path.join(STORAGE_ZONES.PROCESSING, filename);
    const targetPath = path.join(targetDir, filename);

    if (fs.existsSync(sourcePath)) {
      fs.renameSync(sourcePath, targetPath);
    }

    const stats = fs.existsSync(targetPath) ? fs.statSync(targetPath) : { size: 0 };
    const now = new Date().toISOString();
    const id = `obj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    let publicUrl: string | undefined;
    let signedToken: string | undefined;

    if (zone === 'public' || zone === 'thumbnails' || zone === 'social') {
      publicUrl = `/uploads/${zone}/${filename}`;
    } else if (zone === 'protected' && submissionId) {
      signedToken = generateSignedAccessToken(submissionId, 'INSTITUTION_ONLY');
      publicUrl = `/api/media/protected/${filename}?token=${signedToken}`;
    }

    logger.info(`[ObjectStorage] Object stored in zone [${zone}]: ${filename}`);

    return {
      id,
      zone,
      filename,
      mimeType: this.guessMimeType(filename),
      sizeBytes: stats.size,
      publicUrl,
      signedToken,
      createdAt: now
    };
  }

  private static guessMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    switch (ext) {
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg';
      case '.png':
        return 'image/png';
      case '.webp':
        return 'image/webp';
      case '.mp4':
        return 'video/mp4';
      case '.webm':
        return 'video/webm';
      case '.mp3':
        return 'audio/mpeg';
      case '.wav':
        return 'audio/wav';
      default:
        return 'application/octet-stream';
    }
  }
}
