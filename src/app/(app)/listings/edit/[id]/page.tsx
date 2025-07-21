
'use client';

import { Suspense } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { EditListingForm } from '@/components/listing-form/edit-listing-form';
import { useAuth } from '@/contexts/auth-context';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getListingById } from '@/lib/mock-data';
import type { Listing } from '@/lib/types';
import { AlertTriangle, UserCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { firebaseInitializationError } from '@/lib/firebase';

function EditListingPageContent() {
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
          if (currentUser && fetchedListing.landownerId === currentUser.uid) {
            setListing(fetchedListing);
            setIsAuthorized(true);
          } else if (currentUser) {
            setError("You are not authorized to edit this listing.");
            setIsAuthorized(false);
          } else if (!authLoading) {
            setError("Please log in to edit listings.");
            setIsAuthorized(false);
          }
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

    if (!authLoading) {
        fetchListingData();
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
  
  if (!currentUser) {
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

  if (error || !isAuthorized) {
    return (
      <Card className="max-w-xl mx-auto my-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-6 w-6" /> {error ? 'Error' : 'Unauthorized'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>{error || "You do not have permission to edit this listing."}</p>
          <Button asChild className="mt-4">
            <Link href="/my-listings"><ArrowLeft className="mr-2 h-4 w-4"/> Back to My Listings</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  if (!listing) {
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

  return <EditListingForm listing={listing} currentUserId={currentUser.uid} />;
}


export default function EditListingPage() {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey || apiKey.includes("...") || apiKey.length < 10) {
        return (
             <Card className="max-w-2xl mx-auto my-8">
                <CardHeader>
                    <CardTitle className="text-destructive flex items-center gap-2"><AlertTriangle/> Geocoding Service Error</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>The Google Maps API key is missing or invalid. This form requires geocoding services to verify locations.</p>
                     <p className="text-sm text-muted-foreground mt-2">
                        <strong>Action Required:</strong> For local development, ensure `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set in your `.env.local` file. For deployment, ensure it is set as an environment variable for your App Hosting backend.
                    </p>
                    <Button asChild variant="outline" className="mt-4"><Link href="/my-listings">Go Back</Link></Button>
                </CardContent>
            </Card>
        );
    }
  return (
    <APIProvider apiKey={apiKey}>
        <Suspense fallback={
            <Card className="w-full max-w-2xl mx-auto">
                <CardHeader><CardTitle>Edit Land Listing</CardTitle></CardHeader>
                <CardContent className="flex justify-center items-center min-h-[300px]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="ml-2">Loading form...</p>
                </CardContent>
            </Card>
        }>
            <EditListingPageContent />
        </Suspense>
    </APIProvider>
  );
}
