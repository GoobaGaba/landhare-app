
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
  setDoc,
  getCountFromServer,
} from 'firebase/firestore';
import type { User, Listing, Booking, Review, SubscriptionStatus } from './types';

export const FREE_TIER_LISTING_LIMIT = 1;

// --- MOCK DATA ARRAYS ---
let mockUsers: User[] = [
  {
    id: 'mock-user-uid-12345',
    name: 'Mock UI Tester',
    email: 'mocktester@example.com',
    avatarUrl: 'https://placehold.co/100x100.png?text=MT',
    subscriptionStatus: 'premium', // For testing premium features
    createdAt: new Date('2023-01-01T10:00:00Z'),
    bio: 'I am the main mock user for testing purposes.',
  },
  {
    id: 'landowner-jane-doe',
    name: 'Jane Doe',
    email: 'jane@example.com',
    avatarUrl: 'https://placehold.co/100x100.png?text=JD',
    subscriptionStatus: 'free',
    createdAt: new Date('2023-02-15T11:00:00Z'),
    bio: 'Experienced landowner with several plots available.',
  },
  {
    id: 'renter-john-smith',
    name: 'John Smith',
    email: 'john@example.com',
    avatarUrl: 'https://placehold.co/100x100.png?text=JS',
    subscriptionStatus: 'free',
    createdAt: new Date('2023-03-20T12:00:00Z'),
    bio: 'Looking for a quiet place for my tiny home.',
  },
];

let mockListings: Listing[] = [
  {
    id: 'listing-1-sunny-meadow',
    title: 'Sunny Meadow Plot',
    description: 'A beautiful sunny meadow, perfect for sustainable living. Flat land, easy access.',
    location: 'Boulder, CO',
    sizeSqft: 5000,
    amenities: ['water hookup', 'road access', 'pet friendly'],
    pricePerMonth: 350,
    images: ['https://placehold.co/800x600.png?text=Sunny+Meadow', 'https://placehold.co/400x300.png?text=Meadow+View+1', 'https://placehold.co/400x300.png?text=Meadow+View+2'],
    landownerId: 'landowner-jane-doe',
    isAvailable: true,
    rating: 4.8,
    numberOfRatings: 15,
    leaseTerm: 'long-term',
    minLeaseDurationMonths: 6,
    isBoosted: false,
    createdAt: new Date('2023-10-01T10:00:00Z'),
  },
  {
    id: 'listing-2-forest-retreat',
    title: 'Forest Retreat Lot',
    description: 'Secluded lot in a dense forest. Ideal for off-grid enthusiasts. Some clearing needed.',
    location: 'Asheville, NC',
    sizeSqft: 12000,
    amenities: ['septic system', 'fenced'],
    pricePerMonth: 200,
    images: ['https://placehold.co/800x600.png?text=Forest+Retreat', 'https://placehold.co/400x300.png?text=Forest+View+1'],
    landownerId: 'mock-user-uid-12345',
    isAvailable: true,
    rating: 4.2,
    numberOfRatings: 8,
    leaseTerm: 'flexible',
    isBoosted: true, // Mock Tester is premium
    createdAt: new Date('2023-11-15T14:30:00Z'),
  },
  {
    id: 'listing-3-desert-oasis',
    title: 'Desert Oasis Spot',
    description: 'Expansive desert views with stunning sunsets. Requires water hauling. Power access nearby.',
    location: 'Sedona, AZ',
    sizeSqft: 25000,
    amenities: ['power access', 'road access'],
    pricePerMonth: 150,
    images: ['https://placehold.co/800x600.png?text=Desert+Oasis'],
    landownerId: 'landowner-jane-doe',
    isAvailable: false, // Not available
    rating: 4.5,
    numberOfRatings: 10,
    leaseTerm: 'short-term',
    minLeaseDurationMonths: 1,
    isBoosted: false,
    createdAt: new Date('2023-09-01T10:00:00Z'),
  },
   {
    id: 'listing-4-riverside-haven',
    title: 'Riverside Haven',
    description: 'Peaceful plot by a gentle river. Great for nature lovers. Seasonal access.',
    location: 'Missoula, MT',
    sizeSqft: 7500,
    amenities: ['water hookup', 'fire pit', 'lake access'], // lake access is a bit of a stretch for river but ok for mock
    pricePerMonth: 400,
    images: ['https://placehold.co/800x600.png?text=Riverside+Haven', 'https://placehold.co/400x300.png?text=River+View'],
    landownerId: 'mock-user-uid-12345',
    isAvailable: true,
    rating: 4.9,
    numberOfRatings: 22,
    leaseTerm: 'long-term',
    minLeaseDurationMonths: 12,
    isBoosted: true,
    createdAt: new Date('2024-01-10T10:00:00Z'),
  },
];

