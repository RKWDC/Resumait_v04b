// MODEL LOCK: googleai/gemini-3.8-flash — DO NOT CHANGE

'use server';

/**
 * @fileOverview A specialized AI agent for fixing typos and grammar without rephrasing.
 * 
 * - spellCheckResume - Fixes technical typos while strictly preserving keywords and tracking markers.
 */

import { ai, DEFAULT_MAX_OUTPUT_TOKENS } from '@/ai/genkit';
import { z } from 'genkit';

const SpellCheckInputSchema = z.object({
  resumeText: z.string().describe('The text of the document to be spell-checked.'),
  keywords: z.array(z.string()).optional().describe('Keywords to preserve exactly.'),
  documentType: z.enum(['resume', 'cover_letter']).default('resume').describe('The type of document being checked.'),
});

const SpellCheckOutputSchema = z.object({
  correctedResume: z.string().describe('The document text with typos and grammar fixed.'),
  typoCount: z.number().describe('Number of errors found and fixed.'),
});

export async function spellCheckResume(input: z.infer<typeof SpellCheckInputSchema>) {
  return spellCheckFlow(input);
}

const prompt = ai.definePrompt({
  name: 'spellCheckPrompt',
  input: { 
    schema: SpellCheckInputSchema.extend({
      isResume: z.boolean(),
    }) 
  },
  output: { schema: SpellCheckOutputSchema },
  config: {
    temperature: 0.0, // Absolute precision
    timeout: 110000,
    maxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS,
  },
  prompt: `
  {{#if isResume}}
  SYSTEM: You are a professional proofreader specialized in technical resumes and ATS optimization.
  {{else}}
  SYSTEM: You are a professional proofreader specialized in business correspondence and executive communication.
  {{/if}}
  
  TASK:
  Fix all spelling, punctuation, and grammatical errors in the provided text.
  
  CRITICAL RULES:
  1. **DO NOT REPHRASE**: Maintain the exact sentence structure and professional voice of the original text. ONLY change words if they are clearly misspelled or grammatically incorrect. Your goal is correction, not creative editing.
  2. **STRICT LAYOUT PRESERVATION**: You MUST preserve every single newline, space, and indentation exactly as it exists in the original. Do NOT combine lines, do NOT split lines, and do NOT remove the spacing between sections. The physical structure of the text must be 100% identical to the input.
  3. **PRESERVE KEYWORDS**: You are provided with a list of 'Keywords to preserve'. DO NOT change the spelling, casing, or phrasing of these terms, even if they seem unconventional.
  {{#if isResume}}
  4. **DO NOT TOUCH TRACKING MARKERS**: The text contains visual markers like @@ADDED_SUPPORTED:keyword@@. You MUST NOT remove, alter, or move these markers. They must stay exactly where they are in the text.
  5. **INDUSTRY TERMS**: Do not "correct" valid technical terms, software names, or industry acronyms (e.g., "PySpark", "SaaS", "CI/CD", "Kubernetes") unless they are clearly and obviously misspelled (e.g., "Pysparkk").
  {{else}}
  4. **BUSINESS CORRESPONDENCE**: Ensure consistent tense, correct subject-verb agreement, and professional formal grammar suitable for executive communication.
  {{/if}}
  
  Text to Check:
  {{{resumeText}}}
  
  {{#if keywords}}
  Keywords to Preserve:
  {{#each keywords}}
  - {{{this}}}
  {{/each}}
  {{/if}}
  `,
});

const spellCheckFlow = ai.defineFlow(
  {
    name: 'spellCheckFlow',
    inputSchema: SpellCheckInputSchema,
    outputSchema: SpellCheckOutputSchema,
  },
  async (input) => {
    const { output } = await prompt({
      ...input,
      isResume: input.documentType === 'resume',
    });
    if (!output) throw new Error("Spell check failed.");
    return output;
  }
);
