'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import crypto from 'crypto';

/**
 * @fileOverview Definitive 3-task pipelined keyword extraction system.
 * Uses manual JSON parsing and Zod validation for maximum stability.
 */

// --- Schemas ---

const Task1OutputSchema = z.object({
  jobTitle: z.string(),
  senioritySignals: z.array(z.string()),
  extractedPhrases: z.array(z.object({
    surfaceTerm: z.string(),
    requirementTier: z.enum(['required', 'preferred']),
    priorityWeight: z.coerce.number().int().min(1).max(5),
    context: z.string(),
  })),
  totalExtracted: z.coerce.number().int(),
});

const Task2OutputSchema = z.object({
  enrichedKeywords: z.array(z.object({
    surfaceTerm: z.string(),
    canonicalTerm: z.string(),
    category: z.enum(['hard_skill', 'soft_skill', 'certification', 'tool_platform']),
    requirementTier: z.enum(['required', 'preferred']),
    priorityWeight: z.coerce.number().int().min(1).max(5),
    context: z.string(),
  })),
  totalEnriched: z.coerce.number().int(),
});

const Task3OutputSchema = z.object({
  impliedKeywords: z.array(z.object({
    canonicalTerm: z.string(),
    category: z.enum(['hard_skill', 'soft_skill', 'certification', 'tool_platform']),
    requirementTier: z.literal('implied'),
    priorityWeight: z.coerce.number().int().min(1).max(3),
    inferredFrom: z.string(),
    reasoning: z.string(),
  })),
  seniorityLevel: z.enum([
    'intern', 'entry_level', 'mid_level', 'senior', 'lead',
    'manager', 'director', 'vp', 'c_level', 'not_specified'
  ]),
  roleType: z.string(),
  industryContext: z.string(),
});

// --- Helpers ---

function normalizeJd(text: string): string {
  return text.toLowerCase().replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
}

function sha256Base64Url(text: string): string {
  return crypto.createHash("sha256").update(text).digest("base64url");
}

function cleanJsonResponse(rawText: string): any {
  const cleaned = rawText
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("Failed to parse JSON. Raw text:", rawText);
    throw e;
  }
}

// --- Orchestrator ---

export const extractKeywordsFlow = ai.defineFlow(
  {
    name: 'extractKeywordsFlow',
    inputSchema: z.object({
      jobDescription: z.string(),
      ownerUid: z.string().optional(),
      forceRefresh: z.boolean().optional(),
    }),
    outputSchema: z.any(),
  },
  async (input) => {
    const normalized = normalizeJd(input.jobDescription);
    const cacheKey = sha256Base64Url(`v4_stable::${normalized}`);

    // 1. Cache Check
    const { initializeFirebase } = await import('@/firebase');
    const { firestore } = initializeFirebase();
    const cacheRef = doc(firestore, 'jdKeywordCache', cacheKey);
    
    if (!input.forceRefresh) {
      try {
        const cacheSnap = await getDoc(cacheRef);
        if (cacheSnap.exists()) {
          const cached = cacheSnap.data();
          if (cached.result) return cached.result;
        }
      } catch (e) {
        console.warn("Cache read failed, proceeding with pipeline:", e);
      }
    }

    // 2. TASK 1: Phrase Extraction
    let task1Result;
    try {
      const prompt = ai.prompt('extract_phrases');
      const response = await prompt({ jobDescriptionText: input.jobDescription });
      const parsed = cleanJsonResponse(response.text);
      task1Result = Task1OutputSchema.parse(parsed);
    } catch (e) {
      throw new Error("Keyword extraction failed. Please verify your job description contains enough text and try again.");
    }

    // 3. TASK 2: Classification (Non-terminal)
    let task2Result;
    try {
      const prompt = ai.prompt('classify_keywords');
      const response = await prompt({ extractedPhrasesJson: JSON.stringify(task1Result.extractedPhrases) });
      const parsed = cleanJsonResponse(response.text);
      task2Result = Task2OutputSchema.parse(parsed);
    } catch (e) {
      console.error("Task 2 failed, falling back to basic enrichment:", e);
      task2Result = {
        enrichedKeywords: task1Result.extractedPhrases.map(p => ({
          ...p,
          canonicalTerm: p.surfaceTerm,
          category: 'hard_skill' as const,
        })),
        totalEnriched: task1Result.extractedPhrases.length
      };
    }

    // 4. TASK 3: Implied Skills (Non-terminal)
    let task3Result;
    try {
      const prompt = ai.prompt('infer_implied_skills');
      const response = await prompt({
        jobDescriptionText: input.jobDescription,
        jobTitle: task1Result.jobTitle,
        senioritySignalsJson: JSON.stringify(task1Result.senioritySignals),
        canonicalKeywordListJson: JSON.stringify(task2Result.enrichedKeywords.map(k => k.canonicalTerm))
      });
      const parsed = cleanJsonResponse(response.text);
      task3Result = Task3OutputSchema.parse(parsed);
    } catch (e) {
      console.error("Task 3 failed, skipping implied skills:", e);
      task3Result = {
        impliedKeywords: [],
        seniorityLevel: 'not_specified' as const,
        roleType: '',
        industryContext: ''
      };
    }

    // 5. Final Assembly
    const keywords = task2Result.enrichedKeywords;
    const impliedKeywords = task3Result.impliedKeywords;
    const allKeywords = [...keywords, ...impliedKeywords];

    const finalResult = {
      jobTitle: task1Result.jobTitle,
      seniorityLevel: task3Result.seniorityLevel,
      senioritySignals: task1Result.senioritySignals,
      roleType: task3Result.roleType,
      industryContext: task3Result.industryContext,
      keywords,
      impliedKeywords,
      summary: {
        totalKeywords: allKeywords.length,
        requiredCount: keywords.filter(k => k.requirementTier === 'required').length,
        preferredCount: keywords.filter(k => k.requirementTier === 'preferred').length,
        impliedCount: impliedKeywords.length,
        hardSkillCount: allKeywords.filter(k => k.category === 'hard_skill').length,
        softSkillCount: allKeywords.filter(k => k.category === 'soft_skill').length,
        certificationCount: allKeywords.filter(k => k.category === 'certification').length,
        toolPlatformCount: allKeywords.filter(k => k.category === 'tool_platform').length,
      },
    };

    // 6. Cache Write
    setDoc(cacheRef, {
      ownerUid: input.ownerUid || 'anonymous',
      schemaVersion: "v4_stable",
      normalizedTextHash: cacheKey,
      updatedAt: serverTimestamp(),
      result: finalResult,
    }, { merge: true }).catch(e => console.error("Cache write failed:", e));

    return finalResult;
  }
);
