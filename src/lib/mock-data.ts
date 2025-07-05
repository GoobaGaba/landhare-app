
// IMPORTANT: THIS FILE IS NO LONGER MOCK DATA. IT IS THE LIVE DATA ACCESS LAYER.
'use client';
import type { User, Listing, Booking, Review, SubscriptionStatus, PricingModel, Transaction, PlatformMetrics, BacktestPreset } from './types';
import { differenceInDays, differenceInCalendarMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { firebaseInitializationError, db as firestoreDb } from './firebase';
import { 
    doc, getDoc, setDoc, updateDoc, collection, getDocs, addDoc, deleteDoc, writeBatch, query, where, orderBy, limit, serverTimestamp, Timestamp, increment, runTransaction
} from 'firebase/firestore';


/**
 * @fileOverview
 * This file serves as the primary data access layer for the application.
 * It intelligently switches between a live Firestore backend and a mock in-memory database
 * based on whether Firebase is properly configured.
 */


// --- CONFIGURATION ---
export const FREE_TIER_LISTING_LIMIT = 2;
export const FREE_TIER_BOOKMARK_LIMIT = 5;
export const ADMIN_EMAILS = [
  'gabeleunda@gmail.com', // Admin User Email
];
const RENTER_FEE = 0.99; // Flat fee for non-premium renters
const TAX_RATE = 0.05; // 5%
const PREMIUM_SERVICE_FEE_RATE = 0.0049; // 0.49%
const STANDARD_SERVICE_FEE_RATE = 0.02; // 2%
const PREMIUM_SUBSCRIPTION_PRICE = 5.00;


// --- MOCK USER DEFINITIONS (only used if Firebase fails) ---
const MOCK_ADMIN_USER_FOR_UI_TESTING: User = { id: 'AdminGNL6965', name: 'Gabe Leunda (Admin)', email: 'gabeleunda@gmail.com', subscriptionStatus: 'premium', createdAt: new Date('2023-01-01T09:00:00Z'), bio: 'Overseeing the LandHare ecosystem.', bookmarkedListingIds: [], walletBalance: 10000 };
const MOCK_USER_FOR_UI_TESTING: User = { id: 'mock-user-uid-12345', name: 'Mock UI Tester', email: 'mocktester@example.com', subscriptionStatus: 'standard', createdAt: new Date('2023-01-01T10:00:00Z'), bio: 'I am a standard mock user for testing purposes.', bookmarkedListingIds: ['listing-1-sunny-meadow', 'listing-3-desert-oasis'], walletBalance: 2500 };


/**
 * Converts a Firestore document snapshot into a usable object,
 * handling Timestamps and ensuring the document ID is included.
 * @param docSnap The document snapshot from Firestore.
 * @returns The structured data object.
 */
function docToObj<T>(docSnap: any): T {
    if (!docSnap.exists()) {
        return undefined as any;
    }
    const data = docSnap.data();
    // Convert Firestore Timestamps to JS Dates
    for (const key in data) {
        if (data[key]?.toDate instanceof Function) {
            data[key] = data[key].toDate();
        }
        if(key === 'dateRange' && data[key]?.from?.toDate instanceof Function) {
            data.dateRange.from = data.dateRange.from.toDate();
        }
        if(key === 'dateRange' && data[key]?.to?.toDate instanceof Function) {
            data.dateRange.to = data.dateRange.to.toDate();
        }
    }
    return { ...data, id: docSnap.id } as T;
}

// --- User Functions ---
export const getUserById = async (id: string): Promise<User | undefined> => {
    if (firebaseInitializationError) {
        if (id === MOCK_ADMIN_USER_FOR_UI_TESTING.id) return MOCK_ADMIN_USER_FOR_UI_TESTING;
        if (id === MOCK_USER_FOR_UI_TESTING.id) return MOCK_USER_FOR_UI_TESTING;
        return undefined;
    }
    const userRef = doc(firestoreDb, "users", id);
    const userSnap = await getDoc(userRef);
    return docToObj<User>(userSnap);
};

export const createUserProfile = async (userId: string, email: string, name?: string | null, avatarUrl?: string | null): Promise<User> => {
    const isAdmin = ADMIN_EMAILS.includes(email);
    const initialWalletBalance = isAdmin ? 10000 : 2500;
     if (firebaseInitializationError) {
        const mockUser = isAdmin ? MOCK_ADMIN_USER_FOR_UI_TESTING : MOCK_USER_FOR_UI_TESTING;
        return {...mockUser, id: userId, email, name: name || mockUser.name };
    }
    
    const userRef = doc(firestoreDb, "users", userId);
    const existingUserSnap = await getDoc(userRef);
    if (existingUserSnap.exists()) {
        return docToObj<User>(existingUserSnap);
    }
    const newUser: Omit<User, 'id'> = { email: email, name: name || email.split('@')[0] || 'User', avatarUrl: avatarUrl || `https://placehold.co/100x100.png?text=${(name || email.split('@')[0] || 'U').charAt(0).toUpperCase()}`, subscriptionStatus: isAdmin ? 'premium' : 'standard', createdAt: serverTimestamp() as any, bio: "Welcome to LandHare!", bookmarkedListingIds: [], walletBalance: initialWalletBalance };
    await setDoc(userRef, newUser);
    return { ...newUser, id: userId, createdAt: new Date(), walletBalance: initialWalletBalance };
};

export const updateUserProfile = async (userId: string, data: Partial<User>): Promise<User | undefined> => {
    if (firebaseInitializationError) {
       console.warn("User profile update skipped in mock mode.");
       const user = ADMIN_EMAILS.includes(data.email || '') || userId === MOCK_ADMIN_USER_FOR_UI_TESTING.id ? MOCK_ADMIN_USER_FOR_UI_TESTING : MOCK_USER_FOR_UI_TESTING;
       Object.assign(user, data);
       return user;
    }

    // Live mode with subscription financial logic
    if (data.subscriptionStatus) {
        return runTransaction(firestoreDb, async (transaction) => {
            const userRef = doc(firestoreDb, "users", userId);
            const userSnap = await transaction.get(userRef);
            if (!userSnap.exists()) throw new Error("User not found for subscription change.");

            const currentUserData = userSnap.data() as User;
            const newStatus = data.subscriptionStatus;
            
            if (currentUserData.subscriptionStatus === newStatus) return currentUserData;

            const metricsRef = doc(firestoreDb, 'admin_state', 'platform_metrics');
            let transactionAmount = 0;
            let transactionType: 'Subscription' | 'Subscription Refund' = 'Subscription';

            if (newStatus === 'premium') {
                transactionAmount = -PREMIUM_SUBSCRIPTION_PRICE;
                transactionType = 'Subscription';
            } else { // Downgrading to standard
                transactionAmount = PREMIUM_SUBSCRIPTION_PRICE;
                transactionType = 'Subscription Refund';
            }

            // Create transaction record
            const newTxRef = doc(collection(firestoreDb, 'transactions'));
            transaction.set(newTxRef, {
                userId, type: transactionType, status: 'Completed',
                amount: transactionAmount, currency: 'USD', date: serverTimestamp(),
                description: `${transactionType} - ${newStatus} tier`,
            });
            
            // Update user wallet and subscription status
            const finalData = { ...data, walletBalance: increment(transactionAmount) };
            transaction.update(userRef, finalData);

            // Update platform metrics
            transaction.update(metricsRef, {
                totalSubscriptionRevenue: increment(-transactionAmount) // a refund is negative revenue
            });
            
            return { ...currentUserData, ...data, walletBalance: (currentUserData.walletBalance || 0) + transactionAmount };
        });
    } else {
        // Standard non-financial profile update
        const userRef = doc(firestoreDb, "users", userId);
        await updateDoc(userRef, data);
        const updatedUserSnap = await getDoc(userRef);
        return docToObj<User>(updatedUserSnap);
    }
};


// --- Listing Functions ---
export const getListings = async (): Promise<Listing[]> => {
    if (firebaseInitializationError) {
        console.warn("getListings called in mock mode. Returning empty array.");
        return [];
    }
    const q = query(collection(firestoreDb, "listings"), where("isAvailable", "==", true), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => docToObj<Listing>(doc));
};

export const getListingById = async (id: string): Promise<Listing | undefined> => {
     if (firebaseInitializationError) { return undefined; }
    const listingRef = doc(firestoreDb, "listings", id);
    const listingSnap = await getDoc(listingRef);
    return docToObj<Listing>(listingSnap);
};

export const addListing = async (data: Omit<Listing, 'id'>): Promise<Listing> => {
    if (firebaseInitializationError) { throw new Error("Cannot add listing in mock mode."); }
    const listingsCollection = collection(firestoreDb, "listings");
    const newDocRef = await addDoc(listingsCollection, { ...data, createdAt: serverTimestamp() });
    return { ...data, id: newDocRef.id, createdAt: new Date() };
};

export const updateListing = async (listingId: string, data: Partial<Listing>): Promise<Listing | undefined> => {
    if (firebaseInitializationError) { throw new Error("Cannot update listing in mock mode."); }
    const listingRef = doc(firestoreDb, "listings", listingId);
    await updateDoc(listingRef, data);
    const updatedListingSnap = await getDoc(listingRef);
    return docToObj<Listing>(updatedListingSnap);
};

// --- Review Functions ---
export const getReviewsForListing = async (listingId: string): Promise<Review[]> => {
    if (firebaseInitializationError) { return []; }
    const q = query(collection(firestoreDb, "reviews"), where("listingId", "==", listingId), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => docToObj<Review>(doc));
};

// --- Booking Functions ---
export const getBookingsForUser = async (userId: string): Promise<Booking[]> => {
    if (firebaseInitializationError) { return []; }
    
    const renterQuery = query(collection(firestoreDb, "bookings"), where("renterId", "==", userId));
    const landownerQuery = query(collection(firestoreDb, "bookings"), where("landownerId", "==", userId));

    const [renterBookingsSnap, landownerBookingsSnap] = await Promise.all([ getDocs(renterQuery), getDocs(landownerQuery) ]);
    const bookingsMap = new Map<string, Booking>();
    renterBookingsSnap.docs.forEach(doc => bookingsMap.set(doc.id, docToObj<Booking>(doc)));
    landownerBookingsSnap.docs.forEach(doc => bookingsMap.set(doc.id, docToObj<Booking>(doc)));
    
    const allUserBookings = Array.from(bookingsMap.values());
    const populatedBookings = await Promise.all(allUserBookings.map(b => populateBookingDetails(b)));

    return populatedBookings.sort((a,b) => (b.createdAt as Date).getTime() - (a.createdAt as Date).getTime());
};

const _calculatePrice = (listing: Listing, dateRange: { from: Date, to: Date }, renterSubscription: SubscriptionStatus): number => {
  let baseRate = 0;
  if (listing.pricingModel === 'nightly') {
      const days = differenceInDays(dateRange.to, dateRange.from) + 1;
      baseRate = (listing.price || 0) * (days > 0 ? days : 1);
  } else { // monthly or LTO
      const fullMonths = differenceInCalendarMonths(endOfMonth(dateRange.to), startOfMonth(dateRange.from)) + 1;
      baseRate = listing.price * (fullMonths > 0 ? fullMonths : 1);
  }
  const renterFee = (listing.pricingModel !== 'lease-to-own' && renterSubscription !== 'premium') ? RENTER_FEE : 0;
  const subtotal = baseRate + renterFee;
  const estimatedTax = subtotal * TAX_RATE;
  return subtotal + estimatedTax;
};

export const addBookingRequest = async (data: Omit<Booking, 'id' | 'status' | 'createdAt' | 'listingTitle' | 'renterName' | 'landownerName'>): Promise<Booking> => {
    if (firebaseInitializationError) { throw new Error("Cannot add booking in mock mode."); }
    
    return runTransaction(firestoreDb, async (transaction) => {
        const listingRef = doc(firestoreDb, "listings", data.listingId);
        const renterRef = doc(firestoreDb, "users", data.renterId);

        const [listingSnap, renterSnap] = await Promise.all([transaction.get(listingRef), transaction.get(renterRef)]);
        if (!listingSnap.exists()) throw new Error("Listing not found.");
        if (!renterSnap.exists()) throw new Error("Renter not found.");

        const listing = listingSnap.data() as Listing;
        const renter = renterSnap.data() as User;
        
        const fromDate = (data.dateRange.from as Timestamp).toDate();
        const toDate = (data.dateRange.to as Timestamp).toDate();
        const totalPrice = _calculatePrice(listing, {from: fromDate, to: toDate}, renter.subscriptionStatus || 'standard');
        
        if ((renter.walletBalance || 0) < totalPrice) throw new Error("Insufficient wallet balance.");

        const newBookingRef = doc(collection(firestoreDb, "bookings"));
        const newTxRef = doc(collection(firestoreDb, 'transactions'));
        
        // 1. Create Pending Payment Transaction for Renter
        transaction.set(newTxRef, {
            userId: data.renterId, type: 'Booking Payment', status: 'Pending',
            amount: -totalPrice, currency: 'USD', date: serverTimestamp(),
            description: `Payment for "${listing.title}"`,
            relatedBookingId: newBookingRef.id, relatedListingId: data.listingId
        });

        // 2. Debit Renter's Wallet
        transaction.update(renterRef, { walletBalance: increment(-totalPrice) });
        
        // 3. Create Booking Document
        transaction.set(newBookingRef, {
            ...data,
            status: 'Pending Confirmation',
            createdAt: serverTimestamp(),
            totalPrice: totalPrice,
            monthlyRent: listing.pricingModel === 'monthly' || listing.pricingModel === 'lease-to-own' ? listing.price : undefined,
            paymentTransactionId: newTxRef.id
        });
        
        return { ...data, id: newBookingRef.id } as Booking;
    });
};

export const updateBookingStatus = async (bookingId: string, newStatus: Booking['status']): Promise<Booking | undefined> => {
    if (firebaseInitializationError) { throw new Error("Cannot update booking status in mock mode."); }

    return runTransaction(firestoreDb, async (transaction) => {
        const bookingRef = doc(firestoreDb, 'bookings', bookingId);
        const bookingSnap = await transaction.get(bookingRef);
        if (!bookingSnap.exists()) throw new Error("Booking not found.");
        
        const booking = docToObj<Booking>(bookingSnap);
        const metricsRef = doc(firestoreDb, 'admin_state', 'platform_metrics');

        if (newStatus === 'Confirmed' && booking.status === 'Pending Confirmation') {
            const landownerRef = doc(firestoreDb, 'users', booking.landownerId);
            const landownerSnap = await transaction.get(landownerRef);
            if (!landownerSnap.exists()) throw new Error("Landowner not found.");

            const landowner = landownerSnap.data() as User;
            const serviceFeeRate = landowner.subscriptionStatus === 'premium' ? PREMIUM_SERVICE_FEE_RATE : STANDARD_SERVICE_FEE_RATE;
            const serviceFee = (booking.totalPrice || 0) * serviceFeeRate;
            const payoutAmount = (booking.totalPrice || 0) - serviceFee;

            // Mark original payment as completed
            if (booking.paymentTransactionId) {
                const paymentTxRef = doc(firestoreDb, 'transactions', booking.paymentTransactionId);
                transaction.update(paymentTxRef, { status: 'Completed' });
            }
            
            // Create payout and fee transactions
            const payoutTxRef = doc(collection(firestoreDb, 'transactions'));
            transaction.set(payoutTxRef, {
                userId: booking.landownerId, type: 'Landowner Payout', status: 'Completed', amount: payoutAmount,
                currency: 'USD', date: serverTimestamp(), description: `Payout for "${booking.listingTitle || 'listing'}"`,
                relatedBookingId: booking.id, relatedListingId: booking.listingId
            });

            const feeTxRef = doc(collection(firestoreDb, 'transactions'));
            transaction.set(feeTxRef, {
                userId: booking.landownerId, type: 'Service Fee', status: 'Completed', amount: -serviceFee,
                currency: 'USD', date: serverTimestamp(), description: `Service Fee for "${booking.listingTitle || 'listing'}"`,
                relatedBookingId: booking.id, relatedListingId: booking.listingId
            });

            // Update landowner wallet and metrics
            transaction.update(landownerRef, { walletBalance: increment(payoutAmount) });
            transaction.update(metricsRef, { totalServiceFees: increment(serviceFee), totalRevenue: increment(serviceFee), totalBookings: increment(1) });
        } 
        else if (newStatus === 'Declined' || newStatus === 'Cancelled by Renter' || newStatus === 'Refund Approved') {
            const renterRef = doc(firestoreDb, 'users', booking.renterId);
            
            // Refund renter
            transaction.update(renterRef, { walletBalance: increment(booking.totalPrice || 0) });
            
            // Mark original payment as reversed
            if (booking.paymentTransactionId) {
                const paymentTxRef = doc(firestoreDb, 'transactions', booking.paymentTransactionId);
                transaction.update(paymentTxRef, { status: 'Reversed' });
            }
            
            // Create refund transaction record
            const refundTxRef = doc(collection(firestoreDb, 'transactions'));
            transaction.set(refundTxRef, {
                userId: booking.renterId, type: 'Booking Refund', status: 'Completed', amount: booking.totalPrice || 0,
                currency: 'USD', date: serverTimestamp(), description: `Refund for "${booking.listingTitle || 'listing'}"`,
                relatedBookingId: booking.id, relatedListingId: booking.listingId
            });
        }

        // Finally, update the booking status itself
        transaction.update(bookingRef, { status: newStatus });
        return { ...booking, status: newStatus };
    });
};


// --- Transaction Functions ---
export const getTransactionsForUser = async (userId: string): Promise<Transaction[]> => {
    if (firebaseInitializationError) { return []; }

    const q = query(collection(firestoreDb, 'transactions'), where('userId', '==', userId), orderBy('date', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(d => docToObj<Transaction>(d));
};


// --- Bookmark Functions ---
export const addBookmarkToList = async (userId: string, listingId: string): Promise<User | undefined> => {
    if (firebaseInitializationError) { throw new Error("Cannot add bookmark in mock mode."); }
    const userRef = doc(firestoreDb, "users", userId);
    const user = await getUserById(userId);
    if (user) {
        if (user.subscriptionStatus === 'standard' && (user.bookmarkedListingIds?.length || 0) >= FREE_TIER_BOOKMARK_LIMIT) {
            throw new Error(`Bookmark limit of ${FREE_TIER_BOOKMARK_LIMIT} reached.`);
        }
        const updatedBookmarks = [...(user.bookmarkedListingIds || []), listingId];
        await updateDoc(userRef, { bookmarkedListingIds: updatedBookmarks });
        return { ...user, bookmarkedListingIds: updatedBookmarks };
    }
    return undefined;
};

export const removeBookmarkFromList = async (userId: string, listingId: string): Promise<User | undefined> => {
    if (firebaseInitializationError) { throw new Error("Cannot remove bookmark in mock mode."); }
    const userRef = doc(firestoreDb, "users", userId);
    const user = await getUserById(userId);
    if (user && user.bookmarkedListingIds?.includes(listingId)) {
        const updatedBookmarks = (user.bookmarkedListingIds || []).filter(id => id !== listingId);
        await updateDoc(userRef, { bookmarkedListingIds: updatedBookmarks });
        return { ...user, bookmarkedListingIds: updatedBookmarks };
    }
    return user;
};

// --- Admin & Economic Cycle Functions ---
export const getPlatformMetrics = async (): Promise<PlatformMetrics> => {
    if (firebaseInitializationError) {
        // This is a fallback for UI testing and should not be relied upon for mock logic
        return { id: 'platform_metrics', totalRevenue: 0, totalServiceFees: 0, totalSubscriptionRevenue: 0, totalUsers: 0, totalListings: 0, totalBookings: 0 };
    }
    const metricsRef = doc(firestoreDb, 'admin_state', 'platform_metrics');
    const metricsSnap = await getDoc(metricsRef);
    if (metricsSnap.exists()) {
        return docToObj<PlatformMetrics>(metricsSnap);
    }
    
    // Initialize if doesn't exist
    const initialMetrics: PlatformMetrics = { id: 'platform_metrics', totalRevenue: 0, totalServiceFees: 0, totalSubscriptionRevenue: 0, totalUsers: 0, totalListings: 0, totalBookings: 0 };
    await setDoc(metricsRef, initialMetrics);
    return initialMetrics;
};

export const processMonthlyEconomicCycle = async (): Promise<{ message: string, processedBookings: number }> => {
    if (firebaseInitializationError) {
        return { message: "Economic cycle cannot run in mock mode.", processedBookings: 0 };
    }

    const today = new Date();
    // Find all 'Confirmed' monthly or LTO bookings that are currently active
    const q = query(
        collection(firestoreDb, 'bookings'), 
        where('status', '==', 'Confirmed'),
        where('monthlyRent', '>', 0)
    );

    const activeBookingsSnap = await getDocs(q);
    const activeBookings = activeBookingsSnap.docs.map(d => docToObj<Booking>(d)).filter(b => {
        const from = (b.dateRange.from as Timestamp).toDate();
        const to = (b.dateRange.to as Timestamp).toDate();
        return isWithinInterval(today, { start: from, end: to });
    });

    if (activeBookings.length === 0) {
        return { message: "No active monthly leases found to process.", processedBookings: 0 };
    }

    // Use a single transaction for all updates to ensure atomicity
    await runTransaction(firestoreDb, async (transaction) => {
        const metricsRef = doc(firestoreDb, 'admin_state', 'platform_metrics');
        let totalServiceFeesThisCycle = 0;

        for (const booking of activeBookings) {
            const rent = booking.monthlyRent || 0;
            if (rent <= 0) continue;

            const renterRef = doc(firestoreDb, 'users', booking.renterId);
            const landownerRef = doc(firestoreDb, 'users', booking.landownerId);

            const [renterSnap, landownerSnap] = await Promise.all([
                transaction.get(renterRef),
                transaction.get(landownerRef),
            ]);
            
            if (!renterSnap.exists() || !landownerSnap.exists()) {
                console.warn(`Skipping booking ${booking.id} due to missing user.`);
                continue;
            }

            const renter = renterSnap.data() as User;
            const landowner = landownerSnap.data() as User;

            if ((renter.walletBalance || 0) < rent) {
                console.warn(`Skipping booking ${booking.id}: Renter ${renter.name} has insufficient funds.`);
                continue;
            }
            
            const serviceFeeRate = landowner.subscriptionStatus === 'premium' ? PREMIUM_SERVICE_FEE_RATE : STANDARD_SERVICE_FEE_RATE;
            const serviceFee = rent * serviceFeeRate;
            const payoutAmount = rent - serviceFee;
            totalServiceFeesThisCycle += serviceFee;

            // 1. Debit Renter
            transaction.update(renterRef, { walletBalance: increment(-rent) });
            const rentTxRef = doc(collection(firestoreDb, 'transactions'));
            transaction.set(rentTxRef, {
                userId: renter.id, type: 'Monthly Rent', status: 'Completed', amount: -rent, currency: 'USD',
                date: serverTimestamp(), description: `Monthly rent for "${booking.listingTitle}"`, relatedBookingId: booking.id
            });
            
            // 2. Credit Landowner
            transaction.update(landownerRef, { walletBalance: increment(payoutAmount) });
            const payoutTxRef = doc(collection(firestoreDb, 'transactions'));
            transaction.set(payoutTxRef, {
                userId: landowner.id, type: 'Landowner Payout', status: 'Completed', amount: payoutAmount, currency: 'USD',
                date: serverTimestamp(), description: `Monthly payout for "${booking.listingTitle}"`, relatedBookingId: booking.id
            });
            
            // 3. Log Service Fee
            const feeTxRef = doc(collection(firestoreDb, 'transactions'));
            transaction.set(feeTxRef, {
                userId: landowner.id, type: 'Service Fee', status: 'Completed', amount: -serviceFee, currency: 'USD',
                date: serverTimestamp(), description: `Service fee for "${booking.listingTitle}" rent`, relatedBookingId: booking.id
            });
        }

        // 4. Update Global Metrics
        transaction.update(metricsRef, {
            totalServiceFees: increment(totalServiceFeesThisCycle),
            totalRevenue: increment(totalServiceFeesThisCycle),
        });
    });

    return {
        message: `Processed ${activeBookings.length} monthly lease payments.`,
        processedBookings: activeBookings.length,
    };
};


export const getMarketInsights = async () => {
  // This will be migrated to use real data in Phase 2.
  return {
    avgPricePerSqftMonthly: 0.08,
    avgPricePerSqftNightly: 0.03,
    amenityPopularity: [{name: 'Water Hookup', count: 8}, {name: 'Road Access', count: 7}],
    supplyByPricingModel: [{name: 'monthly' as PricingModel, value: 6, percent: '60%'}, {name: 'nightly' as PricingModel, value: 2, percent: '20%'}, {name: 'lease-to-own' as PricingModel, value: 2, percent: '20%'}],
    demandByPricingModel: [{name: 'monthly' as PricingModel, value: 10, percent: '71%'}, {name: 'nightly' as PricingModel, value: 4, percent: '29%'}],
  }
};

export const populateBookingDetails = async (booking: Booking): Promise<Booking> => {
    // This helper function enriches a booking object with names, which is useful for the UI.
    const [listing, renter, landowner] = await Promise.all([
        getListingById(booking.listingId),
        getUserById(booking.renterId),
        getUserById(booking.landownerId)
    ]);
    return { ...booking, listingTitle: listing?.title, renterName: renter?.name, landownerName: landowner?.name };
};

export const getListingsByLandownerCount = async (landownerId: string): Promise<number> => {
    if (firebaseInitializationError) { return 0; }
    const q = query(collection(firestoreDb, 'listings'), where('landownerId', '==', landownerId));
    const snapshot = await getDocs(q);
    return snapshot.size;
};
    
export { MOCK_USER_FOR_UI_TESTING, MOCK_ADMIN_USER_FOR_UI_TESTING };

// --- Admin State Functions (Checklist & Backtest Presets) ---
export const getAdminChecklistState = async (): Promise<Set<string>> => {
    if (firebaseInitializationError) { return new Set(); }
    const docRef = doc(firestoreDb, 'admin_state', 'launchChecklist');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists() && docSnap.data().checkedItems) {
        return new Set(docSnap.data().checkedItems);
    }
    return new Set();
};

export const saveAdminChecklistState = async (checkedItems: Set<string>): Promise<void> => {
    if (firebaseInitializationError) { return; }
    const docRef = doc(firestoreDb, 'admin_state', 'launchChecklist');
    await setDoc(docRef, { checkedItems: Array.from(checkedItems) });
};

export const getBacktestPresets = async (): Promise<BacktestPreset[]> => {
    if (firebaseInitializationError) { return []; }
    const presetsCollection = collection(firestoreDb, "backtest_presets");
    const presetsSnap = await getDocs(query(presetsCollection, orderBy("name")));
    return presetsSnap.docs.map(d => docToObj<BacktestPreset>(d));
};

export const saveBacktestPreset = async (preset: Omit<BacktestPreset, 'id'>): Promise<BacktestPreset> => {
     if (firebaseInitializationError) { throw new Error("Cannot save preset in mock mode."); }
    const presetsCollection = collection(firestoreDb, "backtest_presets");
    const newDocRef = await addDoc(presetsCollection, { ...preset, createdAt: serverTimestamp() });
    return { ...preset, id: newDocRef.id, createdAt: new Date() }
};

export const updateBacktestPreset = async (presetId: string, data: Partial<Omit<BacktestPreset, 'id'>>): Promise<void> => {
    if (firebaseInitializationError) { throw new Error("Cannot update preset in mock mode."); }
    const presetRef = doc(firestoreDb, 'backtest_presets', presetId);
    await updateDoc(presetRef, data);
};

export const deleteBacktestPreset = async (presetId: string): Promise<void> => {
     if (firebaseInitializationError) { return; }
    const presetRef = doc(firestoreDb, 'backtest_presets', presetId);
    await deleteDoc(presetRef);
};
