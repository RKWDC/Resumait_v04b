// MODEL LOCK: googleai/gemini-3.8-flash — DO NOT CHANGE

'use server';

/**
 * @fileOverview High-Fidelity 1-Page Resume Distillation Flow.
 * Implements a measured loop with safety margins and keyword protection.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { estimatePageCount } from '@/lib/page-geometry';
import { REDUCTION_TIERS, DISTILL_SYSTEM_INSTRUCTIONS } from '@/lib/distill-logic';
import { normalizeForMatch } from '@/lib/utils';
import { getSection } from '@/lib/ats-logic';

const OnePageDistillInputSchema = z.object({
  resumeText: z.string().describe('The text of the resume to be distilled.'),
  keywords: z.array(z.string()).describe('List of critical keywords that MUST be preserved.'),
  targetJobTitle: z.string().optional(),
});

const OnePageDistillOutputSchema = z.object({
  distilledResume: z.string().describe('The surgical, 1-page optimized resume text.'),
  distillSummary: z.string().describe('Explanation of how the distillation preserved the ATS score.'),
  estimatedPageCount: z.number().optional().describe('The fractional page count of the result.'),
});

const prompt = ai.definePrompt({
  name: 'onePageDistillPrompt',
  input: { 
    schema: OnePageDistillInputSchema.extend({
      strategy: z.string(),
      missingKeywords: z.array(z.string()).optional(),
      headerError: z.boolean().optional()
    }) 
  },
  output: { schema: OnePageDistillOutputSchema },
  config: {
    temperature: 0.1,
    timeout: 110000,
    maxOutputTokens: 8192,
  },
  prompt: `${DISTILL_SYSTEM_INSTRUCTIONS}

  Original Resume to Distill:
  {{{resumeText}}}

  Target Job Title: {{{targetJobTitle}}}
  `,
});

export const onePageDistillFlow = ai.defineFlow(
  {
    name: 'onePageDistillFlow',
    inputSchema: OnePageDistillInputSchema,
    outputSchema: OnePageDistillOutputSchema,
  },
  async (input) => {
    let currentText = input.resumeText;
    let lastSummary = "Starting 1-page distillation loop.";
    const TARGET_PAGE_COUNT = 1.0;
    const SAFETY_MARGIN = 0.95;

    // Header preservation anchors
    const sourceLines = input.resumeText.split(/\r?\n/);
    const originalName = sourceLines[0]?.trim();
    const originalHeadline = sourceLines[1]?.trim();

    for (let i = 0; i < REDUCTION_TIERS.length; i++) {
      const pageBefore = estimatePageCount(currentText);
      if (pageBefore <= SAFETY_MARGIN) break;

      let missingKeywords: string[] = [];
      let headerError = false;
      let attempt = 0;
      let iterationResult: any = null;

      while (attempt < 2) {
        const response = await prompt({
          ...input,
          resumeText: currentText,
          strategy: REDUCTION_TIERS[i],
          missingKeywords: missingKeywords.length > 0 ? missingKeywords : undefined,
          headerError: headerError
        });

        if (response.finishReason?.toLowerCase() !== 'stop') {
          throw new Error(`DISTILL_ERROR: Distillation pass ${i+1} failed with reason: ${response.finishReason}`);
        }

        iterationResult = response.output;
        if (!iterationResult) throw new Error("DISTILL_ERROR: AI returned empty distillation result.");

        // 1. Keyword Assertion
        const normalizedOutput = normalizeForMatch(iterationResult.distilledResume);
        missingKeywords = input.keywords.filter(kw => !normalizedOutput.includes(normalizeForMatch(kw)));

        // 2. Header Assertion
        headerError = (!!originalName && !iterationResult.distilledResume.includes(originalName)) || 
                      (!!originalHeadline && !iterationResult.distilledResume.includes(originalHeadline));

        if (missingKeywords.length === 0 && !headerError) break;
        attempt++;
      }

      if (headerError) {
        const missing = [];
        if (originalName && !iterationResult.distilledResume.includes(originalName)) missing.push("Candidate Name");
        if (originalHeadline && !iterationResult.distilledResume.includes(originalHeadline)) missing.push("Professional Headline");
        throw new Error(`DISTILL_HEADER_LOSS: Pass ${i+1} (${REDUCTION_TIERS[i]}) failed to preserve header elements: ${missing.join(', ')}.`);
      }

      if (missingKeywords.length > 0) {
        throw new Error(`DISTILL_KEYWORD_LOSS: Could not preserve keywords after ${REDUCTION_TIERS[i]}. Missing: ${missingKeywords.join(', ')}`);
      }

      currentText = iterationResult.distilledResume;
      lastSummary = iterationResult.distillSummary;
      const pageAfter = estimatePageCount(currentText);

      console.log("DISTILL_DIAGNOSTIC", {
        type: "1-PAGE",
        tier: i + 1,
        pagesBefore: pageBefore.toFixed(2),
        pagesAfter: pageAfter.toFixed(2),
        keywordsPreserved: true,
        headerPreserved: true
      });
    }

    const finalCount = estimatePageCount(currentText);

    // EXIT GUARD: If after all tiers we are still over the safety margin, throw an intelligible error.
    if (finalCount > SAFETY_MARGIN) {
      const expText = normalizeForMatch(getSection(currentText, ['EXPERIENCE', 'WORK HISTORY', 'PROFESSIONAL EXPERIENCE', 'EMPLOYMENT', 'WORK EXPERIENCE']));
      const stuckKeywords = input.keywords.filter(kw => expText.includes(normalizeForMatch(kw)));
      
      throw new Error(
        `The document is still ${finalCount.toFixed(2)} pages after maximum reduction. To reach 1 page, the following keywords must be moved from your experience bullets into the Core Skills section: ${stuckKeywords.join(', ')}. Alternatively, consider a 2-page target for this volume of experience.`
      );
    }

    return {
      distilledResume: currentText,
      distillSummary: lastSummary,
      estimatedPageCount: finalCount
    };
  }
);

export async function distillToOnePage(input: z.infer<typeof OnePageDistillInputSchema>) {
  return onePageDistillFlow(input);
}
