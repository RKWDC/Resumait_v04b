// MODEL LOCK: googleai/gemini-3.8-flash — DO NOT CHANGE

'use server';
/**
 * @fileOverview Refines the prose of a cover letter for flow and impact.
 */
import { ai, DEFAULT_MAX_OUTPUT_TOKENS } from '@/ai/genkit';
import { z } from 'genkit';

const PolishCoverLetterInputSchema = z.object({
  coverLetterText: z.string().describe('The current text of the cover letter.'),
  resumeText: z.string().describe('The resume text for context.'),
});

const PolishCoverLetterOutputSchema = z.object({
  polishedCoverLetter: z.string().describe('The refined cover letter text.'),
});

export async function polishCoverLetter(input: z.infer<typeof PolishCoverLetterInputSchema>) {
  return polishCoverLetterFlow(input);
}

const polishPrompt = ai.definePrompt({
  name: 'polishCoverLetterPrompt',
  input: { schema: PolishCoverLetterInputSchema },
  output: { schema: PolishCoverLetterOutputSchema },
  config: {
    temperature: 0.1,
    maxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS,
  },
  prompt: `
  SYSTEM: You are an elite executive career coach and professional writer. Your task is to refine the provided cover letter for flow, impact, and professional narrative.
  
  STRICT RULES:
  1. NO HALLUCINATIONS: Do not invent new facts, metrics, or experiences. Use only what is in the resume or the current letter.
  2. VOICE: Authoritative, dignified, and professional.
  3. NO ITALICS: Do not use slanted text.
  4. FORMAT PRESERVATION: Preserve the existing structure (date, address, greeting, body, closing).
  5. NUMBERS: Spell out numbers zero through nine. Use digits for 10 and above.
  6. DATE PRESERVATION: The date line is correct and must be reproduced verbatim. Never alter, reformat, or replace it.

  Resume Context:
  {{resumeText}}

  Cover Letter to Polish:
  {{coverLetterText}}
  `,
});

const polishCoverLetterFlow = ai.defineFlow(
  {
    name: 'polishCoverLetterFlow',
    inputSchema: PolishCoverLetterInputSchema,
    outputSchema: PolishCoverLetterOutputSchema,
  },
  async (input) => {
    // Attempt to identify the date in the input text to ensure its preservation
    const dateRegex = /\b(?:January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4}\b/;
    const originalDate = input.coverLetterText.match(dateRegex)?.[0];

    const response = await polishPrompt(input);
    
    const finishReason = response.finishReason?.toLowerCase();
    if (finishReason && finishReason !== 'stop') {
      throw new Error(`CL_POLISH_TRUNCATION: Model failed to complete. Reason: ${response.finishReason}. Raw snippet: ${response.text.substring(0, 300)}`);
    }

    const { output } = response;
    if (!output) throw new Error(`CL_POLISH_EMPTY: AI returned null output. Reason: ${response.finishReason}. Raw snippet: ${response.text.substring(0, 300)}`);
    
    // Verify that the date present in the input still appears in the output
    if (originalDate && !output.polishedCoverLetter.includes(originalDate)) {
      throw new Error('CL_DATE_MISSING');
    }

    return output;
  }
);
