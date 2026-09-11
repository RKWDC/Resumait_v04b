/**
 * @fileOverview Deterministic logic for resume summary classification and validation.
 * Governed by the Resumait — Professional Summary Section Rules specification.
 */

export type SummaryCategory = 'Objective' | 'Professional Summary' | 'Executive Summary';

export interface SummaryConfig {
  category: SummaryCategory;
  heading: string;
  sentenceRange: [number, number];
  wordRange: [number, number];
  absoluteCeiling: number;
}

/**
 * Classifies the candidate into a summary category based on career signals.
 * Standardized to 3-5 sentences per RESUMAIT Master ATS Template.
 */
export function getSummaryConfig(
  experienceYears: number,
  seniority: 'intern' | 'entry' | 'mid' | 'senior' | 'lead' | 'manager' | 'director' | 'vp' | 'c_level' | 'not_specified',
  isCareerChanger: boolean
): SummaryConfig {
  const DEFAULT_SENTENCES: [number, number] = [3, 5];

  // Rule 1.1: Executive Summary (Seniority-driven Priority)
  if (['director', 'vp', 'c_level'].includes(seniority)) {
    return {
      category: 'Executive Summary',
      heading: 'Executive Summary',
      sentenceRange: DEFAULT_SENTENCES,
      wordRange: [60, 110],
      absoluteCeiling: 120,
    };
  }

  // Rule 1.1: Objective (Career Changer or Early Career)
  if (experienceYears < 2 || isCareerChanger) {
    return {
      category: 'Objective',
      heading: 'Objective',
      sentenceRange: DEFAULT_SENTENCES,
      wordRange: [40, 80],
      absoluteCeiling: 90,
    };
  }

  // Standard Professional Summary case
  return {
    category: 'Professional Summary',
    heading: 'Professional Summary',
    sentenceRange: DEFAULT_SENTENCES,
    wordRange: [50, 100],
    absoluteCeiling: 110,
  };
}

/**
 * Performs deterministic validation of generated summary text.
 * Implements Section 7: Self-Check Rubric.
 */
export function validateSummaryText(text: string, config: SummaryConfig, targetJobTitle: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const words = text.trim().split(/\s+/).filter(w => w.length > 0);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);

  // Rule 2.1 & 2.2: Absolute Ceiling and floor
  if (words.length > config.absoluteCeiling) {
    errors.push(`Word count (${words.length}) exceeds absolute ceiling of ${config.absoluteCeiling}.`);
  }
  if (words.length < 25) {
    errors.push(`Word count (${words.length}) is below the absolute minimum of 25.`);
  }

  // Rule 2.1: Sentence Count Range (Enforced 3-5)
  if (sentences.length < config.sentenceRange[0] || sentences.length > config.sentenceRange[1]) {
    errors.push(`Sentence count (${sentences.length}) is outside the required range [${config.sentenceRange[0]}, ${config.sentenceRange[1]}].`);
  }

  // Rule 3.1: Job title in first sentence
  const firstSentence = sentences[0] || "";
  if (!firstSentence.toLowerCase().includes(targetJobTitle.toLowerCase())) {
    errors.push(`Target job title "${targetJobTitle}" not found in the first sentence of the prose.`);
  }

  // Rule 3.3/3.4: No bullets, no colon-labeled fields
  if (text.includes('•') || text.includes('- ') || text.includes('* ')) {
    errors.push("Prohibited bullet points or list markers detected in the prose paragraph.");
  }

  const forbiddenPatterns = [
    /Target Role:/i,
    /Target Position:/i,
    /Desired Title:/i,
    /Career Goal:/i,
    /^[a-z\s]+:\s+.+$/im // Generic "Label: Value"
  ];

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(text)) {
      errors.push(`Prohibited stand-alone labeled field pattern detected.`);
      break;
    }
  }

  // Rule 5.3: No contractions
  const contractions = ["can't", "won't", "don't", "it's", "i'm", "you're", "he's", "she's", "we're", "they're", "isn't", "aren't", "shouldn't", "wouldn't", "haven't", "hasn't"];
  for (const c of contractions) {
    if (new RegExp(`\\b${c}\\b`, 'i').test(text)) {
      errors.push(`Prohibited contraction "${c}" detected.`);
    }
  }

  return { valid: errors.length === 0, errors };
}
