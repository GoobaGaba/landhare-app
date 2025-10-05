
import {genkit, Genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

let ai: Genkit | null = null;

// This function provides a "lazy" initialization of the Genkit AI instance.
// It ensures that the AI plugin and its environment variable dependencies
// are only loaded when an AI feature is actually called, not during the
// build process. This is crucial for CI/CD environments where runtime
// secrets are not available at build time.
export function getAi(): Genkit {
  if (ai) {
    return ai;
  }

  // Attempt to retrieve the API key from environment variables.
  const geminiApiKey = process.env.GEMINI_API_KEY;

  let apiKeyToUse: string | undefined = geminiApiKey;

  if (!apiKeyToUse || apiKeyToUse.includes("...") || apiKeyToUse.length < 20) {
    const message = 
      "CRITICAL: Genkit googleAI plugin API key is missing, a placeholder, or too short. " +
      "AI features will likely fail.\n" +
      "1. For local development, ensure GEMINI_API_KEY is correctly set in your .env.local file in the project root.\n" +
      "2. For production on Firebase App Hosting, ensure you have set GEMINI_API_KEY as a secret/environment variable for the backend.";
    
    console.error(message);
    apiKeyToUse = undefined;

  } else {
    console.log(`Genkit googleAI plugin will use the API key found in the GEMINI_API_KEY environment variable.`);
  }

  const googleAIPluginConfig = apiKeyToUse ? { apiKey: apiKeyToUse } : undefined;

  ai = genkit({
    plugins: [
      googleAI(googleAIPluginConfig),
    ],
    model: 'googleai/gemini-1.5-flash-latest', 
  });

  return ai;
}
