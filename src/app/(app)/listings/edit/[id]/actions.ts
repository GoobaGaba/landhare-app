
'use server';

// This file is now obsolete as the form submission logic has been moved
// to the client-side component in `edit-listing-form.tsx`.
// It is safe to delete this file.

// The old server action code is kept here for reference but is no longer used.
/*
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { updateListing as dbUpdateListing, getListingById } from '@/lib/mock-data';
import type { Listing, LeaseTerm } from '@/lib/types';
import type { ListingFormState } from '@/app/(app)/listings/new/actions'; // Reusing this state type

const UpdateListingFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  location: z.string().min(3, "Location is required"),
  sizeSqft: z.coerce.number().positive("Size must be a positive number"),
  price: z.coerce.number().positive("Price must be a positive number"),
  pricingModel: z.enum(['nightly', 'monthly', 'lease-to-own']),
  leaseToOwnDetails: z.string().optional(),
  amenities: z.array(z.string()).optional().default([]),
  images: z.array(z.string().url("Each image must be a valid URL.")).optional().default([]),
  leaseTerm: z.enum(['short-term', 'long-term', 'flexible']).optional(),
  minLeaseDurationMonths: z.coerce.number().int().positive().optional().nullable(),
  isAvailable: z.coerce.boolean().optional(), // Allow updating availability
}).superRefine((data, ctx) => {
  if (data.pricingModel === 'lease-to-own' && (!data.leaseToOwnDetails || data.leaseToOwnDetails.trim().length < 10)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Lease-to-Own details are required and must be at least 10 characters if 'Lease-to-Own' is selected.",
      path: ['leaseToOwnDetails'],
    });
  }
});


export async function updateListingAction(
  listingId: string,
  currentUserId: string,
  prevState: ListingFormState,
  formData: FormData
): Promise<ListingFormState> {

  if (!listingId) {
    return { message: "Listing ID is missing.", success: false };
  }
  if (!currentUserId) {
    return { message: "User not authenticated.", success: false };
  }

  const existingListing = await getListingById(listingId);
  if (!existingListing) {
    return { message: "Listing not found.", success: false };
  }
  if (existingListing.landownerId !== currentUserId) {
    return { message: "You are not authorized to edit this listing.", success: false };
  }

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
    isAvailable: formData.get('isAvailable') === 'on' || formData.get('isAvailable') === 'true', // Handle checkbox
  };

  const validatedFields = UpdateListingFormSchema.safeParse(rawFormData);

  if (!validatedFields.success) {
    return {
      message: "Validation failed. Please check your input.",
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }
  
  const updateData: Partial<Omit<Listing, 'id' | 'landownerId' | 'createdAt' | 'rating' | 'numberOfRatings' | 'isBoosted'>> = {
    ...validatedFields.data,
    pricingModel: validatedFields.data.pricingModel as Listing['pricingModel'],
    leaseTerm: validatedFields.data.leaseTerm as LeaseTerm | undefined,
    minLeaseDurationMonths: validatedFields.data.minLeaseDurationMonths ?? undefined,
    leaseToOwnDetails: validatedFields.data.leaseToOwnDetails ?? undefined,
  };


  try {
    const updatedListing = await dbUpdateListing(listingId, updateData);
    if (!updatedListing) {
      return { message: "Failed to update listing in the database.", success: false };
    }

    revalidatePath(`/listings/${listingId}`);
    revalidatePath('/my-listings');
    revalidatePath('/search');
    revalidatePath('/');

    return {
      message: `Listing "${updatedListing.title}" updated successfully!`,
      listingId: updatedListing.id,
      success: true,
    };
  } catch (error) {
    console.error("Error in updateListingAction:", error);
    return {
      message: (error instanceof Error) ? error.message : "An unexpected error occurred while updating the listing.",
      success: false,
    };
  }
}
*/
