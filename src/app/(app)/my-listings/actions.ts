
'use server';

import { deleteListing as dbDeleteListing } from '@/lib/mock-data';
import { revalidatePath } from 'next/cache';
import { firebaseInitializationError } from '@/lib/firebase';
import { writeBatch, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function deleteListingAction(listingId: string): Promise<{ success: boolean; message: string }> {
  if (!listingId) {
    return { success: false, message: 'Listing ID is required.' };
  }
  
  const isMockMode = firebaseInitializationError !== null;

  try {
    const deleted = await dbDeleteListing(listingId);
    if (deleted) {
      revalidatePath('/my-listings');
      revalidatePath('/search');
      revalidatePath('/'); 
      return { success: true, message: `Listing deleted successfully ${isMockMode ? "(mock mode)" : ""}.` };
    } else {
      return { success: false, message: `Listing not found or already deleted ${isMockMode ? "(mock mode)" : ""}.` };
    }
  } catch (error: any) {
    console.error("Error in deleteListingAction:", error);
    return { success: false, message: error.message || `Failed to delete listing ${isMockMode ? "(mock mode)" : ""}.` };
  }
}

export async function deleteMultipleListingsAction(listingIds: string[]): Promise<{ success: boolean, message: string }> {
    if (!listingIds || listingIds.length === 0) {
        return { success: false, message: "No listings selected for deletion." };
    }
    
    if (firebaseInitializationError !== null) {
        // Mock mode deletion
        try {
            let deletedCount = 0;
            for (const id of listingIds) {
                const deleted = await dbDeleteListing(id);
                if (deleted) deletedCount++;
            }
            if (deletedCount > 0) {
                revalidatePath('/my-listings');
                revalidatePath('/downgrade');
                return { success: true, message: `${deletedCount} listing(s) deleted successfully (mock mode).`};
            }
            return { success: false, message: "No matching listings found to delete."};
        } catch (error: any) {
             return { success: false, message: error.message || "Failed to delete listings in mock mode."};
        }
    }

    // Live Firebase mode
    try {
        const batch = writeBatch(db);
        listingIds.forEach(id => {
            const listingRef = doc(db, "listings", id);
            batch.delete(listingRef);
        });
        await batch.commit();
        
        revalidatePath('/my-listings');
        revalidatePath('/downgrade');
        revalidatePath('/search');

        return { success: true, message: `${listingIds.length} listing(s) have been deleted.` };
    } catch (error: any) {
        console.error("Error in deleteMultipleListingsAction:", error);
        return { success: false, message: error.message || "An error occurred while deleting the listings."};
    }
}
