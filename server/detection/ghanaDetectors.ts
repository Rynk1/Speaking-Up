export interface DetectedFinding {
  type: string;
  confidence: number;
  severity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  startOffset?: number;
  endOffset?: number;
  matchedText: string;
  detector: string;
  policyAction: string;
}

// Regex patterns for Ghanaian PII detection
const PATTERNS = {
  // Ghana Card: GHA-123456789-0 or GHA1234567890
  GHANA_CARD: /\bGHA-?\d{9}-?\d\b/gi,

  // Ghanaian Phone Numbers: +233, 023, 024, 025, 026, 027, 028, 020, 050, 054, 055, 057, 059, 053, etc.
  GHANA_PHONE: /(?:\+233|0)(?:20|23|24|25|26|27|28|30|50|53|54|55|57|59)\d{7}\b/g,

  // Ghanaian Digital Address / GhanaPost GPS: e.g. GA-183-9023, AK-039-1284, WS-123-4567
  GHANA_POST_GPS: /\b[A-Z]{2}-\d{3,4}-\d{3,4}\b/gi,

  // Ghanaian Vehicle License Plates: e.g. GR 1234-22, GW-1234-21, GE 5678 20, DV 1234-24, DP 4321-23
  GHANA_LICENSE_PLATE: /\b(?:GR|GW|GE|GN|GT|GS|GB|GA|BA|AS|AH|CR|WR|VR|ER|NR|UW|UE|OR|SV|NE|WN|DV|DP|CD)\s*-?\s*\d{1,4}\s*-?\s*\d{2}\b/gi,

  // Tax Identification Number (TIN): e.g. P0001234567 or C0001234567
  GHANA_TIN: /\b[P|C|G]\d{10}\b/gi,

  // Standard Email Address
  EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,

  // Credit / Bank Card (16 digits)
  BANK_CARD: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g
};

/**
 * Detects Ghanaian specific PII and sensitive patterns deterministically
 */
export function detectGhanaPII(text: string): DetectedFinding[] {
  if (!text) return [];

  const findings: DetectedFinding[] = [];

  // Ghana Card
  let match: RegExpExecArray | null;
  while ((match = PATTERNS.GHANA_CARD.exec(text)) !== null) {
    findings.push({
      type: 'GOVERNMENT_ID',
      confidence: 0.99,
      severity: 'CRITICAL',
      startOffset: match.index,
      endOffset: match.index + match[0].length,
      matchedText: match[0],
      detector: 'DETERMINISTIC_GHANA_CARD',
      policyAction: 'REDACT'
    });
  }

  // Ghana Phone Number
  while ((match = PATTERNS.GHANA_PHONE.exec(text)) !== null) {
    findings.push({
      type: 'PHONE_NUMBER',
      confidence: 0.98,
      severity: 'HIGH',
      startOffset: match.index,
      endOffset: match.index + match[0].length,
      matchedText: match[0],
      detector: 'DETERMINISTIC_GHANA_PHONE',
      policyAction: 'REDACT'
    });
  }

  // GhanaPost GPS
  while ((match = PATTERNS.GHANA_POST_GPS.exec(text)) !== null) {
    findings.push({
      type: 'PRIVATE_LOCATION',
      confidence: 0.95,
      severity: 'MODERATE',
      startOffset: match.index,
      endOffset: match.index + match[0].length,
      matchedText: match[0],
      detector: 'DETERMINISTIC_GHANAPOST_GPS',
      policyAction: 'REDACT'
    });
  }

  // License Plate
  while ((match = PATTERNS.GHANA_LICENSE_PLATE.exec(text)) !== null) {
    findings.push({
      type: 'LICENSE_PLATE',
      confidence: 0.92,
      severity: 'MODERATE',
      startOffset: match.index,
      endOffset: match.index + match[0].length,
      matchedText: match[0],
      detector: 'DETERMINISTIC_LICENSE_PLATE',
      policyAction: 'REDACT'
    });
  }

  // Email
  while ((match = PATTERNS.EMAIL.exec(text)) !== null) {
    findings.push({
      type: 'EMAIL',
      confidence: 0.98,
      severity: 'HIGH',
      startOffset: match.index,
      endOffset: match.index + match[0].length,
      matchedText: match[0],
      detector: 'DETERMINISTIC_EMAIL',
      policyAction: 'REDACT'
    });
  }

  // TIN
  while ((match = PATTERNS.GHANA_TIN.exec(text)) !== null) {
    findings.push({
      type: 'GOVERNMENT_ID',
      confidence: 0.90,
      severity: 'HIGH',
      startOffset: match.index,
      endOffset: match.index + match[0].length,
      matchedText: match[0],
      detector: 'DETERMINISTIC_GHANA_TIN',
      policyAction: 'REDACT'
    });
  }

  return findings;
}
