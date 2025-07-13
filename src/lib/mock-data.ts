
// IMPORTANT: THIS FILE IS THE LIVE DATA ACCESS LAYER.
'use client';
import type { User, Listing, Booking, Review, SubscriptionStatus, PricingModel, Transaction, PlatformMetrics, BacktestPreset } from './types';
import type { User as FirebaseUser } from 'firebase/auth';
import { differenceInDays, differenceInCalendarMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { isPrototypeMode, db as firestoreDb } from './firebase';
import { 
    doc, getDoc, setDoc, updateDoc, collection, getDocs, addDoc, deleteDoc, writeBatch, query, where, orderBy, limit, serverTimestamp, Timestamp, increment, runTransaction
} from 'firebase/firestore';


/**
 * @fileOverview
 * This file serves as the primary data access layer for the application,
 * interacting directly with a live Firestore backend.
 */


// --- CONFIGURATION ---
export const FREE_TIER_LISTING_LIMIT = 2;
export const FREE_TIER_BOOKMARK_LIMIT = 5;
export const ADMIN_EMAILS = [
  'Gabrielleunda@gmail.com', // Admin User Email
];
const RENTER_FEE = 0.99; // Flat fee for non-premium renters
const TAX_RATE = 0.05; // 5%
const PREMIUM_SERVICE_FEE_RATE = 0.0049; // 0.49%
const STANDARD_SERVICE_FEE_RATE = 0.02; // 2%
const PREMIUM_SUBSCRIPTION_PRICE = 5.00;

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
        if (data[key] instanceof Timestamp) {
            data[key] = data[key].toDate();
        }
        if(key === 'dateRange' && data[key]?.from instanceof Timestamp) {
            data.dateRange.from = data.dateRange.from.toDate();
        }
        if(key === 'dateRange' && data[key]?.to instanceof Timestamp) {
            data.dateRange.to = data.dateRange.to.toDate();
        }
    }
    return { ...data, id: docSnap.id } as T;
}

// --- User Functions ---
export const getUserById = async (id: string): Promise<User | undefined> => {
    if (!firestoreDb) return undefined;
    const userRef = doc(firestoreDb, "users", id);
    const userSnap = await getDoc(userRef);
    return docToObj<User>(userSnap);
};

export const createUserProfile = async (firebaseUser: FirebaseUser): Promise<User> => {
    if (!firestoreDb) throw new Error("Database not available.");
    
    const userRef = doc(firestoreDb, "users", firebaseUser.uid);
    
    return runTransaction(firestoreDb, async (transaction) => {
        const existingUserSnap = await transaction.get(userRef);
        if (existingUserSnap.exists()) {
            console.warn(`Profile for ${firebaseUser.uid} already exists. Returning existing profile.`);
            return docToObj<User>(existingUserSnap);
        }

        const email = firebaseUser.email!;
        const name = firebaseUser.displayName || email.split('@')[0] || 'New User';
        const isAdmin = ADMIN_EMAILS.includes(email);
        const initialWalletBalance = isAdmin ? 10000 : 2500;
        
        const newUser: Omit<User, 'id' | 'createdAt'> = { 
            email: email, 
            name: name, 
            avatarUrl: firebaseUser.photoURL || `https://placehold.co/100x100.png?text=${name.charAt(0).toUpperCase()}`, 
            subscriptionStatus: isAdmin ? 'premium' : 'standard', 
            bio: "Welcome to my LandHare profile!", 
            bookmarkedListingIds: [], 
            walletBalance: initialWalletBalance, 
            isAdmin: isAdmin 
        };

        transaction.set(userRef, { ...newUser, createdAt: serverTimestamp() });

        const metricsRef = doc(firestoreDb!, 'admin_state', 'platform_metrics');
        const metricsSnap = await transaction.get(metricsRef);
        if (metricsSnap.exists()) {
            transaction.update(metricsRef, { totalUsers: increment(1) });
        } else {
            transaction.set(metricsRef, { totalUsers: 1, totalListings: 0, totalBookings: 0, totalRevenue: 0, totalServiceFees: 0, totalSubscriptionRevenue: 0 });
        }
        
        return { ...newUser, id: firebaseUser.uid, createdAt: new Date() };
    });
};