let mockBookings: Booking[] = [
  {
    id: 'booking-1',
    listingId: 'listing-1-sunny-meadow',
    renterId: 'renter-john-smith',
    landownerId: 'landowner-jane-doe',
    status: 'Confirmed',
    dateRange: { from: new Date('2024-01-01'), to: new Date('2024-06-30') },
    createdAt: new Date('2023-12-15T10:00:00Z'),
  },
  {
    id: 'booking-2',
    listingId: 'listing-2-forest-retreat',
    renterId: 'renter-john-smith',
    landownerId: 'mock-user-uid-12345',
    status: 'Pending Confirmation',
    dateRange: { from: new Date('2024-03-01'), to: new Date('2024-04-01') },
    createdAt: new Date('2024-02-20T11:00:00Z'),
  },
  {
    id: 'booking-3',
    listingId: 'listing-1-sunny-meadow', // Mock tester is renting this from Jane
    renterId: 'mock-user-uid-12345',
    landownerId: 'landowner-jane-doe',
    status: 'Declined',
    dateRange: { from: new Date('2024-07-01'), to: new Date('2024-08-01') },
    createdAt: new Date('2024-02-25T12:00:00Z'),
  },
];

let mockReviews: Review[] = [
  {
    id: 'review-1',
    listingId: 'listing-1-sunny-meadow',
    userId: 'renter-john-smith',
    rating: 5,
    comment: 'Absolutely loved this spot! Jane was a great host.',
    createdAt: new Date('2023-07-01T10:00:00Z'),
  },
  {
    id: 'review-2',
    listingId: 'listing-2-forest-retreat',
    userId: 'landowner-jane-doe', // Jane reviewing Mock Tester's lot (as a renter for example)
    rating: 4,
    comment: 'Nice and secluded, a bit rough around the edges but has potential.',
    createdAt: new Date('2023-12-01T11:00:00Z'),
  },
];


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
    bio: data.bio || '',
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
    images: data.images && data.images.length > 0 ? data.images : ["https://placehold.co/800x600.png?text=Land"],
    landownerId: data.landownerId,
    isAvailable: data.isAvailable !== undefined ? data.isAvailable : true,
    rating: data.rating,
    numberOfRatings: data.numberOfRatings,
    leaseTerm: data.leaseTerm,
    minLeaseDurationMonths: data.minLeaseDurationMonths,
    isBoosted: data.isBoosted || false,
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
      from: data.dateRange.from.toDate ? data.dateRange.from.toDate() : new Date(data.dateRange.from),
      to: data.dateRange.to.toDate ? data.dateRange.to.toDate() : new Date(data.dateRange.to),
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
  if (firebaseInitializationError || !db) {
    console.warn("Firestore not available. Using mock data for getUserById.");
    return mockUsers.find(user => user.id === id);
  }
  try {
    const userDocRef = doc(db, "users", id);
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
      return mapDocToUser(userSnap);
    }
    console.log(`No user profile found in Firestore for ID: ${id}. Checking mock data.`);
    return mockUsers.find(user => user.id === id); // Fallback to mock if not in DB
  } catch (error) {
    console.error("Error fetching user by ID from Firestore, using mock data:", error);
    return mockUsers.find(user => user.id === id);
  }
};

