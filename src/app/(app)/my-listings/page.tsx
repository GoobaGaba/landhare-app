
'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ListChecks, PlusCircle, Search, AlertTriangle, Loader2, UserCircle, Edit, Trash2 } from "lucide-react";
import type { Listing } from "@/lib/types";
// ListingCard import is removed temporarily for debugging
// import { ListingCard } from '@/components/land-search/listing-card'; 
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

  // These states are for dialogs, not critical for initial display debugging
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [listingToDelete, setListingToDelete] = useState<Listing | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  console.log(`[MyListingsPage] Render. AuthLoading: ${authLoading}, ListingsLoading: ${listingsLoading}, CurrentUser UID: ${currentUser?.uid}, MyListings count: ${myListings?.length}, ListingsError: ${listingsError}`);

  useEffect(() => {
    if (listingsError) {
      toast({ title: "Error loading your listings", description: listingsError, variant: "destructive" });
    }
  }, [listingsError, toast]);

  // Functions for dialogs - temporarily simplified
  const openDeleteDialog = (listing: Listing) => {
    console.log("Attempting to open delete dialog for (mock):", listing.title);
    // setListingToDelete(listing);
    // setShowDeleteDialog(true);
    toast({title: "Delete Action (Mock)", description: "Delete dialog functionality temporarily suspended for debugging."})
  };

  const confirmDeleteListing = async () => {
    console.log("Confirm delete (mock)");
    // setShowDeleteDialog(false);
    // setListingToDelete(null);
  };

  const handleEditClick = (listing: Listing) => {
    console.log("Attempting to open edit dialog for (mock):", listing.title);
    // setShowEditDialog(true);
     toast({title: "Edit Action (Mock)", description: "Edit dialog functionality temporarily suspended for debugging."})
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

  if (!currentUser && !authLoading) { // Check after authLoading is false
     return (
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><UserCircle className="h-6 w-6 text-primary" />Please Log In</CardTitle></CardHeader>
        <CardContent><p className="text-muted-foreground">You need to be logged in to manage your listings.</p><Button asChild className="mt-4"><Link href="/login">Log In</Link></Button></CardContent>
      </Card>
    );
  }
  
  if (listingsError) {
     return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-6 w-6" />Error Loading Your Listings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{listingsError}</p>
          <Button onClick={() => { console.log("Refresh button clicked"); refreshListings(); }} className="mt-4">Try Again</Button>
        </CardContent>
      </Card>
    );
  }

  // If we reach here, currentUser should be defined and no listingsError
  // myListings from the hook should also be an array.

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold">My Listings (Debug View)</h1>
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
        <Card>
            <CardHeader>
                <CardTitle>Your Listings ({myListings.length})</CardTitle>
                <CardDescription>User: {currentUser?.uid} | Email: {currentUser?.email}</CardDescription>
            </CardHeader>
            <CardContent>
                <ul className="list-disc pl-5 space-y-1">
                    {myListings.map((listing) => (
                        <li key={listing.id}>
                            <strong>{listing.title}</strong> (ID: {listing.id}, Owner: {listing.landownerId})
                            <Link href={`/listings/${listing.id}`} className="ml-2 text-xs text-primary hover:underline">(View)</Link>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
        // Original grid rendering commented out for debugging
        /*
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
        */
      )}
      {/* AlertDialogs temporarily removed for clarity during this debug step */}
    </div>
  );
}
