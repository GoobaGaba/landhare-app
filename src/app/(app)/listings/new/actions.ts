
'use server';

// This file is now obsolete as the form submission logic has been moved
// to the client-side component in `listing-form.tsx`.
// It is safe to delete this file.

// The old server action code is kept here for reference but is no longer used.
/*
import { z } from 'zod';
import type { Listing, LeaseTerm, User } from '@/lib/types';
import { addListing as dbAddListing, getUserById, getListingsByLandownerCount, FREE_TIER_LISTING_LIMIT } from '@/lib/mock-data'; // Now uses Firestore
import { auth as firebaseAuthInstance } from '@/lib/firebase'; // Import auth instance

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
  landownerId: z.coerce.string({required_error: "Landowner ID is required and cannot be empty."}).min(1, "Landowner ID is required and cannot be empty"),
}).superRefine((data, ctx) => {
  if (data.pricingModel === 'lease-to-own' && (!data.leaseToOwnDetails || data.leaseToOwnDetails.trim().length < 10)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Lease-to-Own details are required and must be at least 10 characters if 'Lease-to-Own' is selected.",
      path: ['leaseToOwnDetails'],
    });
  }
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

  console.log("[createListingAction] Raw form data received:", rawFormData);

  const validatedFields = ListingFormSchema.safeParse(rawFormData);

  if (!validatedFields.success) {
    console.error("[createListingAction] Server validation failed:", validatedFields.error.flatten().fieldErrors);
    return {
      message: "Validation failed. Please check your input.",
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }

  const currentUserId = validatedFields.data.landownerId;
  console.log(`[createListingAction] Validated landownerId (currentUserId from form): ${currentUserId}`);
  
  const serverAuthUserUid = firebaseAuthInstance?.currentUser?.uid;
  console.log(`[createListingAction] Auth state in server action: firebaseAuthInstance.currentUser?.uid is '${serverAuthUserUid}'`);


  if (!currentUserId || currentUserId.trim() === '') {
    console.error("[createListingAction] Critical error: Landowner ID is invalid or missing AFTER validation.");
    return {
      message: "Critical error: Landowner ID missing. Please ensure you are logged in.",
      success: false,
    };
  }
  
  if (serverAuthUserUid === undefined) {
    console.warn("[createListingAction] The Firebase client SDK instance in this server action does not have an authenticated user. This will likely cause Firestore 'PERMISSION_DENIED' if rules require 'request.auth != null'.");
  } else if (serverAuthUserUid !== currentUserId) {
     console.warn(`[createListingAction] Mismatch: Server action auth UID ('${serverAuthUserUid}') does not match landownerId from form ('${currentUserId}'). This could lead to permission issues or incorrect data ownership.`);
  }


  let landownerProfile: User | undefined;
  try {
    console.log(`[createListingAction] Fetching landowner profile for ID: ${currentUserId}`);
    landownerProfile = await getUserById(currentUserId); // This will use Firestore if configured, or mock
    if (!landownerProfile) {
      console.warn(`[createListingAction] Landowner profile not found in DB for ID: ${currentUserId}. Ensure user profile exists.`);
    }
  } catch (e: any) {
    console.error("[createListingAction] Failed to fetch landowner profile:", e.message);
    return { message: `Could not verify landowner status: ${e.message}`, success: false };
  }

  const isPremiumUser = landownerProfile?.subscriptionStatus === 'premium';
  console.log(`[createListingAction] Landowner ID: ${currentUserId}, Determined Premium Status: ${isPremiumUser}`);


  if (!isPremiumUser) {
    try {
      const listingsCount = await getListingsByLandownerCount(currentUserId);
      console.log(`[createListingAction] Current listings count for user ${currentUserId}: ${listingsCount}`);
      if (listingsCount >= FREE_TIER_LISTING_LIMIT) {
        return {
          message: `Free accounts can only create ${FREE_TIER_LISTING_LIMIT} listing(s). Upgrade to Premium for unlimited listings.`,
          success: false,
        };
      }
    } catch (e: any) {
      console.error("[createListingAction] Failed to check listing count:", e.message);
      return { message: `Could not verify your current listing count: ${e.message}`, success: false };
    }
  }

  try {
    const { landownerId: _, ...listingDataForDb } = validatedFields.data;
    
    const newListingPayload: Pick<Listing, 'title' | 'description' | 'location' | 'sizeSqft' | 'price' | 'pricingModel' | 'leaseToOwnDetails' | 'amenities' | 'images' | 'leaseTerm' | 'minLeaseDurationMonths'> = {
        ...listingDataForDb,
        pricingModel: listingDataForDb.pricingModel as Listing['pricingModel'], 
        leaseTerm: listingDataForDb.leaseTerm as LeaseTerm | undefined,
        minLeaseDurationMonths: listingDataForDb.minLeaseDurationMonths ?? undefined, 
    };
    
    console.log(`[createListingAction] Calling dbAddListing with landownerId: ${currentUserId} and payload:`, newListingPayload);
    const newListing = await dbAddListing(newListingPayload, currentUserId, isPremiumUser);

    console.log(`[createListingAction] Listing "${newListing.title}" (ID: ${newListing.id}) created successfully by landowner ${currentUserId}.`);
    return {
      message: `Listing "${newListing.title}" created successfully!`,
      listingId: newListing.id,
      success: true,
    };
  } catch (error) {
    console.error("[createListingAction] Error during dbAddListing:", error);
    const errorCode = (error as any)?.code;
    const errorMessageText = (error instanceof Error) ? error.message : "An unexpected error occurred while creating the listing.";
    
    if (errorCode === 'permission-denied' || errorMessageText.toLowerCase().includes('permission')) {
        const detailedMessage = `Firestore Permission Denied...`;
        console.error(`[createListingAction] PERMISSION_DENIED details: ${detailedMessage}`);
        return {
             message: detailedMessage,
             success: false,
        };
    }
    
    return {
      message: errorMessageText,
      success: false,
    };
  }
}
*/
