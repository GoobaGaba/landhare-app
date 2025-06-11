
import type { User, Listing, Booking, Review } from './types';
import { addDays, format } from 'date-fns';

// --- MOCK USERS ---
let mockUsers: User[] = [
  { id: "user1", name: "Sarah Miller", email: "sarah@example.com", avatarUrl: "https://placehold.co/100x100.png?text=SM" },
  { id: "user2", name: "John Renter", email: "john@example.com", avatarUrl: "https://placehold.co/100x100.png?text=JR" },
  { id: "user3", name: "Alex Landowner", email: "alex@example.com", avatarUrl: "https://placehold.co/100x100.png?text=AL" },
  { id: "user4", name: "Maria Guest", email: "maria@example.com", avatarUrl: "https://placehold.co/100x100.png?text=MG" },
  { id: "user5", name: "Sam Camper", email: "sam@example.com", avatarUrl: "https://placehold.co/100x100.png?text=SC" },
];

export const getUsers = (): User[] => [...mockUsers];
export const getUserById = (id: string): User | undefined => mockUsers.find(u => u.id === id);

// --- MOCK LISTINGS ---
let mockListings: Listing[] = [
  {
    id: "1",
    title: "Sunny Meadow Plot",
    description: "Beautiful 2-acre plot perfect for a tiny home. Quiet and serene with great views. Enjoy the open space and connect with nature. Ideal for long-term lease or a weekend getaway. Close to local hiking trails and a small town for supplies.",
    location: "Willow Creek, CO",
    sizeSqft: 87120,
    amenities: ["Water Hookup", "Road Access", "Pet Friendly"],
    pricePerMonth: 350,
    images: ["https://placehold.co/800x600.png?text=Sunny+Meadow+1", "https://placehold.co/400x300.png?text=View+1", "https://placehold.co/400x300.png?text=View+2"],
    landownerId: "user1_firebase_uid", // Example: replace with an actual Firebase UID if testing logged-in user
    isAvailable: true,
    rating: 4.5,
    numberOfRatings: 12,
    leaseTerm: "long-term",
    minLeaseDurationMonths: 6,
  },
  {
    id: "2",
    title: "Forest Retreat Lot",
    description: "Secluded 5000 sq ft lot surrounded by trees. Power available at street.",
    location: "Pine Ridge, FL",
    sizeSqft: 5000,
    amenities: ["Power Access"],
    pricePerMonth: 200,
    images: ["https://placehold.co/600x400.png?text=Forest+Retreat"],
    landownerId: "user3_firebase_uid", // Example
    isAvailable: true,
    rating: 4.2,
    numberOfRatings: 8,
    leaseTerm: "short-term",
    minLeaseDurationMonths: 1,
  },
  {
    id: "l3", 
    title: "My Lakeside Camping Spot",
    description: "My special spot by the lake.",
    location: "My Lake, CO",
    sizeSqft: 3000,
    amenities: ["Lake Access", "Fire Pit"],
    pricePerMonth: 150,
    images: ["https://placehold.co/600x400.png?text=My+Lake+Spot"],
    landownerId: "user1_firebase_uid", 
    isAvailable: true,
    rating: 4.8,
    numberOfRatings: 5,
    leaseTerm: "flexible",
  },
   {
    id: "l4", 
    title: "My Urban Garden Plot",
    description: "Compact plot in an urban setting, perfect for gardening.",
    location: "City Center, TX",
    sizeSqft: 1000,
    amenities: ["Water Hookup", "Fenced"],
    pricePerMonth: 100,
    images: ["https://placehold.co/600x400.png?text=Urban+Garden"],
    landownerId: "user1_firebase_uid", 
    isAvailable: true,
    rating: 4.0,
    numberOfRatings: 2,
    leaseTerm: "long-term",
    minLeaseDurationMonths: 12,
  },
];
export const getListings = (): Listing[] => [...mockListings];
export const getListingById = (id: string): Listing | undefined => mockListings.find(l => l.id === id);

export const addListing = (
  data: Pick<Listing, 'title' | 'description' | 'location' | 'sizeSqft' | 'pricePerMonth' | 'amenities' | 'leaseTerm' | 'minLeaseDurationMonths'>,
  landownerId: string // Actual landownerId from auth
): Listing => {
  const newListingId = `listing-${Date.now()}`;
  const newListing: Listing = {
    ...data,
    id: newListingId,
    landownerId: landownerId, 
    isAvailable: true,
    images: [`https://placehold.co/800x600.png?text=${encodeURIComponent(data.title.substring(0,15))}`, "https://placehold.co/400x300.png?text=View+1", "https://placehold.co/400x300.png?text=View+2"],
    rating: undefined, 
    numberOfRatings: 0,
  };
  mockListings.push(newListing);
  return newListing;
};

