
'use client';
import type { User, Listing, Booking, Review, SubscriptionStatus, PricingModel, Transaction, PlatformMetrics } from './types';
import { differenceInDays, differenceInCalendarMonths, startOfMonth, endOfMonth } from 'date-fns';

/**
 * @fileOverview
 * This file serves as a mock database using localStorage. It's the single source of truth for all
 * application data when Firebase is not configured (i.e., when running in a local or preview environment
 * without a `.env.local` file). It manages users, listings, bookings, and transactions, and dispatches
 * a custom 'mockDataChanged' event whenever data is saved, allowing UI components to refresh.
 */


// --- CONFIGURATION ---
const DB_KEY = 'landshare_mock_db';
export const FREE_TIER_LISTING_LIMIT = 2;
export const FREE_TIER_BOOKMARK_LIMIT = 5;
// The ADMIN_UIDS array allows easy assignment of admin privileges to specific mock users.
export const ADMIN_UIDS = ['ZsAXo79Wh8XEiHFrcJwlJT2h89F3', 'AdminGNL6965'];

// --- DATABASE STRUCTURE ---
interface MockDatabase {
  users: User[];
  listings: Listing[];
  bookings: Booking[];
  reviews: Review[];
  transactions: Transaction[];
  metrics: PlatformMetrics;
}

// --- MOCK USER DEFINITIONS ---
const MOCK_ADMIN_USER: User = { id: 'ZsAXo79Wh8XEiHFrcJwlJT2h89F3', name: 'Gabriel Leunda', email: 'admin@landshare.app', avatarUrl: 'https://placehold.co/100x100.png?text=GL', subscriptionStatus: 'premium', createdAt: new Date('2023-01-01T10:00:00Z'), bio: 'Platform Administrator.', bookmarkedListingIds: ['listing-1-sunny-meadow', 'listing-3-desert-oasis'], walletBalance: 1000000 };
const MOCK_GABE_ADMIN_USER: User = { id: 'AdminGNL6965', name: 'Gabeh', email: 'gabeh@landshare.app', avatarUrl: 'https://placehold.co/100x100.png?text=GNL', subscriptionStatus: 'premium', createdAt: new Date('2023-01-02T10:00:00Z'), bio: 'Platform Co-Administrator.', bookmarkedListingIds: [], walletBalance: 500000 };
const MOCK_USER_FOR_UI_TESTING: User = { id: 'mock-user-uid-12345', name: 'Mock UI Tester', email: 'mocktester@example.com', avatarUrl: 'https://placehold.co/100x100.png?text=MT', subscriptionStatus: 'free', createdAt: new Date('2023-01-01T10:00:00Z'), bio: 'I am a standard mock user for testing purposes.', bookmarkedListingIds: ['listing-1-sunny-meadow', 'listing-3-desert-oasis'], walletBalance: 10000 };
const MOCK_GOOGLE_USER_FOR_UI_TESTING: User = { id: 'mock-google-user-uid-67890', name: 'Mock Google User', email: 'mock.google.user@example.com', avatarUrl: 'https://placehold.co/100x100.png?text=GU', subscriptionStatus: 'premium', createdAt: new Date('2023-04-01T10:00:00Z'), bio: 'I am a mock user signed in via Google for testing purposes with premium status.', bookmarkedListingIds: [], walletBalance: 10000 };

