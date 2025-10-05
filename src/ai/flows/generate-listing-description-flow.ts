
'use server';
/**
 * @fileOverview AI agent to generate a compelling listing description.
 *
 * - generateListingDescription - A function that generates a listing description.
 * - GenerateListingDescriptionInput - The input type.
 * - GenerateListingDescriptionOutput - The return type.
 */

import {getAi} from '@/ai/genkit';
import {z} from 'genkit';
import type { GenerateListingDescriptionInput, GenerateListingDescriptionOutput } from '@/lib/types';

const GenerateListingDescriptionInputSchema = z.object({
  listingTitle: z.string().describe('The title of the land listing.'),
  location: z.string().describe('The general location (e.g., city, state) of the land.'),
  sizeSqft: z.number().positive().describe('The size of the land in square feet.'),
  amenities: z.array(z.string()).describe('A list of available amenities.'),
  pricingModel: z.enum(['nightly', 'monthly', 'lease-to-own']).describe('The pricing model for the listing.'),
  price: z.number().positive().describe('The price per night or per month, or estimated LTO payment.'),
  leaseTerm: z.enum(['short-term', 'long-term', 'flexible']).optional().nullable().describe('The preferred lease term if applicable.'),
  keywords: z.string().optional().describe('Optional comma-separated keywords to emphasize.')
});

const GenerateListingDescriptionOutputSchema = z.object({
  suggestedDescription: z.string().describe('The AI-generated listing description. It should be engaging, informative, and highlight key features based on the input. Aim for 2-4 paragraphs.'),
});


export async function generateListingDescription(input: GenerateListingDescriptionInput): Promise<GenerateListingDescriptionOutput> {
  const ai = getAi();
  const prompt = ai.definePrompt({
    name: 'generateListingDescriptionPrompt',
    input: {schema: GenerateListingDescriptionInputSchema},
    output: {schema: GenerateListingDescriptionOutputSchema},
    prompt: `You are an expert real estate copywriter specializing in crafting compelling and informative descriptions for land rentals and lease-to-own properties.
Your goal is to help landowners attract potential renters or buyers by highlighting the unique features and benefits of their land.

Based on the following details, generate an engaging and descriptive text (2-4 well-structured paragraphs) for a land listing.

**Listing Details:**
- **Title:** {{{listingTitle}}}
- **Location:** {{{location}}}
- **Size:** {{{sizeSqft}}} sq ft
- **Amenities:** {{#if amenities}}{{#each amenities}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{else}}Raw land{{/if}}
- **Pricing Model:** {{{pricingModel}}}
- **Price:** \${{{price}}} per {{#if (eq pricingModel "nightly")}}night{{else}}month{{/if}}
{{#if leaseTerm}}- **Preferred Lease Term:** {{{leaseTerm}}}{{/if}}
{{#if keywords}}- **Keywords to Emphasize:** {{{keywords}}}{{/if}}

**Instructions for the description:**
1.  **Opening Hook:** Start with an inviting sentence that paints a picture of the experience (e.g., "Escape to your private sanctuary...", "Discover the perfect foundation for your tiny home...").
2.  **Elaborate on Features:**
    -   Mention the **size** and connect it to potential uses. For nightly rentals, this could be for RVs or camping. For monthly, it's ideal for tiny homes, gardening, or storage. For lease-to-own, emphasize the potential for building a future.
    -   Weave in the **amenities** naturally. Instead of just listing them, describe their benefit (e.g., "with power and water hookups ready to go," "enjoy easy access via the well-maintained road."). If no amenities are listed, frame it positively (e.g., "a blank canvas for your off-grid project," "unspoiled natural beauty and ultimate privacy.").
    -   Subtly highlight the **pricing model**. For lease-to-own, mention the unique "opportunity for long-term settlement" or "pathway to ownership."
3.  **Structure & Tone:**
    -   Use clear, concise language. Break up text into readable paragraphs.
    -   Maintain a positive, professional, and inviting tone.
    -   **Do not** make guarantees about zoning or what's legally permissible unless explicitly stated in the keywords (e.g., "Zoned for residential use"). Focus on the physical attributes and potential.
    -   **Do not** include a call to action like "Book now!" or "Contact us for a tour!". The goal is the descriptive text only.
`,
  });

  const generateListingDescriptionFlow = ai.defineFlow(
    {
      name: 'generateListingDescriptionFlow',
      inputSchema: GenerateListingDescriptionInputSchema,
      outputSchema: GenerateListingDescriptionOutputSchema,
    },
    async (input) => {
      const {output} = await prompt(input);
      if (!output) {
          throw new Error("The AI failed to generate a listing description.");
      }
      return output;
    }
  );

  return generateListingDescriptionFlow(input);
}
