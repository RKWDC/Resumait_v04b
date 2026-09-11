
import {z} from 'genkit';

export const CounselorInputSchema = z.object({
  resumeText: z.string().describe('The current text of the resume.'),
  jobDescriptionText: z.string().describe('The text of the target job description.'),
  analysisResults: z.any().optional().describe('The algorithmic match scores and gap analysis data.'),
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    // Support structured content (Parts) to preserve thought_signatures and metadata
    content: z.union([z.string(), z.array(z.any())]),
  })).describe('The conversation history.'),
  userInput: z.string().describe("The user's latest message."),
});
export type CounselorInput = z.infer<typeof CounselorInputSchema>;

export const CounselorOutputSchema = z.object({
  responseText: z.string().describe("The counselor's response to the user."),
  updatedResumeText: z.string().optional().describe('The full, updated resume text if a revision was made.'),
});
export type CounselorOutput = z.infer<typeof CounselorOutputSchema>;
