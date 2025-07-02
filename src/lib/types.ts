import type { Timestamp } from 'firebase/firestore';

export type LeaseTerm = 'short-term' | 'long-term' | 'flexible';
export type PricingModel = 'nightly' | 'monthly' | 'lease-to-own';

export interface Listing {
  id: string;
  title: string;
  description: string;
  location: string;
  lat?: number;
  lng?: number;
  sizeSqft: number;
  amenities: string[];
  price: number; // Price set by landowner
  suggestedPrice?: number; // AI suggested price
  pricingModel: PricingModel;
  leaseToOwnDetails?: string;
  downPayment?: number;
  images: string[];
  landownerId: string;
  isAvailable: boolean;
  rating?: number;
  numberOfRatings?: number;
  leaseTerm?: LeaseTerm;
  minLeaseDurationMonths?: number | null; // Can be null if not applicable
  isBoosted?: boolean;
  createdAt?: Date | Timestamp;
  bookmarkedBy?: string[];
}

export type SubscriptionStatus = 'standard' | 'premium' | 'loading';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  bio?: string;
  createdAt?: Date | Timestamp;
  subscriptionStatus?: SubscriptionStatus;
  bookmarkedListingIds?: string[];
  walletBalance: number;
}

export interface Review {
  id: string;
  listingId: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt: Date | Timestamp;
  userName?: string;
}

export interface Booking {
  id:string;
  listingId: string;
  renterId: string;
  landownerId: string;
  status: 'Confirmed' | 'Pending Confirmation' | 'Declined' | 'Cancelled by Renter' | 'Refund Requested' | 'Refund Approved';
  dateRange: {
    from: Date | Timestamp;
    to: Date | Timestamp;
  };
  totalPrice?: number; // Price at the time of booking, locked in.
  paymentTransactionId?: string; // The renter's initial payment transaction.
  createdAt?: Date | Timestamp;
  listingTitle?: string;
  landownerName?: string;
  renterName?: string;
  leaseContractPath?: string; // Stores the gs:// path
  leaseContractUrl?: string;  // Stores the public HTTPS download URL
}


export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: Date | Timestamp;
  isRead: boolean;
}

export interface Conversation {
  id:string;
  participantIds: string[];
  lastMessage?: Message;
  listingId?: string;
  updatedAt?: Date | Timestamp;
}

export type Transaction = {
  id: string;
  userId: string; // The user this transaction record belongs to
  type: 'Subscription' | 'Booking Payment' | 'Landowner Payout' | 'Service Fee' | 'Subscription Refund' | 'Booking Refund' | 'Payout Reversal';
  status: 'Completed' | 'Pending' | 'Failed' | 'Reversed';
  amount: number; // Positive for income, negative for expense
  currency: 'USD';
  date: Date | Timestamp;
  description: string;
  relatedBookingId?: string;
  relatedListingId?: string;
};


export type PriceSuggestionInput = {
  location: string;
  sizeSqft: number;
  amenities: string;
};

export type PriceSuggestionOutput = {
  suggestedPrice: number;
  reasoning: string;
};

export type SuggestListingTitleInput = {
  location: string;
  sizeSqft?: number;
  keywords: string;
  existingDescription?: string;
};

export type SuggestListingTitleOutput = {
  suggestedTitle: string;
  reasoning: string;
};

export type GenerateListingDescriptionInput = {
  listingTitle: string;
  location: string;
  sizeSqft: number;
  amenities: string[];
  pricingModel: PricingModel;
  price: number;
  leaseTerm?: LeaseTerm | null;
  keywords?: string; // Optional user-provided keywords
};

export type GenerateListingDescriptionOutput = {
  suggestedDescription: string;
};


// Input for the AI lease generation flow
export type GenerateLeaseTermsInput = {
  listingType: string; // e.g., "RV Pad", "Tiny Home Lot", "Agricultural Land"
  durationDescription: string; // e.g. "3 months", "14 days (approx 0.5 months)"
  pricePerMonthEquivalent: number; // The monthly rate, even if booking is shorter
  landownerName: string;
  renterName: string;
  listingAddress: string;
  additionalRules?: string; // Comma-separated custom rules
};

// Output for the AI lease generation flow
export type GenerateLeaseTermsOutput = {
  leaseAgreementText: string;
  summaryPoints: string[];
};

// For displaying price calculation details on listing page
export interface PriceDetails {
  basePrice: number;
  renterFee: number;
  subtotal: number;
  estimatedTax: number;
  totalPrice: number;
  duration?: number; // Number of nights or days
  durationUnit?: 'night' | 'day' | 'nights' | 'days' | 'month' | 'months'; // unit for duration
  pricingModelUsed?: PricingModel;
  displayRate?: string; // e.g., "$50/night", "$100/month (prorated for X days)"
}

export interface PlatformMetrics {
  id: string; // usually a singleton like 'global_metrics'
  totalRevenue: number;
  totalServiceFees: number;
  totalSubscriptionRevenue: number;
  totalUsers: number;
  totalListings: number;
  totalBookings: number;
}

export interface MarketInsightsData {
    avgPricePerSqftMonthly: number;
    avgPricePerSqftNightly: number;
    amenityPopularity: { name: string; count: number }[];
    supplyByPricingModel: { name: string; value: number, percent: string }[];
    demandByPricingModel: { name: string; value: number, percent: string }[];
}