// --- INITIAL DEFAULT DATA ---
// This function defines the default state of the mock database. It's used on first load or if localStorage is cleared.
const getInitialData = (): MockDatabase => {
    const users = [MOCK_ADMIN_USER, MOCK_GABE_ADMIN_USER, MOCK_USER_FOR_UI_TESTING, { id: 'landowner-jane-doe', name: 'Jane Doe', email: 'jane@example.com', avatarUrl: 'https://placehold.co/100x100.png?text=JD', subscriptionStatus: 'free', createdAt: new Date('2023-02-15T11:00:00Z'), bio: 'Experienced landowner with several plots available.', bookmarkedListingIds: [], walletBalance: 10000 }, { id: 'renter-john-smith', name: 'John Smith', email: 'john@example.com', avatarUrl: 'https://placehold.co/100x100.png?text=JS', subscriptionStatus: 'free', createdAt: new Date('2023-03-20T12:00:00Z'), bio: 'Looking for a quiet place for my tiny home.', bookmarkedListingIds: ['listing-2-forest-retreat'], walletBalance: 10000 }, MOCK_GOOGLE_USER_FOR_UI_TESTING];
    const listings = [ { id: 'listing-1-sunny-meadow', title: 'Sunny Meadow Plot', description: 'A beautiful sunny meadow, perfect for sustainable living. Flat land, easy access. Great for gardens.', location: 'Boulder, CO', lat: 40.0150, lng: -105.2705, sizeSqft: 5000, amenities: ['water hookup', 'road access', 'pet friendly', 'fenced'], pricingModel: 'monthly', price: 350, images: ['https://placehold.co/800x600.png?text=Sunny+Meadow', 'https://placehold.co/400x300.png?text=Meadow+View+1', 'https://placehold.co/400x300.png?text=Meadow+View+2'], landownerId: 'landowner-jane-doe', isAvailable: true, rating: 4.8, numberOfRatings: 15, leaseTerm: 'long-term', minLeaseDurationMonths: 6, isBoosted: false, createdAt: new Date('2024-07-01T10:00:00Z'), }, { id: 'listing-2-forest-retreat', title: 'Forest Retreat Lot (Monthly)', description: 'Secluded lot in a dense forest. Ideal for off-grid enthusiasts. Some clearing needed. Very private.', location: 'Asheville, NC', lat: 35.5951, lng: -82.5515, sizeSqft: 12000, amenities: ['septic system', 'fenced', 'fire pit'], pricingModel: 'monthly', price: 200, images: ['https://placehold.co/800x600.png?text=Forest+Retreat', 'https://placehold.co/400x300.png?text=Forest+View+1'], landownerId: MOCK_USER_FOR_UI_TESTING.id, isAvailable: true, rating: 4.2, numberOfRatings: 8, leaseTerm: 'flexible', isBoosted: false, createdAt: new Date('2024-06-15T14:30:00Z'), }, { id: 'listing-3-desert-oasis', title: 'Desert Oasis Spot (Short-term Monthly)', description: 'Expansive desert views with stunning sunsets. Requires water hauling. Power access nearby. Stargazing paradise.', location: 'Sedona, AZ', lat: 34.8700, lng: -111.7610, sizeSqft: 25000, amenities: ['power access', 'road access'], pricingModel: 'monthly', price: 150, images: ['https://placehold.co/800x600.png?text=Desert+Oasis'], landownerId: 'landowner-jane-doe', isAvailable: true, rating: 4.5, numberOfRatings: 10, leaseTerm: 'short-term', minLeaseDurationMonths: 1, isBoosted: false, createdAt: new Date('2024-05-01T10:00:00Z'), }, { id: 'listing-4-riverside-haven', title: 'Riverside Haven - Monthly Lease', description: 'Peaceful plot by a gentle river. Great for nature lovers. Seasonal access. Monthly lease available for fishing cabin.', location: 'Missoula, MT', lat: 46.8721, lng: -113.9940, sizeSqft: 7500, amenities: ['water hookup', 'fire pit', 'lake access', 'pet friendly'], pricingModel: 'monthly', price: 400, images: ['https://placehold.co/800x600.png?text=Riverside+Haven', 'https://placehold.co/400x300.png?text=River+View'], landownerId: MOCK_USER_FOR_UI_TESTING.id, isAvailable: true, rating: 4.9, numberOfRatings: 22, leaseTerm: 'long-term', minLeaseDurationMonths: 12, isBoosted: false, createdAt: new Date('2024-07-10T10:00:00Z'), }, { id: 'listing-5-cozy-rv-spot', title: 'Cozy RV Spot by the Lake (Nightly)', description: 'Perfect nightly getaway for your RV. Includes full hookups and stunning lake views. Min 2 nights. Book your escape!', location: 'Lake Tahoe, CA', lat: 39.0968, lng: -120.0324, sizeSqft: 1500, amenities: ['water hookup', 'power access', 'wifi available', 'pet friendly', 'lake access', 'septic system'], pricingModel: 'nightly', price: 45, images: ['https://placehold.co/800x600.png?text=RV+Lake+Spot', 'https://placehold.co/400x300.png?text=Lake+Sunset'], landownerId: 'landowner-jane-doe', isAvailable: true, rating: 4.7, numberOfRatings: 12, isBoosted: false, leaseTerm: 'short-term', createdAt: new Date('2024-06-01T09:00:00Z'), }, { id: 'listing-6-mountain-homestead-lto', title: 'Mountain Homestead - Lease to Own!', description: 'Your chance to own a piece of the mountains! This spacious lot is offered with a lease-to-own option. Build your dream cabin or sustainable farm. Terms negotiable.', location: 'Boone, NC', lat: 36.2168, lng: -81.6746, sizeSqft: 45000, amenities: ['road access', 'septic system' ], pricingModel: 'lease-to-own', price: 650, downPayment: 5000, leaseToOwnDetails: "5-year lease-to-own program. $5,000 down payment. Estimated monthly payment of $650 (PITI estimate). Final purchase price: $75,000. Subject to credit approval and LTO agreement. Owner financing available.", images: ['https://placehold.co/800x600.png?text=Mountain+LTO', 'https://placehold.co/400x300.png?text=Creek+Nearby', 'https://placehold.co/400x300.png?text=Site+Plan'], landownerId: MOCK_USER_FOR_UI_TESTING.id, isAvailable: true, rating: 4.3, numberOfRatings: 5, isBoosted: false, leaseTerm: 'long-term', minLeaseDurationMonths: 60, createdAt: new Date('2024-05-15T11:00:00Z'), }, { id: 'listing-7-basic-rural-plot', title: 'Basic Rural Plot - Affordable Monthly!', description: 'A very basic, undeveloped plot of land in a quiet rural area. No frills, just space. Perfect for raw land camping (check local ordinances) or a very simple, self-contained setup.', location: 'Rural Plains, KS', lat: 37.7749, lng: -97.3308, sizeSqft: 22000, amenities: [], pricingModel: 'monthly', price: 75, images: ['https://placehold.co/800x600.png?text=Basic+Plot'], landownerId: 'landowner-jane-doe', isAvailable: true, rating: 2.5, numberOfRatings: 2, isBoosted: false, leaseTerm: 'flexible', createdAt: new Date('2024-04-01T16:00:00Z'), }, { id: 'listing-8-premium-view-lot-rented', title: 'Premium View Lot (Currently Rented)', description: 'Unobstructed ocean views from this premium lot. Currently under a long-term lease. Not available for new bookings.', location: 'Big Sur, CA', lat: 36.2704, lng: -121.8081, sizeSqft: 10000, amenities: ['power access', 'water hookup', 'fenced', 'wifi available', 'septic system'], pricingModel: 'monthly', price: 1200, images: ['https://placehold.co/800x600.png?text=Rented+View+Lot'], landownerId: MOCK_USER_FOR_UI_TESTING.id, isAvailable: false, rating: 4.9, numberOfRatings: 35, isBoosted: true, leaseTerm: 'long-term', minLeaseDurationMonths: 12, createdAt: new Date('2023-08-10T12:00:00Z'), }, { id: 'listing-9-miami-nightly', title: 'Miami Urban Garden Plot (Nightly)', description: 'A rare open plot in Miami, perfect for short-term events, urban gardening projects, or RV parking. Nightly rates available.', location: 'Miami, FL', lat: 25.7617, lng: -80.1918, sizeSqft: 2500, amenities: ['power access', 'water hookup', 'fenced', 'road access'], pricingModel: 'nightly', price: 75, images: ['https://placehold.co/800x600.png?text=Miami+Plot'], landownerId: 'landowner-jane-doe', isAvailable: true, rating: 4.6, numberOfRatings: 9, isBoosted: false, leaseTerm: 'short-term', createdAt: new Date('2024-07-20T10:00:00Z'), }, { id: 'listing-10-orlando-lto', title: 'Orlando LTO Opportunity near Attractions', description: 'Lease-to-own this conveniently located lot in the greater Orlando area. A great investment for a future home base.', location: 'Orlando, FL', lat: 28.5383, lng: -81.3792, sizeSqft: 6000, amenities: ['power access', 'water hookup', 'road access', 'septic system'], pricingModel: 'lease-to-own', price: 550, downPayment: 3000, leaseToOwnDetails: "3-year lease-to-own option. $3,000 down. Estimated monthly payment of $550. Final purchase price: $60,000. Close to main roads.", images: ['https://placehold.co/800x600.png?text=Orlando+LTO+Lot'], landownerId: MOCK_GOOGLE_USER_FOR_UI_TESTING.id, isAvailable: true, rating: 4.1, numberOfRatings: 3, isBoosted: true, leaseTerm: 'long-term', minLeaseDurationMonths: 36, createdAt: new Date('2024-07-18T10:00:00Z'), } ];
    const bookings = [ { id: 'booking-1', listingId: 'listing-1-sunny-meadow', listingTitle: 'Sunny Meadow Plot', renterId: 'renter-john-smith', renterName: 'John Smith', landownerId: 'landowner-jane-doe', landownerName: 'Jane Doe', status: 'Confirmed', dateRange: { from: new Date('2024-01-01'), to: new Date('2024-06-30') }, createdAt: new Date('2023-12-15T10:00:00Z'), }, { id: 'booking-2', listingId: 'listing-2-forest-retreat', listingTitle: 'Forest Retreat Lot (Monthly)', renterId: 'renter-john-smith', renterName: 'John Smith', landownerId: MOCK_USER_FOR_UI_TESTING.id, landownerName: MOCK_USER_FOR_UI_TESTING.name, status: 'Pending Confirmation', dateRange: { from: new Date('2024-08-01'), to: new Date('2024-09-01') }, createdAt: new Date('2024-07-20T11:00:00Z'), }, { id: 'booking-3', listingId: 'listing-1-sunny-meadow', listingTitle: 'Sunny Meadow Plot', renterId: MOCK_ADMIN_USER.id, renterName: MOCK_ADMIN_USER.name, landownerId: 'landowner-jane-doe', landownerName: 'Jane Doe', status: 'Declined', dateRange: { from: new Date('2024-07-01'), to: new Date('2024-08-01') }, createdAt: new Date('2024-06-25T12:00:00Z'), }, { id: 'booking-4-nightly', listingId: 'listing-5-cozy-rv-spot', listingTitle: 'Cozy RV Spot by the Lake (Nightly)', renterId: 'renter-john-smith', renterName: 'John Smith', landownerId: 'landowner-jane-doe', landownerName: 'Jane Doe', status: 'Confirmed', dateRange: { from: new Date('2024-07-10'), to: new Date('2024-07-15') }, createdAt: new Date('2024-06-01T10:00:00Z'), }, { id: 'booking-5-lto-pending', listingId: 'listing-6-mountain-homestead-lto', listingTitle: 'Mountain Homestead - Lease to Own!', renterId: 'renter-john-smith', renterName: 'John Smith', landownerId: MOCK_USER_FOR_UI_TESTING.id, landownerName: MOCK_USER_FOR_UI_TESTING.name, status: 'Pending Confirmation', dateRange: { from: new Date('2024-09-01'), to: new Date('2029-08-31') }, createdAt: new Date('2024-07-25T10:00:00Z'), }, { id: 'booking-6-mockuser-pending', listingId: 'listing-1-sunny-meadow', listingTitle: 'Sunny Meadow Plot', renterId: MOCK_USER_FOR_UI_TESTING.id, renterName: MOCK_USER_FOR_UI_TESTING.name, landownerId: 'landowner-jane-doe', landownerName: 'Jane Doe', status: 'Pending Confirmation', dateRange: { from: new Date('2024-10-01'), to: new Date('2024-10-15') }, createdAt: new Date('2024-07-28T11:00:00Z'), }, ];
    const reviews = [ { id: 'review-1', listingId: 'listing-1-sunny-meadow', userId: 'renter-john-smith', userName: 'John Smith', rating: 5, comment: 'Absolutely loved this spot! Jane was a great host. The meadow is beautiful and well-kept.', createdAt: new Date('2023-07-01T10:00:00Z'), }, { id: 'review-2', listingId: 'listing-2-forest-retreat', userId: 'landowner-jane-doe', userName: 'Jane Doe', rating: 4, comment: 'Nice and secluded, a bit rough around the edges but has potential. Mock Tester was responsive.', createdAt: new Date('2023-12-01T11:00:00Z'), }, { id: 'review-3-nightly', listingId: 'listing-5-cozy-rv-spot', userId: 'renter-john-smith', userName: 'John Smith', rating: 5, comment: 'Amazing RV spot, beautiful views and all hookups worked perfectly. Will be back!', createdAt: new Date('2024-07-16T10:00:00Z'), }, { id: 'review-4-lto', listingId: 'listing-6-mountain-homestead-lto', userId: 'renter-john-smith', userName: 'John Smith', rating: 4, comment: 'Interesting LTO option. Land is raw but promising. Landowner (Admin) was helpful with initial info.', createdAt: new Date('2024-05-01T10:00:00Z'), }, { id: 'review-5-basic', listingId: 'listing-7-basic-rural-plot', userId: MOCK_USER_FOR_UI_TESTING.id, userName: MOCK_USER_FOR_UI_TESTING.name, rating: 2, comment: 'It truly is basic, but the price was right for what it is. No surprises. Good for minimalists.', createdAt: new Date('2024-06-10T10:00:00Z'), }, { id: 'review-6-riverside', listingId: 'listing-4-riverside-haven', userId: 'landowner-jane-doe', userName: 'Jane Doe', rating: 5, comment: 'A truly fantastic spot for a long-term lease. Host was accommodating. River access is a huge plus.', createdAt: new Date('2024-07-15T10:00:00Z'), }, ];
    const transactions = [ { id: 'txn1', userId: MOCK_USER_FOR_UI_TESTING.id, type: 'Subscription', status: 'Completed', amount: -5.00, currency: 'USD', date: new Date('2024-07-01T00:00:00Z'), description: 'Premium Subscription - July' }, { id: 'txn2', userId: MOCK_USER_FOR_UI_TESTING.id, type: 'Landowner Payout', status: 'Completed', amount: 196.00, currency: 'USD', date: new Date('2024-07-05T00:00:00Z'), description: 'Payout for Forest Retreat Lot' }, { id: 'txn3', userId: MOCK_USER_FOR_UI_TESTING.id, type: 'Service Fee', status: 'Completed', amount: -4.00, currency: 'USD', date: new Date('2024-07-05T00:00:00Z'), description: 'Service Fee (2%) for Forest Retreat Lot' }, { id: 'txn4', userId: 'landowner-jane-doe', type: 'Landowner Payout', status: 'Completed', amount: 343.00, currency: 'USD', date: new Date('2024-07-08T00:00:00Z'), description: 'Payout for Sunny Meadow Plot' }, { id: 'txn5', userId: 'landowner-jane-doe', type: 'Service Fee', status: 'Completed', amount: -7.00, currency: 'USD', date: new Date('2024-07-08T00:00:00Z'), description: 'Service Fee (2%) for Sunny Meadow Plot' }, { id: 'txn6', userId: 'renter-john-smith', type: 'Booking Payment', status: 'Completed', amount: -2100.99, currency: 'USD', date: new Date('2023-12-15T00:00:00Z'), description: 'Payment for Sunny Meadow Plot (6 months)' }, { id: 'txn7', userId: 'renter-john-smith', type: 'Booking Payment', status: 'Pending', amount: -200.99, currency: 'USD', date: new Date('2024-07-20T00:00:00Z'), description: 'Payment for Forest Retreat Lot' }, ];
    const metrics: PlatformMetrics = { id: 'global_metrics', totalRevenue: 16.00, totalServiceFees: 11.00, totalSubscriptionRevenue: 5.00, totalUsers: users.length, totalListings: listings.length, totalBookings: bookings.length };
    return { users, listings, bookings, reviews, transactions, metrics };
};

