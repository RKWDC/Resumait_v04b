/**
 * CANONICAL PRODUCTION ATS SCORING ENGINE
 * Pure TypeScript implementation of the Weighted Multi-Factor Scoring Model with Knockout Gating.
 * Formula: S = max(0, round( K*0.45 + T*0.20 + R*0.10 + E*0.15 + H*0.10 − P ))
 */

import { AtsAnalysisResult } from "@/types/ats";

export function normalizeForMatch(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const EDUCATION_LEVELS: Record<string, number> = { highschool: 1, bachelors: 2, masters: 3, phd: 4 };
const EDUCATION_ALIASES: Record<string, string[]> = {
  bachelors: ["bs", "ba", "b.s.", "b.a.", "undergraduate", "bachelor"],
  masters: ["ms", "ma", "m.s.", "m.a.", "mba", "m.b.a.", "master"],
  phd: ["doctorate", "p.h.d.", "ph.d", "doctor"],
};

const TECHNICAL_ALIASES: Record<string, string[]> = {
  "AWS": ["Amazon Web Services", "Amazon Cloud"],
  "GCP": ["Google Cloud Platform", "Google Cloud"],
  "Azure": ["Microsoft Azure"],
  "Machine Learning": ["ML", "Predictive Modeling", "Statistical Modeling"],
  "Artificial Intelligence": ["AI", "GenAI", "Generative AI"],
  "Software Engineer": ["SDE", "Full Stack Developer", "Software Developer"],
  "SQL": ["PostgreSQL", "MySQL", "T-SQL", "NoSQL"],
  "Project Management": ["PMP", "Project Lead", "Program Management"],
  "Agile": ["Scrum", "Kanban", "Sprint Planning"],
  "DevOps": ["CI/CD", "Site Reliability Engineering", "SRE"],
  "Docker": ["Kubernetes", "K8s", "Containerization"],
};

function resolveEducationLevel(text: string): number {
  const norm = normalizeForMatch(text);
  let highest = 0;
  for (const [level, value] of Object.entries(EDUCATION_LEVELS)) {
    if (norm.includes(level)) highest = Math.max(highest, value);
    const aliases = EDUCATION_ALIASES[level] || [];
    for (const alias of aliases) {
      const regex = new RegExp(`\\b${alias.replace(/\./g, '\\.')}\\b`, 'i');
      if (regex.test(text)) highest = Math.max(highest, value);
    }
  }
  return highest;
}

function detectYears(text: string): number | null {
  const expMatch = text.match(/(\d+)\+?\s*years?/i);
  let explicit = expMatch ? parseInt(expMatch[1]) : 0;

  const years = text.match(/\b(19|20)\d{2}\b/g);
  if (!years) return explicit > 0 ? explicit : null;
  
  const currentYear = new Date().getFullYear();
  const sortedYears = years.map(Number).sort((a, b) => a - b);
  const derived = currentYear - sortedYears[0];
  
  const result = Math.max(explicit, derived);
  return result > 0 ? result : null;
}

function checkMatchQuality(k: any, normalizedResume: string): 'found' | 'supported' | 'missing' {
  const normTerm = normalizeForMatch(k.term);
  if (normalizedResume.includes(normTerm)) return 'found';
  
  const aliases = Array.isArray(k.aliases) ? k.aliases.map(normalizeForMatch) : [];
  if (aliases.some(a => normalizedResume.includes(a))) return 'supported';

  for (const [canonical, synonyms] of Object.entries(TECHNICAL_ALIASES)) {
    const clique = [normalizeForMatch(canonical), ...synonyms.map(normalizeForMatch)];
    if (clique.includes(normTerm) && clique.some(t => normalizedResume.includes(t))) {
      return 'supported';
    }
  }
  return 'missing';
}

export function getSection(text: string, targetKeywords: string[]): string {
  const lines = text.split(/\r?\n/);
  const headers = [
    'EDUCATION', 'EXPERIENCE', 'WORK HISTORY', 'PROFESSIONAL EXPERIENCE', 'SKILLS', 'SUMMARY',
    'PROFESSIONAL SUMMARY', 'PROFILE', 'PROJECTS', 'CERTIFICATIONS', 'AWARDS', 'LANGUAGES', 
    'ACADEMIC', 'EMPLOYMENT', 'EXECUTIVE SUMMARY', 'OBJECTIVE', 'CORE SKILLS', 
    'TECHNICAL SKILLS', 'CORE COMPETENCIES', 'WORK EXPERIENCE', 'VOLUNTEER'
  ];
  const clean = (r: string) => r.trim().toUpperCase().replace(/^[#\s•\-*]+/, '').replace(/[#\s•\-*]+$/, '').replace(/:$/, '').trim();
  let startIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const c = clean(lines[i]);
    if (lines[i].trim() && c.length < 60 && targetKeywords.some(k => c === k || c.includes(k))) {
      startIdx = i;
      break;
    }
  }
  if (startIdx === -1) return '';
  let endIdx = lines.length;
  for (let j = startIdx + 1; j < lines.length; j++) {
    const c = clean(lines[j]);
    if (lines[j].trim() && c.length > 2 && c.length < 50 && headers.some(h => c === h) && !targetKeywords.some(k => c === k)) {
      endIdx = j;
      break;
    }
  }
  return lines.slice(startIdx + 1, endIdx).join('\n').trim();
}

function auditImpact(resumeText: string) {
  const exp = getSection(resumeText, ['EXPERIENCE', 'WORK HISTORY', 'PROFESSIONAL EXPERIENCE', 'EMPLOYMENT', 'WORK EXPERIENCE']);
  if (!exp || exp.trim().length < 10) return { score: 0, highImpactCount: 0, totalRoles: 0 };
  const lines = exp.split('\n').map(l => l.trim()).filter(Boolean);
  const bulletStart = /^[•\-*·●▪◦○\u2022\u2023\u25E6\u25A0\u25AA\u00B7\u2012\u2013\u2014\u2212+>]|^\d+[\.\)]/;
  const metricRegex = /%|\$|£|€|\b\d+(?:,\d+)?\s*(?:%|percent|dollars|USD|users|clients|leads|hours|weeks|months|X|x|times|growth|reduction|savings|ROI|revenue)\b|\b\d{1,3}(?:,\d{3})*(?:\.\d+)?\b(?!\s*(?:st|nd|rd|th|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|20|19))/i;
  const roles: { header: string; bullets: string[] }[] = [];
  let h = "", b: string[] = [];
  lines.forEach(line => {
    if (bulletStart.test(line)) b.push(line);
    else { if (h !== "" && b.length > 0) { roles.push({ header: h, bullets: [...b] }); h = line; b = []; } else if (h === "") h = line; else h += " " + line; }
  });
  if (h !== "" || b.length > 0) roles.push({ header: h, bullets: b });
  const valid = roles.filter(r => r.bullets.length > 0);
  if (valid.length === 0) return { score: 0, highImpactCount: 0, totalRoles: 0 };
  let withMetrics = 0;
  valid.forEach(r => { if (r.bullets.some(x => metricRegex.test(x))) withMetrics++; });
  return { score: Math.round((withMetrics / valid.length) * 100), highImpactCount: withMetrics, totalRoles: valid.length };
}

export function calculateAtsMatch(extraction: any, resumeText: string, targetJobTitle: string): AtsAnalysisResult {
  const nRes = normalizeForMatch(resumeText);
  const nTitle = normalizeForMatch(targetJobTitle);
  const keywords = Array.isArray(extraction.keywords) ? extraction.keywords : [];
  
  const found: string[] = [];
  const supported: string[] = [];
  const missing: string[] = [];
  
  // K — WEIGHTED KEYWORD VECTOR
  let matchedWeight = 0;
  let totalWeight = 0;
  
  keywords.forEach(k => {
    const w = k.importance * (k.priority === 'required' ? 1 : 0.3) * (k.category === 'soft' ? 0.4 : 1);
    totalWeight += w;
    const q = checkMatchQuality(k, nRes);
    if (q !== 'missing') {
      matchedWeight += w;
      if (q === 'found') found.push(k.term); else supported.push(k.term);
    } else {
      missing.push(k.term);
    }
  });
  
  const kScore = totalWeight > 0 ? (matchedWeight / totalWeight) * 100 : 100;

  // T — TITLE ALIGNMENT
  let tScore = 0;
  const req = extraction.requiredTitles || [];
  if (req.some((t: string) => { const n = normalizeForMatch(t); return nRes.includes(n) || nTitle.includes(n); })) tScore = 100;
  else if (req.some((t: string) => nTitle.includes(normalizeForMatch(t).split(' ')[0]))) tScore = 50;

  // R — RECENCY
  const expSection = getSection(resumeText, ['EXPERIENCE', 'WORK HISTORY', 'PROFESSIONAL EXPERIENCE', 'EMPLOYMENT', 'WORK EXPERIENCE']);
  const expMatches = [...found, ...supported].filter(kw => normalizeForMatch(expSection).includes(normalizeForMatch(kw)));
  const rScore = Math.min(100, (expMatches.length / Math.max(1, (found.length + supported.length))) * 120);

  // E — EDUCATION
  let eScore = 0;
  const edu = getSection(resumeText, ['EDUCATION', 'ACADEMIC', 'SCHOOLING']);
  const reqLvl = resolveEducationLevel(extraction.knockouts?.minEducation || 'highschool');
  const usrLvl = resolveEducationLevel(edu);
  if (usrLvl >= reqLvl && reqLvl > 0) eScore = 100;
  else if (!extraction.knockouts?.minEducation || extraction.knockouts.minEducation.toLowerCase().includes('not specified')) eScore = 100;
  else if (usrLvl > 0) eScore = 50;

  // H — HUMAN APPEAL
  const hAudit = auditImpact(resumeText);
  const hScore = hAudit.score;

  // P — PENALTIES
  const penalties: any[] = [];
  let p = 0;
  if (/ {3,}/.test(resumeText)) { penalties.push({ label: 'LAYOUT COMPLEXITY', points: -10, reason: 'Multi-column spacing detected.' }); p += 10; }
  const head = resumeText.substring(0, 1000);
  if (!/[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}/.test(head) && !/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(head)) {
    penalties.push({ label: 'CONTACT ACCESSIBILITY', points: -10, reason: 'No email or phone in header.' }); p += 10;
  }
  const coreSections = [
    { label: 'PROFESSIONAL SUMMARY', keys: ['SUMMARY', 'OBJECTIVE', 'PROFILE'] },
    { label: 'CORE SKILLS', keys: ['SKILLS', 'COMPETENCIES'] },
    { label: 'PROFESSIONAL EXPERIENCE', keys: ['EXPERIENCE', 'WORK HISTORY'] }
  ];
  coreSections.forEach(s => {
    const body = getSection(resumeText, s.keys);
    if (body && body.replace(/\s+/g, '').length < 15) { penalties.push({ label: `EMPTY SECTION: ${s.label}`, points: -15, reason: `Dangling ${s.label} header.` }); p += 15; }
  });

  let score = Math.max(0, Math.round(kScore * 0.45 + tScore * 0.20 + rScore * 0.10 + eScore * 0.15 + hScore * 0.10 - p));

  // KNOCKOUT GATING
  const CAP = 50;
  const fails: Array<{ label: string, kind: 'cap' | 'penalty' }> = [];
  let koPenalty = 0;
  let hardFail = false;
  const kn = extraction.knockouts || {};
  
  for (const c of kn.clearances || []) if (c && !nRes.includes(normalizeForMatch(c))) { fails.push({ label: `Required clearance not found: ${c}`, kind: 'cap' }); hardFail = true; }
  if (kn.minYearsExperience > 0) {
    const y = detectYears(resumeText);
    if (y != null && y < kn.minYearsExperience) { fails.push({ label: `Below ${kn.minYearsExperience}+ years (detected ~${y})`, kind: 'cap' }); hardFail = true; }
  }
  if (kn.degreeField) {
    const fields = kn.degreeField.split(/[,/]|\bor\b|\band\b/i).map(normalizeForMatch).filter(x => x.length > 2);
    if (fields.length && !fields.some(f => nRes.includes(f))) { fails.push({ label: `Required degree field not shown: ${kn.degreeField}`, kind: 'cap' }); hardFail = true; }
  }
  for (const c of kn.certifications || []) if (c && !nRes.includes(normalizeForMatch(c))) { fails.push({ label: `Missing certification: ${c}`, kind: 'penalty' }); koPenalty += 8; }
  
  score = Math.max(0, score - Math.min(koPenalty, 24));
  if (hardFail) score = Math.min(score, CAP);

  // REPORT CARD
  const verdict = hardFail ? 'Capped' : score >= 90 ? 'Excellent' : score >= 80 ? 'Strong' : score >= 65 ? 'Competitive' : score >= 50 ? 'Borderline' : 'Needs work';
  
  const fixes: Array<{ label: string, points: number }> = [];
  if (missing.length > 0) fixes.push({ label: 'Keyword Gaps', points: Math.round(Math.min(14, missing.length * 1.4)) });
  if (tScore < 100) fixes.push({ label: 'Title Alignment', points: 10 });
  if (hScore < 70) fixes.push({ label: 'Metric Density', points: 8 });
  penalties.forEach(pen => fixes.push({ label: pen.label, points: Math.abs(pen.points) }));

  return {
    score,
    verdict,
    parseability: { readable: p < 10, note: p >= 10 ? 'Multi-column layout may scramble parsing.' : 'Document is ATS-friendly.' },
    knockouts: fails,
    fixes: fixes.sort((a, b) => b.points - a.points),
    projectedScore: hardFail ? score : Math.min(96, score + fixes.reduce((s, f) => s + f.points, 0)),
    foundKeywords: found,
    supportedKeywords: supported,
    unsupportedKeywords: missing,
    breakdown: { k: Math.round(kScore), t: tScore, r: Math.round(rScore), e: eScore, h: hScore, p, ko: hardFail ? 50 : 0 },
    penalties: penalties // Return raw penalty objects for UI explanations
  };
}
