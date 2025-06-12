
'use server';

import { suggestListingPrice, type SuggestListingPriceInput, type SuggestListingPriceOutput } from '@/ai/flows/suggest-listing-price';
import { suggestListingTitle, type SuggestListingTitleInput, type SuggestListingTitleOutput } from '@/ai/flows/suggest-listing-title';

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
