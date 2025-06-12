
import type { Timestamp } from 'firebase/firestore';

export type LeaseTerm = 'short-term' | 'long-term' | 'flexible';
export type PricingModel = 'nightly' | 'monthly' | 'lease-to-own';

export interface Listing {
  id: string;
  title: string;
  description: string;
  location: string;
  sizeSqft: number;
  amenities: string[];
  price: number; // Unified price field
  pricingModel: PricingModel;
  leaseToOwnDetails?: string;
  images: string[];
  landownerId: string;
  isAvailable: boolean;
  rating?: number;
  numberOfRatings?: number;
  leaseTerm?: LeaseTerm;
  minLeaseDurationMonths?: number;
  isBoosted?: boolean; 
  createdAt?: Date | Timestamp;
}

export type SubscriptionStatus = 'free' | 'premium' | 'loading';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  bio?: string;
  createdAt?: Date | Timestamp;
  subscriptionStatus?: SubscriptionStatus;
  stripeCustomerId?: string;
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
  id: string;
  listingId: string;
  renterId: string;
  landownerId: string;
  status: 'Confirmed' | 'Pending Confirmation' | 'Declined' | 'Cancelled';
  dateRange: {
    from: Date | Timestamp;
    to: Date | Timestamp;
  };
  createdAt?: Date | Timestamp;
  listingTitle?: string;
  landownerName?: string;
  renterName?: string;
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

// Input for the AI lease generation flow
export type GenerateLeaseTermsInput = {
  listingType: string; // e.g., "RV Pad", "Tiny Home Lot", "Agricultural Land"
  durationMonths: number;
  monthlyPrice: number;
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
