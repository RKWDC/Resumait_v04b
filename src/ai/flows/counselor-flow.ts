// MODEL LOCK: googleai/gemini-3.8-flash — DO NOT CHANGE

'use server';

import {ai, DEFAULT_MAX_OUTPUT_TOKENS} from '@/ai/genkit';
import { CounselorInputSchema, CounselorOutputSchema, type CounselorInput, type CounselorOutput } from '@/ai/schemas/counselor-schema';

/**
 * @fileOverview IDEAMAIT - Expert career coaching flow.
 * Upgraded to a Diagnostic Interpreter with strict natural language mandates.
 */

export async function counselorChat(input: CounselorInput): Promise<CounselorOutput> {
  return counselorFlow(input);
}

const prompt = ai.definePrompt({
  name: 'counselorPrompt',
  input: {schema: CounselorInputSchema},
  output: {
    format: 'json',
    schema: CounselorOutputSchema
  },
  config: {
    timeout: 110000,
    temperature: 0.2,
    maxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS,
  },
  prompt: `
  SYSTEM:
  You are IDEAMAIT, an elite executive career coach. Your mission is to provide high-signal advice based on ATS algorithmic data.

  STRICT INSTRUCTIONS:
  - **NATURAL LANGUAGE ONLY**: You MUST NOT output raw JSON strings, arrays, or code blocks in the 'responseText' field. Always interpret data into professional narrative.
  - **NO ITALICS**: Never use italics for any purpose. No exceptions.
  - **NO COMMENTARY**: Provide your response directly.
  - **DIGNIFIED VOICE**: Speak with the authority of a world-class executive recruiter.

  DIAGNOSTIC INTERPRETER MODE:
  Use the provided ATS Match Score and Diagnostic Results to provide hyper-specific advice. If a score is low, explain why based on the MASTER ATS TEMPLATE requirements.

  **MASTER ATS TEMPLATE TO ENFORCE:**
  [NAME IN ALL CAPS]
  [PROFESSIONAL HEADLINE]
  [Contact Info Line]

  PROFESSIONAL SUMMARY
  [Cohesive paragraph. NO bullets. Target title in first sentence.]

  CORE SKILLS
  Technical: [Skills]
  Professional: [Skills]

  PROFESSIONAL EXPERIENCE
  [Job Title] | [Company] | [Location] | [Dates]
  - [Bullets starting with high-impact executive verbs]

  CONTEXT:
  - **Current ATS Diagnostic Data**:
  {{json analysisResults}}

  - **Candidate's Resume**:
  {{resumeText}}

  - **Job Description**:
  {{jobDescriptionText}}

  - **Conversation History**:
  {{#each history}}
  - {{role}}: {{content}}
  {{/each}}

  - **User's Latest Message**:
  {{userInput}}
  `,
});

const counselorFlow = ai.defineFlow(
  {
    name: 'counselorFlow',
    inputSchema: CounselorInputSchema,
    outputSchema: CounselorOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error("AI failed to generate a professional response.");
    }
    return output;
  }
);
