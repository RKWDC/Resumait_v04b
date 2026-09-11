import { z } from 'genkit';

// ── Sub-schemas ─────────────────────────────────────────────

export const DimensionScoreSchema = z.object({
  earned: z.coerce.number(),
  max: z.coerce.number(),
  matchedCount: z.coerce.number().int().optional(),
  totalRequired: z.coerce.number().int().optional(),
  totalPreferred: z.coerce.number().int().optional(),
  totalExpected: z.coerce.number().int().optional(),
  requiredYears: z.coerce.number().optional(),
  detectedYears: z.coerce.number().optional(),
  requiredLevel: z.string().optional(),
  detectedLevel: z.string().optional(),
  details: z.string(),
});

export const ScoreBreakdownSchema = z.object({
  hardSkillsCertifications: DimensionScoreSchema,
  toolsPlatforms: DimensionScoreSchema,
  yearsExperience: DimensionScoreSchema,
  preferredSkills: DimensionScoreSchema,
  educationDegree: DimensionScoreSchema,
  softSkills: DimensionScoreSchema,
  keywordPlacement: DimensionScoreSchema,
});

export const PenaltyDeductionSchema = z.object({
  label: z.string(),
  points: z.coerce.number(),
  reason: z.string(),
  category: z.string(),
});

export const BonusPointSchema = z.object({
  label: z.string(),
  points: z.coerce.number(),
  reason: z.string(),
});

export const KeywordResultCountsSchema = z.object({
  foundCount: z.coerce.number().int(),
  missingCount: z.coerce.number().int(),
  unsupportedCount: z.coerce.number().int(),
});

export const MatchedKeywordSchema = z.object({
  keyword: z.string(),
  location: z.string(),
  matchType: z.enum(['exact', 'semantic', 'partial']),
  category: z.string(),
  scoreContribution: z.coerce.number(),
});

export const MissingRequiredKeywordSchema = z.object({
  keyword: z.string(),
  category: z.string(),
  priorityWeight: z.coerce.number().int(),
  estimatedScoreImpact: z.coerce.number(),
});

export const MissingPreferredKeywordSchema = z.object({
  keyword: z.string(),
  category: z.string(),
  priorityWeight: z.coerce.number().int(),
});

export const ExperienceGapSchema = z.object({
  requiredYears: z.coerce.number(),
  detectedYears: z.coerce.number(),
  gap: z.coerce.number(),
  penaltyApplied: z.coerce.number(),
  assessment: z.string(),
});

export const EducationAnalysisSchema = z.object({
  requiredLevel: z.string(),
  detectedLevel: z.string(),
  matchStatus: z.enum(['met', 'exceeded', 'not_met', 'not_specified']),
  penaltyApplied: z.coerce.number(),
  details: z.string(),
});

// ── Main Output Schema ──────────────────────────────────────

export const ResumeScoreOutputSchema = z.object({
  compositeScore: z.coerce.number(),
  qualitativeRating: z.enum(['Excellent', 'Strong', 'Moderate', 'Weak', 'Needs Improvement']),
  scoreBreakdown: ScoreBreakdownSchema,
  penaltyDeductions: z.array(PenaltyDeductionSchema),
  bonusPoints: z.array(BonusPointSchema),
  keywordResults: KeywordResultCountsSchema,
  matchedKeywords: z.array(MatchedKeywordSchema),
  missingRequired: z.array(MissingRequiredKeywordSchema),
  missingPreferred: z.array(MissingPreferredKeywordSchema),
  topRecommendations: z.array(z.string()),
  experienceGapAnalysis: ExperienceGapSchema,
  educationAnalysis: EducationAnalysisSchema,
  scoreImprovement: z.coerce.number().optional(),
});

export type ResumeScoreOutput = z.infer<typeof ResumeScoreOutputSchema>;

// ── Input Schema ────────────────────────────────────────────

export const ScoreResumeInputSchema = z.object({
  resumeText: z.string().min(50, 'Resume text too short — minimum 50 characters'),
  jobDescriptionText: z.string().min(20, 'Job description too short'),
  extractedKeywordsJson: z.string().min(2, 'Keywords JSON is required'),
  scoringMode: z.enum(['initial', 'realtime']),
  initialScore: z.coerce.number().min(0).max(100).optional(),
});

export type ScoreResumeInput = z.infer<typeof ScoreResumeInputSchema>;
