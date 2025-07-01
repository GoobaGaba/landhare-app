
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, usePathname, useParams } from 'next/navigation';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { Listing, Review as ReviewType, User, PriceDetails, PricingModel, SubscriptionStatus } from '@/lib/types';
import { getListingById, getUserById, getReviewsForListing, addBookingRequest } from '@/lib/mock-data';
import { MapPin, DollarSign, Maximize, CheckCircle, MessageSquare, Star, CalendarDays, Award, AlertTriangle, Info, UserCircle, Loader2, Edit, TrendingUp, ExternalLink, Home, FileText, Plus, Bookmark, Sparkles } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { addDays, format, differenceInDays, isBefore, differenceInCalendarMonths, startOfMonth, endOfMonth } from 'date-fns';
import { useAuth } from '@/contexts/auth-context';
import { firebaseInitializationError } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle } from '@/components/ui/alert';

const calculatePriceDetails = (listing: Listing, dateRange: DateRange, renterSubscription: SubscriptionStatus): PriceDetails | null => {
  if (!listing || !dateRange?.from || !dateRange.to) return null;

  let baseRate = 0;
  let durationValue = 0;
  let durationUnitText: PriceDetails['durationUnit'] = 'days';
  let displayRateString = "";

  if (listing.pricingModel === 'nightly') {
    durationValue = differenceInDays(dateRange.to, dateRange.from) + 1;
    if (isNaN(durationValue) || durationValue <= 0) durationValue = 1;
    durationUnitText = durationValue === 1 ? 'night' : 'nights';
    baseRate = (listing.price || 0) * durationValue;
    displayRateString = `$${listing.price.toFixed(0)} / ${durationUnitText.replace('s', '')}`;
  } else if (listing.pricingModel === 'monthly') {
    durationValue = differenceInDays(dateRange.to, dateRange.from) + 1;
    if (isNaN(durationValue) || durationValue <= 0) durationValue = 1;
    baseRate = (listing.price / 30) * durationValue;
    durationUnitText = durationValue === 1 ? 'day' : 'days';
    displayRateString = `$${listing.price.toFixed(0)} / month (prorated for ${durationValue} ${durationUnitText})`;
  } else if (listing.pricingModel === 'lease-to-own') {
      const fullMonths = differenceInCalendarMonths(endOfMonth(dateRange.to), startOfMonth(dateRange.from)) + 1;
      durationValue = fullMonths > 0 ? fullMonths : 1;
      durationUnitText = fullMonths === 1 ? 'month' : 'months';
      baseRate = listing.price * durationValue;
      displayRateString = `$${listing.price.toFixed(0)} / month`;
  }
  else {
    return null;
  }

  const taxRate = 0.05;
  if (isNaN(baseRate)) baseRate = 0;
  const renterFee = (listing.pricingModel !== 'lease-to-own' && renterSubscription !== 'premium') ? 0.99 : 0;
  const subtotal = baseRate + renterFee;
  const estimatedTax = subtotal * taxRate;
  let totalPrice = subtotal + estimatedTax;
  if (isNaN(totalPrice)) totalPrice = baseRate > 0 ? baseRate : 0;

  return {
    basePrice: baseRate, renterFee, subtotal, estimatedTax, totalPrice,
    duration: durationValue, durationUnit: durationUnitText,
    pricingModelUsed: listing.pricingModel, displayRate: displayRateString,
  };
};

