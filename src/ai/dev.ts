
import { config } from 'dotenv';
// Load environment variables from .env.local (especially GOOGLE_API_KEY or GEMINI_API_KEY for Genkit)
// This needs to be at the top to ensure process.env is populated before other imports might use them.
config();

// Verify if API key is loaded for local Genkit development
const geminiApiKey = process.env.GEMINI_API_KEY;
const googleApiKey = process.env.GOOGLE_API_KEY;

if (!geminiApiKey && !googleApiKey) {
  console.warn(
    'Genkit Dev Server: Neither GEMINI_API_KEY nor GOOGLE_API_KEY found in environment. ' +
    'Ensure one is set in your .env.local file for Google AI services to function with Genkit.'
  );
} else {
  const keyFound = geminiApiKey ? 'GEMINI_API_KEY' : 'GOOGLE_API_KEY';
  console.log(`Genkit Dev Server: API key found in environment variable ${keyFound}.`);
}


import '@/ai/flows/suggest-listing-price.ts';
import '@/ai/flows/suggest-listing-title.ts';
import '@/ai/flows/generate-lease-terms-flow.ts';
import '@/ai/flows/generate-listing-description-flow.ts';

