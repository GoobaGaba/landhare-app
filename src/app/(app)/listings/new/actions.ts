
'use server';

import { z } from 'zod';
import type { Listing, LeaseTerm, User } from '@/lib/types';
import { addListing as dbAddListing, getUserById, getListingsByLandownerCount, FREE_TIER_LISTING_LIMIT } from '@/lib/mock-data'; // Now uses Firestore

const ListingFormSchema = z.object({
  title: z.string({ required_error: "Title is required." }).min(3, "Title must be at least 3 characters"),
  description: z.string({ required_error: "Description is required." }).min(10, "Description must be at least 10 characters"),
  location: z.string({ required_error: "Location is required." }).min(3, "Location is required"),
  sizeSqft: z.coerce.number({ invalid_type_error: "Size must be a number.", required_error: "Size is required." }).positive("Size must be a positive number"),
  price: z.coerce.number({ invalid_type_error: "Price must be a number.", required_error: "Price is required." }).positive("Price must be a positive number"),
  pricingModel: z.enum(['nightly', 'monthly', 'lease-to-own'], { required_error: "Please select a pricing model."}),
  leaseToOwnDetails: z.string().optional(),
  amenities: z.array(z.string()).optional().default([]),
  images: z.array(z.string().url("Each image must be a valid URL.")).optional().default([]),
  leaseTerm: z.enum(['short-term', 'long-term', 'flexible']).optional(),
  minLeaseDurationMonths: z.coerce.number().int().positive().optional().nullable(),
  landownerId: z.coerce.string({required_error: "Landowner ID is required."}).min(1, "Landowner ID is required and cannot be empty"),
});

export type ListingFormState = {
  message: string;
  errors?: {
    title?: string[];
    description?: string[];
    location?: string[];
    sizeSqft?: string[];
    price?: string[];
    pricingModel?: string[];
    leaseToOwnDetails?: string[];
    amenities?: string[];
    images?: string[];
    leaseTerm?: string[];
    minLeaseDurationMonths?: string[];
    landownerId?: string[];
  };
  listingId?: string;
  success: boolean;
};

export async function createListingAction(
  prevState: ListingFormState,
  formData: FormData
): Promise<ListingFormState> {

  const rawFormData = {
    title: formData.get('title'),
    description: formData.get('description'),
    location: formData.get('location'),
    sizeSqft: formData.get('sizeSqft'),
    price: formData.get('price'),
    pricingModel: formData.get('pricingModel'),
    leaseToOwnDetails: formData.get('leaseToOwnDetails') || undefined,
    amenities: formData.getAll('amenities').map(String).filter(a => a),
    images: formData.getAll('images').map(String).filter(url => url),
    leaseTerm: formData.get('leaseTerm') || undefined,
    minLeaseDurationMonths: formData.get('minLeaseDurationMonths') ? Number(formData.get('minLeaseDurationMonths')) : undefined,
    landownerId: formData.get('landownerId'),
  };

  const validatedFields = ListingFormSchema.safeParse(rawFormData);

  if (!validatedFields.success) {
    console.log("Server validation errors:", validatedFields.error.flatten().fieldErrors);
    return {
      message: "Validation failed. Please check your input.",
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }

  const currentUserId = validatedFields.data.landownerId;

  // This check is an extra layer, Zod validation should catch empty/null landownerId already
  if (!currentUserId || currentUserId.trim() === '') {
    return {
      message: "Authentication error: Could not determine landowner. Landowner ID is invalid or missing after validation.",
      success: false,
    };
  }

  let landownerProfile: User | undefined;
  try {
    landownerProfile = await getUserById(currentUserId);
  } catch (e) {
    console.error("Failed to fetch landowner profile:", e);
    return { message: "Could not verify landowner status.", success: false };
  }

  const isPremiumUser = landownerProfile?.subscriptionStatus === 'premium';

  if (!isPremiumUser) {
    try {
      const listingsCount = await getListingsByLandownerCount(currentUserId);
      if (listingsCount >= FREE_TIER_LISTING_LIMIT) {
        return {
          message: `Free accounts can only create ${FREE_TIER_LISTING_LIMIT} listing(s). Upgrade to Premium for unlimited listings.`,
          success: false,
        };
      }
    } catch (e) {
      console.error("Failed to check listing count:", e);
      return { message: "Could not verify your current listing count.", success: false };
    }
  }

  try {
    const newListingPayload: Pick<Listing, 'title' | 'description' | 'location' | 'sizeSqft' | 'price' | 'pricingModel' | 'leaseToOwnDetails' | 'amenities' | 'images' | 'leaseTerm' | 'minLeaseDurationMonths'> = {
        title: validatedFields.data.title,
        description: validatedFields.data.description,
        location: validatedFields.data.location,
        sizeSqft: validatedFields.data.sizeSqft,
        price: validatedFields.data.price,
        pricingModel: validatedFields.data.pricingModel as Listing['pricingModel'],
        leaseToOwnDetails: validatedFields.data.leaseToOwnDetails,
        amenities: validatedFields.data.amenities || [],
        images: validatedFields.data.images || [],
        leaseTerm: validatedFields.data.leaseTerm as LeaseTerm | undefined,
        minLeaseDurationMonths: validatedFields.data.minLeaseDurationMonths ?? undefined,
    };

    const newListing = await dbAddListing(newListingPayload, currentUserId, isPremiumUser);

    return {
      message: `Listing "${newListing.title}" created successfully!`,
      listingId: newListing.id,
      success: true,
    };
  } catch (error) {
    console.error("Error in createListingAction:", error);
    return {
      message: (error instanceof Error) ? error.message : "An unexpected error occurred while creating the listing.",
      success: false,
    };
  }
}