export const createUserProfile = async (userId: string, email: string, name?: string): Promise<User> => {
  const profileData: User = {
    id: userId,
    email: email,
    name: name || email.split('@')[0],
    avatarUrl: `https://placehold.co/100x100.png?text=${(name || email.split('@')[0] || 'U').charAt(0).toUpperCase()}`,
    subscriptionStatus: 'free',
    createdAt: new Date(),
    bio: "Welcome to LandShare Connect!",
  };

  if (firebaseInitializationError || !db) {
    console.warn("Firestore not available. Adding user to mock data.");
    const existingUserIndex = mockUsers.findIndex(u => u.id === userId);
    if (existingUserIndex !== -1) {
      mockUsers[existingUserIndex] = { ...mockUsers[existingUserIndex], ...profileData };
    } else {
      mockUsers.push(profileData);
    }
    return Promise.resolve(profileData);
  }

  try {
    const userDocRef = doc(db, "users", userId);
    // Convert JS Date to Firestore Timestamp for storage
    const firestoreProfileData = {
        ...profileData,
        createdAt: Timestamp.fromDate(profileData.createdAt as Date)
    };
    await setDoc(userDocRef, firestoreProfileData, { merge: true }); // Use merge to avoid overwriting existing fields unintentionally

    const newUserSnap = await getDoc(userDocRef);
    if (newUserSnap.exists()) {
        return mapDocToUser(newUserSnap);
    }
    throw new Error("Failed to retrieve newly created user profile from Firestore.");
  } catch (error) {
    console.error("Error creating user profile in Firestore, adding to mock data as fallback:", error);
    const existingUserIndex = mockUsers.findIndex(u => u.id === userId);
     if (existingUserIndex !== -1) {
      mockUsers[existingUserIndex] = { ...mockUsers[existingUserIndex], ...profileData };
    } else {
      mockUsers.push(profileData);
    }
    return Promise.resolve(profileData); // Fallback: still "succeed" with mock data
  }
};

