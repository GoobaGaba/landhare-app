
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Attempt to retrieve the API key from environment variables.
// Genkit docs prefer GEMINI_API_KEY for this specific plugin.
const geminiApiKey = process.env.GEMINI_API_KEY;

let apiKeyToUse: string | undefined = geminiApiKey;

const googleAIPluginConfig = apiKeyToUse ? { apiKey: apiKeyToUse } : undefined;

if (!apiKeyToUse || apiKeyToUse.includes("...")) {
  const message = 
    "CRITICAL: Genkit googleAI plugin API key is missing or is a placeholder. " +
    "Please set GEMINI_API_KEY in your environment variables.\n" +
    "For local development, add it to your .env.local file in the project root.\n" +
    "Example: GEMINI_API_KEY=AIzaYourActualKey...\n" +
    "For production (Firebase App Hosting), add it to your backend's environment variable configuration.\n" +
    "See https://genkit.dev/docs/plugins/google-genai for more details.";
  
  if (process.env.NODE_ENV === 'production') {
    console.error(message);
    // In production, you might want to throw an error or prevent Genkit initialization
    // if the key is absolutely required for the app to function.
    // For now, we'll let it initialize, but AI features will fail.
  } else {
    // In development, a console warning is usually sufficient to alert the developer.
    console.warn(message);
  }
} else {
  // Optional: Log which key is being used for clarity during development/debugging
  // console.log(`Genkit googleAI plugin will use API key found in GEMINI_API_KEY.`);
}

export const ai = genkit({
  plugins: [
    googleAI(googleAIPluginConfig),
  ],
  model: 'googleai/gemini-2.0-flash', // Default model, can be overridden in specific flows
});
