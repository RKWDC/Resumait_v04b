/**
 * @fileOverview True shape of the ATS Analysis result as returned by the scoring engine.
 */

export interface AtsAnalysisResult {
  score: number;
  verdict: string;
  parseability: {
    readable: boolean;
    note: string;
  };
  knockouts: Array<{
    label: string;
    kind: 'cap' | 'penalty';
  }>;
  fixes: Array<{
    label: string;
    points: number;
  }>;
  projectedScore: number;
  foundKeywords: string[];
  supportedKeywords: string[];
  unsupportedKeywords: string[];
  breakdown: {
    k: number; // Weighted Keyword Score
    t: number; // Title Alignment
    r: number; // Recency/Density
    e: number; // Education
    h: number; // Human Appeal/Metrics
    p: number; // Sum of Formatting Penalties
    ko: number; // Knockout/Cap value
  };
  penalties: Array<{
    label: string;
    points: number;
    reason: string;
  }>;
}
