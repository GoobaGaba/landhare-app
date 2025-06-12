
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Listing } from '@/lib/types';
import { getListings, mockDataVersion } from '@/lib/mock-data';
import { useAuth } from '@/contexts/auth-context';

interface ListingsDataState {
  allAvailableListings: Listing[]; // For search page (already filtered by isAvailable)
  myListings: Listing[];            // For my-listings page
  recentListings: Listing[];        // For homepage
  isLoading: boolean;
  error: string | null;
  refreshListings: () => void; // Function to manually trigger re-fetch
}

export function useListingsData(): ListingsDataState {
  const { currentUser } = useAuth();
  const [internalListings, setInternalListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Local version to ensure re-fetch when mockDataVersion changes
  const [currentMockDataVersion, setCurrentMockDataVersion] = useState(mockDataVersion);

  const fetchAndProcessListings = useCallback(async () => {
    console.log(`[useListingsData] Fetching. mockDataVersion from source: ${mockDataVersion}, hook's current: ${currentMockDataVersion}, currentUser: ${currentUser?.uid}`);
    setIsLoading(true);
    setError(null);
    try {
      // getListings() internally uses mockDataVersion if in mock mode.
      // This fetch function is the one place we get all listings.
      const fetchedListings = await getListings();
      setInternalListings(fetchedListings);
      console.log(`[useListingsData] Fetched ${fetchedListings.length} total listings internally.`);
    } catch (err: any) {
      console.error("[useListingsData] Error fetching listings:", err);
      setError(err.message || "Failed to load listings.");
      setInternalListings([]);
    } finally {
      setIsLoading(false);
    }
  }, []); // Removed mockDataVersion and currentMockDataVersion from here, will use effect below

  useEffect(() => {
    // This effect runs when mockDataVersion from the global scope changes
    if (mockDataVersion !== currentMockDataVersion) {
      console.log(`[useListingsData] mockDataVersion changed from ${currentMockDataVersion} to ${mockDataVersion}. Re-fetching.`);
      setCurrentMockDataVersion(mockDataVersion); // Update local version tracker
      fetchAndProcessListings();
    }
  }, [mockDataVersion, currentMockDataVersion, fetchAndProcessListings]);

  useEffect(() => {
    // Initial fetch
    console.log("[useListingsData] Initial fetch effect triggered.");
    fetchAndProcessListings();
  }, [fetchAndProcessListings]); // Only depends on the memoized fetch function itself for initial load

  const allAvailableListings = useMemo(() => {
    return internalListings.filter(l => l.isAvailable);
  }, [internalListings]);

  const myListings = useMemo(() => {
    return currentUser
      ? internalListings.filter(listing => listing.landownerId === currentUser.uid)
      : [];
  }, [internalListings, currentUser]);

  const recentListings = useMemo(() => {
    return [...allAvailableListings] // Use already filtered available listings
      .sort((a, b) => {
        const timeA = a.createdAt instanceof Date ? a.createdAt.getTime() : (a.createdAt as any)?.seconds * 1000 || 0;
        const timeB = b.createdAt instanceof Date ? b.createdAt.getTime() : (b.createdAt as any)?.seconds * 1000 || 0;
        return timeB - timeA;
      })
      .slice(0, 4);
  }, [allAvailableListings]);
  
  const refreshListings = useCallback(() => {
    console.log("[useListingsData] Manual refreshListings called.");
    fetchAndProcessListings();
  }, [fetchAndProcessListings]);

  return {
    allAvailableListings,
    myListings,
    recentListings,
    isLoading,
    error,
    refreshListings,
  };
}
