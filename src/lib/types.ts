
import type { Timestamp } from 'firebase/firestore';

export type LeaseTerm = 'short-term' | 'long-term' | 'flexible';

export interface Listing {
  id: string;
  title: string;
  description: string;
  location: string; 
  sizeSqft: number;
  amenities: string[]; 
  pricePerMonth: number;
  images: string[]; 
  landownerId: string; 
  isAvailable: boolean;
  rating?: number; 
  numberOfRatings?: number;
  leaseTerm?: LeaseTerm; 
  minLeaseDurationMonths?: number; 
  createdAt?: Date | Timestamp; // For Firestore, often Timestamp
}

export type SubscriptionStatus = 'free' | 'premium';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  createdAt?: Date | Timestamp;
  subscriptionStatus?: SubscriptionStatus; // Added for subscription tier
  stripeCustomerId?: string; // Added for Stripe integration
}

export interface Review {
  id: string;
  listingId: string;
  userId: string;
  rating: number; 
  comment: string;
  createdAt: Date | Timestamp; // Firestore Timestamp
}

export interface Booking {
  id: string;
  listingId: string;
  renterId: string; 
  landownerId: string; 
  status: 'Confirmed' | 'Pending Confirmation' | 'Declined' | 'Cancelled';
  dateRange: { 
    from: Date | Timestamp; // Firestore Timestamp
    to: Date | Timestamp;   // Firestore Timestamp
  };
  createdAt?: Date | Timestamp;
  // Optional denormalized fields for display convenience
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
  timestamp: Date | Timestamp; // Firestore Timestamp
  isRead: boolean;
}

export interface Conversation {
  id:string;
  participantIds: string[]; 
  lastMessage?: Message; 
  listingId?: string; 
  updatedAt?: Date | Timestamp;
}

// For AI price suggestion
export type PriceSuggestionInput = {
  location: string;
  sizeSqft: number;
  amenities: string; // Comma-separated
};

export type PriceSuggestionOutput = {
  suggestedPrice: number;
  reasoning: string;
};

