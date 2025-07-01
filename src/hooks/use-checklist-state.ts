
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from './use-toast';
import { getAdminChecklistState, saveAdminChecklistState } from '@/lib/mock-data';
import { firebaseInitializationError } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';


// This hook now uses Firestore (via mock-data functions) to store the checklist state,
// allowing it to be synced across devices for the admin. It falls back to localStorage
// if Firebase isn't configured.
export function useChecklistState(checklistId: string) {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);
  const { toast } = useToast();
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) { // Don't load anything if there's no user.
        setIsLoaded(true);
        return;
    };
    if (typeof window === 'undefined') { // Prevent server-side execution
        setIsLoaded(true);
        return;
    }

    const loadState = async () => {
        try {
            let state: Set<string>;
            if (firebaseInitializationError !== null) {
                // Fallback to localStorage only on the client
                const stored = localStorage.getItem(checklistId);
                state = stored ? new Set(JSON.parse(stored)) : new Set();
            } else {
                state = await getAdminChecklistState();
            }
            setCheckedItems(state);
        } catch (error) {
            console.error(`Failed to load checklist state for key "${checklistId}":`, error);
            toast({
                title: "Checklist Error",
                description: "Could not load saved checklist state.",
                variant: "destructive"
            });
        } finally {
            setIsLoaded(true);
        }
    };
    
    loadState();
  }, [checklistId, toast, currentUser]);

  const toggleItem = useCallback((id: string) => {
    if (!currentUser) {
        toast({ title: "Not Authenticated", description: "You must be logged in to modify the checklist.", variant: "destructive"});
        return;
    };

    const newCheckedItems = new Set(checkedItems);
    if (newCheckedItems.has(id)) {
      newCheckedItems.delete(id);
    } else {
      newCheckedItems.add(id);
    }
    
    // Optimistic UI update
    setCheckedItems(newCheckedItems);

    // Persist changes
    const saveState = async () => {
        try {
            if (firebaseInitializationError !== null) {
                if (typeof window !== 'undefined') {
                    localStorage.setItem(checklistId, JSON.stringify(Array.from(newCheckedItems)));
                }
            } else {
                await saveAdminChecklistState(newCheckedItems);
            }
        } catch (error) {
             console.error(`Failed to save checklist state for key "${checklistId}":`, error);
            toast({
                title: "Save Error",
                description: "Your checklist changes could not be saved.",
                variant: "destructive"
            });
            // Revert to the previous state on failure.
            setCheckedItems(checkedItems);
        }
    };
    saveState();

  }, [checkedItems, checklistId, toast, currentUser]);

  return { checkedItems, toggleItem, isLoaded };
}
