
'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * A custom hook to manage the state of a checklist, persisting it to localStorage.
 * This allows the state to be saved across browser sessions.
 * @param storageKey The unique key for this checklist in localStorage.
 * @returns An object with the set of checked items, a function to toggle an item's state,
 *          and a boolean indicating if the state has been loaded from storage.
 */
export function useChecklistState(storageKey: string) {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);

  // Effect to load the initial state from localStorage on component mount.
  useEffect(() => {
    // Only run this effect in the browser.
    if (typeof window !== 'undefined') {
      try {
        const storedItems = window.localStorage.getItem(storageKey);
        if (storedItems) {
          setCheckedItems(new Set(JSON.parse(storedItems)));
        }
      } catch (error) {
        console.error(`Failed to load checklist state for key "${storageKey}" from localStorage:`, error);
      } finally {
        setIsLoaded(true);
      }
    }
  }, [storageKey]);

  // Effect to save the state to localStorage whenever it changes.
  useEffect(() => {
    // Only run if the initial state has been loaded to avoid overwriting it.
    if (isLoaded && typeof window !== 'undefined') {
      try {
        const itemsToStore = JSON.stringify(Array.from(checkedItems));
        window.localStorage.setItem(storageKey, itemsToStore);
      } catch (error) {
        console.error(`Failed to save checklist state for key "${storageKey}" to localStorage:`, error);
      }
    }
  }, [checkedItems, storageKey, isLoaded]);

  /**
   * Toggles the checked state of a given item ID.
   */
  const toggleItem = useCallback((id: string) => {
    setCheckedItems(prevCheckedItems => {
      const newCheckedItems = new Set(prevCheckedItems);
      if (newCheckedItems.has(id)) {
        newCheckedItems.delete(id);
      } else {
        newCheckedItems.add(id);
      }
      return newCheckedItems;
    });
  }, []);

  return { checkedItems, toggleItem, isLoaded };
}
