
'use client';
import type { User, Listing, Booking, Review, SubscriptionStatus, PricingModel, Transaction, PlatformMetrics } from './types';
import { differenceInDays, differenceInCalendarMonths, startOfMonth, endOfMonth } from 'date-fns';
import { firebaseInitializationError, db as firestoreDb } from './firebase';
import { 
    doc, getDoc, setDoc, updateDoc, collection, getDocs, addDoc, deleteDoc, writeBatch, query, where, orderBy, limit, serverTimestamp, runTransaction, Timestamp, increment
} from 'firebase/firestore';


/**
 * @fileOverview
 * This file serves as the primary data access layer for the application.
 * It intelligently switches between a live Firestore backend and a mock in-memory database
 * based on whether Firebase is properly configured.
 */


// --- CONFIGURATION ---
const DB_KEY = 'landshare_mock_db';
export const FREE_TIER_LISTING_LIMIT = 2;
export const FREE_TIER_BOOKMARK_LIMIT = 5;
export const ADMIN_UIDS = ['AdminGNL6965'];
const RENTER_FEE = 0.99; // Flat fee for non-premium renters
const TAX_RATE = 0.05; // 5%
const PREMIUM_SERVICE_FEE_RATE = 0.0049; // 0.49%
const STANDARD_SERVICE_FEE_RATE = 0.02; // 2%
const PREMIUM_SUBSCRIPTION_PRICE = 5.00;

// --- DATABASE STRUCTURE (for mock mode) ---
interface MockDatabase {
  users: User[];
  listings: Listing[];
  bookings: Booking[];
  reviews: Review[];
  transactions: Transaction[];
  metrics: PlatformMetrics;
}

// --- MOCK USER DEFINITIONS ---
const MOCK_FORMER_ADMIN_USER: User = { id: 'ZsAXo79Wh8XEiHFrcJwlJT2h89F3', name: 'Gabriel Leunda', email: 'admin@landshare.app', subscriptionStatus: 'standard', createdAt: new Date('2023-01-01T10:00:00Z'), bio: 'A standard user account.', bookmarkedListingIds: ['listing-1-sunny-meadow', 'listing-3-desert-oasis'], walletBalance: 10000 };
const MOCK_GABE_ADMIN_USER: User = { id: 'AdminGNL6965', name: 'Gabeh', email: 'gabeh@landshare.app', subscriptionStatus: 'premium', createdAt: new Date('2023-01-02T10:00:00Z'), bio: 'Platform Administrator.', bookmarkedListingIds: [], walletBalance: 500000 };
const MOCK_USER_FOR_UI_TESTING: User = { id: 'mock-user-uid-12345', name: 'Mock UI Tester', email: 'mocktester@example.com', subscriptionStatus: 'standard', createdAt: new Date('2023-01-01T10:00:00Z'), bio: 'I am a standard mock user for testing purposes.', bookmarkedListingIds: ['listing-1-sunny-meadow', 'listing-3-desert-oasis'], walletBalance: 10000 };
const MOCK_GOOGLE_USER_FOR_UI_TESTING: User = { id: 'mock-google-user-uid-67890', name: 'Mock Google User', email: 'mock.google.user@example.com', subscriptionStatus: 'standard', createdAt: new Date('2023-04-01T10:00:00Z'), bio: 'I am a mock user signed in via Google for testing purposes.', bookmarkedListingIds: [], walletBalance: 10000 };

