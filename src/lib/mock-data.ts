
import { db, firebaseInitializationError } from './firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
  orderBy,
  writeBatch,
  or,
} from 'firebase/firestore';
import type { User, Listing, Booking, Review, LeaseTerm } from './types';

// Helper to convert Firestore doc data to our Listing type
const mapDocToUser = (docSnap: any): User => {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    name: data.name || 'Unknown User',
    email: data.email || '', // Email might primarily come from Auth
    avatarUrl: data.avatarUrl || `https://placehold.co/100x100.png?text=${(data.name || 'U').charAt(0)}`,
  };
};

// Helper to convert Firestore doc data to our Listing type
const mapDocToListing = (docSnap: any): Listing => {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    title: data.title,
    description: data.description,
    location: data.location,
    sizeSqft: data.sizeSqft,
    amenities: data.amenities || [],
    pricePerMonth: data.pricePerMonth,
    images: data.images || ["https://placehold.co/800x600.png"],
    landownerId: data.landownerId,
    isAvailable: data.isAvailable !== undefined ? data.isAvailable : true,
    rating: data.rating,
    numberOfRatings: data.numberOfRatings,
    leaseTerm: data.leaseTerm,
    minLeaseDurationMonths: data.minLeaseDurationMonths,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
  };
};

// Helper to convert Firestore doc data to our Booking type
const mapDocToBooking = (docSnap: any): Booking => {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    listingId: data.listingId,
    renterId: data.renterId,
    landownerId: data.landownerId,
    status: data.status,
    dateRange: {
      from: data.dateRange.from.toDate(),
      to: data.dateRange.to.toDate(),
    },
    // Denormalized fields will be populated by components or more complex queries if needed
  };
};

// Helper to convert Firestore doc data to our Review type
const mapDocToReview = (docSnap: any): Review => {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    listingId: data.listingId,
    userId: data.userId,
    rating: data.rating,
    comment: data.comment,
    createdAt: data.createdAt.toDate(),
  };
};


// --- USERS ---
// Generally, primary user data comes from Firebase Auth (currentUser).
// This 'users' collection would be for additional public profile info or app-specific roles.
export const getUserById = async (id: string): Promise<User | undefined> => {
  if (!db || firebaseInitializationError) {
    console.warn("Firestore is not available. Returning undefined for getUserById.");
    return undefined;
  }
  try {
    const userDocRef = doc(db, "users", id);
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
      return mapDocToUser(userSnap);
    }
    return undefined;
  } catch (error) {
    console.error("Error fetching user by ID:", error);
    throw error;
  }
};


// --- LISTINGS ---
export const getListings = async (): Promise<Listing[]> => {
  if (!db || firebaseInitializationError) {
    console.warn("Firestore is not available. Returning empty array for listings.");
    return [];
  }
  try {
    const listingsCol = collection(db, "listings");
    const q = query(listingsCol, orderBy("createdAt", "desc"));
    const listingSnapshot = await getDocs(q);
    return listingSnapshot.docs.map(mapDocToListing);
  } catch (error) {
    console.error("Error fetching listings:", error);
    throw error; // Or return empty array: return [];
  }
};

export const getListingById = async (id: string): Promise<Listing | undefined> => {
  if (!db || firebaseInitializationError) {
    console.warn("Firestore is not available. Returning undefined for listing.");
    return undefined;
  }
  try {
    const listingDocRef = doc(db, "listings", id);
    const listingSnap = await getDoc(listingDocRef);
    if (listingSnap.exists()) {
      return mapDocToListing(listingSnap);
    }
    return undefined;
  } catch (error) {
    console.error("Error fetching listing by ID:", error);
    throw error;
  }
};

export const addListing = async (
  data: Pick<Listing, 'title' | 'description' | 'location' | 'sizeSqft' | 'pricePerMonth' | 'amenities' | 'leaseTerm' | 'minLeaseDurationMonths'>,
  landownerId: string
): Promise<Listing> => {
  if (!db || firebaseInitializationError) {
    throw new Error("Firestore is not available. Cannot add listing.");
  }
  try {
    const listingsCol = collection(db, "listings");
    const newListingData = {
      ...data,
      landownerId: landownerId,
      isAvailable: true,
      images: [`https://placehold.co/800x600.png?text=${encodeURIComponent(data.title.substring(0,15))}`, "https://placehold.co/400x300.png?text=View+1", "https://placehold.co/400x300.png?text=View+2"], // Placeholder images
      rating: 0,
      numberOfRatings: 0,
      createdAt: Timestamp.now(),
    };
    const docRef = await addDoc(listingsCol, newListingData);
    // Fetch the newly created document to return it with its ID and mapped structure
    const newDocSnap = await getDoc(docRef);
    if (newDocSnap.exists()){
         return mapDocToListing(newDocSnap);
    } else {
        throw new Error("Failed to retrieve newly created listing.");
    }
  } catch (error) {
    console.error("Error adding listing:", error);
    throw error;
  }
};

