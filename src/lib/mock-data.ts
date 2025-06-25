
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
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import type { User, Listing, Booking, Review, SubscriptionStatus, PricingModel, Transaction, PriceDetails, PlatformMetrics } from './types';
import { differenceInDays, differenceInCalendarMonths, startOfMonth, endOfMonth, addDays } from 'date-fns';

export const FREE_TIER_LISTING_LIMIT = 2;
export const FREE_TIER_BOOKMARK_LIMIT = 5;

export let mockDataVersion = 0;

export const incrementMockDataVersion = (source: string) => {
  mockDataVersion++;
  // console.log(`[MockData] mockDataVersion incremented by ${source}. New version: ${mockDataVersion}`);
};

export const MOCK_ADMIN_USER: User = {
  id: 'ZsAXo79Wh8XEiHFrcJwlJT2h89F3',
  name: 'Gabriel Leunda',
  email: 'admin@landshare.app',
  avatarUrl: 'https://placehold.co/100x100.png?text=GL',
  subscriptionStatus: 'premium',
  createdAt: new Date('2023-01-01T10:00:00Z'),
  bio: 'Platform Administrator.',
  bookmarkedListingIds: ['listing-1-sunny-meadow', 'listing-3-desert-oasis'],
  walletBalance: 1000000,
};

export const MOCK_USER_FOR_UI_TESTING: User = {
  id: 'mock-user-uid-12345',
  name: 'Mock UI Tester',
  email: 'mocktester@example.com',
  avatarUrl: 'https://placehold.co/100x100.png?text=MT',
  subscriptionStatus: 'free',
  createdAt: new Date('2023-01-01T10:00:00Z'),
  bio: 'I am a standard mock user for testing purposes.',
  bookmarkedListingIds: ['listing-1-sunny-meadow', 'listing-3-desert-oasis'],
  walletBalance: 10000,
};

export const MOCK_GOOGLE_USER_FOR_UI_TESTING: User = {
  id: 'mock-google-user-uid-67890',
  name: 'Mock Google User',
  email: 'mock.google.user@example.com',
  avatarUrl: 'https://placehold.co/100x100.png?text=GU',
  subscriptionStatus: 'premium',
  createdAt: new Date('2023-04-01T10:00:00Z'),
  bio: 'I am a mock user signed in via Google for testing purposes with premium status.',
  bookmarkedListingIds: [],
  walletBalance: 10000,
};

const BOT_LANDOWNER_1: User = {
  id: 'bot-landowner-1',
  name: 'Bot Alice',
  email: 'bot.alice@landshare.bot',
  avatarUrl: 'https://placehold.co/100x100.png?text=BA',
  subscriptionStatus: 'premium',
  createdAt: new Date('2024-01-01'),
  bio: 'I am a bot who owns land.',
  bookmarkedListingIds: [],
  walletBalance: 50000,
};

const BOT_LANDOWNER_2: User = {
  id: 'bot-landowner-2',
  name: 'Bot Bob',
  email: 'bot.bob@landshare.bot',
  avatarUrl: 'https://placehold.co/100x100.png?text=BB',
  subscriptionStatus: 'free',
  createdAt: new Date('2024-01-01'),
  bio: 'I am another bot who owns land.',
  bookmarkedListingIds: [],
  walletBalance: 25000,
};

const BOT_RENTER_1: User = {
  id: 'bot-renter-1',
  name: 'Bot Charlie',
  email: 'bot.charlie@landshare.bot',
  avatarUrl: 'https://placehold.co/100x100.png?text=BC',
  subscriptionStatus: 'free',
  createdAt: new Date('2024-01-01'),
  bio: 'I am a bot who rents land.',
  bookmarkedListingIds: [],
  walletBalance: 8000,
};

const BOT_RENTER_2: User = {
  id: 'bot-renter-2',
  name: 'Bot Diana',
  email: 'bot.diana@landshare.bot',
  avatarUrl: 'https://placehold.co/100x100.png?text=BD',
  subscriptionStatus: 'premium',
  createdAt: new Date('2024-01-01'),
  bio: 'I am a bot who rents premium land.',
  bookmarkedListingIds: [],
  walletBalance: 15000,
};

const BOT_USERS = [BOT_LANDOWNER_1, BOT_LANDOWNER_2, BOT_RENTER_1, BOT_RENTER_2];

export let mockUsers: User[] = [
  MOCK_ADMIN_USER,
  MOCK_USER_FOR_UI_TESTING,
  {
    id: 'landowner-jane-doe',
    name: 'Jane Doe',
    email: 'jane@example.com',
    avatarUrl: 'https://placehold.co/100x100.png?text=JD',
    subscriptionStatus: 'free',
    createdAt: new Date('2023-02-15T11:00:00Z'),
    bio: 'Experienced landowner with several plots available.',
    bookmarkedListingIds: [],
    walletBalance: 10000,
  },
  {
    id: 'renter-john-smith',
    name: 'John Smith',
    email: 'john@example.com',
    avatarUrl: 'https://placehold.co/100x100.png?text=JS',
    subscriptionStatus: 'free',
    createdAt: new Date('2023-03-20T12:00:00Z'),
    bio: 'Looking for a quiet place for my tiny home.',
    bookmarkedListingIds: ['listing-2-forest-retreat'],
    walletBalance: 10000,
  },
  MOCK_GOOGLE_USER_FOR_UI_TESTING,
  ...BOT_USERS,
];

export let mockListings: Listing[] = [
  {
    id: 'listing-1-sunny-meadow',
    title: 'Sunny Meadow Plot',
    description: 'A beautiful sunny meadow, perfect for sustainable living. Flat land, easy access. Great for gardens.',
    location: 'Boulder, CO',
    lat: 40.0150,
    lng: -105.2705,
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
    lat: 35.5951,
    lng: -82.5515,
    sizeSqft: 12000,
    amenities: ['septic system', 'fenced', 'fire pit'],
    pricingModel: 'monthly',
    price: 200,
    images: ['https://placehold.co/800x600.png?text=Forest+Retreat', 'https://placehold.co/400x300.png?text=Forest+View+1'],
    landownerId: MOCK_ADMIN_USER.id,
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
    lat: 34.8700,
    lng: -111.7610,
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
    lat: 46.8721,
    lng: -113.9940,
    sizeSqft: 7500,
    amenities: ['water hookup', 'fire pit', 'lake access', 'pet friendly'],
    pricingModel: 'monthly',
    price: 400,
    images: ['https://placehold.co/800x600.png?text=Riverside+Haven', 'https://placehold.co/400x300.png?text=River+View'],
    landownerId: MOCK_ADMIN_USER.id,
    isAvailable: true,
    rating: 4.9,
    numberOfRatings: 22,
    leaseTerm: 'long-term',
    minLeaseDurationMonths: 12,
    isBoosted: true,
    createdAt: new Date('2024-07-10T10:00:00Z'),
  },
  {
    id: 'listing-5-cozy-rv-spot',
    title: 'Cozy RV Spot by the Lake (Nightly)',
    description: 'Perfect nightly getaway for your RV. Includes full hookups and stunning lake views. Min 2 nights. Book your escape!',
    location: 'Lake Tahoe, CA',
    lat: 39.0968,
    lng: -120.0324,
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
    lat: 36.2168,
    lng: -81.6746,
    sizeSqft: 45000,
    amenities: ['road access', 'septic system' ],
    pricingModel: 'lease-to-own',
    price: 650, // LTO monthly payment
    leaseToOwnDetails: "5-year lease-to-own program. $5,000 down payment. Estimated monthly payment of $650 (PITI estimate). Final purchase price: $75,000. Subject to credit approval and LTO agreement. Owner financing available.",
    images: ['https://placehold.co/800x600.png?text=Mountain+LTO', 'https://placehold.co/400x300.png?text=Creek+Nearby', 'https://placehold.co/400x300.png?text=Site+Plan'],
    landownerId: MOCK_ADMIN_USER.id,
    isAvailable: true,
    rating: 4.3,
    numberOfRatings: 5,
    isBoosted: true,
    leaseTerm: 'long-term', // LTO is inherently long-term
    minLeaseDurationMonths: 60, // Example: 5 years
    createdAt: new Date('2024-05-15T11:00:00Z'),
  },
  {
    id: 'listing-7-basic-rural-plot',
    title: 'Basic Rural Plot - Affordable Monthly!',
    description: 'A very basic, undeveloped plot of land in a quiet rural area. No frills, just space. Perfect for raw land camping (check local ordinances) or a very simple, self-contained setup.',
    location: 'Rural Plains, KS',
    lat: 37.7749,
    lng: -97.3308,
    sizeSqft: 22000,
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
    lat: 36.2704,
    lng: -121.8081,
    sizeSqft: 10000,
    amenities: ['power access', 'water hookup', 'fenced', 'wifi available', 'septic system'],
    pricingModel: 'monthly',
    price: 1200,
    images: ['https://placehold.co/800x600.png?text=Rented+View+Lot'],
    landownerId: MOCK_ADMIN_USER.id,
    isAvailable: false,
    rating: 4.9,
    numberOfRatings: 35,
    isBoosted: true,
    leaseTerm: 'long-term',
    minLeaseDurationMonths: 12,
    createdAt: new Date('2023-08-10T12:00:00Z'),
  }
];

