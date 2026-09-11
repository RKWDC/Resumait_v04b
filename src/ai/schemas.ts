import { z } from 'genkit';

export const SeniorityLevelSchema = z.enum([
  "intern",
  "entry_level",
  "mid_level",
  "senior",
  "lead",
  "manager",
  "director",
  "vp",
  "c_level",
  "not_specified",
]);

export const KeywordCategorySchema = z.enum(["hard_skill", "soft_skill", "certification", "tool_platform"]);
export const RequirementSchema = z.enum(["required", "preferred", "implied"]);

export const KeywordSchema = z.object({
  surfaceTerm: z.string().describe('Exact phrase from the job description'),
  canonicalTerm: z.string().describe('Normalized skill name per O*NET/Lightcast'),
  category: KeywordCategorySchema,
  requirement: RequirementSchema,
  priorityWeight: z.number().int().min(1).max(5),
  context: z.string().describe('Source sentence from the JD where this was found'),
});

export const ExtractionOutputSchema = z.object({
  schemaVersion: z.string(),
  jobTitle: z.string(),
  seniorityLevel: SeniorityLevelSchema,
  senioritySignals: z.array(z.string()),
  roleType: z.string(),
  industryContext: z.string(),
  keywords: z.array(KeywordSchema),
  impliedKeywords: z.array(KeywordSchema).optional(),
  summary: z.object({
    totalKeywords: z.number().int(),
    requiredCount: z.number().int(),
    preferredCount: z.number().int(),
    impliedCount: z.number().int().optional(),
    hardSkillCount: z.number().int(),
    softSkillCount: z.number().int(),
    certificationCount: z.number().int(),
    toolPlatformCount: z.number().int(),
    avgConfidence: z.number().optional(),
  }),
});

export type Keyword = z.infer<typeof KeywordSchema>;
export type ExtractionOutput = z.infer<typeof ExtractionOutputSchema>;
