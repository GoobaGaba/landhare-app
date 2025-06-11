
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
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  userType: 'landowner' | 'renter' | 'admin'; 
}

export interface Review {
  id: string;
  listingId: string;
  userId: string;
  rating: number; 
  comment: string;
  createdAt: Date;
}

export interface Booking {
  id: string;
  listingId: string;
  renterId: string; 
  landownerId: string; 
  status: 'Confirmed' | 'Pending Confirmation' | 'Declined' | 'Cancelled';
  dateRange: { from: Date; to: Date };
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
  timestamp: Date;
  isRead: boolean;
}

export interface Conversation {
  id:string;
  participantIds: string[]; 
  lastMessage?: Message; 
  listingId?: string; 
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

