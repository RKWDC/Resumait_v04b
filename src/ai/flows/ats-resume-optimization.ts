// MODEL LOCK: googleai/gemini-3.8-flash — DO NOT CHANGE

'use server';

/**
 * @fileOverview An ATS resume optimization system strictly aligned with the MASTER ATS TEMPLATE.
 * Implements parallel role-level fan-out for maximum performance and reliability.
 */

import { ai, DEFAULT_MAX_OUTPUT_TOKENS } from '@/ai/genkit';
import { z } from 'genkit';
import { generateAtsSummary } from './summary-generation-flow';
import { validateHeadline, stripAtsLabels } from '@/lib/validation-logic';
import { normalizeForMatch } from '@/lib/ats-logic';

export async function optimize(input: {
  resumeText: string;
  jobDescriptionText: string;
  targetJobTitle: string;
  keywordsJson?: string;
}) {
  const startTime = Date.now();
  const keywordsData = input.keywordsJson ? JSON.parse(input.keywordsJson) : { keywords: [] };
  const priorityKeywords = keywordsData.keywords?.map((k: any) => k.canonicalTerm || k.surfaceTerm) || [];

  // 1. STAGE ONE: INDEPENDENT ANALYSIS & DECOMPOSITION
  // Concurrent Decomposition (New Step 4.5 strategy)
  const decompositionPromise = ai.generate({
    config: { temperature: 0.1, maxOutputTokens: 32768 },
    output: {
      schema: z.object({
        roles: z.array(z.object({
          title: z.string(),
          company: z.string(),
          location: z.string(),
          dateRange: z.string(),
          originalBullets: z.array(z.string())
        }))
      })
    },
    system: "You are a precise data extractor. Parse the professional experience section of the resume into a structured JSON array of roles. // MODEL LOCK: googleai/gemini-3.8-flash — DO NOT CHANGE",
    prompt: `Candidate Resume Text: ${input.resumeText}`
  });

  const signalsPromise = ai.generate({
    config: { maxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS },
    output: { schema: z.object({ years: z.number(), seniority: z.enum(['intern', 'entry_level', 'mid_level', 'senior', 'lead', 'manager', 'director', 'vp', 'c_level', 'not_specified']), isChanger: z.boolean() }) },
    system: "Identify candidate career signals. NO TYPOS. Output ONLY JSON. // MODEL LOCK: googleai/gemini-3.8-flash — DO NOT CHANGE",
    prompt: input.resumeText
  });

  // Await signals first to inform classification
  const signalsResponse = await signalsPromise;
  const signals = signalsResponse.output || { years: 5, seniority: 'mid_level', isChanger: false };

  // 2. STAGE TWO: CLASSIFICATION (Awaits Signals)
  const classificationSchema = z.object({
    reasoning: z.string(),
    path: z.enum(['path_a', 'path_a_unverified', 'path_b']),
    confidence: z.number(),
  });

  let classificationResponse;
  let classificationAttempt = 0;
  while (classificationAttempt < 2) {
    try {
      const response = await ai.generate({
        config: { temperature: 0, maxOutputTokens: 8192 },
        output: { format: 'json' },
        system: "You are a professional Career Auditor. // MODEL LOCK: googleai/gemini-3.8-flash — DO NOT CHANGE",
        prompt: `Analyze if the candidate's actual work history overlaps the target role based on SCOPE. 
        
        Populate reasoning first. State the candidate's actual scope, the target role's scope, and where they overlap or diverge. Reasoning must be at most two sentences and under 60 words. Do not elaborate.
        
        Then select the path that follows from that analysis. Every field is required.

        Return ONLY a JSON object matching this schema:
        {
          "reasoning": string,
          "path": "path_a" | "path_a_unverified" | "path_b",
          "confidence": number
        }

        PATH_A: The candidate's actual scope — budget, headcount, P&L, functional domain, and decision authority — substantively overlaps the target role. A different job title over comparable scope is title bridging, NOT a career change.
        PATH_A_UNVERIFIED: Scope overlap is plausible but evidence is generic or the original title is ambiguous.
        PATH_B: A genuine change of functional domain, where the candidate would be doing materially different work than they have done before.
        
        RULES:
        1. Sector is judged by the employer's actual market, not by labels like public or private. A government-services contractor serving federal agencies is the same sector as federal government work. Moving between them is a lateral move, not a pivot.
        2. Ambiguity about overlap resolves to PATH_A_UNVERIFIED.
        3. PATH_B requires positive evidence of a functional domain change, not merely a title difference.
        
        Target: ${input.targetJobTitle}
        Resume: ${input.resumeText}
        Signals: ${JSON.stringify(signals)}`
      });

      if (response.finishReason && response.finishReason.toLowerCase() !== 'stop') {
        throw new Error(`ATS_CLASSIFICATION_TRUNCATION_ERROR: Classification was cut off. Finish Reason: ${response.finishReason}`);
      }

      classificationResponse = { output: classificationSchema.parse(response.output) };
      break;
    } catch (err: any) {
      classificationAttempt++;
      if (classificationAttempt >= 2) {
        if (err.message.includes('ATS_CLASSIFICATION_TRUNCATION_ERROR')) {
          throw err;
        }
        throw new Error(`ATS_CLASSIFICATION_SCHEMA_ERROR: Schema validation failed twice. ${err.message}`);
      }
    }
  }
  
  let classification = classificationResponse.output || { path: 'path_b', confidence: 0.5, reasoning: "Defaulted to Path B." };
  if (classification.confidence < 0.7 && classification.path !== 'path_a_unverified') {
    classification.path = 'path_b';
  }

  // 3. STAGE THREE: SUMMARY, HEADER & DECOMPOSITION PROCESSING
  const summaryPromise = generateAtsSummary({
    resumeText: input.resumeText,
    jobDescriptionText: input.jobDescriptionText,
    targetJobTitle: input.targetJobTitle,
    experienceYears: signals.years,
    seniority: signals.seniority as any,
    isCareerChanger: signals.isChanger,
    priorityKeywords: priorityKeywords,
    classificationPath: classification.path === 'path_a_unverified' ? 'path_a' : classification.path as any
  });

  const headerPromise = ai.generate({
    config: { maxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS },
    output: { schema: z.object({ name: z.string(), headline: z.string(), contact: z.string() }) },
    system: `You are an elite Resume Writer. // MODEL LOCK: googleai/gemini-3.8-flash — DO NOT CHANGE
    Generate a high-fidelity headline and contact block using the provided Classification Path and Career Signals.
    
    Seniority: ${signals.seniority}
    Years: ${signals.years}

    BANNED PHRASES: "Aspiring", "Seeking", "Transitioning to", "Looking to", "Hoping to", "Eager to".
    A headline states what the candidate is and has done, never what they want.
    At director level or above, lead with the target title or current scope as a declarative statement.
    
    For PATH_B, the headline must not state the target job title as the candidate's identity, because they have not held that role or comparable scope. Lead with what the candidate actually is and the transferable scope they bring. The framing is declarative about real experience, not aspirational about a desired role. Example shape: '<Actual current role> | <Years> Years <Transferable domain> | <Concrete scope or achievement>'.

    For PATH_A and PATH_A_UNVERIFIED the headline may state the target title, because scope overlap has been established.
    
    STRICT RULES:
    1. HEADLINE: Single line, exactly 5-12 words. Use pipe | separator.
    2. CONTACT: Include phone, email, location. Separate EXCLUSIVELY by pipes (|).
    3. NO CONTRACTIONS: Expand all contractions.
    4. Exact phrasing for target title if bridging: ${input.targetJobTitle}
    5. NUMBERS: Spell out numbers zero through nine (e.g., "three"). Use digits for numbers 10 and above (e.g., "12").`,
    prompt: `Candidate Resume Text: ${input.resumeText}\nPath: ${classification.path}`
  });

  const decompositionResponse = await decompositionPromise;
  const sourceRoles = decompositionResponse.output?.roles || [];

  console.log("DECOMPOSITION_DIAGNOSTIC", {
    finishReason: decompositionResponse.finishReason,
    usage: decompositionResponse.usage,
    charLength: decompositionResponse.text.length,
    rolesParsed: sourceRoles.length
  });

  if (decompositionResponse.finishReason && decompositionResponse.finishReason.toLowerCase() !== 'stop') {
    throw new Error(`ATS_DECOMPOSITION_TRUNCATION_ERROR: Role extraction was cut off. Finish Reason: ${decompositionResponse.finishReason}`);
  }

  if (!decompositionResponse.output) {
    throw new Error(`ATS_DECOMPOSITION_SCHEMA_ERROR: Response failed output-schema validation. Raw text (first 500 chars): ${decompositionResponse.text.substring(0, 500)}`);
  }

  if (sourceRoles.length === 0) {
    throw new Error("ATS_DECOMPOSITION_EMPTY_ERROR: Response parsed successfully but returned zero roles.");
  }

  // 4. KEYWORD PRE-ASSIGNMENT
  const roleKeywords = sourceRoles.map(() => [] as any[]);
  const jdKeywords = keywordsData.keywords || [];
  jdKeywords.forEach(kw => {
    const term = normalizeForMatch(kw.term || kw.surfaceTerm || '');
    const matchedIdx = sourceRoles.findIndex(role => 
      role.originalBullets.some(b => normalizeForMatch(b).includes(term)) ||
      normalizeForMatch(role.title).includes(term)
    );
    if (matchedIdx !== -1) {
      roleKeywords[matchedIdx].push(kw);
    }
  });

  // 5. STAGE FOUR: CONCURRENT BODY GENERATION (Fan-Out)
  const roleOptimizationPromises = sourceRoles.map((role, idx) => {
    return ai.generate({
      config: { temperature: 0.1, maxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS },
      system: `You are an elite ATS resume writer. // MODEL LOCK: googleai/gemini-3.8-flash — DO NOT CHANGE
      Rewrite the provided professional role according to the RESUMAIT Master ATS Template. 
      
      STRICT RULES:
      1. ZERO CONTRACTIONS: Expand all contractions (e.g., use "do not" instead of "don't", "cannot" instead of "can't").
      2. NO ITALICS: Do not use markdown italics or slanted text.
      3. EXPERIENCE HEADER: Exactly [Job Title] | [Company Name] | [Location] | [Date Range]. JOB TITLE FIRST. Use Title Case (Headline Style) for titles and company names.
      4. HISTORICAL TITLES: You MUST NOT alter or upgrade job titles. Use the title provided in the input exactly, but normalize to Title Case (Headline Style).
      5. BULLET POINTS: Exactly 4-6 achievement-oriented bullets per role. Use bullet points (•) exclusively.
      6. BULLET CONTENT: Every bullet MUST start with an action verb in sentence case (e.g., Spearheaded). Every bullet MUST include a quantified metric ($, %, #). Max 28 words.
      7. NUMBERS: Spell out numbers zero through nine (e.g., "five"). Use digits for numbers 10 and above (e.g., "12").

      KEYWORD WEAVING — THIS ROLE ONLY.
      You have the original role text and a subset of target keywords. Where supported by evidence in the original bullets, express achievements using the target vocabulary.
      EVIDENCE GATE: Judge support against the ORIGINAL role text ONLY. Never invent experience.
      METHOD: Substitution, never addition. Distribute woven keywords across different bullets. Max one keyword per bullet.
      MARKUP: Wrap woven keywords as @@ADDED_SUPPORTED:<category>:<term>@@.

      OUTPUT CONTRACT — this overrides every formatting instinct:
      Return the finished resume text and nothing else. The response is the document itself, not a report about producing it.
      Never emit any of the following:
      - Word counts or character counts.
      - Labels such as 'Role 1:', 'Original text:', 'Bullets:'.
      - Numbered lists for accomplishments.
      - Preamble or commentary.`,
      prompt: `Original Role Data: ${JSON.stringify(role)}\nFull Resume (for evidence check): ${input.resumeText}\nTarget Keywords for this role: ${JSON.stringify({ keywords: roleKeywords[idx] })}`
    });
  });

  const sectionsPromise = ai.generate({
    config: { temperature: 0.1, maxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS },
    system: `You are an elite ATS resume writer. // MODEL LOCK: googleai/gemini-3.8-flash — DO NOT CHANGE
    Generate the CORE SKILLS, EDUCATION, and CERTIFICATIONS sections according to the RESUMAIT Master ATS Template.
    
    STRICT RULES:
    1. ZERO CONTRACTIONS: Expand all contractions.
    2. NO ITALICS: No slanted text.
    3. SECTION ORDER:
       CORE SKILLS
       PROFESSIONAL EXPERIENCE
       EDUCATION
       CERTIFICATIONS
    4. NUMBERS: Spell out numbers zero through nine. Use digits for 10 and above.
    5. LIST MARKERS: Use bullet points (•) exclusively for list items in Education and Certifications. Do not use dashes.

    CORE SKILLS:
    - 12-18 keywords total.
    - Divided into "Technical" and "Professional" categories.
    - Every term MUST carry its conventional professional capitalization (C4ISR, DevSecOps, AWS, etc.).

    OUTPUT CONTRACT:
    Return the finished sections in order. For the PROFESSIONAL EXPERIENCE section, return only the section header and the placeholder [ROLES_CONTENT]. No name, headline, contact, or summary.`,
    prompt: `Original Resume: ${input.resumeText}\nTarget Job Description: ${input.jobDescriptionText}`
  });

  // 6. FINAL ASSEMBLY
  const [summaryResult, headerResponse, optimizedRoleResponses, sectionsResponse] = await Promise.all([
    summaryPromise,
    headerPromise,
    Promise.all(roleOptimizationPromises),
    sectionsPromise
  ]);

  // DIAGNOSTIC LOGGING
  const totalElapsed = Date.now() - startTime;
  console.log("GENERATE_BODY_DIAGNOSTIC", {
    totalWallClockMs: totalElapsed,
    finishReasons: {
      decomposition: decompositionResponse.finishReason,
      header: headerResponse.finishReason,
      sections: sectionsResponse.finishReason,
      roles: optimizedRoleResponses.map(r => r.finishReason)
    },
    usage: {
      totalInputTokens: [decompositionResponse, headerResponse, sectionsResponse, ...optimizedRoleResponses].reduce((s, r) => s + (r.usage.inputTokens || 0), 0),
      totalOutputTokens: [decompositionResponse, headerResponse, sectionsResponse, ...optimizedRoleResponses].reduce((s, r) => s + (r.usage.outputTokens || 0), 0)
    }
  });

  // Truncation check
  [headerResponse, sectionsResponse, ...optimizedRoleResponses].forEach((resp, i) => {
    if (resp.finishReason && resp.finishReason.toLowerCase() !== 'stop') {
      throw new Error(`ATS_OPTIMIZATION_TRUNCATION: Task ${i} failed with reason: ${resp.finishReason}`);
    }
  });

  const headerData = headerResponse.output || { name: 'CANDIDATE', headline: input.targetJobTitle, contact: 'Phone | Email' };
  const cleanHeadline = stripAtsLabels(headerData.headline);
  const validation = validateHeadline(cleanHeadline, classification.path as any, input.targetJobTitle);
  
  if (!validation.passed) {
    // If validation fails, use target job title directly (no "Aspiring")
    headerData.headline = input.targetJobTitle;
  }

  // Final role count check
  if (optimizedRoleResponses.length !== sourceRoles.length && sourceRoles.length > 0) {
    throw new Error(`ATS_OPTIMIZATION_ERROR: Role count mismatch. Expected ${sourceRoles.length}, got ${optimizedRoleResponses.length}.`);
  }

  const stitchedRoles = optimizedRoleResponses.map(r => r.text.trim()).join('\n\n');
  const bodyText = sectionsResponse.text.replace('[ROLES_CONTENT]', stitchedRoles);

  const finalResume = [
    headerData.name.toUpperCase(),
    cleanHeadline,
    headerData.contact,
    "",
    summaryResult.heading.toUpperCase(),
    summaryResult.summary,
    "",
    bodyText.trim()
  ].join('\n');

  return {
    optimizedResumeText: finalResume,
    classification,
    summary: { 
      keywordsAdded: [], 
      sectionsModified: ["Summary", "Experience", "Education", "Certifications"], 
      estimatedScoreImprovement: 15,
      warnings: classification.path === 'path_a_unverified' ? ['Insufficient evidence detected to substantiate target job title bridge. Headline uses original job title.'] : []
    },
  };
}