export let mockBookings: Booking[] = [
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
    landownerId: MOCK_ADMIN_USER.id,
    landownerName: MOCK_ADMIN_USER.name,
    status: 'Pending Confirmation',
    dateRange: { from: new Date('2024-08-01'), to: new Date('2024-09-01') },
    createdAt: new Date('2024-07-20T11:00:00Z'),
  },
  {
    id: 'booking-3',
    listingId: 'listing-1-sunny-meadow',
    listingTitle: 'Sunny Meadow Plot',
    renterId: MOCK_ADMIN_USER.id,
    renterName: MOCK_ADMIN_USER.name,
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
    dateRange: { from: new Date('2024-07-10'), to: new Date('2024-07-15') },
    createdAt: new Date('2024-06-01T10:00:00Z'),
  },
  {
    id: 'booking-5-lto-pending',
    listingId: 'listing-6-mountain-homestead-lto',
    listingTitle: 'Mountain Homestead - Lease to Own!',
    renterId: 'renter-john-smith',
    renterName: 'John Smith',
    landownerId: MOCK_ADMIN_USER.id,
    landownerName: MOCK_ADMIN_USER.name,
    status: 'Pending Confirmation',
    dateRange: { from: new Date('2024-09-01'), to: new Date('2029-08-31') },
    createdAt: new Date('2024-07-25T10:00:00Z'),
  },
  {
    id: 'booking-6-mockuser-pending',
    listingId: 'listing-1-sunny-meadow',
    listingTitle: 'Sunny Meadow Plot',
    renterId: MOCK_ADMIN_USER.id,
    renterName: MOCK_ADMIN_USER.name,
    landownerId: 'landowner-jane-doe',
    landownerName: 'Jane Doe',
    status: 'Pending Confirmation',
    dateRange: { from: new Date('2024-10-01'), to: new Date('2024-10-15') },
    createdAt: new Date('2024-07-28T11:00:00Z'),
  },
];

export let mockReviews: Review[] = [
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
    userId: 'landowner-jane-doe',
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
    userId: 'renter-john-smith',
    userName: 'John Smith',
    rating: 4,
    comment: 'Interesting LTO option. Land is raw but promising. Landowner (Admin) was helpful with initial info.',
    createdAt: new Date('2024-05-01T10:00:00Z'),
  },
  {
    id: 'review-5-basic',
    listingId: 'listing-7-basic-rural-plot',
    userId: MOCK_USER_FOR_UI_TESTING.id,
    userName: MOCK_USER_FOR_UI_TESTING.name,
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

export let mockTransactions: Transaction[] = [
  // Admin User's transactions
  { id: 'txn1', userId: MOCK_ADMIN_USER.id, type: 'Subscription', status: 'Completed', amount: -5.00, currency: 'USD', date: new Date('2024-07-01T00:00:00Z'), description: 'Premium Subscription - July' },
  { id: 'txn2', userId: MOCK_ADMIN_USER.id, type: 'Landowner Payout', status: 'Completed', amount: 199.02, currency: 'USD', date: new Date('2024-07-05T00:00:00Z'), description: 'Payout for Forest Retreat Lot', relatedListingId: 'listing-2-forest-retreat', relatedBookingId: 'booking-2' },
  { id: 'txn3', userId: MOCK_ADMIN_USER.id, type: 'Service Fee', status: 'Completed', amount: -0.98, currency: 'USD', date: new Date('2024-07-05T00:00:00Z'), description: 'Service Fee (0.49%) for Forest Retreat Lot', relatedListingId: 'listing-2-forest-retreat', relatedBookingId: 'booking-2' },
  // Jane Doe's transactions
  { id: 'txn4', userId: 'landowner-jane-doe', type: 'Landowner Payout', status: 'Completed', amount: 343.00, currency: 'USD', date: new Date('2024-07-08T00:00:00Z'), description: 'Payout for Sunny Meadow Plot', relatedListingId: 'listing-1-sunny-meadow', relatedBookingId: 'booking-1' },
  { id: 'txn5', userId: 'landowner-jane-doe', type: 'Service Fee', status: 'Completed', amount: -7.00, currency: 'USD', date: new Date('2024-07-08T00:00:00Z'), description: 'Service Fee (2%) for Sunny Meadow Plot', relatedListingId: 'listing-1-sunny-meadow', relatedBookingId: 'booking-1' },
  // John Smith's transactions
  { id: 'txn6', userId: 'renter-john-smith', type: 'Booking Payment', status: 'Completed', amount: -2100.99, currency: 'USD', date: new Date('2023-12-15T00:00:00Z'), description: 'Payment for Sunny Meadow Plot (6 months)', relatedListingId: 'listing-1-sunny-meadow', relatedBookingId: 'booking-1' },
  { id: 'txn7', userId: 'renter-john-smith', type: 'Booking Payment', status: 'Pending', amount: -200.99, currency: 'USD', date: new Date('2024-07-20T00:00:00Z'), description: 'Payment for Forest Retreat Lot', relatedListingId: 'listing-2-forest-retreat', relatedBookingId: 'booking-2' },
];

export let mockPlatformMetrics: PlatformMetrics = {
  id: 'global_metrics',
  totalRevenue: 206.02,
  totalServiceFees: 7.98,
  totalSubscriptionRevenue: 5.00,
  totalUsers: mockUsers.length,
  totalListings: mockListings.length,
  totalBookings: mockBookings.length,
};

// --- Bot Simulation ---
const botListingTemplates = {
    titles: ["Quiet Woodland Clearing", "Creekside Camping Spot", "Mountain View Acreage", "Rural Pasture Land", "Secluded Desert Getaway"],
    descriptions: [
        "A peaceful and private spot surrounded by trees. Perfect for a tiny home or long-term camping.",
        "Beautiful location right next to a running creek. Features a fire pit and basic road access.",
        "Stunning panoramic views of the mountains. A large, open space ready for your project.",
        "Flat, open pasture land. Great for small-scale agriculture or a simple homesite.",
        "Escape it all on this remote desert property. Ideal for stargazing and solitude."
    ],
    locations: ["Estes Park, CO", "Bozeman, MT", "Bend, OR", "Taos, NM", "Ithaca, NY"]
};

function getRandomElement<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

async function createBotListing(landownerBot: User) {
    const newListingData: Omit<Listing, 'id'> = {
        title: getRandomElement(botListingTemplates.titles),
        description: getRandomElement(botListingTemplates.descriptions),
        location: getRandomElement(botListingTemplates.locations),
        lat: Math.random() * 20 + 30, // Random US-ish coordinates
        lng: -(Math.random() * 40 + 80),
        sizeSqft: Math.floor(Math.random() * 40000) + 5000, // 5k to 45k sqft
        amenities: ['road access', 'pet friendly'].filter(() => Math.random() > 0.5), // some random amenities
        pricingModel: 'monthly',
        price: Math.floor(Math.random() * 500) + 100, // $100-$600
        images: ['https://placehold.co/800x600.png?text=Bot+Listing'],
        landownerId: landownerBot.id,
        isAvailable: true,
        isBoosted: landownerBot.subscriptionStatus === 'premium',
        createdAt: new Date(),
        leaseTerm: getRandomElement(['flexible', 'short-term', 'long-term'])
    };
    await addListing(newListingData, newListingData.isBoosted);
}

async function createBotBooking(renterBot: User) {
    const availableListings = mockListings.filter(l => l.isAvailable && l.landownerId !== renterBot.id);
    if (availableListings.length === 0) return null; // No listings to book

    const listingToBook = getRandomElement(availableListings);
    
    // Check wallet balance
    const bookingCost = listingToBook.pricingModel === 'nightly' ? listingToBook.price * 5 : listingToBook.price; // Simulate 5 nights or 1 month
    if ((renterBot.walletBalance || 0) < bookingCost) {
        return null; // Not enough money
    }
    
    const fromDate = addDays(new Date(), Math.floor(Math.random() * 30) + 1);
    const toDate = listingToBook.pricingModel === 'nightly' 
        ? addDays(fromDate, Math.floor(Math.random() * 10) + 2) // 2-12 nights
        : addDays(fromDate, Math.floor(Math.random() * 90) + 30); // 1-4 months

    const bookingRequest: Omit<Booking, 'id' | 'status' | 'createdAt' | 'listingTitle' | 'renterName' | 'landownerName'> & {dateRange: {from: Date; to: Date}} = {
        listingId: listingToBook.id,
        renterId: renterBot.id,
        landownerId: listingToBook.landownerId,
        dateRange: { from: fromDate, to: toDate },
    };
    
    const newBooking = await addBookingRequest(bookingRequest, 'Pending Confirmation');
    // Simulate landowner confirming the booking
    await updateBookingStatus(newBooking.id, 'Confirmed');
    return newBooking;
}

export async function runBotSimulationCycle(): Promise<{ success: boolean, message: string }> {
    if (firebaseInitializationError || !db) {
        let listingsCreated = 0;
        let bookingsCreated = 0;

        // 1. Create a new listing from a bot landowner
        const landownerBots = BOT_USERS.filter(u => u.id.includes('landowner'));
        if (landownerBots.length > 0) {
            await createBotListing(getRandomElement(landownerBots));
            listingsCreated++;
        }
        
        // 2. Create 1-2 new bookings from bot renters
        const renterBots = BOT_USERS.filter(u => u.id.includes('renter'));
        const bookingAttempts = Math.floor(Math.random() * 2) + 1; // 1 or 2 bookings
        for (let i = 0; i < bookingAttempts; i++) {
            if (renterBots.length > 0) {
                const bookingResult = await createBotBooking(getRandomElement(renterBots));
                if(bookingResult) bookingsCreated++;
            }
        }
        
        incrementMockDataVersion('runBotSimulationCycle');
        return { success: true, message: `Simulation complete: ${listingsCreated} listing(s) and ${bookingsCreated} booking(s) created.`};
    }
    // In live mode, this would require a cloud function or more complex setup.
    // For now, we only support this in mock mode.
    return { success: false, message: "Bot simulation is only available in mock/preview mode." };
}

// --- Data Mapping Functions ---
const mapDocToUser = (docSnap: any): User => {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    name: data.name || 'Unknown User',
    email: data.email || '',
    avatarUrl: data.avatarUrl || `https://placehold.co/100x100.png?text=${(data.name || data.email || 'U').charAt(0).toUpperCase()}`,
    subscriptionStatus: data.subscriptionStatus || 'free',
    stripeCustomerId: data.stripeCustomerId,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date()),
    bio: data.bio || '',
    bookmarkedListingIds: data.bookmarkedListingIds || [],
    walletBalance: data.walletBalance ?? 10000,
  };
};

