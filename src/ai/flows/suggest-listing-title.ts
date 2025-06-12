
'use server';
/**
 * @fileOverview AI agent to suggest a catchy and effective title for a land listing.
 *
 * - suggestListingTitle - A function that suggests a listing title.
 * - SuggestListingTitleInput - The input type for the suggestListingTitle function.
 * - SuggestListingTitleOutput - The return type for the suggestListingTitle function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestListingTitleInputSchema = z.object({
  location: z.string().describe('The location of the land listing (e.g., city, state, general area).'),
  sizeSqft: z.number().optional().describe('The size of the land in square feet. Can be approximate.'),
  keywords: z.string().describe('A few key descriptive words or phrases about the land (e.g., "peaceful, near river, good for tiny home").'),
  existingDescription: z.string().optional().describe('A short snippet of the existing listing description, if available, to provide more context.')
});
export type SuggestListingTitleInput = z.infer<typeof SuggestListingTitleInputSchema>;

const SuggestListingTitleOutputSchema = z.object({
  suggestedTitle: z.string().describe('The AI-suggested title for the land listing. Should be concise and appealing.'),
  reasoning: z.string().describe('A brief explanation of why this title was suggested and how it highlights the key features or benefits.'),
});
export type SuggestListingTitleOutput = z.infer<typeof SuggestListingTitleOutputSchema>;

export async function suggestListingTitle(input: SuggestListingTitleInput): Promise<SuggestListingTitleOutput> {
  return suggestListingTitleFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestListingTitlePrompt',
  input: {schema: SuggestListingTitleInputSchema},
  output: {schema: SuggestListingTitleOutputSchema},
  prompt: `You are an expert copywriter specializing in creating compelling and concise titles for real estate and land listings.
Your goal is to help landowners attract potential renters with an engaging title.

Given the following information about a land listing, generate a catchy and descriptive title (ideally under 60 characters, but can be up to 80 if necessary).
Also provide a brief reasoning for your suggestion.

Land Listing Details:
Location: {{{location}}}
{{#if sizeSqft}}Size (sq ft): {{{sizeSqft}}}{{/if}}
Keywords/Features: {{{keywords}}}
{{#if existingDescription}}Description Snippet: {{{existingDescription}}}{{/if}}

Focus on highlighting unique selling points or the primary appeal of the land. Use strong, positive, and evocative language.
Avoid generic titles. Be creative but clear.
`,
});

const suggestListingTitleFlow = ai.defineFlow(
  {
    name: 'suggestListingTitleFlow',
    inputSchema: SuggestListingTitleInputSchema,
    outputSchema: SuggestListingTitleOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