// --- LISTINGS ---
export const getListings = async (): Promise<Listing[]> => {
  if (firebaseInitializationError || !db) {
    console.warn("Firestore not available. Using mock data for listings.");
    // Sort mockListings to simulate boosted behavior
    return [...mockListings].sort((a, b) => {
        if (a.isBoosted && !b.isBoosted) return -1;
        if (!a.isBoosted && b.isBoosted) return 1;
        // @ts-ignore
        return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }
  try {
    const listingsCol = collection(db, "listings");
    const q = query(listingsCol, orderBy("createdAt", "desc"));
    const listingSnapshot = await getDocs(q);
    const allListings = listingSnapshot.docs.map(mapDocToListing);
    allListings.sort((a, b) => {
        if (a.isBoosted && !b.isBoosted) return -1;
        if (!a.isBoosted && b.isBoosted) return 1;
        return 0; 
    });
    return allListings;
  } catch (error) {
    console.error("Error fetching listings from Firestore, using mock data:", error);
    return [...mockListings].sort((a, b) => {
        if (a.isBoosted && !b.isBoosted) return -1;
        if (!a.isBoosted && b.isBoosted) return 1;
        // @ts-ignore
        return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }
};

export const getListingsByLandownerCount = async (landownerId: string): Promise<number> => {
  if (firebaseInitializationError || !db) {
    console.warn("Firestore not available. Counting mock listings for landowner.");
    return mockListings.filter(l => l.landownerId === landownerId).length;
  }
  try {
    const listingsCol = collection(db, "listings");
    const q = query(listingsCol, where("landownerId", "==", landownerId));
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  } catch (error) {
    console.error("Error fetching listings count from Firestore, counting mock listings:", error);
    return mockListings.filter(l => l.landownerId === landownerId).length;
  }
};

export const getListingById = async (id: string): Promise<Listing | undefined> => {
  if (firebaseInitializationError || !db) {
    console.warn("Firestore not available. Using mock data for getListingById.");
    return mockListings.find(listing => listing.id === id);
  }
  try {
    const listingDocRef = doc(db, "listings", id);
    const listingSnap = await getDoc(listingDocRef);
    if (listingSnap.exists()) {
      return mapDocToListing(listingSnap);
    }
    return mockListings.find(listing => listing.id === id); // Fallback
  } catch (error) {
    console.error("Error fetching listing by ID from Firestore, using mock data:", error);
    return mockListings.find(listing => listing.id === id);
  }
};

export const addListing = async (
  data: Pick<Listing, 'title' | 'description' | 'location' | 'sizeSqft' | 'pricePerMonth' | 'amenities' | 'images' | 'leaseTerm' | 'minLeaseDurationMonths'>,
  landownerId: string,
  isLandownerPremium: boolean = false
): Promise<Listing> => {
  const newListingData: Listing = {
    id: `mock-listing-${Date.now()}-${Math.random().toString(16).slice(2)}`, // Mock ID
    ...data,
    landownerId: landownerId,
    isAvailable: true,
    images: data.images && data.images.length > 0 ? data.images : [`https://placehold.co/800x600.png?text=${encodeURIComponent(data.title.substring(0,15))}`,"https://placehold.co/400x300.png?text=View+1", "https://placehold.co/400x300.png?text=View+2"],
    rating: 0,
    numberOfRatings: 0,
    isBoosted: isLandownerPremium,
    createdAt: new Date(),
  };

  if (firebaseInitializationError || !db) {
    console.warn("Firestore not available. Adding listing to mock data.");
    mockListings.unshift(newListingData); // Add to the beginning for recent listings
    return Promise.resolve(newListingData);
  }

  try {
    const listingsCol = collection(db, "listings");
    const firestoreData = {
        ...newListingData,
        createdAt: Timestamp.fromDate(newListingData.createdAt as Date), // Convert to Firestore Timestamp
        id: undefined, // Firestore will generate ID
    };
    delete firestoreData.id; // Ensure id is not sent to Firestore if it expects auto-generation

    const docRef = await addDoc(listingsCol, firestoreData);
    const newDocSnap = await getDoc(docRef);
    if (newDocSnap.exists()){
         return mapDocToListing(newDocSnap);
    } else {
        throw new Error("Failed to retrieve newly created listing from Firestore.");
    }
  } catch (error) {
    console.error("Error adding listing to Firestore, adding to mock data as fallback:", error);
    mockListings.unshift(newListingData);
    return Promise.resolve(newListingData);
  }
};

export const deleteListing = async (listingId: string): Promise<boolean> => {
  if (firebaseInitializationError || !db) {
    console.warn("Firestore not available. Deleting listing from mock data.");
    const initialLength = mockListings.length;
    mockListings = mockListings.filter(l => l.id !== listingId);
    // Also remove related mock bookings and reviews
    mockBookings = mockBookings.filter(b => b.listingId !== listingId);
    mockReviews = mockReviews.filter(r => r.listingId !== listingId);
    return Promise.resolve(mockListings.length < initialLength);
  }

  try {
    const batch = writeBatch(db);
    const listingDocRef = doc(db, "listings", listingId);
    batch.delete(listingDocRef);

    const bookingsQuery = query(collection(db, "bookings"), where("listingId", "==", listingId));
    const bookingsSnapshot = await getDocs(bookingsQuery);
    bookingsSnapshot.docs.forEach(docSnap => batch.delete(docSnap.ref));

    const reviewsQuery = query(collection(db, "reviews"), where("listingId", "==", listingId));
    const reviewsSnapshot = await getDocs(reviewsQuery);
    reviewsSnapshot.docs.forEach(docSnap => batch.delete(docSnap.ref));

    await batch.commit();
    return true;
  } catch (error) {
    console.error("Error deleting listing from Firestore:", error);
    // Attempt mock deletion as fallback if desired, or just return false
    const initialLength = mockListings.length;
    mockListings = mockListings.filter(l => l.id !== listingId);
    mockBookings = mockBookings.filter(b => b.listingId !== listingId);
    mockReviews = mockReviews.filter(r => r.listingId !== listingId);
    return Promise.resolve(mockListings.length < initialLength);
  }
};

// --- REVIEWS ---
export const getReviewsForListing = async (listingId: string): Promise<Review[]> => {
  if (firebaseInitializationError || !db) {
    console.warn("Firestore not available. Using mock data for reviews.");
    return mockReviews.filter(review => review.listingId === listingId)
        // @ts-ignore
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
  try {
    const reviewsCol = collection(db, "reviews");
    const q = query(reviewsCol, where("listingId", "==", listingId), orderBy("createdAt", "desc"));
    const reviewSnapshot = await getDocs(q);
    return reviewSnapshot.docs.map(mapDocToReview);
  } catch (error) {
    console.error("Error fetching reviews from Firestore, using mock data:", error);
    return mockReviews.filter(review => review.listingId === listingId)
        // @ts-ignore
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
};

export const addReview = async (
  listingId: string,
  userId: string,
  rating: number,
  comment: string
): Promise<Review> => {
  const newReview: Review = {
    id: `mock-review-${Date.now()}`,
    listingId,
    userId,
    rating,
    comment,
    createdAt: new Date(),
  };

  if (firebaseInitializationError || !db) {
    console.warn("Firestore not available. Adding review to mock data.");
    mockReviews.unshift(newReview);
    // Optionally update listing's mock rating
    const listing = mockListings.find(l => l.id === listingId);
    if (listing) {
        const totalRating = (listing.rating || 0) * (listing.numberOfRatings || 0) + rating;
        listing.numberOfRatings = (listing.numberOfRatings || 0) + 1;
        listing.rating = totalRating / listing.numberOfRatings;
    }
    return Promise.resolve(newReview);
  }

  try {
    const reviewsCol = collection(db, "reviews");
    const firestoreReviewData = {
        ...newReview,
        createdAt: Timestamp.fromDate(newReview.createdAt as Date),
        id: undefined, // Firestore will generate ID
    };
    delete firestoreReviewData.id;

    const docRef = await addDoc(reviewsCol, firestoreReviewData);
    
    // Transactionally update listing rating
    const listingRef = doc(db, "listings", listingId);
    const listingSnap = await getDoc(listingRef);
    if (listingSnap.exists()) {
        const listingData = listingSnap.data();
        const currentRating = listingData.rating || 0;
        const currentNumRatings = listingData.numberOfRatings || 0;
        const newNumRatings = currentNumRatings + 1;
        const newTotalRating = currentRating * currentNumRatings + rating;
        const newAvgRating = newTotalRating / newNumRatings;
        await updateDoc(listingRef, {
            rating: newAvgRating,
            numberOfRatings: newNumRatings,
        });
    }
    
    const newDocSnap = await getDoc(docRef);
    if (newDocSnap.exists()){
        return mapDocToReview(newDocSnap);
    } else {
        throw new Error("Failed to retrieve newly created review from Firestore.");
    }
  } catch (error) {
    console.error("Error adding review to Firestore, adding to mock data as fallback:", error);
    mockReviews.unshift(newReview);
    return Promise.resolve(newReview);
  }
};

// --- BOOKINGS ---
const populateBookingDetailsMock = async (booking: Booking): Promise<Booking> => {
    const listing = mockListings.find(l => l.id === booking.listingId);
    const renter = mockUsers.find(u => u.id === booking.renterId);
    const landowner = mockUsers.find(u => u.id === booking.landownerId);
    return {
        ...booking,
        listingTitle: listing?.title || `Listing: ${booking.listingId.substring(0,6)}...`,
        renterName: renter?.name || `Renter: ${booking.renterId.substring(0,6)}...`,
        landownerName: landowner?.name || `Owner: ${booking.landownerId.substring(0,6)}...`,
    };
};
const populateBookingDetailsFirestore = async (booking: Booking): Promise<Booking> => {
    let listingTitle: string | undefined;
    let renterName: string | undefined;
    let landownerName: string | undefined;

    try {
        const listing = await getListingById(booking.listingId); // Uses the main getListingById which has its own fallback
        listingTitle = listing?.title;
    } catch (e) { console.error(`Failed to get listing ${booking.listingId}`, e); }

    try {
        const renter = await getUserById(booking.renterId); // Uses the main getUserById
        renterName = renter?.name;
    } catch (e) { console.error(`Failed to get renter ${booking.renterId}`, e); }

    try {
        const landowner = await getUserById(booking.landownerId); // Uses the main getUserById
        landownerName = landowner?.name;
    } catch (e) { console.error(`Failed to get landowner ${booking.landownerId}`, e); }

    return {
        ...booking,
        listingTitle: listingTitle || `Listing: ${booking.listingId.substring(0,6)}...`,
        renterName: renterName || `Renter: ${booking.renterId.substring(0,6)}...`,
        landownerName: landownerName || `Owner: ${booking.landownerId.substring(0,6)}...`,
    };
};

export const getBookingsForUser = async (userId: string): Promise<Booking[]> => {
  if (firebaseInitializationError || !db) {
    console.warn("Firestore not available. Using mock data for bookings.");
    const userBookings = mockBookings.filter(b => b.renterId === userId || b.landownerId === userId)
        // @ts-ignore
        .sort((a,b) => new Date(b.dateRange.from) - new Date(a.dateRange.from));
    return Promise.all(userBookings.map(populateBookingDetailsMock));
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
    return Promise.all(bookings.map(populateBookingDetailsFirestore));
  } catch (error) {
    console.error("Error fetching bookings from Firestore, using mock data:", error);
    const userBookings = mockBookings.filter(b => b.renterId === userId || b.landownerId === userId)
        // @ts-ignore
        .sort((a,b) => new Date(b.dateRange.from) - new Date(a.dateRange.from));
    return Promise.all(userBookings.map(populateBookingDetailsMock));
  }
};

export const addBookingRequest = async (
  data: Omit<Booking, 'id' | 'status' | 'listingTitle' | 'landownerName' | 'renterName' | 'createdAt'> & {dateRange: {from: Date; to: Date}}
): Promise<Booking> => {
  
  let landownerIdToUse = data.landownerId; // Will be overwritten if using Firestore and fetching listing
  if (firebaseInitializationError || !db) {
     const listing = mockListings.find(l => l.id === data.listingId);
     if (!listing) throw new Error("Mock listing not found for booking request.");
     landownerIdToUse = listing.landownerId;
  }


  const newBooking: Booking = {
    id: `mock-booking-${Date.now()}`,
    ...data,
    landownerId: landownerIdToUse,
    status: 'Pending Confirmation',
    createdAt: new Date(),
  };

  if (firebaseInitializationError || !db) {
    console.warn("Firestore not available. Adding booking request to mock data.");
    mockBookings.unshift(newBooking);
    return populateBookingDetailsMock(newBooking);
  }

  try {
    const listingSnap = await getDoc(doc(db, "listings", data.listingId));
    if (!listingSnap.exists()) {
        throw new Error("Listing not found for booking request (Firestore).");
    }
    const listingData = listingSnap.data();
    landownerIdToUse = listingData.landownerId;

    const bookingsCol = collection(db, "bookings");
    const firestoreBookingData = {
      listingId: data.listingId,
      renterId: data.renterId,
      landownerId: landownerIdToUse,
      status: 'Pending Confirmation' as Booking['status'],
      dateRange: {
        from: Timestamp.fromDate(data.dateRange.from),
        to: Timestamp.fromDate(data.dateRange.to),
      },
      createdAt: Timestamp.fromDate(newBooking.createdAt as Date),
    };
    const docRef = await addDoc(bookingsCol, firestoreBookingData);
    const newDocSnap = await getDoc(docRef);
    if (newDocSnap.exists()){
        const createdBooking = mapDocToBooking(newDocSnap);
        return populateBookingDetailsFirestore(createdBooking);
    } else {
        throw new Error("Failed to retrieve newly created booking request from Firestore.");
    }
  } catch (error) {
    console.error("Error adding booking request to Firestore, adding to mock data as fallback:", error);
    // Ensure landownerId is from the mock listing if it failed before
    const listing = mockListings.find(l => l.id === data.listingId);
    newBooking.landownerId = listing ? listing.landownerId : data.landownerId;
    mockBookings.unshift(newBooking);
    return populateBookingDetailsMock(newBooking);
  }
};

export const updateBookingStatus = async (bookingId: string, status: Booking['status']): Promise<Booking | undefined> => {
  if (firebaseInitializationError || !db) {
    console.warn("Firestore not available. Updating booking status in mock data.");
    const bookingIndex = mockBookings.findIndex(b => b.id === bookingId);
    if (bookingIndex !== -1) {
      mockBookings[bookingIndex].status = status;
      return populateBookingDetailsMock(mockBookings[bookingIndex]);
    }
    return undefined;
  }

  try {
    const bookingDocRef = doc(db, "bookings", bookingId);
    await updateDoc(bookingDocRef, { status: status });
    const updatedSnap = await getDoc(bookingDocRef);
    if (updatedSnap.exists()) {
      const updatedBooking = mapDocToBooking(updatedSnap);
      return populateBookingDetailsFirestore(updatedBooking);
    }
    return undefined;
  } catch (error) {
    console.error("Error updating booking status in Firestore, attempting mock update:", error);
    const bookingIndex = mockBookings.findIndex(b => b.id === bookingId);
    if (bookingIndex !== -1) {
      mockBookings[bookingIndex].status = status;
      return populateBookingDetailsMock(mockBookings[bookingIndex]);
    }
    return undefined;
  }
};


export const updateUserProfile = async (userId: string, data: Partial<Pick<User, 'name' | 'bio' | 'avatarUrl'>>): Promise<User | undefined> => {
    if (firebaseInitializationError || !db) {
        console.warn("Firestore not available. Updating user profile in mock data.");
        const userIndex = mockUsers.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            mockUsers[userIndex] = { ...mockUsers[userIndex], ...data };
            return mockUsers[userIndex];
        }
        return undefined;
    }
    try {
        const userDocRef = doc(db, "users", userId);
        await updateDoc(userDocRef, data); // Firestore handles partial updates
        const updatedSnap = await getDoc(userDocRef);
        if (updatedSnap.exists()) {
            return mapDocToUser(updatedSnap);
        }
        return undefined;
    } catch (error) {
        console.error("Error updating user profile in Firestore, attempting mock update:", error);
        const userIndex = mockUsers.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            mockUsers[userIndex] = { ...mockUsers[userIndex], ...data };
            return mockUsers[userIndex];
        }
        return undefined;
    }
};
