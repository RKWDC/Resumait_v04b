// MODEL LOCK: googleai/gemini-3.8-flash — DO NOT CHANGE

'use server';

/**
 * @fileOverview Smart Resume Compression Flow.
 * Shrinks resume to a standard 2-page limit using a measured loop with keyword protection.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { estimatePageCount } from '@/lib/page-geometry';
import { REDUCTION_TIERS, DISTILL_SYSTEM_INSTRUCTIONS } from '@/lib/distill-logic';
import { normalizeForMatch } from '@/lib/utils';

const CompressResumeInputSchema = z.object({
  resumeText: z.string().describe('The text of the resume to be compressed.'),
  keywords: z.array(z.string()).describe('List of critical keywords that MUST be preserved.'),
  targetJobTitle: z.string().optional(),
});

const CompressResumeOutputSchema = z.object({
  compressedResume: z.string().describe('The tightened, 2-page optimized resume text.'),
  trimSummary: z.string().describe('Short explanation of what was condensed.'),
  estimatedPageCount: z.number().optional().describe('The fractional page count of the result.'),
});

const prompt = ai.definePrompt({
  name: 'compressResumePrompt',
  input: { 
    schema: CompressResumeInputSchema.extend({
      strategy: z.string(),
      missingKeywords: z.array(z.string()).optional()
    }) 
  },
  output: { schema: CompressResumeOutputSchema },
  config: {
    temperature: 0.1,
    timeout: 110000,
    maxOutputTokens: 8192,
  },
  prompt: `${DISTILL_SYSTEM_INSTRUCTIONS}

  Original Resume to Compress:
  {{{resumeText}}}

  Target Job Title: {{{targetJobTitle}}}
  `,
});

const compressFlow = ai.defineFlow(
  {
    name: 'smartCompressResumeFlow',
    inputSchema: CompressResumeInputSchema,
    outputSchema: CompressResumeOutputSchema,
  },
  async (input) => {
    let currentText = input.resumeText;
    let lastSummary = "Starting 2-page compression loop.";
    const TARGET_PAGE_COUNT = 2.0;
    const SAFETY_MARGIN = 1.90;

    for (let i = 0; i < REDUCTION_TIERS.length; i++) {
      const pageBefore = estimatePageCount(currentText);
      if (pageBefore <= SAFETY_MARGIN) break;

      let missingKeywords: string[] = [];
      let attempt = 0;
      let iterationResult: any = null;

      while (attempt < 2) {
        const response = await prompt({
          ...input,
          resumeText: currentText,
          strategy: REDUCTION_TIERS[i],
          missingKeywords: missingKeywords.length > 0 ? missingKeywords : undefined
        });

        if (response.finishReason?.toLowerCase() !== 'stop') {
          throw new Error(`DISTILL_ERROR: Compression pass ${i+1} failed with reason: ${response.finishReason}`);
        }

        iterationResult = response.output;
        if (!iterationResult) throw new Error("DISTILL_ERROR: AI returned empty compression result.");

        // Keyword Assertion
        const normalizedOutput = normalizeForMatch(iterationResult.compressedResume);
        missingKeywords = input.keywords.filter(kw => !normalizedOutput.includes(normalizeForMatch(kw)));

        if (missingKeywords.length === 0) break;
        attempt++;
      }

      if (missingKeywords.length > 0) {
        throw new Error(`DISTILL_KEYWORD_LOSS: Could not preserve keywords after ${REDUCTION_TIERS[i]}. Missing: ${missingKeywords.join(', ')}`);
      }

      currentText = iterationResult.compressedResume;
      lastSummary = iterationResult.trimSummary;
      const pageAfter = estimatePageCount(currentText);

      console.log("DISTILL_DIAGNOSTIC", {
        type: "2-PAGE",
        tier: i + 1,
        pagesBefore: pageBefore.toFixed(2),
        pagesAfter: pageAfter.toFixed(2),
        keywordsPreserved: true
      });
    }

    const finalCount = estimatePageCount(currentText);
    return {
      compressedResume: currentText,
      trimSummary: lastSummary,
      estimatedPageCount: finalCount
    };
  }
);

export async function compressToTwoPages(input: z.infer<typeof CompressResumeInputSchema>) {
  return compressFlow(input);
}
