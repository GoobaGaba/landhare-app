
'use server';

import { suggestListingPrice, type SuggestListingPriceInput, type SuggestListingPriceOutput } from '@/ai/flows/suggest-listing-price';
import { suggestListingTitle, type SuggestListingTitleInput, type SuggestListingTitleOutput } from '@/ai/flows/suggest-listing-title';
import { generateLeaseTerms, type GenerateLeaseTermsInput, type GenerateLeaseTermsOutput } from '@/ai/flows/generate-lease-terms-flow';
import { generateListingDescription, type GenerateListingDescriptionInput, type GenerateListingDescriptionOutput } from '@/ai/flows/generate-listing-description-flow';

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
    if (!input.listingType || !input.durationDescription || input.pricePerMonthEquivalent <= 0 || !input.landownerName || !input.renterName || !input.listingAddress) {
      return { error: "Missing required fields for lease term generation (type, duration description, price, names, address)." };
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

export async function getGeneratedDescriptionAction(
  input: GenerateListingDescriptionInput
): Promise<{ data?: GenerateListingDescriptionOutput; error?: string }> {
  try {
    if (!input.listingTitle || !input.location || !input.sizeSqft || input.sizeSqft <= 0 || !input.pricingModel || input.price <= 0) {
      return { error: "Title, location, size, pricing model, and price are required for description generation." };
    }
    const result = await generateListingDescription(input);
    return { data: result };
  } catch (error) {
    console.error("Error generating listing description:", error);
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: "An unknown error occurred while generating a listing description." };
  }
}
