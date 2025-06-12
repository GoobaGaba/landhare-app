
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
import type { User, Listing, Booking, Review, SubscriptionStatus, PricingModel } from './types';

export const FREE_TIER_LISTING_LIMIT = 2; // Updated as per previous discussion if listing form allows more.

let mockUsers: User[] = [
  {
    id: 'mock-user-uid-12345',
    name: 'Mock UI Tester',
    email: 'mocktester@example.com',
    avatarUrl: 'https://placehold.co/100x100.png?text=MT',
    subscriptionStatus: 'premium',
    createdAt: new Date('2023-01-01T10:00:00Z'),
    bio: 'I am the main mock user for testing purposes with premium status.',
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
    description: 'A beautiful sunny meadow, perfect for sustainable living. Flat land, easy access. Great for gardens.',
    location: 'Boulder, CO',
    sizeSqft: 5000,
    amenities: ['water hookup', 'road access', 'pet friendly', 'fenced'],
    pricingModel: 'monthly',
    price: 350,
    images: ['https://placehold.co/800x600.png?text=Sunny+Meadow', 'https://placehold.co/400x300.png?text=Meadow+View+1', 'https://placehold.co/400x300.png?text=Meadow+View+2'],
    landownerId: 'landowner-jane-doe',
    isAvailable: true,
    rating: 4.8,
    numberOfRatings: 15,
    leaseTerm: 'long-term',
    minLeaseDurationMonths: 6,
    isBoosted: false,
    createdAt: new Date('2024-07-01T10:00:00Z'),
  },
  {
    id: 'listing-2-forest-retreat',
    title: 'Forest Retreat Lot (Monthly)',
    description: 'Secluded lot in a dense forest. Ideal for off-grid enthusiasts. Some clearing needed. Very private.',
    location: 'Asheville, NC',
    sizeSqft: 12000,
    amenities: ['septic system', 'fenced', 'fire pit'],
    pricingModel: 'monthly',
    price: 200,
    images: ['https://placehold.co/800x600.png?text=Forest+Retreat', 'https://placehold.co/400x300.png?text=Forest+View+1'],
    landownerId: 'mock-user-uid-12345', // Premium user listing
    isAvailable: true,
    rating: 4.2,
    numberOfRatings: 8,
    leaseTerm: 'flexible',
    isBoosted: true,
    createdAt: new Date('2024-06-15T14:30:00Z'),
  },
  {
    id: 'listing-3-desert-oasis',
    title: 'Desert Oasis Spot (Short-term Monthly)',
    description: 'Expansive desert views with stunning sunsets. Requires water hauling. Power access nearby. Stargazing paradise.',
    location: 'Sedona, AZ',
    sizeSqft: 25000,
    amenities: ['power access', 'road access'],
    pricingModel: 'monthly',
    price: 150,
    images: ['https://placehold.co/800x600.png?text=Desert+Oasis'],
    landownerId: 'landowner-jane-doe',
    isAvailable: true,
    rating: 4.5,
    numberOfRatings: 10,
    leaseTerm: 'short-term',
    minLeaseDurationMonths: 1,
    isBoosted: false,
    createdAt: new Date('2024-05-01T10:00:00Z'),
  },
   {
    id: 'listing-4-riverside-haven',
    title: 'Riverside Haven - Monthly Lease',
    description: 'Peaceful plot by a gentle river. Great for nature lovers. Seasonal access. Monthly lease available for fishing cabin.',
    location: 'Missoula, MT',
    sizeSqft: 7500,
    amenities: ['water hookup', 'fire pit', 'lake access', 'pet friendly'],
    pricingModel: 'monthly',
    price: 400,
    images: ['https://placehold.co/800x600.png?text=Riverside+Haven', 'https://placehold.co/400x300.png?text=River+View'],
    landownerId: 'mock-user-uid-12345', // Premium user listing
    isAvailable: true,
    rating: 4.9,
    numberOfRatings: 22,
    leaseTerm: 'long-term',
    minLeaseDurationMonths: 12,
    isBoosted: true,
    createdAt: new Date('2024-07-10T10:00:00Z'), // Very recent
  },
  {
    id: 'listing-5-cozy-rv-spot',
    title: 'Cozy RV Spot by the Lake (Nightly)',
    description: 'Perfect nightly getaway for your RV. Includes full hookups and stunning lake views. Min 2 nights. Book your escape!',
    location: 'Lake Tahoe, CA',
    sizeSqft: 1500,
    amenities: ['water hookup', 'power access', 'wifi available', 'pet friendly', 'lake access', 'septic system'],
    pricingModel: 'nightly',
    price: 45,
    images: ['https://placehold.co/800x600.png?text=RV+Lake+Spot', 'https://placehold.co/400x300.png?text=Lake+Sunset'],
    landownerId: 'landowner-jane-doe',
    isAvailable: true,
    rating: 4.7,
    numberOfRatings: 12,
    isBoosted: false,
    leaseTerm: 'short-term',
    createdAt: new Date('2024-06-01T09:00:00Z'),
  },
  {
    id: 'listing-6-mountain-homestead-lto',
    title: 'Mountain Homestead - Lease to Own!',
    description: 'Your chance to own a piece of the mountains! This spacious lot is offered with a lease-to-own option. Build your dream cabin or sustainable farm. Terms negotiable.',
    location: 'Boone, NC',
    sizeSqft: 45000, // 1 acre+
    amenities: ['road access', 'septic system' ], // Assume septic is available or perk test done
    pricingModel: 'lease-to-own',
    price: 650,
    leaseToOwnDetails: "5-year lease-to-own program. $5,000 down payment. Estimated monthly payment of $650 (PITI estimate). Final purchase price: $75,000. Subject to credit approval and LTO agreement. Owner financing available.",
    images: ['https://placehold.co/800x600.png?text=Mountain+LTO', 'https://placehold.co/400x300.png?text=Creek+Nearby', 'https://placehold.co/400x300.png?text=Site+Plan'],
    landownerId: 'mock-user-uid-12345', // Premium user listing
    isAvailable: true,
    rating: 4.3,
    numberOfRatings: 5,
    isBoosted: true,
    leaseTerm: 'long-term',
    minLeaseDurationMonths: 60,
    createdAt: new Date('2024-05-15T11:00:00Z'),
  },
  {
    id: 'listing-7-basic-rural-plot',
    title: 'Basic Rural Plot - Affordable Monthly!',
    description: 'A very basic, undeveloped plot of land in a quiet rural area. No frills, just space. Perfect for raw land camping (check local ordinances) or a very simple, self-contained setup.',
    location: 'Rural Plains, KS',
    sizeSqft: 22000, // Roughly half acre
    amenities: [],
    pricingModel: 'monthly',
    price: 75,
    images: ['https://placehold.co/800x600.png?text=Basic+Plot'],
    landownerId: 'landowner-jane-doe',
    isAvailable: true,
    rating: 2.5,
    numberOfRatings: 2,
    isBoosted: false,
    leaseTerm: 'flexible',
    createdAt: new Date('2024-04-01T16:00:00Z'),
  },
  {
    id: 'listing-8-premium-view-lot-rented',
    title: 'Premium View Lot (Currently Rented)',
    description: 'Unobstructed ocean views from this premium lot. Currently under a long-term lease. Not available for new bookings.',
    location: 'Big Sur, CA',
    sizeSqft: 10000,
    amenities: ['power access', 'water hookup', 'fenced', 'wifi available', 'septic system'],
    pricingModel: 'monthly',
    price: 1200,
    images: ['https://placehold.co/800x600.png?text=Rented+View+Lot'],
    landownerId: 'mock-user-uid-12345', // Premium user listing
    isAvailable: false,
    rating: 4.9,
    numberOfRatings: 35,
    isBoosted: true, // Still boosted even if rented to show in "My Listings" for premium user
    leaseTerm: 'long-term',
    minLeaseDurationMonths: 12,
    createdAt: new Date('2023-08-10T12:00:00Z'), // Older listing
  }
];

