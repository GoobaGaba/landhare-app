
'use client';
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
import type { User, Listing, Booking, Review, SubscriptionStatus, PricingModel, Transaction, PriceDetails, PlatformMetrics, MarketInsightsData } from './types';
import { differenceInDays, differenceInCalendarMonths, startOfMonth, endOfMonth, addDays } from 'date-fns';

export const FREE_TIER_LISTING_LIMIT = 2;
export const FREE_TIER_BOOKMARK_LIMIT = 5;
export const ADMIN_UIDS = ['ZsAXo79Wh8XEiHFrcJwlJT2h89F3', 'AdminGNL6965'];


export let mockDataVersion = 0;

export const incrementMockDataVersion = (source: string) => {
  mockDataVersion++;
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
export const MOCK_GABE_ADMIN_USER: User = {
  id: 'AdminGNL6965',
  name: 'Gabeh',
  email: 'gabeh@landshare.app',
  avatarUrl: 'https://placehold.co/100x100.png?text=GNL',
  subscriptionStatus: 'premium',
  createdAt: new Date('2023-01-02T10:00:00Z'),
  bio: 'Platform Co-Administrator.',
  bookmarkedListingIds: [],
  walletBalance: 500000,
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

export let mockUsers: User[] = [
  MOCK_ADMIN_USER,
  MOCK_GABE_ADMIN_USER,
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
];

// Additional bot users for simulation
const BOT_LANDOWNER_1: User = { id: 'bot-landowner-1', name: 'Bot Host Alice', email: 'bot.alice@landshare.app', subscriptionStatus: 'premium', walletBalance: 50000, createdAt: new Date() };
const BOT_RENTER_1: User = { id: 'bot-renter-1', name: 'Bot Renter Bob', email: 'bot.bob@landshare.app', subscriptionStatus: 'free', walletBalance: 3000, createdAt: new Date() };
const BOT_RENTER_2: User = { id: 'bot-renter-2', name: 'Bot Renter Charlie', email: 'bot.charlie@landshare.app', subscriptionStatus: 'premium', walletBalance: 8000, createdAt: new Date() };
mockUsers.push(BOT_LANDOWNER_1, BOT_RENTER_1, BOT_RENTER_2);


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
    landownerId: MOCK_USER_FOR_UI_TESTING.id,
    isAvailable: true,
    rating: 4.2,
    numberOfRatings: 8,
    leaseTerm: 'flexible',
    isBoosted: false,
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
    landownerId: MOCK_USER_FOR_UI_TESTING.id,
    isAvailable: true,
    rating: 4.9,
    numberOfRatings: 22,
    leaseTerm: 'long-term',
    minLeaseDurationMonths: 12,
    isBoosted: false,
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
    landownerId: MOCK_USER_FOR_UI_TESTING.id,
    isAvailable: true,
    rating: 4.3,
    numberOfRatings: 5,
    isBoosted: false,
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
    landownerId: MOCK_USER_FOR_UI_TESTING.id,
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
    landownerId: MOCK_USER_FOR_UI_TESTING.id,
    landownerName: MOCK_USER_FOR_UI_TESTING.name,
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
    landownerId: MOCK_USER_FOR_UI_TESTING.id,
    landownerName: MOCK_USER_FOR_UI_TESTING.name,
    status: 'Pending Confirmation',
    dateRange: { from: new Date('2024-09-01'), to: new Date('2029-08-31') },
    createdAt: new Date('2024-07-25T10:00:00Z'),
  },
  {
    id: 'booking-6-mockuser-pending',
    listingId: 'listing-1-sunny-meadow',
    listingTitle: 'Sunny Meadow Plot',
    renterId: MOCK_USER_FOR_UI_TESTING.id,
    renterName: MOCK_USER_FOR_UI_TESTING.name,
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
  // Mock User's transactions
  { id: 'txn1', userId: MOCK_USER_FOR_UI_TESTING.id, type: 'Subscription', status: 'Completed', amount: -5.00, currency: 'USD', date: new Date('2024-07-01T00:00:00Z'), description: 'Premium Subscription - July' },
  { id: 'txn2', userId: MOCK_USER_FOR_UI_TESTING.id, type: 'Landowner Payout', status: 'Completed', amount: 196.00, currency: 'USD', date: new Date('2024-07-05T00:00:00Z'), description: 'Payout for Forest Retreat Lot', relatedListingId: 'listing-2-forest-retreat', relatedBookingId: 'booking-2' },
  { id: 'txn3', userId: MOCK_USER_FOR_UI_TESTING.id, type: 'Service Fee', status: 'Completed', amount: -4.00, currency: 'USD', date: new Date('2024-07-05T00:00:00Z'), description: 'Service Fee (2%) for Forest Retreat Lot', relatedListingId: 'listing-2-forest-retreat', relatedBookingId: 'booking-2' },
  // Jane Doe's transactions
  { id: 'txn4', userId: 'landowner-jane-doe', type: 'Landowner Payout', status: 'Completed', amount: 343.00, currency: 'USD', date: new Date('2024-07-08T00:00:00Z'), description: 'Payout for Sunny Meadow Plot', relatedListingId: 'listing-1-sunny-meadow', relatedBookingId: 'booking-1' },
  { id: 'txn5', userId: 'landowner-jane-doe', type: 'Service Fee', status: 'Completed', amount: -7.00, currency: 'USD', date: new Date('2024-07-08T00:00:00Z'), description: 'Service Fee (2%) for Sunny Meadow Plot', relatedListingId: 'listing-1-sunny-meadow', relatedBookingId: 'booking-1' },
  // John Smith's transactions
  { id: 'txn6', userId: 'renter-john-smith', type: 'Booking Payment', status: 'Completed', amount: -2100.99, currency: 'USD', date: new Date('2023-12-15T00:00:00Z'), description: 'Payment for Sunny Meadow Plot (6 months)', relatedListingId: 'listing-1-sunny-meadow', relatedBookingId: 'booking-1' },
  { id: 'txn7', userId: 'renter-john-smith', type: 'Booking Payment', status: 'Pending', amount: -200.99, currency: 'USD', date: new Date('2024-07-20T00:00:00Z'), description: 'Payment for Forest Retreat Lot', relatedListingId: 'listing-2-forest-retreat', relatedBookingId: 'booking-2' },
];

export let platformMetrics: PlatformMetrics = {
  id: 'global_metrics',
  totalRevenue: 16.00, // Sum of fees and sub revenue
  totalServiceFees: 11.00,
  totalSubscriptionRevenue: 5.00,
  totalUsers: mockUsers.length,
  totalListings: mockListings.length,
  totalBookings: mockBookings.length,
};

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
  // Generate random coordinates if they are missing, centered loosely on the US
  const lat = data.lat ?? 39.8283 + (Math.random() - 0.5) * 20;
  const lng = data.lng ?? -98.5795 + (Math.random() - 0.5) * 40;

  return {
    id: docSnap.id,
    title: data.title || 'Untitled Listing',
    description: data.description || 'No description available.',
    location: data.location || 'Unknown location',
    lat: lat,
    lng: lng,
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
        throw error; // Re-throw for the caller to handle
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
        platformMetrics.totalSubscriptionRevenue += Math.abs(newTransaction.amount);
        platformMetrics.totalRevenue += Math.abs(newTransaction.amount);
        incrementMockDataVersion('createSubscriptionTransaction_mock');
    } else {
        const batch = writeBatch(db);
        const userDocRef = doc(db, "users", userId);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
            const currentBalance = userSnap.data().walletBalance ?? 0;
            batch.update(userDocRef, { walletBalance: currentBalance + newTransaction.amount });
        }
        batch.set(doc(collection(db, "transactions")), { ...newTransaction, date: Timestamp.fromDate(newTransaction.date as Date) });

        const metricsRef = doc(db, "metrics", "global_metrics");
        const metricsSnap = await getDoc(metricsRef);
        if (metricsSnap.exists()) {
            const currentSubRevenue = metricsSnap.data().totalSubscriptionRevenue ?? 0;
            const currentTotalRevenue = metricsSnap.data().totalRevenue ?? 0;
            batch.update(metricsRef, { 
                totalSubscriptionRevenue: currentSubRevenue + Math.abs(newTransaction.amount),
                totalRevenue: currentTotalRevenue + Math.abs(newTransaction.amount)
            });
        }
        await batch.commit();
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
        platformMetrics.totalSubscriptionRevenue -= newTransaction.amount;
        platformMetrics.totalRevenue -= newTransaction.amount;
        incrementMockDataVersion('createRefundTransaction_mock');
    } else {
        const batch = writeBatch(db);
        const userDocRef = doc(db, "users", userId);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
            const currentBalance = userSnap.data().walletBalance ?? 0;
            batch.update(userDocRef, { walletBalance: currentBalance + newTransaction.amount });
        }
        batch.set(doc(collection(db, "transactions")), { ...newTransaction, date: Timestamp.fromDate(newTransaction.date as Date) });
        
        const metricsRef = doc(db, "metrics", "global_metrics");
        const metricsSnap = await getDoc(metricsRef);
        if (metricsSnap.exists()) {
            const currentSubRevenue = metricsSnap.data().totalSubscriptionRevenue ?? 0;
            const currentTotalRevenue = metricsSnap.data().totalRevenue ?? 0;
            batch.update(metricsRef, { 
                totalSubscriptionRevenue: currentSubRevenue - newTransaction.amount,
                totalRevenue: currentTotalRevenue - newTransaction.amount
            });
        }
        await batch.commit();
    }
};