// --- CORE DATABASE FUNCTIONS ---

// This variable holds the database in memory for server-side rendering environments where localStorage is not available.
let db: MockDatabase | null = null;

/**
 * Loads the mock database.
 * In the browser, it attempts to load from localStorage. If that fails or is not present, it loads the initial default data.
 * On the server, it uses an in-memory variable.
 * @returns The mock database object.
 */
function loadDb(): MockDatabase {
    if (typeof window === 'undefined') {
        if (!db) {
            db = getInitialData();
        }
        return db;
    }

    try {
        const storedDb = localStorage.getItem(DB_KEY);
        if (storedDb) {
            const parsed = JSON.parse(storedDb, (key, value) => {
                if (key === 'createdAt' || key === 'from' || key === 'to' || key === 'date') {
                    if (value) return new Date(value);
                }
                return value;
            });
            return parsed;
        }
    } catch (error) {
        console.error("Failed to load or parse mock DB from localStorage, resetting.", error);
    }
    
    const initialData = getInitialData();
    saveDb(initialData);
    return initialData;
}

/**
 * Saves the current state of the database to localStorage and dispatches an event to notify the app of changes.
 * This is the single point of truth for updating the mock database.
 * It also centralizes the recalculation of platform metrics to ensure consistency.
 * @param newDb The new database state to save.
 */