// --- INITIAL DEFAULT DATA ---
const getInitialData = (): MockDatabase => {
    const users = [MOCK_FORMER_ADMIN_USER, MOCK_GABE_ADMIN_USER, MOCK_USER_FOR_UI_TESTING, { id: 'landowner-jane-doe', name: 'Jane Doe', email: 'jane@example.com', subscriptionStatus: 'standard', createdAt: new Date('2023-02-15T11:00:00Z'), bio: 'Experienced landowner with several plots available.', bookmarkedListingIds: [], walletBalance: 10000 }, { id: 'renter-john-smith', name: 'John Smith', email: 'john@example.com', subscriptionStatus: 'standard', createdAt: new Date('2023-03-20T12:00:00Z'), bio: 'Looking for a quiet place for my tiny home.', bookmarkedListingIds: ['listing-2-forest-retreat'], walletBalance: 10000 }, MOCK_GOOGLE_USER_FOR_UI_TESTING];
    const listings = [ { id: 'listing-1-sunny-meadow', title: 'Sunny Meadow Plot', description: 'A beautiful sunny meadow, perfect for sustainable living. Flat land, easy access. Great for gardens.', location: 'Boulder, CO', lat: 40.0150, lng: -105.2705, sizeSqft: 5000, amenities: ['water hookup', 'road access', 'pet friendly', 'fenced'], pricingModel: 'monthly', price: 350, images: ['https://placehold.co/800x600.png?text=Sunny+Meadow', 'https://placehold.co/400x300.png?text=Meadow+View+1', 'https://placehold.co/400x300.png?text=Meadow+View+2'], landownerId: 'landowner-jane-doe', isAvailable: true, rating: 4.8, numberOfRatings: 15, leaseTerm: 'long-term', minLeaseDurationMonths: 6, isBoosted: false, createdAt: new Date('2024-07-01T10:00:00Z'), }, { id: 'listing-2-forest-retreat', title: 'Forest Retreat Lot (Monthly)', description: 'Secluded lot in a dense forest. Ideal for off-grid enthusiasts. Some clearing needed. Very private.', location: 'Asheville, NC', lat: 35.5951, lng: -82.5515, sizeSqft: 12000, amenities: ['septic system', 'fenced', 'fire pit'], pricingModel: 'monthly', price: 200, images: ['https://placehold.co/800x600.png?text=Forest+Retreat', 'https://placehold.co/400x300.png?text=Forest+View+1'], landownerId: MOCK_USER_FOR_UI_TESTING.id, isAvailable: true, rating: 4.2, numberOfRatings: 8, leaseTerm: 'flexible', isBoosted: false, createdAt: new Date('2024-06-15T14:30:00Z'), }, { id: 'listing-3-desert-oasis', title: 'Desert Oasis Spot (Short-term Monthly)', description: 'Expansive desert views with stunning sunsets. Requires water hauling. Power access nearby. Stargazing paradise.', location: 'Sedona, AZ', lat: 34.8700, lng: -111.7610, sizeSqft: 25000, amenities: ['power access', 'road access'], pricingModel: 'monthly', price: 150, images: ['https://placehold.co/800x600.png?text=Desert+Oasis'], landownerId: 'landowner-jane-doe', isAvailable: true, rating: 4.5, numberOfRatings: 10, leaseTerm: 'short-term', minLeaseDurationMonths: 1, isBoosted: false, createdAt: new Date('2024-05-01T10:00:00Z'), }, { id: 'listing-4-riverside-haven', title: 'Riverside Haven - Monthly Lease', description: 'Peaceful plot by a gentle river. Great for nature lovers. Seasonal access. Monthly lease available for fishing cabin.', location: 'Missoula, MT', lat: 46.8721, lng: -113.9940, sizeSqft: 7500, amenities: ['water hookup', 'fire pit', 'lake access', 'pet friendly'], pricingModel: 'monthly', price: 400, images: ['https://placehold.co/800x600.png?text=Riverside+Haven', 'https://placehold.co/400x300.png?text=River+View'], landownerId: MOCK_USER_FOR_UI_TESTING.id, isAvailable: true, rating: 4.9, numberOfRatings: 22, leaseTerm: 'long-term', minLeaseDurationMonths: 12, isBoosted: false, createdAt: new Date('2024-07-10T10:00:00Z'), }, { id: 'listing-5-cozy-rv-spot', title: 'Cozy RV Spot by the Lake (Nightly)', description: 'Perfect nightly getaway for your RV. Includes full hookups and stunning lake views. Min 2 nights. Book your escape!', location: 'Lake Tahoe, CA', lat: 39.0968, lng: -120.0324, sizeSqft: 1500, amenities: ['water hookup', 'power access', 'wifi available', 'pet friendly', 'lake access', 'septic system'], pricingModel: 'nightly', price: 45, images: ['https://placehold.co/800x600.png?text=RV+Lake+Spot', 'https://placehold.co/400x300.png?text=Lake+Sunset'], landownerId: 'landowner-jane-doe', isAvailable: true, rating: 4.7, numberOfRatings: 12, isBoosted: false, leaseTerm: 'short-term', createdAt: new Date('2024-06-01T09:00:00Z'), }, { id: 'listing-6-mountain-homestead-lto', title: 'Mountain Homestead - Lease to Own!', description: 'Your chance to own a piece of the mountains! This spacious lot is offered with a lease-to-own option. Build your dream cabin or sustainable farm. Terms negotiable.', location: 'Boone, NC', lat: 36.2168, lng: -81.6746, sizeSqft: 45000, amenities: ['road access', 'septic system' ], pricingModel: 'lease-to-own', price: 650, downPayment: 5000, leaseToOwnDetails: "5-year lease-to-own program. $5,000 down payment. Estimated monthly payment of $650 (PITI estimate). Final purchase price: $75,000. Subject to credit approval and LTO agreement. Owner financing available.", images: ['https://placehold.co/800x600.png?text=Mountain+LTO', 'https://placehold.co/400x300.png?text=Creek+Nearby', 'https://placehold.co/400x300.png?text=Site+Plan'], landownerId: MOCK_USER_FOR_UI_TESTING.id, isAvailable: true, rating: 4.3, numberOfRatings: 5, isBoosted: false, leaseTerm: 'long-term', minLeaseDurationMonths: 60, createdAt: new Date('2024-05-15T11:00:00Z'), }, { id: 'listing-7-basic-rural-plot', title: 'Basic Rural Plot - Affordable Monthly!', description: 'A very basic, undeveloped plot of land in a quiet rural area. No frills, just space. Perfect for raw land camping (check local ordinances) or a very simple, self-contained setup.', location: 'Rural Plains, KS', lat: 37.7749, lng: -97.3308, sizeSqft: 22000, amenities: [], pricingModel: 'monthly', price: 75, images: ['https://placehold.co/800x600.png?text=Basic+Plot'], landownerId: 'landowner-jane-doe', isAvailable: true, rating: 2.5, numberOfRatings: 2, isBoosted: false, leaseTerm: 'flexible', createdAt: new Date('2024-04-01T16:00:00Z'), }, { id: 'listing-8-premium-view-lot-rented', title: 'Premium View Lot (Currently Rented)', description: 'Unobstructed ocean views from this premium lot. Currently under a long-term lease. Not available for new bookings.', location: 'Big Sur, CA', lat: 36.2704, lng: -121.8081, sizeSqft: 10000, amenities: ['power access', 'water hookup', 'fenced', 'wifi available', 'septic system'], pricingModel: 'monthly', price: 1200, images: ['https://placehold.co/800x600.png?text=Rented+View+Lot'], landownerId: MOCK_USER_FOR_UI_TESTING.id, isAvailable: false, rating: 4.9, numberOfRatings: 35, isBoosted: true, leaseTerm: 'long-term', minLeaseDurationMonths: 12, createdAt: new Date('2023-08-10T12:00:00Z'), }, { id: 'listing-9-miami-nightly', title: 'Miami Urban Garden Plot (Nightly)', description: 'A rare open plot in Miami, perfect for short-term events, urban gardening projects, or RV parking. Nightly rates available.', location: 'Miami, FL', lat: 25.7617, lng: -80.1918, sizeSqft: 2500, amenities: ['power access', 'water hookup', 'fenced', 'road access'], pricingModel: 'nightly', price: 75, images: ['https://placehold.co/800x600.png?text=Miami+Plot'], landownerId: 'landowner-jane-doe', isAvailable: true, rating: 4.6, numberOfRatings: 9, isBoosted: false, leaseTerm: 'short-term', createdAt: new Date('2024-07-20T10:00:00Z'), }, { id: 'listing-10-orlando-lto', title: 'Orlando LTO Opportunity near Attractions', description: 'Lease-to-own this conveniently located lot in the greater Orlando area. A great investment for a future home base.', location: 'Orlando, FL', lat: 28.5383, lng: -81.3792, sizeSqft: 6000, amenities: ['power access', 'water hookup', 'road access', 'septic system'], pricingModel: 'lease-to-own', price: 550, downPayment: 3000, leaseToOwnDetails: "3-year lease-to-own option. $3,000 down. Estimated monthly payment of $550. Final purchase price: $60,000. Close to main roads.", images: ['https://placehold.co/800x600.png?text=Orlando+LTO+Lot'], landownerId: MOCK_GOOGLE_USER_FOR_UI_TESTING.id, isAvailable: true, rating: 4.1, numberOfRatings: 3, isBoosted: true, leaseTerm: 'long-term', minLeaseDurationMonths: 36, createdAt: new Date('2024-07-18T10:00:00Z'), } ];
    const bookings = [ { id: 'booking-1', listingId: 'listing-1-sunny-meadow', listingTitle: 'Sunny Meadow Plot', renterId: 'renter-john-smith', renterName: 'John Smith', landownerId: 'landowner-jane-doe', landownerName: 'Jane Doe', status: 'Confirmed', dateRange: { from: new Date('2024-01-01'), to: new Date('2024-06-30') }, createdAt: new Date('2023-12-15T10:00:00Z'), }, { id: 'booking-2', listingId: 'listing-2-forest-retreat', listingTitle: 'Forest Retreat Lot (Monthly)', renterId: 'renter-john-smith', renterName: 'John Smith', landownerId: MOCK_USER_FOR_UI_TESTING.id, landownerName: MOCK_USER_FOR_UI_TESTING.name, status: 'Pending Confirmation', dateRange: { from: new Date('2024-08-01'), to: new Date('2024-09-01') }, createdAt: new Date('2024-07-20T11:00:00Z'), }, { id: 'booking-3', listingId: 'listing-1-sunny-meadow', listingTitle: 'Sunny Meadow Plot', renterId: MOCK_FORMER_ADMIN_USER.id, renterName: MOCK_FORMER_ADMIN_USER.name, landownerId: 'landowner-jane-doe', landownerName: 'Jane Doe', status: 'Declined', dateRange: { from: new Date('2024-07-01'), to: new Date('2024-08-01') }, createdAt: new Date('2024-06-25T12:00:00Z'), }, { id: 'booking-4-nightly', listingId: 'listing-5-cozy-rv-spot', listingTitle: 'Cozy RV Spot by the Lake (Nightly)', renterId: 'renter-john-smith', renterName: 'John Smith', landownerId: 'landowner-jane-doe', landownerName: 'Jane Doe', status: 'Confirmed', dateRange: { from: new Date('2024-07-10'), to: new Date('2024-07-15') }, createdAt: new Date('2024-06-01T10:00:00Z'), }, { id: 'booking-5-lto-pending', listingId: 'listing-6-mountain-homestead-lto', listingTitle: 'Mountain Homestead - Lease to Own!', renterId: 'renter-john-smith', renterName: 'John Smith', landownerId: MOCK_USER_FOR_UI_TESTING.id, landownerName: MOCK_USER_FOR_UI_TESTING.name, status: 'Pending Confirmation', dateRange: { from: new Date('2024-09-01'), to: new Date('2029-08-31') }, createdAt: new Date('2024-07-25T10:00:00Z'), }, { id: 'booking-6-mockuser-pending', listingId: 'listing-1-sunny-meadow', listingTitle: 'Sunny Meadow Plot', renterId: MOCK_USER_FOR_UI_TESTING.id, renterName: MOCK_USER_FOR_UI_TESTING.name, landownerId: 'landowner-jane-doe', landownerName: 'Jane Doe', status: 'Pending Confirmation', dateRange: { from: new Date('2024-10-01'), to: new Date('2024-10-15') }, createdAt: new Date('2024-07-28T11:00:00Z'), }, ];
    const reviews = [ { id: 'review-1', listingId: 'listing-1-sunny-meadow', userId: 'renter-john-smith', userName: 'John Smith', rating: 5, comment: 'Absolutely loved this spot! Jane was a great host. The meadow is beautiful and well-kept.', createdAt: new Date('2023-07-01T10:00:00Z'), }, { id: 'review-2', listingId: 'listing-2-forest-retreat', userId: 'landowner-jane-doe', userName: 'Jane Doe', rating: 4, comment: 'Nice and secluded, a bit rough around the edges but has potential. Mock Tester was responsive.', createdAt: new Date('2023-12-01T11:00:00Z'), }, { id: 'review-3-nightly', listingId: 'listing-5-cozy-rv-spot', userId: 'renter-john-smith', userName: 'John Smith', rating: 5, comment: 'Amazing RV spot, beautiful views and all hookups worked perfectly. Will be back!', createdAt: new Date('2024-07-16T10:00:00Z'), }, { id: 'review-4-lto', listingId: 'listing-6-mountain-homestead-lto', userId: 'renter-john-smith', userName: 'John Smith', rating: 4, comment: 'Interesting LTO option. Land is raw but promising. Landowner (Admin) was helpful with initial info.', createdAt: new Date('2024-05-01T10:00:00Z'), }, { id: 'review-5-basic', listingId: 'listing-7-basic-rural-plot', userId: MOCK_USER_FOR_UI_TESTING.id, userName: MOCK_USER_FOR_UI_TESTING.name, rating: 2, comment: 'It truly is basic, but the price was right for what it is. No surprises. Good for minimalists.', createdAt: new Date('2024-06-10T10:00:00Z'), }, { id: 'review-6-riverside', listingId: 'listing-4-riverside-haven', userId: 'landowner-jane-doe', userName: 'Jane Doe', rating: 5, comment: 'A truly fantastic spot for a long-term lease. Host was accommodating. River access is a huge plus.', createdAt: new Date('2024-07-15T10:00:00Z'), }, ];
    const transactions = [ { id: 'txn1', userId: MOCK_GABE_ADMIN_USER.id, type: 'Subscription', status: 'Completed', amount: -5.00, currency: 'USD', date: new Date('2024-07-01T00:00:00Z'), description: 'Premium Subscription - July' }, { id: 'txn2', userId: MOCK_USER_FOR_UI_TESTING.id, type: 'Landowner Payout', status: 'Completed', amount: 196.00, currency: 'USD', date: new Date('2024-07-05T00:00:00Z'), description: 'Payout for Forest Retreat Lot' }, { id: 'txn3', userId: MOCK_USER_FOR_UI_TESTING.id, type: 'Service Fee', status: 'Completed', amount: -4.00, currency: 'USD', date: new Date('2024-07-05T00:00:00Z'), description: 'Service Fee (2%) for Forest Retreat Lot' }, { id: 'txn4', userId: 'landowner-jane-doe', type: 'Landowner Payout', status: 'Completed', amount: 343.00, currency: 'USD', date: new Date('2024-07-08T00:00:00Z'), description: 'Payout for Sunny Meadow Plot' }, { id: 'txn5', userId: 'landowner-jane-doe', type: 'Service Fee', status: 'Completed', amount: -7.00, currency: 'USD', date: new Date('2024-07-08T00:00:00Z'), description: 'Service Fee (2%) for Sunny Meadow Plot' }, { id: 'txn6', userId: 'renter-john-smith', type: 'Booking Payment', status: 'Completed', amount: -2100.99, currency: 'USD', date: new Date('2023-12-15T00:00:00Z'), description: 'Payment for Sunny Meadow Plot (6 months)' }, { id: 'txn7', userId: 'renter-john-smith', type: 'Booking Payment', status: 'Pending', amount: -200.99, currency: 'USD', date: new Date('2024-07-20T00:00:00Z'), description: 'Payment for Forest Retreat Lot' }, ];
    const metrics: PlatformMetrics = { id: 'global_metrics', totalRevenue: 16.00, totalServiceFees: 11.00, totalSubscriptionRevenue: 5.00, totalUsers: users.length, totalListings: listings.length, totalBookings: bookings.length };
    return { users, listings, bookings, reviews, transactions, metrics };
};