// --- User Functions ---
export const getUserById = async (id: string): Promise<User | undefined> => {
  if (!firebaseInitializationError && db) {
    try {
      const userDocRef = doc(db, "users", id);
      const userSnap = await getDoc(userDocRef);
      if (userSnap.exists()) {
        return mapDocToUser(userSnap);
      }
    } catch (error) {
      console.error(`[Firestore Error] getUserById for ID ${id}, will fall back to mock:`, error);
    }
  }
  
  // If not found in Firestore or if Firebase is not configured, check mock data.
  return mockUsers.find(user => user.id === id);
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
    const existingUserIndex = mockUsers.findIndex(u => u.id === userId);
    if (existingUserIndex !== -1) {
      mockUsers[existingUserIndex] = { ...mockUsers[existingUserIndex], ...profileData };
    } else {
      mockUsers.push(profileData);
      platformMetrics.totalUsers = mockUsers.length;
    }
    incrementMockDataVersion('createUserProfile_mock');
    return profileData;
  }

  try {
    const userDocRef = doc(db, "users", userId);
    const firestoreProfileData = {
        ...profileData,
        createdAt: Timestamp.fromDate(profileData.createdAt as Date)
    };
    delete (firestoreProfileData as any).id;

    await setDoc(userDocRef, firestoreProfileData, { merge: true });
    
    const metricsRef = doc(db, "metrics", "global_metrics");
    const usersCountSnap = await getCountFromServer(collection(db, "users"));
    await updateDoc(metricsRef, { totalUsers: usersCountSnap.data().count });
    
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
  let liveListings: Listing[] = [];

  if (!firebaseInitializationError && db) {
    try {
      const listingsCol = collection(db, "listings");
      const q = query(listingsCol, orderBy("isBoosted", "desc"), orderBy("createdAt", "desc"));
      const listingSnapshot = await getDocs(q);
      liveListings = listingSnapshot.docs.map(mapDocToListing);
    } catch (error) {
      console.error("[Firestore Error] getListings failed, will proceed with mock data only:", error);
      // Don't throw, just log and proceed with mocks
    }
  }

  // Use a Map to handle potential duplicates, giving precedence to live data.
  const combinedListingsMap = new Map<string, Listing>();

  // Add all mock listings first
  for (const listing of mockListings) {
    combinedListingsMap.set(listing.id, listing);
  }

  // Overwrite with live listings. If a listing with the same ID exists, it will be replaced.
  for (const listing of liveListings) {
    combinedListingsMap.set(listing.id, listing);
  }

  const combinedListings = Array.from(combinedListingsMap.values());
  
  // Sort the final combined list
  const sortedListings = combinedListings.sort((a, b) => {
      if (a.isBoosted && !b.isBoosted) return -1;
      if (!a.isBoosted && b.isBoosted) return 1;
      const timeA = (a.createdAt instanceof Date ? a.createdAt : (a.createdAt as Timestamp)?.toDate() || new Date(0)).getTime();
      const timeB = (b.createdAt instanceof Date ? b.createdAt : (b.createdAt as Timestamp)?.toDate() || new Date(0)).getTime();
      return timeB - timeA;
  });

  return sortedListings;
};

