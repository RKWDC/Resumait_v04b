import { stripTrackingMarkers, normalizeForMatch } from './utils';
import { validateHeadline, identifyHeadline, ClassificationPath } from './validation-logic';

export type KeywordToInject = {
  keyword: string;
  evidence?: string;
  category?: string;
};

export type InjectionResult = {
  updatedText: string;
  injectedCount: number;
  targetSection: string;
};

const CANONICAL_TERMS: Record<string, string> = {
  'c4isr': 'C4ISR',
  'c5isr': 'C5ISR',
  'isr': 'ISR',
  'sigint': 'SIGINT',
  'devsecops': 'DevSecOps',
  'devops': 'DevOps',
  'mlops': 'MLOps',
  'ai': 'AI',
  'ml': 'ML',
  'iot': 'IoT',
  'api': 'API',
  'saas': 'SaaS',
  'paas': 'PaaS',
  'aws': 'AWS',
  'gcp': 'GCP',
  'sql': 'SQL',
  'nosql': 'NoSQL',
  'roi': 'ROI',
  'kpi': 'KPI',
  'sla': 'SLA',
  'nist': 'NIST',
  'fedramp': 'FedRAMP',
  'ato': 'ATO',
  'rmf': 'RMF',
  'sdlc': 'SDLC',
  'erp': 'ERP',
  'crm': 'CRM',
  'gis': 'GIS',
  'pmo': 'PMO',
  'pmp': 'PMP',
  'cissp': 'CISSP',
  'itil': 'ITIL',
  'ux': 'UX',
  'ui': 'UI',
  'it': 'IT',
  'hr': 'HR',
  'p&l': 'P&L',
  'oem': 'OEM',
  'sme': 'SME',
  'rfp': 'RFP',
  'idiq': 'IDIQ',
  'gwac': 'GWAC',
  'dod': 'DoD',
  'dhs': 'DHS',
  'dns': 'DNS',
  '5g': '5G'
};

const STOPWORDS = new Set([
  'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'from', 'in', 'of', 'on', 'or', 'the', 'to', 'with', 'via', 'per', 'over'
]);

/**
 * ARCHITECTURAL NOTE: The previous implementation used w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() 
 * on one path and keyword.toLowerCase() on the other, which produced "C4isr", "Vision Ai", 
 * "Devsecops", "cloud technologies" and "federal government". 
 * This rewrite enforces canonical professional capitalization and preserves internal mixed casing (e.g. PyTorch).
 * Neither construction from the previous implementation may return.
 * 
 * @param preserveTitleCase @deprecated - No longer affects output. Casing is now deterministic based on canonical maps.
 */
export function smartCase(keyword: string, preserveTitleCase: boolean = false): string {
  // a. Return '' for empty input. Trim and collapse internal whitespace.
  if (!keyword) return '';
  let term = keyword.trim().replace(/\s+/g, ' ');
  if (!term) return '';

  const lowerWhole = term.toLowerCase();

  // b. If the lowercased whole term is a CANONICAL_TERMS key, return its value.
  if (CANONICAL_TERMS[lowerWhole]) {
    return CANONICAL_TERMS[lowerWhole];
  }

  // c. NEW NORMALIZATION: if the term is entirely uppercase AND it contains a space, hyphen or slash, 
  // lowercase the whole term and continue. Single-word acronyms (e.g. SQL) are NOT normalized here.
  const hasAZ = /[A-Z]/.test(term);
  const isAllUpper = term === term.toUpperCase();
  const hasSeparator = /[ \-\/]/.test(term);
  if (isAllUpper && hasAZ && hasSeparator) {
    term = term.toLowerCase();
  }

  // d. If the term contains an uppercase letter at any index after 0, return it unchanged.
  // This protects DevSecOps, PyTorch, eMASS, SQL, etc.
  for (let i = 1; i < term.length; i++) {
    const charCode = term.charCodeAt(i);
    if (charCode >= 65 && charCode <= 90) return term;
  }

  // e. MERGED PER-PART PASS: Process every part of the term.
  const parts = term.split(/([ \-\/])/); // Capture separators
  const mappedParts = parts.map((part, index) => {
    // If it's a separator (captured in split), return as is
    if (part.length === 1 && ' -/'.includes(part)) return part;
    if (!part) return '';

    const partLower = part.toLowerCase();

    // 1. Canonical check
    if (CANONICAL_TERMS[partLower]) {
      return CANONICAL_TERMS[partLower];
    }

    // 2. Stopword check (not the first part)
    if (index > 0 && STOPWORDS.has(partLower)) {
      return partLower;
    }

    // 3. Capitalize first letter and LEAVE THE REST OF THE PART UNTOUCHED
    return part.charAt(0).toUpperCase() + part.slice(1);
  });

  return mappedParts.join('');
}

