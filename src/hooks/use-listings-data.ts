
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Listing } from '@/lib/types';
import { getListings, mockDataVersion } from '@/lib/mock-data';
import { useAuth } from '@/contexts/auth-context';

interface ListingsDataState {
  allAvailableListings: Listing[];
  myListings: Listing[];
  recentListings: Listing[];
  isLoading: boolean;
  error: string | null;
  refreshListings: () => void;
}

export function useListingsData(): ListingsDataState {
  const { currentUser } = useAuth();
  const [internalListings, setInternalListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAndProcessListings = useCallback(async () => {
    // console.log(`[useListingsData] fetchAndProcessListings: Triggered. Global mockDataVersion: ${mockDataVersion}`);
    setIsLoading(true);
    setError(null);
    try {
      const fetchedListings = await getListings(); 
      setInternalListings(fetchedListings);
      // console.log(`[useListingsData] fetchAndProcessListings: Fetched ${fetchedListings.length} total listings internally.`);
    } catch (err: any) {
      console.error("[useListingsData] fetchAndProcessListings: Error fetching listings:", err);
      setError(err.message || "Failed to load listings.");
      setInternalListings([]);
    } finally {
      setIsLoading(false);
    }
  }, []); 

  useEffect(() => {
    // console.log(`[useListingsData] Main data fetching effect triggered. Global mockDataVersion: ${mockDataVersion}`);
    fetchAndProcessListings();
  }, [mockDataVersion, fetchAndProcessListings]); 

  const allAvailableListings = useMemo(() => {
    // console.log('[useListingsData] Calculating allAvailableListings. Internal listings count:', internalListings.length);
    const available = internalListings.filter(l => l.isAvailable);
    // console.log('[useListingsData] allAvailableListings calculated. Count:', available.length);
    return available;
  }, [internalListings]);

  const myListings = useMemo(() => {
    // console.log(`[useListingsData] Calculating myListings. currentUser.uid: ${currentUser?.uid}, Internal listings count: ${internalListings.length}`);
    // if (currentUser?.uid && internalListings.length > 0) {
      // console.log('[useListingsData] internalListings sample (first 5 for myListings filter):', internalListings.slice(0,5).map(l => ({id: l.id, title: l.title, owner: l.landownerId})));
    // }
    const filtered = currentUser
      ? internalListings.filter(listing => listing.landownerId === currentUser.uid)
      : [];
    // console.log(`[useListingsData] myListings calculated for UID ${currentUser?.uid}. Filtered count: ${filtered.length}, Titles: ${filtered.map(l => l.title).join(', ') || 'None'}`);
    return filtered;
  }, [internalListings, currentUser?.uid]); 

  const recentListings = useMemo(() => {
    // console.log('[useListingsData] Calculating recentListings. allAvailableListings count:', allAvailableListings.length);
    const recent = [...allAvailableListings]
      .sort((a, b) => {
        const timeA = a.createdAt instanceof Date ? a.createdAt.getTime() : (a.createdAt as any)?.seconds * 1000 || 0;
        const timeB = b.createdAt instanceof Date ? b.createdAt.getTime() : (b.createdAt as any)?.seconds * 1000 || 0;
        return timeB - timeA;
      })
      .slice(0, 4);
    // console.log('[useListingsData] recentListings calculated. Count:', recent.length);
    return recent;
  }, [allAvailableListings]);
  
  const refreshListings = useCallback(() => {
    // console.log("[useListingsData] Manual refreshListings called. Triggering fetch.");
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