const mapDocToListing = (docSnap: any): Listing => {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    title: data.title || 'Untitled Listing',
    description: data.description || 'No description available.',
    location: data.location || 'Unknown location',
    lat: data.lat,
    lng: data.lng,
    sizeSqft: data.sizeSqft || 0,
    amenities: data.amenities || [],
    pricingModel: data.pricingModel || 'monthly',
    price: data.price || 0,
    leaseToOwnDetails: data.leaseToOwnDetails || undefined,
    images: data.images && data.images.length > 0 ? data.images : [`https://placehold.co/800x600.png?text=${encodeURIComponent((data.title || 'Listing').substring(0,15))}`,"https://placehold.co/400x300.png?text=View+1", "https://placehold.co/400x300.png?text=View+2"],
    landownerId: data.landownerId || 'unknown_owner',
    isAvailable: data.isAvailable !== undefined ? data.isAvailable : true,
    rating: data.rating === null ? undefined : (typeof data.rating === 'number' ? data.rating : undefined),
    numberOfRatings: data.numberOfRatings || 0,
    leaseTerm: data.leaseTerm || 'flexible',
    minLeaseDurationMonths: data.minLeaseDurationMonths ?? undefined,
    isBoosted: data.isBoosted || false,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date()),
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
    listingTitle: data.listingTitle || `Listing: ${data.listingId ? data.listingId.substring(0,10) : 'N/A'}...`,
    renterName: data.renterName || `Renter: ${data.renterId ? data.renterId.substring(0,6) : 'N/A'}...`,
    landownerName: data.landownerName || `Owner: ${data.landownerId ? data.landownerId.substring(0,6) : 'N/A'}...`,
    leaseContractPath: data.leaseContractPath,
    leaseContractUrl: data.leaseContractUrl,
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

const mapDocToTransaction = (docSnap: any): Transaction => {
    const data = docSnap.data();
    return {
        id: docSnap.id,
        userId: data.userId,
        type: data.type,
        status: data.status,
        amount: data.amount,
        currency: data.currency || 'USD',
        date: data.date?.toDate ? data.date.toDate() : new Date(),
        description: data.description,
        relatedBookingId: data.relatedBookingId,
        relatedListingId: data.relatedListingId,
    };
};

