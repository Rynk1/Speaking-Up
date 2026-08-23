import path from 'path';
import fs from 'fs';
import { db } from './db';
import { logger } from '../shared/logger';

export class DatabaseBackupService {
  /**
   * Safe online SQLite backup using WAL-compatible VACUUM INTO command
   */
  public static performOnlineBackup(destinationDir?: string): { success: boolean; backupPath: string; timestamp: string } {
    const backupDir = destinationDir || path.resolve(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `speakup-backup-${timestamp}.db`);

    try {
      db.prepare(`VACUUM INTO ?`).run(backupPath);
      logger.info(`Online SQLite backup completed successfully: ${backupPath}`);
      return { success: true, backupPath, timestamp };
    } catch (err: any) {
      logger.error(`Online SQLite backup failed: ${err.message}`);
      throw new Error(`Backup failed: ${err.message}`);
    }
  }
}
