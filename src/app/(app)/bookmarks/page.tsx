
'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bookmark, Search, Loader2, UserCircle, AlertTriangle, Crown } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { useListingsData } from '@/hooks/use-listings-data';
import type { Listing } from '@/lib/types';
import { ListingCard } from '@/components/land-search/listing-card';
import { useEffect, useMemo } from 'react';
import { FREE_TIER_BOOKMARK_LIMIT } from '@/lib/mock-data';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function MyBookmarksPage() {
  const { currentUser, loading: authLoading, subscriptionStatus } = useAuth();
  const { allAvailableListings, isLoading: listingsLoading, error: listingsError, refreshListings } = useListingsData();
  const { toast } = useToast();

  useEffect(() => {
    if (listingsError) {
      toast({ title: "Error loading listings data", description: listingsError, variant: "destructive" });
    }
  }, [listingsError, toast]);

  const bookmarkedListings = useMemo(() => {
    if (currentUser?.appProfile?.bookmarkedListingIds && allAvailableListings.length > 0) {
      const userBookmarkIds = new Set(currentUser.appProfile.bookmarkedListingIds);
      return allAvailableListings.filter(listing => userBookmarkIds.has(listing.id));
    }
    return [];
  }, [currentUser, allAvailableListings]);

  const atBookmarkLimit = subscriptionStatus === 'standard' && bookmarkedListings.length >= FREE_TIER_BOOKMARK_LIMIT;

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

      {atBookmarkLimit && (
         <Alert variant="default" className="border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-500/50">
            <Crown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertTitle className="text-amber-800 dark:text-amber-200 font-semibold">Bookmark Limit Reached</AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-300">
                Standard accounts can save up to {FREE_TIER_BOOKMARK_LIMIT} listings.
                <Button variant="link" asChild className="p-0 h-auto ml-1 text-amber-700 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200">
                    <Link href="/pricing">Upgrade to Premium</Link>
                </Button> for unlimited bookmarks!
            </AlertDescription>
        </Alert>
      )}

      {bookmarkedListings.length === 0 ? (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Search className="h-6 w-6 text-primary" />No Bookmarks Yet</CardTitle></CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              You haven't bookmarked any listings yet. Start exploring to find land you love!
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

    