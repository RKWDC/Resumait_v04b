import {
  ResumeScoreOutputSchema,
  type ResumeScoreOutput,
  type ScoreResumeInput,
} from '@/ai/schemas/scoring-schema';

// ── Utility functions ───────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function getQualitativeRating(
  score: number
): 'Excellent' | 'Strong' | 'Moderate' | 'Weak' | 'Needs Improvement' {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Strong';
  if (score >= 60) return 'Moderate';
  if (score >= 40) return 'Weak';
  return 'Needs Improvement';
}

// ── Dimension max points (source of truth) ──────────────────

const DIMENSION_MAX: Record<string, number> = {
  hardSkillsCertifications: 35,
  toolsPlatforms: 20,
  yearsExperience: 15,
  preferredSkills: 10,
  educationDegree: 10,
  softSkills: 5,
  keywordPlacement: 5,
};

const MAX_TOTAL_PENALTIES = -30;
const MAX_TOTAL_BONUSES = 8;

// ── Main normalization function ─────────────────────────────

export function normalizeAndValidateScore(
  raw: ResumeScoreOutput,
  input: ScoreResumeInput
): ResumeScoreOutput {
  // Step 1: Validate with Zod (coerce types)
  const parsed = ResumeScoreOutputSchema.safeParse(raw);
  if (!parsed.success) {
    console.error('Score schema validation failed:', parsed.error.errors);
    throw new Error(
      `Score output failed validation: ${parsed.error.errors.map((e) => e.message).join(', ')}`
    );
  }

  const score = parsed.data;

  // Step 2: Normalize each dimension's earned to [0, max]
  const breakdown = score.scoreBreakdown;
  for (const [key, maxPts] of Object.entries(DIMENSION_MAX)) {
    const dim = (breakdown as any)[key];
    if (dim) {
      dim.max = maxPts;
      dim.earned = round1(clamp(dim.earned, 0, maxPts));
    }
  }

  // Step 3: Recalculate dimension total from earned values
  const dimensionTotal = round1(
    Object.values(DIMENSION_MAX).reduce((sum, _, i) => {
      const key = Object.keys(DIMENSION_MAX)[i];
      const dim = (breakdown as any)[key];
      return sum + (dim?.earned ?? 0);
    }, 0)
  );

  // Step 4: Cap penalties and bonuses
  const totalPenalties = round1(
    clamp(
      score.penaltyDeductions.reduce((sum, p) => sum + p.points, 0),
      MAX_TOTAL_PENALTIES,
      0
    )
  );
  const totalBonuses = round1(
    clamp(
      score.bonusPoints.reduce((sum, b) => sum + b.points, 0),
      0,
      MAX_TOTAL_BONUSES
    )
  );

  // Step 5: Recalculate composite score from components
  const recalculatedComposite = round1(
    clamp(dimensionTotal + totalBonuses + totalPenalties, 0, 100)
  );

  // Step 6: Use recalculated score if AI's score deviates significantly
  const aiComposite = round1(clamp(score.compositeScore, 0, 100));
  const deviation = Math.abs(aiComposite - recalculatedComposite);
  const finalComposite =
    deviation > 10 ? recalculatedComposite : aiComposite;

  // Step 7: Enforce qualitative rating consistency
  const qualitativeRating = getQualitativeRating(finalComposite);

  // Step 8: Validate keyword result counts
  const keywordResults = {
    foundCount: score.matchedKeywords.length,
    missingCount:
      score.missingRequired.length + score.missingPreferred.length,
    unsupportedCount: 0, // unsupportedKeywords field removed for performance
  };

  // Step 9: Calculate score improvement for realtime mode
  let scoreImprovement: number | undefined;
  if (
    input.scoringMode === 'realtime' &&
    input.initialScore !== undefined
  ) {
    scoreImprovement = round1(finalComposite - input.initialScore);
  }

  // Step 10: Ensure penalties are negative, bonuses are positive
  const normalizedPenalties = score.penaltyDeductions.map((p) => ({
    ...p,
    points: round1(-Math.abs(p.points)), // Always negative
  }));
  const normalizedBonuses = score.bonusPoints.map((b) => ({
    ...b,
    points: round1(Math.abs(b.points)), // Always positive
  }));

  // Step 11: Sort missingRequired by impact descending
  const sortedMissingRequired = [...score.missingRequired].sort(
    (a, b) => b.estimatedScoreImpact - a.estimatedScoreImpact
  );

  // Step 12: Cap recommendations at 5
  const topRecommendations = score.topRecommendations.slice(0, 5);
  if (topRecommendations.length < 3) {
    topRecommendations.push(
      'Review the job description for additional keywords to incorporate.'
    );
  }

  return {
    compositeScore: finalComposite,
    qualitativeRating,
    scoreBreakdown: breakdown,
    penaltyDeductions: normalizedPenalties,
    bonusPoints: normalizedBonuses,
    keywordResults,
    matchedKeywords: score.matchedKeywords,
    missingRequired: sortedMissingRequired,
    missingPreferred: score.missingPreferred,
    topRecommendations,
    experienceGapAnalysis: {
      ...score.experienceGapAnalysis,
      gap: round1(Math.abs(score.experienceGapAnalysis.gap)),
      penaltyApplied: round1(
        -Math.abs(score.experienceGapAnalysis.penaltyApplied)
      ),
    },
    educationAnalysis: {
      ...score.educationAnalysis,
      penaltyApplied: round1(
        -Math.abs(score.educationAnalysis.penaltyApplied)
      ),
    },
    scoreImprovement,
  };
}
