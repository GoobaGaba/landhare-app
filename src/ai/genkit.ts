
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Attempt to retrieve the API key from environment variables.
// Genkit docs prefer GEMINI_API_KEY for this specific plugin.
const geminiApiKey = process.env.GEMINI_API_KEY;

let apiKeyToUse: string | undefined = geminiApiKey;

// This improved check provides clearer server-side and client-side warnings.
if (!apiKeyToUse || apiKeyToUse.includes("...") || apiKeyToUse.length < 20) {
  const message = 
    "CRITICAL: Genkit googleAI plugin API key is missing, a placeholder, or too short. " +
    "AI features will likely fail.\n" +
    "1. For local development, ensure GEMINI_API_KEY is correctly set in your .env.local file in the project root.\n" +
    "   Example: GEMINI_API_KEY=AIzaYourActualKey...\n" +
    "2. For production on Firebase App Hosting, ensure you have set GEMINI_API_KEY as a secret/environment variable for the backend.\n" +
    "   A missing key in production is a common cause of 503 errors, as the server may fail to start.\n" +
    "3. See https://genkit.dev/docs/plugins/google-genai for more details.";
  
  // In any environment, this is a critical issue. We log it as an error.
  console.error(message);
  
  // Set apiKeyToUse to undefined to prevent the plugin from trying to initialize with a bad key.
  apiKeyToUse = undefined;

} else {
  // Optional: Log confirmation that a key was found, useful for debugging deployments.
  console.log(`Genkit googleAI plugin will use the API key found in the GEMINI_API_KEY environment variable.`);
}

// Pass a config object only if a valid key was found.
// If the key is undefined, the plugin may try to use Application Default Credentials, which is a valid server-side strategy.
const googleAIPluginConfig = apiKeyToUse ? { apiKey: apiKeyToUse } : undefined;


export const ai = genkit({
  plugins: [
    googleAI(googleAIPluginConfig),
  ],
  // NOTE: This default model can be overridden in specific flows for different tasks.
  // We use a robust and cost-effective model as the default.
  model: 'googleai/gemini-1.5-flash-latest', 
});