export const updateUserProfile = async (userId: string, data: Partial<User>): Promise<User | undefined> => {
    if (!firestoreDb) throw new Error("Database not available.");

    if (data.subscriptionStatus) {
        return runTransaction(firestoreDb, async (transaction) => {
            const userRef = doc(firestoreDb!, "users", userId);
            const userSnap = await transaction.get(userRef);
            if (!userSnap.exists()) throw new Error("User not found for subscription change.");

            const currentUserData = userSnap.data() as User;
            const newStatus = data.subscriptionStatus;
            
            if (currentUserData.subscriptionStatus === newStatus) return currentUserData;

            const metricsRef = doc(firestoreDb!, 'admin_state', 'platform_metrics');
            let transactionAmount = 0;
            let transactionType: 'Subscription' | 'Subscription Refund' = 'Subscription';

            if (newStatus === 'premium') {
                transactionAmount = -PREMIUM_SUBSCRIPTION_PRICE;
                transactionType = 'Subscription';
            } else {
                transactionAmount = PREMIUM_SUBSCRIPTION_PRICE;
                transactionType = 'Subscription Refund';
            }

            const newTxRef = doc(collection(firestoreDb!, 'transactions'));
            transaction.set(newTxRef, {
                userId, type: transactionType, status: 'Completed',
                amount: transactionAmount, currency: 'USD', date: serverTimestamp(),
                description: `${transactionType} - ${newStatus} tier`,
            });
            
            const finalData = { ...data, walletBalance: increment(transactionAmount) };
            transaction.update(userRef, finalData);

            transaction.update(metricsRef, {
                totalSubscriptionRevenue: increment(-transactionAmount) 
            });
            
            return { ...currentUserData, ...data, walletBalance: (currentUserData.walletBalance || 0) + transactionAmount };
        });
    } else {
        const userRef = doc(firestoreDb, "users", userId);
        await updateDoc(userRef, data);
        const updatedUserSnap = await getDoc(userRef);
        return docToObj<User>(updatedUserSnap);
    }
};


// --- Listing Functions ---
export const getListings = async (): Promise<Listing[]> => {
    if (!firestoreDb) return [];
    const q = query(collection(firestoreDb, "listings"), where("isAvailable", "==", true), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => docToObj<Listing>(doc));
};

export const getListingById = async (id: string): Promise<Listing | undefined> => {
    if (!firestoreDb) return undefined;
    const listingRef = doc(firestoreDb, "listings", id);
    const listingSnap = await getDoc(listingRef);
    return docToObj<Listing>(listingSnap);
};

export const addListing = async (data: Omit<Listing, 'id'>): Promise<Listing> => {
    if (!firestoreDb) throw new Error("Database not available.");
    const listingsCollection = collection(firestoreDb, "listings");
    const newDocRef = await addDoc(listingsCollection, { ...data, createdAt: serverTimestamp() });
    await runTransaction(firestoreDb, async (transaction) => {
        const metricsRef = doc(firestoreDb!, 'admin_state', 'platform_metrics');
        transaction.update(metricsRef, { totalListings: increment(1) });
    });
    return { ...data, id: newDocRef.id, createdAt: new Date() };
};

export const updateListing = async (listingId: string, data: Partial<Listing>): Promise<Listing | undefined> => {
    if (!firestoreDb) throw new Error("Database not available.");
    const listingRef = doc(firestoreDb, "listings", listingId);
    await updateDoc(listingRef, data);
    const updatedListingSnap = await getDoc(listingRef);
    return docToObj<Listing>(updatedListingSnap);
};

