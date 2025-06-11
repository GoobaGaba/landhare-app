'use server';

/**
 * @fileOverview AI agent to suggest a competitive price for a land listing.
 *
 * - suggestListingPrice - A function that suggests a listing price.
 * - SuggestListingPriceInput - The input type for the suggestListingPrice function.
 * - SuggestListingPriceOutput - The return type for the suggestListingPrice function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestListingPriceInputSchema = z.object({
  location: z.string().describe('The location of the land listing.'),
  sizeSqft: z.number().describe('The size of the land in square feet.'),
  amenities: z.string().describe('A comma-separated list of amenities available on the land.'),
});
export type SuggestListingPriceInput = z.infer<typeof SuggestListingPriceInputSchema>;

const SuggestListingPriceOutputSchema = z.object({
  suggestedPrice: z.number().describe('The suggested price for the land listing.'),
  reasoning: z.string().describe('The reasoning behind the suggested price.'),
});
export type SuggestListingPriceOutput = z.infer<typeof SuggestListingPriceOutputSchema>;

export async function suggestListingPrice(input: SuggestListingPriceInput): Promise<SuggestListingPriceOutput> {
  return suggestListingPriceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestListingPricePrompt',
  input: {schema: SuggestListingPriceInputSchema},
  output: {schema: SuggestListingPriceOutputSchema},
  prompt: `You are an AI assistant helping landowners determine a competitive price for their land listing.

  Given the following information about the land listing, suggest a price that will maximize earnings and attract potential renters.

  Location: {{{location}}}
  Size (sq ft): {{{sizeSqft}}}
  Amenities: {{{amenities}}}

  Consider recent comparable listings and local market trends when determining the price.
  Provide a brief reasoning for your suggested price.
  `,
});

const suggestListingPriceFlow = ai.defineFlow(
  {
    name: 'suggestListingPriceFlow',
    inputSchema: SuggestListingPriceInputSchema,
    outputSchema: SuggestListingPriceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
