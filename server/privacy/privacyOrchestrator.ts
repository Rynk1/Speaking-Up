import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { db } from '../db';
import { STORAGE_ZONES } from '../storage';
import { detectGhanaPII, DetectedFinding } from '../detection/ghanaDetectors';
import { analyzeContextualSensitivity } from '../detection/geminiDetector';
import { evaluatePolicy } from './policyEngine';
import { PrivacyStatus } from '../../src/types/privacy';

export interface ProcessSubmissionInput {
  submissionId?: string;
  authorId: string;
  title: string;
  content: string;
  media?: Array<{
    id?: string;
    url: string;
    type: 'image' | 'video' | 'audio';
    mimeType?: string;
    sizeBytes?: number;
  }>;
}

export interface ProcessSubmissionOutput {
  submissionId: string;
  publicProjectionId: string;
  title: string;
  publicText: string;
  privacyStatus: PrivacyStatus;
  findingsCount: number;
  media: Array<{
    id: string;
    url: string;
    type: 'image' | 'video' | 'audio';
  }>;
}

export class PrivacyOrchestrator {
  /**
   * Main entry point to process a canonical citizen submission through P³RE
   * with fail-closed security guarantees.
   */
  public static async processSubmission(input: ProcessSubmissionInput): Promise<ProcessSubmissionOutput> {
    const now = new Date().toISOString();
    const submissionId = input.submissionId || `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const sourceTextId = `src-txt-${Date.now()}`;

    // Verify author ID exists in users table, else create default user record if missing
    const requestedAuthorId = input.authorId || 'user-current';
    let userRow = db.prepare('SELECT id FROM users WHERE id = ?').get(requestedAuthorId) as any;
    if (!userRow) {
      db.prepare(`
        INSERT INTO users (id, email, password_hash, name, handle, role, is_verified, created_at, updated_at)
        VALUES (?, ?, 'hash', 'Citizen Observer', ?, 'CITIZEN', 1, ?, ?)
        ON CONFLICT DO NOTHING
      `).run(requestedAuthorId, `${requestedAuthorId}@speakup.gh`, `@${requestedAuthorId}`, now, now);
      userRow = db.prepare('SELECT id FROM users WHERE id = ?').get(requestedAuthorId) as any;
    }
    const authorId = userRow ? userRow.id : 'user-current';

    try {
      // 1. Create Canonical Submission Record
      db.prepare(`
        INSERT INTO submissions (id, author_id, post_type, claim_type, visibility, status, privacy_status, moderation_status, verification_status, created_at, updated_at)
        VALUES (?, ?, 'CIVIC_REPORT', 'OBSERVATION', 'public', 'ACTIVE', 'PRIVACY_PROCESSING', 'approved', 'UNVERIFIED', ?, ?)
        ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at
      `).run(submissionId, authorId, now, now);

      // 2. Save Canonical Source Text
      const textHash = crypto.createHash('sha256').update(input.content).digest('hex');
      db.prepare(`
        INSERT INTO submission_sources (id, submission_id, source_type, storage_object_id, mime_type, size, sha256, content_text, created_at)
        VALUES (?, ?, 'TEXT', ?, 'text/plain', ?, ?, ?, ?)
      `).run(sourceTextId, submissionId, `text-${submissionId}`, input.content.length, textHash, input.content, now);

      // 3. Deterministic Local PII Detection
      const deterministicFindings = detectGhanaPII(input.content);

      // 4. Gemini Contextual Sensitivity Check (pre-sanitized AI firewall)
      const geminiResult = await analyzeContextualSensitivity(input.content, deterministicFindings);
      const allFindings: DetectedFinding[] = [...deterministicFindings, ...geminiResult.suggestedFindings];

      // 5. Persist Privacy Findings
      const insertFindingStmt = db.prepare(`
        INSERT INTO privacy_findings (id, submission_id, source_id, type, confidence, severity, start_offset, end_offset, detector, detector_version, policy_action, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '1.0', ?, ?)
      `);

      for (const f of allFindings) {
        insertFindingStmt.run(
          `find-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          submissionId,
          sourceTextId,
          f.type,
          f.confidence,
          f.severity,
          f.startOffset ?? null,
          f.endOffset ?? null,
          f.detector,
          f.policyAction || 'REDACT',
          now
        );
      }

      // 6. Policy Engine Evaluation
      const policyResult = evaluatePolicy(allFindings, 'PUBLIC');

      // 7. Generate Sanitized Public Projection Text
      let publicText = input.content;

      // Redact matched strings
      for (const f of policyResult.processedFindings) {
        if (f.policyAction === 'REDACT' && f.matchedText) {
          let label = '[REDACTED]';
          if (f.type === 'PHONE_NUMBER') label = '[REDACTED PHONE]';
          else if (f.type === 'GOVERNMENT_ID') label = '[REDACTED GHANA CARD]';
          else if (f.type === 'EMAIL') label = '[REDACTED EMAIL]';
          else if (f.type === 'PERSON_NAME') label = '[REDACTED NAME]';
          else if (f.type === 'PRIVATE_LOCATION') label = '[REDACTED LOCATION]';
          else if (f.type === 'LICENSE_PLATE') label = '[REDACTED LICENSE PLATE]';

          publicText = publicText.split(f.matchedText).join(label);
        }
      }

      // 8. Process Media Files
      const publicMediaList: Array<{ id: string; url: string; type: 'image' | 'video' | 'audio' }> = [];

      for (const m of input.media || []) {
        const mediaId = m.id || `media-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const sourceMediaId = `src-med-${mediaId}`;

        db.prepare(`
          INSERT INTO submission_sources (id, submission_id, source_type, storage_object_id, mime_type, size, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(sourceMediaId, submissionId, m.type.toUpperCase(), m.url, m.mimeType || 'image/jpeg', m.sizeBytes || 0, now);

        db.prepare(`
          INSERT INTO submission_protected_evidence (id, submission_id, source_id, storage_object_id, access_policy, classification, retention_policy, created_at)
          VALUES (?, ?, ?, ?, 'INSTITUTION_ONLY', 'PROTECTED_CIVIC_EVIDENCE', 'STANDARD_LEGAL', ?)
        `).run(`prot-${mediaId}`, submissionId, sourceMediaId, m.url, now);

        let publicUrl = m.url;
        if (!publicUrl.startsWith('/uploads/public/')) {
          publicUrl = publicUrl.replace('/uploads/', '/uploads/public/');
        }

        publicMediaList.push({
          id: mediaId,
          url: publicUrl,
          type: m.type
        });
      }

      // 9. Determine Final Privacy Status
      const finalPrivacyStatus: PrivacyStatus = policyResult.requiresHumanReview ? 'PRIVACY_REVIEW_REQUIRED' : 'PRIVACY_READY';

      db.prepare(`
        UPDATE submissions SET privacy_status = ? WHERE id = ?
      `).run(finalPrivacyStatus, submissionId);

      // 10. Store Public Projection
      const projectionId = `proj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      db.prepare(`
        INSERT INTO submission_public_projections (id, submission_id, version, title, text, media_references_json, summary, generated_by, policy_version, redaction_version, status, created_at)
        VALUES (?, ?, 1, ?, ?, ?, ?, 'P3RE_AUTOMATED', '1.0', '1.0', ?, ?)
      `).run(
        projectionId,
        submissionId,
        input.title,
        publicText,
        JSON.stringify(publicMediaList),
        geminiResult.summary || null,
        finalPrivacyStatus,
        now
      );

      // 11. Record Version Audit
      db.prepare(`
        INSERT INTO representation_versions (id, submission_id, representation_type, version, source_hash, policy_version, detector_version, status, created_at)
        VALUES (?, ?, 'PUBLIC', 1, ?, '1.0', '1.0', 'ACTIVE', ?)
      `).run(`rep-ver-${Date.now()}`, submissionId, textHash, now);

      return {
        submissionId,
        publicProjectionId: projectionId,
        title: input.title,
        publicText,
        privacyStatus: finalPrivacyStatus,
        findingsCount: allFindings.length,
        media: publicMediaList
      };
    } catch (err) {
      console.error(`P³RE Orchestrator Processing Failure for submission ${submissionId}:`, err);

      // FAIL CLOSED GUARANTEE: Never publish raw original content when processing fails
      const fallbackStatus: PrivacyStatus = 'PRIVACY_FAILED';
      const safeFallbackText = '[PRIVACY PROCESSING FAILED - CONTENT HELD FOR HUMAN REVIEW]';

      const subExists = db.prepare('SELECT 1 FROM submissions WHERE id = ?').get(submissionId);
      if (subExists) {
        db.prepare(`
          UPDATE submissions SET privacy_status = ? WHERE id = ?
        `).run(fallbackStatus, submissionId);

        const projectionId = `proj-fail-${Date.now()}`;
        db.prepare(`
          INSERT INTO submission_public_projections (id, submission_id, version, title, text, media_references_json, generated_by, policy_version, redaction_version, status, created_at)
          VALUES (?, ?, 1, ?, ?, '[]', 'P3RE_FAIL_CLOSED_HANDLER', '1.0', '1.0', ?, ?)
        `).run(projectionId, submissionId, input.title, safeFallbackText, fallbackStatus, now);
      }

      return {
        submissionId,
        publicProjectionId: `proj-fail-${Date.now()}`,
        title: input.title,
        publicText: safeFallbackText,
        privacyStatus: fallbackStatus,
        findingsCount: 0,
        media: []
      };
    }
  }
}
