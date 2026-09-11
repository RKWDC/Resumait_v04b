'use server';

/**
 * Server Actions for the RESUMAIT application.
 */

import { extractKeywords as extractKeywordsFlow } from '@/ai/flows/keyword-extraction-flow';
import { counselorChat as counselorChatFlow } from '@/ai/flows/counselor-flow';
import { spellCheckResume } from '@/ai/flows/spell-check-flow';
import { compressToTwoPages } from '@/ai/flows/compress-resume-flow';
import { distillToOnePage } from '@/ai/flows/one-page-distill-flow';
import { generateCoverLetter as generateCoverLetterFlow } from '@/ai/flows/cover-letter-generation';
import { polishCoverLetter as polishCoverLetterFlow } from '@/ai/flows/polish-cover-letter-flow';
import type { ActionResponse } from '@/types/actions';
import { calculateAtsMatch } from '@/lib/ats-logic';
import { identifyHeadline, validateHeadline, ClassificationPath } from '@/lib/validation-logic';
import { AtsAnalysisResult } from '@/types/ats';

export async function runNewKeywordExtraction(jobDescription: string, ownerUid?: string): Promise<ActionResponse<any>> {
  try {
    const result = await extractKeywordsFlow({ jobDescription, ownerUid });
    return { success: true, data: result };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('runNewKeywordExtraction error:', message);
    return { success: false, error: message };
  }
}

export async function getInitialAnalysis(input: {
  resume: string;
  jobDescription: string;
  extractedKeywordsJson: string;
  userId?: string;
  jobTitle: string;
}): Promise<ActionResponse<AtsAnalysisResult>> {
  try {
    if (!input.extractedKeywordsJson) {
      throw new Error("Missing keyword data for analysis.");
    }
    const extraction = JSON.parse(input.extractedKeywordsJson);
    const analysis = calculateAtsMatch(extraction, input.resume, input.jobTitle);
    
    // Explicit casting to restore the type erased by stringification
    return { success: true, data: JSON.parse(JSON.stringify(analysis)) as AtsAnalysisResult };
  } catch (error: any) {
    console.error('getInitialAnalysis error:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function counselorChat(input: {
  resume: string;
  jobDescription: string;
  history: { role: 'user' | 'model'; content: string }[];
  userInput: string;
  analysisResults?: any;
}): Promise<ActionResponse<any>> {
  try {
    const result = await counselorChatFlow({
      resumeText: input.resume,
      jobDescriptionText: input.jobDescription,
      history: input.history,
      userInput: input.userInput,
      analysisResults: input.analysisResults
    });
    return { success: true, data: JSON.parse(JSON.stringify(result)) };
  } catch (error) {
    console.error('Chat error:', error);
    return { success: false, error: String(error) };
  }
}

// SHARED MUTATION GUARD (Amendment 6 & Defect 3)
async function wrapMutation(
  resumeText: string, 
  mutationFn: () => Promise<any>,
  classificationPath: ClassificationPath = 'path_b'
): Promise<ActionResponse<any>> {
  try {
    const originalInfo = identifyHeadline(resumeText);
    const result = await mutationFn();
    const newText = result.correctedResume || result.compressedResume || result.distilledResume;
    
    if (!newText) return { success: true, data: result };

    const postInfo = identifyHeadline(newText);
    
    // Safety: If headline locator fails after mutation, revert entirely
    if (!postInfo && originalInfo) {
       return { 
         success: true, 
         data: { 
           ...result, 
           correctedResume: resumeText, 
           compressedResume: resumeText, 
           distilledResume: resumeText, 
           warnings: ['Headline lost during mutation; reverted to original.'] 
         } 
       };
    }

    // Path B: Restore headline if changed
    if (classificationPath === 'path_b' && originalInfo && postInfo && postInfo.content !== originalInfo.content) {
      const lines = newText.split('\n');
      lines[postInfo.index] = originalInfo.content;
      const restoredText = lines.join('\n');
      if (result.correctedResume) result.correctedResume = restoredText;
      if (result.compressedResume) result.compressedResume = restoredText;
      if (result.distilledResume) result.distilledResume = restoredText;
    }

    // Path A: Revalidate rather than restore (Amendment 6d)
    if (classificationPath !== 'path_b' && originalInfo && postInfo) {
      const v = validateHeadline(postInfo.content, classificationPath, '');
      if (!v.passed) {
        // Restore if validation broke
        const lines = newText.split('\n');
        lines[postInfo.index] = originalInfo.content;
        const restoredText = lines.join('\n');
        if (result.correctedResume) result.correctedResume = restoredText;
        if (result.compressedResume) result.compressedResume = restoredText;
        if (result.distilledResume) result.distilledResume = restoredText;
      }
    }

    return { success: true, data: result };
  } catch (error) {
    console.error('Mutation error:', error);
    return { success: false, error: String(error) };
  }
}

export async function runSpellCheck(input: {
  resumeText: string;
  keywords: string[];
  classificationPath?: ClassificationPath;
}): Promise<ActionResponse<any>> {
  return wrapMutation(input.resumeText, () => spellCheckResume(input), input.classificationPath);
}

export async function runSmartCompression(input: {
  resumeText: string;
  keywords: string[];
  targetJobTitle?: string;
  classificationPath?: ClassificationPath;
}): Promise<ActionResponse<any>> {
  return wrapMutation(input.resumeText, () => compressToTwoPages(input), input.classificationPath);
}

export async function runOnePageDistillation(input: {
  resumeText: string;
  keywords: string[];
  targetJobTitle?: string;
  classificationPath?: ClassificationPath;
}): Promise<ActionResponse<any>> {
  return wrapMutation(input.resumeText, () => distillToOnePage(input), input.classificationPath);
}

export async function runGenerateCoverLetter(input: {
  resume: string;
  jobDescription: string;
}): Promise<ActionResponse<any>> {
  try {
    const result = await generateCoverLetterFlow({
      resumeText: input.resume,
      jobDescriptionText: input.jobDescription
    });
    return { success: true, data: result };
  } catch (error) {
    console.error('Cover letter error:', error);
    return { success: false, error: String(error) };
  }
}

export async function runPolishCoverLetter(input: {
  coverLetterText: string;
  resumeText: string;
}): Promise<ActionResponse<any>> {
  try {
    const result = await polishCoverLetterFlow(input);
    return { success: true, data: result };
  } catch (error) {
    console.error('Polish cover letter error:', error);
    return { success: false, error: String(error) };
  }
}

export async function optimize(input: any): Promise<ActionResponse<any>> { return { success: false, error: 'Use /api/optimize-resume' }; }
export async function getResumeScore(input: any): Promise<ActionResponse<any>> { return { success: false, error: 'Use /api/score-resume' }; }
