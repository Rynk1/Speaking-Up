import { db } from '../db';
import { DetectedFinding } from '../detection/ghanaDetectors';

export interface PolicyEvaluationResult {
  requiresHumanReview: boolean;
  reviewReason?: string;
  processedFindings: DetectedFinding[];
}

/**
 * Evaluates findings against privacy policies stored in DB / default rules
 */
export function evaluatePolicy(
  findings: DetectedFinding[],
  audience: 'PUBLIC' | 'INSTITUTION' | 'MODERATOR' = 'PUBLIC'
): PolicyEvaluationResult {
  let requiresHumanReview = false;
  const reviewReasons: string[] = [];

  // Query DB privacy policies for current audience
  const dbPolicies = db.prepare('SELECT * FROM privacy_policies WHERE audience = ? AND enabled = 1').all(audience) as any[];
  const policyMap = new Map<string, string>();
  for (const pol of dbPolicies) {
    policyMap.set(pol.finding_type, pol.action);
  }

  const processedFindings: DetectedFinding[] = findings.map(f => {
    let action = f.policyAction || 'REDACT';

    // Override with DB policy if configured
    if (policyMap.has(f.type)) {
      action = policyMap.get(f.type)!;
    }

    // High risk triggers human review requirement
    if (f.severity === 'CRITICAL' || (f.type === 'CRIMINAL_ALLEGATION' && f.severity === 'HIGH')) {
      requiresHumanReview = true;
      reviewReasons.push(`High risk finding detected: ${f.type}`);
    }

    if (f.confidence < 0.70 && action === 'REDACT') {
      requiresHumanReview = true;
      reviewReasons.push(`Low confidence PII match (${f.confidence}) for ${f.type}`);
    }

    return {
      ...f,
      policyAction: action
    };
  });

  return {
    requiresHumanReview,
    reviewReason: reviewReasons.length > 0 ? reviewReasons.join('; ') : undefined,
    processedFindings
  };
}