let mockBookings: Booking[] = [
  {
    id: 'booking-1',
    listingId: 'listing-1-sunny-meadow',
    listingTitle: 'Sunny Meadow Plot',
    renterId: 'renter-john-smith',
    renterName: 'John Smith',
    landownerId: 'landowner-jane-doe',
    landownerName: 'Jane Doe',
    status: 'Confirmed',
    dateRange: { from: new Date('2024-01-01'), to: new Date('2024-06-30') },
    createdAt: new Date('2023-12-15T10:00:00Z'),
  },
  {
    id: 'booking-2',
    listingId: 'listing-2-forest-retreat',
    listingTitle: 'Forest Retreat Lot (Monthly)',
    renterId: 'renter-john-smith',
    renterName: 'John Smith',
    landownerId: 'mock-user-uid-12345',
    landownerName: 'Mock UI Tester',
    status: 'Pending Confirmation',
    dateRange: { from: new Date('2024-08-01'), to: new Date('2024-09-01') },
    createdAt: new Date('2024-07-20T11:00:00Z'),
  },
  {
    id: 'booking-3',
    listingId: 'listing-1-sunny-meadow',
    listingTitle: 'Sunny Meadow Plot',
    renterId: 'mock-user-uid-12345',
    renterName: 'Mock UI Tester',
    landownerId: 'landowner-jane-doe',
    landownerName: 'Jane Doe',
    status: 'Declined',
    dateRange: { from: new Date('2024-07-01'), to: new Date('2024-08-01') },
    createdAt: new Date('2024-06-25T12:00:00Z'),
  },
  {
    id: 'booking-4-nightly',
    listingId: 'listing-5-cozy-rv-spot',
    listingTitle: 'Cozy RV Spot by the Lake (Nightly)',
    renterId: 'renter-john-smith',
    renterName: 'John Smith',
    landownerId: 'landowner-jane-doe',
    landownerName: 'Jane Doe',
    status: 'Confirmed',
    dateRange: { from: new Date('2024-07-10'), to: new Date('2024-07-15') }, // 5 nights
    createdAt: new Date('2024-06-01T10:00:00Z'),
  },
  {
    id: 'booking-5-lto-pending',
    listingId: 'listing-6-mountain-homestead-lto',
    listingTitle: 'Mountain Homestead - Lease to Own!',
    renterId: 'renter-john-smith',
    renterName: 'John Smith',
    landownerId: 'mock-user-uid-12345',
    landownerName: 'Mock UI Tester',
    status: 'Pending Confirmation', // LTO inquiries also start as pending
    dateRange: { from: new Date('2024-09-01'), to: new Date('2029-08-31') }, // 5 year LTO
    createdAt: new Date('2024-07-25T10:00:00Z'),
  },
  {
    id: 'booking-6-mockuser-pending',
    listingId: 'listing-1-sunny-meadow',
    listingTitle: 'Sunny Meadow Plot',
    renterId: 'mock-user-uid-12345', // Mock user is the renter
    renterName: 'Mock UI Tester',
    landownerId: 'landowner-jane-doe', // Jane Doe is landowner
    landownerName: 'Jane Doe',
    status: 'Pending Confirmation',
    dateRange: { from: new Date('2024-10-01'), to: new Date('2024-10-15') }, // 15 days for monthly listing
    createdAt: new Date('2024-07-28T11:00:00Z'),
  },
];

