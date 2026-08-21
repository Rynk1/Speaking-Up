import { jobQueue } from '../jobQueue';
import { PrivacyOrchestrator } from '../../privacy/privacyOrchestrator';
import { analyzeContextualSensitivity } from '../../detection/geminiDetector';
import { InstitutionAlertService } from '../../alerts/alertEngine';
import { logger } from '../../shared/logger';
import { db } from '../../database/db';

export function initializeJobWorkers(): void {
  // 1. Privacy Processing Worker
  jobQueue.registerHandler('PROCESS_PRIVACY', async (payload: any) => {
    logger.info(`[Worker] Processing P³RE Privacy for submission ${payload.submissionId || payload.postId}`);
    await PrivacyOrchestrator.processSubmission({
      submissionId: payload.submissionId || payload.postId,
      authorId: payload.authorId,
      title: payload.title,
      content: payload.content,
      media: payload.media
    });
  });

  // 2. AI Classification & Context Analysis Worker
  jobQueue.registerHandler('AI_CLASSIFICATION', async (payload: any) => {
    logger.info(`[Worker] Processing Gemini AI Context Analysis for post ${payload.postId}`);
    const result = await analyzeContextualSensitivity(payload.content, []);
    if (result.status === 'SUCCESS' && result.summary) {
      db.prepare('UPDATE submission_public_projections SET summary = ? WHERE submission_id = ?')
        .run(result.summary, payload.postId);
    }
  });

  // 3. Institution Alert Dispatch Worker
  jobQueue.registerHandler('DISPATCH_ALERT', async (payload: any) => {
    logger.info(`[Worker] Dispatching alert to institution ${payload.institutionId} for post ${payload.postId}`);
    await InstitutionAlertService.dispatchAlert(payload.postId, payload.institutionId);
  });

  jobQueue.startWorker();
}
