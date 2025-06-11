
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
  setDoc, // Added for createUserProfile
} from 'firebase/firestore';
import type { User, Listing, Booking, Review, LeaseTerm, SubscriptionStatus } from './types';

// Helper to convert Firestore doc data to our User type
const mapDocToUser = (docSnap: any): User => {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    name: data.name || 'Unknown User',
    email: data.email || '', 
    avatarUrl: data.avatarUrl || `https://placehold.co/100x100.png?text=${(data.name || 'U').charAt(0)}`,
    subscriptionStatus: data.subscriptionStatus || 'free',
    stripeCustomerId: data.stripeCustomerId,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
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
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
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
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
  };
};


// --- USERS ---
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
    console.log(`No user profile found for ID: ${id}`);
    return undefined;
  } catch (error) {
    console.error("Error fetching user by ID:", error);
    throw error;
  }
};

// Used during signup to create a user profile document in Firestore
export const createUserProfile = async (userId: string, email: string, name?: string): Promise<User> => {
  if (!db || firebaseInitializationError) {
    throw new Error("Firestore is not available. Cannot create user profile.");
  }
  try {
    const userDocRef = doc(db, "users", userId);
    const profileData: Partial<User> & { email: string; createdAt: Timestamp; subscriptionStatus: SubscriptionStatus } = {
      email: email,
      name: name || email.split('@')[0],
      avatarUrl: `https://placehold.co/100x100.png?text=${(name || email.split('@')[0]).charAt(0).toUpperCase()}`,
      subscriptionStatus: 'free', // Default to free tier
      // stripeCustomerId: undefined, // Will be set after Stripe customer creation
      createdAt: Timestamp.now(),
    };
    await setDoc(userDocRef, profileData); 
    
    // Fetch the just created profile to return the full User object including id
    const newUserSnap = await getDoc(userDocRef);
    if (newUserSnap.exists()) {
        return mapDocToUser(newUserSnap);
    }
    throw new Error("Failed to retrieve newly created user profile.");

  } catch (error) {
    console.error("Error creating user profile:", error);
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
    throw error; 
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
      images: [`https://placehold.co/800x600.png?text=${encodeURIComponent(data.title.substring(0,15))}`, "https://placehold.co/400x300.png?text=View+1", "https://placehold.co/400x300.png?text=View+2"], 
      rating: 0,
      numberOfRatings: 0,
      createdAt: Timestamp.now(),
    };
    const docRef = await addDoc(listingsCol, newListingData);
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
    const batch = writeBatch(db);
    const listingDocRef = doc(db, "listings", listingId);
    batch.delete(listingDocRef);

    // Also delete related bookings
    const bookingsQuery = query(collection(db, "bookings"), where("listingId", "==", listingId));
    const bookingsSnapshot = await getDocs(bookingsQuery);
    bookingsSnapshot.docs.forEach(doc => batch.delete(doc.ref));

    // Also delete related reviews
    const reviewsQuery = query(collection(db, "reviews"), where("listingId", "==", listingId));
    const reviewsSnapshot = await getDocs(reviewsQuery);
    reviewsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    
    await batch.commit();
    return true;
  } catch (error) {
    console.error("Error deleting listing and related data:", error);
    return false;
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
    const q = query(
      bookingsCol,
      or(
        where("renterId", "==", userId),
        where("landownerId", "==", userId)
      ),
      orderBy("dateRange.from", "desc") 
    );
    const bookingSnapshot = await getDocs(q);
    
    const bookings = bookingSnapshot.docs.map(mapDocToBooking);

    const populatedBookings = await Promise.all(bookings.map(async (booking) => {
        let listingTitle: string | undefined;
        let renterName: string | undefined;
        let landownerName: string | undefined;

        try {
            const listing = await getListingById(booking.listingId);
            listingTitle = listing?.title;
        } catch (e) { console.error(`Failed to get listing ${booking.listingId}`, e); }
        
        try {
            const renter = await getUserById(booking.renterId);
            renterName = renter?.name;
        } catch (e) { console.error(`Failed to get renter ${booking.renterId}`, e); }

        try {
            const landowner = await getUserById(booking.landownerId);
            landownerName = landowner?.name;
        } catch (e) { console.error(`Failed to get landowner ${booking.landownerId}`, e); }


        return {
            ...booking,
            listingTitle: listingTitle || `Listing: ${booking.listingId.substring(0,6)}...`,
            renterName: renterName || `Renter: ${booking.renterId.substring(0,6)}...`,
            landownerName: landownerName || `Owner: ${booking.landownerId.substring(0,6)}...`,
        };
    }));
    return populatedBookings;

  } catch (error) {
    console.error("Error fetching bookings for user:", error);
    throw error;
  }
};


export const addBookingRequest = async (
  data: Omit<Booking, 'id' | 'status' | 'listingTitle' | 'landownerName' | 'renterName' | 'createdAt'> & {dateRange: {from: Date; to: Date}}
): Promise<Booking> => {
  if (!db || firebaseInitializationError) {
    throw new Error("Firestore is not available. Cannot add booking request.");
  }
  try {
    const listingSnap = await getDoc(doc(db, "listings", data.listingId));
    if (!listingSnap.exists()) {
        throw new Error("Listing not found for booking request.");
    }
    const listingData = listingSnap.data();

    const bookingsCol = collection(db, "bookings");
    const newBookingData = {
      listingId: data.listingId,
      renterId: data.renterId,
      landownerId: listingData.landownerId, 
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
        const listing = await getListingById(createdBooking.listingId);
        const renter = await getUserById(createdBooking.renterId);
        const landowner = await getUserById(createdBooking.landownerId);
        return {
            ...createdBooking,
            listingTitle: listing?.title || `Listing: ${createdBooking.listingId.substring(0,6)}...`,
            renterName: renter?.name || `Renter: ${createdBooking.renterId.substring(0,6)}...`,
            landownerName: landowner?.name || `Owner: ${createdBooking.landownerId.substring(0,6)}...`,
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
        const listing = await getListingById(updatedBooking.listingId);
        const renter = await getUserById(updatedBooking.renterId);
        const landowner = await getUserById(updatedBooking.landownerId);
        return {
            ...updatedBooking,
            listingTitle: listing?.title || `Listing: ${updatedBooking.listingId.substring(0,6)}...`,
            renterName: renter?.name || `Renter: ${updatedBooking.renterId.substring(0,6)}...`,
            landownerName: landowner?.name || `Owner: ${updatedBooking.landownerId.substring(0,6)}...`,
        };
    }
    return undefined;
  } catch (error) {
    console.error("Error updating booking status:", error);
    throw error;
  }
};
