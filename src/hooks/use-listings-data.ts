
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Listing } from '@/lib/types';
import { getListings, getListingsByLandownerCount } from '@/lib/mock-data';
import { useAuth } from '@/contexts/auth-context';
import { firebaseInitializationError } from '@/lib/firebase';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ListingsDataState {
  allAvailableListings: Listing[];
  myListings: Listing[];
  recentListings: Listing[];
  isLoading: boolean;
  error: string | null;
  refreshListings: () => void;
}

// This hook now uses real-time listeners from Firestore to keep data fresh.
export function useListingsData(): ListingsDataState {
  const { currentUser } = useAuth();
  const [internalListings, setInternalListings] = useState<Listing[]>([]);
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStaticListings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedListings = await getListings(); 
      setInternalListings(fetchedListings);
    } catch (err: any) {
      console.error("[useListingsData] fetchStaticListings: Error fetching listings:", err);
      setError(err.message || "Failed to load listings.");
      setInternalListings([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Effect for all public listings
  useEffect(() => {
    if (firebaseInitializationError !== null) {
      // In prototype mode, we just show an empty list because mock data is no longer comprehensive.
      setInternalListings([]);
      setIsLoading(false);
      return;
    }

    // --- Firestore Real-time Listener for all listings ---
    const q = query(collection(db, "listings"), where("isAvailable", "==", true), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const listingsFromDb: Listing[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        listingsFromDb.push({ 
          ...data, 
          id: doc.id,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date()
        } as Listing);
      });
      setInternalListings(listingsFromDb);
      setIsLoading(false);
    }, (err) => {
      console.error("[useListingsData] Firestore listener error:", err);
      setError("Failed to listen for real-time listing updates.");
      setIsLoading(false);
    });

    return () => unsubscribe(); // Cleanup listener
  }, [fetchStaticListings]);

  // Effect for the current user's listings
  useEffect(() => {
    if (!currentUser || firebaseInitializationError !== null) {
      setMyListings([]);
      return;
    }

    // --- Firestore Real-time Listener for MY listings ---
    const q = query(collection(db, "listings"), where("landownerId", "==", currentUser.uid), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const userListings: Listing[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            userListings.push({ 
                ...data, 
                id: doc.id,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date()
            } as Listing);
        });
        setMyListings(userListings);
    }, (err) => {
        console.error("[useListingsData] MyListings listener error:", err);
        // Don't overwrite main error state if public listings loaded fine
    });

    return () => unsubscribe(); // Cleanup listener
  }, [currentUser]);


  const recentListings = useMemo(() => {
    return [...internalListings]
      .sort((a, b) => {
        const timeA = (a.createdAt instanceof Date ? a.createdAt : new Date(0)).getTime();
        const timeB = (b.createdAt instanceof Date ? b.createdAt : new Date(0)).getTime();
        return timeB - timeA;
      })
      .slice(0, 4);
  }, [internalListings]);
  
  const refreshListings = useCallback(() => {
    // This function is now less critical due to real-time listeners,
    // but can be kept for future manual refresh implementations.
    // No-op for now in live mode.
  }, []);

  return {
    allAvailableListings: internalListings,
    myListings,
    recentListings,
    isLoading,
    error,
    refreshListings,
  };
}
