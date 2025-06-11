
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


export default function MyListingsPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [listingToDelete, setListingToDelete] = useState<Listing | null>(null);

  const loadMyListings = useCallback(() => {
    if (!currentUser) {
      setIsLoading(false);
      setMyListings([]);
      return;
    }
    setIsLoading(true);
    const allListings = getListings();
    const filteredListings = allListings.filter(listing => listing.landownerId === currentUser.uid);
    setMyListings(filteredListings);
    setIsLoading(false);
  }, [currentUser]);

  useEffect(() => {
    if(!authLoading){
        const timer = setTimeout(() => {
          loadMyListings();
        }, 300); 
        return () => clearTimeout(timer);
    }
  }, [authLoading, currentUser, loadMyListings]);

  const openDeleteDialog = (listing: Listing) => {
    setListingToDelete(listing);
    setShowDeleteDialog(true);
  };

  const confirmDeleteListing = () => {
    if (!listingToDelete) return;

    const success = dbDeleteListing(listingToDelete.id);
    if (success) {
      toast({
        title: "Listing Deleted",
        description: `"${listingToDelete.title}" has been successfully deleted.`,
      });
      loadMyListings(); 
    } else {
      toast({
        title: "Deletion Failed",
        description: `Could not delete "${listingToDelete.title}".`,
        variant: "destructive",
      });
    }
    setShowDeleteDialog(false);
    setListingToDelete(null);
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
        <Button asChild>
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
            <Button asChild className="mt-4">
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
                <Button variant="outline" size="sm" className="flex-1" asChild>
                  <Link href={`/listings/edit/${listing.id}`}> 
                    <Edit3 className="mr-2 h-4 w-4" /> Edit
                  </Link>
                </Button>
                <Button variant="destructive" size="sm" className="flex-1" onClick={() => openDeleteDialog(listing)}>
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
