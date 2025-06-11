
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ListChecks, PlusCircle, Edit3, Trash2, Search, AlertTriangle, Loader2, UserCircle } from "lucide-react";
import type { Listing } from "@/lib/types";
// Updated to use Firestore-backed functions
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
    if (firebaseInitializationError || !currentUser) {
      setIsLoading(false);
      setMyListings([]);
       if (firebaseInitializationError) {
        toast({ title: "Database Error", description: "Cannot load listings: " + firebaseInitializationError, variant: "destructive" });
      }
      return;
    }
    setIsLoading(true);
    try {
      const allListings = await getListings();
      const filteredListings = allListings.filter(listing => listing.landownerId === currentUser.uid);
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
    if(!authLoading){
        loadMyListings();
    }
  }, [authLoading, currentUser, loadMyListings]);

  const openDeleteDialog = (listing: Listing) => {
    if (firebaseInitializationError) {
       toast({ title: "Database Error", description: "Cannot delete listing: " + firebaseInitializationError, variant: "destructive" });
       return;
    }
    setListingToDelete(listing);
    setShowDeleteDialog(true);
  };

  const confirmDeleteListing = async () => {
    if (!listingToDelete) return;

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
            <CardDescription>
              Loading your listings...
            </CardDescription>
          </CardHeader>
          <CardContent>
             <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
             </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (firebaseInitializationError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            Service Unavailable
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Your listings are temporarily unavailable due to a configuration issue: <span className="font-semibold text-destructive">{firebaseInitializationError}</span>
          </p>
           <p className="text-xs text-muted-foreground mt-2">Please ensure Firebase is correctly configured in your .env.local file and the server has been restarted.</p>
        </CardContent>
      </Card>
    );
  }


  if (!currentUser) {
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
        <Button asChild disabled={firebaseInitializationError !== null}>
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
            </p>
            <Button asChild className="mt-4" disabled={firebaseInitializationError !== null}>
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
                <Button variant="outline" size="sm" className="flex-1" asChild disabled={firebaseInitializationError !== null}>
                  <Link href={`/listings/edit/${listing.id}`}> {/* Edit page not yet created */}
                    <Edit3 className="mr-2 h-4 w-4" /> Edit
                  </Link>
                </Button>
                <Button variant="destructive" size="sm" className="flex-1" onClick={() => openDeleteDialog(listing)} disabled={firebaseInitializationError !== null}>
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
