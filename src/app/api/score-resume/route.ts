import { NextRequest, NextResponse } from 'next/server';
import { scoreResume } from '@/ai/flows/score-resume-flow';
import { stripTrackingMarkers } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      resumeText,
      jobDescriptionText,
      extractedKeywordsJson,
      scoringMode = 'initial',
      initialScore,
      atsSystem = 'unknown',
    } = body;

    if (!resumeText || resumeText.trim().length < 10) {
      return NextResponse.json({ success: false, error: 'Resume text missing.' }, { status: 400 });
    }
    if (!extractedKeywordsJson || extractedKeywordsJson.trim().length < 2) {
      return NextResponse.json({ success: false, error: 'No keywords found.' }, { status: 400 });
    }

    const cleanResumeText = stripTrackingMarkers(resumeText);

    // ── TASK 1: Initial Multi-Dimensional Scoring ──────────────────────────
    const result = await scoreResume(
      cleanResumeText,
      jobDescriptionText,
      extractedKeywordsJson,
      scoringMode,
      initialScore,
      undefined,
      atsSystem
    );

    // ── TASK 2: World-Leading Expert Evidence Audit ────────────────────────
    const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
    const missingKeywords = [...(result.missingRequired || []), ...(result.missingPreferred || [])];

    let classifiedKeywords: { 
        keyword: string; 
        classification: 'supported' | 'unsupported'; 
        evidence: string;
        impactScore: number; // 1-10 impact on score
    }[] = [];

    if (missingKeywords.length > 0 && apiKey) {
      try {
        const classifyResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: `You are a World-Class ATS Diagnostic Auditor. 
                  Your task: Analyze missing skills against the resume text to find TRUTHFUL semantic matches AND determine potential score impact.
                  
                  RULES:
                  - "supported": Mark as supported if the resume provides plausible evidence (e.g. "Senior Dev" implies "Software Architecture").
                  - "impactScore": 1-10. High impact means the skill is critical for the seniority level and JD context.
                  
                  OUTPUT FORMAT: Return ONLY a JSON array: [{ "keyword", "classification", "evidence", "impactScore" }]
                  
                  RESUME CONTEXT: ${cleanResumeText.substring(0, 4000)}
                  KEYWORDS TO AUDIT: ${missingKeywords.join(', ')}`
                }]
              }],
              generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
            }),
          }
        );

        if (classifyResponse.ok) {
          const classifyData = await classifyResponse.json();
          const rawText = classifyData?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
          const firstBracket = rawText.indexOf('[');
          const lastBracket = rawText.lastIndexOf(']');
          if (firstBracket !== -1 && lastBracket !== -1) {
            classifiedKeywords = JSON.parse(rawText.substring(firstBracket, lastBracket + 1));
          }
        }
      } catch (err) {
        console.warn('Expert classification audit pass failed:', err);
      }
    }

    const getKeywordMeta = (keyword: string) => 
      result.keywordResults.find((kr: any) => kr.keyword === keyword);

    // ── TASK 3: Assembly & Enrichment ─────────────────────────────────────
    
    // Supported Keywords (Hidden matches found via AI inference)
    const missingSupportedKeywords = (missingKeywords.map(keyword => {
      const found = classifiedKeywords.find(k => k.keyword === keyword && k.classification === 'supported');
      if (found) {
        const meta = getKeywordMeta(keyword);
        return { 
            keyword, 
            evidence: found.evidence, 
            category: meta?.category || 'hard_skill',
            priority: meta?.requirementTier === 'required' ? 'High' : 'Normal'
        };
      }
      return null;
    }).filter(Boolean) as any[]);

    // True Gaps (Unsupported by resume evidence)
    const missingUnsupportedKeywords = (missingKeywords.map(keyword => {
      const foundSupported = classifiedKeywords.find(k => k.keyword === keyword && k.classification === 'supported');
      if (foundSupported) return null;
      
      const auditMeta = classifiedKeywords.find(k => k.keyword === keyword);
      const meta = getKeywordMeta(keyword);
      
      return { 
          keyword, 
          category: meta?.category || 'hard_skill',
          impact: auditMeta?.impactScore || 5,
          priority: meta?.requirementTier === 'required' ? 'Critical' : 'Preferred'
      };
    }).filter(Boolean) as any[]).sort((a, b) => (b?.impact || 0) - (a?.impact || 0));

    const enrichedResult = {
      ...result,
      missingSupportedKeywords,
      missingUnsupportedKeywords,
      unsupportedCount: missingUnsupportedKeywords.length,
      supportedCount: missingSupportedKeywords.length,
      foundCount: result.foundCount
    };

    return NextResponse.json({ success: true, data: JSON.parse(JSON.stringify(enrichedResult)) });

  } catch (err) {
    console.error('Score API route error:', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
