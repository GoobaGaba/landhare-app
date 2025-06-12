
'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ListChecks, PlusCircle, Search, AlertTriangle, Loader2, UserCircle, Edit, Trash2 } from "lucide-react";
import type { Listing } from "@/lib/types";
import { deleteListing as dbDeleteListing } from '@/lib/mock-data';
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
import { useListingsData } from '@/hooks/use-listings-data';
import { useState, useEffect } from 'react';

export default function MyListingsPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const { myListings, isLoading: listingsLoading, error: listingsError, refreshListings } = useListingsData();
  const { toast } = useToast();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [listingToDelete, setListingToDelete] = useState<Listing | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  useEffect(() => {
    console.log(`[MyListingsPage] Hook Data: AuthLoading: ${authLoading}, ListingsLoading: ${listingsLoading}, CurrentUser: ${currentUser?.uid}, MyListings count: ${myListings.length}`);
    if (listingsError) {
      toast({ title: "Error loading your listings", description: listingsError, variant: "destructive" });
    }
  }, [authLoading, listingsLoading, currentUser, myListings, listingsError, toast]);

  const openDeleteDialog = (listing: Listing) => {
    if (firebaseInitializationError && !currentUser?.appProfile) {
       toast({ title: "Preview Mode", description: "Deleting listings is disabled in full preview mode (no mock user login).", variant: "default" });
       return;
    }
    setListingToDelete(listing);
    setShowDeleteDialog(true);
  };

  const confirmDeleteListing = async () => {
    if (!listingToDelete) return;

    let deleteSuccessful = false;
    try {
      // dbDeleteListing in mock-data.ts already calls incrementMockDataVersion
      await dbDeleteListing(listingToDelete.id);
      deleteSuccessful = true;
      toast({ title: "Listing Deleted", description: `"${listingToDelete.title}" removed.`});
    } catch (e: any) {
        toast({ title: "Deletion Failed", description: e.message || "Could not remove listing.", variant: "destructive"});
    } finally {
        setShowDeleteDialog(false);
        setListingToDelete(null);
        if (deleteSuccessful) {
          // The useListingsData hook should pick up the change via mockDataVersion
          // refreshListings(); // Explicitly calling refresh might not be needed if mockDataVersion works
        }
    }
  };

  const handleEditClick = (listing: Listing) => {
    setShowEditDialog(true);
  };

  if (authLoading || listingsLoading) {
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
          <CardHeader><CardTitle className="flex items-center gap-2"><ListChecks className="h-6 w-6 text-primary" />Manage Your Land Listings</CardTitle></CardHeader>
          <CardContent><div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Loading listings...</p></div></CardContent>
        </Card>
      </div>
    );
  }

  if (!currentUser && !authLoading) {
     return (
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><UserCircle className="h-6 w-6 text-primary" />Please Log In</CardTitle></CardHeader>
        <CardContent><p className="text-muted-foreground">You need to be logged in to manage your listings.</p><Button asChild className="mt-4"><Link href="/login">Log In</Link></Button></CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold">My Listings</h1>
        <Button asChild disabled={(firebaseInitializationError !== null && !currentUser?.appProfile)}>
          <Link href="/listings/new"><PlusCircle className="mr-2 h-4 w-4" /> Create New Listing</Link>
        </Button>
      </div>

      {myListings.length === 0 ? (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Search className="h-6 w-6 text-primary" />No Listings Yet</CardTitle></CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              You haven't created any listings yet. Get started by listing your land!
              {firebaseInitializationError && " (Currently displaying sample data due to Firebase configuration issue.)"}
            </p>
            <Button asChild className="mt-4" disabled={(firebaseInitializationError !== null && !currentUser?.appProfile)}>
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
                <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEditClick(listing)} disabled={(firebaseInitializationError !== null && !currentUser?.appProfile)}><Edit className="mr-2 h-4 w-4" /> Edit</Button>
                <Button variant="destructive" size="sm" className="flex-1" onClick={() => openDeleteDialog(listing)} disabled={(firebaseInitializationError !== null && !currentUser?.appProfile)}><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center"><AlertTriangle className="h-5 w-5 mr-2 text-destructive" />Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the listing "{listingToDelete?.title}"? This action cannot be undone.
              {firebaseInitializationError && " (This will remove the listing from the current preview.)"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setListingToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteListing} className="bg-destructive hover:bg-destructive/90">Delete Listing</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Feature Coming Soon</AlertDialogTitle><AlertDialogDescription>The ability to edit listings is currently under development and will be available in a future update.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogAction onClick={() => setShowEditDialog(false)}>OK</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