export const deleteListing = async (listingId: string): Promise<boolean> => {
  if (!db || firebaseInitializationError) {
    console.warn("Firestore is not available. Cannot delete listing.");
    return false;
  }
  try {
    const listingDocRef = doc(db, "listings", listingId);
    await deleteDoc(listingDocRef);
    // Note: Deleting related bookings and reviews would require additional queries and batch writes or Firebase Functions.
    // For simplicity, we are only deleting the listing document here.
    // Example of deleting related bookings (reviews would be similar):
    // const bookingsQuery = query(collection(db, "bookings"), where("listingId", "==", listingId));
    // const bookingsSnapshot = await getDocs(bookingsQuery);
    // const batch = writeBatch(db);
    // bookingsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    // await batch.commit();
    return true;
  } catch (error) {
    console.error("Error deleting listing:", error);
    return false; // Or throw error
  }
};

// --- REVIEWS ---
export const getReviewsForListing = async (listingId: string): Promise<Review[]> => {
  if (!db || firebaseInitializationError) {
    console.warn("Firestore is not available. Returning empty array for reviews.");
    return [];
  }
  try {
    const reviewsCol = collection(db, "reviews");
    const q = query(reviewsCol, where("listingId", "==", listingId), orderBy("createdAt", "desc"));
    const reviewSnapshot = await getDocs(q);
    return reviewSnapshot.docs.map(mapDocToReview);
  } catch (error) {
    console.error("Error fetching reviews:", error);
    throw error;
  }
};

// Example of adding a review (not fully implemented in UI yet)
export const addReview = async (
  listingId: string,
  userId: string,
  rating: number,
  comment: string
): Promise<Review> => {
  if (!db || firebaseInitializationError) {
    throw new Error("Firestore is not available. Cannot add review.");
  }
  try {
    const reviewsCol = collection(db, "reviews");
    const newReviewData = {
      listingId,
      userId,
      rating,
      comment,
      createdAt: Timestamp.now(),
    };
    const docRef = await addDoc(reviewsCol, newReviewData);
    const newDocSnap = await getDoc(docRef);
     if (newDocSnap.exists()){
        return mapDocToReview(newDocSnap);
    } else {
        throw new Error("Failed to retrieve newly created review.");
    }
  } catch (error) {
    console.error("Error adding review:", error);
    throw error;
  }
};


// --- BOOKINGS ---
export const getBookingsForUser = async (userId: string): Promise<Booking[]> => {
  if (!db || firebaseInitializationError) {
    console.warn("Firestore is not available. Returning empty array for bookings.");
    return [];
  }
  try {
    const bookingsCol = collection(db, "bookings");
    // Query for bookings where the user is either the renter OR the landowner
    const q = query(
      bookingsCol,
      or(
        where("renterId", "==", userId),
        where("landownerId", "==", userId)
      ),
      orderBy("dateRange.from", "desc") // Example ordering
    );
    const bookingSnapshot = await getDocs(q);
    
    const bookings = bookingSnapshot.docs.map(mapDocToBooking);

    // Optionally, fetch related listing titles and user names if needed here,
    // or handle it in the components. For now, returning core booking data.
    // This part can become complex and might lead to N+1 queries if not careful.
    // Example of fetching related data (simplified):
    const populatedBookings = await Promise.all(bookings.map(async (booking) => {
        let listingTitle: string | undefined;
        let renterName: string | undefined;
        let landownerName: string | undefined;

        const listing = await getListingById(booking.listingId);
        listingTitle = listing?.title;
        
        // Avoid fetching self if not needed or use auth context's currentUser for self's name
        if (booking.renterId !== userId) {
            const renter = await getUserById(booking.renterId);
            renterName = renter?.name;
        }
        if (booking.landownerId !== userId) {
            const landowner = await getUserById(booking.landownerId);
            landownerName = landowner?.name;
        }

        return {
            ...booking,
            listingTitle: listingTitle || `Listing ID: ${booking.listingId}`,
            renterName: renterName || `Renter ID: ${booking.renterId.substring(0,6)}`,
            landownerName: landownerName || `Owner ID: ${booking.landownerId.substring(0,6)}`,
        };
    }));
    return populatedBookings;

  } catch (error) {
    console.error("Error fetching bookings for user:", error);
    throw error;
  }
};