export const getListingsByLandownerCount = async (landownerId: string): Promise<number> => {
  if (firebaseInitializationError || !db) {
    return mockListings.filter(l => l.landownerId === landownerId).length;
  }
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
  if (!firebaseInitializationError && db) {
    try {
      const listingDocRef = doc(db, "listings", id);
      const listingSnap = await getDoc(listingDocRef);
      if (listingSnap.exists()) {
        return mapDocToListing(listingSnap);
      }
    } catch (error) {
      console.error(`[Firestore Error] getListingById for ID ${id}, will fall back to mock:`, error);
    }
  }

  // If not found in Firestore or if Firebase is not configured, check mock data.
  return mockListings.find(listing => listing.id === id);
};

export const addListing = async (data: Omit<Listing, 'id'>, isLandownerPremium: boolean = false): Promise<Listing> => {
  const newListingData: Omit<Listing, 'id'> = {
    ...data,
    isBoosted: isLandownerPremium,
    lat: data.lat ?? 39.8283 + (Math.random() - 0.5) * 10,
    lng: data.lng ?? -98.5795 + (Math.random() - 0.5) * 20,
  };

  if (firebaseInitializationError || !db) {
    const mockId = `listing-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const fullMockListing = { ...newListingData, id: mockId } as Listing;
    mockListings.unshift(fullMockListing);
    platformMetrics.totalListings = mockListings.length;
    incrementMockDataVersion('addListing_mock');
    return fullMockListing;
  }

  try {
    const listingsCol = collection(db, "listings");
    const docRef = await addDoc(listingsCol, newListingData);
    
    const metricsRef = doc(db, "metrics", "global_metrics");
    const listingsCountSnap = await getCountFromServer(collection(db, "listings"));
    await updateDoc(metricsRef, { totalListings: listingsCountSnap.data().count });

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
    const initialLength = mockListings.length;
    mockListings = mockListings.filter(l => l.id !== listingId);
    mockBookings = mockBookings.filter(b => b.listingId !== listingId);
    mockReviews = mockReviews.filter(r => r.listingId !== listingId);
    const deleted = mockListings.length < initialLength;
    if (deleted) {
      platformMetrics.totalListings = mockListings.length;
      incrementMockDataVersion('deleteListing_mock');
    }
    return deleted;
  }

  try {
    const batch = writeBatch(db);
    const listingDocRef = doc(db, "listings", listingId);
    const listingSnap = await getDoc(listingDocRef);
    if (!listingSnap.exists()) return false;

    batch.delete(listingDocRef);

    const bookingsQuery = query(collection(db, "bookings"), where("listingId", "==", listingId));
    const bookingsSnapshot = await getDocs(bookingsQuery);
    bookingsSnapshot.forEach(doc => batch.delete(doc.ref));
    
    const reviewsQuery = query(collection(db, "reviews"), where("listingId", "==", listingId));
    const reviewsSnapshot = await getDocs(reviewsQuery);
    reviewsSnapshot.forEach(doc => batch.delete(doc.ref));
    
    await batch.commit();

    const metricsRef = doc(db, "metrics", "global_metrics");
    const listingsCountSnap = await getCountFromServer(collection(db, "listings"));
    await updateDoc(metricsRef, { totalListings: listingsCountSnap.data().count });

    return true;
  } catch (error) {
    console.error(`[Firestore Error] deleteListing for ID ${listingId}:`, error);
    throw error;
  }
};

// --- Review Functions ---
export const getReviewsForListing = async (listingId: string): Promise<Review[]> => {
  if (firebaseInitializationError || !db) {
    const listingReviews = mockReviews.filter(review => review.listingId === listingId)
        .sort((a, b) => {
          const timeA = (a.createdAt instanceof Date ? a.createdAt : (a.createdAt as Timestamp)?.toDate() || new Date(0)).getTime();
          const timeB = (b.createdAt instanceof Date ? b.createdAt : (b.createdAt as Timestamp)?.toDate() || new Date(0)).getTime();
          return timeB - timeA;
        });
    return Promise.all(listingReviews.map(async (review) => {
        const user = mockUsers.find(u => u.id === review.userId);
        return {...review, userName: user?.name || `User...${review.userId.slice(-4)}` };
    }));
  }
  try {
    const reviewsCol = collection(db, "reviews");
    const q = query(reviewsCol, where("listingId", "==", listingId), orderBy("createdAt", "desc"));
    const reviewSnapshot = await getDocs(q);
    return Promise.all(reviewSnapshot.docs.map(async (docSnap) => {
        const review = mapDocToReview(docSnap);
        const user = await getUserById(review.userId);
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

  try {
    const userAddingReview = await getUserById(userId);
    userName = userAddingReview?.name || userName;

    const reviewsCol = collection(db, "reviews");
    const firestoreReviewData: Omit<Review, 'id'> = {
        listingId, userId, userName, rating, comment,
        createdAt: Timestamp.fromDate(creationTimestamp),
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
    const userBookings = mockBookings.filter(b => b.renterId === userId || b.landownerId === userId)
        .sort((a,b) => {
          const timeA = (a.createdAt instanceof Date ? a.createdAt : (a.createdAt as Timestamp)?.toDate() || new Date(0)).getTime();
          const timeB = (b.createdAt instanceof Date ? b.createdAt : (b.createdAt as Timestamp)?.toDate() || new Date(0)).getTime();
          return timeB - timeA;
        });
    return Promise.all(userBookings.map(async (booking) => {
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

  try {
    const bookingsCol = collection(db, "bookings");
    const q = query(
      bookingsCol,
      or(where("renterId", "==", userId), where("landownerId", "==", userId)),
      orderBy("createdAt", "desc")
    );
    const bookingSnapshot = await getDocs(q);
    return bookingSnapshot.docs.map(mapDocToBooking);
  } catch (error) {
    console.error("[Firestore Error] getBookingsForUser:", error);
    throw error;
  }
};

export const addBookingRequest = async (
  data: Omit<Booking, 'id' | 'status' | 'createdAt' | 'listingTitle' | 'renterName' | 'landownerName'> & {dateRange: {from: Date; to: Date}},
  status: Booking['status'] = 'Pending Confirmation'
): Promise<Booking> => {
  const creationTimestamp = new Date();
  
  if (firebaseInitializationError || !db) {
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

    platformMetrics.totalBookings = mockBookings.length;

    incrementMockDataVersion('addBookingRequest_mock');
    return newMockBooking;
  }

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
    
    const batch = writeBatch(db);

    const renterDocRef = doc(db, 'users', renterInfo.id);
    batch.update(renterDocRef, { walletBalance: (renterInfo.walletBalance ?? 0) - totalPrice });

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
    const docRef = doc(bookingsCol);
    batch.set(docRef, newBookingBase);

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
    batch.set(doc(collection(db, "transactions")), newPaymentTransaction);
    
    const metricsRef = doc(db, "metrics", "global_metrics");
    const bookingsCountSnap = await getCountFromServer(collection(db, "bookings"));
    batch.update(metricsRef, { totalBookings: bookingsCountSnap.data().count + 1 });

    await batch.commit();

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
        if (status === 'Declined' || status === 'Cancelled by Renter') mockTransactions[paymentTxnIndex].status = 'Failed';
    }

    if (status === 'Confirmed') {
        const listing = mockListings.find(l => l.id === booking.listingId);
        const landownerIndex = mockUsers.findIndex(u => u.id === booking.landownerId);
        const renter = mockUsers.find(u => u.id === booking.renterId);

        if (listing && landownerIndex !== -1 && renter) {
            const { totalPrice, basePrice } = calculatePriceDetails(listing, { from: booking.dateRange.from as Date, to: booking.dateRange.to as Date }, renter.subscriptionStatus || 'free');

            const landowner = mockUsers[landownerIndex];
            const serviceFeeRate = landowner.subscriptionStatus === 'premium' ? 0.0049 : 0.02;
            const serviceFee = basePrice * serviceFeeRate;
            const payout = basePrice - serviceFee;
            
            mockUsers[landownerIndex].walletBalance = (landowner.walletBalance ?? 0) + payout;
            
            mockTransactions.unshift({
                id: `txn-payout-${booking.id}`,
                userId: landowner.id,
                type: 'Landowner Payout',
                status: 'Completed',
                amount: payout,
                currency: 'USD',
                date: new Date(),
                description: `Payout for "${listing.title}"`,
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
                description: `Service Fee (${(serviceFeeRate * 100).toFixed(2)}%) for "${listing.title}"`,
                relatedBookingId: booking.id,
                relatedListingId: listing.id
            });
            
            platformMetrics.totalServiceFees += serviceFee;
            platformMetrics.totalRevenue += serviceFee;
        }
    } else if (status === 'Refund Approved') {
      const paymentTxn = mockTransactions.find(t => t.relatedBookingId === booking.id && t.type === 'Booking Payment');
      if (paymentTxn) {
          const renterIndex = mockUsers.findIndex(u => u.id === booking.renterId);
          if (renterIndex !== -1) {
              mockUsers[renterIndex].walletBalance = (mockUsers[renterIndex].walletBalance ?? 0) + Math.abs(paymentTxn.amount);
              mockTransactions.unshift({
                id: `txn-refund-${booking.id}`, userId: booking.renterId, type: 'Booking Refund', status: 'Completed',
                amount: Math.abs(paymentTxn.amount), currency: 'USD', date: new Date(),
                description: `Refund for "${booking.listingTitle}"`, relatedBookingId: booking.id, relatedListingId: booking.listingId
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

  try {
    const bookingDocRef = doc(db, "bookings", bookingId);
    const batch = writeBatch(db);
    batch.update(bookingDocRef, { status: status });

    const paymentQuery = query(collection(db, "transactions"), where("relatedBookingId", "==", bookingId), where("type", "==", "Booking Payment"));
    const paymentSnap = await getDocs(paymentQuery);
    paymentSnap.forEach(doc => {
      if (status === 'Confirmed') batch.update(doc.ref, { status: 'Completed' });
      if (status === 'Declined' || status === 'Cancelled by Renter') batch.update(doc.ref, { status: 'Failed' });
    });

    if (status === 'Confirmed') {
      const bookingSnap = await getDoc(bookingDocRef);
      if (bookingSnap.exists()) {
          const bookingData = bookingSnap.data() as Booking;
          const listing = await getListingById(bookingData.listingId);
          const landowner = await getUserById(bookingData.landownerId);
          const renter = await getUserById(bookingData.renterId);

          if (listing && landowner && renter) {
              const { basePrice } = calculatePriceDetails(listing, { from: (bookingData.dateRange.from as Timestamp).toDate(), to: (bookingData.dateRange.to as Timestamp).toDate() }, renter.subscriptionStatus || 'free');

              const serviceFeeRate = landowner.subscriptionStatus === 'premium' ? 0.0049 : 0.02;
              const serviceFee = basePrice * serviceFeeRate;
              const payout = basePrice - serviceFee;

              const landownerDocRef = doc(db, 'users', landowner.id);
              batch.update(landownerDocRef, { walletBalance: (landowner.walletBalance ?? 0) + payout });
              
              const transCol = collection(db, 'transactions');
              batch.set(doc(transCol), {
                  userId: landowner.id, type: 'Landowner Payout', status: 'Completed', amount: payout, currency: 'USD',
                  date: Timestamp.now(), description: `Payout for "${listing.title}"`,
                  relatedBookingId: bookingId, relatedListingId: listing.id
              });
               batch.set(doc(transCol), {
                  userId: landowner.id, type: 'Service Fee', status: 'Completed', amount: -serviceFee, currency: 'USD',
                  date: Timestamp.now(), description: `Service Fee (${(serviceFeeRate * 100).toFixed(2)}%) for "${listing.title}"`,
                  relatedBookingId: bookingId, relatedListingId: listing.id
              });

              const metricsRef = doc(db, "metrics", "global_metrics");
              const metricsSnap = await getDoc(metricsRef);
              if (metricsSnap.exists()) {
                  const currentFeeRevenue = metricsSnap.data().totalServiceFees ?? 0;
                  const currentTotalRevenue = metricsSnap.data().totalRevenue ?? 0;
                  batch.update(metricsRef, { 
                      totalServiceFees: currentFeeRevenue + serviceFee,
                      totalRevenue: currentTotalRevenue + serviceFee
                  });
              }
          }
      }
    } else if (status === 'Refund Approved') {
      const q = query(collection(db, "transactions"), where("relatedBookingId", "==", bookingId), where("type", "==", "Booking Payment"));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const paymentDoc = querySnapshot.docs[0];
        const paymentData = paymentDoc.data() as Transaction;
        const renterRef = doc(db, "users", paymentData.userId);
        const renterSnap = await getDoc(renterRef);
        if (renterSnap.exists()) {
          batch.update(renterRef, { walletBalance: (renterSnap.data().walletBalance ?? 0) + Math.abs(paymentData.amount) });
          batch.set(doc(collection(db, "transactions")), {
            userId: paymentData.userId, type: 'Booking Refund', status: 'Completed', amount: Math.abs(paymentData.amount),
            currency: 'USD', date: Timestamp.now(), description: `Refund for "${bookingId}"`,
            relatedBookingId: bookingId, relatedListingId: paymentData.relatedListingId
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
  try {
    const userDocRef = doc(db, "users", userId);
    const userSnap = await getDoc(userDocRef);
    if (!userSnap.exists()) throw new Error("User not found to add bookmark.");
    const user = mapDocToUser(userSnap);

    if (user.subscriptionStatus === 'free' && (user.bookmarkedListingIds?.length || 0) >= FREE_TIER_BOOKMARK_LIMIT) {
      throw new Error(`Bookmark limit of ${FREE_TIER_BOOKMARK_LIMIT} reached for free accounts. Upgrade to Premium for unlimited bookmarks.`);
    }
    if (user.bookmarkedListingIds?.includes(listingId)) return user;

    await updateDoc(userDocRef, { bookmarkedListingIds: arrayUnion(listingId) });
    const updatedUserSnap = await getDoc(userDocRef);
    return updatedUserSnap.exists() ? mapDocToUser(updatedUserSnap) : undefined;
  } catch (error) {
    console.error("[Firestore Error] addBookmarkToList for user:", userId, error);
    throw error;
  }
};

export const removeBookmarkFromList = async (userId: string, listingId: string): Promise<User | undefined> => {
   if (firebaseInitializationError || !db) {
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
  try {
    const userDocRef = doc(db, "users", userId);
    const userSnap = await getDoc(userDocRef);
    if (!userSnap.exists()) throw new Error("User not found to remove bookmark.");
    
    await updateDoc(userDocRef, { bookmarkedListingIds: arrayRemove(listingId) });
    const updatedUserSnap = await getDoc(userDocRef);
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

// --- Admin & Bot Functions ---
export const getPlatformMetrics = async (): Promise<PlatformMetrics> => {
  // Always use mock data for admin dashboard to prevent permission errors with mock admins
  platformMetrics.totalUsers = mockUsers.length;
  platformMetrics.totalListings = mockListings.length;
  platformMetrics.totalBookings = mockBookings.length;
  return platformMetrics;
};

export const runBotSimulationCycle = async (): Promise<{ message: string }> => {
    const botLandownerIds = mockUsers.filter(u => u.id.startsWith('bot-landowner')).map(u => u.id);
    const botRenterIds = mockUsers.filter(u => u.id.startsWith('bot-renter')).map(u => u.id);

    let listingsCreated = 0;
    let bookingsCreated = 0;

    const botLocations = [
        { name: 'Austin, TX', lat: 30.2672, lng: -97.7431 },
        { name: 'Portland, OR', lat: 45.5051, lng: -122.6750 },
        { name: 'Denver, CO', lat: 39.7392, lng: -104.9903 }
    ];
    const selectedLocation = botLocations[Math.floor(Math.random() * botLocations.length)];
    const landownerToUseId = botLandownerIds[Math.floor(Math.random() * botLandownerIds.length)];
    const landownerUser = await getUserById(landownerToUseId);

    // Step 1: A bot landowner creates a new listing.
    if (landownerUser) {
        const newListingData: Omit<Listing, 'id'> = {
            title: `Bot Listing #${Math.floor(Math.random() * 1000)}`,
            description: 'This is an automatically generated listing by a bot for simulation purposes.',
            location: selectedLocation.name,
            lat: selectedLocation.lat + (Math.random() - 0.5) * 0.1,
            lng: selectedLocation.lng + (Math.random() - 0.5) * 0.1,
            sizeSqft: Math.floor(Math.random() * 20000) + 1000,
            amenities: ['road access', 'pet friendly'],
            pricingModel: 'monthly',
            price: Math.floor(Math.random() * 400) + 100,
            images: [`https://placehold.co/800x600.png?text=Bot+Listing`],
            landownerId: landownerUser.id,
            isAvailable: true,
            createdAt: new Date(),
        };
        await addListing(newListingData, landownerUser.subscriptionStatus === 'premium');
        listingsCreated++;
    }

    // Step 2: A bot renter books an available listing.
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
                // The booking is requested and immediately confirmed to trigger the full economic cycle.
                const booking = await addBookingRequest({
                    listingId: listingToBook.id,
                    renterId: renter.id,
                    dateRange: { from: startDate, to: endDate },
                }, 'Confirmed'); 
                
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
    let allListings: Listing[] = [];
    let allConfirmedBookings: Booking[] = [];
    if (firebaseInitializationError || !db) {
        allListings = mockListings.filter(l => l.isAvailable);
        allConfirmedBookings = mockBookings.filter(b => b.status === 'Confirmed');
    } else {
        allListings = await getListings().then(l => l.filter(li => li.isAvailable));
        const bookingsCollection = collection(db, "bookings");
        const q = query(bookingsCollection, where("status", "==", "Confirmed"));
        const bookingSnapshot = await getDocs(q);
        allConfirmedBookings = bookingSnapshot.docs.map(mapDocToBooking);
    }

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

    const amenityPopularity = Object.entries(amenityCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    const supplyCounts = allListings.reduce((acc, l) => {
        acc[l.pricingModel] = (acc[l.pricingModel] || 0) + 1;
        return acc;
    }, {} as Record<PricingModel, number>);

    const supplyTotal = Object.values(supplyCounts).reduce((sum, count) => sum + count, 0);
    const supplyByPricingModel = Object.entries(supplyCounts).map(([name, value]) => ({
        name: name as PricingModel,
        value,
        percent: supplyTotal > 0 ? ((value / supplyTotal) * 100).toFixed(0) : "0",
    }));

    const demandCounts = allConfirmedBookings.reduce((acc, b) => {
        const listing = allListings.find(l => l.id === b.listingId);
        if (listing) {
            acc[listing.pricingModel] = (acc[listing.pricingModel] || 0) + 1;
        }
        return acc;
    }, {} as Record<PricingModel, number>);
    
    const demandTotal = Object.values(demandCounts).reduce((sum, count) => sum + count, 0);
    const demandByPricingModel = Object.entries(demandCounts).map(([name, value]) => ({
        name: name as PricingModel,
        value,
        percent: demandTotal > 0 ? ((value / demandTotal) * 100).toFixed(0) : "0",
    }));

    return {
        avgPricePerSqftMonthly,
        avgPricePerSqftNightly,
        amenityPopularity,
        supplyByPricingModel,
        demandByPricingModel
    };
};

    