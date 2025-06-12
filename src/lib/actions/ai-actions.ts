
'use server';

import { suggestListingPrice, type SuggestListingPriceInput, type SuggestListingPriceOutput } from '@/ai/flows/suggest-listing-price';
import { suggestListingTitle, type SuggestListingTitleInput, type SuggestListingTitleOutput } from '@/ai/flows/suggest-listing-title';
import { generateLeaseTerms, type GenerateLeaseTermsInput, type GenerateLeaseTermsOutput } from '@/ai/flows/generate-lease-terms-flow';

export async function getSuggestedPriceAction(
  input: SuggestListingPriceInput
): Promise<{ data?: SuggestListingPriceOutput; error?: string }> {
  try {
    if (!input.location || !input.sizeSqft || !input.amenities) {
      return { error: "Location, size, and amenities are required for price suggestion." };
    }
    if (input.sizeSqft <= 0) {
      return { error: "Size must be a positive number."}
    }

    const result = await suggestListingPrice(input);
    return { data: result };
  } catch (error) {
    console.error("Error getting price suggestion:", error);
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: "An unknown error occurred while suggesting a price." };
  }
}

export async function getSuggestedTitleAction(
  input: SuggestListingTitleInput
): Promise<{ data?: SuggestListingTitleOutput; error?: string }> {
  try {
    if (!input.location || !input.keywords) {
      return { error: "Location and keywords are required for a title suggestion." };
    }
    // Optional: Add more specific validation for keywords length or content if needed.

    const result = await suggestListingTitle(input);
    return { data: result };
  } catch (error) {
    console.error("Error getting title suggestion:", error);
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: "An unknown error occurred while suggesting a title." };
  }
}

export async function getGeneratedLeaseTermsAction(
  input: GenerateLeaseTermsInput
): Promise<{ data?: GenerateLeaseTermsOutput; error?: string }> {
  try {
    // Basic validation
    if (!input.listingType || input.durationMonths <= 0 || input.monthlyPrice <= 0 || !input.landownerName || !input.renterName || !input.listingAddress) {
      return { error: "Missing required fields for lease term generation (type, duration, price, names, address)." };
    }
    
    const result = await generateLeaseTerms(input);
    return { data: result };
  } catch (error) {
    console.error("Error generating lease terms:", error);
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: "An unknown error occurred while generating lease terms." };
  }
}
