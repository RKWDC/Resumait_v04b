import {z} from 'genkit';

export const OptimizeResumeForAtsInputSchema = z.object({
  resumeText: z.string().describe("The text content of the candidate's resume."),
  jobDescriptionText: z.string().describe('The text content of the job description.'),
  targetJobTitle: z.string().describe('The exact job title for the role the candidate is applying for.'),
});
export type OptimizeResumeForAtsInput = z.infer<typeof OptimizeResumeForAtsInputSchema>;

export const ResumeSchema = z.object({
  header: z.object({
    name: z.string().describe('The full name of the candidate.'),
    headline: z.string().describe("A professional headline for the candidate. Path A: Target Title + Yrs + Achievement. Path B: Transition phrasing."),
    location: z.string().describe("Candidate's city and state."),
    phone: z.string().describe("Candidate's phone number."),
    email: z.string().describe("Candidate's email address."),
    linkedin: z.string().describe("URL for the candidate's LinkedIn profile."),
  }),
  classification: z.object({
    path: z.enum(['path_a', 'path_b']),
    confidence: z.number().describe('Score 0-1. < 0.7 defaults to Path B.'),
    reasoning: z.string().optional(),
  }).optional(),
  summaryHeading: z.string().describe("The exact heading for the summary section (e.g., 'Professional Summary', 'Executive Summary', or 'Objective')."),
  summary: z.string().describe("A single flowing prose paragraph for the summary/objective. No bullets, no tables, no labeled fields."),
  coreSkills: z.array(z.string()).describe("An array of 12-18 of the most relevant, evidence-supported skills for the target job."),
  professionalExperience: z.array(z.object({
    company: z.string().describe("The name of the company."),
    companyDescriptor: z.string().optional().describe("A brief description of the company, if available."),
    title: z.string().describe("The candidate's job title at the company."),
    location: z.string().describe("The location of the job."),
    startDate: z.string().describe("The start date of the role in 'Month YYYY' or 'YYYY-MM' format."),
    endDate: z.string().describe("The end date of the role in 'Month YYYY', 'YYYY-MM' format, or 'Present' if current."),
    bullets: z.array(z.string()).describe("An array of 4-6 achievement-oriented bullet points. Each bullet is a single sentence of max 28 words."),
  })),
  education: z.array(z.object({
    institution: z.string().describe("The name of the educational institution."),
    location: z.string().optional().describe("The location (City, State) of the institution."),
    degree: z.string().describe("The degree or certification obtained."),
    details: z.string().optional().describe("Any additional details like honors or GPA."),
    startDate: z.string().describe("The start date of education."),
    endDate: z.string().describe("The end date of education."),
  })),
  languages: z.array(z.string()).optional().describe("An array of languages the candidate speaks (e.g., 'English (Native)', 'French (A2)')."),
  certificates: z.array(z.string()).optional().describe("An array of certificates the candidate holds (e.g., 'Salesforce Sales Operations Professional')."),
});
export type Resume = z.infer<typeof ResumeSchema>;
