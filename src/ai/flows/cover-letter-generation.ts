// MODEL LOCK: googleai/gemini-3.8-flash — DO NOT CHANGE

'use server';

/**
 * @fileOverview Generates a tailored cover letter based on a resume and job description.
 *
 * - generateCoverLetter - A function that generates a cover letter.
 */

import {ai, DEFAULT_MAX_OUTPUT_TOKENS} from '@/ai/genkit';
import { CoverLetterInputSchema, CoverLetterOutputSchema, type CoverLetterInput, type CoverLetterOutput } from '@/ai/schemas/cover-letter-schema';
import { z } from 'genkit';

export async function generateCoverLetter(input: CoverLetterInput): Promise<CoverLetterOutput> {
  return generateCoverLetterFlow(input);
}

const prompt = ai.definePrompt({
  name: 'coverLetterPrompt',
  input: { 
    schema: CoverLetterInputSchema.extend({ 
      currentDate: z.string(),
      retryMessage: z.string().optional()
    }) 
  },
  output: {schema: CoverLetterOutputSchema},
  config: {
    maxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS,
    temperature: 0.2,
  },
  prompt: `
  {{#if retryMessage}}
  CRITICAL ERROR IN PREVIOUS PASS: {{retryMessage}}

  {{/if}}
  SYSTEM: You are an elite executive career coach and professional writer. Your task is to generate a high-impact, tailored cover letter.
  
  STRICT RULES:
  1. VOICE: Authoritative, dignified, and professional. Use a results-oriented tone.
  2. CONTENT: Highlight specific, relevant skills and metrics from the provided resume that align with the job description.
  3. NO HALLUCINATIONS: Do not invent new facts, metrics, or experiences. Use only what is in the provided resume.
  4. NO ITALICS: Do not use slanted text.
  5. NUMBERS: Spell out numbers zero through nine. Use digits for 10 and above.
  6. STRUCTURE — produce exactly these elements, in this order, each separated by a blank line:
    - The candidate's name, then a line with phone, email and city and state, taken from the resume.
    - The date. Use this exact string, character for character: {{currentDate}}. Do not compute, infer, reformat, or adjust it. Do not substitute any other date under any circumstances.
    - The company name from the job description, if one is stated. Omit this block entirely rather than inventing a recipient address.
    - A salutation. Use the hiring manager's name only if the job description states it; otherwise 'Dear Hiring Manager,'.
    - An opening paragraph naming the specific role being applied for.
    - Two or three body paragraphs presenting concrete evidence from the resume, including its metrics.
    - A closing paragraph with a direct call to action.
    - 'Sincerely,' then a blank line, then the candidate's name.

  7. PLAIN TEXT ONLY: no markdown, no asterisks, no underscores, no bullet characters, no headings. The output is rendered as plain text and any markup will appear literally to the user.

  8. LENGTH: 250 to 350 words in the body paragraphs.

  Resume Context:
  {{resumeText}}

  Target Job Description:
  {{jobDescriptionText}}
  `,
});

const generateCoverLetterFlow = ai.defineFlow(
  {
    name: 'generateCoverLetterFlow',
    inputSchema: CoverLetterInputSchema,
    outputSchema: CoverLetterOutputSchema,
  },
  async input => {
    const currentDate = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date());
    let retryMessage = '';

    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await prompt({ ...input, currentDate, retryMessage });
      
      const finishReason = response.finishReason?.toLowerCase();
      if (finishReason && finishReason !== 'stop') {
        throw new Error(`CL_GENERATION_TRUNCATION: Model failed to complete. Reason: ${response.finishReason}. Raw snippet: ${response.text.substring(0, 300)}`);
      }

      const output = response.output;
      if (!output) {
        throw new Error(`CL_GENERATION_EMPTY: AI returned null output. Reason: ${response.finishReason}. Raw snippet: ${response.text.substring(0, 300)}`);
      }

      if (output.coverLetter.includes(currentDate)) {
        return output;
      }

      retryMessage = `The letter was missing the required date string: "${currentDate}". You MUST include it character-for-character as specified in the rules.`;
    }

    throw new Error('CL_DATE_MISSING');
  }
);
