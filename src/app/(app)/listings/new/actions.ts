
'use server';

import { z } from 'zod';
import type { Listing, LeaseTerm } from '@/lib/types';
import { addListing as dbAddListing } from '@/lib/mock-data';
import { auth } from '@/lib/firebase'; // Assuming your firebase setup exports auth
import { headers } from 'next/headers'; // To get user session if not using a dedicated library

// This is a placeholder for getting the current user's ID on the server.
// In a real app with robust auth, you might use a library or a different method.
// For Firebase, you might verify an ID token passed from the client.
// For now, this is highly simplified and NOT production-ready for auth.
async function getCurrentUserId(): Promise<string | null> {
  // This is a very basic way and might not work in all server action contexts
  // or without specific session management.
  // A more robust solution would involve handling auth tokens.
  // For now, let's assume we'd get it from a session or an auth library.
  // If using client-passed UID, IT MUST BE VERIFIED ON SERVER.
  // For mock purposes, we'll fallback or require client to send it securely.
  // For now, we'll rely on the 'user1' mock or make createListingAction require landownerId.
  // Let's modify addListing in mock-data to accept landownerId.
  
  // This example won't work directly to get Firebase UID in a server action without setup.
  // We'll pass landownerId from the client (via useAuth) to dbAddListing.
  // The server action itself can't easily access client-side useAuth.
  // So, the form will need to submit the landownerId. This is not ideal for security
  // as client can spoof it. True server-side session auth is needed for production.
  // For now, the action will rely on the calling context to provide it to dbAddListing.
  return "user1_firebase_uid"; // Placeholder for actual current user ID
}


const ListingFormSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  location: z.string().min(3, "Location is required"),
  sizeSqft: z.coerce.number().positive("Size must be a positive number"),
  pricePerMonth: z.coerce.number().positive("Price must be a positive number"),
  amenities: z.array(z.string()).min(1, "Select at least one amenity or type 'none'"),
  leaseTerm: z.enum(['short-term', 'long-term', 'flexible']).optional(),
  minLeaseDurationMonths: z.coerce.number().optional(),
  landownerId: z.string().min(1, "Landowner ID is required"), // Added landownerId
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
    amenities: formData.getAll('amenities'), 
    leaseTerm: formData.get('leaseTerm') || undefined,
    minLeaseDurationMonths: formData.get('minLeaseDurationMonths') || undefined,
    landownerId: formData.get('landownerId'), // Get landownerId from form
  };

  const validatedFields = ListingFormSchema.safeParse(rawFormData);

  if (!validatedFields.success) {
    return {
      message: "Validation failed. Please check your input.",
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }
  
  // IMPORTANT: In a real app, you MUST verify that validatedFields.data.landownerId
  // actually matches the authenticated user making the request on the server.
  // This mock setup doesn't do that server-side verification.
  const currentUserId = validatedFields.data.landownerId; // For now, trust client

  if (!currentUserId) {
    return {
      message: "Authentication error: Could not determine landowner.",
      success: false,
    };
  }
  
  try {
    const newListingData = {
        title: validatedFields.data.title,
        description: validatedFields.data.description,
        location: validatedFields.data.location,
        sizeSqft: validatedFields.data.sizeSqft,
        pricePerMonth: validatedFields.data.pricePerMonth,
        amenities: validatedFields.data.amenities,
        leaseTerm: validatedFields.data.leaseTerm as LeaseTerm | undefined,
        minLeaseDurationMonths: validatedFields.data.minLeaseDurationMonths ? Number(validatedFields.data.minLeaseDurationMonths) : undefined,
    };
    
    // Pass the (currently client-provided) landownerId to dbAddListing
    const newListing = dbAddListing(newListingData, currentUserId);

    return {
      message: `Listing "${newListing.title}" created successfully!`,
      listingId: newListing.id,
      success: true,
    };
  } catch (error) {
    return {
      message: (error instanceof Error) ? error.message : "An unexpected error occurred while creating the listing.",
      success: false,
    };
  }
}