const calculatePriceDetails = (listing: Listing, dateRange: { from: Date, to: Date }, renterSubscription: SubscriptionStatus): PriceDetails => {
  let baseRate = 0;
  const fromDate = dateRange.from;
  const toDate = dateRange.to;
  let durationValue = differenceInDays(toDate, fromDate) + 1;
  if (isNaN(durationValue) || durationValue <= 0) durationValue = 1;

  if (listing.pricingModel === 'nightly') {
    baseRate = (listing.price || 0) * durationValue;
  } else if (listing.pricingModel === 'monthly' || listing.pricingModel === 'lease-to-own') {
    // For monthly/LTO, the price is per month. Calculation for a specific range can be prorated.
    // For simplicity in this function, we'll prorate daily.
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

// --- Platform Metrics Functions ---
export const getPlatformMetrics = async (): Promise<PlatformMetrics> => {
  if (firebaseInitializationError || !db) {
    const totalServiceFees = mockTransactions.filter(t => t.type === 'Service Fee' && t.status === 'Completed').reduce((acc, t) => acc + Math.abs(t.amount), 0);
    const totalSubscriptionRevenue = mockTransactions.filter(t => (t.type === 'Subscription' || t.type === 'Subscription Refund') && t.status === 'Completed').reduce((acc, t) => acc + t.amount, 0);
    
    mockPlatformMetrics.totalServiceFees = totalServiceFees;
    mockPlatformMetrics.totalSubscriptionRevenue = totalSubscriptionRevenue;
    mockPlatformMetrics.totalRevenue = totalServiceFees + totalSubscriptionRevenue;
    mockPlatformMetrics.totalUsers = mockUsers.length;
    mockPlatformMetrics.totalListings = mockListings.length;
    mockPlatformMetrics.totalBookings = mockBookings.length;

    return { ...mockPlatformMetrics };
  }

  try {
    const metricsDocRef = doc(db, "platform", "metrics");
    const metricsSnap = await getDoc(metricsDocRef);
    if (metricsSnap.exists()) {
      const data = metricsSnap.data();
      return {
        id: metricsSnap.id,
        totalRevenue: data.totalRevenue || 0,
        totalServiceFees: data.totalServiceFees || 0,
        totalSubscriptionRevenue: data.totalSubscriptionRevenue || 0,
        totalUsers: data.totalUsers || 0,
        totalListings: data.totalListings || 0,
        totalBookings: data.totalBookings || 0,
      }
    } else {
      const initialMetrics = { totalRevenue: 0, totalServiceFees: 0, totalSubscriptionRevenue: 0, totalUsers: 0, totalListings: 0, totalBookings: 0 };
      await setDoc(metricsDocRef, initialMetrics);
      return { id: 'metrics', ...initialMetrics };
    }
  } catch (error) {
    console.error("[Firestore Error] getPlatformMetrics:", error);
    throw error;
  }
};

export const updatePlatformMetrics = async (updates: { serviceFee?: number; subscriptionRevenue?: number, userChange?: number, listingChange?: number, bookingChange?: number }): Promise<void> => {
    if (firebaseInitializationError || !db) {
        if (updates.serviceFee) {
            mockPlatformMetrics.totalServiceFees += updates.serviceFee;
            mockPlatformMetrics.totalRevenue += updates.serviceFee;
        }
        if (updates.subscriptionRevenue) {
            mockPlatformMetrics.totalSubscriptionRevenue += updates.subscriptionRevenue;
            mockPlatformMetrics.totalRevenue += updates.subscriptionRevenue;
        }
        if (updates.userChange) mockPlatformMetrics.totalUsers += updates.userChange;
        if (updates.listingChange) mockPlatformMetrics.totalListings += updates.listingChange;
        if (updates.bookingChange) mockPlatformMetrics.totalBookings += updates.bookingChange;

        incrementMockDataVersion('updatePlatformMetrics_mock');
        return;
    }
    
    try {
        const metricsDocRef = doc(db, "platform", "metrics");
        const currentMetrics = await getPlatformMetrics();

        const dataToUpdate: Partial<PlatformMetrics> = {};
        let revenueChange = 0;
        if (updates.serviceFee) {
          dataToUpdate.totalServiceFees = (currentMetrics.totalServiceFees || 0) + updates.serviceFee;
          revenueChange += updates.serviceFee;
        }
        if (updates.subscriptionRevenue) {
          dataToUpdate.totalSubscriptionRevenue = (currentMetrics.totalSubscriptionRevenue || 0) + updates.subscriptionRevenue;
          revenueChange += updates.subscriptionRevenue;
        }
        if (revenueChange !== 0) {
            dataToUpdate.totalRevenue = (currentMetrics.totalRevenue || 0) + revenueChange;
        }
        if (updates.userChange) dataToUpdate.totalUsers = (currentMetrics.totalUsers || 0) + updates.userChange;
        if (updates.listingChange) dataToUpdate.totalListings = (currentMetrics.totalListings || 0) + updates.listingChange;
        if (updates.bookingChange) dataToUpdate.totalBookings = (currentMetrics.totalBookings || 0) + updates.bookingChange;


        if (Object.keys(dataToUpdate).length > 0) {
            await updateDoc(metricsDocRef, dataToUpdate);
        }
    } catch (error) {
        console.error("[Firestore Error] updatePlatformMetrics:", error);
        throw error;
    }
};

// --- Transaction Functions ---
export const getTransactionsForUser = async (userId: string): Promise<Transaction[]> => {
    if (firebaseInitializationError || !db) {
        return mockTransactions.filter(t => t.userId === userId).sort((a,b) => {
            const timeA = (a.date instanceof Date ? a.date : (a.date as Timestamp)?.toDate() || new Date(0)).getTime();
            const timeB = (b.date instanceof Date ? b.date : (b.date as Timestamp)?.toDate() || new Date(0)).getTime();
            return timeB - timeA;
        });
    }
    try {
        const transactionsCol = collection(db, "transactions");
        const q = query(transactionsCol, where("userId", "==", userId), orderBy("date", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(mapDocToTransaction);
    } catch (error) {
        console.error("[Firestore Error] getTransactionsForUser:", error);
        throw error;
    }
};

export const createSubscriptionTransaction = async (userId: string): Promise<void> => {
    const newTransaction: Omit<Transaction, 'id'> = {
        userId,
        type: 'Subscription',
        status: 'Completed',
        amount: -5.00,
        currency: 'USD',
        date: new Date(),
        description: 'Premium Subscription - Monthly'
    };
    if (firebaseInitializationError || !db) {
        const userIndex = mockUsers.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            mockUsers[userIndex].walletBalance = (mockUsers[userIndex].walletBalance ?? 0) + newTransaction.amount;
        }
        mockTransactions.unshift({ ...newTransaction, id: `txn-sub-${Date.now()}` });
        await updatePlatformMetrics({ subscriptionRevenue: newTransaction.amount });
        incrementMockDataVersion('createSubscriptionTransaction_mock');
    } else {
        const userDocRef = doc(db, "users", userId);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
            const currentBalance = userSnap.data().walletBalance ?? 0;
            await updateDoc(userDocRef, { walletBalance: currentBalance + newTransaction.amount });
        }
        await addDoc(collection(db, "transactions"), { ...newTransaction, date: Timestamp.fromDate(newTransaction.date as Date) });
        await updatePlatformMetrics({ subscriptionRevenue: newTransaction.amount });
    }
};

export const createRefundTransaction = async (userId: string): Promise<void> => {
    const newTransaction: Omit<Transaction, 'id'> = {
        userId,
        type: 'Subscription Refund',
        status: 'Completed',
        amount: 5.00,
        currency: 'USD',
        date: new Date(),
        description: 'Premium Subscription - Prorated Refund'
    };
     if (firebaseInitializationError || !db) {
        const userIndex = mockUsers.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            mockUsers[userIndex].walletBalance = (mockUsers[userIndex].walletBalance ?? 0) + newTransaction.amount;
        }
        mockTransactions.unshift({ ...newTransaction, id: `txn-refund-${Date.now()}` });
        await updatePlatformMetrics({ subscriptionRevenue: newTransaction.amount });
        incrementMockDataVersion('createRefundTransaction_mock');
    } else {
        const userDocRef = doc(db, "users", userId);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
            const currentBalance = userSnap.data().walletBalance ?? 0;
            await updateDoc(userDocRef, { walletBalance: currentBalance + newTransaction.amount });
        }
        await addDoc(collection(db, "transactions"), { ...newTransaction, date: Timestamp.fromDate(newTransaction.date as Date) });
        await updatePlatformMetrics({ subscriptionRevenue: newTransaction.amount });
    }
};


// --- User Functions ---
export const getUserById = async (id: string): Promise<User | undefined> => {
  if (firebaseInitializationError || !db) {
    // Preview Mode: Use mock data
    return mockUsers.find(user => user.id === id);
  }
  // Live Mode: Use Firestore
  try {
    const userDocRef = doc(db, "users", id);
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
      return mapDocToUser(userSnap);
    }
    return undefined; // User not found in Firestore
  } catch (error) {
    console.error("[Firestore Error] getUserById:", error);
    throw error; // Re-throw for the caller to handle
  }
};

export const createUserProfile = async (userId: string, email: string, name?: string | null, avatarUrl?: string | null): Promise<User> => {
  const profileData: User = {
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

  if (firebaseInitializationError || !db) {
    // Preview Mode
    const existingUserIndex = mockUsers.findIndex(u => u.id === userId);
    if (existingUserIndex !== -1) {
      mockUsers[existingUserIndex] = { ...mockUsers[existingUserIndex], ...profileData };
    } else {
      mockUsers.push(profileData);
      updatePlatformMetrics({ userChange: 1 });
    }
    incrementMockDataVersion('createUserProfile_mock');
    return profileData;
  }

  // Live Mode
  try {
    const userDocRef = doc(db, "users", userId);
    const firestoreProfileData = {
        ...profileData,
        createdAt: Timestamp.fromDate(profileData.createdAt as Date)
    };
    delete (firestoreProfileData as any).id; // ID is path parameter

    await setDoc(userDocRef, firestoreProfileData, { merge: true });
    updatePlatformMetrics({ userChange: 1 });
    const newUserSnap = await getDoc(userDocRef);
    if (!newUserSnap.exists()) throw new Error("Failed to retrieve user profile from Firestore after creation/update.");
    return mapDocToUser(newUserSnap);
  } catch (error) {
    console.error("[Firestore Error] createUserProfile:", error);
    throw error;
  }
};

export const updateUserProfile = async (userId: string, data: Partial<User>): Promise<User | undefined> => {
  if (firebaseInitializationError || !db) {
    // Preview Mode
    const userIndex = mockUsers.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
        const wasFree = mockUsers[userIndex].subscriptionStatus === 'free';
        mockUsers[userIndex] = { ...mockUsers[userIndex], ...data };
        if (data.subscriptionStatus) mockUsers[userIndex].subscriptionStatus = data.subscriptionStatus;

        if (data.bookmarkedListingIds !== undefined) mockUsers[userIndex].bookmarkedListingIds = data.bookmarkedListingIds;
        incrementMockDataVersion('updateUserProfile_mock');
        return mockUsers[userIndex];
    }
    return undefined;
  }

  // Live Mode
  try {
    const userDocRef = doc(db, "users", userId);

    const firestoreData: any = { ...data };
    if (firestoreData.createdAt && firestoreData.createdAt instanceof Date) {
        firestoreData.createdAt = Timestamp.fromDate(firestoreData.createdAt);
    }
    if (firestoreData.id) delete firestoreData.id;

    await updateDoc(userDocRef, firestoreData);
    
    const updatedSnap = await getDoc(userDocRef);
    if (!updatedSnap.exists()) return undefined;
    return mapDocToUser(updatedSnap);
  } catch (error) {
    console.error(`[Firestore Error] updateUserProfile for user:`, userId, error);
    throw error;
  }
};

