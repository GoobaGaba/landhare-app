
import { config } from 'dotenv';
// Load environment variables from .env.local (especially GOOGLE_API_KEY or GEMINI_API_KEY for Genkit)
// This needs to be at the top to ensure process.env is populated before other imports might use them.
const dotenvResult = config({ path: './.env.local' });

if (dotenvResult.error) {
  console.warn('Genkit Dev Server: Could not load .env.local file:', dotenvResult.error.message);
  console.warn('Genkit Dev Server: Please ensure a .env.local file exists in the project root (`/home/user/studio/`) if you are defining API keys there.');
} else {
  console.log('Genkit Dev Server: .env.local file loaded (if present).');
}

// Verify if API key is loaded for local Genkit development
const geminiApiKey = process.env.GEMINI_API_KEY;

console.log(`Genkit Dev Server - Checking for API Keys:`);
console.log(`  process.env.GEMINI_API_KEY: ${geminiApiKey ? geminiApiKey.substring(0,4) + '...' : 'NOT FOUND'}`);

if (!geminiApiKey || geminiApiKey.includes("...")) {
  console.error(
    'CRITICAL Genkit Dev Server Error: GEMINI_API_KEY is not set or is a placeholder in the environment. \n' +
    'AI features will not work. \n' +
    '1. Ensure a file named exactly `.env.local` exists in your project root (`/home/user/studio/`).\n' +
    '2. Inside `.env.local`, add a line like: `GEMINI_API_KEY=YOUR_ACTUAL_API_KEY`.\n' +
    '3. Replace `YOUR_ACTUAL_API_KEY` with the real key.\n' +
    '4. Save the file and restart this Genkit server (`npm run genkit:dev`).'
  );
} else {
  console.log(`Genkit Dev Server: API key found in environment variable 'GEMINI_API_KEY'. Genkit should now be able to authenticate AI calls.`);
}

// Import flows AFTER dotenv has been configured and keys checked,
// as flows will import genkit.ts which initializes the AI plugin.
import '@/ai/flows/suggest-listing-price.ts';
import '@/ai/flows/suggest-listing-title.ts';
import '@/ai/flows/generate-lease-terms-flow.ts';
import '@/ai/flows/generate-listing-description-flow.ts';

// The Genkit start command typically doesn't need more than this.
// The actual 'start' logic is handled by the `genkit start` command itself.
// This file ensures your flows are registered.
