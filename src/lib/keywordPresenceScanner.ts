/**
 * @fileOverview Task 1: Client-side keyword presence scanner.
 * Performs high-fidelity string matching and contextual anchoring.
 */

export interface KeywordResult {
  keyword: string;
  canonicalTerm: string;
  surfaceTerm: string;
  matchType: 'exact' | 'synonym' | 'acronym' | 'fuzzy' | 'none';
  matchContext?: string; // The specific sentence where it was found
  category: string;
  requirement: 'required' | 'preferred' | 'implied';
  priorityWeight: number;
}

export interface KeywordPresenceResult {
  found: KeywordResult[];
  missing: KeywordResult[];
  foundCount: number;
  missingCount: number;
  requiredFoundCount: number;
  requiredMissingCount: number;
  preferredFoundCount: number;
  preferredMissingCount: number;
  rawKeywordScore: number;
}

const SYNONYM_MAP: Record<string, string[]> = {
  "JavaScript": ["JS"],
  "Machine Learning": ["ML", "Machine-Learning"],
  "ML": ["Machine Learning"],
  "Natural Language Processing": ["NLP"],
  "Artificial Intelligence": ["AI"],
  "Application Programming Interface": ["API"],
  "User Experience": ["UX"],
  "User Interface": ["UI"],
  "Search Engine Optimization": ["SEO"],
  "Key Performance Indicator": ["KPI"],
  "Continuous Integration": ["CI"],
  "Continuous Deployment": ["CD"],
  "Amazon Web Services": ["AWS"],
  "Google Cloud Platform": ["GCP"],
  "Microsoft Azure": ["Azure"],
  "PostgreSQL": ["Postgres"],
  "Microsoft Excel": ["Excel", "spreadsheet"],
  "Structured Query Language": ["SQL"],
  "Version Control": ["Git", "GitHub"],
  "TypeScript": ["TS"],
  "React.js": ["React"],
  "Node.js": ["Node"],
  "Docker": ["Containerization"],
  "Kubernetes": ["K8s"],
  "Project Management": ["PM", "PMP"],
  "Agile": ["Scrum"],
  "Software Development Life Cycle": ["SDLC"],
  "Generative AI": ["GenAI", "LLM", "Large Language Models"],
};

/**
 * Extracts the sentence containing the keyword for high-fidelity evidence reporting.
 */
function findSentenceContext(text: string, term: string): string | undefined {
  const sentences = text.split(/[.!?]\s+/);
  const lowerTerm = term.toLowerCase();
  const match = sentences.find(s => s.toLowerCase().includes(lowerTerm));
  return match ? match.trim() : undefined;
}

/**
 * Checks if all significant words are present in any order.
 */
function setBasedMatch(text: string, term: string): boolean {
  const words = term.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  if (words.length <= 1) return text.includes(term.toLowerCase());
  return words.every(word => text.includes(word));
}

/**
 * Handles basic tenses and plurals.
 */
function fuzzyMatch(text: string, term: string): boolean {
  const normalize = (s: string) => s.toLowerCase()
    .replace(/s\b/g, '') 
    .replace(/ing\b/g, '') 
    .replace(/ed\b/g, '') 
    .trim();
  
  const normText = normalize(text);
  const normTerm = normalize(term);
  
  return normText.includes(normTerm);
}

export function scanKeywordPresence(resumeText: string, keywords: any[]): KeywordPresenceResult {
  const normalizedResume = resumeText.toLowerCase();
  const found: KeywordResult[] = [];
  const missing: KeywordResult[] = [];

  keywords.forEach((k) => {
    const canonical = k.canonicalTerm || k.surfaceTerm || k.keyword;
    const surface = k.surfaceTerm || k.keyword;
    
    const kwObj: KeywordResult = {
      keyword: k.surfaceTerm || k.keyword,
      canonicalTerm: canonical,
      surfaceTerm: surface,
      matchType: 'none',
      category: k.category || 'hard_skill',
      requirement: k.requirement || 'required',
      priorityWeight: k.priorityWeight || 3,
    };

    const normCanonical = canonical.toLowerCase();
    const normSurface = surface.toLowerCase();

    // 1. Exact Match
    if (normalizedResume.includes(normCanonical) || normalizedResume.includes(normSurface)) {
      kwObj.matchType = 'exact';
      kwObj.matchContext = findSentenceContext(resumeText, normSurface) || findSentenceContext(resumeText, normCanonical);
      found.push(kwObj);
      return;
    }

    // 2. Set Match
    if (setBasedMatch(normalizedResume, canonical) || setBasedMatch(normalizedResume, surface)) {
      kwObj.matchType = 'fuzzy';
      found.push(kwObj);
      return;
    }

    // 3. Synonym Match
    const synonyms = SYNONYM_MAP[canonical] || SYNONYM_MAP[surface] || [];
    const matchedSynonym = synonyms.find(s => normalizedResume.includes(s.toLowerCase()));
    if (matchedSynonym) {
      kwObj.matchType = 'synonym';
      kwObj.matchContext = findSentenceContext(resumeText, matchedSynonym);
      found.push(kwObj);
      return;
    }

    // 4. Fuzzy Stemming
    if (fuzzyMatch(normalizedResume, canonical) || fuzzyMatch(normalizedResume, surface)) {
      kwObj.matchType = 'fuzzy';
      found.push(kwObj);
      return;
    }

    missing.push(kwObj);
  });

  const reqFound = found.filter(f => f.requirement === 'required');
  const totalReq = [...found, ...missing].filter(k => k.requirement === 'required');
  
  const calcWeight = (list: KeywordResult[]) => list.reduce((sum, k) => {
    const multiplier = k.requirement === 'required' ? 1.5 : k.requirement === 'preferred' ? 1.0 : 0.6;
    return sum + (k.priorityWeight * multiplier);
  }, 0);

  const foundWeight = calcWeight(found);
  const totalWeight = foundWeight + calcWeight(missing);
  const rawKeywordScore = totalWeight > 0 ? (foundWeight / totalWeight) * 55 : 0;

  return {
    found,
    missing,
    foundCount: found.length,
    missingCount: missing.length,
    requiredFoundCount: reqFound.length,
    requiredMissingCount: totalReq.length - reqFound.length,
    preferredFoundCount: found.length - reqFound.length,
    preferredMissingCount: missing.length - (totalReq.length - reqFound.length),
    rawKeywordScore: Math.round(rawKeywordScore * 10) / 10,
  };
}
