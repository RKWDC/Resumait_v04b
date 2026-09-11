// MODEL LOCK: googleai/gemini-3.8-flash — DO NOT CHANGE

'use server';

/**
 * @fileOverview Generates resume-ready suggestions for blocked keywords.
 *
 * - generateSuggestionsForBlockedKeywords - Generates suggestions for blocked keywords.
 */

import { ai, DEFAULT_MAX_OUTPUT_TOKENS } from '@/ai/genkit';
import { GenerateSuggestionsInputSchema, GenerateSuggestionsOutputSchema, type GenerateSuggestionsInput, type GenerateSuggestionsOutput } from '@/ai/schemas/suggestion-schema';

export async function generateSuggestionsForBlockedKeywords(input: GenerateSuggestionsInput): Promise<GenerateSuggestionsOutput> {
  return generateSuggestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateSuggestionsPrompt',
  input: { schema: GenerateSuggestionsInputSchema },
  output: { schema: GenerateSuggestionsOutputSchema },
  config: {
    temperature: 0.1,
    timeout: 110000,
    maxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS,
  },
  prompt: `
  SYSTEM: You are an expert ATS resume writer. Your task is to generate safe, resume-ready suggestions for a list of "blocked" keywords. "Blocked" means the keyword is from the job description but lacks explicit evidence in the resume. Your suggestions must be phrased cautiously and plausibly, without fabricating specific facts.

  RULES:
  1.  **Generate one suggestion per input keyword.**
  2.  **Phrasing must be cautious.** Use phrases like "Familiar with principles of...", "Contributed to projects involving...", "Experience in environments utilizing...", "Supported processes related to...".
  3.  **Do NOT invent metrics, numbers, or specific outcomes.**
  4.  **Do NOT assert direct ownership or expertise** unless the resume context strongly implies it (e.g., a Director of Finance can be assumed to have experience with "budgeting").
  5.  **Placement**: Recommend a logical placement ('CORE_SKILLS', 'SUMMARY', or 'EXPERIENCE'). 'CORE_SKILLS' is for single terms. 'SUMMARY' or 'EXPERIENCE' for sentences.
  6.  **Rationale**: Briefly explain WHY the suggestion is plausible based on the resume.

  Candidate Resume Text:
  {{resumeText}}

  Job Description Text:
  {{jobDescriptionText}}

  Blocked Keywords to generate suggestions for:
  {{#each blockedKeywords}}
  - {{this}}
  {{/each}}
  `,
});

const generateSuggestionsFlow = ai.defineFlow(
  {
    name: 'generateSuggestionsFlow',
    inputSchema: GenerateSuggestionsInputSchema,
    outputSchema: GenerateSuggestionsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error("AI failed to generate suggestions.");
    }
    // Ensure the output is an array, even if the model returns a single object
    const suggestions = Array.isArray(output.suggestions) ? output.suggestions : [output.suggestions];
    return { suggestions };
  }
);