// --- MOCK MODE CORE DATABASE FUNCTIONS ---
let localDb: MockDatabase | null = null;
function loadMockDb(): MockDatabase {
    if (typeof window === 'undefined') {
        if (!localDb) { localDb = getInitialData(); }
        return localDb;
    }
    try {
        const storedDb = localStorage.getItem(DB_KEY);
        if (storedDb) {
            const parsed = JSON.parse(storedDb, (key, value) => {
                if (key === 'createdAt' || key === 'from' || key === 'to' || key === 'date') {
                    if (value) return new Date(value);
                } return value;
            });
            return parsed;
        }
    } catch (error) { console.error("Failed to load or parse mock DB from localStorage, resetting.", error); }
    const initialData = getInitialData();
    saveMockDb(initialData);
    return initialData;
}
function saveMockDb(newDb: MockDatabase) {
    if (typeof window === 'undefined') { localDb = newDb; return; }
    localStorage.setItem(DB_KEY, JSON.stringify(newDb));
    window.dispatchEvent(new CustomEvent('mockDataChanged'));
}

// --- DATA ACCESS & MUTATION FUNCTIONS ---

/**
 * Converts a Firestore document snapshot into a usable object,
 * handling Timestamps and ensuring the document ID is included.
 * @param docSnap The document snapshot from Firestore.
 * @returns The structured data object.
 */
