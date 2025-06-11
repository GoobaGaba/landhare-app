
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ListChecks, PlusCircle, Edit3, Trash2, Search } from "lucide-react";
import type { Listing } from "@/lib/types";
import { getListings } from "@/lib/mock-data"; // Assuming getListings fetches all and we filter
import { ListingCard } from '@/components/land-search/listing-card';

// Mock current landowner ID - in a real app, this would come from auth
const MOCK_LANDOWNER_ID = 'user1';

export default function MyListingsPage() {
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate API delay
    const timer = setTimeout(() => {
      const allListings = getListings();
      const filteredListings = allListings.filter(listing => listing.landownerId === MOCK_LANDOWNER_ID);
      setMyListings(filteredListings);
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleDeleteListing = (listingId: string) => {
    // Placeholder for delete functionality
    console.log("Attempting to delete listing:", listingId);
    alert(`Delete functionality for listing ${listingId} is not yet implemented.`);
    // In a real app: call a server action to delete, then update state or re-fetch.
  };

  if (isLoading) {
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
            <div className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="shadow-md">
                  <CardHeader className="p-0">
                    <div className="relative w-full h-48 bg-muted rounded-t-lg animate-pulse"></div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4 animate-pulse"></div>
                    <div className="h-3 bg-muted rounded w-1/2 animate-pulse"></div>
                    <div className="h-3 bg-muted rounded w-1/4 animate-pulse"></div>
                  </CardContent>
                  <CardFooter className="p-4 border-t flex justify-between items-center">
                    <div className="h-6 bg-muted rounded w-1/4 animate-pulse"></div>
                    <div className="h-8 bg-muted rounded w-1/3 animate-pulse"></div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
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
                  <Link href={`/listings/edit/${listing.id}`}> {/* Placeholder edit link */}
                    <Edit3 className="mr-2 h-4 w-4" /> Edit
                  </Link>
                </Button>
                <Button variant="destructive" size="sm" className="flex-1" onClick={() => handleDeleteListing(listing.id)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