// --- Listing Functions ---
export const getListings = async (): Promise<Listing[]> => {
  if (firebaseInitializationError || !db) {
    // Preview Mode
    const sortedMockListings = [...mockListings].sort((a, b) => {
        if (a.isBoosted && !b.isBoosted) return -1;
        if (!a.isBoosted && b.isBoosted) return 1;
        const timeA = (a.createdAt instanceof Date ? a.createdAt : (a.createdAt as Timestamp)?.toDate() || new Date(0)).getTime();
        const timeB = (b.createdAt instanceof Date ? b.createdAt : (b.createdAt as Timestamp)?.toDate() || new Date(0)).getTime();
        return timeB - timeA;
    });
    return [...sortedMockListings];
  }
  // Live Mode
  try {
    const listingsCol = collection(db, "listings");
    const q = query(listingsCol, orderBy("isBoosted", "desc"), orderBy("createdAt", "desc"));
    const listingSnapshot = await getDocs(q);
    return listingSnapshot.docs.map(mapDocToListing);
  } catch (error) {
    console.error("[Firestore Error] getListings:", error);
    throw error;
  }
};

export const getListingsByLandownerCount = async (landownerId: string): Promise<number> => {
  if (firebaseInitializationError || !db) {
    // Preview Mode
    return mockListings.filter(l => l.landownerId === landownerId).length;
  }
  // Live Mode
  try {
    const listingsCol = collection(db, "listings");
    const q = query(listingsCol, where("landownerId", "==", landownerId));
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  } catch (error) {
    console.error("[Firestore Error] getListingsByLandownerCount:", error);
    throw error;
  }
};

export const getListingById = async (id: string): Promise<Listing | undefined> => {
  if (firebaseInitializationError || !db) {
    // Preview Mode
    return mockListings.find(listing => listing.id === id);
  }
  // Live Mode
  try {
    const listingDocRef = doc(db, "listings", id);
    const listingSnap = await getDoc(listingDocRef);
    if (listingSnap.exists()) {
      return mapDocToListing(listingSnap);
    }
    return undefined;
  } catch (error) {
    console.error(`[Firestore Error] getListingById for ID ${id}:`, error);
    throw error;
  }
};