// --- Review Functions ---
export const getReviewsForListing = async (listingId: string): Promise<Review[]> => {
    if (!firestoreDb) return [];
    const q = query(collection(firestoreDb, "reviews"), where("listingId", "==", listingId), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => docToObj<Review>(doc));
};

// --- Booking Functions ---
export const getBookingsForUser = async (userId: string): Promise<Booking[]> => {
    if (!firestoreDb) return [];
    
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
    if (!firestoreDb) throw new Error("Database not available.");
    
    return runTransaction(firestoreDb, async (transaction) => {
        const listingRef = doc(firestoreDb!, "listings", data.listingId);
        const renterRef = doc(firestoreDb!, "users", data.renterId);

        const [listingSnap, renterSnap] = await Promise.all([transaction.get(listingRef), transaction.get(renterRef)]);
        if (!listingSnap.exists()) throw new Error("Listing not found.");
        if (!renterSnap.exists()) throw new Error("Renter not found.");

        const listing = listingSnap.data() as Listing;
        const renter = renterSnap.data() as User;
        
        const fromDate = (data.dateRange.from as Timestamp).toDate();
        const toDate = (data.dateRange.to as Timestamp).toDate();
        const totalPrice = _calculatePrice(listing, {from: fromDate, to: toDate}, renter.subscriptionStatus || 'standard');
        
        if ((renter.walletBalance || 0) < totalPrice) throw new Error("Insufficient wallet balance.");

        const newBookingRef = doc(collection(firestoreDb!, "bookings"));
        const newTxRef = doc(collection(firestoreDb!, 'transactions'));
        
        transaction.set(newTxRef, {
            userId: data.renterId, type: 'Booking Payment', status: 'Pending',
            amount: -totalPrice, currency: 'USD', date: serverTimestamp(),
            description: `Payment for "${listing.title}"`,
            relatedBookingId: newBookingRef.id, relatedListingId: data.listingId
        });

        transaction.update(renterRef, { walletBalance: increment(-totalPrice) });
        
        transaction.set(newBookingRef, {
            ...data,
            status: 'Pending Confirmation',
            createdAt: serverTimestamp(),
            totalPrice: totalPrice,
            monthlyRent: listing.pricingModel === 'monthly' || listing.pricingModel === 'lease-to-own' ? listing.price : undefined,
            paymentTransactionId: newTxRef.id
        });
        
        const metricsRef = doc(firestoreDb!, 'admin_state', 'platform_metrics');
        transaction.update(metricsRef, { totalBookings: increment(1) });
        
        return { ...data, id: newBookingRef.id } as Booking;
    });
};