let mockReviews: Review[] = [
  {
    id: 'review-1',
    listingId: 'listing-1-sunny-meadow',
    userId: 'renter-john-smith',
    userName: 'John Smith',
    rating: 5,
    comment: 'Absolutely loved this spot! Jane was a great host. The meadow is beautiful and well-kept.',
    createdAt: new Date('2023-07-01T10:00:00Z'),
  },
  {
    id: 'review-2',
    listingId: 'listing-2-forest-retreat',
    userId: 'landowner-jane-doe', // Jane reviewing Mock Tester's listing
    userName: 'Jane Doe',
    rating: 4,
    comment: 'Nice and secluded, a bit rough around the edges but has potential. Mock Tester was responsive.',
    createdAt: new Date('2023-12-01T11:00:00Z'),
  },
  {
    id: 'review-3-nightly',
    listingId: 'listing-5-cozy-rv-spot',
    userId: 'renter-john-smith',
    userName: 'John Smith',
    rating: 5,
    comment: 'Amazing RV spot, beautiful views and all hookups worked perfectly. Will be back!',
    createdAt: new Date('2024-07-16T10:00:00Z'),
  },
  {
    id: 'review-4-lto',
    listingId: 'listing-6-mountain-homestead-lto',
    userId: 'renter-john-smith', // John Smith inquiring about LTO
    userName: 'John Smith',
    rating: 4, // Rating the interaction/info phase for LTO
    comment: 'Interesting LTO option. Land is raw but promising. Landowner (Mock Tester) was helpful with initial info.',
    createdAt: new Date('2024-05-01T10:00:00Z'),
  },
  {
    id: 'review-5-basic',
    listingId: 'listing-7-basic-rural-plot',
    userId: 'mock-user-uid-12345', // Mock tester reviewing basic plot
    userName: 'Mock UI Tester',
    rating: 2,
    comment: 'It truly is basic, but the price was right for what it is. No surprises. Good for minimalists.',
    createdAt: new Date('2024-06-10T10:00:00Z'),
  },
  {
    id: 'review-6-riverside',
    listingId: 'listing-4-riverside-haven',
    userId: 'landowner-jane-doe',
    userName: 'Jane Doe',
    rating: 5,
    comment: 'A truly fantastic spot for a long-term lease. Host was accommodating. River access is a huge plus.',
    createdAt: new Date('2024-07-15T10:00:00Z'),
  },
];


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

