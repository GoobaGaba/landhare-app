'use server';

import { suggestListingPrice, type SuggestListingPriceInput, type SuggestListingPriceOutput } from '@/ai/flows/suggest-listing-price';

export async function getSuggestedPriceAction(
  input: SuggestListingPriceInput
): Promise<{ data?: SuggestListingPriceOutput; error?: string }> {
  try {
    // Basic validation (could be more robust with Zod on the server action input itself)
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
