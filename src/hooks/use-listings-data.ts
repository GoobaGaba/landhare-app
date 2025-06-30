
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Listing } from '@/lib/types';
import { getListings } from '@/lib/mock-data';
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
    setIsLoading(true);
    setError(null);
    try {
      const fetchedListings = await getListings(); 
      setInternalListings(fetchedListings);
    } catch (err: any) {
      console.error("[useListingsData] fetchAndProcessListings: Error fetching listings:", err);
      setError(err.message || "Failed to load listings.");
      setInternalListings([]);
    } finally {
      setIsLoading(false);
    }
  }, []); 

  useEffect(() => {
    const handleDataChange = () => {
      fetchAndProcessListings();
    };
    
    // Perform initial fetch
    fetchAndProcessListings();

    // Listen for custom event to refetch data
    window.addEventListener('mockDataChanged', handleDataChange);

    // Cleanup
    return () => {
      window.removeEventListener('mockDataChanged', handleDataChange);
    };
  }, [fetchAndProcessListings]); 

  const allAvailableListings = useMemo(() => {
    return internalListings.filter(l => l.isAvailable);
  }, [internalListings]);

  const myListings = useMemo(() => {
    return currentUser
      ? internalListings.filter(listing => listing.landownerId === currentUser.uid)
      : [];
  }, [internalListings, currentUser?.uid]); 

  const recentListings = useMemo(() => {
    return [...allAvailableListings]
      .sort((a, b) => {
        const timeA = (a.createdAt instanceof Date ? a.createdAt : new Date(0)).getTime();
        const timeB = (b.createdAt instanceof Date ? b.createdAt : new Date(0)).getTime();
        return timeB - timeA;
      })
      .slice(0, 4);
  }, [allAvailableListings]);
  
  const refreshListings = useCallback(() => {
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
