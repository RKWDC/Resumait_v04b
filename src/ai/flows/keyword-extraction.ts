// MODEL LOCK: googleai/gemini-2.5-flash — DO NOT CHANGE

'use server';

/**
 * @fileOverview Extracts keywords from a job description and checks for their presence in a resume.
 *
 * - extractAndAnalyzeKeywords - Extracts keywords and checks for support in the resume.
 */

import { ai, DEFAULT_MAX_OUTPUT_TOKENS } from '@/ai/genkit';
import { KeywordExtractionInputSchema, KeywordExtractionOutputSchema, type KeywordExtractionInput, type KeywordExtractionOutput } from '@/ai/schemas/keyword-schema';


export async function extractAndAnalyzeKeywords(input: KeywordExtractionInput): Promise<KeywordExtractionOutput> {
  return keywordExtractionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'keywordExtractionPrompt',
  input: { schema: KeywordExtractionInputSchema },
  output: { schema: KeywordExtractionOutputSchema },
  config: {
    temperature: 0,
    timeout: 110000,
    maxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS,
  },
  prompt: `
  SYSTEM: You are an expert HR recruiter and ATS analyst. Your primary task is to extract only the most critical, resume-worthy keywords from the provided job description.

  FILTERING RULES (NEGATIVE CONSTRAINTS):
  - IGNORE academic credentials (e.g., Bachelor's, Master's, PhD, GPA).
  - IGNORE boilerplate "years of experience" requirements (e.g., "5+ years of...", "At least 3 years...").
  - IGNORE company names, locations, and generic corporate jargon.

  KEYWORD SELECTION CRITERIA:
  1.  **Prioritize High-Impact Terms**: Focus exclusively on technical skills, tools, platforms, domain expertise, and operational methodologies.
  2.  **Keep it Short**: Keywords should be 1-3 words long.
  3.  **Identify Key Skills**: Extract hard skills (e.g., 'SQL', 'Adobe Photoshop'), domain expertise (e.g., 'Inventory Management'), and methodologies (e.g., 'Agile', 'Scrum').
  4.  **Quantity**: Extract between 30 and 50 of the absolute most important keywords.

  PROCESS:
  1.  **Keyword Extraction**: Carefully read the job description and extract keywords based on the rules above.
  2.  **Evidence Check**: For each extracted keyword, scan the candidate's resume text.
      - If you find explicit, direct evidence for the keyword, set its \`status\` to 'supported'.
      - If the keyword is NOT found in the resume, set its \`status\` to 'unsupported'. Do not infer or guess.
  3.  **Output**: Return a JSON object containing the list of keywords and their support status.

  Job Description Text:
  {{jobDescriptionText}}

  Candidate Resume Text:
  {{resumeText}}
  `,
});


const keywordExtractionFlow = ai.defineFlow(
  {
    name: 'keywordExtractionFlow',
    inputSchema: KeywordExtractionInputSchema,
    outputSchema: KeywordExtractionOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