function docToObj<T>(docSnap: any): T {
    if (!docSnap.exists()) {
        return undefined as any;
    }
    const data = docSnap.data();
    // Convert Firestore Timestamps to JS Dates
    for (const key in data) {
        if (data[key]?.toDate instanceof Function) {
            data[key] = data[key].toDate();
        }
        if(key === 'dateRange' && data[key]?.from?.toDate instanceof Function) {
            data.dateRange.from = data.dateRange.from.toDate();
        }
        if(key === 'dateRange' && data[key]?.to?.toDate instanceof Function) {
            data.dateRange.to = data.dateRange.to.toDate();
        }
    }
    return { ...data, id: docSnap.id } as T;
}

// --- User Functions ---
export const getUserById = async (id: string): Promise<User | undefined> => {
    if (firebaseInitializationError) {
        return loadMockDb().users.find(user => user.id === id);
    }
    const userRef = doc(firestoreDb, "users", id);
    const userSnap = await getDoc(userRef);
    return docToObj<User>(userSnap);
};

export const createUserProfile = async (userId: string, email: string, name?: string | null, avatarUrl?: string | null): Promise<User> => {
    if (firebaseInitializationError) {
        const db = loadMockDb();
        const existingUser = db.users.find(u => u.id === userId);
        if (existingUser) return existingUser;
        const newUser: User = { id: userId, email: email, name: name || email.split('@')[0] || 'User', avatarUrl: avatarUrl || `https://placehold.co/100x100.png?text=${(name || email.split('@')[0] || 'U').charAt(0).toUpperCase()}`, subscriptionStatus: 'standard', createdAt: new Date(), bio: "Welcome to LandShare!", bookmarkedListingIds: [], walletBalance: 10000 };
        db.users.push(newUser);
        saveMockDb(db);
        return newUser;
    }
    const userRef = doc(firestoreDb, "users", userId);
    const existingUserSnap = await getDoc(userRef);
    if (existingUserSnap.exists()) {
        return docToObj<User>(existingUserSnap);
    }
    const newUser: Omit<User, 'id'> = { email: email, name: name || email.split('@')[0] || 'User', avatarUrl: avatarUrl || `https://placehold.co/100x100.png?text=${(name || email.split('@')[0] || 'U').charAt(0).toUpperCase()}`, subscriptionStatus: 'standard', createdAt: serverTimestamp() as any, bio: "Welcome to LandShare!", bookmarkedListingIds: [], walletBalance: 10000 };
    await setDoc(userRef, newUser);
    return { ...newUser, id: userId, createdAt: new Date() };
};

