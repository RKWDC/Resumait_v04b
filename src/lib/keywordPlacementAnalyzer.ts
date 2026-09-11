
/**
 * @fileOverview Task 2: Client-side keyword placement analyzer.
 * Uses regex to detect resume sections and applies multipliers based on spatial prominence.
 */

import { KeywordResult } from "./keywordPresenceScanner";

export interface PlacementResult {
  keywordPlacements: {
    keyword: string;
    bestSection: string;
    placementMultiplier: number;
    isProminent: boolean; // Is it in the top 1/3 of the section?
  }[];
  averagePlacementMultiplier: number;
  placementScore: number;
}

const SECTION_HEADERS = {
  SUMMARY: /^(summary|objective|profile|about me|professional summary|career summary)/i,
  SKILLS: /^(skills|technical skills|core competencies|technologies|tools|expertise|proficiencies)/i,
  EXPERIENCE: /^(experience|work experience|employment|professional experience|work history)/i,
  EDUCATION: /^(education|academic|qualifications|degrees|certifications|credentials)/i,
  CERTIFICATIONS: /^(certifications|licenses|credentials|certificates)/i,
};

const MULTIPLIERS: Record<string, number> = {
  SUMMARY: 2.5,
  SKILLS: 2.0,
  EXPERIENCE_PROMINENT: 1.8, // Top 1/3 of experience
  EXPERIENCE_BODY: 1.2,
  EDUCATION: 1.5,
  CERTIFICATIONS: 1.5,
  OTHER: 0.5,
};

export function analyzeKeywordPlacement(resumeText: string, foundKeywords: KeywordResult[]): PlacementResult {
  const lines = resumeText.split('\n');
  const sections: { name: string; startLine: number; endLine: number }[] = [];

  let currentSection = 'OTHER';
  let startLine = 0;

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    for (const [key, regex] of Object.entries(SECTION_HEADERS)) {
      if (regex.test(trimmed)) {
        if (currentSection) {
          sections.push({ name: currentSection, startLine, endLine: index - 1 });
        }
        currentSection = key;
        startLine = index;
        break;
      }
    }
  });
  sections.push({ name: currentSection, startLine, endLine: lines.length - 1 });

  const keywordPlacements = foundKeywords.map((kw) => {
    const kwLower = kw.canonicalTerm.toLowerCase();
    const surfaceLower = kw.surfaceTerm?.toLowerCase() || '';
    
    let bestSection = 'OTHER';
    let maxMultiplier = 0.5;
    let isProminent = false;

    sections.forEach((section) => {
      const sectionLines = lines.slice(section.startLine, section.endLine + 1);
      const sectionText = sectionLines.join('\n').toLowerCase();
      
      if (sectionText.includes(kwLower) || sectionText.includes(surfaceLower)) {
        let multiplier = MULTIPLIERS[section.name] || 0.5;

        // Spatial Prominence Logic
        if (section.name === 'EXPERIENCE') {
          const foundIndex = sectionLines.findIndex(l => l.toLowerCase().includes(kwLower) || l.toLowerCase().includes(surfaceLower));
          const sectionHeight = sectionLines.length;
          
          if (foundIndex !== -1 && foundIndex < sectionHeight / 3) {
            multiplier = MULTIPLIERS.EXPERIENCE_PROMINENT;
            isProminent = true;
          } else {
            multiplier = MULTIPLIERS.EXPERIENCE_BODY;
          }
        } else if (section.name === 'SUMMARY' || section.name === 'SKILLS') {
            isProminent = true; // Keywords in Summary/Skills are always prominent
        }

        if (multiplier > maxMultiplier) {
          maxMultiplier = multiplier;
          bestSection = section.name;
        }
      }
    });

    return {
      keyword: kw.keyword,
      bestSection,
      placementMultiplier: maxMultiplier,
      isProminent
    };
  });

  const avgMultiplier = keywordPlacements.length > 0 
    ? keywordPlacements.reduce((sum, p) => sum + p.placementMultiplier, 0) / keywordPlacements.length 
    : 0;

  // placementScore scaled to 5 points max
  const placementScore = Math.min(5, (avgMultiplier / 2.5) * 5);

  return {
    keywordPlacements,
    averagePlacementMultiplier: Math.round(avgMultiplier * 100) / 100,
    placementScore: Math.round(placementScore * 10) / 10,
  };
}
