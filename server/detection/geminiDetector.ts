import { GoogleGenAI, Type } from '@google/genai';
import { DetectedFinding } from './ghanaDetectors';

let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: { 'User-Agent': 'aistudio-build' }
      }
    });
  }
  return geminiClient;
}

export interface ContextualAnalysisResult {
  status: 'SUCCESS' | 'AI_UNAVAILABLE' | 'FAILED';
  hasUnverifiedAllegation: boolean;
  containsPrivatePersonName: boolean;
  publicOfficialMentioned: boolean;
  suggestedFindings: DetectedFinding[];
  summary?: string;
}

/**
 * Performs semantic/contextual sensitivity analysis using Gemini
 * strictly following the AI Privacy Boundary directive.
 */
export async function analyzeContextualSensitivity(
  text: string,
  existingFindings: DetectedFinding[]
): Promise<ContextualAnalysisResult> {
  const ai = getGeminiClient();
  if (!ai) {
    return {
      status: 'AI_UNAVAILABLE',
      hasUnverifiedAllegation: false,
      containsPrivatePersonName: false,
      publicOfficialMentioned: false,
      suggestedFindings: []
    };
  }

  try {
    // Pre-sanitize text before sending to Gemini (AI Firewall principle)
    let aiSafeText = text;
    for (const f of existingFindings) {
      if (f.matchedText) {
        aiSafeText = aiSafeText.replace(f.matchedText, `[${f.type}]`);
      }
    }

    const systemPrompt = `You are the Privacy Firewall & Context Evaluator for Speak Up Ghana.
Analyze the report text to evaluate semantic context and privacy risks.

Key Rules:
1. Identify if text contains unverified criminal/corruption allegations against a named private citizen.
2. Determine whether mentioned named persons are Public Officials (e.g., MP, Minister, District Chief Executive, Police Commander) or Private Citizens.
3. Identify private citizen names that should be redacted for public projection.
4. Do NOT attempt legal conclusions or guilt determination.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: `Analyze this sanitized civic report for contextual privacy risks:\n"""${aiSafeText}"""`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hasUnverifiedAllegation: { type: Type.BOOLEAN },
            containsPrivatePersonName: { type: Type.BOOLEAN },
            privatePersonNames: { type: Type.ARRAY, items: { type: Type.STRING } },
            publicOfficialMentioned: { type: Type.BOOLEAN },
            publicOfficialNames: { type: Type.ARRAY, items: { type: Type.STRING } },
            riskLevel: { type: Type.STRING, enum: ['CRITICAL', 'HIGH', 'MODERATE', 'LOW'] },
            publicSafeSummary: { type: Type.STRING }
          },
          required: ['hasUnverifiedAllegation', 'containsPrivatePersonName', 'publicOfficialMentioned', 'riskLevel']
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    const suggestedFindings: DetectedFinding[] = [];

    if (Array.isArray(parsed.privatePersonNames)) {
      for (const name of parsed.privatePersonNames) {
        if (name && name.length > 2 && text.includes(name)) {
          suggestedFindings.push({
            type: 'PERSON_NAME',
            confidence: 0.85,
            severity: parsed.hasUnverifiedAllegation ? 'HIGH' : 'MODERATE',
            matchedText: name,
            detector: 'GEMINI_CONTEXT_EVALUATOR',
            policyAction: 'REDACT'
          });
        }
      }
    }

    if (parsed.hasUnverifiedAllegation) {
      suggestedFindings.push({
        type: 'CRIMINAL_ALLEGATION',
        confidence: 0.80,
        severity: 'HIGH',
        matchedText: '[UNVERIFIED_ALLEGATION]',
        detector: 'GEMINI_CONTEXT_EVALUATOR',
        policyAction: 'REDACT'
      });
    }

    return {
      status: 'SUCCESS',
      hasUnverifiedAllegation: Boolean(parsed.hasUnverifiedAllegation),
      containsPrivatePersonName: Boolean(parsed.containsPrivatePersonName),
      publicOfficialMentioned: Boolean(parsed.publicOfficialMentioned),
      suggestedFindings,
      summary: parsed.publicSafeSummary || undefined
    };
  } catch (err) {
    console.error('Gemini contextual analysis error:', err);
    return {
      status: 'AI_UNAVAILABLE',
      hasUnverifiedAllegation: false,
      containsPrivatePersonName: false,
      publicOfficialMentioned: false,
      suggestedFindings: []
    };
  }
}