export const addBookingRequest = async (
  data: Omit<Booking, 'id' | 'status' | 'listingTitle' | 'landownerName' | 'renterName'>
): Promise<Booking> => {
  if (!db || firebaseInitializationError) {
    throw new Error("Firestore is not available. Cannot add booking request.");
  }
  try {
    // Fetch landownerId from the listing to ensure it's correct
    const listingSnap = await getDoc(doc(db, "listings", data.listingId));
    if (!listingSnap.exists()) {
        throw new Error("Listing not found for booking request.");
    }
    const listingData = listingSnap.data();

    const bookingsCol = collection(db, "bookings");
    const newBookingData = {
      listingId: data.listingId,
      renterId: data.renterId,
      landownerId: listingData.landownerId, // Use landownerId from the fetched listing
      status: 'Pending Confirmation' as Booking['status'],
      dateRange: {
        from: Timestamp.fromDate(data.dateRange.from),
        to: Timestamp.fromDate(data.dateRange.to),
      },
      createdAt: Timestamp.now(),
    };
    const docRef = await addDoc(bookingsCol, newBookingData);
    const newDocSnap = await getDoc(docRef);
    if (newDocSnap.exists()){
        const createdBooking = mapDocToBooking(newDocSnap);
        // Populate names for immediate use if necessary (similar to getBookingsForUser)
        const listing = await getListingById(createdBooking.listingId);
        const renter = await getUserById(createdBooking.renterId);
        const landowner = await getUserById(createdBooking.landownerId);
        return {
            ...createdBooking,
            listingTitle: listing?.title || `Listing ID: ${createdBooking.listingId}`,
            renterName: renter?.name || `Renter ID: ${createdBooking.renterId.substring(0,6)}`,
            landownerName: landowner?.name || `Owner ID: ${createdBooking.landownerId.substring(0,6)}`,
        };

    } else {
        throw new Error("Failed to retrieve newly created booking request.");
    }
  } catch (error) {
    console.error("Error adding booking request:", error);
    throw error;
  }
};

export const updateBookingStatus = async (bookingId: string, status: Booking['status']): Promise<Booking | undefined> => {
  if (!db || firebaseInitializationError) {
    console.warn("Firestore is not available. Cannot update booking status.");
    return undefined;
  }
  try {
    const bookingDocRef = doc(db, "bookings", bookingId);
    await updateDoc(bookingDocRef, { status: status });
    const updatedSnap = await getDoc(bookingDocRef);
    if (updatedSnap.exists()) {
      const updatedBooking = mapDocToBooking(updatedSnap);
       // Populate names for immediate use if necessary
        const listing = await getListingById(updatedBooking.listingId);
        const renter = await getUserById(updatedBooking.renterId);
        const landowner = await getUserById(updatedBooking.landownerId);
        return {
            ...updatedBooking,
            listingTitle: listing?.title || `Listing ID: ${updatedBooking.listingId}`,
            renterName: renter?.name || `Renter ID: ${updatedBooking.renterId.substring(0,6)}`,
            landownerName: landowner?.name || `Owner ID: ${updatedBooking.landownerId.substring(0,6)}`,
        };
    }
    return undefined;
  } catch (error) {
    console.error("Error updating booking status:", error);
    throw error;
  }
};

// --- USERS (ADDITIONAL PROFILE DATA) ---
// This function would be used to create a user profile document in Firestore
// when a new user signs up, if you need to store more info than Auth provides.
export const createUserProfile = async (userId: string, email: string, name?: string): Promise<User> => {
  if (!db || firebaseInitializationError) {
    throw new Error("Firestore is not available. Cannot create user profile.");
  }
  try {
    const userDocRef = doc(db, "users", userId);
    const profileData = {
      email: email,
      name: name || email.split('@')[0], // Default name from email
      avatarUrl: `https://placehold.co/100x100.png?text=${(name || email.split('@')[0]).charAt(0).toUpperCase()}`,
      createdAt: Timestamp.now(),
      // Add any other default fields for a new user profile
    };
    await setDoc(userDocRef, profileData); // Using setDoc to ensure creation or overwrite if it somehow exists
    return {
      id: userId,
      ...profileData,
      createdAt: profileData.createdAt.toDate(), // Convert timestamp for return type
    } as User;
  } catch (error) {
    console.error("Error creating user profile:", error);
    throw error;
  }
};

// Mock data removal for functions that are now fully Firestore-backed
// getListings, getListingById, addListing, deleteListing, getReviewsForListing,
// getBookings (renamed to getBookingsForUser), addBookingRequest, updateBookingStatus
// getUserById (if used for fetching other user's public profile)

// Note: The original getBookings() is replaced by getBookingsForUser(userId).
// The components calling this will need to be updated to pass the current user's ID.
// I will make this adjustment in the relevant components next if needed.
// For now, functions are renamed or adapted.
// The mock arrays themselves (mockUsers, mockListings, etc.) are no longer used by these functions.
// They can be removed or kept for isolated testing if desired, but the exported functions now hit Firestore.
