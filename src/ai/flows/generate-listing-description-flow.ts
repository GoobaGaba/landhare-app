
'use server';
/**
 * @fileOverview AI agent to generate a compelling listing description.
 *
 * - generateListingDescription - A function that generates a listing description.
 * - GenerateListingDescriptionInput - The input type.
 * - GenerateListingDescriptionOutput - The return type.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { GenerateListingDescriptionInput, GenerateListingDescriptionOutput } from '@/lib/types';

// Using types directly from lib/types.ts as Zod schemas are for flow/prompt definition.
// If direct Zod schema is needed for this flow itself, define it here.
// For now, we assume the input type from lib/types.ts is sufficient for the prompt.

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
  return generateListingDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateListingDescriptionPrompt',
  input: {schema: GenerateListingDescriptionInputSchema},
  output: {schema: GenerateListingDescriptionOutputSchema},
  prompt: `You are an expert real estate copywriter specializing in crafting compelling and informative descriptions for land rentals and lease-to-own properties.
Your goal is to help landowners attract potential renters or buyers by highlighting the unique features and benefits of their land.

Based on the following details, generate an engaging and descriptive text (2-4 paragraphs) for a land listing:

Listing Title: {{{listingTitle}}}
Location: {{{location}}}
Size: {{{sizeSqft}}} sq ft
Amenities: {{#if amenities}}{{#each amenities}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{else}}Not specified{{/if}}
Pricing Model: {{{pricingModel}}}
Price: \${{{price}}} per {{#if (eq pricingModel "nightly")}}night{{else}}month{{/if}}
{{#if leaseTerm}}Preferred Lease Term: {{{leaseTerm}}}{{/if}}
{{#if keywords}}Focus Keywords: {{{keywords}}}{{/if}}

Craft a description that:
- Is inviting and paints a picture of what it's like to use the land.
- Highlights key amenities and the benefits they offer.
- Mentions the size and potential uses relevant to the pricing model (e.g., for nightly rentals, good for RVs/camping; for monthly, good for tiny homes, gardens; for LTO, potential for building).
- If lease-to-own, subtly weave in the opportunity for long-term settlement or building a future.
- Is well-structured and easy to read.
- Avoids making guarantees about zoning or legal permissibility unless explicitly stated as a feature (e.g., "Zoned for residential"). Instead, focus on the physical attributes and potential.
- If no amenities are listed, acknowledge this and focus on the raw potential or privacy.
- Incorporate any focus keywords naturally.
- Do NOT include a call to action like "Book now!" or "Contact us!". Just provide the descriptive text.
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
