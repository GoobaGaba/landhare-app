
'use server';

import { z } from 'zod';
import type { Listing, LeaseTerm } from '@/lib/types';
import { addListing as dbAddListing } from '@/lib/mock-data';

const ListingFormSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  location: z.string().min(3, "Location is required"),
  sizeSqft: z.coerce.number().positive("Size must be a positive number"),
  pricePerMonth: z.coerce.number().positive("Price must be a positive number"),
  amenities: z.array(z.string()).min(1, "Select at least one amenity or type 'none'"),
  leaseTerm: z.enum(['short-term', 'long-term', 'flexible']).optional(),
  minLeaseDurationMonths: z.coerce.number().optional(),
  // images would be handled differently, e.g. file uploads
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
    amenities: formData.getAll('amenities'), 
    leaseTerm: formData.get('leaseTerm') || undefined, // Handle optional field
    minLeaseDurationMonths: formData.get('minLeaseDurationMonths') || undefined, // Handle optional field
  };

  const validatedFields = ListingFormSchema.safeParse(rawFormData);

  if (!validatedFields.success) {
    return {
      message: "Validation failed. Please check your input.",
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }
  
  try {
    // In a real app, landownerId would come from the authenticated user session
    // For now, addListing in mock-data assigns a default
    const newListingData = {
        ...validatedFields.data,
        leaseTerm: validatedFields.data.leaseTerm as LeaseTerm | undefined, // Ensure correct type
        minLeaseDurationMonths: validatedFields.data.minLeaseDurationMonths ? Number(validatedFields.data.minLeaseDurationMonths) : undefined,
    };
    
    const newListing = dbAddListing(newListingData);

    return {
      message: `Listing "${newListing.title}" created successfully!`,
      listingId: newListing.id,
      success: true,
    };
  } catch (error) {
    console.error("Error creating listing in mock DB:", error);
    return {
      message: (error instanceof Error) ? error.message : "An unexpected error occurred while creating the listing.",
      success: false,
    };
  }
}
