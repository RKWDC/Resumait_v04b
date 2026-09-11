import { z } from 'genkit';

export const KeywordExtractionInputSchema = z.object({
  resumeText: z.string().describe("The text content of the candidate's resume."),
  jobDescriptionText: z.string().describe('The text content of the job description.'),
});
export type KeywordExtractionInput = z.infer<typeof KeywordExtractionInputSchema>;

const KeywordSchema = z.object({
    keyword: z.string().describe('The extracted keyword or phrase.'),
    status: z.enum(['supported', 'unsupported']).describe('Whether the keyword is supported by evidence in the resume text.'),
});

export const KeywordExtractionOutputSchema = z.object({
  keywords: z.array(KeywordSchema).describe('An array of extracted keywords and their support status.'),
});
export type KeywordExtractionOutput = z.infer<typeof KeywordExtractionOutputSchema>;
export type Keyword = z.infer<typeof KeywordSchema>;
