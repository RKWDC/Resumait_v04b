/**
 * @fileOverview Core validation rubric for Professional Headlines and Historical Titles.
 */

export type ClassificationPath = 'path_a' | 'path_a_unverified' | 'path_b';

export interface ValidationResult {
  passed: boolean;
  errors: string[];
}

export function countWords(text: string): number {
  if (!text) return 0;
  // TOKENIZATION: Split on whitespace, exclude standalone pipes.
  return text.split(/\s+/).filter(w => w !== '|' && w.length > 0).length;
}

/**
 * Shared utility to strip ATS labels.
 * Removes standalone labeled lines while preserving labels found inside prose sentences.
 */
export function stripAtsLabels(text: string): string {
  if (!text) return '';
  return text
    .replace(/^[ \t]*Target Role:.*$\n?/gim, '')
    .replace(/^[ \t]*Desired Position:.*$\n?/gim, '')
    .replace(/^[ \t]*Target Title:.*$\n?/gim, '')
    .replace(/^[ \t]*Career Goal:.*$\n?/gim, '')
    .trim();
}

export function parseOriginalTitles(resumeText: string): string[] {
  if (!resumeText) return [];
  const titles: string[] = [];
  const lines = resumeText.split('\n');
  const triplePattern = /^(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)$/;
  lines.forEach(line => {
    const trimmed = line.trim();
    const match = trimmed.match(triplePattern);
    if (match && match[1]) titles.push(match[1].trim().toLowerCase());
  });
  return titles;
}

/**
 * Deterministic headline validation.
 */
export function validateHeadline(
  headline: string,
  path: ClassificationPath,
  targetJobTitle: string
): ValidationResult {
  const errors: string[] = [];
  const wordCount = countWords(headline);

  if (wordCount < 5 || wordCount > 12) {
    errors.push(`Headline length (${wordCount} words) must be between 5 and 12.`);
  }

  // HEADLINE LABEL REGEX
  // Detects "Label: Value" patterns anchored to line start or a pipe.
  const labelRegex = /(?:^|\|)\s*[A-Za-z][A-Za-z0-9 \-]{1,30}:\s*\S/;
  if (labelRegex.test(headline)) {
    errors.push("Headline contains a prohibited 'Label: Value' pattern.");
  }

  const BANNED_PHRASES = ["Aspiring", "Seeking", "Transitioning to", "Looking to", "Hoping to", "Eager to"];
  for (const phrase of BANNED_PHRASES) {
    if (new RegExp(`\\b${phrase}\\b`, 'i').test(headline)) {
      errors.push(`Headline contains prohibited descriptive term: ${phrase}`);
    }
  }

  const contractions = ["can't", "won't", "don't", "it's", "i'm", "you're"];
  for (const c of contractions) {
    if (new RegExp(`\\b${c}\\b`, 'i').test(headline)) {
      errors.push(`Headline contains prohibited contraction: ${c}`);
    }
  }

  if (/ {2,}/.test(headline)) {
    errors.push("Headline contains prohibited consecutive spaces.");
  }

  // Integrity Check for Path B (Career Changers)
  if (path === 'path_b' && targetJobTitle) {
    const cleanHeadline = headline.toLowerCase().trim();
    const cleanTarget = targetJobTitle.toLowerCase().trim();
    if (cleanHeadline.startsWith(cleanTarget)) {
      errors.push("Path B headlines must not state the target job title as the candidate's identity.");
    }
  }

  return { passed: errors.length === 0, errors };
}

/**
 * Identifies the headline line in a resume text block by structural position.
 * Returns the line content and its index.
 */
export function identifyHeadline(text: string): { content: string; index: number } | null {
  const lines = text.split('\n');
  const nameLine = lines[0]?.trim();
  if (!nameLine) return null;

  // Headline is the first non-empty line after the name/contact block.
  for (let i = 1; i < Math.min(lines.length, 5); i++) {
    const line = lines[i].trim();
    if (line && !line.includes('@') && !line.match(/\d{3}/)) {
      return { content: lines[i], index: i };
    }
  }
  return null;
}
