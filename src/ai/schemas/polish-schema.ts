import { z } from 'zod';
import { ResumeSchema } from './resume-schema';

export const PolishResumeInputSchema = z.object({
  resumeText: z.string().describe('The text of the resume to be polished.'),
  keywords: z.array(z.string()).optional().describe('A list of important keywords that must be preserved in the output.'),
});
export type PolishResumeInput = z.infer<typeof PolishResumeInputSchema>;

export const PolishResumeOutputSchema = ResumeSchema;
export type PolishResumeOutput = z.infer<typeof PolishResumeOutputSchema>;