function saveDb(newDb: MockDatabase) {
    // Before saving, always recalculate platform-wide metrics to ensure they are up-to-date.
    // This centralized approach prevents inconsistent metric states.
    const users = newDb.users.filter(u => !u.id.startsWith('bot-'));
    const transactions = newDb.transactions;
    const totalServiceFees = transactions.filter(t => t.type === 'Service Fee' && t.status === 'Completed').reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const totalSubscriptionRevenue = transactions.filter(t => t.type === 'Subscription' && t.status === 'Completed').reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    newDb.metrics = {
      id: 'global_metrics',
      totalUsers: users.length,
      totalListings: newDb.listings.length,
      totalBookings: newDb.bookings.length,
      totalServiceFees,
      totalSubscriptionRevenue,
      totalRevenue: totalServiceFees + totalSubscriptionRevenue
    };


    if (typeof window === 'undefined') {
        db = newDb;
        return;
    }
    localStorage.setItem(DB_KEY, JSON.stringify(newDb));
    // This custom event allows other parts of the app (like hooks) to react to data changes.
    window.dispatchEvent(new CustomEvent('mockDataChanged'));
}

// Ensure DB is loaded on module initialization
db = loadDb();

// --- DATA ACCESS & MUTATION FUNCTIONS ---

// --- User Functions ---
export const getUserById = async (id: string): Promise<User | undefined> => {
  const currentDb = loadDb();
  return currentDb.users.find(user => user.id === id);
};