export const updateBookingStatus = async (bookingId: string, newStatus: Booking['status']): Promise<Booking | undefined> => {
    if (!firestoreDb) throw new Error("Database not available.");

    return runTransaction(firestoreDb, async (transaction) => {
        const bookingRef = doc(firestoreDb!, 'bookings', bookingId);
        const bookingSnap = await transaction.get(bookingRef);
        if (!bookingSnap.exists()) throw new Error("Booking not found.");
        
        const booking = await populateBookingDetails(docToObj<Booking>(bookingSnap));
        const metricsRef = doc(firestoreDb!, 'admin_state', 'platform_metrics');

        if (newStatus === 'Confirmed' && booking.status === 'Pending Confirmation') {
            const landownerRef = doc(firestoreDb!, 'users', booking.landownerId);
            const landownerSnap = await transaction.get(landownerRef);
            if (!landownerSnap.exists()) throw new Error("Landowner not found.");

            const landowner = landownerSnap.data() as User;
            const serviceFeeRate = landowner.subscriptionStatus === 'premium' ? PREMIUM_SERVICE_FEE_RATE : STANDARD_SERVICE_FEE_RATE;
            const serviceFee = (booking.totalPrice || 0) * serviceFeeRate;
            const payoutAmount = (booking.totalPrice || 0) - serviceFee;

            if (booking.paymentTransactionId) {
                const paymentTxRef = doc(firestoreDb!, 'transactions', booking.paymentTransactionId);
                transaction.update(paymentTxRef, { status: 'Completed' });
            }
            
            const payoutTxRef = doc(collection(firestoreDb!, 'transactions'));
            transaction.set(payoutTxRef, {
                userId: booking.landownerId, type: 'Landowner Payout', status: 'Completed', amount: payoutAmount,
                currency: 'USD', date: serverTimestamp(), description: `Payout for "${booking.listingTitle || 'listing'}"`,
                relatedBookingId: booking.id, relatedListingId: booking.listingId
            });

            const feeTxRef = doc(collection(firestoreDb!, 'transactions'));
            transaction.set(feeTxRef, {
                userId: booking.landownerId, type: 'Service Fee', status: 'Completed', amount: -serviceFee,
                currency: 'USD', date: serverTimestamp(), description: `Service Fee for "${booking.listingTitle || 'listing'}"`,
                relatedBookingId: booking.id, relatedListingId: booking.listingId
            });

            transaction.update(landownerRef, { walletBalance: increment(payoutAmount) });
            transaction.update(metricsRef, { totalServiceFees: increment(serviceFee), totalRevenue: increment(serviceFee) });
        } 
        else if (newStatus === 'Declined' || newStatus === 'Cancelled by Renter' || newStatus === 'Refund Approved') {
            const renterRef = doc(firestoreDb!, 'users', booking.renterId);
            
            transaction.update(renterRef, { walletBalance: increment(booking.totalPrice || 0) });
            
            if (booking.paymentTransactionId) {
                const paymentTxRef = doc(firestoreDb!, 'transactions', booking.paymentTransactionId);
                transaction.update(paymentTxRef, { status: 'Reversed' });
            }
            
            const refundTxRef = doc(collection(firestoreDb!, 'transactions'));
            transaction.set(refundTxRef, {
                userId: booking.renterId, type: 'Booking Refund', status: 'Completed', amount: booking.totalPrice || 0,
                currency: 'USD', date: serverTimestamp(), description: `Refund for "${booking.listingTitle || 'listing'}"`,
                relatedBookingId: booking.id, relatedListingId: booking.listingId
            });
        }

        transaction.update(bookingRef, { status: newStatus });
        return { ...booking, status: newStatus };
    });
};


// --- Transaction Functions ---
export const getTransactionsForUser = async (userId: string): Promise<Transaction[]> => {
    if (!firestoreDb) return [];

    const q = query(collection(firestoreDb, 'transactions'), where('userId', '==', userId), orderBy('date', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(d => docToObj<Transaction>(d));
};


// --- Bookmark Functions ---
export const addBookmarkToList = async (userId: string, listingId: string): Promise<User | undefined> => {
    if (!firestoreDb) throw new Error("Database not available.");
    const userRef = doc(firestoreDb, "users", userId);
    
    return runTransaction(firestoreDb, async (transaction) => {
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) throw new Error("User not found.");
        
        const user = userSnap.data() as User;
        
        if (user.subscriptionStatus === 'standard' && (user.bookmarkedListingIds?.length || 0) >= FREE_TIER_BOOKMARK_LIMIT) {
            throw new Error(`Bookmark limit of ${FREE_TIER_BOOKMARK_LIMIT} reached.`);
        }
        const updatedBookmarks = [...new Set([...(user.bookmarkedListingIds || []), listingId])];
        transaction.update(userRef, { bookmarkedListingIds: updatedBookmarks });
        return { ...user, bookmarkedListingIds: updatedBookmarks };
    });
};

export const removeBookmarkFromList = async (userId: string, listingId: string): Promise<User | undefined> => {
    if (!firestoreDb) throw new Error("Database not available.");
    const userRef = doc(firestoreDb, "users", userId);
    
    return runTransaction(firestoreDb, async (transaction) => {
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) throw new Error("User not found.");

        const user = userSnap.data() as User;
        if (user.bookmarkedListingIds?.includes(listingId)) {
            const updatedBookmarks = (user.bookmarkedListingIds || []).filter(id => id !== listingId);
            transaction.update(userRef, { bookmarkedListingIds: updatedBookmarks });
            return { ...user, bookmarkedListingIds: updatedBookmarks };
        }
        return user;
    });
};

