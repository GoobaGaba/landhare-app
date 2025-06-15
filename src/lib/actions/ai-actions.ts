
'use server';

import { suggestListingPrice, type SuggestListingPriceInput, type SuggestListingPriceOutput } from '@/ai/flows/suggest-listing-price';
import { suggestListingTitle, type SuggestListingTitleInput, type SuggestListingTitleOutput } from '@/ai/flows/suggest-listing-title';
import { generateLeaseTerms, type GenerateLeaseTermsInput, type GenerateLeaseTermsOutput } from '@/ai/flows/generate-lease-terms-flow';
import { generateListingDescription, type GenerateListingDescriptionInput, type GenerateListingDescriptionOutput } from '@/ai/flows/generate-listing-description-flow';

export async function getSuggestedPriceAction(
  input: SuggestListingPriceInput
): Promise<{ data?: SuggestListingPriceOutput; error?: string }> {
  try {
    if (!input.location || input.location.trim() === "") {
      return { error: "Location is required for price suggestion." };
    }
    if (!input.sizeSqft || input.sizeSqft <= 0) {
      return { error: "A valid positive size (sq ft) is required."};
    }
    // Amenities can be an empty string if none are provided, which is fine.

    const result = await suggestListingPrice(input);
    return { data: result };
  } catch (error) {
    console.error("Error getting price suggestion:", error);
    if (error instanceof Error) {
      return { error: `AI Price Suggestion Failed: ${error.message}` };
    }
    return { error: "An unknown error occurred while suggesting a price." };
  }
}

export async function getSuggestedTitleAction(
  input: SuggestListingTitleInput
): Promise<{ data?: SuggestListingTitleOutput; error?: string }> {
  try {
    if (!input.location || input.location.trim() === "") {
      return { error: "Location is required for a title suggestion." };
    }
    if (!input.keywords || input.keywords.trim() === "") {
        return { error: "Keywords are required for a title suggestion." };
    }

    const result = await suggestListingTitle(input);
    return { data: result };
  } catch (error) {
    console.error("Error getting title suggestion:", error);
    if (error instanceof Error) {
       return { error: `AI Title Suggestion Failed: ${error.message}` };
    }
    return { error: "An unknown error occurred while suggesting a title." };
  }
}

export async function getGeneratedLeaseTermsAction(
  input: GenerateLeaseTermsInput
): Promise<{ data?: GenerateLeaseTermsOutput; error?: string }> {
  try {
    if (!input.listingType || input.listingType.trim() === "") return { error: "Listing type is required." };
    if (!input.durationDescription || input.durationDescription.trim() === "") return { error: "Duration description is required." };
    if (!input.pricePerMonthEquivalent || input.pricePerMonthEquivalent <= 0) return { error: "A valid positive price is required." };
    if (!input.landownerName || input.landownerName.trim() === "") return { error: "Landowner name is required." };
    if (!input.renterName || input.renterName.trim() === "") return { error: "Renter name is required." };
    if (!input.listingAddress || input.listingAddress.trim() === "") return { error: "Listing address is required." };


    const result = await generateLeaseTerms(input);
    return { data: result };
  } catch (error) {
    console.error("Error generating lease terms:", error);
    if (error instanceof Error) {
       return { error: `AI Lease Generation Failed: ${error.message}` };
    }
    return { error: "An unknown error occurred while generating lease terms." };
  }
}

export async function getGeneratedDescriptionAction(
  input: GenerateListingDescriptionInput
): Promise<{ data?: GenerateListingDescriptionOutput; error?: string }> {
  try {
    if (!input.listingTitle || input.listingTitle.trim() === "") return { error: "Listing title is required." };
    if (!input.location || input.location.trim() === "") return { error: "Location is required." };
    if (!input.sizeSqft || input.sizeSqft <= 0) return { error: "A valid positive size (sq ft) is required." };
    if (!input.pricingModel) return { error: "Pricing model is required."};
    if (!input.price || input.price <=0) return {error: "A valid positive price is required."};
    
    const result = await generateListingDescription(input);
    return { data: result };
  } catch (error) {
    console.error("Error generating listing description:", error);
    if (error instanceof Error) {
      return { error: `AI Description Generation Failed: ${error.message}` };
    }
    return { error: "An unknown error occurred while generating a listing description." };
  }
}
