
'use server';
/**
 * @fileOverview AI agent to generate suggested lease terms for a land rental.
 *
 * - generateLeaseTerms - A function that generates lease terms.
 * - GenerateLeaseTermsInput - The input type for the generateLeaseTerms function.
 * - GenerateLeaseTermsOutput - The return type for the generateLeaseTerms function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateLeaseTermsInputSchema = z.object({
  listingType: z.string().describe('The type of land being leased (e.g., "RV Pad", "Tiny Home Lot", "Agricultural Land", "General Use Plot").'),
  durationMonths: z.number().positive().describe('The duration of the lease in months.'),
  monthlyPrice: z.number().positive().describe('The agreed monthly rental price in USD.'),
  landownerName: z.string().describe('The full name of the landowner.'),
  renterName: z.string().describe('The full name of the renter.'),
  listingAddress: z.string().describe('The full address or specific location description of the land being leased.'),
  additionalRules: z.string().optional().describe('Any specific additional rules or conditions the landowner wants to include, comma-separated (e.g., "no loud music after 10 PM, pets must be leashed").')
});
export type GenerateLeaseTermsInput = z.infer<typeof GenerateLeaseTermsInputSchema>;

const GenerateLeaseTermsOutputSchema = z.object({
  leaseAgreementText: z.string().describe('A comprehensive suggested lease agreement text. This should be a structured document including standard clauses like parties, property description, term, rent, use of premises, maintenance, default, governing law, etc. It should incorporate the specific details provided in the input. This text is a suggestion and should be reviewed by legal counsel.'),
  summaryPoints: z.array(z.string()).describe('A few key bullet points summarizing the most important terms of the lease (e.g., "Lease Duration: X months", "Monthly Rent: $Y", "Primary Use: Z").')
});
export type GenerateLeaseTermsOutput = z.infer<typeof GenerateLeaseTermsOutputSchema>;

export async function generateLeaseTerms(input: GenerateLeaseTermsInput): Promise<GenerateLeaseTermsOutput> {
  return generateLeaseTermsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateLeaseTermsPrompt',
  input: {schema: GenerateLeaseTermsInputSchema},
  output: {schema: GenerateLeaseTermsOutputSchema},
  prompt: `You are an AI assistant helping to draft a simple lease agreement for a land rental.
This is for informational purposes and should be reviewed by legal counsel.
Do not include signature lines or overly complex legal jargon unless essential for clarity.
Focus on creating a fair and clear set of terms based on the provided information.

Lease Details:
Landowner: {{{landownerName}}}
Renter: {{{renterName}}}
Property Type/Use: {{{listingType}}}
Property Location: {{{listingAddress}}}
Lease Duration: {{{durationMonths}}} months
Monthly Rent: \${{{monthlyPrice}}}

{{#if additionalRules}}
Specific Additional Rules from Landowner:
{{{additionalRules}}}
{{/if}}

Generate a suggested lease agreement text covering standard clauses:
1.  Parties: Clearly state Landowner and Renter names.
2.  Property: Describe the property being leased (type and location).
3.  Term: State the lease duration in months and start/end dates (assume start is "Effective Date of Agreement").
4.  Rent: Specify the monthly rent amount, due date (e.g., 1st of each month), and acceptable payment methods (suggest "mutually agreed method").
5.  Use of Premises: Define the allowed use (based on listingType).
6.  Condition of Premises: Renter accepts property "as-is".
7.  Maintenance & Repairs: Typically Renter's responsibility for their structures/belongings; Landowner for general land upkeep unless specified.
8.  Utilities: Clarify responsibility (e.g., "Renter responsible for utilities they connect/use").
9.  Access: Landowner right to access with reasonable notice.
10. Default: Briefly outline consequences of non-payment or breach.
11. {{#if additionalRules}}Landowner's Additional Rules: Incorporate these clearly.{{/if}}
12. Governing Law: State "This agreement shall be governed by the laws of the jurisdiction where the property is located."
13. Entire Agreement: This document constitutes the entire agreement.

Also, provide a short list of key summary points.
The leaseAgreementText should be formatted with clear headings for each section.
Example for a clause:
"**5. Use of Premises**
The Renter shall use the Property solely for the purpose of [{{{listingType}}}] and for no other purpose without the prior written consent of the Landowner."
`,
});

const generateLeaseTermsFlow = ai.defineFlow(
  {
    name: 'generateLeaseTermsFlow',
    inputSchema: GenerateLeaseTermsInputSchema,
    outputSchema: GenerateLeaseTermsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
        throw new Error("The AI failed to generate lease terms based on the provided input.");
    }
    // Ensure the output conforms, even if simple.
    return {
        leaseAgreementText: output.leaseAgreementText || "Error generating lease text.",
        summaryPoints: output.summaryPoints || ["Error generating summary."],
    };
  }
);
