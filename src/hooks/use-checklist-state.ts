'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { db, firebaseInitializationError } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useToast } from './use-toast';
import { ADMIN_UIDS } from '@/lib/mock-data';

// The collection name in Firestore for admin-related settings
const FIRESTORE_COLLECTION = 'admin_state';
// The document ID within that collection for the checklist
const FIRESTORE_DOC_ID = 'checklist';

/**
 * A custom hook to manage the state of a checklist.
 * It syncs the state with Firestore for logged-in admins, ensuring persistence across devices.
 * For non-admins or in mock mode (when Firebase isn't configured), it falls back to using browser localStorage.
 * @param localStorageKey The unique key for this checklist in localStorage (used as a fallback).
 * @returns An object with the set of checked items, a function to toggle an item's state,
 *          and a boolean indicating if the state has been loaded.
 */
export function useChecklistState(localStorageKey: string) {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const isUserAdmin = currentUser?.uid && ADMIN_UIDS.includes(currentUser.uid);
  const canUseFirestore = !firebaseInitializationError && db && isUserAdmin;

  // Effect to load the initial state on component mount.
  useEffect(() => {
    // This function runs only once on mount to fetch initial state.
    const loadInitialState = async () => {
      try {
        if (canUseFirestore) {
          // --- Firestore Logic ---
          const docRef = doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC_ID);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            // Firestore stores the data in an object, we need to get the 'checked' array
            const storedArray = data.checked || [];
            setCheckedItems(new Set(storedArray));
          }
        } else {
          // --- Fallback localStorage Logic ---
          if (typeof window !== 'undefined') {
            const storedItems = window.localStorage.getItem(localStorageKey);
            if (storedItems) {
              setCheckedItems(new Set(JSON.parse(storedItems)));
            }
          }
        }
      } catch (error) {
        console.error(`Failed to load checklist state for key "${localStorageKey}" from storage:`, error);
        toast({
          title: "Checklist Error",
          description: "Could not load saved checklist state.",
          variant: "destructive"
        });
      } finally {
        setIsLoaded(true);
      }
    };

    if (currentUser) {
        loadInitialState();
    } else {
        setIsLoaded(true); // If no user, we are "loaded" with an empty set.
    }
  }, [canUseFirestore, localStorageKey, toast, currentUser]); // Rerun if the user's ability to use Firestore changes


  /**
   * Toggles the checked state of a given item ID and saves it to the appropriate store.
   */
  const toggleItem = useCallback((id: string) => {
    const newCheckedItems = new Set(checkedItems);
    if (newCheckedItems.has(id)) {
      newCheckedItems.delete(id);
    } else {
      newCheckedItems.add(id);
    }
    setCheckedItems(newCheckedItems); // Update local state immediately for responsiveness

    // Asynchronously save the updated state
    const saveState = async () => {
      try {
        const itemsToStore = Array.from(newCheckedItems);
        if (canUseFirestore) {
          // --- Firestore Logic ---
          const docRef = doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC_ID);
          // We save an object with a 'checked' property which is an array of strings.
          await setDoc(docRef, { checked: itemsToStore }, { merge: true });
        } else {
          // --- Fallback localStorage Logic ---
           if (typeof window !== 'undefined') {
            window.localStorage.setItem(localStorageKey, JSON.stringify(itemsToStore));
          }
        }
      } catch (error) {
        console.error(`Failed to save checklist state for key "${localStorageKey}":`, error);
        toast({
          title: "Save Error",
          description: "Your checklist changes could not be saved.",
          variant: "destructive"
        });
        // Optionally, revert the state change on save failure
        setCheckedItems(new Set(checkedItems));
      }
    };

    saveState();

  }, [checkedItems, canUseFirestore, localStorageKey, toast]);

  return { checkedItems, toggleItem, isLoaded };
}
