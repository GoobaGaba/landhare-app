
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
  listingType: z.string().describe('The type of land being leased (e.g., "RV Pad for Lakeside Camping", "Tiny Home Lot - Forest Retreat", "Agricultural Land - 10 Acres", "General Use Plot - Urban Garden"). Be specific if possible.'),
  durationDescription: z.string().describe('A textual description of the lease duration (e.g., "3 months", "14 days (approx 0.46 months)", "1 year", "5 days nightly rental"). This helps the AI formulate the term clause accurately.'),
  pricePerMonthEquivalent: z.number().positive().describe('The agreed monthly rental price in USD. If the original booking was nightly or for a shorter term, this should be the total price for that specific term, clearly noting the duration in durationDescription.'),
  landownerName: z.string().describe('The full name of the landowner.'),
  renterName: z.string().describe('The full name of the renter.'),
  listingAddress: z.string().describe('The full address or specific location description of the land being leased.'),
  additionalRules: z.string().optional().describe('Any specific additional rules or conditions the landowner wants to include, comma-separated (e.g., "no loud music after 10 PM, pets must be leashed, no permanent structures without written consent").')
});
export type GenerateLeaseTermsInput = z.infer<typeof GenerateLeaseTermsInputSchema>;

const GenerateLeaseTermsOutputSchema = z.object({
  leaseAgreementText: z.string().describe('A comprehensive suggested lease agreement text. This should be a structured document including standard clauses like parties, property description, term, rent, use of premises, maintenance, default, governing law, etc. It should incorporate the specific details provided in the input. This text is a DRAFT suggestion and should be reviewed by legal counsel and checked against local regulations.'),
  summaryPoints: z.array(z.string()).describe('A few key bullet points summarizing the most important terms of the lease (e.g., "Lease Duration: As per durationDescription", "Total Rent for Term: $Y", "Primary Use: Z").')
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
**IMPORTANT: This is a DRAFT agreement for informational purposes ONLY.**
**It is CRUCIAL to have this document reviewed by legal counsel before use.**
**Ensure all terms comply with local and state laws, including any applicable zoning regulations for the specified listingType and listingAddress.**
Do not include signature lines or overly complex legal jargon unless essential for clarity.
Focus on creating a fair and clear set of terms based on the provided information.

Lease Details:
Landowner: {{{landownerName}}}
Renter: {{{renterName}}}
Property Type/Use: {{{listingType}}} (Specify permitted use based on this type)
Property Location: {{{listingAddress}}}
Lease Duration: {{{durationDescription}}}
Rent: \${{{pricePerMonthEquivalent}}} (This is the rent for the specified '{{{durationDescription}}}'. If duration is monthly, this is the monthly rent. If duration is for a specific number of days/weeks, this is the total rent for that period.)

{{#if additionalRules}}
Specific Additional Rules from Landowner:
{{{additionalRules}}}
{{/if}}

Generate a suggested lease agreement text covering standard clauses:
1.  **Parties**: Clearly state Landowner and Renter names.
2.  **Property**: Describe the property being leased (type as {{{listingType}}} and location as {{{listingAddress}}}).
3.  **Term**: State the lease duration precisely using the '{{{durationDescription}}}'. Assume the start date is "Effective Date of Agreement" or "Agreed Start Date".
4.  **Rent**: Specify the rent amount (Total: \${{{pricePerMonthEquivalent}}} for the full '{{{durationDescription}}}'). If '{{{durationDescription}}}' indicates a monthly term, state this as the monthly rent and specify the due date (e.g., 1st of each month). For shorter terms, state the total payment due and when (e.g., "in full prior to commencement"). Suggest "mutually agreed method" for payment.
5.  **Use of Premises**: Define the allowed use clearly based on '{{{listingType}}}'. State that no other use is permitted without prior written consent. Include any specific restrictions from '{{{additionalRules}}}' here if relevant to use.
6.  **Condition of Premises**: Renter accepts property "as-is".
7.  **Maintenance & Repairs**: Typically Renter's responsibility for their structures/belongings and any damage they cause beyond normal wear and tear; Landowner for general land upkeep unless specified. Consider specific rules provided in '{{{additionalRules}}}'.
8.  **Utilities**: Clarify responsibility (e.g., "Renter responsible for any utilities they connect/use such as water, power, septic hookups if available and agreed upon").
9.  **Access**: Landowner right to access with reasonable notice for inspection or necessary maintenance.
10. **Default**: Briefly outline consequences of non-payment or breach of terms.
11. {{#if additionalRules}}**Landowner's Additional Rules**: Incorporate these clearly and logically within appropriate sections or as a separate "Additional Rules" section.{{/if}}
12. **Governing Law**: State "This agreement shall be governed by the laws of the jurisdiction where the property is located."
13. **Entire Agreement**: This document constitutes the entire agreement.
14. **Disclaimer**: Reiterate that this is a template, legal review is advised, and all local/state laws (including zoning for the {{{listingType}}} at {{{listingAddress}}}) must be checked and complied with by both parties.

Also, provide a short list of key summary points reflecting the actual term and payment.
The leaseAgreementText should be formatted with clear headings for each section (e.g., using markdown bold for headings).
Example for a clause:
"**5. Use of Premises**
The Renter shall use the Property solely for the purpose of [e.g., 'placement and use of a tiny home for residential purposes' or 'short-term RV parking and camping' - be specific based on {{{listingType}}}] and for no other purpose without the prior written consent of the Landowner."
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
    if (!output || !output.leaseAgreementText || output.summaryPoints.length === 0) {
        // Fallback or more specific error based on what's missing
        let errorMsg = "The AI failed to generate complete lease terms. ";
        if (!output) errorMsg += "No output received. ";
        if (output && !output.leaseAgreementText) errorMsg += "Lease agreement text is missing. ";
        if (output && output.summaryPoints?.length === 0) errorMsg += "Summary points are missing. ";
        console.error("AI Lease Generation Error:", errorMsg, "Input:", input);
        // Consider throwing, or returning a structured error that the client can display.
        // For now, returning fallback text.
        return {
            leaseAgreementText: output?.leaseAgreementText || "Error: Could not generate lease agreement text. Please check inputs and try again. This is a template and requires legal review.",
            summaryPoints: output?.summaryPoints?.length > 0 ? output.summaryPoints : ["Error: Could not generate summary points. Legal review of any terms is essential."],
        };
    }
    return output; // Output should now conform to the schema or the above check would catch it.
  }
);

