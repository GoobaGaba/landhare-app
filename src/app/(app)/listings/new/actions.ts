'use server';

import { z } from 'zod';
import type { Listing } from '@/lib/types';

const ListingFormSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  location: z.string().min(3, "Location is required"),
  sizeSqft: z.coerce.number().positive("Size must be a positive number"),
  pricePerMonth: z.coerce.number().positive("Price must be a positive number"),
  amenities: z.array(z.string()).min(1, "Select at least one amenity or type 'none'"),
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
    // Amenities are typically checkboxes, so need to handle them correctly
    // For simplicity, assume it's a comma-separated string from a hidden input or handled client-side
    amenities: formData.getAll('amenities'), // If using multiple checkboxes with same name
  };

  const validatedFields = ListingFormSchema.safeParse(rawFormData);

  if (!validatedFields.success) {
    return {
      message: "Validation failed. Please check your input.",
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }

  // Simulate saving to a database
  console.log("Creating listing with data:", validatedFields.data);
  const newListingId = `listing-${Date.now()}`; 
  // In a real app, save validatedFields.data to DB and get an ID

  // Simulate successful creation
  return {
    message: `Listing "${validatedFields.data.title}" created successfully!`,
    listingId: newListingId,
    success: true,
  };
}
