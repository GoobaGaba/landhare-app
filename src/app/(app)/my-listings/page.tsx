
'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ListChecks, PlusCircle, Search, AlertTriangle, Loader2, UserCircle, Trash2, Edit } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { useListingsData } from '@/hooks/use-listings-data';
import { firebaseInitializationError } from '@/lib/firebase';
import { useEffect, useState } from 'react';
import { ListingCard } from '@/components/land-search/listing-card';
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
import { deleteListingAction } from './actions';
import type { Listing } from '@/lib/types';

export default function MyListingsPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const { myListings, isLoading: listingsLoading, error: listingsError, refreshListings } = useListingsData();
  const { toast } = useToast();

  const [listingToDelete, setListingToDelete] = useState<Listing | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (listingsError) {
      toast({ title: "Error loading your listings", description: listingsError, variant: "destructive" });
    }
  }, [listingsError, toast]);

  const handleDeleteConfirmation = (listing: Listing) => {
    if (firebaseInitializationError && !currentUser?.appProfile) {
       toast({ title: "Preview Mode", description: "This action is disabled in full preview mode.", variant: "default" });
       return;
    }
    setListingToDelete(listing);
  };

  const handleConfirmDelete = async () => {
    if (!listingToDelete) return;
    setIsDeleting(true);
    const result = await deleteListingAction(listingToDelete.id);
    setIsDeleting(false);
    setListingToDelete(null);

    if (result.success) {
      toast({ title: "Listing Deleted", description: result.message });
      // The refreshListings call will be implicitly handled by the data hook
    } else {
      toast({ title: "Deletion Failed", description: result.message, variant: "destructive" });
    }
  };

  if (authLoading || listingsLoading) {
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">My Listings</h1>
        </div>
        <Card>
          <CardHeader><CardTitle>Loading Listings...</CardTitle></CardHeader>
          <CardContent><div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Loading your listings...</p></div></CardContent>
        </Card>
      </div>
    );
  }

  if (!currentUser && !authLoading) {
     return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><UserCircle className="h-6 w-6 text-primary" />Please Log In</CardTitle></CardHeader>
        <CardContent><p className="text-muted-foreground">You need to be logged in to manage your listings.</p><Button asChild className="mt-4"><Link href="/login">Log In</Link></Button></CardContent>
      </Card>
    );
  }
  
  if (listingsError && !listingsLoading) {
     return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-6 w-6" />Error Loading Your Listings
          </Title>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{listingsError}</p>
          <Button onClick={refreshListings} className="mt-4">Try Again</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold">My Listings</h1>
        <Button asChild>
          <Link href="/listings/new"><PlusCircle className="mr-2 h-4 w-4" /> Create New Listing</Link>
        </Button>
      </div>

      {myListings.length === 0 && !listingsLoading ? (
        <>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Search className="h-6 w-6 text-primary" />No Listings Yet</CardTitle></CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                You haven't created any listings yet.
                {firebaseInitializationError && " (Note: Firebase features may be limited if not configured. Ensure .env.local is set.)"}
              </p>
              <Button asChild className="mt-4">
                  <Link href="/listings/new">Create Your First Listing</Link>
              </Button>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <div className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myListings.map((listing) => (
              <Card key={listing.id} className="flex flex-col">
                <ListingCard listing={listing} viewMode="grid" />
                <CardFooter className="mt-auto pt-4 border-t flex justify-end gap-2">
                  <Button variant="outline" size="sm" asChild title="Edit this listing" disabled={(firebaseInitializationError !== null && !currentUser.appProfile)}>
                    <Link href={`/listings/edit/${listing.id}`}>
                      <Edit className="mr-2 h-3 w-3" /> Edit
                    </Link>
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteConfirmation(listing)}
                    disabled={isDeleting && listingToDelete?.id === listing.id}
                  >
                    {isDeleting && listingToDelete?.id === listing.id ? <Loader2 className="mr-2 h-3 w-3 animate-spin"/> : <Trash2 className="mr-2 h-3 w-3" />}
                    Delete
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </>
      )}

      {listingToDelete && (
        <AlertDialog open={!!listingToDelete} onOpenChange={() => setListingToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the listing: "{listingToDelete.title}"? This action cannot be undone. All associated data will also be removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setListingToDelete(null)} disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