export const updateUserProfile = async (userId: string, data: Partial<User>): Promise<User | undefined> => {
    if (firebaseInitializationError) {
        const db = loadMockDb();
        const userIndex = db.users.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            db.users[userIndex] = { ...db.users[userIndex], ...data };
            saveMockDb(db);
            return db.users[userIndex];
        }
        return undefined;
    }

    // Live mode with subscription financial logic
    if (data.subscriptionStatus) {
        return runTransaction(firestoreDb, async (transaction) => {
            const userRef = doc(firestoreDb, "users", userId);
            const userSnap = await transaction.get(userRef);
            if (!userSnap.exists()) throw new Error("User not found for subscription change.");

            const currentUserData = userSnap.data() as User;
            const newStatus = data.subscriptionStatus;
            
            // Prevent changing to the same status
            if (currentUserData.subscriptionStatus === newStatus) return currentUserData;

            const metricsRef = doc(firestoreDb, 'admin_state', 'platform_metrics');
            const now = new Date();
            let transactionAmount = 0;
            let transactionType: 'Subscription' | 'Subscription Refund' = 'Subscription';

            if (newStatus === 'premium') {
                transactionAmount = -PREMIUM_SUBSCRIPTION_PRICE;
                transactionType = 'Subscription';
            } else { // Downgrading to standard
                transactionAmount = PREMIUM_SUBSCRIPTION_PRICE;
                transactionType = 'Subscription Refund';
            }

            // Create transaction record
            const newTxRef = doc(collection(firestoreDb, 'transactions'));
            transaction.set(newTxRef, {
                userId, type: transactionType, status: 'Completed',
                amount: transactionAmount, currency: 'USD', date: now,
                description: `${transactionType} - ${newStatus} tier`,
            });
            
            // Update user wallet and subscription status
            transaction.update(userRef, {
                walletBalance: increment(transactionAmount),
                subscriptionStatus: newStatus,
            });

            // Update platform metrics
            transaction.update(metricsRef, {
                totalSubscriptionRevenue: increment(-transactionAmount) // a refund is negative revenue
            });
            
            return { ...currentUserData, ...data, walletBalance: (currentUserData.walletBalance || 0) + transactionAmount };
        });
    } else {
        // Standard non-financial profile update
        const userRef = doc(firestoreDb, "users", userId);
        await updateDoc(userRef, data);
        const updatedUserSnap = await getDoc(userRef);
        return docToObj<User>(updatedUserSnap);
    }
};


// --- Listing Functions ---
export const getListings = async (): Promise<Listing[]> => {
    if (firebaseInitializationError) {
        return loadMockDb().listings.filter(l => l.isAvailable).sort((a,b) => (b.createdAt as Date).getTime() - (a.createdAt as Date).getTime());
    }
    const q = query(collection(firestoreDb, "listings"), where("isAvailable", "==", true), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => docToObj<Listing>(doc));
};

export const getListingById = async (id: string): Promise<Listing | undefined> => {
    if (firebaseInitializationError) {
        return loadMockDb().listings.find(listing => listing.id === id);
    }
    const listingRef = doc(firestoreDb, "listings", id);
    const listingSnap = await getDoc(listingRef);
    return docToObj<Listing>(listingSnap);
};

export const addListing = async (data: Omit<Listing, 'id'>): Promise<Listing> => {
    if (firebaseInitializationError) {
        const db = loadMockDb();
        const newListing: Listing = { ...data, id: `listing-${Date.now()}-${Math.random().toString(16).slice(2)}`, isBoosted: data.isBoosted || false };
        db.listings.unshift(newListing);
        saveMockDb(db);
        return newListing;
    }
    const listingsCollection = collection(firestoreDb, "listings");
    const newDocRef = await addDoc(listingsCollection, { ...data, createdAt: serverTimestamp() });
    return { ...data, id: newDocRef.id, createdAt: new Date() };
};

export const updateListing = async (listingId: string, data: Partial<Listing>): Promise<Listing | undefined> => {
    if (firebaseInitializationError) {
        const db = loadMockDb();
        const listingIndex = db.listings.findIndex(l => l.id === listingId);
        if (listingIndex !== -1) {
            db.listings[listingIndex] = { ...db.listings[listingIndex], ...data };
            saveMockDb(db);
            return db.listings[listingIndex];
        } return undefined;
    }
    const listingRef = doc(firestoreDb, "listings", listingId);
    await updateDoc(listingRef, data);
    const updatedListingSnap = await getDoc(listingRef);
    return docToObj<Listing>(updatedListingSnap);
};

