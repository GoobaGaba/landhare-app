
import type { User, Listing, Booking, Review } from './types';
import { addDays, format } from 'date-fns';

// --- MOCK USERS ---
let mockUsers: User[] = [
  { id: "user1", name: "Sarah Miller", email: "sarah@example.com", avatarUrl: "https://placehold.co/100x100.png?text=SM", userType: "landowner" },
  { id: "user2", name: "John Renter", email: "john@example.com", avatarUrl: "https://placehold.co/100x100.png?text=JR", userType: "renter" },
  { id: "user3", name: "Alex Landowner", email: "alex@example.com", avatarUrl: "https://placehold.co/100x100.png?text=AL", userType: "landowner" },
  { id: "user4", name: "Maria Guest", email: "maria@example.com", avatarUrl: "https://placehold.co/100x100.png?text=MG", userType: "renter" },
  { id: "user5", name: "Sam Camper", email: "sam@example.com", avatarUrl: "https://placehold.co/100x100.png?text=SC", userType: "renter" },
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
    landownerId: "user1", // Sarah Miller
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
    landownerId: "user3", // Alex Landowner
    isAvailable: true,
    rating: 4.2,
    numberOfRatings: 8,
    leaseTerm: "short-term",
    minLeaseDurationMonths: 1,
  },
  {
    id: "l3", // Landowner's own listing
    title: "My Lakeside Camping Spot",
    description: "My special spot by the lake.",
    location: "My Lake, CO",
    sizeSqft: 3000,
    amenities: ["Lake Access", "Fire Pit"],
    pricePerMonth: 150,
    images: ["https://placehold.co/600x400.png?text=My+Lake+Spot"],
    landownerId: "user1", // Sarah Miller
    isAvailable: true,
    rating: 4.8,
    numberOfRatings: 5,
    leaseTerm: "flexible",
  },
   {
    id: "l4", // Landowner's other listing
    title: "My Urban Garden Plot",
    description: "Compact plot in an urban setting, perfect for gardening.",
    location: "City Center, TX",
    sizeSqft: 1000,
    amenities: ["Water Hookup", "Fenced"],
    pricePerMonth: 100,
    images: ["https://placehold.co/600x400.png?text=Urban+Garden"],
    landownerId: "user1", // Sarah Miller
    isAvailable: true,
    rating: 4.0,
    numberOfRatings: 2,
    leaseTerm: "long-term",
  },
];
export const getListings = (): Listing[] => [...mockListings];
export const getListingById = (id: string): Listing | undefined => mockListings.find(l => l.id === id);

// --- MOCK REVIEWS ---
let mockReviews: Review[] = [
 { id: "rev1", listingId: "1", userId: "user2", rating: 5, comment: "Amazing spot! So peaceful and the host was very helpful.", createdAt: new Date("2023-10-15")},
 { id: "rev2", listingId: "1", userId: "user4", rating: 4, comment: "Great location, amenities as described. A bit tricky to find initially.", createdAt: new Date("2023-09-20")},
 { id: "rev3", listingId: "2", userId: "user5", rating: 4, comment: "Nice forest lot, very quiet.", createdAt: new Date("2023-11-01")},
];
export const getReviewsForListing = (listingId: string): Review[] => mockReviews.filter(r => r.listingId === listingId);


// --- MOCK BOOKINGS ---
let mockBookings: Booking[] = [
  // Bookings as Renter (current user is 'user2' for this example)
  { 
    id: 'b1', 
    listingId: '1', // Sunny Meadow Plot
    renterId: 'user2', 
    landownerId: 'user1',
    status: 'Confirmed', 
    dateRange: { from: new Date("2024-07-15"), to: addDays(new Date("2024-07-15"), 29) },
  },
  { 
    id: 'b2', 
    listingId: '2', // Forest Retreat Lot
    renterId: 'user2',
    landownerId: 'user3',
    status: 'Pending Confirmation', 
    dateRange: { from: new Date("2024-09-01"), to: addDays(new Date("2024-09-01"), 29) },
  },
  // Bookings as Landowner (current user is 'user1' for this example)
  { 
    id: 'b3', 
    listingId: 'l3', // My Lakeside Camping Spot
    renterId: 'user4', // Alex P.
    landownerId: 'user1',
    status: 'Pending Confirmation', 
    dateRange: { from: new Date("2024-07-20"), to: addDays(new Date("2024-07-20"), 6) },
  },
  { 
    id: 'b4', 
    listingId: 'l4', // My Urban Garden Plot
    renterId: 'user5', // Maria G.
    landownerId: 'user1',
    status: 'Confirmed', 
    dateRange: { from: new Date("2024-08-01"), to: addDays(new Date("2024-08-01"), 91) },
  },
];

export const getBookings = (): Booking[] => {
  // Populate denormalized fields
  return mockBookings.map(b => {
    const listing = getListingById(b.listingId);
    const renter = getUserById(b.renterId);
    const landowner = getUserById(b.landownerId);
    return {
      ...b,
      listingTitle: listing?.title || 'Unknown Listing',
      renterName: renter?.name || 'Unknown Renter',
      landownerName: landowner?.name || 'Unknown Landowner',
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
  if (listing.landownerId !== data.landownerId) {
     console.warn("Landowner ID mismatch in addBookingRequest. Using listing's landownerId.");
  }

  const newBooking: Booking = {
    ...data,
    id: newBookingId,
    landownerId: listing.landownerId, // Ensure correct landowner ID from listing
    status: 'Pending Confirmation',
  };
  mockBookings.push(newBooking);
  console.log("Mock DB: Booking request added", newBooking);
  return { // Return with denormalized fields
    ...newBooking,
    listingTitle: listing.title,
    renterName: getUserById(data.renterId)?.name || 'Unknown Renter',
    landownerName: getUserById(listing.landownerId)?.name || 'Unknown Landowner',
  };
};

export const updateBookingStatus = (bookingId: string, status: Booking['status']): Booking | undefined => {
  const bookingIndex = mockBookings.findIndex(b => b.id === bookingId);
  if (bookingIndex !== -1) {
    mockBookings[bookingIndex].status = status;
    console.log("Mock DB: Booking status updated", mockBookings[bookingIndex]);
    const updatedBooking = mockBookings[bookingIndex];
    // Populate denormalized fields for the return
    const listing = getListingById(updatedBooking.listingId);
    const renter = getUserById(updatedBooking.renterId);
    const landowner = getUserById(updatedBooking.landownerId);
    return {
      ...updatedBooking,
      listingTitle: listing?.title || 'Unknown Listing',
      renterName: renter?.name || 'Unknown Renter',
      landownerName: landowner?.name || 'Unknown Landowner',
    };
  }
  console.warn("Mock DB: Booking not found for status update", bookingId);
  return undefined;
};
