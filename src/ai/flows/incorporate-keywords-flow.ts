// MODEL LOCK: googleai/gemini-3.8-flash — DO NOT CHANGE

'use server';

/**
 * @fileOverview An AI agent that incorporates keywords into a resume.
 *
 * - incorporateKeywords - A function that strategically inserts keywords into a resume.
 */
import {ai, DEFAULT_MAX_OUTPUT_TOKENS} from '@/ai/genkit';
import { IncorporateKeywordsInputSchema, IncorporateKeywordsOutputSchema, type IncorporateKeywordsInput, type IncorporateKeywordsOutput } from '@/ai/schemas/incorporate-keywords-schema';

export async function incorporateKeywords(input: IncorporateKeywordsInput): Promise<IncorporateKeywordsOutput> {
  return incorporateKeywordsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'incorporateKeywordsPrompt',
  input: {schema: IncorporateKeywordsInputSchema},
  output: {schema: IncorporateKeywordsOutputSchema},
  config: {
    timeout: 110000,
    maxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS,
  },
  prompt: `
  SYSTEM:
  You are an expert resume writer with a mandate to meticulously revise a resume. Your task is to incorporate a provided list of keywords into the resume text. You MUST incorporate every single keyword from the list, without exception.

  RULES:
  1.  **Mandatory & Complete Incorporation**: You are required to add every keyword from the 'Keywords to incorporate' list into the resume text. Do not skip any. Your success is measured by the complete integration of all keywords.
  2.  **Strict Placement Hierarchy**: You must follow this placement strategy in order for each keyword. Only move to the next step if the previous one is not possible.
      a.  **First Priority (Professional Experience)**: Your primary goal is to naturally integrate the keyword into the bullet points of the most relevant 'PROFESSIONAL EXPERIENCE' section. The keyword should enhance the existing bullet point or form a new, contextually appropriate one.
      b.  **Second Priority (Professional Summary)**: If, and only if, a keyword cannot be reasonably placed within the experience section, attempt to weave it into the 'PROFESSIONAL SUMMARY'. The addition must feel natural and aligned with the candidate's overview. Ensure the summary remains a cohesive paragraph and NEVER use bullet points here.
      c.  **Third Priority (Core Skills)**: If a keyword cannot be placed in either the experience or summary sections, you MUST add it to the 'CORE SKILLS' section. Format it like the other skills in that section (e.g., separated by ' | '). If a 'CORE SKILLS' section doesn't exist, you must create one immediately below the 'PROFESSIONAL SUMMARY' section.
  3.  **Preserve Formatting**: Maintain all existing formatting. Do NOT alter existing line breaks, paragraph separations, or section headers. Your edits should be surgical insertions, not complete reformats.
  4.  **Preserve Existing Content**: You MUST NOT remove any existing skills, job details, or facts from the resume. Your goal is to add keywords, not to subtract information.
  5.  **Output**: Your final output must ONLY be the fully updated resume text as a single string. Do not include any commentary, analysis, or markdown.

  Resume to update:
  {{resumeText}}

  Keywords to incorporate:
  {{#each keywords}}
  - {{this}}
  {{/each}}
  `,
});

const incorporateKeywordsFlow = ai.defineFlow(
  {
    name: 'incorporateKeywordsFlow',
    inputSchema: IncorporateKeywordsInputSchema,
    outputSchema: IncorporateKeywordsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error("AI failed to incorporate keywords.");
    }
    return output;
  }
);