export const deleteListing = async (listingId: string): Promise<boolean> => {
    if (firebaseInitializationError) {
        const db = loadMockDb();
        const initialLength = db.listings.length;
        db.listings = db.listings.filter(l => l.id !== listingId);
        db.bookings = db.bookings.filter(b => b.listingId !== listingId);
        db.reviews = db.reviews.filter(r => r.listingId !== listingId);
        const deleted = db.listings.length < initialLength;
        if (deleted) saveMockDb(db);
        return deleted;
    }
    // Deletion is now handled in a server action for Firestore for consistency
    throw new Error("Direct client-side deletion from mock-data is disabled. Use deleteListingAction.");
};

// --- Review Functions ---
export const getReviewsForListing = async (listingId: string): Promise<Review[]> => {
    if (firebaseInitializationError) {
        return loadMockDb().reviews.filter(review => review.listingId === listingId).sort((a,b) => (b.createdAt as Date).getTime() - (a.createdAt as Date).getTime());
    }
    const q = query(collection(firestoreDb, "reviews"), where("listingId", "==", listingId), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => docToObj<Review>(doc));
};

// --- Booking Functions ---
export const getBookingsForUser = async (userId: string): Promise<Booking[]> => {
    if (firebaseInitializationError) {
        const db = loadMockDb();
        return db.bookings.filter(b => b.renterId === userId || b.landownerId === userId).map(booking => {
            const listing = db.listings.find(l => l.id === booking.listingId);
            const renter = db.users.find(u => u.id === booking.renterId);
            const landowner = db.users.find(u => u.id === booking.landownerId);
            return { ...booking, listingTitle: listing?.title, renterName: renter?.name, landownerName: landowner?.name };
        }).sort((a,b) => (b.createdAt as Date).getTime() - (a.createdAt as Date).getTime());
    }
    
    const renterQuery = query(collection(firestoreDb, "bookings"), where("renterId", "==", userId));
    const landownerQuery = query(collection(firestoreDb, "bookings"), where("landownerId", "==", userId));

    const [renterBookingsSnap, landownerBookingsSnap] = await Promise.all([ getDocs(renterQuery), getDocs(landownerQuery) ]);
    const bookingsMap = new Map<string, Booking>();
    renterBookingsSnap.docs.forEach(doc => bookingsMap.set(doc.id, docToObj<Booking>(doc)));
    landownerBookingsSnap.docs.forEach(doc => bookingsMap.set(doc.id, docToObj<Booking>(doc)));
    
    const allUserBookings = Array.from(bookingsMap.values());
    const populatedBookings = await Promise.all(allUserBookings.map(b => populateBookingDetails(b)));

    return populatedBookings.sort((a,b) => (b.createdAt as Date).getTime() - (a.createdAt as Date).getTime());
};

const _calculatePrice = (listing: Listing, dateRange: { from: Date, to: Date }, renterSubscription: SubscriptionStatus): number => {
  let baseRate = 0;
  if (listing.pricingModel === 'nightly') {
      const days = differenceInDays(dateRange.to, dateRange.from) + 1;
      baseRate = (listing.price || 0) * (days > 0 ? days : 1);
  } else { // monthly or LTO
      const days = differenceInDays(dateRange.to, dateRange.from) + 1;
      baseRate = (listing.price / 30) * (days > 0 ? days : 1);
  }
  const renterFee = (listing.pricingModel !== 'lease-to-own' && renterSubscription !== 'premium') ? RENTER_FEE : 0;
  const subtotal = baseRate + renterFee;
  const estimatedTax = subtotal * TAX_RATE;
  return subtotal + estimatedTax;
};

export const addBookingRequest = async (data: Omit<Booking, 'id' | 'status' | 'createdAt' | 'listingTitle' | 'renterName' | 'landownerName'>): Promise<Booking> => {
    if (firebaseInitializationError) {
        const db = loadMockDb();
        const newBooking: Booking = { ...data, id: `booking-${Date.now()}`, status: 'Pending Confirmation', createdAt: new Date() };
        db.bookings.unshift(newBooking);
        saveMockDb(db);
        return newBooking;
    }
    
    return runTransaction(firestoreDb, async (transaction) => {
        const listingRef = doc(firestoreDb, "listings", data.listingId);
        const renterRef = doc(firestoreDb, "users", data.renterId);

        const [listingSnap, renterSnap] = await Promise.all([transaction.get(listingRef), transaction.get(renterRef)]);
        if (!listingSnap.exists()) throw new Error("Listing not found.");
        if (!renterSnap.exists()) throw new Error("Renter not found.");

        const listing = listingSnap.data() as Listing;
        const renter = renterSnap.data() as User;
        
        const fromDate = (data.dateRange.from as Timestamp).toDate();
        const toDate = (data.dateRange.to as Timestamp).toDate();
        const totalPrice = _calculatePrice(listing, {from: fromDate, to: toDate}, renter.subscriptionStatus || 'standard');
        
        if ((renter.walletBalance || 0) < totalPrice) throw new Error("Insufficient wallet balance.");

        const newBookingRef = doc(collection(firestoreDb, "bookings"));
        const newTxRef = doc(collection(firestoreDb, 'transactions'));
        
        // 1. Create Pending Payment Transaction for Renter
        transaction.set(newTxRef, {
            userId: data.renterId, type: 'Booking Payment', status: 'Pending',
            amount: -totalPrice, currency: 'USD', date: serverTimestamp(),
            description: `Payment for "${listing.title}"`,
            relatedBookingId: newBookingRef.id, relatedListingId: data.listingId
        });

        // 2. Debit Renter's Wallet
        transaction.update(renterRef, { walletBalance: increment(-totalPrice) });
        
        // 3. Create Booking Document
        transaction.set(newBookingRef, {
            ...data,
            status: 'Pending Confirmation',
            createdAt: serverTimestamp(),
            totalPrice: totalPrice,
            paymentTransactionId: newTxRef.id
        });
        
        return { ...data, id: newBookingRef.id } as Booking;
    });
};

