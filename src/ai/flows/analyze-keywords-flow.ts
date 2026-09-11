// MODEL LOCK: googleai/gemini-3.8-flash — DO NOT CHANGE

'use server';

/**
 * @fileOverview Determines if a provided list of keywords is supported by evidence in a resume.
 * 
 * - analyzeKeywordsSupport - A function that takes a list of keywords and checks them against a resume.
 */

import { ai, DEFAULT_MAX_OUTPUT_TOKENS } from '@/ai/genkit';
import { z } from 'genkit';

const AnalyzeKeywordsInputSchema = z.object({
  resumeText: z.string().describe("The text content of the candidate's resume."),
  keywords: z.array(z.string()).describe('The list of keywords to analyze.'),
});
export type AnalyzeKeywordsInput = z.infer<typeof AnalyzeKeywordsInputSchema>;

const KeywordSupportSchema = z.object({
    keyword: z.string().describe('The analyzed keyword.'),
    status: z.enum(['supported', 'unsupported']).describe('Whether the keyword is supported by evidence in the resume.'),
});

const AnalyzeKeywordsOutputSchema = z.object({
  analyzedKeywords: z.array(KeywordSupportSchema).describe('The keywords with their support status.'),
});
export type AnalyzeKeywordsOutput = z.infer<typeof AnalyzeKeywordsOutputSchema>;

export async function analyzeKeywordsSupport(input: AnalyzeKeywordsInput): Promise<AnalyzeKeywordsOutput> {
  return analyzeKeywordsSupportFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeKeywordsSupportPrompt',
  input: { schema: AnalyzeKeywordsInputSchema },
  output: { schema: AnalyzeKeywordsOutputSchema },
  config: {
    temperature: 0.1,
    timeout: 110000,
    maxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS,
  },
  prompt: `
  SYSTEM: You are an expert ATS auditor. Your task is to verify if a specific list of keywords is supported by evidence in a candidate's resume.

  PROCESS:
  1.  **Evidence Check**: For each keyword in the provided 'Keywords to analyze' list, scan the candidate's resume text.
  2.  **Strict Verification**: 
      - If you find explicit, direct evidence for the keyword (exact match or very close synonym in context), set its \`status\` to 'supported'.
      - If the keyword is NOT explicitly found or supported by the experience listed, set its \`status\` to 'unsupported'.
  3.  **No New Keywords**: DO NOT extract new keywords. ONLY analyze the ones provided in the input list.

  Candidate Resume Text:
  {{resumeText}}

  Keywords to analyze:
  {{#each keywords}}
  - {{this}}
  {{/each}}
  `,
});

const analyzeKeywordsSupportFlow = ai.defineFlow(
  {
    name: 'analyzeKeywordsSupportFlow',
    inputSchema: AnalyzeKeywordsInputSchema,
    outputSchema: AnalyzeKeywordsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) throw new Error("AI failed to analyze keyword support.");
    return output;
  }
);
