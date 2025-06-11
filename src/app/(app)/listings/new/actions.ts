
'use server';

import { z } from 'zod';
import type { Listing, LeaseTerm } from '@/lib/types';
import { addListing as dbAddListing } from '@/lib/mock-data'; // Now uses Firestore
// import { auth } from '@/lib/firebase'; // Firebase auth isn't directly used in server actions this way
// For checking subscription status, you'd typically get the UID from an authenticated session
// and then query your Firestore 'users' collection for their subscription status.

const ListingFormSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  location: z.string().min(3, "Location is required"),
  sizeSqft: z.coerce.number().positive("Size must be a positive number"),
  pricePerMonth: z.coerce.number().positive("Price must be a positive number"),
  amenities: z.array(z.string()).min(1, "Select at least one amenity or type 'none' if applicable"),
  leaseTerm: z.enum(['short-term', 'long-term', 'flexible']).optional(),
  minLeaseDurationMonths: z.coerce.number().int().positive().optional().nullable(),
  landownerId: z.string().min(1, "Landowner ID is required"), 
});

export type ListingFormState = {
  message: string;
  errors?: {
    title?: string[];
    description?: string[];
    location?: string[];
    sizeSqft?: string[];
    pricePerMonth?: string[];
    amenities?: string[];
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
    pricePerMonth: formData.get('pricePerMonth'),
    amenities: formData.getAll('amenities').map(String), 
    leaseTerm: formData.get('leaseTerm') || undefined,
    minLeaseDurationMonths: formData.get('minLeaseDurationMonths') ? Number(formData.get('minLeaseDurationMonths')) : undefined,
    landownerId: formData.get('landownerId'), 
  };

  const validatedFields = ListingFormSchema.safeParse(rawFormData);

  if (!validatedFields.success) {
    return {
      message: "Validation failed. Please check your input.",
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }
  
  const currentUserId = validatedFields.data.landownerId;

  if (!currentUserId) {
    // This should ideally be caught by client-side checks or a server-side session check
    return {
      message: "Authentication error: Could not determine landowner.",
      success: false,
    };
  }

  // --- Backend Subscription & Listing Limit Check (Placeholder) ---
  // In a real app with Stripe and Firestore:
  // 1. Get currentUserId from a secure server-side session (e.g., NextAuth.js, or Firebase Admin SDK if this were an HTTP function).
  //    For Server Actions, this usually relies on cookies or headers managed by an auth library.
  // 2. Fetch user's profile from Firestore: `const userProfile = await getUserById(currentUserId);`
  // 3. Check `userProfile?.subscriptionStatus`.
  // 4. If 'free', fetch their current number of active listings from Firestore.
  //    `const listingsCount = await getListingsCountForUser(currentUserId);`
  // 5. If `listingsCount >= FREE_TIER_LISTING_LIMIT` (e.g., 1), return an error:
  //    `return { message: "Free accounts can only create 1 listing. Upgrade to Premium for unlimited listings.", success: false };`
  // For now, we'll proceed without this check as it requires more backend setup.
  // --- End Placeholder ---
  
  try {
    const newListingData: Omit<Listing, 'id' | 'images' | 'rating' | 'numberOfRatings' | 'isAvailable' | 'createdAt' | 'landownerId'> & { landownerId?: string } = {
        title: validatedFields.data.title,
        description: validatedFields.data.description,
        location: validatedFields.data.location,
        sizeSqft: validatedFields.data.sizeSqft,
        pricePerMonth: validatedFields.data.pricePerMonth,
        amenities: validatedFields.data.amenities,
        leaseTerm: validatedFields.data.leaseTerm as LeaseTerm | undefined,
        minLeaseDurationMonths: validatedFields.data.minLeaseDurationMonths ?? undefined,
    };
    
    // dbAddListing now uses Firestore and takes landownerId separately
    const newListing = await dbAddListing(newListingData, currentUserId);

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
