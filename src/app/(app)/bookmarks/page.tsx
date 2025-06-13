
'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bookmark, Search, Loader2, UserCircle, AlertTriangle } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { useListingsData } from '@/hooks/use-listings-data';
import type { Listing } from '@/lib/types';
import { ListingCard } from '@/components/land-search/listing-card';
import { useEffect, useMemo, useState } from 'react';
import { firebaseInitializationError } from '@/lib/firebase';

export default function MyBookmarksPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const { allAvailableListings, isLoading: listingsLoading, error: listingsError, refreshListings } = useListingsData();
  const { toast } = useToast();
  const [bookmarkedListings, setBookmarkedListings] = useState<Listing[]>([]);

  useEffect(() => {
    if (listingsError) {
      toast({ title: "Error loading listings data", description: listingsError, variant: "destructive" });
    }
  }, [listingsError, toast]);

  useEffect(() => {
    if (currentUser?.appProfile?.bookmarkedListingIds && allAvailableListings.length > 0) {
      const userBookmarks = currentUser.appProfile.bookmarkedListingIds;
      const filtered = allAvailableListings.filter(listing => userBookmarks.includes(listing.id));
      setBookmarkedListings(filtered);
    } else {
      setBookmarkedListings([]);
    }
  }, [currentUser, allAvailableListings]);


  if (authLoading || listingsLoading) {
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bookmark className="h-7 w-7 text-primary" /> My Bookmarked Listings
          </h1>
        </div>
        <Card>
          <CardHeader><CardTitle>Loading Bookmarks...</CardTitle></CardHeader>
          <CardContent><div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Loading your bookmarked listings...</p></div></CardContent>
        </Card>
      </div>
    );
  }

  if (!currentUser && !authLoading) {
     return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><UserCircle className="h-6 w-6 text-primary" />Please Log In</CardTitle></CardHeader>
        <CardContent><p className="text-muted-foreground">You need to be logged in to view your bookmarked listings.</p><Button asChild className="mt-4"><Link href="/login">Log In</Link></Button></CardContent>
      </Card>
    );
  }
  
  if (listingsError && !listingsLoading) {
     return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-6 w-6" />Error Loading Data
          </CardTitle>
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
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Bookmark className="h-7 w-7 text-primary" /> My Bookmarked Listings
        </h1>
        <Button asChild variant="outline">
          <Link href="/search"><Search className="mr-2 h-4 w-4" /> Find More Land</Link>
        </Button>
      </div>

      {bookmarkedListings.length === 0 ? (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Search className="h-6 w-6 text-primary" />No Bookmarks Yet</CardTitle></CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              You haven't bookmarked any listings yet. Start exploring to find land you love!
              {firebaseInitializationError && " (Note: Firebase features may be limited if not configured.)"}
            </p>
            <Button asChild className="mt-4">
                <Link href="/search">Explore Land</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bookmarkedListings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} viewMode="grid" />
          ))}
        </div>
      )}
    </div>
  );
}