const mapDocToListing = (docSnap: any): Listing => {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    title: data.title,
    description: data.description,
    location: data.location,
    sizeSqft: data.sizeSqft,
    amenities: data.amenities || [],
    pricingModel: data.pricingModel || 'monthly',
    price: data.price !== undefined ? data.price : (data.pricePerMonth || 0), // Handle legacy pricePerMonth
    leaseToOwnDetails: data.leaseToOwnDetails,
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
    listingTitle: data.listingTitle, // Will be populated by populateBookingDetails
    renterName: data.renterName,     // Will be populated by populateBookingDetails
    landownerName: data.landownerName, // Will be populated by populateBookingDetails
  };
};

const mapDocToReview = (docSnap: any): Review => {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    listingId: data.listingId,
    userId: data.userId,
    userName: data.userName,
    rating: data.rating,
    comment: data.comment,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
  };
};

export const getUserById = async (id: string): Promise<User | undefined> => {
  if (firebaseInitializationError || !db) {
    return mockUsers.find(user => user.id === id);
  }
  try {
    const userDocRef = doc(db, "users", id);
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
      return mapDocToUser(userSnap);
    }
    // Fallback for dev if not found in Firestore but exists in mock (e.g. during initial setup)
    const mockUser = mockUsers.find(user => user.id === id);
    if (mockUser) return mockUser;
    return undefined;
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
    bio: "Welcome to LandShare!",
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
    const firestoreProfileData = {
        ...profileData,
        createdAt: Timestamp.fromDate(profileData.createdAt as Date)
    };
    await setDoc(userDocRef, firestoreProfileData, { merge: true });

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
    return Promise.resolve(profileData);
  }
};

export const updateUserProfile = async (userId: string, data: Partial<User>): Promise<User | undefined> => {
    if (firebaseInitializationError || !db) {
        console.warn("Firestore not available. Updating user profile in mock data for user:", userId);
        const userIndex = mockUsers.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            mockUsers[userIndex] = { ...mockUsers[userIndex], ...data };
            // Special handling for subscriptionStatus if it's in data
            if (data.subscriptionStatus) {
                mockUsers[userIndex].subscriptionStatus = data.subscriptionStatus;
            }
            return Promise.resolve(mockUsers[userIndex]);
        }
        return Promise.resolve(undefined);
    }
    try {
        const userDocRef = doc(db, "users", userId);
        const firestoreData: any = { ...data };
        if (firestoreData.createdAt && firestoreData.createdAt instanceof Date) {
            firestoreData.createdAt = Timestamp.fromDate(firestoreData.createdAt);
        }

        if (firestoreData.id) delete firestoreData.id; // Don't try to update the ID field itself

        await updateDoc(userDocRef, firestoreData);
        const updatedSnap = await getDoc(userDocRef);
        if (updatedSnap.exists()) {
            return mapDocToUser(updatedSnap);
        }
        return undefined;
    } catch (error) {
        console.error("Error updating user profile in Firestore for user:", userId, error);
        console.warn("Attempting mock update as fallback for user:", userId);
        const userIndex = mockUsers.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            mockUsers[userIndex] = { ...mockUsers[userIndex], ...data };
             if (data.subscriptionStatus) { // Ensure mock also updates this directly
                mockUsers[userIndex].subscriptionStatus = data.subscriptionStatus;
            }
            return Promise.resolve(mockUsers[userIndex]);
        }
        return Promise.resolve(undefined);
    }
};

