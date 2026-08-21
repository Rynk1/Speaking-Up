import fs from 'fs';
import path from 'path';
import { STORAGE_ZONES } from '../storage';

export interface ProcessMediaResult {
  originalPath: string;
  publicPath: string;
  protectedPath: string;
  metadataStripped: boolean;
  redacted: boolean;
}

/**
 * Strips EXIF / GPS metadata from JPEG buffer in pure JS
 */
function stripJpegMetadata(buffer: Buffer): { cleanBuffer: Buffer; stripped: boolean } {
  if (buffer.length < 4 || buffer[0] !== 0xFF || buffer[1] !== 0xD8) {
    return { cleanBuffer: buffer, stripped: false };
  }

  let offset = 2;
  let stripped = false;
  const chunks: Buffer[] = [buffer.subarray(0, 2)]; // Start with SOI 0xFFD8

  while (offset < buffer.length) {
    if (buffer[offset] !== 0xFF) break;

    const marker = buffer[offset + 1];

    // EOI (End of Image)
    if (marker === 0xD9) {
      chunks.push(buffer.subarray(offset));
      break;
    }

    // SOS (Start of Scan) - rest of file is image data
    if (marker === 0xDA) {
      chunks.push(buffer.subarray(offset));
      break;
    }

    const length = buffer.readUInt16BE(offset + 2);

    // APP1 marker (0xE1) contains EXIF / GPS data
    if (marker === 0xE1) {
      stripped = true;
      offset += 2 + length; // Skip APP1 EXIF chunk completely
      continue;
    }

    chunks.push(buffer.subarray(offset, offset + 2 + length));
    offset += 2 + length;
  }

  return {
    cleanBuffer: stripped ? Buffer.concat(chunks) : buffer,
    stripped
  };
}

/**
 * Media Processing Pipeline that organizes original, protected, and public derivative files
 */
export async function processMediaFile(
  filename: string,
  sourcePath?: string
): Promise<ProcessMediaResult> {
  const currentPath = sourcePath || path.join(STORAGE_ZONES.PROCESSING, filename);
  const originalPath = path.join(STORAGE_ZONES.ORIGINAL, filename);
  const protectedPath = path.join(STORAGE_ZONES.PROTECTED, filename);
  const publicPath = path.join(STORAGE_ZONES.PUBLIC, filename);

  // If file exists in processing, copy to original zone immutably
  if (fs.existsSync(currentPath) && currentPath !== originalPath) {
    fs.copyFileSync(currentPath, originalPath);
    fs.copyFileSync(currentPath, protectedPath);
  } else if (!fs.existsSync(originalPath) && fs.existsSync(currentPath)) {
    fs.copyFileSync(currentPath, originalPath);
  }

  let metadataStripped = false;

  if (fs.existsSync(originalPath)) {
    const ext = path.extname(filename).toLowerCase();
    const fileBuffer = fs.readFileSync(originalPath);

    if (ext === '.jpg' || ext === '.jpeg') {
      const { cleanBuffer, stripped } = stripJpegMetadata(fileBuffer);
      fs.writeFileSync(publicPath, cleanBuffer);
      metadataStripped = stripped;
    } else {
      fs.copyFileSync(originalPath, publicPath);
    }
  }

  return {
    originalPath,
    protectedPath,
    publicPath,
    metadataStripped,
    redacted: true
  };
}
