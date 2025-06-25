
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
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
import { AlertTriangle, Loader2, Trash2, ShieldCheck, Home, Star, DollarSign } from 'lucide-react';
import type { Listing } from '@/lib/types';
import { cn } from '@/lib/utils';

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


  if (authLoading || listingsLoading || (myListings.length > 0 && listingsOverLimit <= 0)) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Verifying your listing status...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
            Manage Listings to Downgrade
          </CardTitle>
          <CardDescription>
            Your Premium plan allows for unlimited listings. The Free tier is limited to {FREE_TIER_LISTING_LIMIT} listings. To switch to the Free plan, you must reduce your active listings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="default" className="border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-500/50">
            <Home className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertTitle className="text-amber-800 dark:text-amber-200 font-semibold">Action Required</AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              You currently have <strong>{myListings.length}</strong> active listings. You must delete at least <strong>{listingsOverLimit}</strong> listing(s) to proceed with downgrading.
            </AlertDescription>
          </Alert>

          <div className="mt-6 space-y-4">
            <h3 className="font-semibold text-lg">Select listings to permanently delete:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto custom-scrollbar p-1">
              {myListings.map(listing => (
                 <Card
                  key={listing.id}
                  onClick={() => handleToggleListing(listing.id)}
                  className={cn(
                    'relative transition-all cursor-pointer hover:bg-muted/50',
                    selectedListings.includes(listing.id) && 'ring-2 ring-destructive border-destructive'
                  )}
                >
                  <Checkbox
                    id={`listing-${listing.id}`}
                    className="absolute top-3 left-3 h-5 w-5 z-10 bg-background"
                    checked={selectedListings.includes(listing.id)}
                    readOnly
                  />
                  <div className="flex items-start p-3 pl-10 gap-3">
                    <div className="relative h-24 w-24 flex-shrink-0">
                      <Image
                        src={listing.images[0] || 'https://placehold.co/400x400.png'}
                        alt={listing.title}
                        data-ai-hint="property placeholder"
                        fill
                        className="object-cover rounded-md"
                      />
                    </div>
                    <div className="flex-grow">
                      <p className="font-semibold leading-tight line-clamp-2">{listing.title}</p>
                      <div className="text-xs text-muted-foreground mt-2 space-y-1">
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-yellow-500" />
                          <span>{listing.rating?.toFixed(1) || 'No rating'} ({listing.numberOfRatings || 0} reviews)</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3 text-green-600" />
                          <span>${(listing.price * (Math.random() * 10 + 2)).toFixed(0)} mock earnings</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            <p className="text-sm text-muted-foreground font-medium">
              Selected to delete: <strong className={cn(selectedListings.length >= listingsOverLimit ? 'text-green-600' : 'text-destructive')}>{selectedListings.length}</strong> / {listingsOverLimit} (minimum)
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between flex-wrap gap-4 pt-6">
           <Button
            onClick={() => router.push('/profile')}
            className="bg-premium text-premium-foreground hover:bg-premium/90"
          >
            <ShieldCheck className="mr-2 h-4 w-4" /> Keep Premium Plan
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteAndDowngrade}
            disabled={!canDowngrade || isProcessing}
          >
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            Delete {selectedListings.length > 0 ? `${selectedListings.length} Listing(s)` : ''} & Downgrade
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
