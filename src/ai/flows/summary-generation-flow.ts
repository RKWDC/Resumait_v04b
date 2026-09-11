// MODEL LOCK: googleai/gemini-3.8-flash — DO NOT CHANGE

'use server';

import { ai, DEFAULT_MAX_OUTPUT_TOKENS } from '@/ai/genkit';
import { z } from 'genkit';
import { getSummaryConfig, validateSummaryText } from '@/lib/summary-logic';
import { stripAtsLabels } from '@/lib/validation-logic';

/**
 * @fileOverview Specialized flow for generating ATS-compliant resume summaries.
 * Amendment 2: Requires pre-calculated classificationPath.
 */

const SummaryInputSchema = z.object({
  resumeText: z.string(),
  jobDescriptionText: z.string(),
  targetJobTitle: z.string(),
  experienceYears: z.number(),
  seniority: z.enum(['intern', 'entry_level', 'mid_level', 'senior', 'lead', 'manager', 'director', 'vp', 'c_level', 'not_specified']),
  isCareerChanger: z.boolean(),
  priorityKeywords: z.array(z.string()),
  classificationPath: z.enum(['path_a', 'path_b']), // REQ: Defect 4
});

export type SummaryInput = z.infer<typeof SummaryInputSchema>;

export async function generateAtsSummary(input: SummaryInput) {
    return summaryFlow(input);
}

const summaryFlow = ai.defineFlow(
  {
    name: 'generateAtsSummary',
    inputSchema: SummaryInputSchema,
    outputSchema: z.object({
      heading: z.string(),
      summary: z.string(),
      classificationPathUsed: z.enum(['path_a', 'path_b'])
    }),
  },
  async (input) => {
    const isActuallyChanger = input.classificationPath === 'path_b';
    const config = getSummaryConfig(input.experienceYears, input.seniority as any, isActuallyChanger);
    
    let attempts = 0;
    let lastSummary = "";
    
    while (attempts < 3) {
      attempts++;
      const response = await ai.generate({
        config: { temperature: 0.1, maxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS },
        system: `You are an elite Resume Architect and Master Professional Writer. // MODEL LOCK: googleai/gemini-3.8-flash — DO NOT CHANGE
        Generate exactly one ${config.category} paragraph.
        
        **NO COMMENTARY**: Output ONLY the paragraph text. Do NOT include headings or conversational preamble.

        STRICT CONSTRAINTS:
        - WORD COUNT: Exactly ${config.wordRange[0]}-${config.wordRange[1]} words.
        - SENTENCE COUNT: Exactly 3-5 sentences.
        - FIRST SENTENCE: MUST include the exact target job title: "${input.targetJobTitle}".
        - NO CONTRACTIONS: Expand all contractions (e.g., use "do not" instead of "don't").
        - NO ITALICS: Do not use markdown italics.
        - VOICE: Implied third-person.
        - FORMAT: Single flowing prose paragraph only. No bullets.
        - NUMBERS: Spell out numbers zero through nine. Use digits for 10 and above.`,
        prompt: `Resume context: ${input.resumeText.substring(0, 3000)}\nJob context: ${input.jobDescriptionText.substring(0, 3000)}`,
      });

      lastSummary = stripAtsLabels(response.text.trim())
        .replace(new RegExp(`^${config.heading}`, 'i'), '')
        .trim();

      const validation = validateSummaryText(lastSummary, config, input.targetJobTitle);
      
      if (validation.valid) {
        return { 
          heading: config.heading, 
          summary: lastSummary, 
          classificationPathUsed: input.classificationPath 
        };
      }
    }

    return { 
      heading: config.heading, 
      summary: lastSummary, 
      classificationPathUsed: input.classificationPath 
    };
  }
);
