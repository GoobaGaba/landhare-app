
'use server';

import { revalidatePath } from 'next/cache';
import { firebaseInitializationError, db } from '@/lib/firebase';
import { deleteDoc, doc, writeBatch, query, collection, where, getDocs } from 'firebase/firestore';

// We now directly interact with Firestore here, as the mock-data abstraction is being replaced.

export async function deleteListingAction(listingId: string): Promise<{ success: boolean; message: string }> {
  if (!listingId) {
    return { success: false, message: 'Listing ID is required.' };
  }
  
  if (firebaseInitializationError !== null) {
      // In mock mode, we can't perform this action as it's tied to Firestore now.
      return { success: false, message: "Deletion disabled in mock mode. Please configure Firebase."};
  }

  try {
    const listingRef = doc(db, "listings", listingId);
    await deleteDoc(listingRef);
    
    // Optionally, delete related bookings and reviews in a batch
    const bookingsQuery = query(collection(db, "bookings"), where("listingId", "==", listingId));
    const reviewsQuery = query(collection(db, "reviews"), where("listingId", "==", listingId));
    
    const [bookingsSnapshot, reviewsSnapshot] = await Promise.all([getDocs(bookingsQuery), getDocs(reviewsQuery)]);
    
    const batch = writeBatch(db);
    bookingsSnapshot.forEach(doc => batch.delete(doc.ref));
    reviewsSnapshot.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    revalidatePath('/my-listings');
    revalidatePath('/search');
    revalidatePath('/'); 
    return { success: true, message: `Listing and its associated data deleted successfully.` };
  } catch (error: any) {
    console.error("Error in deleteListingAction:", error);
    return { success: false, message: error.message || `Failed to delete listing.` };
  }
}

export async function deleteMultipleListingsAction(listingIds: string[]): Promise<{ success: boolean, message: string }> {
    if (!listingIds || listingIds.length === 0) {
        return { success: false, message: "No listings selected for deletion." };
    }
    
    if (firebaseInitializationError !== null) {
        return { success: false, message: "Deletion disabled in mock mode. Please configure Firebase."};
    }

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
