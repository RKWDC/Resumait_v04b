// MODEL LOCK: googleai/gemini-3.8-flash — DO NOT CHANGE

'use server';

import { ai, DEFAULT_MAX_OUTPUT_TOKENS } from '@/ai/genkit';
import { z } from 'genkit';
import { scanKeywordPresence } from '@/lib/keywordPresenceScanner';
import { analyzeKeywordPlacement } from '@/lib/keywordPlacementAnalyzer';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { calculateAtsMatch } from '@/lib/ats-logic';

/**
 * @fileOverview Orchestrator for the sequential scoring pipeline.
 * Unified with the deterministic engine to prevent Scoring Logic Divergence.
 */

const PipelinedScoringInputSchema = z.object({
  resumeText: z.string(),
  jobDescriptionText: z.string(),
  extractedKeywordsJson: z.string(),
  scoringMode: z.enum(['initial', 'realtime']),
  initialScore: z.number().optional(),
  userId: z.string().optional(),
});

export type PipelinedScoringInput = z.infer<typeof PipelinedScoringInputSchema>;

const Task3OutputSchema = z.object({
  experienceAssessment: z.object({
    requiredYears: z.number().nullable(),
    detectedYears: z.number(),
    gapYears: z.number(),
    relevanceNotes: z.string(),
  }),
  educationAssessment: z.object({
    requiredLevel: z.string(),
    detectedLevel: z.string(),
    matchStatus: z.enum(['met', 'exceeded', 'not_met', 'not_specified']),
    notes: z.string(),
  }),
});

const Task4OutputSchema = z.object({
  semanticMatches: z.array(z.object({
    keyword: z.string(),
    evidence: z.string(),
    confidence: z.enum(['high', 'medium', 'low']),
  })),
  softSkillsContextuallyPresent: z.array(z.string()),
  softSkillsScore: z.number(),
});

function cleanJson(text: string) {
  return text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
}

export const scoreResumePipelined = ai.defineFlow(
  {
    name: 'scoreResumePipelined',
    inputSchema: PipelinedScoringInputSchema,
    outputSchema: z.any(),
  },
  async (input) => {
    const { resumeText, jobDescriptionText, extractedKeywordsJson, scoringMode, userId } = input;
    
    let keywords = [];
    try {
        keywords = JSON.parse(extractedKeywordsJson);
    } catch (e) {
        throw new Error("Diagnostic failure: Invalid keyword data provided.");
    }

    // 1. FAST DIAGNOSTICS (Task 1 & 2)
    const task1Result = scanKeywordPresence(resumeText, keywords);
    const task2Result = analyzeKeywordPlacement(resumeText, task1Result.found);

    // 2. FUZZY SIGNALS (Task 3 & 4)
    let task3Result;
    try {
      const { text } = await ai.generate({
        config: { temperature: 0.1, maxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS, timeout: 110000 },
        system: `Assess candidate's years of EXPERIENCE and EDUCATION level relative to the JD. Return ONLY JSON.`,
        prompt: `Resume: ${resumeText}\nJD: ${jobDescriptionText}`,
      });
      task3Result = Task3OutputSchema.parse(JSON.parse(cleanJson(text)));
    } catch (e) {
      task3Result = {
        experienceAssessment: { requiredYears: null, detectedYears: 5, gapYears: 0, relevanceNotes: "Analysis deferred." },
        educationAssessment: { requiredLevel: 'not_specified', detectedLevel: 'not_specified', matchStatus: 'not_specified' as const, notes: "Analysis deferred." }
      };
    }

    let task4Result;
    try {
      const { text } = await ai.generate({
        config: { temperature: 0.15, maxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS, timeout: 110000 },
        system: `Analyze missing keywords for semantic equivalents. Return ONLY JSON.`,
        prompt: `Resume: ${resumeText}\nMissing: ${JSON.stringify(task1Result.missing.slice(0, 30))}`,
      });
      task4Result = Task4OutputSchema.parse(JSON.parse(cleanJson(text)));
    } catch (e) {
      task4Result = { semanticMatches: [], softSkillsContextuallyPresent: [], softSkillsScore: 3 };
    }

    // 3. MASTER UNIFICATION (Deterministic Match)
    const targetJobTitle = jobDescriptionText.split('\n')[0]?.trim() || "Target Position";
    const masterMatch = calculateAtsMatch(keywords, resumeText, targetJobTitle);

    const result = {
      compositeScore: masterMatch.score,
      qualitativeRating: masterMatch.score >= 75 ? 'Excellent' : masterMatch.score >= 60 ? 'Strong' : 'Moderate',
      scoreBreakdown: {
        hardSkillsCertifications: { earned: masterMatch.breakdown.hardSkillsMatch, max: 100 },
        titleAlignment: { earned: masterMatch.breakdown.titleAlignment, max: 100 },
        yearsExperience: { earned: masterMatch.breakdown.experienceWeight, max: 100 },
        educationDegree: { earned: masterMatch.breakdown.educationMatch, max: 100 },
        softSkills: { earned: masterMatch.breakdown.softSkillsMatch, max: 100 },
      },
      penalties: masterMatch.breakdown.penalties,
      keywordResults: {
        foundCount: masterMatch.foundKeywords.length + masterMatch.supportedKeywords.length,
        missingCount: masterMatch.unsupportedKeywords.length,
      },
      experienceGapAnalysis: task3Result.experienceAssessment,
      educationAnalysis: task3Result.educationAssessment,
      topRecommendations: [
        masterMatch.unsupportedKeywords.length > 0 ? `Incorporate: ${masterMatch.unsupportedKeywords.slice(0, 3).join(', ')}` : "Technical alignment is optimal.",
        masterMatch.breakdown.titleAlignment < 100 ? "Adjust headline to exactly match target title." : "Title alignment is strong.",
        ...masterMatch.breakdown.penalties.map(p => p.reason)
      ],
      scoreImprovement: input.scoringMode === 'realtime' ? Math.round((masterMatch.score - (input.initialScore || 0)) * 10) / 10 : 0
    };

    if (userId) {
        const { initializeFirebase } = await import('@/firebase');
        const { firestore } = initializeFirebase();
        const userRef = doc(firestore, 'users', userId);
        const dataToSave = input.scoringMode === 'initial' 
            ? { initialScore: { ...result, scoredAt: serverTimestamp() } }
            : { currentOptimizedScore: { ...result, scoredAt: serverTimestamp() } };
        setDoc(userRef, dataToSave, { merge: true }).catch(e => console.error("Firebase persistence failed:", e));
    }

    return result;
  }
);
