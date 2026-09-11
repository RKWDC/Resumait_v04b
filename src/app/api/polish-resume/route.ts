import { NextRequest, NextResponse } from 'next/server';
import { polishResume } from '@/ai/flows/polish-resume-flow';
import { renderResumeFromJSON } from '@/lib/resume-renderer';
import { validateHeadline, ClassificationPath } from '@/lib/validation-logic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { resumeText, keywords, classificationPath = 'path_b' } = body;

    if (!resumeText || resumeText.trim().length < 50) {
      return NextResponse.json(
        { success: false, error: 'Resume text is too short to polish.' },
        { status: 400 }
      );
    }

    // Capture pre-polish headline to handle restoration logic (Amendment 6)
    const lines = resumeText.split('\n');
    const originalHeadline = lines[1] || '';

    // // MODEL LOCK: googleai/gemini-2.5-flash — DO NOT CHANGE
    const result = await polishResume({
      resumeText: resumeText,
      keywords: keywords || [],
    });

    // Amendment 6c: Restore Path B headlines if mutated
    if (classificationPath === 'path_b' && result.header.headline !== originalHeadline) {
      result.header.headline = originalHeadline;
    }

    // Amendment 6d: Re-validate Path A headlines
    if (classificationPath === 'path_a') {
      const v = validateHeadline(result.header.headline, 'path_a', '');
      if (!v.passed) {
        result.header.headline = originalHeadline; // Restore if polish broke validity
      }
    }

    const renderedText = renderResumeFromJSON(result);

    return NextResponse.json({ 
      success: true, 
      data: { 
        polishedResume: renderedText,
        resumeJson: result 
      } 
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Polish API route error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