/**
 * Intelligent injection logic with structural protection (Amendment 6c).
 */
export function injectKeywords(
  resumeText: string,
  keywords: KeywordToInject[],
  markerType: 'ADDED_SUPPORTED' | 'ADDED_UNSUPPORTED',
  classificationPath: ClassificationPath = 'path_b'
): InjectionResult {
  let currentText = resumeText;
  let count = 0;
  let finalSectionName = 'Core Skills';

  // Defect 3: Identify headline by content/structure, not index
  const originalHeadlineInfo = identifyHeadline(resumeText);

  for (const kw of keywords) {
    const casedKw = smartCase(kw.keyword, markerType === 'ADDED_UNSUPPORTED');
    const marker = `@@${markerType}:${kw.category || 'hard_skill'}:${casedKw}@@`;
    
    // Duplicate detection: Use normalized term-level check instead of exact marker match.
    // Exact string match is insufficient because casing inside woven or polished
    // markers may differ from the candidate casedKw.
    const normalizedTarget = normalizeForMatch(casedKw);
    const hasMarkerMatch = [...currentText.matchAll(/@@[A-Z_]+:[a-z_]+:([^@]+)@@/g)]
      .some(match => normalizeForMatch(match[1]) === normalizedTarget);
    
    if (hasMarkerMatch) continue;

    let lines = currentText.split('\n');
    
    const findSection = (targets: string[]) => lines.findIndex(l => {
      const cleanLine = l.trim().replace(/^[#\s•\-\*:=]+/, '').replace(/[#\s•\-\*:=]+$/, '').toUpperCase();
      return targets.some(t => cleanLine === t || cleanLine.startsWith(t));
    });
    
    const expHeaders = ['PROFESSIONAL EXPERIENCE', 'WORK EXPERIENCE', 'EXPERIENCE', 'WORK HISTORY'];
    const skillHeaders = ['CORE SKILLS', 'SKILLS', 'TECHNICAL SKILLS', 'CORE COMPETENCIES'];
    const eduHeaders = ['EDUCATION', 'ACADEMIC'];
    const summaryHeaders = ['PROFESSIONAL SUMMARY', 'SUMMARY', 'EXECUTIVE SUMMARY', 'OBJECTIVE'];

    const expIdx = findSection(expHeaders);
    const skillIdx = findSection(skillHeaders);
    const eduIdx = findSection(eduHeaders);
    const summaryIdx = findSection(summaryHeaders);

    let injected = false;

    /**
     * POLICY: Bullets are authored by the AI flow and are never an injection target. 
     * All unplaced keywords now route to the Core Skills section.
     * The previous logic appended every unplaced keyword to the same first bullet, 
     * which is why one bullet accumulated multiple redundant "utilizing" clauses.
     */

    // BRANCH 2: Core Skills
    if (!injected && skillIdx !== -1) {
      let contentLine = skillIdx + 1;
      while (contentLine < lines.length && lines[contentLine].trim() === '') contentLine++;
      
      if (contentLine < lines.length) {
        const lineText = lines[contentLine];
        // Deduplication: strip existing markers to compare term-to-term
        const strippedLine = stripTrackingMarkers(lineText);
        const normalizedLine = normalizeForMatch(strippedLine);
        const normalizedKw = normalizeForMatch(casedKw);

        if (!normalizedLine.includes(normalizedKw)) {
          const separator = lineText.includes('|') ? ' | ' : ', ';
          lines[contentLine] = lineText.trimEnd() + separator + marker;
          injected = true;
          finalSectionName = 'Skills section';
        } else {
          // Effectively injected because term is already present
          injected = true;
        }
      }
    }

    // BRANCH 3: New Section Fallback
    if (!injected) {
      const insertionPoint = eduIdx !== -1 ? eduIdx : (expIdx !== -1 ? lines.length : (summaryIdx !== -1 ? summaryIdx + 2 : lines.length));
      lines.splice(insertionPoint, 0, ...['', 'CORE SKILLS', marker, '']);
      injected = true;
      finalSectionName = 'New Skills section';
    }

    if (injected) {
      currentText = lines.join('\n');
      count++;
    }
  }

  // Defect 3: Restore Path B headline if corrupted during injection
  if (originalHeadlineInfo) {
    const postMutationHeadline = identifyHeadline(currentText);
    if (classificationPath === 'path_b' && postMutationHeadline?.content !== originalHeadlineInfo.content) {
      const restorationLines = currentText.split('\n');
      if (postMutationHeadline) {
        restorationLines[postMutationHeadline.index] = originalHeadlineInfo.content;
        currentText = restorationLines.join('\n');
      }
    }
  }

  return { updatedText: currentText, injectedCount: count, targetSection: finalSectionName };
}
