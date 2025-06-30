
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from './use-toast';

// A simple hook to manage the state of a checklist using browser localStorage.
// This is not synced across devices or browsers for a given user.
export function useChecklistState(localStorageKey: string) {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);
  const { toast } = useToast();

  // Effect to load the initial state from localStorage on component mount.
  useEffect(() => {
    // We can only access localStorage on the client-side, so we check for `window`.
    if (typeof window !== 'undefined') {
      try {
        const storedItems = window.localStorage.getItem(localStorageKey);
        if (storedItems) {
          setCheckedItems(new Set(JSON.parse(storedItems)));
        }
      } catch (error) {
        console.error(`Failed to load checklist state for key "${localStorageKey}" from localStorage:`, error);
        toast({
          title: "Checklist Error",
          description: "Could not load saved checklist state.",
          variant: "destructive"
        });
      } finally {
        setIsLoaded(true);
      }
    }
  }, [localStorageKey, toast]);

  // A function to toggle an item's checked state and save it to localStorage.
  const toggleItem = useCallback((id: string) => {
    // Use a functional update to get the latest state.
    setCheckedItems(prevCheckedItems => {
      const newCheckedItems = new Set(prevCheckedItems);
      if (newCheckedItems.has(id)) {
        newCheckedItems.delete(id);
      } else {
        newCheckedItems.add(id);
      }

      // Save the new state to localStorage.
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(localStorageKey, JSON.stringify(Array.from(newCheckedItems)));
        } catch (error) {
            console.error(`Failed to save checklist state for key "${localStorageKey}" to localStorage:`, error);
            toast({
                title: "Save Error",
                description: "Your checklist changes could not be saved.",
                variant: "destructive"
            });
            // Revert to the previous state on failure.
            return prevCheckedItems;
        }
      }
      
      return newCheckedItems;
    });
  }, [localStorageKey, toast]);

  return { checkedItems, toggleItem, isLoaded };
}
