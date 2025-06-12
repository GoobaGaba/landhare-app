
'use server';

import { deleteListing as dbDeleteListing } from '@/lib/mock-data';
import { revalidatePath } from 'next/cache';
import { firebaseInitializationError } from '@/lib/firebase';

export async function deleteListingAction(listingId: string): Promise<{ success: boolean; message: string }> {
  if (!listingId) {
    return { success: false, message: 'Listing ID is required.' };
  }
  
  // Check if we are in mock mode or live mode
  const isMockMode = firebaseInitializationError !== null;

  try {
    const deleted = await dbDeleteListing(listingId);
    if (deleted) {
      // Revalidate paths to ensure fresh data is fetched on navigation
      revalidatePath('/my-listings');
      revalidatePath('/search');
      revalidatePath('/'); 
      // For mock mode, we might need an additional client-side trigger if revalidatePath isn't enough
      // but useListingsData hook reacting to mockDataVersion should handle this.
      return { success: true, message: `Listing deleted successfully ${isMockMode ? "(mock mode)" : ""}.` };
    } else {
      return { success: false, message: `Listing not found or already deleted ${isMockMode ? "(mock mode)" : ""}.` };
    }
  } catch (error: any) {
    console.error("Error in deleteListingAction:", error);
    return { success: false, message: error.message || `Failed to delete listing ${isMockMode ? "(mock mode)" : ""}.` };
  }
}
