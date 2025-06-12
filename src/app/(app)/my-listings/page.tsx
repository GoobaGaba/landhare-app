
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ListChecks, PlusCircle, Edit3, Trash2, Search, AlertTriangle, Loader2, UserCircle } from "lucide-react";
import type { Listing } from "@/lib/types";
import { getListings, deleteListing as dbDeleteListing } from "@/lib/mock-data"; 
import { ListingCard } from '@/components/land-search/listing-card';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from '@/contexts/auth-context';
import { firebaseInitializationError } from '@/lib/firebase';

export default function MyListingsPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [listingToDelete, setListingToDelete] = useState<Listing | null>(null);

  const loadMyListings = useCallback(async () => {
    if (firebaseInitializationError && !currentUser) {
      setIsLoading(false);
      setMyListings([]);
       if (firebaseInitializationError) {
        toast({ 
            title: "Preview Mode Active", 
            description: "Firebase not configured. Cannot load live listings.", 
            variant: "default",
            duration: 5000 
        });
      }
      return;
    }
    if (firebaseInitializationError && currentUser) {
         toast({ 
            title: "Preview Mode Active", 
            description: "Firebase not configured. Displaying sample listings.", 
            variant: "default",
            duration: 5000 
        });
    }

    setIsLoading(true);
    try {
      const allListings = await getListings(); // Will use mock data if Firebase error
      const filteredListings = allListings.filter(listing => listing.landownerId === currentUser!.uid);
      setMyListings(filteredListings);
    } catch (error: any) {
      console.error("Failed to load listings:", error);
      toast({
        title: "Loading Failed",
        description: error.message || "Could not load your listings.",
        variant: "destructive",
      });
      setMyListings([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, toast]);

  useEffect(() => {
    if(!authLoading && currentUser){ // Ensure currentUser is available before loading
        loadMyListings();
    } else if (!authLoading && !currentUser) { // No user, not even mock
        setIsLoading(false);
        setMyListings([]);
    }
  }, [authLoading, currentUser, loadMyListings]);

  const openDeleteDialog = (listing: Listing) => {
    if (firebaseInitializationError) {
       toast({ 
            title: "Preview Mode", 
            description: "Deleting listings is disabled in preview mode.", 
            variant: "default"
        });
       // Allow mock deletion to proceed for UI testing
       if (currentUser) {
            setListingToDelete(listing);
            setShowDeleteDialog(true);
       }
       return;
    }
    setListingToDelete(listing);
    setShowDeleteDialog(true);
  };

  const confirmDeleteListing = async () => {
    if (!listingToDelete) return;

    if (firebaseInitializationError && currentUser) {
        // Attempt mock deletion
        try {
            await dbDeleteListing(listingToDelete.id); // dbDeleteListing handles mock
            toast({ title: "Mock Listing Deleted", description: `"${listingToDelete.title}" removed from preview.`});
            loadMyListings();
        } catch (e) {
            toast({ title: "Mock Deletion Failed", description: "Could not remove mock listing.", variant: "destructive"});
        } finally {
            setShowDeleteDialog(false);
            setListingToDelete(null);
        }
        return;
    }


    try {
      const success = await dbDeleteListing(listingToDelete.id);
      if (success) {
        toast({
          title: "Listing Deleted",
          description: `"${listingToDelete.title}" has been successfully deleted.`,
        });
        await loadMyListings(); 
      } else {
        throw new Error("Deletion operation failed.");
      }
    } catch (error: any) {
       toast({
        title: "Deletion Failed",
        description: error.message || `Could not delete "${listingToDelete.title}".`,
        variant: "destructive",
      });
    } finally {
      setShowDeleteDialog(false);
      setListingToDelete(null);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="space-y-8">
        {/* Keep minimal UI for loading state */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">My Listings</h1>
          <Button asChild>
            <Link href="/listings/new">
              <PlusCircle className="mr-2 h-4 w-4" /> Create New Listing
            </Link>
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="h-6 w-6 text-primary" />
              Manage Your Land Listings
            </CardTitle>
          </CardHeader>
          <CardContent>
             <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2">Loading listings...</p>
             </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!currentUser && !authLoading) { // Handles if no user (mock or real)
     return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCircle className="h-6 w-6 text-primary" />
            Please Log In
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            You need to be logged in to manage your listings.
          </p>
          <Button asChild className="mt-4">
            <Link href="/login">Log In</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold">My Listings</h1>
        <Button asChild disabled={firebaseInitializationError !== null && !currentUser?.appProfile}>
          <Link href="/listings/new">
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Listing
          </Link>
        </Button>
      </div>

      {myListings.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-6 w-6 text-primary" />
              No Listings Yet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              You haven't created any listings yet. Get started by listing your land!
              {firebaseInitializationError && " (Currently displaying sample data due to Firebase configuration issue.)"}
            </p>
            <Button asChild className="mt-4" disabled={firebaseInitializationError !== null && !currentUser?.appProfile}>
                <Link href="/listings/new">Create Your First Listing</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {myListings.map((listing) => (
            <div key={listing.id} className="flex flex-col">
              <ListingCard listing={listing} viewMode="grid" />
              <div className="mt-2 flex gap-2 p-2 bg-card rounded-b-lg border border-t-0 shadow-sm">
                <Button variant="outline" size="sm" className="flex-1" asChild disabled={firebaseInitializationError !== null && !currentUser?.appProfile}>
                  <Link href={`/listings/edit/${listing.id}`}> {/* Edit page not yet created */}
                    <Edit3 className="mr-2 h-4 w-4" /> Edit
                  </Link>
                </Button>
                <Button variant="destructive" size="sm" className="flex-1" onClick={() => openDeleteDialog(listing)} disabled={firebaseInitializationError !== null && !currentUser?.appProfile}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-destructive" />
              Confirm Deletion
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the listing "{listingToDelete?.title}"? This action cannot be undone.
              {firebaseInitializationError && " (This will remove the listing from the current preview.)"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setListingToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteListing}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete Listing
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