export const getListings = async (): Promise<Listing[]> => {
  if (firebaseInitializationError || !db) {
    console.warn("Firestore not available. Using mock data for listings.");
    return [...mockListings].sort((a, b) => {
        if (a.isBoosted && !b.isBoosted) return -1;
        if (!a.isBoosted && b.isBoosted) return 1;
        const timeA = a.createdAt instanceof Date ? a.createdAt.getTime() : (a.createdAt as Timestamp)?.seconds * 1000 || 0;
        const timeB = b.createdAt instanceof Date ? b.createdAt.getTime() : (b.createdAt as Timestamp)?.seconds * 1000 || 0;
        return timeB - timeA;
    });
  }
  try {
    const listingsCol = collection(db, "listings");
    // Order by isBoosted first (true comes before false with desc), then by createdAt
    const q = query(listingsCol, orderBy("isBoosted", "desc"), orderBy("createdAt", "desc"));
    const listingSnapshot = await getDocs(q);
    return listingSnapshot.docs.map(mapDocToListing);
  } catch (error) {
    console.error("Error fetching listings from Firestore, using mock data:", error);
    return [...mockListings].sort((a, b) => {
        if (a.isBoosted && !b.isBoosted) return -1;
        if (!a.isBoosted && b.isBoosted) return 1;
        const timeA = a.createdAt instanceof Date ? a.createdAt.getTime() : (a.createdAt as Timestamp)?.seconds * 1000 || 0;
        const timeB = b.createdAt instanceof Date ? b.createdAt.getTime() : (b.createdAt as Timestamp)?.seconds * 1000 || 0;
        return timeB - timeA;
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
    return mockListings.find(listing => listing.id === id);
  }
  try {
    const listingDocRef = doc(db, "listings", id);
    const listingSnap = await getDoc(listingDocRef);
    if (listingSnap.exists()) {
      return mapDocToListing(listingSnap);
    }
    return mockListings.find(listing => listing.id === id);
  } catch (error) {
    console.error("Error fetching listing by ID from Firestore, using mock data:", error);
    return mockListings.find(listing => listing.id === id);
  }
};

export const addListing = async (
  data: Pick<Listing, 'title' | 'description' | 'location' | 'sizeSqft' | 'price' | 'pricingModel' | 'leaseToOwnDetails' | 'amenities' | 'images' | 'leaseTerm' | 'minLeaseDurationMonths'>,
  landownerId: string,
  isLandownerPremium: boolean = false
): Promise<Listing> => {
  const newListingData: Listing = {
    id: `mock-listing-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    ...data,
    landownerId: landownerId,
    isAvailable: true,
    images: data.images && data.images.length > 0 ? data.images : [`https://placehold.co/800x600.png?text=${encodeURIComponent(data.title.substring(0,15))}`,"https://placehold.co/400x300.png?text=View+1", "https://placehold.co/400x300.png?text=View+2"],
    rating: undefined, // New listings start with no rating
    numberOfRatings: 0,
    isBoosted: isLandownerPremium,
    createdAt: new Date(),
  };

  if (firebaseInitializationError || !db) {
    console.warn("Firestore not available. Adding listing to mock data.");
    mockListings.unshift(newListingData); // Add to beginning to appear as recent
    return Promise.resolve(newListingData);
  }

  try {
    const listingsCol = collection(db, "listings");
    const firestoreData: any = {
        ...newListingData,
        createdAt: Timestamp.fromDate(newListingData.createdAt as Date),
    };
    delete firestoreData.id; // Firestore generates its own ID

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
    const initialLength = mockListings.length;
    mockListings = mockListings.filter(l => l.id !== listingId);
    mockBookings = mockBookings.filter(b => b.listingId !== listingId);
    mockReviews = mockReviews.filter(r => r.listingId !== listingId);
    return Promise.resolve(mockListings.length < initialLength);
  }
};

export const getReviewsForListing = async (listingId: string): Promise<Review[]> => {
  if (firebaseInitializationError || !db) {
    const listingReviews = mockReviews.filter(review => review.listingId === listingId)
        .sort((a, b) => {
          const timeA = a.createdAt instanceof Date ? a.createdAt.getTime() : (a.createdAt as Timestamp)?.seconds * 1000 || 0;
          const timeB = b.createdAt instanceof Date ? b.createdAt.getTime() : (b.createdAt as Timestamp)?.seconds * 1000 || 0;
          return timeB - timeA;
        });
    return Promise.all(listingReviews.map(async (review) => {
        const user = await getUserById(review.userId);
        return {...review, userName: user?.name || `User...${review.userId.slice(-4)}` };
    }));
  }
  try {
    const reviewsCol = collection(db, "reviews");
    const q = query(reviewsCol, where("listingId", "==", listingId), orderBy("createdAt", "desc"));
    const reviewSnapshot = await getDocs(q);
    const reviewsWithUserData = await Promise.all(reviewSnapshot.docs.map(async (docSnap) => {
        const review = mapDocToReview(docSnap);
        const user = await getUserById(review.userId);
        return {...review, userName: user?.name || `User...${review.userId.slice(-4)}`};
    }));
    return reviewsWithUserData;
  } catch (error) {
    console.error("Error fetching reviews from Firestore, using mock data:", error);
    const listingReviews = mockReviews.filter(review => review.listingId === listingId)
        .sort((a, b) => {
           const timeA = a.createdAt instanceof Date ? a.createdAt.getTime() : (a.createdAt as Timestamp)?.seconds * 1000 || 0;
           const timeB = b.createdAt instanceof Date ? b.createdAt.getTime() : (b.createdAt as Timestamp)?.seconds * 1000 || 0;
           return timeB - timeA;
        });
    return Promise.all(listingReviews.map(async (review) => {
        const user = await getUserById(review.userId);
        return {...review, userName: user?.name || `User...${review.userId.slice(-4)}` };
    }));
  }
};

export const addReview = async (
  listingId: string,
  userId: string,
  rating: number,
  comment: string
): Promise<Review> => {
  const userAddingReview = await getUserById(userId);
  const newReview: Review = {
    id: `mock-review-${Date.now()}`,
    listingId,
    userId,
    userName: userAddingReview?.name || `User...${userId.slice(-4)}`,
    rating,
    comment,
    createdAt: new Date(),
  };

  if (firebaseInitializationError || !db) {
    console.warn("Firestore not available. Adding review to mock data.");
    mockReviews.unshift(newReview);
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
    const firestoreReviewData: any = {
        listingId: newReview.listingId,
        userId: newReview.userId,
        userName: newReview.userName,
        rating: newReview.rating,
        comment: newReview.comment,
        createdAt: Timestamp.fromDate(newReview.createdAt as Date),
    };

    const docRef = await addDoc(reviewsCol, firestoreReviewData);

    const listingRef = doc(db, "listings", listingId);
    const listingSnap = await getDoc(listingRef);
    if (listingSnap.exists()) {
        const listingData = listingSnap.data();
        const currentRating = listingData.rating || 0;
        const currentNumRatings = listingData.numberOfRatings || 0;
        const newNumRatings = currentNumRatings + 1;
        const newTotalRating = currentRating * currentNumRatings + rating;
        const newAvgRating = newNumRatings > 0 ? newTotalRating / newNumRatings : 0;
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

const populateBookingDetails = async (booking: Booking): Promise<Booking> => {
    const listing = await getListingById(booking.listingId);
    const renter = await getUserById(booking.renterId);
    const landowner = await getUserById(booking.landownerId);
    return {
        ...booking,
        listingTitle: listing?.title || `Listing ID: ${booking.listingId.substring(0,10)}...`,
        renterName: renter?.name || `Renter ID: ${booking.renterId.substring(0,6)}...`,
        landownerName: landowner?.name || `Owner ID: ${booking.landownerId.substring(0,6)}...`,
    };
};

export const getBookingsForUser = async (userId: string): Promise<Booking[]> => {
  if (firebaseInitializationError || !db) {
    const userBookings = mockBookings.filter(b => b.renterId === userId || b.landownerId === userId)
        .sort((a,b) => {
          const timeA = a.dateRange.from instanceof Date ? a.dateRange.from.getTime() : (a.dateRange.from as Timestamp)?.seconds * 1000 || 0;
          const timeB = b.dateRange.from instanceof Date ? b.dateRange.from.getTime() : (b.dateRange.from as Timestamp)?.seconds * 1000 || 0;
          return timeB - timeA;
        });
    return Promise.all(userBookings.map(populateBookingDetails));
  }

  try {
    const bookingsCol = collection(db, "bookings");
    const q = query(
      bookingsCol,
      or(
        where("renterId", "==", userId),
        where("landownerId", "==", userId)
      ),
      orderBy("createdAt", "desc") // Order by creation date for consistent listing
    );
    const bookingSnapshot = await getDocs(q);
    const bookings = bookingSnapshot.docs.map(mapDocToBooking);
    return Promise.all(bookings.map(populateBookingDetails));
  } catch (error) {
    console.error("Error fetching bookings from Firestore, using mock data:", error);
    const userBookings = mockBookings.filter(b => b.renterId === userId || b.landownerId === userId)
        .sort((a,b) => {
            const timeA = a.createdAt instanceof Date ? a.createdAt.getTime() : (a.createdAt as Timestamp)?.seconds * 1000 || 0;
            const timeB = b.createdAt instanceof Date ? b.createdAt.getTime() : (b.createdAt as Timestamp)?.seconds * 1000 || 0;
            return timeB - timeA;
        });
    return Promise.all(userBookings.map(populateBookingDetails));
  }
};

export const addBookingRequest = async (
  data: Omit<Booking, 'id' | 'status' | 'listingTitle' | 'landownerName' | 'renterName' | 'createdAt'> & {dateRange: {from: Date; to: Date}}
): Promise<Booking> => {

  const listingInfo = await getListingById(data.listingId);
  if (!listingInfo) throw new Error("Listing not found for booking request.");

  const renterInfo = await getUserById(data.renterId);
  const landownerInfo = await getUserById(listingInfo.landownerId);

  const newBooking: Booking = {
    id: `mock-booking-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    ...data,
    landownerId: listingInfo.landownerId,
    status: 'Pending Confirmation',
    createdAt: new Date(),
    listingTitle: listingInfo.title,
    renterName: renterInfo?.name,
    landownerName: landownerInfo?.name,
  };

  if (firebaseInitializationError || !db) {
    console.warn("Firestore not available. Adding booking request to mock data.");
    mockBookings.unshift(newBooking); // Add to beginning
    return populateBookingDetails(newBooking);
  }

  try {
    const bookingsCol = collection(db, "bookings");
    const firestoreBookingData: any = {
      listingId: data.listingId,
      renterId: data.renterId,
      landownerId: listingInfo.landownerId,
      listingTitle: listingInfo.title, // Store for easier display
      renterName: renterInfo?.name,     // Store for easier display
      landownerName: landownerInfo?.name, // Store for easier display
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
        const mappedBooking = mapDocToBooking(newDocSnap);
        // Ensure it's populated before returning
        return populateBookingDetails(mappedBooking);
    } else {
        throw new Error("Failed to retrieve newly created booking request from Firestore.");
    }
  } catch (error) {
    console.error("Error adding booking request to Firestore, adding to mock data as fallback:", error);
    mockBookings.unshift(newBooking);
    return populateBookingDetails(newBooking);
  }
};

export const updateBookingStatus = async (bookingId: string, status: Booking['status']): Promise<Booking | undefined> => {
  if (firebaseInitializationError || !db) {
    console.warn("Firestore not available. Updating booking status in mock data.");
    const bookingIndex = mockBookings.findIndex(b => b.id === bookingId);
    if (bookingIndex !== -1) {
      mockBookings[bookingIndex].status = status;
      return populateBookingDetails(mockBookings[bookingIndex]);
    }
    return undefined;
  }

  try {
    const bookingDocRef = doc(db, "bookings", bookingId);
    await updateDoc(bookingDocRef, { status: status });
    const updatedSnap = await getDoc(bookingDocRef);
    if (updatedSnap.exists()) {
      const updatedBooking = mapDocToBooking(updatedSnap);
      return populateBookingDetails(updatedBooking);
    }
    return undefined;
  } catch (error) {
    console.error("Error updating booking status in Firestore, attempting mock update:", error);
    const bookingIndex = mockBookings.findIndex(b => b.id === bookingId);
    if (bookingIndex !== -1) {
      mockBookings[bookingIndex].status = status;
      return populateBookingDetails(mockBookings[bookingIndex]);
    }
    return undefined;
  }
};
