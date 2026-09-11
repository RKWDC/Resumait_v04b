// MODEL LOCK: googleai/gemini-3.8-flash — DO NOT CHANGE

'use server';

/**
 * @fileOverview Canonical Production Extraction Engine.
 * Direct input provider for the deterministic scoring engine.
 * Governed by the RECREATION_GUIDE — Section I.1.
 * 
 * Includes read-through caching via KeywordCache entity to ensure score stability.
 */

import { ai, DEFAULT_MAX_OUTPUT_TOKENS } from '@/ai/genkit';
import { z } from 'genkit';
import crypto from 'crypto';

const ExtractionOutputSchema = z.object({
  jobTitle: z.string().optional().describe('The core job title identified in the description.'),
  requiredTitles: z.array(z.string()).optional().describe('The core title + 2-3 closely related seniorities.'),
  keywords: z.array(z.object({
    term: z.string().describe('Verbatim primary form from the JD'),
    category: z.enum(['tool', 'technology', 'methodology', 'certification', 'domain', 'soft']),
    priority: z.enum(['required', 'preferred']),
    aliases: z.array(z.string()).describe('Synonyms + the acronym/spelled-out counterpart'),
    importance: z.number().int().min(1).max(5)
  })).optional(),
  knockouts: z.object({
    minYearsExperience: z.number().nullable().optional(),
    minEducation: z.string().optional().default('Not Specified'),
    degreeField: z.string().nullable().optional(),
    certifications: z.array(z.string()).optional(),
    clearances: z.array(z.string()).optional(),
    location: z.string().nullable().optional(),
    workAuthorization: z.string().nullable().optional()
  }).optional()
});

const SYSTEM_INSTRUCTION = `You are an elite ATS Configuration Engine. Parse the Job Description into a structured, deduplicated Requirement Schema.
1. Completeness: extract EVERY unique requirement as one keyword object.
2. Category: tool, technology, methodology, certification, domain, or soft.
3. Priority: 'required' if under Requirements/Qualifications or with must/required/minimum/'X+ years'; 'preferred' for a plus/bonus/ideally/nice-to-have. Unclear -> 'required'.
4. Aliases (CRITICAL): for EVERY keyword include the ACRONYM AND its spelled-out form (put whichever isn't in \`term\` into aliases, e.g. term 'AWS' -> ['Amazon Web Services']), plus common synonyms.
5. Preserve specialized terms VERBATIM: keep C4ISR, Spectrum, Vision AI, Electronic Warfare, DevSecOps exactly; NEVER generalize a named capability into a category ('Vision AI' is NOT 'Computer Vision'); when the JD lists a series, extract EACH item — never drop one.
6. Importance 1-5: higher when a term recurs and/or sits in Requirements.
7. Knockouts: minimum YEARS ('15+ years' -> 15), minimum EDUCATION + degree FIELD, named CERTIFICATIONS/licenses, security CLEARANCES, LOCATION, WORK AUTHORIZATION. Omit a field when absent.
8. Eliminate fluff ('fast-paced', 'rockstar', 'wear many hats').
9. Output must match the schema; never nest arrays inside arrays; no empty strings.`;

const SCHEMA_VERSION = "v4_production";

// MANDATORY NORMALIZATION
const CATS = ['tool', 'technology', 'methodology', 'certification', 'domain', 'soft'];
const flat = (a: any) => Array.isArray(a) ? a.map(x => Array.isArray(x) ? x.filter(Boolean).join(', ') : x).filter(s => typeof s === 'string' && s.trim()).map(s => s.trim()) : [];
const str = (v: any) => typeof v === 'string' && v.trim() ? v.trim() : null;

function normalize(raw: any) {
  const seen = new Set();
  const keywords = (Array.isArray(raw?.keywords) ? raw.keywords : [])
    .filter((k: any) => k && typeof k.term === 'string' && k.term.trim())
    .map((k: any) => ({
      term: String(k.term).trim(),
      category: CATS.includes(k.category) ? k.category : 'technology',
      priority: k.priority === 'preferred' ? 'preferred' : 'required',
      aliases: flat(k.aliases),
      importance: Math.max(1, Math.min(5, Math.round(Number(k.importance)) || 3))
    }))
    .filter((k: any) => {
      const key = k.term.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  const kn = raw?.knockouts || {};
  const knockouts = {
    minYearsExperience: Number.isFinite(kn.minYearsExperience) ? Number(kn.minYearsExperience) : null,
    minEducation: str(kn.minEducation) || 'Not Specified',
    degreeField: str(kn.degreeField),
    certifications: flat(kn.certifications),
    clearances: flat(kn.clearances),
    location: str(kn.location),
    workAuthorization: str(kn.workAuthorization)
  };

  return {
    jobTitle: str(raw?.jobTitle) || 'Position',
    requiredTitles: flat(raw?.requiredTitles),
    keywords,
    knockouts,
    // Back-compat for current scorer loop
    hardSkills: keywords.filter(k => k.category !== 'soft').map(k => k.term),
    softSkills: keywords.filter(k => k.category === 'soft').map(k => k.term)
  };
}

function normalizeJdForHashing(text: string): string {
  return text.toLowerCase().replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
}

function sha256Base64Url(text: string): string {
  return crypto.createHash("sha256").update(text).digest("base64url");
}

export async function extractKeywords(input: {
  jobDescription: string;
  ownerUid?: string;
  forceRefresh?: boolean;
}) {
  const normalizedJd = normalizeJdForHashing(input.jobDescription);
  const cacheKey = sha256Base64Url(`${SCHEMA_VERSION}::${normalizedJd}`);

  const { initializeFirebase } = await import('@/firebase');
  const { firestore } = initializeFirebase();
  const { doc, getDoc, setDoc, serverTimestamp } = await import('firebase/firestore');
  const cacheRef = doc(firestore, 'jdKeywordCache', cacheKey);

  // 1. CACHE READ
  if (!input.forceRefresh) {
    try {
      const snap = await getDoc(cacheRef);
      if (snap.exists()) {
        const cached = snap.data();
        if (cached.schemaVersion === SCHEMA_VERSION && cached.result) {
          console.log("CACHE_DIAGNOSTIC", {
            status: "HIT",
            key: cacheKey,
            keywordCount: cached.result.keywords?.length || 0
          });
          return cached.result;
        }
      }
    } catch (e) {
      console.warn("CACHE_READ_FAILURE: Proceeding with AI generation.", e);
    }
  }

  // 2. AI GENERATION
  const startTime = Date.now();
  const response = await ai.generate({
    config: { temperature: 0, maxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS },
    output: { schema: ExtractionOutputSchema },
    system: SYSTEM_INSTRUCTION,
    prompt: `JOB DESCRIPTION:\n${input.jobDescription}`,
  });

  const rawResult = response.output;
  if (!rawResult) throw new Error('AI failed to extract requirement schema.');

  const result = normalize(rawResult);
  const latencyMs = Date.now() - startTime;

  // 3. CACHE WRITE
  setDoc(cacheRef, {
    ownerUid: input.ownerUid || 'anonymous',
    schemaVersion: SCHEMA_VERSION,
    normalizedTextHash: cacheKey,
    updatedAt: serverTimestamp(),
    result: result,
    latencyMs: latencyMs
  }, { merge: true }).catch(e => console.error("CACHE_WRITE_FAILURE:", e));

  console.log("CACHE_DIAGNOSTIC", {
    status: "MISS",
    key: cacheKey,
    keywordCount: result.keywords?.length || 0
  });

  return result;
}
