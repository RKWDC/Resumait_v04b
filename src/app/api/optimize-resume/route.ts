import { NextRequest, NextResponse } from 'next/server';
import { optimize as optimizeFlow } from '@/ai/flows/ats-resume-optimization';
import { extractKeywords } from '@/ai/flows/keyword-extraction-flow';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { resume, jobDescription, jobTitle, extractedKeywordsJson } = body;

    if (!resume || resume.trim().length < 10) {
      return NextResponse.json({ success: false, error: 'Resume missing.' }, { status: 400 });
    }
    if (!jobDescription || jobDescription.trim().length < 10) {
      return NextResponse.json({ success: false, error: 'JD missing.' }, { status: 400 });
    }

    // Run parallel tasks for maximum efficiency
    const optimizationPromise = optimizeFlow({ 
      resumeText: resume, 
      jobDescriptionText: jobDescription, 
      targetJobTitle: jobTitle 
    });

    let keywordData = null;
    if (extractedKeywordsJson) {
      try {
        keywordData = JSON.parse(extractedKeywordsJson);
      } catch (e) {
        console.warn('Keyword parsing failed, re-extracting.');
      }
    }

    const keywordPromise = keywordData 
      ? Promise.resolve(keywordData) 
      : extractKeywords({ jobDescription: jobDescription });

    const [optimizationResult, finalKeywordData] = await Promise.all([
      optimizationPromise,
      keywordPromise
    ]);

    const serialized = JSON.parse(JSON.stringify({ 
      ...optimizationResult,
      keywords: finalKeywordData.keywords || [],
      keywordData: finalKeywordData
    }));

    return NextResponse.json({ success: true, data: serialized });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Optimize API error:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
