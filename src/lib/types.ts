
export type LeaseTerm = 'short-term' | 'long-term' | 'flexible';

export interface Listing {
  id: string;
  title: string;
  description: string;
  location: string; // Could be more complex (e.g., lat/lng)
  sizeSqft: number;
  amenities: string[]; // e.g., ["water", "power", "septic"]
  pricePerMonth: number;
  images: string[]; // URLs to images
  landownerId: string; // ID of the user who owns the land
  isAvailable: boolean;
  rating?: number; // Average rating
  numberOfRatings?: number;
  leaseTerm?: LeaseTerm; // New field for lease term
  minLeaseDurationMonths?: number; // Optional: minimum lease duration in months
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  userType: 'landowner' | 'renter' | 'admin'; // Example user types
  // Add other relevant user fields
}

export interface Review {
  id: string;
  listingId: string;
  userId: string;
  rating: number; // 1-5 stars
  comment: string;
  createdAt: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: Date;
  isRead: boolean;
}

export interface Conversation {
  id:string;
  participantIds: string[]; // IDs of users in the conversation
  lastMessage?: Message; // For preview
  listingId?: string; // Optional: if conversation is about a specific listing
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
