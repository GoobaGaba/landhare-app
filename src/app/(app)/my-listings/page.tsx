
'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ListChecks, PlusCircle, Search, AlertTriangle, Loader2, UserCircle } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { useListingsData } from '@/hooks/use-listings-data';
import { firebaseInitializationError } from '@/lib/firebase'; 
import { useEffect } from 'react';
import { mockDataVersion } from '@/lib/mock-data'; // Import for logging

export default function MyListingsPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const { myListings, isLoading: listingsLoading, error: listingsError, refreshListings } = useListingsData();
  const { toast } = useToast();

  // Log the state received from hooks and global mockDataVersion at the top of the render
  console.log(`[MyListingsPage] Render. AuthLoading: ${authLoading}, CurrentUser UID: ${currentUser?.uid}, Global mockDataVersion: ${mockDataVersion}`);
  console.log(`[MyListingsPage] Data from useListingsData: isLoading: ${listingsLoading}, error: ${listingsError}, myListings count: ${myListings?.length}`);
  
  useEffect(() => {
    if (listingsError) {
      console.error("[MyListingsPage] Listings Error reported by useListingsData:", listingsError);
      toast({ title: "Error loading your listings", description: listingsError, variant: "destructive" });
    }
  }, [listingsError, toast]);

  if (authLoading || listingsLoading) {
    console.log("[MyListingsPage] Rendering: Loading state (auth or listings)");
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">My Listings (Debug)</h1>
        </div>
        <Card>
          <CardHeader><CardTitle>Loading Listings...</CardTitle></CardHeader>
          <CardContent><div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Loading your listings...</p></div></CardContent>
        </Card>
      </div>
    );
  }

  if (!currentUser && !authLoading) {
    console.log("[MyListingsPage] Rendering: Not logged in");
     return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><UserCircle className="h-6 w-6 text-primary" />Please Log In</CardTitle></CardHeader>
        <CardContent><p className="text-muted-foreground">You need to be logged in to manage your listings.</p><Button asChild className="mt-4"><Link href="/login">Log In</Link></Button></CardContent>
      </Card>
    );
  }
  
  if (listingsError) {
    console.log("[MyListingsPage] Rendering: Listings error state - ", listingsError);
     return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-6 w-6" />Error Loading Your Listings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{listingsError}</p>
          <Button onClick={() => { console.log("[MyListingsPage] Refresh button clicked, calling refreshListings()"); refreshListings(); }} className="mt-4">Try Again</Button>
        </CardContent>
      </Card>
    );
  }

  // At this point, user is logged in, no loading, no listingsError
  console.log(`[MyListingsPage] Rendering: User logged in. MyListings count from hook: ${myListings.length}. Displaying list if count > 0.`);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold">My Listings (Debug View)</h1>
        <Button asChild disabled={(firebaseInitializationError !== null && !currentUser?.appProfile)}>
          <Link href="/listings/new"><PlusCircle className="mr-2 h-4 w-4" /> Create New Listing</Link>
        </Button>
      </div>

      {myListings.length === 0 ? (
        <>
          {console.log("[MyListingsPage] Rendering: No listings found for user. Displaying 'No Listings Yet' card.")}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Search className="h-6 w-6 text-primary" />No Listings Yet (Debug)</CardTitle></CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                You haven't created any listings yet, or they are not being correctly associated with your user ID ({currentUser?.uid}).
                {firebaseInitializationError && " (Currently displaying sample data due to Firebase configuration issue.)"}
              </p>
              <p className="text-xs mt-1">Global mockDataVersion: {mockDataVersion}. Ensure this increments after listing creation and this page re-fetches data.</p>
              <Button asChild className="mt-4" disabled={(firebaseInitializationError !== null && !currentUser?.appProfile)}>
                  <Link href="/listings/new">Create Your First Listing</Link>
              </Button>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          {console.log(`[MyListingsPage] Rendering: Found ${myListings.length} listings for user. Displaying list.`)}
          <Card>
              <CardHeader>
                  <CardTitle>Your Listings ({myListings.length})</CardTitle>
                  <CardDescription>
                    User ID: {currentUser?.uid} | Email: {currentUser?.email} <br/>
                    Global mockDataVersion: {mockDataVersion} <br/>
                    (If a newly created listing is missing, check console logs for ID mismatches or filtering issues in useListingsData)
                  </CardDescription>
              </CardHeader>
              <CardContent>
                  <ul className="list-disc pl-5 space-y-2">
                      {myListings.map((listing) => (
                          <li key={listing.id} className="border-b pb-1 mb-1">
                              <strong>{listing.title}</strong> (ID: {listing.id}) <br/>
                              <span className="text-xs text-muted-foreground">Owner ID on Listing: {listing.landownerId}</span>
                              <Link href={`/listings/${listing.id}`} className="ml-2 text-xs text-primary hover:underline">(View)</Link>
                          </li>
                      ))}
                  </ul>
              </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
