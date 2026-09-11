import {z} from 'genkit';

export const IncorporateKeywordsInputSchema = z.object({
  resumeText: z.string().describe('The text content of the resume to be updated.'),
  keywords: z.array(z.string()).describe('The list of keywords to incorporate.'),
});
export type IncorporateKeywordsInput = z.infer<typeof IncorporateKeywordsInputSchema>;

export const IncorporateKeywordsOutputSchema = z.object({
  updatedResumeText: z.string().describe('The updated resume text with keywords incorporated.'),
});
export type IncorporateKeywordsOutput = z.infer<typeof IncorporateKeywordsOutputSchema>;