export const createUserProfile = async (userId: string, email: string, name?: string | null, avatarUrl?: string | null): Promise<User> => {
  const currentDb = loadDb();
  const existingUser = currentDb.users.find(u => u.id === userId);
  if (existingUser) return existingUser;

  const newUser: User = {
    id: userId,
    email: email,
    name: name || email.split('@')[0] || 'Anonymous User',
    avatarUrl: avatarUrl || `https://placehold.co/100x100.png?text=${(name || email.split('@')[0] || 'U').charAt(0).toUpperCase()}`,
    subscriptionStatus: 'free',
    createdAt: new Date(),
    bio: "Welcome to LandShare!",
    bookmarkedListingIds: [],
    walletBalance: 10000,
  };
  currentDb.users.push(newUser);
  saveDb(currentDb);
  return newUser;
};

export const updateUserProfile = async (userId: string, data: Partial<User>): Promise<User | undefined> => {
  const currentDb = loadDb();
  const userIndex = currentDb.users.findIndex(u => u.id === userId);
  if (userIndex !== -1) {
    // If subscription status changes, create a transaction record.
    const oldStatus = currentDb.users[userIndex].subscriptionStatus;
    const newStatus = data.subscriptionStatus;
    if (newStatus && oldStatus !== newStatus) {
        if (newStatus === 'premium') {
             currentDb.transactions.unshift({ id: `txn-${Date.now()}`, userId, type: 'Subscription', status: 'Completed', amount: -5.00, currency: 'USD', date: new Date(), description: 'Upgrade to Premium Subscription' });
             currentDb.users[userIndex].walletBalance = (currentDb.users[userIndex].walletBalance ?? 0) - 5.00;
        } else if (newStatus === 'free') {
            currentDb.transactions.unshift({ id: `txn-${Date.now()}`, userId, type: 'Subscription Refund', status: 'Completed', amount: 5.00, currency: 'USD', date: new Date(), description: 'Refund for Premium Subscription Downgrade' });
            currentDb.users[userIndex].walletBalance = (currentDb.users[userIndex].walletBalance ?? 0) + 5.00;
        }
    }
    
    currentDb.users[userIndex] = { ...currentDb.users[userIndex], ...data };
    saveDb(currentDb);
    return currentDb.users[userIndex];
  }
  return undefined;
};