export default function ListingDetailPage() {
  // Core State & Hooks
  const params = useParams();
  const id = params.id as string;
  const { currentUser, loading: authLoading, subscriptionStatus, addBookmark, removeBookmark } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  // Component State
  const [listing, setListing] = useState<Listing | null>(null);
  const [landowner, setLandowner] = useState<User | null>(null);
  const [reviews, setReviews] = useState<ReviewType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [showReviewPlaceholderDialog, setShowReviewPlaceholderDialog] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);
  const isMockModeNoUser = firebaseInitializationError !== null && !currentUser?.appProfile;

  // Data Fetching Effect
  useEffect(() => {
    async function fetchData() {
      if (!id) {
        toast({ title: "Error", description: "Listing ID is missing.", variant: "destructive" });
        setIsLoading(false);
        setListing(null);
        return;
      }

      setIsLoading(true);
      try {
        // Step 1: Fetch the critical listing data. This is public.
        const listingData = await getListingById(id);
        setListing(listingData || null);

        if (listingData) {
          // Step 2: Fetch public review data.
          const reviewsData = await getReviewsForListing(listingData.id);
          setReviews(reviewsData);

          // Step 3: Attempt to fetch protected landowner data.
          // This will fail for public users, which is expected.
          try {
            const landownerData = await getUserById(listingData.landownerId);
            setLandowner(landownerData || null);
          } catch (landownerError) {
            // This is an expected failure for non-authenticated users due to security rules.
            // We can safely ignore it and the UI will adapt.
            console.warn(`Could not fetch landowner profile. This is expected for public viewers.`);
            setLandowner(null);
          }
        }
      } catch (error: any) {
        // This outer catch now only handles the critical failure of fetching the listing itself.
        console.error(`[ListingDetailPage] CRITICAL Error fetching listing data for ID ${id}:`, error);
        toast({ title: "Loading Error", description: "Could not load the main listing details.", variant: "destructive" });
        setListing(null); // Ensure listing is null on critical failure
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [id, toast]);
  
  // Memoized values for derived state
  const derivedData = useMemo(() => {
    const isBookmarked = currentUser?.appProfile?.bookmarkedListingIds?.includes(id) || false;
    const isCurrentUserLandowner = currentUser?.uid === listing?.landownerId;

    if (!listing) {
      return {
        mainImage: "https://placehold.co/1200x800.png",
        otherImages: ["https://placehold.co/600x400.png", "https://placehold.co/600x400.png"],
        displayAmount: "N/A",
        displayUnit: "",
        isBookmarked,
        isCurrentUserLandowner,
      };
    }
    
    const mainImage = listing.images && listing.images.length > 0 ? listing.images[0] : "https://placehold.co/1200x800.png";
    const otherImages = listing.images ? listing.images.slice(1, 3).map(img => img || "https://placehold.co/600x400.png") : ["https://placehold.co/600x400.png", "https://placehold.co/600x400.png"];

    let displayAmount = (listing.price || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    let displayUnit = 'month';
    if (listing.pricingModel === 'nightly') displayUnit = 'night';
    if (listing.pricingModel === 'lease-to-own') displayAmount = `Est. ${displayAmount}`;

    return { mainImage, otherImages, displayAmount, displayUnit, isBookmarked, isCurrentUserLandowner };
  }, [listing, currentUser, id]);

  const priceDetails = useMemo(() => {
    if (!listing || !dateRange) return null;
    return calculatePriceDetails(listing, dateRange, subscriptionStatus);
  }, [listing, dateRange, subscriptionStatus]);

  // Event Handlers
  const handleContactLandowner = useCallback(() => {
    if (!currentUser) {
      toast({ title: "Login Required", description: "Please log in to contact the landowner.", variant: "default" });
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    if (derivedData.isCurrentUserLandowner) {
      toast({ title: "Action Not Available", description: "You cannot contact yourself.", variant: "default" });
      return;
    }
    router.push(`/messages?contact=${listing?.landownerId}&listing=${listing?.id}`);
  }, [currentUser, derivedData.isCurrentUserLandowner, listing?.id, listing?.landownerId, pathname, router, toast]);

  const handleBookmarkToggle = useCallback(async () => {
    if (!currentUser) {
      toast({ title: "Login Required", description: "Please log in to bookmark listings." });
      router.push(`/login?redirect=${pathname}`);
      return;
    }
    if (!listing || listing.landownerId === currentUser.uid) {
      toast({ title: "Action Not Allowed", description: "You cannot bookmark your own listing." });
      return;
    }

    setIsBookmarking(true);
    try {
      if (derivedData.isBookmarked) {
        await removeBookmark(listing.id);
      } else {
        await addBookmark(listing.id);
      }
    } catch (error: any) {
      // Error toast is handled by AuthContext
    } finally {
      setIsBookmarking(false);
    }
  }, [currentUser, listing, derivedData.isBookmarked, pathname, router, toast, addBookmark, removeBookmark]);

  const handleBookingRequestOpen = useCallback(() => {
    if (!currentUser) {
      toast({ title: "Login Required", description: "Please log in to request a booking or inquire.", variant: "default" });
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    if (isMockModeNoUser) {
      toast({ title: "Preview Mode", description: "Booking is disabled in full preview mode (no mock user).", variant: "default" });
      return;
    }
    if (listing?.pricingModel !== 'lease-to-own' && (!dateRange || !dateRange.from || !dateRange.to)) {
      toast({ title: "Select Dates", description: "Please select a check-in and check-out date.", variant: "destructive" });
      return;
    }
    if (listing?.pricingModel === 'monthly' && listing.minLeaseDurationMonths && dateRange?.from && dateRange?.to) {
      const selectedDays = differenceInDays(dateRange.to, dateRange.from) + 1;
      if (selectedDays < listing.minLeaseDurationMonths * 28) {
        toast({
          title: "Minimum Lease Duration",
          description: `This monthly listing requires a minimum lease of ${listing.minLeaseDurationMonths} months. Your selection is ${selectedDays} days.`,
          variant: "destructive",
          duration: 7000,
        });
        return;
      }
    }
    setShowBookingDialog(true);
  }, [currentUser, isMockModeNoUser, listing, dateRange, pathname, router, toast]);

  const handleConfirmBooking = useCallback(async () => {
    if (!currentUser || !listing) {
      toast({ title: "Error", description: "User or listing data missing.", variant: "destructive" });
      return;
    }
    if (listing.pricingModel !== 'lease-to-own' && (!dateRange?.from || !dateRange?.to)) {
      toast({ title: "Error", description: "Date range is missing for this booking type.", variant: "destructive" });
      return;
    }
    if (isMockModeNoUser) {
      toast({ title: "Preview Mode", description: "Booking submission is disabled in full preview mode.", variant: "default" });
      setShowBookingDialog(false);
      return;
    }

    setIsSubmittingBooking(true);
    try {
      // Standardize all new bookings/inquiries to 'Pending Confirmation'
      const bookingStatus = 'Pending Confirmation';

      const bookingDataPayload = {
        listingId: listing.id,
        renterId: currentUser.uid,
        landownerId: listing.landownerId,
        dateRange: !dateRange?.from || !dateRange.to
          ? { from: new Date(), to: addDays(new Date(), (listing.minLeaseDurationMonths || 1) * 30) }
          : { from: dateRange.from, to: dateRange.to },
      };
      
      await addBookingRequest(bookingDataPayload, bookingStatus);

      setShowBookingDialog(false);
      toast({
        title: "Request Sent!",
        description: `Your request for "${listing.title}" has been sent. The landowner will review it shortly.`,
      });
      router.push('/bookings');
    } catch (error: any) {
      toast({
        title: listing.pricingModel === 'lease-to-own' ? "Inquiry Failed" : "Booking Failed",
        description: error.message || "Could not submit request.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingBooking(false);
    }
  }, [currentUser, listing, dateRange, isMockModeNoUser, router, toast]);

  const today = useMemo(() => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return d;
  }, []);

  // Render Logic: Early returns for loading/error states
  if (isLoading || authLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-var(--header-height,8rem)-var(--footer-height,4rem))]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-lg text-muted-foreground">Loading listing...</p>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Listing Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p>The listing you are looking for does not exist or could not be loaded.
                {firebaseInitializationError && " (Firebase features may be limited if not configured.)"}
            </p>
            <Button asChild className="mt-4">
              <Link href="/search">Back to Search</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { mainImage, otherImages, displayAmount, displayUnit, isBookmarked, isCurrentUserLandowner } = derivedData;
  
  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-6">
        <div className="relative w-full h-72 md:h-96 md:col-span-2 rounded-lg overflow-hidden shadow-lg">
          <Image src={mainImage} alt={listing.title} data-ai-hint={mainImage.includes('placehold.co') ? "listing placeholder" : "landscape field"} fill sizes="(max-width: 768px) 100vw, 1200px" className="object-cover" priority />
           {currentUser && !isCurrentUserLandowner && (
            <Button
              size="icon"
              variant="secondary"
              className={cn(
                "absolute top-4 right-4 z-10 rounded-full h-10 w-10 shadow-md",
                isBookmarked ? "text-primary bg-primary/20 hover:bg-primary/30" : "text-muted-foreground bg-background/80 hover:bg-background"
              )}
              onClick={handleBookmarkToggle}
              disabled={isBookmarking || isMockModeNoUser}
              title={isBookmarked ? "Remove bookmark" : "Add bookmark"}
            >
              {isBookmarking ? <Loader2 className="h-5 w-5 animate-spin" /> : <Bookmark className={cn("h-6 w-6", isBookmarked && "fill-primary stroke-primary")} />}
            </Button>
          )}
        </div>
        {otherImages.map((img, index) => (
          <div key={index} className="relative w-full h-48 md:h-72 rounded-lg overflow-hidden shadow-md">
            <Image src={img} alt={`${listing.title} - view ${index + 1}`} data-ai-hint={img.includes('placehold.co') ? "detail placeholder" : "nature detail"} fill sizes="50vw" className="object-cover" />
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <Card className="overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-3xl font-headline">{listing.title}</CardTitle>
                {listing.pricingModel === 'lease-to-own' && (
                    <Badge variant="outline" className="ml-2 text-sm bg-premium text-premium-foreground border-premium/80 tracking-wide whitespace-nowrap inline-flex items-center gap-1">
                        <Sparkles className="h-3 w-3" /> Lease-to-Own
                    </Badge>
                )}
              </div>
              <div className="flex items-center text-muted-foreground mt-1">
                <MapPin className="h-5 w-5 mr-2 text-primary" />
                <span>{listing.location}</span>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-foreground/90 leading-relaxed">{listing.description}</p>

              <Separator className="my-6" />
              <h3 className="text-xl font-semibold mb-3 font-headline">Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div className="flex items-center"><Maximize className="h-5 w-5 mr-2 text-primary" /> Size: {listing.sizeSqft.toLocaleString()} sq ft</div>
                <div className="flex items-center"><DollarSign className="h-5 w-5 mr-2 text-primary" />
                    Price: <span className="font-bold ml-1">{displayAmount}</span> / {displayUnit}
                </div>
                <div className="flex items-center col-span-1 sm:col-span-2"><CalendarDays className="h-5 w-5 mr-2 text-primary" /> Availability: {listing.isAvailable ? <span className="text-green-600 font-medium">Available</span> : <span className="text-red-600 font-medium">Not Available</span>}</div>
                {listing.leaseTerm && listing.pricingModel !== 'nightly' && (
                  <div className="flex items-center col-span-1 sm:col-span-2"><Info className="h-5 w-5 mr-2 text-primary" /> Lease Term: <span className="capitalize ml-1">{listing.leaseTerm}</span> {listing.minLeaseDurationMonths ? `(${listing.minLeaseDurationMonths}+ months)` : ''}</div>
                )}
                {listing.pricingModel === 'lease-to-own' && listing.leaseToOwnDetails && (
                  <div className="col-span-1 sm:col-span-2">
                    <h4 className="text-sm font-medium flex items-center mb-1"><Home className="h-4 w-4 mr-2 text-premium"/>Lease-to-Own Details:</h4>
                    <p className="text-xs text-muted-foreground whitespace-pre-line bg-muted/30 p-3 rounded-md">{listing.leaseToOwnDetails}</p>
                  </div>
                )}
              </div>

              <Separator className="my-6" />
              <h3 className="text-xl font-semibold mb-3 font-headline">Amenities</h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {listing.amenities.map(amenity => (
                  <li key={amenity} className="flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2 text-green-500" /> {amenity}
                  </li>
                ))}
                {listing.amenities.length === 0 && <li className="text-muted-foreground">No specific amenities listed.</li>}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl flex items-center font-headline">
                <Star className="h-6 w-6 mr-2 text-yellow-400 fill-yellow-400" />
                Reviews ({listing.numberOfRatings || reviews.length})
                {listing.rating !== undefined && <span className="ml-2 text-xl font-bold text-muted-foreground">{listing.rating.toFixed(1)}/5</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {reviews.length > 0 ? reviews.map(review => (
                <Card key={review.id} className="bg-muted/30">
                  <CardHeader className="flex flex-row justify-between items-start pb-2">
                    <div>
                      <CardTitle className="text-sm">{review.userName || `User...${review.userId.slice(-4)}`}</CardTitle>
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`h-4 w-4 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}`} />
                        ))}
                      </div>
                    </div>
                    <CardDescription className="text-xs">{format(review.createdAt instanceof Date ? review.createdAt : (review.createdAt as any).toDate(), "PPP")}</CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm pt-0">
                    {review.comment}
                  </CardContent>
                </Card>
              )) : <p className="text-muted-foreground">No reviews yet for this listing.</p>}
               <AlertDialog open={showReviewPlaceholderDialog} onOpenChange={setShowReviewPlaceholderDialog}>
                <AlertDialogTrigger asChild>
                    <Button variant="outline" className="mt-4" onClick={() => setShowReviewPlaceholderDialog(true)} disabled={isCurrentUserLandowner || isMockModeNoUser}>
                         <Edit className="mr-2 h-4 w-4" /> Write a Review
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Feature Coming Soon!</AlertDialogTitle>
                    <AlertDialogDescription>
                       The ability to write and submit reviews is currently a placeholder. Full review functionality will be added in a future update. Thank you for your patience!
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter><AlertDialogAction onClick={() => setShowReviewPlaceholderDialog(false)}>OK</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
           <Card className="mt-8 bg-muted/30">
            <CardHeader><CardTitle className="text-lg font-headline">Safety & Guidelines</CardTitle></CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-1">
              <p>Ensure you understand the land use rules.</p>
              <p>Communicate clearly with the landowner.</p>
              <p>All payments are processed securely through LandShare.</p>
              <Link href="/safety" className="text-primary hover:underline">Read our safety tips</Link>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 md:sticky md:top-24 self-start">
          <Card className={cn("shadow-xl", listing.isBoosted && "ring-1 ring-accent")}>
             <CardHeader className="pb-4">
                <div className="flex items-baseline justify-start gap-1.5">
                     <span className={cn("text-3xl font-bold font-body", listing.pricingModel === 'lease-to-own' ? "text-2xl" : "text-primary")}>
                        {displayAmount}
                    </span>
                    <span className="text-sm text-muted-foreground self-end pb-0.5">/ {displayUnit}</span>
                </div>
                {listing.pricingModel === 'lease-to-own' && (
                    <p className="text-xs text-premium tracking-wide -mt-2">Lease-to-Own Inquiry</p>
                )}
             </CardHeader>
             <CardContent className="space-y-4">
                {listing.isAvailable && !isCurrentUserLandowner && listing.pricingModel !== 'lease-to-own' && (
                  <div className="space-y-2">
                    <Label htmlFor="booking-calendar" className="font-medium block mb-1">Select Dates</Label>
                    <div className="overflow-x-auto custom-scrollbar">
                      <Calendar
                          id="booking-calendar"
                          mode="range"
                          selected={dateRange}
                          onSelect={setDateRange}
                          numberOfMonths={1}
                          fromDate={today}
                          disabled={(date) => isBefore(date, today)}
                          className="rounded-md border w-full"
                          classNames={{
                            head_cell: "text-muted-foreground rounded-md w-8 font-normal text-[0.75rem]",
                            cell: "h-8 w-8 text-center text-xs p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                            day: cn(buttonVariants({ variant: "ghost" }), "h-8 w-8 p-0 font-normal aria-selected:opacity-100"),
                            caption_label: "text-xs font-medium",
                          }}
                      />
                    </div>
                    {listing.pricingModel === 'monthly' && listing.minLeaseDurationMonths && (
                        <p className="text-xs text-accent flex items-center pt-1">
                            <AlertTriangle className="h-4 w-4 mr-1" /> Min. {listing.minLeaseDurationMonths}-month lease required for listed monthly rate. Shorter stays prorated.
                        </p>
                    )}
                  </div>
                )}
                {listing.pricingModel === 'lease-to-own' && listing.leaseToOwnDetails && (
                     <div>
                        <h4 className="text-sm font-medium flex items-center mb-1"><TrendingUp className="h-4 w-4 mr-2 text-premium"/>Key LTO Terms:</h4>
                        <p className="text-xs text-muted-foreground whitespace-pre-line bg-muted/30 p-3 rounded-md line-clamp-3 hover:line-clamp-none transition-all">
                            {listing.leaseToOwnDetails}
                        </p>
                     </div>
                )}

                {priceDetails && (
                  <div className="space-y-1 text-sm pt-2 border-t">
                    <div className="flex justify-between">
                        <span>{priceDetails.displayRate}</span>
                        <span>${priceDetails.basePrice.toFixed(2)}</span>
                    </div>
                    {priceDetails.renterFee > 0 && (
                         <div className="flex justify-between">
                            <span>Renter Service Fee:</span>
                            <span>${priceDetails.renterFee.toFixed(2)}</span>
                        </div>
                    )}
                    {subscriptionStatus === 'premium' && listing.pricingModel !== 'lease-to-own' && (
                        <div className="flex justify-between text-premium">
                            <span>Renter Service Fee (Premium Benefit!):</span>
                            <span>$0.00</span>
                        </div>
                    )}
                    <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>${priceDetails.subtotal.toFixed(2)}</span>
                    </div>
                     <div className="flex justify-between">
                        <span>Est. Taxes (5%):</span>
                        <span>${priceDetails.estimatedTax.toFixed(2)}</span>
                    </div>
                    <Separator className="my-1"/>
                    <div className="flex justify-between font-semibold text-base">
                        <span>Estimated Total:</span>
                        <span>${priceDetails.totalPrice.toFixed(2)}</span>
                    </div>
                  </div>
                )}
                 {!currentUser && !isCurrentUserLandowner && (
                     <p className="text-xs text-destructive flex items-center mt-2">
                        <UserCircle className="h-4 w-4 mr-1" /> Please <Link href={`/login?redirect=${encodeURIComponent(pathname)}`} className="underline hover:text-destructive/80 mx-1">log in</Link> to proceed.
                    </p>
                )}
                 {isMockModeNoUser && (
                    <p className="text-xs text-amber-600 flex items-center mt-2">
                        <AlertTriangle className="h-4 w-4 mr-1" /> Action disabled in preview mode.
                    </p>
                 )}
             </CardContent>
             <CardFooter className="flex flex-col gap-3 pt-4 border-t">
                {!isCurrentUserLandowner && (
                    <Button
                    size="lg"
                    className="w-full"
                    onClick={handleBookingRequestOpen}
                    disabled={
                        !listing.isAvailable ||
                        (listing.pricingModel !== 'lease-to-own' && (!dateRange?.from || !dateRange?.to)) ||
                        isSubmittingBooking ||
                        isMockModeNoUser
                    }
                    >
                     {isSubmittingBooking ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                    {listing.isAvailable ? (listing.pricingModel === 'lease-to-own' ? "Inquire about Lease-to-Own" : "Request to Book")
                        : "Currently Unavailable"}
                    </Button>
                )}
                {landowner && (
                  <div className="flex items-center gap-3 w-full pt-2 border-t border-dashed">
                    <Avatar className="h-10 w-10 border">
                      <AvatarImage src={landowner.avatarUrl} alt={landowner.name} data-ai-hint="person portrait" />
                      <AvatarFallback>{landowner.name ? landowner.name[0].toUpperCase() : 'L'}</AvatarFallback>
                    </Avatar>
                    <div className="text-sm">
                      <p className="font-medium text-foreground">{landowner.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center"><Award className="h-3 w-3 mr-1 text-accent"/> Verified Landowner</p>
                    </div>
                     {!isCurrentUserLandowner && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="ml-auto"
                            onClick={handleContactLandowner}
                            disabled={isMockModeNoUser}
                        >
                            <MessageSquare className="h-4 w-4 mr-1.5" /> Contact
                        </Button>
                     )}
                  </div>
                )}
                {!landowner && !isCurrentUserLandowner && (
                     <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleContactLandowner}
                        disabled={isMockModeNoUser}
                    >
                        <MessageSquare className="h-4 w-4 mr-2" /> Contact Landowner
                    </Button>
                )}

                {isCurrentUserLandowner && (
                    <Button variant="secondary" className="w-full" asChild>
                        <Link href={`/my-listings`}><ExternalLink className="mr-2 h-4 w-4"/>Manage My Listings</Link>
                    </Button>
                )}
             </CardFooter>
          </Card>
        </div>
      </div>

      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
                {listing.pricingModel === 'lease-to-own' ? "Confirm Your Inquiry" : "Confirm Your Booking Request"}
            </DialogTitle>
            <DialogDescription>
               Please review the details for "{listing.title}". This will send a request to the landowner for confirmation.
            </DialogDescription>
          </DialogHeader>
          {priceDetails && dateRange?.from && dateRange.to && (
            <div className="space-y-2 py-4 text-sm">
              <p><strong>Check-in:</strong> {format(dateRange.from, "PPP")}</p>
              <p><strong>Check-out:</strong> {format(dateRange.to, "PPP")}</p>
              <p><strong>Duration:</strong> {priceDetails.duration} {priceDetails.durationUnit}</p>
              <Separator className="my-2"/>
              <div className="flex justify-between">
                <span>{priceDetails.displayRate}</span>
                <span>${priceDetails.basePrice.toFixed(2)}</span>
              </div>
              {priceDetails.renterFee > 0 && <div className="flex justify-between"><span>Renter Service Fee:</span> <span>${priceDetails.renterFee.toFixed(2)}</span></div>}
              {subscriptionStatus === 'premium' && <div className="flex justify-between text-premium"><span>Renter Service Fee (Premium Benefit!):</span> <span>$0.00</span></div>}
              <div className="flex justify-between"><span>Subtotal:</span> <span>${priceDetails.subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Est. Taxes (5%):</span> <span>${priceDetails.estimatedTax.toFixed(2)}</span></div>
              <Separator className="my-2"/>
              <p className="text-lg font-semibold flex justify-between"><strong>Estimated Total:</strong> <span>${priceDetails.totalPrice.toFixed(2)}</span></p>
              {listing.pricingModel === 'monthly' && listing.minLeaseDurationMonths && priceDetails.duration && priceDetails.duration < (listing.minLeaseDurationMonths * 28) && ( 
                    <p className="text-sm text-destructive flex items-center">
                        <AlertTriangle className="h-4 w-4 mr-1" /> Selected duration is less than the minimum requirement of {listing.minLeaseDurationMonths} months for the listed monthly rate. Rate may be adjusted.
                    </p>
              )}
            </div>
          )}
          {listing.pricingModel === 'lease-to-own' && listing.leaseToOwnDetails && (
            <div className="py-4 space-y-2 text-sm">
                <p><strong>Listing:</strong> {listing.title}</p>
                <p><strong>Inquiry Type:</strong> Lease-to-Own</p>
                <h4 className="font-medium mt-2 text-premium">Key Terms from Landowner:</h4>
                <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-md whitespace-pre-line">{listing.leaseToOwnDetails}</p>
                <p className="text-xs text-muted-foreground mt-2">The landowner will receive your contact information and can discuss further details and specific terms with you.</p>
            </div>
          )}
           <p className="text-xs text-muted-foreground px-6">The landowner service fee (currently {currentUser?.appProfile?.subscriptionStatus === 'premium' ? "0.49%" : "2%"} of lease value) will be deducted from the landowner's payout for successful bookings.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBookingDialog(false)} disabled={isSubmittingBooking}>Cancel</Button>
            <Button onClick={handleConfirmBooking} disabled={
                isSubmittingBooking ||
                !currentUser || isMockModeNoUser ||
                (listing.pricingModel === 'monthly' && listing.minLeaseDurationMonths && priceDetails?.duration && priceDetails.duration < (listing.minLeaseDurationMonths * 28))
            }>
                {isSubmittingBooking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {listing.pricingModel === 'lease-to-own' ? "Send Inquiry" : "Send Booking Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
