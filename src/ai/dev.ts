
import { config } from 'dotenv';
// Load environment variables from .env.local (especially GOOGLE_API_KEY for Genkit)
// This needs to be at the top to ensure process.env is populated before other imports might use them.
config();

// Verify if GOOGLE_API_KEY is loaded for local Genkit development
if (!process.env.GOOGLE_API_KEY) {
  console.warn(
    'GOOGLE_API_KEY not found in environment for Genkit dev server. ' +
    'Ensure it is set in your .env.local file if you are using a specific API key for Google AI services.'
  );
} else {
  // console.log('GOOGLE_API_KEY loaded successfully for Genkit dev server.'); // Optional: for debugging
}


import '@/ai/flows/suggest-listing-price.ts';
import '@/ai/flows/suggest-listing-title.ts';
import '@/ai/flows/generate-lease-terms-flow.ts';
import '@/ai/flows/generate-listing-description-flow.ts';
