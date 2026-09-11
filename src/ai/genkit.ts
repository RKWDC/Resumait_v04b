// MODEL LOCK: googleai/gemini-3.8-flash — DO NOT CHANGE
// This is the only supported model in this Firebase Studio project.
// The model is configured once here and inherited by all ai.generate()
// calls in all flow files. Never pass a model parameter in any
// individual ai.generate() call.

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [
    googleAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY })
  ],
  model: 'googleai/gemini-3.8-flash',
});

export const DEFAULT_MAX_OUTPUT_TOKENS = 8192;