export const updateBookingStatus = async (bookingId: string, newStatus: Booking['status']): Promise<Booking | undefined> => {
    if (firebaseInitializationError) {
        // Mock mode: Only update status, no economic logic here.
        const db = loadMockDb();
        const bookingIndex = db.bookings.findIndex(b => b.id === bookingId);
        if (bookingIndex !== -1) {
            db.bookings[bookingIndex].status = newStatus;
            saveMockDb(db);
            return db.bookings[bookingIndex];
        } return undefined;
    }

    return runTransaction(firestoreDb, async (transaction) => {
        const bookingRef = doc(firestoreDb, 'bookings', bookingId);
        const bookingSnap = await transaction.get(bookingRef);
        if (!bookingSnap.exists()) throw new Error("Booking not found.");
        
        const booking = docToObj<Booking>(bookingSnap);
        const metricsRef = doc(firestoreDb, 'admin_state', 'platform_metrics');

        if (newStatus === 'Confirmed' && booking.status === 'Pending Confirmation') {
            const landownerRef = doc(firestoreDb, 'users', booking.landownerId);
            const landownerSnap = await transaction.get(landownerRef);
            if (!landownerSnap.exists()) throw new Error("Landowner not found.");

            const landowner = landownerSnap.data() as User;
            const serviceFeeRate = landowner.subscriptionStatus === 'premium' ? PREMIUM_SERVICE_FEE_RATE : STANDARD_SERVICE_FEE_RATE;
            const serviceFee = (booking.totalPrice || 0) * serviceFeeRate;
            const payoutAmount = (booking.totalPrice || 0) - serviceFee;

            // Mark original payment as completed
            if (booking.paymentTransactionId) {
                const paymentTxRef = doc(firestoreDb, 'transactions', booking.paymentTransactionId);
                transaction.update(paymentTxRef, { status: 'Completed' });
            }
            
            // Create payout and fee transactions
            const payoutTxRef = doc(collection(firestoreDb, 'transactions'));
            transaction.set(payoutTxRef, {
                userId: booking.landownerId, type: 'Landowner Payout', status: 'Completed', amount: payoutAmount,
                currency: 'USD', date: serverTimestamp(), description: `Payout for "${booking.listingTitle || 'listing'}"`,
                relatedBookingId: booking.id, relatedListingId: booking.listingId
            });

            const feeTxRef = doc(collection(firestoreDb, 'transactions'));
            transaction.set(feeTxRef, {
                userId: booking.landownerId, type: 'Service Fee', status: 'Completed', amount: -serviceFee,
                currency: 'USD', date: serverTimestamp(), description: `Service Fee for "${booking.listingTitle || 'listing'}"`,
                relatedBookingId: booking.id, relatedListingId: booking.listingId
            });

            // Update landowner wallet and metrics
            transaction.update(landownerRef, { walletBalance: increment(payoutAmount) });
            transaction.update(metricsRef, { totalServiceFees: increment(serviceFee), totalRevenue: increment(serviceFee) });
        } 
        else if (newStatus === 'Declined' || newStatus === 'Cancelled by Renter' || newStatus === 'Refund Approved') {
            const renterRef = doc(firestoreDb, 'users', booking.renterId);
            
            // Refund renter
            transaction.update(renterRef, { walletBalance: increment(booking.totalPrice || 0) });
            
            // Mark original payment as reversed
            if (booking.paymentTransactionId) {
                const paymentTxRef = doc(firestoreDb, 'transactions', booking.paymentTransactionId);
                transaction.update(paymentTxRef, { status: 'Reversed' });
            }
            
            // Create refund transaction record
            const refundTxRef = doc(collection(firestoreDb, 'transactions'));
            transaction.set(refundTxRef, {
                userId: booking.renterId, type: 'Booking Refund', status: 'Completed', amount: booking.totalPrice || 0,
                currency: 'USD', date: serverTimestamp(), description: `Refund for "${booking.listingTitle || 'listing'}"`,
                relatedBookingId: booking.id, relatedListingId: booking.listingId
            });
        }

        // Finally, update the booking status itself
        transaction.update(bookingRef, { status: newStatus });
        return { ...booking, status: newStatus };
    });
};


