
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Retrieve the API key from environment variables.
// The GOOGLE_API_KEY environment variable should be set in your .env.local file for local development
// and in your Firebase App Hosting backend configuration for the live environment.
const googleApiKey = process.env.GOOGLE_API_KEY;

if (!googleApiKey && process.env.NODE_ENV !== 'production') {
  console.warn(
    "GOOGLE_API_KEY is not set in the environment. Genkit's Google AI plugin might not function correctly locally. " +
    "Please set it in your .env.local file."
  );
}
if (!googleApiKey && process.env.NODE_ENV === 'production') {
  console.error(
    "CRITICAL: GOOGLE_API_KEY is not set in the production environment. Genkit's Google AI plugin will likely fail. " +
    "Please set it in your Firebase App Hosting backend environment variables."
  );
}

export const ai = genkit({
  plugins: [
    googleAI(googleApiKey ? { apiKey: googleApiKey } : undefined),
  ],
  model: 'googleai/gemini-2.0-flash', // Default model, can be overridden in specific flows
});
