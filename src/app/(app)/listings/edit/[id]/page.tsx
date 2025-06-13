
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { getListingById } from '@/lib/mock-data';
import type { Listing } from '@/lib/types';
import { EditListingForm } from '@/components/listing-form/edit-listing-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2, UserCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function EditListingPage() {
  const params = useParams();
  const router = useRouter();
  const { id } = params;
  const { currentUser, loading: authLoading } = useAuth();

  const [listing, setListing] = useState<Listing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (!id || typeof id !== 'string') {
      setError("Invalid listing ID.");
      setIsLoading(false);
      return;
    }

    async function fetchListingData() {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedListing = await getListingById(id as string);
        if (fetchedListing) {
          setListing(fetchedListing);
          if (currentUser && fetchedListing.landownerId === currentUser.uid) {
            setIsAuthorized(true);
          } else if (currentUser) {
            // User is logged in but not owner
            setError("You are not authorized to edit this listing.");
            setIsAuthorized(false);
          } else if (!currentUser && !authLoading) {
            // User not logged in and auth check finished
            setError("Please log in to edit listings.");
            setIsAuthorized(false);
          }
          // If !currentUser && authLoading, we wait for auth to resolve
        } else {
          setError("Listing not found.");
        }
      } catch (e: any) {
        console.error("Error fetching listing for edit:", e);
        setError(e.message || "Failed to load listing data.");
      } finally {
        setIsLoading(false);
      }
    }
    // Fetch listing data only after auth state is resolved OR if ID is present
    if (!authLoading) {
        fetchListingData();
    } else if (id && authLoading) {
        // still loading auth, but we have an ID, wait for auth then fetch if needed
        // console.log("Edit page: Auth loading, will fetch listing after auth check.")
    }


  }, [id, currentUser, authLoading]);


  if (isLoading || authLoading) {
    return (
      <div className="flex justify-center items-center min-h-[300px] py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading listing for editing...</p>
      </div>
    );
  }

  if (error && !listing) { // If error and no listing data could be fetched
    return (
      <Card className="max-w-xl mx-auto my-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-6 w-6" /> Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>{error}</p>
          <Button asChild className="mt-4">
            <Link href="/my-listings"><ArrowLeft className="mr-2 h-4 w-4"/> Back to My Listings</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  if (!listing) { // Should be caught by above, but as a safeguard
     return (
      <Card className="max-w-xl mx-auto my-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-6 w-6" /> Listing Not Found
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>The listing you are trying to edit could not be found.</p>
           <Button asChild className="mt-4">
            <Link href="/my-listings"><ArrowLeft className="mr-2 h-4 w-4"/> Back to My Listings</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!currentUser) { // If still no current user after loading (e.g. forced navigation)
    return (
      <Card className="max-w-xl mx-auto my-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <UserCircle className="h-6 w-6" /> Authentication Required
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>You need to be logged in to edit this listing.</p>
          <Button asChild variant="outline" className="mt-4 mr-2">
            <Link href={`/login?redirect=${encodeURIComponent(`/listings/edit/${id}`)}`}>Log In</Link>
          </Button>
          <Button asChild className="mt-4">
            <Link href="/my-listings"><ArrowLeft className="mr-2 h-4 w-4"/> Back to My Listings</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!isAuthorized && currentUser) { // User is logged in but not the owner
     return (
      <Card className="max-w-xl mx-auto my-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-6 w-6" /> Unauthorized
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>You do not have permission to edit this listing.</p>
          <Button asChild className="mt-4">
            <Link href="/my-listings"><ArrowLeft className="mr-2 h-4 w-4"/> Back to My Listings</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  // If authorized and listing is available
  return (
    <div>
      <EditListingForm listing={listing} currentUserId={currentUser.uid} />
    </div>
  );
}