// --- Admin & Economic Cycle Functions ---
export const getPlatformMetrics = async (): Promise<PlatformMetrics> => {
    if (!firestoreDb) {
        return { id: 'platform_metrics', totalRevenue: 0, totalServiceFees: 0, totalSubscriptionRevenue: 0, totalUsers: 0, totalListings: 0, totalBookings: 0 };
    }
    const metricsRef = doc(firestoreDb, 'admin_state', 'platform_metrics');
    const metricsSnap = await getDoc(metricsRef);
    if (metricsSnap.exists()) {
        return docToObj<PlatformMetrics>(metricsSnap);
    }
    
    const initialMetrics: PlatformMetrics = { id: 'platform_metrics', totalRevenue: 0, totalServiceFees: 0, totalSubscriptionRevenue: 0, totalUsers: 0, totalListings: 0, totalBookings: 0 };
    await setDoc(metricsRef, initialMetrics);
    return initialMetrics;
};

export const processMonthlyEconomicCycle = async (): Promise<{ message: string, processedBookings: number }> => {
    if (!firestoreDb) {
        return { message: "Economic cycle cannot run without a database.", processedBookings: 0 };
    }

    const today = new Date();
    const q = query(
        collection(firestoreDb, 'bookings'), 
        where('status', '==', 'Confirmed'),
        where('monthlyRent', '>', 0)
    );

    const activeBookingsSnap = await getDocs(q);
    const activeBookings = activeBookingsSnap.docs.map(d => docToObj<Booking>(d)).filter(b => {
        const from = b.dateRange.from instanceof Date ? b.dateRange.from : (b.dateRange.from as any).toDate();
        const to = b.dateRange.to instanceof Date ? b.dateRange.to : (b.dateRange.to as any).toDate();
        return isWithinInterval(today, { start: from, end: to });
    });

    if (activeBookings.length === 0) {
        return { message: "No active monthly leases found to process.", processedBookings: 0 };
    }

    await runTransaction(firestoreDb, async (transaction) => {
        const metricsRef = doc(firestoreDb!, 'admin_state', 'platform_metrics');
        let totalServiceFeesThisCycle = 0;

        for (const booking of activeBookings) {
            const rent = booking.monthlyRent || 0;
            if (rent <= 0) continue;

            const renterRef = doc(firestoreDb!, 'users', booking.renterId);
            const landownerRef = doc(firestoreDb!, 'users', booking.landownerId);

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

            transaction.update(renterRef, { walletBalance: increment(-rent) });
            const rentTxRef = doc(collection(firestoreDb!, 'transactions'));
            transaction.set(rentTxRef, {
                userId: renter.id, type: 'Monthly Rent', status: 'Completed', amount: -rent, currency: 'USD',
                date: serverTimestamp(), description: `Monthly rent for "${booking.listingTitle}"`, relatedBookingId: booking.id
            });
            
            transaction.update(landownerRef, { walletBalance: increment(payoutAmount) });
            const payoutTxRef = doc(collection(firestoreDb!, 'transactions'));
            transaction.set(payoutTxRef, {
                userId: landowner.id, type: 'Landowner Payout', status: 'Completed', amount: payoutAmount, currency: 'USD',
                date: serverTimestamp(), description: `Monthly payout for "${booking.listingTitle}"`, relatedBookingId: booking.id
            });
            
            const feeTxRef = doc(collection(firestoreDb!, 'transactions'));
            transaction.set(feeTxRef, {
                userId: landowner.id, type: 'Service Fee', status: 'Completed', amount: -serviceFee, currency: 'USD',
                date: serverTimestamp(), description: `Service fee for "${booking.listingTitle}" rent`, relatedBookingId: booking.id
            });
        }

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
  if (!firestoreDb) throw new Error("Market insights unavailable without database.");
  // This can be expanded to do real aggregations in a production environment
  return {
    avgPricePerSqftMonthly: 0.08,
    avgPricePerSqftNightly: 0.03,
    amenityPopularity: [{name: 'Water Hookup', count: 8}, {name: 'Road Access', count: 7}],
    supplyByPricingModel: [{name: 'monthly' as PricingModel, value: 6, percent: '60%'}, {name: 'nightly' as PricingModel, value: 2, percent: '20%'}, {name: 'lease-to-own' as PricingModel, value: 2, percent: '20%'}],
    demandByPricingModel: [{name: 'monthly' as PricingModel, value: 10, percent: '71%'}, {name: 'nightly' as PricingModel, value: 4, percent: '29%'}],
  }
};

export const populateBookingDetails = async (booking: Booking): Promise<Booking> => {
    if (!firestoreDb) return booking;
    if (booking.listingTitle && booking.renterName && booking.landownerName) {
        return booking; // Already populated
    }
    const [listing, renter, landowner] = await Promise.all([
        getListingById(booking.listingId),
        getUserById(booking.renterId),
        getUserById(booking.landownerId)
    ]);
    return { ...booking, listingTitle: listing?.title, renterName: renter?.name, landownerName: landowner?.name };
};

export const getListingsByLandownerCount = async (landownerId: string): Promise<number> => {
    if (!firestoreDb) return 0;
    const q = query(collection(firestoreDb, 'listings'), where('landownerId', '==', landownerId));
    const snapshot = await getDocs(q);
    return snapshot.size;
};
    
// --- Admin State Functions (Checklist & Backtest Presets) ---
export const getAdminChecklistState = async (): Promise<Set<string>> => {
    if (!firestoreDb) return new Set();
    const docRef = doc(firestoreDb, 'admin_state', 'launchChecklist');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists() && docSnap.data().checkedItems) {
        return new Set(docSnap.data().checkedItems);
    }
    return new Set();
};

export const saveAdminChecklistState = async (checkedItems: Set<string>): Promise<void> => {
    if (!firestoreDb) return;
    const docRef = doc(firestoreDb, 'admin_state', 'launchChecklist');
    await setDoc(docRef, { checkedItems: Array.from(checkedItems) });
};

export const getBacktestPresets = async (): Promise<BacktestPreset[]> => {
    if (!firestoreDb) return [];
    const presetsCollection = collection(firestoreDb, "backtest_presets");
    const presetsSnap = await getDocs(query(presetsCollection, orderBy("name")));
    return presetsSnap.docs.map(d => docToObj<BacktestPreset>(d));
};

export const saveBacktestPreset = async (preset: Omit<BacktestPreset, 'id'>): Promise<BacktestPreset> => {
     if (!firestoreDb) throw new Error("Database not available.");
    const presetsCollection = collection(firestoreDb, "backtest_presets");
    const newDocRef = await addDoc(presetsCollection, { ...preset, createdAt: serverTimestamp() });
    return { ...preset, id: newDocRef.id, createdAt: new Date() }
};

export const updateBacktestPreset = async (presetId: string, data: Partial<Omit<BacktestPreset, 'id'>>): Promise<void> => {
    if (!firestoreDb) throw new Error("Database not available.");
    const presetRef = doc(firestoreDb, 'backtest_presets', presetId);
    await updateDoc(presetRef, data);
};

export const deleteBacktestPreset = async (presetId: string): Promise<void> => {
     if (!firestoreDb) return;
    const presetRef = doc(firestoreDb, 'backtest_presets', presetId);
    await deleteDoc(presetRef);
};