// --- Listing Functions ---
export const getListings = async (): Promise<Listing[]> => {
  const currentDb = loadDb();
  return [...currentDb.listings].sort((a, b) => {
    // Prioritize boosted listings
    if (a.isBoosted && !b.isBoosted) return -1;
    if (!a.isBoosted && b.isBoosted) return 1;
    // Then sort by creation date
    const timeA = (a.createdAt instanceof Date ? a.createdAt : new Date(0)).getTime();
    const timeB = (b.createdAt instanceof Date ? b.createdAt : new Date(0)).getTime();
    return timeB - timeA;
  });
};

export const getListingById = async (id: string): Promise<Listing | undefined> => {
  const currentDb = loadDb();
  return currentDb.listings.find(listing => listing.id === id);
};

export const addListing = async (data: Omit<Listing, 'id'>, isLandownerPremium: boolean = false): Promise<Listing> => {
  const currentDb = loadDb();
  const newListing: Listing = {
    ...data,
    id: `listing-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    isBoosted: isLandownerPremium,
  };
  currentDb.listings.unshift(newListing);
  saveDb(currentDb);
  return newListing;
};

export const updateListing = async (listingId: string, data: Partial<Listing>): Promise<Listing | undefined> => {
  const currentDb = loadDb();
  const listingIndex = currentDb.listings.findIndex(l => l.id === listingId);
  if (listingIndex !== -1) {
      currentDb.listings[listingIndex] = { ...currentDb.listings[listingIndex], ...data };
      saveDb(currentDb);
      return currentDb.listings[listingIndex];
  }
  return undefined;
};


export const deleteListing = async (listingId: string): Promise<boolean> => {
  const currentDb = loadDb();
  const initialLength = currentDb.listings.length;
  currentDb.listings = currentDb.listings.filter(l => l.id !== listingId);
  // Also remove related data for consistency
  currentDb.bookings = currentDb.bookings.filter(b => b.listingId !== listingId);
  currentDb.reviews = currentDb.reviews.filter(r => r.listingId !== listingId);
  const deleted = currentDb.listings.length < initialLength;
  if (deleted) {
    saveDb(currentDb);
  }
  return deleted;
};

// --- Review Functions ---
export const getReviewsForListing = async (listingId: string): Promise<Review[]> => {
  const currentDb = loadDb();
  return currentDb.reviews.filter(review => review.listingId === listingId)
    .sort((a, b) => (b.createdAt as Date).getTime() - (a.createdAt as Date).getTime());
};

// --- Booking Functions ---
export const getBookingsForUser = async (userId: string): Promise<Booking[]> => {
  const currentDb = loadDb();
  // Find bookings where the user is either the renter or the landowner
  return currentDb.bookings
    .filter(b => b.renterId === userId || b.landownerId === userId)
    .map(booking => {
        // Populate with names for easier display in the UI
        const listing = currentDb.listings.find(l => l.id === booking.listingId);
        const renter = currentDb.users.find(u => u.id === booking.renterId);
        const landowner = currentDb.users.find(u => u.id === booking.landownerId);
        return { ...booking, listingTitle: listing?.title, renterName: renter?.name, landownerName: landowner?.name };
    })
    .sort((a,b) => (b.createdAt as Date).getTime() - (a.createdAt as Date).getTime());
};

export const addBookingRequest = async (data: Omit<Booking, 'id' | 'status' | 'createdAt' | 'listingTitle' | 'renterName' | 'landownerName'>, status: Booking['status'] = 'Pending Confirmation'): Promise<Booking> => {
  const currentDb = loadDb();
  const listingInfo = currentDb.listings.find(l => l.id === data.listingId);
  if (!listingInfo) throw new Error("Listing not found for booking request.");
  const renterInfo = currentDb.users.find(u => u.id === data.renterId);
  if (!renterInfo) throw new Error("Renter profile not found.");
  const landownerInfo = currentDb.users.find(u => u.id === listingInfo.landownerId);
  if (!landownerInfo) throw new Error("Landowner profile not found.");
  
  const newBooking: Booking = { 
    ...data, id: `booking-${Date.now()}`, landownerId: listingInfo.landownerId, status, createdAt: new Date(),
    listingTitle: listingInfo.title, renterName: renterInfo.name, landownerName: landownerInfo.name,
  };
  currentDb.bookings.unshift(newBooking);
  saveDb(currentDb);
  return newBooking;
};

// --- Booking Economic Engine ---
const _calculateBookingPrice = (listing: Listing, booking: Booking): number => {
    const fromDate = booking.dateRange.from instanceof Date ? booking.dateRange.from : (booking.dateRange.from as any).toDate();
    const toDate = booking.dateRange.to instanceof Date ? booking.dateRange.to : (booking.dateRange.to as any).toDate();

    if (listing.pricingModel === 'nightly') {
        const days = differenceInDays(toDate, fromDate) + 1;
        return listing.price * days;
    }
    if (listing.pricingModel === 'monthly') {
        const fullMonths = differenceInCalendarMonths(endOfMonth(toDate), startOfMonth(fromDate)) + 1;
        return listing.price * fullMonths;
    }
    if (listing.pricingModel === 'lease-to-own') {
        const fullMonths = differenceInCalendarMonths(endOfMonth(toDate), startOfMonth(fromDate)) + 1;
        return listing.price * fullMonths;
    }
    return 0; // Should not happen
};

const _calculateServiceFee = (totalPrice: number, landowner: User): number => {
    const feeRate = landowner.subscriptionStatus === 'premium' ? 0.0049 : 0.02;
    return totalPrice * feeRate;
};

const _processBookingConfirmation = (db: MockDatabase, booking: Booking): MockDatabase => {
    const listing = db.listings.find(l => l.id === booking.listingId);
    const renter = db.users.find(u => u.id === booking.renterId);
    const landowner = db.users.find(u => u.id === booking.landownerId);

    if (!listing || !renter || !landowner) {
        console.error("Missing data for booking confirmation:", {listing, renter, landowner});
        throw new Error("Could not process booking confirmation due to missing user or listing data.");
    }

    const totalPrice = _calculateBookingPrice(listing, booking);
    const renterFee = renter.subscriptionStatus === 'premium' ? 0 : 0.99;
    const finalRenterCost = totalPrice + renterFee;
    const serviceFee = _calculateServiceFee(totalPrice, landowner);
    const landownerPayout = totalPrice - serviceFee;

    // --- Create Transactions ---
    // 1. Renter payment
    db.transactions.unshift({ id: `txn-${Date.now()}-payment`, userId: renter.id, type: 'Booking Payment', status: 'Completed', amount: -finalRenterCost, currency: 'USD', date: new Date(), description: `Payment for "${listing.title}"`, relatedBookingId: booking.id, relatedListingId: listing.id });
    // 2. Landowner Service Fee
    db.transactions.unshift({ id: `txn-${Date.now()}-fee`, userId: landowner.id, type: 'Service Fee', status: 'Completed', amount: -serviceFee, currency: 'USD', date: new Date(), description: `Service Fee for "${listing.title}"`, relatedBookingId: booking.id, relatedListingId: listing.id });
    // 3. Landowner Payout
    db.transactions.unshift({ id: `txn-${Date.now()}-payout`, userId: landowner.id, type: 'Landowner Payout', status: 'Completed', amount: landownerPayout, currency: 'USD', date: new Date(), description: `Payout for "${listing.title}"`, relatedBookingId: booking.id, relatedListingId: listing.id });

    // --- Update Wallets ---
    renter.walletBalance = (renter.walletBalance ?? 0) - finalRenterCost;
    landowner.walletBalance = (landowner.walletBalance ?? 0) + landownerPayout;
    
    return db;
};

const _processRefund = (db: MockDatabase, booking: Booking): MockDatabase => {
    const listing = db.listings.find(l => l.id === booking.listingId);
    const renter = db.users.find(u => u.id === booking.renterId);
    const landowner = db.users.find(u => u.id === booking.landownerId);

    if (!listing || !renter || !landowner) {
        console.error("Missing data for refund processing:", {listing, renter, landowner});
        throw new Error("Could not process refund due to missing user or listing data.");
    }

    const totalPrice = _calculateBookingPrice(listing, booking);
    const renterFee = renter.subscriptionStatus === 'premium' ? 0 : 0.99;
    const originalRenterCost = totalPrice + renterFee;
    const serviceFee = _calculateServiceFee(totalPrice, landowner);
    const originalLandownerPayout = totalPrice - serviceFee;

    // --- Create Reversal Transactions ---
    db.transactions.unshift({ id: `txn-${Date.now()}-refund`, userId: renter.id, type: 'Booking Refund', status: 'Completed', amount: originalRenterCost, currency: 'USD', date: new Date(), description: `Refund for "${listing.title}"`, relatedBookingId: booking.id, relatedListingId: listing.id });
    db.transactions.unshift({ id: `txn-${Date.now()}-reversal`, userId: landowner.id, type: 'Payout Reversal', status: 'Completed', amount: -originalLandownerPayout, currency: 'USD', date: new Date(), description: `Payout Reversal for "${listing.title}"`, relatedBookingId: booking.id, relatedListingId: listing.id });

    // --- Update Wallets ---
    renter.walletBalance = (renter.walletBalance ?? 0) + originalRenterCost;
    landowner.walletBalance = (landowner.walletBalance ?? 0) - originalLandownerPayout;
    
    return db;
};

export const updateBookingStatus = async (bookingId: string, newStatus: Booking['status']): Promise<Booking | undefined> => {
    let currentDb = loadDb();
    const bookingIndex = currentDb.bookings.findIndex(b => b.id === bookingId);
    if (bookingIndex === -1) return undefined;

    const booking = currentDb.bookings[bookingIndex];
    const oldStatus = booking.status;
    
    // Prevent re-processing
    if(oldStatus === newStatus) return booking;

    booking.status = newStatus;

    try {
        if (newStatus === 'Confirmed' && oldStatus === 'Pending Confirmation') {
            currentDb = _processBookingConfirmation(currentDb, booking);
        } else if (newStatus === 'Refund Approved' && oldStatus === 'Refund Requested') {
            currentDb = _processRefund(currentDb, booking);
        }
        
        saveDb(currentDb);
        return booking;

    } catch (error) {
        console.error("Error processing booking status change:", error);
        // Rollback status change on error
        currentDb.bookings[bookingIndex].status = oldStatus;
        saveDb(currentDb);
        throw error;
    }
};


// --- Transaction Functions ---
export const getTransactionsForUser = async (userId: string): Promise<Transaction[]> => {
    const currentDb = loadDb();
    return currentDb.transactions.filter(t => t.userId === userId)
      .sort((a,b) => (b.date as Date).getTime() - (a.date as Date).getTime());
};


// --- Bookmark Functions ---
export const addBookmarkToList = async (userId: string, listingId: string): Promise<User | undefined> => {
  const currentDb = loadDb();
  const userIndex = currentDb.users.findIndex(u => u.id === userId);
  if (userIndex !== -1) {
    const user = currentDb.users[userIndex];
    if (user.subscriptionStatus === 'free' && (user.bookmarkedListingIds?.length || 0) >= FREE_TIER_BOOKMARK_LIMIT) {
      throw new Error(`Bookmark limit of ${FREE_TIER_BOOKMARK_LIMIT} reached for free accounts.`);
    }
    if (!user.bookmarkedListingIds?.includes(listingId)) {
      user.bookmarkedListingIds = [...(user.bookmarkedListingIds || []), listingId];
      saveDb(currentDb);
    }
    return user;
  }
  return undefined;
};

export const removeBookmarkFromList = async (userId: string, listingId: string): Promise<User | undefined> => {
  const currentDb = loadDb();
  const userIndex = currentDb.users.findIndex(u => u.id === userId);
  if (userIndex !== -1) {
    const user = currentDb.users[userIndex];
    if (user.bookmarkedListingIds?.includes(listingId)) {
      user.bookmarkedListingIds = (user.bookmarkedListingIds || []).filter(id => id !== listingId);
      saveDb(currentDb);
    }
    return user;
  }
  return undefined;
};

// --- Admin & Bot Functions ---
export const getPlatformMetrics = async (): Promise<PlatformMetrics> => {
  const currentDb = loadDb();
  return currentDb.metrics;
};

export const runBotSimulationCycle = async (): Promise<{ message: string }> => {
  // This is a placeholder for a more complex simulation.
  // In a real scenario, this would create users, listings, bookings, and transactions.
  const currentDb = loadDb();
  const botUser: User = { id: `bot-${Date.now()}`, name: 'Simulated Bot', email: `bot${Date.now()}@example.com`, subscriptionStatus: 'free', createdAt: new Date() };
  currentDb.users.push(botUser);
  saveDb(currentDb);
  return { message: 'Ran a simple simulation cycle: created 1 new bot user.' };
};

export const getMarketInsights = async () => {
  return {
    avgPricePerSqftMonthly: 0.08,
    avgPricePerSqftNightly: 0.03,
    amenityPopularity: [{name: 'Water Hookup', count: 8}, {name: 'Road Access', count: 7}],
    supplyByPricingModel: [{name: 'monthly' as PricingModel, value: 6, percent: '60%'}, {name: 'nightly' as PricingModel, value: 2, percent: '20%'}, {name: 'lease-to-own' as PricingModel, value: 2, percent: '20%'}],
    demandByPricingModel: [{name: 'monthly' as PricingModel, value: 10, percent: '71%'}, {name: 'nightly' as PricingModel, value: 4, percent: '29%'}],
  }
};

export const populateBookingDetails = async (booking: Booking): Promise<Booking> => {
    const currentDb = loadDb();
    const listing = currentDb.listings.find(l => l.id === booking.listingId);
    const renter = currentDb.users.find(u => u.id === booking.renterId);
    const landowner = currentDb.users.find(u => u.id === booking.landownerId);
    return { ...booking, listingTitle: listing?.title, renterName: renter?.name, landownerName: landowner?.name };
};

export const getListingsByLandownerCount = async (landownerId: string): Promise<number> => {
    const currentDb = loadDb();
    return currentDb.listings.filter(l => l.landownerId === landownerId).length;
};
    
// Exporting mock users for auth context usage
export { MOCK_USER_FOR_UI_TESTING, MOCK_GOOGLE_USER_FOR_UI_TESTING, MOCK_ADMIN_USER, MOCK_GABE_ADMIN_USER };
export const mockUsers = loadDb().users;
export const incrementMockDataVersion = () => {
  // This is a dummy function to notify listeners. The actual data is re-read from localStorage.
  window.dispatchEvent(new CustomEvent('mockDataChanged'));
};