// --- Transaction Functions ---
export const getTransactionsForUser = async (userId: string): Promise<Transaction[]> => {
    if (firebaseInitializationError) {
        const currentDb = loadMockDb();
        return currentDb.transactions.filter(t => t.userId === userId)
          .sort((a,b) => (b.date as Date).getTime() - (a.date as Date).getTime());
    }

    const q = query(collection(firestoreDb, 'transactions'), where('userId', '==', userId), orderBy('date', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(d => docToObj<Transaction>(d));
};


// --- Bookmark Functions ---
export const addBookmarkToList = async (userId: string, listingId: string): Promise<User | undefined> => {
    if (firebaseInitializationError) {
        const db = loadMockDb();
        const userIndex = db.users.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            const user = db.users[userIndex];
            if (user.subscriptionStatus === 'standard' && (user.bookmarkedListingIds?.length || 0) >= FREE_TIER_BOOKMARK_LIMIT) {
                throw new Error(`Bookmark limit of ${FREE_TIER_BOOKMARK_LIMIT} reached.`);
            }
            if (!user.bookmarkedListingIds?.includes(listingId)) {
                user.bookmarkedListingIds = [...(user.bookmarkedListingIds || []), listingId];
                saveMockDb(db);
            }
            return user;
        } return undefined;
    }
    const userRef = doc(firestoreDb, "users", userId);
    const user = await getUserById(userId);
    if (user) {
        if (user.subscriptionStatus === 'standard' && (user.bookmarkedListingIds?.length || 0) >= FREE_TIER_BOOKMARK_LIMIT) {
            throw new Error(`Bookmark limit of ${FREE_TIER_BOOKMARK_LIMIT} reached.`);
        }
        const updatedBookmarks = [...(user.bookmarkedListingIds || []), listingId];
        await updateDoc(userRef, { bookmarkedListingIds: updatedBookmarks });
        return { ...user, bookmarkedListingIds: updatedBookmarks };
    }
    return undefined;
};

export const removeBookmarkFromList = async (userId: string, listingId: string): Promise<User | undefined> => {
    if (firebaseInitializationError) {
        const db = loadMockDb();
        const userIndex = db.users.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            const user = db.users[userIndex];
            if (user.bookmarkedListingIds?.includes(listingId)) {
                user.bookmarkedListingIds = (user.bookmarkedListingIds || []).filter(id => id !== listingId);
                saveMockDb(db);
            }
            return user;
        } return undefined;
    }
    const userRef = doc(firestoreDb, "users", userId);
    const user = await getUserById(userId);
    if (user && user.bookmarkedListingIds?.includes(listingId)) {
        const updatedBookmarks = (user.bookmarkedListingIds || []).filter(id => id !== listingId);
        await updateDoc(userRef, { bookmarkedListingIds: updatedBookmarks });
        return { ...user, bookmarkedListingIds: updatedBookmarks };
    }
    return user;
};

// --- Admin & Bot Functions ---
export const getPlatformMetrics = async (): Promise<PlatformMetrics> => {
    if (firebaseInitializationError) {
        return loadMockDb().metrics;
    }
    const metricsRef = doc(firestoreDb, 'admin_state', 'platform_metrics');
    const metricsSnap = await getDoc(metricsRef);
    if (metricsSnap.exists()) {
        return docToObj<PlatformMetrics>(metricsSnap);
    }
    // Fallback if document doesn't exist
    return { id: 'platform_metrics', totalRevenue: 0, totalServiceFees: 0, totalSubscriptionRevenue: 0, totalUsers: 0, totalListings: 0, totalBookings: 0 };
};

export const runBotSimulationCycle = async (): Promise<{ message: string }> => {
  // This will be migrated to create real Firestore data in Phase 2.
  const currentDb = loadMockDb();
  const botUser: User = { id: `bot-${Date.now()}`, name: 'Simulated Bot', email: `bot${Date.now()}@example.com`, subscriptionStatus: 'standard', createdAt: new Date() };
  currentDb.users.push(botUser);
  saveMockDb(currentDb);
  return { message: 'Ran a simple simulation cycle: created 1 new bot user.' };
};

export const getMarketInsights = async () => {
  // This will be migrated to use real data in Phase 2.
  return {
    avgPricePerSqftMonthly: 0.08,
    avgPricePerSqftNightly: 0.03,
    amenityPopularity: [{name: 'Water Hookup', count: 8}, {name: 'Road Access', count: 7}],
    supplyByPricingModel: [{name: 'monthly' as PricingModel, value: 6, percent: '60%'}, {name: 'nightly' as PricingModel, value: 2, percent: '20%'}, {name: 'lease-to-own' as PricingModel, value: 2, percent: '20%'}],
    demandByPricingModel: [{name: 'monthly' as PricingModel, value: 10, percent: '71%'}, {name: 'nightly' as PricingModel, value: 4, percent: '29%'}],
  }
};

export const populateBookingDetails = async (booking: Booking): Promise<Booking> => {
    // This helper function enriches a booking object with names, which is useful for the UI.
    const [listing, renter, landowner] = await Promise.all([
        getListingById(booking.listingId),
        getUserById(booking.renterId),
        getUserById(booking.landownerId)
    ]);
    return { ...booking, listingTitle: listing?.title, renterName: renter?.name, landownerName: landowner?.name };
};

export const getListingsByLandownerCount = async (landownerId: string): Promise<number> => {
    if (firebaseInitializationError) {
        return loadMockDb().listings.filter(l => l.landownerId === landownerId).length;
    }
    const q = query(collection(firestoreDb, 'listings'), where('landownerId', '==', landownerId));
    const snapshot = await getDocs(q);
    return snapshot.size;
};
    
export { MOCK_USER_FOR_UI_TESTING, MOCK_GOOGLE_USER_FOR_UI_TESTING, MOCK_GABE_ADMIN_USER };
export const mockUsers = getInitialData().users;

// Admin state for checklist
export const getAdminChecklistState = async (): Promise<Set<string>> => {
    if (firebaseInitializationError) {
        // This function is now only safe to call on the client-side for mock mode.
        // The hook `useChecklistState` will handle this logic.
        throw new Error("getAdminChecklistState should not be called directly in mock mode from a server component.");
    }
    const docRef = doc(firestoreDb, 'admin_state', 'launchChecklist');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists() && docSnap.data().checkedItems) {
        return new Set(docSnap.data().checkedItems);
    }
    return new Set();
};

export const saveAdminChecklistState = async (checkedItems: Set<string>): Promise<void> => {
    if (firebaseInitializationError) {
         if (typeof window !== 'undefined') {
            localStorage.setItem('launchChecklist', JSON.stringify(Array.from(checkedItems)));
        }
        return;
    }
    const docRef = doc(firestoreDb, 'admin_state', 'launchChecklist');
    await setDoc(docRef, { checkedItems: Array.from(checkedItems) });
};