export const addListing = async (data: Omit<Listing, 'id'>, isLandownerPremium: boolean = false): Promise<Listing> => {
  const newListingData: Omit<Listing, 'id'> = {
    ...data,
    isBoosted: isLandownerPremium,
  };

  if (firebaseInitializationError || !db) {
    const mockId = `listing-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const fullMockListing = { ...newListingData, id: mockId } as Listing;
    mockListings.unshift(fullMockListing);
    updatePlatformMetrics({ listingChange: 1 });
    incrementMockDataVersion('addListing_mock');
    return fullMockListing;
  }

  try {
    const listingsCol = collection(db, "listings");
    const docRef = await addDoc(listingsCol, newListingData);
    updatePlatformMetrics({ listingChange: 1 });
    const newDocSnap = await getDoc(docRef);
    if (!newDocSnap.exists()) throw new Error("Failed to retrieve new listing.");
    return mapDocToListing(newDocSnap);
  } catch (error) {
    console.error("[Firestore Error] addListing:", error);
    throw error;
  }
};

export const updateListing = async (listingId: string, data: Partial<Omit<Listing, 'id' | 'landownerId' | 'createdAt' | 'rating' | 'numberOfRatings' | 'isBoosted'>>): Promise<Listing | undefined> => {
    if (firebaseInitializationError || !db) {
        const listingIndex = mockListings.findIndex(l => l.id === listingId);
        if (listingIndex !== -1) {
            mockListings[listingIndex] = { ...mockListings[listingIndex], ...data, price: data.price ?? mockListings[listingIndex].price, sizeSqft: data.sizeSqft ?? mockListings[listingIndex].sizeSqft };
            incrementMockDataVersion('updateListing_mock');
            return mockListings[listingIndex];
        }
        return undefined;
    }

    try {
        const listingDocRef = doc(db, "listings", listingId);
        const updateData: any = {...data};
        // Ensure numeric fields are numbers
        if (updateData.price !== undefined) updateData.price = Number(updateData.price);
        if (updateData.sizeSqft !== undefined) updateData.sizeSqft = Number(updateData.sizeSqft);
        if (updateData.minLeaseDurationMonths !== undefined) updateData.minLeaseDurationMonths = updateData.minLeaseDurationMonths === null ? null : Number(updateData.minLeaseDurationMonths);
        
        await updateDoc(listingDocRef, updateData);
        const updatedSnap = await getDoc(listingDocRef);
        return updatedSnap.exists() ? mapDocToListing(updatedSnap) : undefined;
    } catch (error) {
        console.error(`[Firestore Error] updateListing for ID ${listingId}:`, error);
        throw error;
    }
};

export const deleteListing = async (listingId: string): Promise<boolean> => {
  if (firebaseInitializationError || !db) {
    // Preview Mode
    const initialLength = mockListings.length;
    mockListings = mockListings.filter(l => l.id !== listingId);
    mockBookings = mockBookings.filter(b => b.listingId !== listingId);
    mockReviews = mockReviews.filter(r => r.listingId !== listingId);
    const deleted = mockListings.length < initialLength;
    if (deleted) {
      updatePlatformMetrics({ listingChange: -1 });
      incrementMockDataVersion('deleteListing_mock');
    }
    return deleted;
  }

  // Live Mode
  try {
    const batch = writeBatch(db);
    const listingDocRef = doc(db, "listings", listingId);
    const listingSnap = await getDoc(listingDocRef);
    if (!listingSnap.exists()) return false; // Listing doesn't exist

    batch.delete(listingDocRef);

    // Optional: Delete associated bookings and reviews
    const bookingsQuery = query(collection(db, "bookings"), where("listingId", "==", listingId));
    const bookingsSnapshot = await getDocs(bookingsQuery);
    bookingsSnapshot.forEach(doc => batch.delete(doc.ref));
    
    const reviewsQuery = query(collection(db, "reviews"), where("listingId", "==", listingId));
    const reviewsSnapshot = await getDocs(reviewsQuery);
    reviewsSnapshot.forEach(doc => batch.delete(doc.ref));
    
    await batch.commit();
    updatePlatformMetrics({ listingChange: -1, bookingChange: -bookingsSnapshot.size });
    return true;
  } catch (error) {
    console.error(`[Firestore Error] deleteListing for ID ${listingId}:`, error);
    throw error;
  }
};

// --- Review Functions ---
export const getReviewsForListing = async (listingId: string): Promise<Review[]> => {
  if (firebaseInitializationError || !db) {
    // Preview Mode
    const listingReviews = mockReviews.filter(review => review.listingId === listingId)
        .sort((a, b) => {
          const timeA = (a.createdAt instanceof Date ? a.createdAt : (a.createdAt as Timestamp)?.toDate() || new Date(0)).getTime();
          const timeB = (b.createdAt instanceof Date ? b.createdAt : (b.createdAt as Timestamp)?.toDate() || new Date(0)).getTime();
          return timeB - timeA;
        });
    return Promise.all(listingReviews.map(async (review) => {
        const user = mockUsers.find(u => u.id === review.userId); // Use mock users for names in preview
        return {...review, userName: user?.name || `User...${review.userId.slice(-4)}` };
    }));
  }
  // Live Mode
  try {
    const reviewsCol = collection(db, "reviews");
    const q = query(reviewsCol, where("listingId", "==", listingId), orderBy("createdAt", "desc"));
    const reviewSnapshot = await getDocs(q);
    return Promise.all(reviewSnapshot.docs.map(async (docSnap) => {
        const review = mapDocToReview(docSnap);
        const user = await getUserById(review.userId); // Fetch user for name
        return {...review, userName: user?.name || `User...${review.userId.slice(-4)}`};
    }));
  } catch (error) {
    console.error("[Firestore Error] getReviewsForListing:", error);
    throw error;
  }
};

export const addReview = async (
  listingId: string,
  userId: string,
  rating: number,
  comment: string
): Promise<Review> => {
  const creationTimestamp = new Date();
  let userName = `User...${userId.slice(-4)}`;

  if (firebaseInitializationError || !db) {
    // Preview Mode
    const userAddingReview = mockUsers.find(u => u.id === userId);
    userName = userAddingReview?.name || userName;
    const newReview: Review = { id: `mock-review-${Date.now()}`, listingId, userId, userName, rating, comment, createdAt: creationTimestamp };
    mockReviews.unshift(newReview);
    const listing = mockListings.find(l => l.id === listingId);
    if (listing) {
        const totalRating = (listing.rating || 0) * (listing.numberOfRatings || 0) + rating;
        listing.numberOfRatings = (listing.numberOfRatings || 0) + 1;
        listing.rating = totalRating / listing.numberOfRatings;
    }
    incrementMockDataVersion('addReview_mock');
    return newReview;
  }

  // Live Mode
  try {
    const userAddingReview = await getUserById(userId);
    userName = userAddingReview?.name || userName;

    const reviewsCol = collection(db, "reviews");
    const firestoreReviewData: Omit<Review, 'id'> = {
        listingId, userId, userName, rating, comment,
        createdAt: Timestamp.fromDate(creationTimestamp),
    };
    const docRef = await addDoc(reviewsCol, firestoreReviewData);

    // Update listing's average rating and count
    const listingRef = doc(db, "listings", listingId);
    const listingSnap = await getDoc(listingRef);
    if (listingSnap.exists()) {
        const listingData = listingSnap.data();
        const currentRating = listingData.rating || 0;
        const currentNumRatings = listingData.numberOfRatings || 0;
        const newNumRatings = currentNumRatings + 1;
        const newTotalRating = currentRating * currentNumRatings + rating;
        const newAvgRating = newNumRatings > 0 ? newTotalRating / newNumRatings : 0;
        await updateDoc(listingRef, { rating: newAvgRating, numberOfRatings: newNumRatings });
    }
    const newDocSnap = await getDoc(docRef);
    if (!newDocSnap.exists()) throw new Error("Failed to retrieve newly created review from Firestore.");
    return mapDocToReview(newDocSnap);
  } catch (error) {
    console.error("[Firestore Error] addReview:", error);
    throw error;
  }
};

// --- Booking Functions ---
export const getBookingsForUser = async (userId: string): Promise<Booking[]> => {
  if (firebaseInitializationError || !db) {
    // Preview Mode
    const userBookings = mockBookings.filter(b => b.renterId === userId || b.landownerId === userId)
        .sort((a,b) => {
          const timeA = (a.createdAt instanceof Date ? a.createdAt : (a.createdAt as Timestamp)?.toDate() || new Date(0)).getTime();
          const timeB = (b.createdAt instanceof Date ? b.createdAt : (b.createdAt as Timestamp)?.toDate() || new Date(0)).getTime();
          return timeB - timeA;
        });
    return Promise.all(userBookings.map(async (booking) => { // Populate names for mock
        const listing = mockListings.find(l => l.id === booking.listingId);
        const renter = mockUsers.find(u => u.id === booking.renterId);
        const landowner = mockUsers.find(u => u.id === booking.landownerId);
        return {
            ...booking,
            listingTitle: listing?.title || booking.listingTitle,
            renterName: renter?.name || booking.renterName,
            landownerName: landowner?.name || booking.landownerName,
        };
    }));
  }

  // Live Mode
  try {
    const bookingsCol = collection(db, "bookings");
    const q = query(
      bookingsCol,
      or(where("renterId", "==", userId), where("landownerId", "==", userId)),
      orderBy("createdAt", "desc")
    );
    const bookingSnapshot = await getDocs(q);
    // mapDocToBooking now includes denormalized names, so direct map is fine
    return bookingSnapshot.docs.map(mapDocToBooking);
  } catch (error) {
    console.error("[Firestore Error] getBookingsForUser:", error);
    throw error;
  }
};

export const addBookingRequest = async (
  data: Omit<Booking, 'id' | 'status' | 'createdAt' | 'listingTitle' | 'renterName' | 'landownerName'> & {dateRange: {from: Date; to: Date}},
  status: Booking['status'] = 'Pending Confirmation' // Default status
): Promise<Booking> => {
  const creationTimestamp = new Date();
  
  if (firebaseInitializationError || !db) {
    // Preview Mode
    const listingInfo = mockListings.find(l => l.id === data.listingId);
    if (!listingInfo) throw new Error("Mock Listing not found for booking request.");
    
    const renterIndex = mockUsers.findIndex(u => u.id === data.renterId);
    if (renterIndex === -1) throw new Error("Mock Renter profile not found.");
    const renterInfo = mockUsers[renterIndex];

    const landownerInfo = mockUsers.find(u => u.id === listingInfo.landownerId);
    if (!landownerInfo) throw new Error("Mock Landowner profile not found.");

    const { totalPrice } = calculatePriceDetails(listingInfo, data.dateRange, renterInfo.subscriptionStatus || 'free');

    if ((renterInfo.walletBalance ?? 0) < totalPrice) {
        throw new Error(`Insufficient funds. Your balance is $${(renterInfo.walletBalance ?? 0).toFixed(2)}, but the booking costs $${totalPrice.toFixed(2)}.`);
    }
    mockUsers[renterIndex].walletBalance = (renterInfo.walletBalance ?? 0) - totalPrice;

    const newPaymentTransaction: Transaction = {
        id: `txn-pmt-${Date.now()}`,
        userId: renterInfo.id,
        type: 'Booking Payment',
        status: status === 'Confirmed' ? 'Completed' : 'Pending',
        amount: -totalPrice,
        currency: 'USD',
        date: creationTimestamp,
        description: `Payment for "${listingInfo.title}"`,
        relatedBookingId: `mock-booking-${Date.now()}`,
        relatedListingId: listingInfo.id,
    };
    mockTransactions.unshift(newPaymentTransaction);

    const newBookingBase: Omit<Booking, 'id'> = {
      ...data, landownerId: listingInfo.landownerId, status, createdAt: creationTimestamp,
      listingTitle: listingInfo.title, renterName: renterInfo.name, landownerName: landownerInfo.name,
    };
    const mockId = newPaymentTransaction.relatedBookingId!;
    const newMockBooking: Booking = { id: mockId, ...newBookingBase };
    mockBookings.unshift(newMockBooking);
    updatePlatformMetrics({ bookingChange: 1 });
    incrementMockDataVersion('addBookingRequest_mock');
    return newMockBooking;
  }

  // Live Mode
  try {
    const listingInfo = await getListingById(data.listingId);
    if (!listingInfo) throw new Error("Listing not found for booking request.");
    const renterInfo = await getUserById(data.renterId);
    if (!renterInfo) throw new Error("Renter profile not found.");
    const landownerInfo = await getUserById(listingInfo.landownerId);
    if (!landownerInfo) throw new Error("Landowner profile not found.");

    const { totalPrice } = calculatePriceDetails(listingInfo, data.dateRange, renterInfo.subscriptionStatus || 'free');

    if ((renterInfo.walletBalance ?? 0) < totalPrice) {
      throw new Error(`Insufficient funds. Your balance is $${(renterInfo.walletBalance ?? 0).toFixed(2)}, but the booking costs $${totalPrice.toFixed(2)}.`);
    }
    const renterDocRef = doc(db, 'users', renterInfo.id);
    await updateDoc(renterDocRef, { walletBalance: (renterInfo.walletBalance ?? 0) - totalPrice });

    const newBookingBase: Omit<Booking, 'id' | 'createdAt'> & {createdAt: Timestamp} = {
      ...data,
      landownerId: listingInfo.landownerId,
      status,
      listingTitle: listingInfo.title,
      renterName: renterInfo.name,
      landownerName: landownerInfo.name,
      dateRange: { from: Timestamp.fromDate(data.dateRange.from), to: Timestamp.fromDate(data.dateRange.to) },
      createdAt: Timestamp.fromDate(creationTimestamp),
    };

    const bookingsCol = collection(db, "bookings");
    const docRef = await addDoc(bookingsCol, newBookingBase);
    updatePlatformMetrics({ bookingChange: 1 });

    const newPaymentTransaction: Omit<Transaction, 'id'> = {
        userId: renterInfo.id,
        type: 'Booking Payment',
        status: status === 'Confirmed' ? 'Completed' : 'Pending',
        amount: -totalPrice,
        currency: 'USD',
        date: Timestamp.now(),
        description: `Payment for "${listingInfo.title}"`,
        relatedBookingId: docRef.id,
        relatedListingId: listingInfo.id,
    };
    await addDoc(collection(db, "transactions"), newPaymentTransaction);

    const newDocSnap = await getDoc(docRef);
    if (!newDocSnap.exists()) throw new Error("Failed to retrieve newly created booking request from Firestore.");
    return mapDocToBooking(newDocSnap);
  } catch (error) {
    console.error("[Firestore Error] addBookingRequest:", error);
    throw error;
  }
};

export const updateBookingStatus = async (bookingId: string, status: Booking['status']): Promise<Booking | undefined> => {
  if (firebaseInitializationError || !db) {
    const bookingIndex = mockBookings.findIndex(b => b.id === bookingId);
    if (bookingIndex === -1) return undefined;
    
    mockBookings[bookingIndex].status = status;
    const booking = mockBookings[bookingIndex];

    const paymentTxnIndex = mockTransactions.findIndex(t => t.relatedBookingId === booking.id && t.type === 'Booking Payment');
    if (paymentTxnIndex !== -1) {
        if (status === 'Confirmed') mockTransactions[paymentTxnIndex].status = 'Completed';
        if (status === 'Declined') mockTransactions[paymentTxnIndex].status = 'Failed';
    }

    if (status === 'Confirmed') {
        const listing = mockListings.find(l => l.id === booking.listingId);
        const landownerIndex = mockUsers.findIndex(u => u.id === booking.landownerId);
        const renter = mockUsers.find(u => u.id === booking.renterId);

        if (listing && landownerIndex !== -1 && renter) {
            let payoutBaseAmount = 0;
            let descriptionSuffix = '';

            if (listing.pricingModel === 'monthly' || listing.pricingModel === 'lease-to-own') {
                payoutBaseAmount = listing.price; // Payout for one month
                descriptionSuffix = ' - Month 1';
            } else { // 'nightly'
                const { basePrice } = calculatePriceDetails(listing, { from: booking.dateRange.from as Date, to: booking.dateRange.to as Date }, renter.subscriptionStatus || 'free');
                payoutBaseAmount = basePrice;
                descriptionSuffix = ' - Full Stay';
            }

            const landowner = mockUsers[landownerIndex];
            const serviceFeeRate = landowner.subscriptionStatus === 'premium' ? 0.0049 : 0.02;
            const serviceFee = payoutBaseAmount * serviceFeeRate;
            const payout = payoutBaseAmount - serviceFee;
            
            mockUsers[landownerIndex].walletBalance = (landowner.walletBalance ?? 0) + payout;
            
            updatePlatformMetrics({ serviceFee: serviceFee });

            mockTransactions.unshift({
                id: `txn-payout-${booking.id}`,
                userId: landowner.id,
                type: 'Landowner Payout',
                status: 'Completed',
                amount: payout,
                currency: 'USD',
                date: new Date(),
                description: `Payout for "${listing.title}"${descriptionSuffix}`,
                relatedBookingId: booking.id,
                relatedListingId: listing.id
            });
            mockTransactions.unshift({
                id: `txn-fee-${booking.id}`,
                userId: landowner.id,
                type: 'Service Fee',
                status: 'Completed',
                amount: -serviceFee,
                currency: 'USD',
                date: new Date(),
                description: `Service Fee (${(serviceFeeRate * 100).toFixed(2)}%) for "${listing.title}"${descriptionSuffix}`,
                relatedBookingId: booking.id,
                relatedListingId: listing.id
            });
        }
    } else if (status === 'Refund Approved') {
      const paymentTxn = mockTransactions.find(t => t.relatedBookingId === booking.id && t.type === 'Booking Payment');
      if (paymentTxn) {
          const renterIndex = mockUsers.findIndex(u => u.id === paymentTxn.userId);
          if (renterIndex !== -1) {
            mockUsers[renterIndex].walletBalance = (mockUsers[renterIndex].walletBalance ?? 0) + Math.abs(paymentTxn.amount);
          }
          mockTransactions.unshift({
              id: `txn-refund-${booking.id}`,
              userId: paymentTxn.userId,
              type: 'Booking Refund',
              status: 'Completed',
              amount: Math.abs(paymentTxn.amount),
              currency: 'USD',
              date: new Date(),
              description: `Refund for "${booking.listingTitle}"`,
              relatedBookingId: booking.id,
              relatedListingId: booking.listingId,
          });
          
          const payoutTxn = mockTransactions.find(t => t.relatedBookingId === booking.id && t.type === 'Landowner Payout');
          if (payoutTxn) {
            payoutTxn.status = 'Reversed';
            const landownerIndex = mockUsers.findIndex(u => u.id === payoutTxn.userId);
            if (landownerIndex !== -1) {
              mockUsers[landownerIndex].walletBalance = (mockUsers[landownerIndex].walletBalance ?? 0) - payoutTxn.amount;
            }
            mockTransactions.unshift({
                id: `txn-reversal-${booking.id}`,
                userId: payoutTxn.userId,
                type: 'Payout Reversal',
                status: 'Completed',
                amount: -payoutTxn.amount,
                currency: 'USD',
                date: new Date(),
                description: `Payout Reversal for "${booking.listingTitle}"`,
                relatedBookingId: booking.id,
                relatedListingId: booking.listingId,
            });
          }
      }
    }

    incrementMockDataVersion('updateBookingStatus_mock');
    const listing = mockListings.find(l => l.id === booking.listingId);
    const renter = mockUsers.find(u => u.id === booking.renterId);
    const landowner = mockUsers.find(u => u.id === booking.landownerId);
    return {
        ...booking,
        listingTitle: listing?.title || booking.listingTitle,
        renterName: renter?.name || booking.renterName,
        landownerName: landowner?.name || booking.landownerName,
    };
  }

  // Live Mode
  try {
    const bookingDocRef = doc(db, "bookings", bookingId);
    const batch = writeBatch(db);
    batch.update(bookingDocRef, { status: status });

    const paymentQuery = query(collection(db, "transactions"), where("relatedBookingId", "==", bookingId), where("type", "==", "Booking Payment"));
    const paymentSnap = await getDocs(paymentQuery);
    paymentSnap.forEach(doc => {
      if (status === 'Confirmed') batch.update(doc.ref, { status: 'Completed' });
      if (status === 'Declined') batch.update(doc.ref, { status: 'Failed' });
    });

    if (status === 'Confirmed') {
      const bookingSnap = await getDoc(bookingDocRef);
      if (bookingSnap.exists()) {
          const bookingData = bookingSnap.data() as Booking;
          const listing = await getListingById(bookingData.listingId);
          const landowner = await getUserById(bookingData.landownerId);
          const renter = await getUserById(bookingData.renterId);

          if (listing && landowner && renter) {
              let payoutBaseAmount = 0;
              let descriptionSuffix = '';

              if (listing.pricingModel === 'monthly' || listing.pricingModel === 'lease-to-own') {
                  payoutBaseAmount = listing.price; // Payout for one month
                  descriptionSuffix = ' - Month 1';
              } else { // 'nightly'
                  const { basePrice } = calculatePriceDetails(listing, { from: (bookingData.dateRange.from as Timestamp).toDate(), to: (bookingData.dateRange.to as Timestamp).toDate() }, renter.subscriptionStatus || 'free');
                  payoutBaseAmount = basePrice;
                  descriptionSuffix = ' - Full Stay';
              }

              const serviceFeeRate = landowner.subscriptionStatus === 'premium' ? 0.0049 : 0.02;
              const serviceFee = payoutBaseAmount * serviceFeeRate;
              const payout = payoutBaseAmount - serviceFee;

              const landownerDocRef = doc(db, 'users', landowner.id);
              batch.update(landownerDocRef, { walletBalance: (landowner.walletBalance ?? 0) + payout });
              
              await updatePlatformMetrics({ serviceFee: serviceFee });

              const transCol = collection(db, 'transactions');
              batch.set(doc(transCol), {
                  userId: landowner.id, type: 'Landowner Payout', status: 'Completed', amount: payout, currency: 'USD',
                  date: Timestamp.now(), description: `Payout for "${listing.title}"${descriptionSuffix}`,
                  relatedBookingId: bookingId, relatedListingId: listing.id
              });
               batch.set(doc(transCol), {
                  userId: landowner.id, type: 'Service Fee', status: 'Completed', amount: -serviceFee, currency: 'USD',
                  date: Timestamp.now(), description: `Service Fee (${(serviceFeeRate * 100).toFixed(2)}%) for "${listing.title}"${descriptionSuffix}`,
                  relatedBookingId: bookingId, relatedListingId: listing.id
              });
          }
      }
    } else if (status === 'Refund Approved') {
      const paymentTxnQuery = query(collection(db, "transactions"), where("relatedBookingId", "==", bookingId), where("type", "==", "Booking Payment"));
      const paymentTxnSnap = await getDocs(paymentTxnQuery);

      if (!paymentTxnSnap.empty) {
          const paymentTxnDoc = paymentTxnSnap.docs[0];
          const paymentData = paymentTxnDoc.data() as Transaction;
          
          const renterDocRef = doc(db, 'users', paymentData.userId);
          const renterSnap = await getDoc(renterDocRef);
          if (renterSnap.exists()) {
            batch.update(renterDocRef, { walletBalance: (renterSnap.data().walletBalance ?? 0) + Math.abs(paymentData.amount) });
          }

          const transCol = collection(db, 'transactions');
          batch.set(doc(transCol), {
              userId: paymentData.userId, type: 'Booking Refund', status: 'Completed', amount: Math.abs(paymentData.amount), currency: 'USD',
              date: Timestamp.now(), description: `Refund for "${paymentData.description.replace('Payment for ', '')}"`,
              relatedBookingId: bookingId, relatedListingId: paymentData.relatedListingId
          });

          const payoutTxnQuery = query(collection(db, "transactions"), where("relatedBookingId", "==", bookingId), where("type", "==", "Landowner Payout"));
          const payoutTxnSnap = await getDocs(payoutTxnQuery);
          if(!payoutTxnSnap.empty) {
              const payoutTxnDoc = payoutTxnSnap.docs[0];
              const payoutData = payoutTxnDoc.data() as Transaction;
              batch.update(payoutTxnDoc.ref, {status: 'Reversed'});
              
              const landownerDocRef = doc(db, 'users', payoutData.userId);
              const landownerSnap = await getDoc(landownerDocRef);
              if (landownerSnap.exists()) {
                batch.update(landownerDocRef, { walletBalance: (landownerSnap.data().walletBalance ?? 0) - payoutData.amount });
              }

              batch.set(doc(transCol), {
                  userId: payoutData.userId, type: 'Payout Reversal', status: 'Completed', amount: -payoutData.amount, currency: 'USD',
                  date: Timestamp.now(), description: `Reversal for "${payoutData.description.replace('Payout for ', '')}"`,
                  relatedBookingId: bookingId, relatedListingId: payoutData.relatedListingId,
              });
          }
      }
    }
    
    await batch.commit();

    const updatedSnap = await getDoc(bookingDocRef);
    if (!updatedSnap.exists()) return undefined;
    return mapDocToBooking(updatedSnap);
  } catch (error) {
    console.error("[Firestore Error] updateBookingStatus:", error);
    throw error;
  }
};


// --- Bookmark Functions ---
export const addBookmarkToList = async (userId: string, listingId: string): Promise<User | undefined> => {
  if (firebaseInitializationError || !db) {
    // Preview Mode
    const userIndex = mockUsers.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      const user = mockUsers[userIndex];
      if (user.subscriptionStatus === 'free' && (user.bookmarkedListingIds?.length || 0) >= FREE_TIER_BOOKMARK_LIMIT) {
        throw new Error(`Bookmark limit of ${FREE_TIER_BOOKMARK_LIMIT} reached for free accounts. Upgrade to Premium for unlimited bookmarks.`);
      }
      if (!user.bookmarkedListingIds?.includes(listingId)) {
        user.bookmarkedListingIds = [...(user.bookmarkedListingIds || []), listingId];
        incrementMockDataVersion('addBookmarkToList_mock');
      }
      return user;
    }
    return undefined;
  }
  // Live Mode
  try {
    const userDocRef = doc(db, "users", userId);
    const userSnap = await getDoc(userDocRef);
    if (!userSnap.exists()) throw new Error("User not found to add bookmark.");
    const user = mapDocToUser(userSnap);

    if (user.subscriptionStatus === 'free' && (user.bookmarkedListingIds?.length || 0) >= FREE_TIER_BOOKMARK_LIMIT) {
      throw new Error(`Bookmark limit of ${FREE_TIER_BOOKMARK_LIMIT} reached for free accounts. Upgrade to Premium for unlimited bookmarks.`);
    }
    if (user.bookmarkedListingIds?.includes(listingId)) return user; // Already bookmarked

    await updateDoc(userDocRef, { bookmarkedListingIds: arrayUnion(listingId) });
    const updatedUserSnap = await getDoc(userDocRef); // Re-fetch to get the updated array
    return updatedUserSnap.exists() ? mapDocToUser(updatedUserSnap) : undefined;
  } catch (error) {
    console.error("[Firestore Error] addBookmarkToList for user:", userId, error);
    throw error;
  }
};

export const removeBookmarkFromList = async (userId: string, listingId: string): Promise<User | undefined> => {
   if (firebaseInitializationError || !db) {
    // Preview Mode
    const userIndex = mockUsers.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      const user = mockUsers[userIndex];
      if (user.bookmarkedListingIds?.includes(listingId)) {
        user.bookmarkedListingIds = (user.bookmarkedListingIds || []).filter(id => id !== listingId);
        incrementMockDataVersion('removeBookmarkFromList_mock');
      }
      return user;
    }
    return undefined;
  }
  // Live Mode
  try {
    const userDocRef = doc(db, "users", userId);
    // Check if user exists before trying to remove, though arrayRemove is safe if field/value doesn't exist
    const userSnap = await getDoc(userDocRef);
    if (!userSnap.exists()) throw new Error("User not found to remove bookmark.");
    
    await updateDoc(userDocRef, { bookmarkedListingIds: arrayRemove(listingId) });
    const updatedUserSnap = await getDoc(userDocRef); // Re-fetch
    return updatedUserSnap.exists() ? mapDocToUser(updatedUserSnap) : undefined;
  } catch (error) {
    console.error("[Firestore Error] removeBookmarkFromList for user:", userId, error);
    throw error;
  }
};

// Helper to populate booking details (primarily for mock data scenarios if needed, live data should be stored denormalized)
export const populateBookingDetails = async (booking: Booking): Promise<Booking> => {
    const listing = firebaseInitializationError ? mockListings.find(l => l.id === booking.listingId) : await getListingById(booking.listingId);
    const renter = firebaseInitializationError ? mockUsers.find(u => u.id === booking.renterId) : await getUserById(booking.renterId);
    const landowner = firebaseInitializationError ? mockUsers.find(u => u.id === booking.landownerId) : await getUserById(booking.landownerId);
    return {
        ...booking,
        listingTitle: listing?.title || booking.listingTitle || `Listing ID: ${booking.listingId.substring(0,10)}...`,
        renterName: renter?.name || booking.renterName || `Renter ID: ${booking.renterId.substring(0,6)}...`,
        landownerName: landowner?.name || booking.landownerName || `Owner ID: ${booking.landownerId.substring(0,6)}...`,
    };
};
