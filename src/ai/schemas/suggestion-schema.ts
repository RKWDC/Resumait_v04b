import { z } from 'genkit';

export const GenerateSuggestionsInputSchema = z.object({
  resumeText: z.string().describe("The text content of the candidate's resume."),
  jobDescriptionText: z.string().describe('The text content of the job description.'),
  blockedKeywords: z.array(z.string()).describe('A list of keywords that are present in the job description but not supported by the resume.'),
});
export type GenerateSuggestionsInput = z.infer<typeof GenerateSuggestionsInputSchema>;


const SuggestionSchema = z.object({
    keyword: z.string().describe('The blocked keyword the suggestion is for.'),
    text: z.string().describe('The suggested resume-ready phrase or sentence.'),
    placement: z.enum(['SUMMARY', 'CORE_SKILLS', 'EXPERIENCE']).describe('The recommended placement for the suggestion in the resume.'),
    rationale: z.string().describe('A brief explanation for why this suggestion is plausible based on the resume context.')
});

export const GenerateSuggestionsOutputSchema = z.object({
  suggestions: z.array(SuggestionSchema).describe('An array of generated suggestions for the blocked keywords.'),
});

export type Suggestion = z.infer<typeof SuggestionSchema>;
export type GenerateSuggestionsOutput = z.infer<typeof GenerateSuggestionsOutputSchema>;
