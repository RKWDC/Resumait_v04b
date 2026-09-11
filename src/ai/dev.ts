'use server';
import { config } from 'dotenv';
config();

import '@/ai/flows/ats-resume-optimization.ts';
import '@/ai/flows/cover-letter-generation.ts';
import '@/ai/flows/polish-resume-flow.ts';
import '@/ai/flows/counselor-flow.ts';
import '@/ai/flows/keyword-extraction-flow';
import '@/ai/flows/spell-check-flow';
import '@/ai/flows/compress-resume-flow';
import '@/ai/flows/one-page-distill-flow';
import '@/ai/flows/summary-generation-flow';
import '@/ai/flows/polish-cover-letter-flow';