export const deleteListing = (listingId: string): boolean => {
  const initialLength = mockListings.length;
  mockListings = mockListings.filter(listing => listing.id !== listingId);
  
  if (mockListings.length < initialLength) {
    mockBookings = mockBookings.filter(booking => booking.listingId !== listingId);
    mockReviews = mockReviews.filter(review => review.listingId !== listingId);
    return true;
  }
  return false;
};


// --- MOCK REVIEWS ---
let mockReviews: Review[] = [
 { id: "rev1", listingId: "1", userId: "user2_firebase_uid", rating: 5, comment: "Amazing spot! So peaceful and the host was very helpful.", createdAt: new Date("2023-10-15")},
 { id: "rev2", listingId: "1", userId: "user4_firebase_uid", rating: 4, comment: "Great location, amenities as described. A bit tricky to find initially.", createdAt: new Date("2023-09-20")},
 { id: "rev3", listingId: "2", userId: "user5_firebase_uid", rating: 4, comment: "Nice forest lot, very quiet.", createdAt: new Date("2023-11-01")},
];
export const getReviewsForListing = (listingId: string): Review[] => mockReviews.filter(r => r.listingId === listingId);


// --- MOCK BOOKINGS ---
let mockBookings: Booking[] = [
  { 
    id: 'b1', 
    listingId: '1', 
    renterId: 'user2_firebase_uid', 
    landownerId: 'user1_firebase_uid',
    status: 'Confirmed', 
    dateRange: { from: new Date("2024-07-15"), to: addDays(new Date("2024-07-15"), 29) },
  },
  { 
    id: 'b2', 
    listingId: '2', 
    renterId: 'user2_firebase_uid',
    landownerId: 'user3_firebase_uid',
    status: 'Pending Confirmation', 
    dateRange: { from: new Date("2024-09-01"), to: addDays(new Date("2024-09-01"), 29) },
  },
  { 
    id: 'b3', 
    listingId: 'l3', 
    renterId: 'user4_firebase_uid', 
    landownerId: 'user1_firebase_uid',
    status: 'Pending Confirmation', 
    dateRange: { from: new Date("2024-07-20"), to: addDays(new Date("2024-07-20"), 6) },
  },
  { 
    id: 'b4', 
    listingId: 'l4', 
    renterId: 'user5_firebase_uid', 
    landownerId: 'user1_firebase_uid',
    status: 'Confirmed', 
    dateRange: { from: new Date("2024-08-01"), to: addDays(new Date("2024-08-01"), 91) },
  },
];

export const getBookings = (): Booking[] => {
  return mockBookings.map(b => {
    const listing = getListingById(b.listingId);
    const renterUser = mockUsers.find(u => u.id === b.renterId); // Using mockUsers for names
    const landownerUser = mockUsers.find(u => u.id === b.landownerId);
    
    return {
      ...b,
      listingTitle: listing?.title || 'Unknown Listing',
      renterName: renterUser?.name || `Renter...${b.renterId.slice(-4)}`,
      landownerName: landownerUser?.name || `Landowner...${b.landownerId.slice(-4)}`,
    };
  });
};

export const addBookingRequest = (
  data: Omit<Booking, 'id' | 'status' | 'listingTitle' | 'landownerName' | 'renterName'>
): Booking => {
  const newBookingId = `b${mockBookings.length + 1 + Date.now()}`;
  const listing = getListingById(data.listingId);
  
  if (!listing) {
    throw new Error("Listing not found for booking request.");
  }

  const newBooking: Booking = {
    ...data,
    id: newBookingId,
    landownerId: listing.landownerId, 
    status: 'Pending Confirmation',
  };
  mockBookings.push(newBooking);
  
  const renterUser = mockUsers.find(u => u.id === data.renterId);
  const landownerUser = mockUsers.find(u => u.id === listing.landownerId);
  return { 
    ...newBooking,
    listingTitle: listing.title,
    renterName: renterUser?.name || `Renter...${data.renterId.slice(-4)}`,
    landownerName: landownerUser?.name || `Landowner...${listing.landownerId.slice(-4)}`,
  };
};

export const updateBookingStatus = (bookingId: string, status: Booking['status']): Booking | undefined => {
  const bookingIndex = mockBookings.findIndex(b => b.id === bookingId);
  if (bookingIndex !== -1) {
    mockBookings[bookingIndex].status = status;
    const updatedBooking = mockBookings[bookingIndex];
    const listing = getListingById(updatedBooking.listingId);
    const renterUser = mockUsers.find(u => u.id === updatedBooking.renterId);
    const landownerUser = mockUsers.find(u => u.id === updatedBooking.landownerId);
    return {
      ...updatedBooking,
      listingTitle: listing?.title || 'Unknown Listing',
      renterName: renterUser?.name || `Renter...${updatedBooking.renterId.slice(-4)}`,
      landownerName: landownerUser?.name || `Landowner...${updatedBooking.landownerId.slice(-4)}`,
    };
  }
  return undefined;
};
