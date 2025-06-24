
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { useListingsData } from '@/hooks/use-listings-data';
import { useToast } from '@/hooks/use-toast';
import { FREE_TIER_LISTING_LIMIT } from '@/lib/mock-data';
import { deleteMultipleListingsAction } from '@/app/(app)/my-listings/actions';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Loader2, ArrowLeft, Trash2, ShieldCheck, Home } from 'lucide-react';
import type { Listing } from '@/lib/types';

export default function DowngradePage() {
  const { currentUser, subscriptionStatus, updateCurrentAppUserProfile, loading: authLoading } = useAuth();
  const { myListings, isLoading: listingsLoading, refreshListings } = useListingsData();
  const router = useRouter();
  const { toast } = useToast();

  const [selectedListings, setSelectedListings] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Redirect if user shouldn't be here
    if (!authLoading && !listingsLoading) {
      if (subscriptionStatus !== 'premium' || myListings.length <= FREE_TIER_LISTING_LIMIT) {
        router.replace('/profile');
      }
    }
  }, [currentUser, subscriptionStatus, myListings, authLoading, listingsLoading, router]);

  const listingsOverLimit = useMemo(() => myListings.length - FREE_TIER_LISTING_LIMIT, [myListings.length]);
  const canDowngrade = selectedListings.length >= listingsOverLimit;

  const handleToggleListing = (listingId: string) => {
    setSelectedListings(prev =>
      prev.includes(listingId)
        ? prev.filter(id => id !== listingId)
        : [...prev, listingId]
    );
  };

  const handleDeleteAndDowngrade = async () => {
    if (!canDowngrade) {
      toast({ title: "Selection Required", description: `Please select at least ${listingsOverLimit} listing(s) to delete.`, variant: "destructive" });
      return;
    }
    
    setIsProcessing(true);
    try {
      const deleteResult = await deleteMultipleListingsAction(selectedListings);
      if (!deleteResult.success) {
        throw new Error(deleteResult.message || "Failed to delete listings.");
      }
      
      toast({ title: "Listings Deleted", description: deleteResult.message });
      refreshListings();

      const downgradeResult = await updateCurrentAppUserProfile({ subscriptionStatus: 'free' });
      if (downgradeResult) {
        toast({ title: "Downgrade Successful", description: "Your account is now on the Free tier." });
        router.push('/profile');
      } else {
         throw new Error("Could not update your subscription status after deleting listings.");
      }

    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };


  if (authLoading || listingsLoading || myListings.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading listing information...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            Manage Listings to Downgrade
          </CardTitle>
          <CardDescription>
            Your Premium plan allows for unlimited listings. The Free tier is limited to {FREE_TIER_LISTING_LIMIT} listings. To switch to the Free plan, you must reduce your active listings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <Home className="h-4 w-4" />
            <AlertTitle>Action Required</AlertTitle>
            <AlertDescription>
              You currently have <strong>{myListings.length}</strong> active listings. You must delete at least <strong>{listingsOverLimit}</strong> listing(s) to proceed with downgrading.
            </AlertDescription>
          </Alert>

          <div className="mt-6 space-y-4">
            <h3 className="font-semibold">Select listings to permanently delete:</h3>
            <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar border p-4 rounded-md">
              {myListings.map(listing => (
                <div key={listing.id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/50">
                  <Checkbox
                    id={`listing-${listing.id}`}
                    checked={selectedListings.includes(listing.id)}
                    onCheckedChange={() => handleToggleListing(listing.id)}
                  />
                  <Label htmlFor={`listing-${listing.id}`} className="flex-grow cursor-pointer">{listing.title}</Label>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Selected to delete: <strong>{selectedListings.length}</strong> / {listingsOverLimit} (minimum)
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="ghost" asChild>
            <Link href="/profile">
              <ShieldCheck className="mr-2 h-4 w-4" /> Keep Premium Plan
            </Link>
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteAndDowngrade}
            disabled={!canDowngrade || isProcessing}
          >
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            Delete Selected & Downgrade
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
