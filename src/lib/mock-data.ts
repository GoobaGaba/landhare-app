
'use client';
import type { User, Listing, Booking, Review, SubscriptionStatus, PricingModel, Transaction, PriceDetails, PlatformMetrics, MarketInsightsData } from './types';
import { differenceInDays, addDays } from 'date-fns';

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
const BOT_LANDOWNER_1: User = { id: 'bot-landowner-1', name: 'Bot Host Alice', email: 'bot.alice@landshare.app', subscriptionStatus: 'premium', walletBalance: 50000, createdAt: new Date() };
const BOT_RENTER_1: User = { id: 'bot-renter-1', name: 'Bot Renter Bob', email: 'bot.bob@landshare.app', subscriptionStatus: 'free', walletBalance: 3000, createdAt: new Date() };
const BOT_RENTER_2: User = { id: 'bot-renter-2', name: 'Bot Renter Charlie', email: 'bot.charlie@landshare.app', subscriptionStatus: 'premium', walletBalance: 8000, createdAt: new Date() };

// --- INITIAL DEFAULT DATA ---
// This function defines the default state of the mock database. It's used on first load or if localStorage is cleared.
const getInitialData = (): MockDatabase => {
    const users = [MOCK_ADMIN_USER, MOCK_GABE_ADMIN_USER, MOCK_USER_FOR_UI_TESTING, { id: 'landowner-jane-doe', name: 'Jane Doe', email: 'jane@example.com', avatarUrl: 'https://placehold.co/100x100.png?text=JD', subscriptionStatus: 'free', createdAt: new Date('2023-02-15T11:00:00Z'), bio: 'Experienced landowner with several plots available.', bookmarkedListingIds: [], walletBalance: 10000 }, { id: 'renter-john-smith', name: 'John Smith', email: 'john@example.com', avatarUrl: 'https://placehold.co/100x100.png?text=JS', subscriptionStatus: 'free', createdAt: new Date('2023-03-20T12:00:00Z'), bio: 'Looking for a quiet place for my tiny home.', bookmarkedListingIds: ['listing-2-forest-retreat'], walletBalance: 10000 }, MOCK_GOOGLE_USER_FOR_UI_TESTING, BOT_LANDOWNER_1, BOT_RENTER_1, BOT_RENTER_2];
    const listings = [ { id: 'listing-1-sunny-meadow', title: 'Sunny Meadow Plot', description: 'A beautiful sunny meadow, perfect for sustainable living. Flat land, easy access. Great for gardens.', location: 'Boulder, CO', lat: 40.0150, lng: -105.2705, sizeSqft: 5000, amenities: ['water hookup', 'road access', 'pet friendly', 'fenced'], pricingModel: 'monthly', price: 350, images: ['https://placehold.co/800x600.png?text=Sunny+Meadow', 'https://placehold.co/400x300.png?text=Meadow+View+1', 'https://placehold.co/400x300.png?text=Meadow+View+2'], landownerId: 'landowner-jane-doe', isAvailable: true, rating: 4.8, numberOfRatings: 15, leaseTerm: 'long-term', minLeaseDurationMonths: 6, isBoosted: false, createdAt: new Date('2024-07-01T10:00:00Z'), }, { id: 'listing-2-forest-retreat', title: 'Forest Retreat Lot (Monthly)', description: 'Secluded lot in a dense forest. Ideal for off-grid enthusiasts. Some clearing needed. Very private.', location: 'Asheville, NC', lat: 35.5951, lng: -82.5515, sizeSqft: 12000, amenities: ['septic system', 'fenced', 'fire pit'], pricingModel: 'monthly', price: 200, images: ['https://placehold.co/800x600.png?text=Forest+Retreat', 'https://placehold.co/400x300.png?text=Forest+View+1'], landownerId: MOCK_USER_FOR_UI_TESTING.id, isAvailable: true, rating: 4.2, numberOfRatings: 8, leaseTerm: 'flexible', isBoosted: false, createdAt: new Date('2024-06-15T14:30:00Z'), }, { id: 'listing-3-desert-oasis', title: 'Desert Oasis Spot (Short-term Monthly)', description: 'Expansive desert views with stunning sunsets. Requires water hauling. Power access nearby. Stargazing paradise.', location: 'Sedona, AZ', lat: 34.8700, lng: -111.7610, sizeSqft: 25000, amenities: ['power access', 'road access'], pricingModel: 'monthly', price: 150, images: ['https://placehold.co/800x600.png?text=Desert+Oasis'], landownerId: 'landowner-jane-doe', isAvailable: true, rating: 4.5, numberOfRatings: 10, leaseTerm: 'short-term', minLeaseDurationMonths: 1, isBoosted: false, createdAt: new Date('2024-05-01T10:00:00Z'), }, { id: 'listing-4-riverside-haven', title: 'Riverside Haven - Monthly Lease', description: 'Peaceful plot by a gentle river. Great for nature lovers. Seasonal access. Monthly lease available for fishing cabin.', location: 'Missoula, MT', lat: 46.8721, lng: -113.9940, sizeSqft: 7500, amenities: ['water hookup', 'fire pit', 'lake access', 'pet friendly'], pricingModel: 'monthly', price: 400, images: ['https://placehold.co/800x600.png?text=Riverside+Haven', 'https://placehold.co/400x300.png?text=River+View'], landownerId: MOCK_USER_FOR_UI_TESTING.id, isAvailable: true, rating: 4.9, numberOfRatings: 22, leaseTerm: 'long-term', minLeaseDurationMonths: 12, isBoosted: false, createdAt: new Date('2024-07-10T10:00:00Z'), }, { id: 'listing-5-cozy-rv-spot', title: 'Cozy RV Spot by the Lake (Nightly)', description: 'Perfect nightly getaway for your RV. Includes full hookups and stunning lake views. Min 2 nights. Book your escape!', location: 'Lake Tahoe, CA', lat: 39.0968, lng: -120.0324, sizeSqft: 1500, amenities: ['water hookup', 'power access', 'wifi available', 'pet friendly', 'lake access', 'septic system'], pricingModel: 'nightly', price: 45, images: ['https://placehold.co/800x600.png?text=RV+Lake+Spot', 'https://placehold.co/400x300.png?text=Lake+Sunset'], landownerId: 'landowner-jane-doe', isAvailable: true, rating: 4.7, numberOfRatings: 12, isBoosted: false, leaseTerm: 'short-term', createdAt: new Date('2024-06-01T09:00:00Z'), }, { id: 'listing-6-mountain-homestead-lto', title: 'Mountain Homestead - Lease to Own!', description: 'Your chance to own a piece of the mountains! This spacious lot is offered with a lease-to-own option. Build your dream cabin or sustainable farm. Terms negotiable.', location: 'Boone, NC', lat: 36.2168, lng: -81.6746, sizeSqft: 45000, amenities: ['road access', 'septic system' ], pricingModel: 'lease-to-own', price: 650, downPayment: 5000, leaseToOwnDetails: "5-year lease-to-own program. $5,000 down payment. Estimated monthly payment of $650 (PITI estimate). Final purchase price: $75,000. Subject to credit approval and LTO agreement. Owner financing available.", images: ['https://placehold.co/800x600.png?text=Mountain+LTO', 'https://placehold.co/400x300.png?text=Creek+Nearby', 'https://placehold.co/400x300.png?text=Site+Plan'], landownerId: MOCK_USER_FOR_UI_TESTING.id, isAvailable: true, rating: 4.3, numberOfRatings: 5, isBoosted: false, leaseTerm: 'long-term', minLeaseDurationMonths: 60, createdAt: new Date('2024-05-15T11:00:00Z'), }, { id: 'listing-7-basic-rural-plot', title: 'Basic Rural Plot - Affordable Monthly!', description: 'A very basic, undeveloped plot of land in a quiet rural area. No frills, just space. Perfect for raw land camping (check local ordinances) or a very simple, self-contained setup.', location: 'Rural Plains, KS', lat: 37.7749, lng: -97.3308, sizeSqft: 22000, amenities: [], pricingModel: 'monthly', price: 75, images: ['https://placehold.co/800x600.png?text=Basic+Plot'], landownerId: 'landowner-jane-doe', isAvailable: true, rating: 2.5, numberOfRatings: 2, isBoosted: false, leaseTerm: 'flexible', createdAt: new Date('2024-04-01T16:00:00Z'), }, { id: 'listing-8-premium-view-lot-rented', title: 'Premium View Lot (Currently Rented)', description: 'Unobstructed ocean views from this premium lot. Currently under a long-term lease. Not available for new bookings.', location: 'Big Sur, CA', lat: 36.2704, lng: -121.8081, sizeSqft: 10000, amenities: ['power access', 'water hookup', 'fenced', 'wifi available', 'septic system'], pricingModel: 'monthly', price: 1200, images: ['https://placehold.co/800x600.png?text=Rented+View+Lot'], landownerId: MOCK_USER_FOR_UI_TESTING.id, isAvailable: false, rating: 4.9, numberOfRatings: 35, isBoosted: true, leaseTerm: 'long-term', minLeaseDurationMonths: 12, createdAt: new Date('2023-08-10T12:00:00Z'), }, { id: 'listing-9-miami-nightly', title: 'Miami Urban Garden Plot (Nightly)', description: 'A rare open plot in Miami, perfect for short-term events, urban gardening projects, or RV parking. Nightly rates available.', location: 'Miami, FL', lat: 25.7617, lng: -80.1918, sizeSqft: 2500, amenities: ['power access', 'water hookup', 'fenced', 'road access'], pricingModel: 'nightly', price: 75, images: ['https://placehold.co/800x600.png?text=Miami+Plot'], landownerId: 'landowner-jane-doe', isAvailable: true, rating: 4.6, numberOfRatings: 9, isBoosted: false, leaseTerm: 'short-term', createdAt: new Date('2024-07-20T10:00:00Z'), }, { id: 'listing-10-orlando-lto', title: 'Orlando LTO Opportunity near Attractions', description: 'Lease-to-own this conveniently located lot in the greater Orlando area. A great investment for a future home base.', location: 'Orlando, FL', lat: 28.5383, lng: -81.3792, sizeSqft: 6000, amenities: ['power access', 'water hookup', 'road access', 'septic system'], pricingModel: 'lease-to-own', price: 550, downPayment: 3000, leaseToOwnDetails: "3-year lease-to-own option. $3,000 down. Estimated monthly payment of $550. Final purchase price: $60,000. Close to main roads.", images: ['https://placehold.co/800x600.png?text=Orlando+LTO+Lot'], landownerId: MOCK_GOOGLE_USER_FOR_UI_TESTING.id, isAvailable: true, rating: 4.1, numberOfRatings: 3, isBoosted: true, leaseTerm: 'long-term', minLeaseDurationMonths: 36, createdAt: new Date('2024-07-18T10:00:00Z'), } ];
    const bookings = [ { id: 'booking-1', listingId: 'listing-1-sunny-meadow', listingTitle: 'Sunny Meadow Plot', renterId: 'renter-john-smith', renterName: 'John Smith', landownerId: 'landowner-jane-doe', landownerName: 'Jane Doe', status: 'Confirmed', dateRange: { from: new Date('2024-01-01'), to: new Date('2024-06-30') }, createdAt: new Date('2023-12-15T10:00:00Z'), }, { id: 'booking-2', listingId: 'listing-2-forest-retreat', listingTitle: 'Forest Retreat Lot (Monthly)', renterId: 'renter-john-smith', renterName: 'John Smith', landownerId: MOCK_USER_FOR_UI_TESTING.id, landownerName: MOCK_USER_FOR_UI_TESTING.name, status: 'Pending Confirmation', dateRange: { from: new Date('2024-08-01'), to: new Date('2024-09-01') }, createdAt: new Date('2024-07-20T11:00:00Z'), }, { id: 'booking-3', listingId: 'listing-1-sunny-meadow', listingTitle: 'Sunny Meadow Plot', renterId: MOCK_ADMIN_USER.id, renterName: MOCK_ADMIN_USER.name, landownerId: 'landowner-jane-doe', landownerName: 'Jane Doe', status: 'Declined', dateRange: { from: new Date('2024-07-01'), to: new Date('2024-08-01') }, createdAt: new Date('2024-06-25T12:00:00Z'), }, { id: 'booking-4-nightly', listingId: 'listing-5-cozy-rv-spot', listingTitle: 'Cozy RV Spot by the Lake (Nightly)', renterId: 'renter-john-smith', renterName: 'John Smith', landownerId: 'landowner-jane-doe', landownerName: 'Jane Doe', status: 'Confirmed', dateRange: { from: new Date('2024-07-10'), to: new Date('2024-07-15') }, createdAt: new Date('2024-06-01T10:00:00Z'), }, { id: 'booking-5-lto-pending', listingId: 'listing-6-mountain-homestead-lto', listingTitle: 'Mountain Homestead - Lease to Own!', renterId: 'renter-john-smith', renterName: 'John Smith', landownerId: MOCK_USER_FOR_UI_TESTING.id, landownerName: MOCK_USER_FOR_UI_TESTING.name, status: 'Pending Confirmation', dateRange: { from: new Date('2024-09-01'), to: new Date('2029-08-31') }, createdAt: new Date('2024-07-25T10:00:00Z'), }, { id: 'booking-6-mockuser-pending', listingId: 'listing-1-sunny-meadow', listingTitle: 'Sunny Meadow Plot', renterId: MOCK_USER_FOR_UI_TESTING.id, renterName: MOCK_USER_FOR_UI_TESTING.name, landownerId: 'landowner-jane-doe', landownerName: 'Jane Doe', status: 'Pending Confirmation', dateRange: { from: new Date('2024-10-01'), to: new Date('2024-10-15') }, createdAt: new Date('2024-07-28T11:00:00Z'), }, ];
    const reviews = [ { id: 'review-1', listingId: 'listing-1-sunny-meadow', userId: 'renter-john-smith', userName: 'John Smith', rating: 5, comment: 'Absolutely loved this spot! Jane was a great host. The meadow is beautiful and well-kept.', createdAt: new Date('2023-07-01T10:00:00Z'), }, { id: 'review-2', listingId: 'listing-2-forest-retreat', userId: 'landowner-jane-doe', userName: 'Jane Doe', rating: 4, comment: 'Nice and secluded, a bit rough around the edges but has potential. Mock Tester was responsive.', createdAt: new Date('2023-12-01T11:00:00Z'), }, { id: 'review-3-nightly', listingId: 'listing-5-cozy-rv-spot', userId: 'renter-john-smith', userName: 'John Smith', rating: 5, comment: 'Amazing RV spot, beautiful views and all hookups worked perfectly. Will be back!', createdAt: new Date('2024-07-16T10:00:00Z'), }, { id: 'review-4-lto', listingId: 'listing-6-mountain-homestead-lto', userId: 'renter-john-smith', userName: 'John Smith', rating: 4, comment: 'Interesting LTO option. Land is raw but promising. Landowner (Admin) was helpful with initial info.', createdAt: new Date('2024-05-01T10:00:00Z'), }, { id: 'review-5-basic', listingId: 'listing-7-basic-rural-plot', userId: MOCK_USER_FOR_UI_TESTING.id, userName: MOCK_USER_FOR_UI_TESTING.name, rating: 2, comment: 'It truly is basic, but the price was right for what it is. No surprises. Good for minimalists.', createdAt: new Date('2024-06-10T10:00:00Z'), }, { id: 'review-6-riverside', listingId: 'listing-4-riverside-haven', userId: 'landowner-jane-doe', userName: 'Jane Doe', rating: 5, comment: 'A truly fantastic spot for a long-term lease. Host was accommodating. River access is a huge plus.', createdAt: new Date('2024-07-15T10:00:00Z'), }, ];
    const transactions = [ { id: 'txn1', userId: MOCK_USER_FOR_UI_TESTING.id, type: 'Subscription', status: 'Completed', amount: -5.00, currency: 'USD', date: new Date('2024-07-01T00:00:00Z'), description: 'Premium Subscription - July' }, { id: 'txn2', userId: MOCK_USER_FOR_UI_TESTING.id, type: 'Landowner Payout', status: 'Completed', amount: 196.00, currency: 'USD', date: new Date('2024-07-05T00:00:00Z'), description: 'Payout for Forest Retreat Lot', relatedListingId: 'listing-2-forest-retreat', relatedBookingId: 'booking-2' }, { id: 'txn3', userId: MOCK_USER_FOR_UI_TESTING.id, type: 'Service Fee', status: 'Completed', amount: -4.00, currency: 'USD', date: new Date('2024-07-05T00:00:00Z'), description: 'Service Fee (2%) for Forest Retreat Lot', relatedListingId: 'listing-2-forest-retreat', relatedBookingId: 'booking-2' }, { id: 'txn4', userId: 'landowner-jane-doe', type: 'Landowner Payout', status: 'Completed', amount: 343.00, currency: 'USD', date: new Date('2024-07-08T00:00:00Z'), description: 'Payout for Sunny Meadow Plot', relatedListingId: 'listing-1-sunny-meadow', relatedBookingId: 'booking-1' }, { id: 'txn5', userId: 'landowner-jane-doe', type: 'Service Fee', status: 'Completed', amount: -7.00, currency: 'USD', date: new Date('2024-07-08T00:00:00Z'), description: 'Service Fee (2%) for Sunny Meadow Plot', relatedListingId: 'listing-1-sunny-meadow', relatedBookingId: 'booking-1' }, { id: 'txn6', userId: 'renter-john-smith', type: 'Booking Payment', status: 'Completed', amount: -2100.99, currency: 'USD', date: new Date('2023-12-15T00:00:00Z'), description: 'Payment for Sunny Meadow Plot (6 months)', relatedListingId: 'listing-1-sunny-meadow', relatedBookingId: 'booking-1' }, { id: 'txn7', userId: 'renter-john-smith', type: 'Booking Payment', status: 'Pending', amount: -200.99, currency: 'USD', date: new Date('2024-07-20T00:00:00Z'), description: 'Payment for Forest Retreat Lot', relatedListingId: 'listing-2-forest-retreat', relatedBookingId: 'booking-2' }, ];
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
 * Centralized function to recalculate all platform-wide metrics.
 * This ensures consistency and predictability. It is called every time the database is saved.
 * @param db The database object to calculate metrics from.
 */
const recalculateMetrics = (db: MockDatabase): void => {
    db.metrics.totalUsers = db.users.length;
    db.metrics.totalListings = db.listings.length;
    db.metrics.totalBookings = db.bookings.length;

    const completedServiceFees = db.transactions.filter(t => t.type === 'Service Fee' && t.status === 'Completed').reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const subscriptionRevenue = db.transactions.filter(t => t.type === 'Subscription' && t.status === 'Completed').reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const subscriptionRefunds = db.transactions.filter(t => t.type === 'Subscription Refund' && t.status === 'Completed').reduce((sum, t) => sum + t.amount, 0);

    db.metrics.totalServiceFees = completedServiceFees;
    db.metrics.totalSubscriptionRevenue = subscriptionRevenue - subscriptionRefunds;
    db.metrics.totalRevenue = db.metrics.totalServiceFees + db.metrics.totalSubscriptionRevenue;
};

/**
 * Saves the current state of the database to localStorage and dispatches an event to notify the app of changes.
 * @param newDb The new database state to save.
 */
function saveDb(newDb: MockDatabase) {
    if (typeof window === 'undefined') {
        db = newDb;
        return;
    }
    // Always recalculate metrics before saving to ensure data is consistent.
    recalculateMetrics(newDb);
    localStorage.setItem(DB_KEY, JSON.stringify(newDb));
    // This custom event allows other parts of the app (like hooks) to react to data changes.
    window.dispatchEvent(new CustomEvent('mockDataChanged'));
}

// Ensure DB is loaded on module initialization
db = loadDb();

// --- DATA ACCESS & MUTATION FUNCTIONS ---

const calculatePriceDetails = (listing: Listing, dateRange: { from: Date, to: Date }, renterSubscription: SubscriptionStatus): PriceDetails => {
  let baseRate = 0;
  const fromDate = dateRange.from;
  const toDate = dateRange.to;
  let durationValue = differenceInDays(toDate, fromDate) + 1;
  if (isNaN(durationValue) || durationValue <= 0) durationValue = 1;

  if (listing.pricingModel === 'nightly') {
    baseRate = (listing.price || 0) * durationValue;
  } else if (listing.pricingModel === 'monthly' || listing.pricingModel === 'lease-to-own') {
    baseRate = (listing.price / 30) * durationValue;
  }
  
  if (isNaN(baseRate)) baseRate = 0;
  
  const renterFee = (listing.pricingModel !== 'lease-to-own' && renterSubscription !== 'premium') ? 0.99 : 0;
  const subtotal = baseRate + renterFee;
  const taxRate = 0.05;
  const estimatedTax = subtotal * taxRate;
  let totalPrice = subtotal + estimatedTax;

  return { totalPrice, basePrice: baseRate, renterFee, estimatedTax } as PriceDetails;
};

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

/**
 * Creates a new booking request. This simulates a payment by debiting the renter's wallet
 * and creating a 'Pending' transaction record.
 * @param data The booking data payload.
 * @param status The initial status of the booking.
 * @returns The newly created booking object.
 */
export const addBookingRequest = async (
  data: Omit<Booking, 'id' | 'status' | 'createdAt' | 'listingTitle' | 'renterName' | 'landownerName'> & {dateRange: {from: Date; to: Date}},
  status: Booking['status'] = 'Pending Confirmation'
): Promise<Booking> => {
  const currentDb = loadDb();
  const listingInfo = currentDb.listings.find(l => l.id === data.listingId);
  if (!listingInfo) throw new Error("Listing not found for booking request.");
  
  const renterIndex = currentDb.users.findIndex(u => u.id === data.renterId);
  if (renterIndex === -1) throw new Error("Renter profile not found.");
  const renterInfo = currentDb.users[renterIndex];

  const landownerInfo = currentDb.users.find(u => u.id === listingInfo.landownerId);
  if (!landownerInfo) throw new Error("Landowner profile not found.");

  // Calculate the total price for the booking
  const { totalPrice } = calculatePriceDetails(listingInfo, data.dateRange, renterInfo.subscriptionStatus || 'free');

  // Check if the renter can afford the booking
  if ((renterInfo.walletBalance ?? 0) < totalPrice) {
      throw new Error(`Insufficient funds. Your balance is $${(renterInfo.walletBalance ?? 0).toFixed(2)}, but the booking costs $${totalPrice.toFixed(2)}.`);
  }
  // Debit the renter's wallet immediately
  currentDb.users[renterIndex].walletBalance = (renterInfo.walletBalance ?? 0) - totalPrice;

  const mockId = `booking-${Date.now()}`;
  
  // Create a pending payment transaction
  currentDb.transactions.unshift({
      id: `txn-pmt-${mockId}`, userId: renterInfo.id, type: 'Booking Payment',
      status: status === 'Confirmed' ? 'Completed' : 'Pending', amount: -totalPrice, currency: 'USD',
      date: new Date(), description: `Payment for "${listingInfo.title}"`,
      relatedBookingId: mockId, relatedListingId: listingInfo.id,
  });

  const newBooking: Booking = { 
    ...data, id: mockId, landownerId: listingInfo.landownerId, status, createdAt: new Date(),
    listingTitle: listingInfo.title, renterName: renterInfo.name, landownerName: landownerInfo.name,
  };
  currentDb.bookings.unshift(newBooking);
  
  saveDb(currentDb);
  return newBooking;
};

/**
 * Updates the status of a booking and handles the corresponding financial transactions.
 * This is the core of the simulated economy.
 */
export const updateBookingStatus = async (bookingId: string, status: Booking['status']): Promise<Booking | undefined> => {
  const currentDb = loadDb();
  const bookingIndex = currentDb.bookings.findIndex(b => b.id === bookingId);
  if (bookingIndex === -1) return undefined;
  
  const booking = currentDb.bookings[bookingIndex];
  booking.status = status;

  const paymentTxnIndex = currentDb.transactions.findIndex(t => t.relatedBookingId === booking.id && t.type === 'Booking Payment');
  
  // If a booking is confirmed, complete the payment and pay the landowner
  if (status === 'Confirmed') {
      if (paymentTxnIndex !== -1) currentDb.transactions[paymentTxnIndex].status = 'Completed';

      const listing = currentDb.listings.find(l => l.id === booking.listingId);
      const landownerIndex = currentDb.users.findIndex(u => u.id === booking.landownerId);
      const renter = currentDb.users.find(u => u.id === booking.renterId);

      if (listing && landownerIndex !== -1 && renter) {
          const { basePrice } = calculatePriceDetails(listing, { from: booking.dateRange.from as Date, to: booking.dateRange.to as Date }, renter.subscriptionStatus || 'free');
          const landowner = currentDb.users[landownerIndex];
          const serviceFeeRate = landowner.subscriptionStatus === 'premium' ? 0.0049 : 0.02;
          const serviceFee = basePrice * serviceFeeRate;
          const payout = basePrice - serviceFee;
          
          currentDb.users[landownerIndex].walletBalance = (landowner.walletBalance ?? 0) + payout;
          
          currentDb.transactions.unshift({ id: `txn-payout-${booking.id}`, userId: landowner.id, type: 'Landowner Payout', status: 'Completed', amount: payout, currency: 'USD', date: new Date(), description: `Payout for "${listing.title}"`, relatedBookingId: booking.id, relatedListingId: listing.id });
          currentDb.transactions.unshift({ id: `txn-fee-${booking.id}`, userId: landowner.id, type: 'Service Fee', status: 'Completed', amount: -serviceFee, currency: 'USD', date: new Date(), description: `Service Fee (${(serviceFeeRate * 100).toFixed(2)}%) for "${listing.title}"`, relatedBookingId: booking.id, relatedListingId: listing.id });
      }
  } else if (status === 'Declined' || status === 'Cancelled by Renter') {
     // If a PENDING booking is cancelled, reverse the charge
     if (paymentTxnIndex !== -1) {
        const paymentTxn = currentDb.transactions[paymentTxnIndex];
        if (paymentTxn.status === 'Pending') {
            paymentTxn.status = 'Failed'; // Mark the original transaction as failed
            const renterIndex = currentDb.users.findIndex(u => u.id === booking.renterId);
            if (renterIndex !== -1) {
                // Refund the renter's wallet
                currentDb.users[renterIndex].walletBalance = (currentDb.users[renterIndex].walletBalance ?? 0) + Math.abs(paymentTxn.amount);
                currentDb.transactions.unshift({ id: `txn-reversal-${booking.id}`, userId: booking.renterId, type: 'Payout Reversal', status: 'Completed', amount: Math.abs(paymentTxn.amount), currency: 'USD', date: new Date(), description: `Reversal for cancelled/declined booking: "${booking.listingTitle}"`, relatedBookingId: booking.id });
            }
        }
    }
  } else if (status === 'Refund Approved') {
    // If a COMPLETED booking is refunded
    if (paymentTxnIndex !== -1) {
        const paymentTxn = currentDb.transactions[paymentTxnIndex];
        const renterIndex = currentDb.users.findIndex(u => u.id === booking.renterId);
        if (renterIndex !== -1) {
            // Refund the renter's wallet
            currentDb.users[renterIndex].walletBalance = (currentDb.users[renterIndex].walletBalance ?? 0) + Math.abs(paymentTxn.amount);
            currentDb.transactions.unshift({ id: `txn-refund-${booking.id}`, userId: booking.renterId, type: 'Booking Refund', status: 'Completed', amount: Math.abs(paymentTxn.amount), currency: 'USD', date: new Date(), description: `Refund for "${booking.listingTitle}"`, relatedBookingId: booking.id, relatedListingId: booking.listingId });
        }
    }
  }

  saveDb(currentDb);
  return currentDb.bookings[bookingIndex];
};

// --- Transaction Functions ---
export const getTransactionsForUser = async (userId: string): Promise<Transaction[]> => {
    const currentDb = loadDb();
    return currentDb.transactions.filter(t => t.userId === userId)
      .sort((a,b) => (b.date as Date).getTime() - (a.date as Date).getTime());
};

export const createSubscriptionTransaction = async (userId: string): Promise<void> => {
    const currentDb = loadDb();
    const userIndex = currentDb.users.findIndex(u => u.id === userId);
    if (userIndex === -1) return;
    
    const newTransaction: Transaction = {
        id: `txn-sub-${Date.now()}`, userId, type: 'Subscription', status: 'Completed',
        amount: -5.00, currency: 'USD', date: new Date(), description: 'Premium Subscription - Monthly'
    };
    currentDb.users[userIndex].walletBalance = (currentDb.users[userIndex].walletBalance ?? 0) + newTransaction.amount;
    currentDb.transactions.unshift(newTransaction);
    saveDb(currentDb);
};

export const createRefundTransaction = async (userId: string): Promise<void> => {
    const currentDb = loadDb();
    const userIndex = currentDb.users.findIndex(u => u.id === userId);
    if (userIndex === -1) return;

    const newTransaction: Transaction = {
        id: `txn-refund-${Date.now()}`, userId, type: 'Subscription Refund', status: 'Completed',
        amount: 5.00, currency: 'USD', date: new Date(), description: 'Premium Subscription - Prorated Refund'
    };
    currentDb.users[userIndex].walletBalance = (currentDb.users[userIndex].walletBalance ?? 0) + newTransaction.amount;
    currentDb.transactions.unshift(newTransaction);
    saveDb(currentDb);
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
    const currentDb = loadDb();
    const botLandownerIds = currentDb.users.filter(u => u.id.startsWith('bot-landowner')).map(u => u.id);
    const botRenterIds = currentDb.users.filter(u => u.id.startsWith('bot-renter')).map(u => u.id);

    let listingsCreated = 0;
    let bookingsCreated = 0;

    const botLocations = [{ name: 'Austin, TX', lat: 30.2672, lng: -97.7431 }, { name: 'Portland, OR', lat: 45.5051, lng: -122.6750 }, { name: 'Denver, CO', lat: 39.7392, lng: -104.9903 }];
    const selectedLocation = botLocations[Math.floor(Math.random() * botLocations.length)];
    const landownerToUseId = botLandownerIds[Math.floor(Math.random() * botLandownerIds.length)];
    const landownerUser = await getUserById(landownerToUseId);

    if (landownerUser) {
        await addListing({ title: `Bot Listing #${Math.floor(Math.random() * 1000)}`, description: 'This is an automatically generated listing by a bot for simulation purposes.', location: selectedLocation.name, lat: selectedLocation.lat + (Math.random() - 0.5) * 0.1, lng: selectedLocation.lng + (Math.random() - 0.5) * 0.1, sizeSqft: Math.floor(Math.random() * 20000) + 1000, amenities: ['road access', 'pet friendly'], pricingModel: 'monthly', price: Math.floor(Math.random() * 400) + 100, images: [`https://placehold.co/800x600.png?text=Bot+Listing`], landownerId: landownerUser.id, isAvailable: true, createdAt: new Date(), }, landownerUser.subscriptionStatus === 'premium');
        listingsCreated++;
    }

    const allListings = await getListings();
    const renterToUseId = botRenterIds[Math.floor(Math.random() * botRenterIds.length)];
    const renter = await getUserById(renterToUseId);
    
    if (renter) {
        const bookableListings = allListings.filter(l => l.isAvailable && l.landownerId !== renter?.id && l.pricingModel !== 'lease-to-own');
        if (bookableListings.length > 0) {
            const listingToBook = bookableListings[Math.floor(Math.random() * bookableListings.length)];
            const bookingDurationDays = listingToBook.pricingModel === 'nightly' ? Math.floor(Math.random() * 5) + 2 : 30;
            const startDate = addDays(new Date(), Math.floor(Math.random() * 10) + 1);
            const endDate = addDays(startDate, bookingDurationDays);
            
            try {
                const booking = await addBookingRequest({ listingId: listingToBook.id, renterId: renter.id, dateRange: { from: startDate, to: endDate }, }, 'Confirmed'); 
                await updateBookingStatus(booking.id, 'Confirmed');
                bookingsCreated++;
            } catch (e: any) {
                console.warn(`Bot ${renter.name} could not book "${listingToBook.title}": ${e.message}`);
            }
        }
    }
    
    return { message: `Simulation complete. Created ${listingsCreated} new listings and ${bookingsCreated} new bookings.` };
};

export const getMarketInsights = async (): Promise<MarketInsightsData> => {
    const currentDb = loadDb();
    const allListings = currentDb.listings.filter(l => l.isAvailable);
    const allConfirmedBookings = currentDb.bookings.filter(b => b.status === 'Confirmed');

    const monthlyListings = allListings.filter(l => l.pricingModel === 'monthly' && l.price > 0 && l.sizeSqft > 0);
    const nightlyListings = allListings.filter(l => l.pricingModel === 'nightly' && l.price > 0 && l.sizeSqft > 0);

    const totalMonthlyPricePerSqft = monthlyListings.reduce((sum, l) => sum + (l.price / l.sizeSqft), 0);
    const avgPricePerSqftMonthly = monthlyListings.length > 0 ? totalMonthlyPricePerSqft / monthlyListings.length : 0;
    
    const totalNightlyPricePerSqft = nightlyListings.reduce((sum, l) => sum + (l.price / l.sizeSqft), 0);
    const avgPricePerSqftNightly = nightlyListings.length > 0 ? totalNightlyPricePerSqft / nightlyListings.length : 0;

    const amenityCounts = allListings.flatMap(l => l.amenities).reduce((acc, amenity) => {
        acc[amenity] = (acc[amenity] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const amenityPopularity = Object.entries(amenityCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5);

    const supplyCounts = allListings.reduce((acc, l) => { acc[l.pricingModel] = (acc[l.pricingModel] || 0) + 1; return acc; }, {} as Record<PricingModel, number>);
    const supplyTotal = Object.values(supplyCounts).reduce((sum, count) => sum + count, 0);
    const supplyByPricingModel = Object.entries(supplyCounts).map(([name, value]) => ({ name: name as PricingModel, value, percent: supplyTotal > 0 ? ((value / supplyTotal) * 100).toFixed(0) : "0" }));

    const demandCounts = allConfirmedBookings.reduce((acc, b) => {
        const listing = allListings.find(l => l.id === b.listingId);
        if (listing) { acc[listing.pricingModel] = (acc[listing.pricingModel] || 0) + 1; }
        return acc;
    }, {} as Record<PricingModel, number>);
    
    const demandTotal = Object.values(demandCounts).reduce((sum, count) => sum + count, 0);
    const demandByPricingModel = Object.entries(demandCounts).map(([name, value]) => ({ name: name as PricingModel, value, percent: demandTotal > 0 ? ((value / demandTotal) * 100).toFixed(0) : "0" }));

    return { avgPricePerSqftMonthly, avgPricePerSqftNightly, amenityPopularity, supplyByPricingModel, demandByPricingModel };
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
