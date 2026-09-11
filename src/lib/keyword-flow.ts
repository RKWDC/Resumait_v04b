// MODEL LOCK: googleai/gemini-2.5-flash — DO NOT CHANGE

'use server';

/**
 * @fileOverview Pipelined keyword extraction orchestrator.
 * Decomposes extraction into 3 focused AI tasks to prevent timeouts.
 */

import { ai } from '@/ai/genkit';
import { ExtractionOutputSchema, type ExtractionOutput } from '@/ai/schemas';
import { z } from 'genkit';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import crypto from 'crypto';

function normalizeJd(text: string): string {
  return text.toLowerCase().replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
}

function sha256Base64Url(text: string): string {
  return crypto.createHash("sha256").update(text).digest("base64url");
}

export const extractKeywordsFlow = ai.defineFlow(
  {
    name: 'extractKeywordsFlow',
    inputSchema: z.object({ 
      jobDescription: z.string(),
      ownerUid: z.string().optional(),
      forceRefresh: z.boolean().optional(),
    }),
    outputSchema: ExtractionOutputSchema,
  },
  async (input) => {
    const normalized = normalizeJd(input.jobDescription);
    const cacheKey = sha256Base64Url(`v3_pipe::${normalized}`);

    const { initializeFirebase } = await import('@/firebase');
    const { firestore } = initializeFirebase();
    const cacheRef = doc(firestore, 'jdKeywordCache', cacheKey);
    
    if (!input.forceRefresh) {
      const cacheSnap = await getDoc(cacheRef);
      if (cacheSnap.exists()) {
        const cached = cacheSnap.data();
        if (cached.result) return cached.result as ExtractionOutput;
      }
    }

    // TASK 1: RAW PHRASE EXTRACTION & TIERING
    const task1Prompt = ai.definePrompt({
      name: 'extractPhrasesTask',
      config: { temperature: 0.2, maxOutputTokens: 2048, timeout: 110000 },
      input: { schema: z.object({ jobDescription: z.string() }) },
      prompt: `You are a phrase-level NLP extraction engine. Extract every meaningful skill, tool, and qualification from this job description.
      Classify each as 'required' or 'preferred' based on linguistic context.
      
      RULES:
      1. Extract multi-word phrases (bigrams/trigrams).
      2. Extract noun chunks (e.g., "project management", "Agile methodology").
      3. Strip experience qualifiers ("5+ years of Python" -> "Python").
      4. EXCLUDE company names, locations, and brand names of the employer.
      
      Return ONLY a JSON array of objects: { "phrase": string, "requirement": "required" | "preferred", "context": string }
      
      JD: {{jobDescription}}`
    });

    const t1Response = await task1Prompt({ jobDescription: input.jobDescription });
    const rawPhrases = t1Response.output as any[];

    // TASK 2: TAXONOMY MAPPING & CATEGORY CLASSIFICATION
    const task2Prompt = ai.definePrompt({
      name: 'classifyKeywordsTask',
      config: { temperature: 0.1, maxOutputTokens: 2048, timeout: 110000 },
      input: { schema: z.array(z.any()) },
      prompt: `Normalize these raw phrases into industry-standard canonical terms (O*NET/Lightcast) and classify them.
      
      Categories: hard_skill, soft_skill, certification, tool_platform.
      Priority Weight: 1-5 based on role importance.
      
      Phrases: {{json this}}
      
      Return ONLY a JSON array of Keyword objects: { "surfaceTerm", "canonicalTerm", "category", "requirement", "priorityWeight", "context" }`
    });

    const t2Response = await task2Prompt(rawPhrases);
    const explicitKeywords = t2Response.output as any[];

    // TASK 3: IMPLICIT KEYWORD INFERENCE
    const task3Prompt = ai.definePrompt({
      name: 'inferKeywordsTask',
      config: { temperature: 0.3, maxOutputTokens: 1024, timeout: 110000 },
      input: { schema: z.object({ jobDescription: z.string(), explicitKeywords: z.array(z.any()) }) },
      prompt: `Identify 5-8 high-value skills that are strongly implied but not explicitly mentioned in this job description.
      
      JD: {{jobDescription}}
      Explicitly Found: {{#each explicitKeywords}}{{this.canonicalTerm}}, {{/each}}
      
      Return ONLY a JSON array of Keyword objects with requirement set to 'implied'.`
    });

    const t3Response = await task3Prompt({ jobDescription: input.jobDescription, explicitKeywords });
    const impliedKeywords = t3Response.output as any[];

    // FINAL AGGREGATION
    const allKeywords = [...explicitKeywords, ...impliedKeywords];
    
    const result: ExtractionOutput = {
      schemaVersion: "resumait_extraction_v3_pipelined",
      jobTitle: "Analyzed Role", // Simplified for speed
      seniorityLevel: "not_specified",
      senioritySignals: [],
      roleType: "Professional",
      industryContext: "General",
      keywords: explicitKeywords,
      impliedKeywords: impliedKeywords,
      summary: {
        totalKeywords: allKeywords.length,
        requiredCount: explicitKeywords.filter(k => k.requirement === 'required').length,
        preferredCount: explicitKeywords.filter(k => k.requirement === 'preferred').length,
        impliedCount: impliedKeywords.length,
        hardSkillCount: allKeywords.filter(k => k.category === 'hard_skill').length,
        softSkillCount: allKeywords.filter(k => k.category === 'soft_skill').length,
        certificationCount: allKeywords.filter(k => k.category === 'certification').length,
        toolPlatformCount: allKeywords.filter(k => k.category === 'tool_platform').length,
      }
    };

    // Async cache write
    setDoc(cacheRef, {
      ownerUid: input.ownerUid || 'anonymous',
      schemaVersion: "v3_pipe",
      normalizedTextHash: cacheKey,
      updatedAt: serverTimestamp(),
      result: result,
    }, { merge: true }).catch(e => console.error("Extraction cache write failed:", e));

    return result;
  }
);
