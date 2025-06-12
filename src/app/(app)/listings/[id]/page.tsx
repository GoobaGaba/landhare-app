
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { use, useState, useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { Listing, Review as ReviewType, User, PriceDetails, PricingModel } from '@/lib/types';
import { getListingById, getUserById, getReviewsForListing, addBookingRequest } from '@/lib/mock-data';
import { MapPin, DollarSign, Maximize, CheckCircle, MessageSquare, Star, CalendarDays, Award, AlertTriangle, Info, UserCircle, Loader2, Edit, TrendingUp, ExternalLink, Home, FileText } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { addDays, format, differenceInDays, isBefore, differenceInCalendarMonths, startOfMonth, endOfMonth } from 'date-fns';
import { useAuth } from '@/contexts/auth-context';
import { firebaseInitializationError } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';


export default function ListingDetailPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(paramsPromise);
  const { id } = resolvedParams;

  const { currentUser, loading: authLoading, subscriptionStatus } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [landowner, setLandowner] = useState<User | null>(null);
  const [reviews, setReviews] = useState<ReviewType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [isBookingRequested, setIsBookingRequested] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function fetchData() {
      if (firebaseInitializationError) {
        toast({
            title: "Preview Mode Active",
            description: "Firebase not configured. Displaying sample listing data.",
            variant: "default",
            duration: 5000
        });
      }
      setIsLoading(true);
      try {
        const listingData = await getListingById(id);
        setListing(listingData || null);

        if (listingData) {
          const landownerData = await getUserById(listingData.landownerId);
          setLandowner(landownerData || null);
          const reviewsData = await getReviewsForListing(listingData.id);
          setReviews(reviewsData);
        }
      } catch (error: any) {
        console.error("Error fetching listing data:", error);
        toast({ title: "Loading Error", description: error.message || "Could not load listing details.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
    if (id) {
        fetchData();
    }
  }, [id, toast]);

  const handleContactLandowner = () => {
    if (!currentUser) {
      toast({ title: "Login Required", description: "Please log in to contact the landowner.", variant: "default" });
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    if (isCurrentUserLandowner) {
      toast({ title: "Action Not Available", description: "You cannot contact yourself.", variant: "default" });
      return;
    }
    router.push(`/messages?contact=${listing?.landownerId}&listing=${listing?.id}`);
  };

  const today = new Date();
  today.setHours(0,0,0,0);

  const priceDetails: PriceDetails | null = useMemo(() => {
    if (!listing || (listing.pricingModel !== 'lease-to-own' && (!dateRange || !dateRange.from || !dateRange.to))) {
      return null;
    }

    let baseRate = 0;
    let durationValue = 0;
    let durationUnitText: PriceDetails['durationUnit'] = 'days';
    let displayRateString = "";
    const taxRate = 0.05; // 5% tax

    if (listing.pricingModel === 'nightly' && dateRange?.from && dateRange?.to) {
      durationValue = differenceInDays(dateRange.to, dateRange.from) + 1;
      if (isNaN(durationValue) || durationValue <= 0) durationValue = 1;
      durationUnitText = durationValue === 1 ? 'night' : 'nights';
      baseRate = (listing.price || 0) * durationValue;
      displayRateString = `$${listing.price.toFixed(0)}/${durationValue === 1 ? 'night' : 'nights'}`;
    } else if (listing.pricingModel === 'monthly' && dateRange?.from && dateRange?.to) {
      durationValue = differenceInDays(dateRange.to, dateRange.from) + 1; 
      if (isNaN(durationValue) || durationValue <= 0) durationValue = 1;
      baseRate = (listing.price / 30) * durationValue; 
      durationUnitText = durationValue === 1 ? 'day' : 'days';
      displayRateString = `$${listing.price.toFixed(0)}/month (prorated for ${durationValue} ${durationUnitText})`;
    } else if (listing.pricingModel === 'lease-to-own') {
      durationValue = 1; 
      durationUnitText = 'month';
      baseRate = listing.price || 0; 
      displayRateString = `Est. $${listing.price.toFixed(0)}/month (LTO)`;
    } else {
      return null;
    }
    
    if (isNaN(baseRate)) baseRate = 0;

    const renterFee = (listing.pricingModel !== 'lease-to-own' && subscriptionStatus !== 'premium') ? 0.99 : 0;
    const subtotal = baseRate + renterFee;
    const estimatedTax = subtotal * taxRate;
    let totalPrice = subtotal + estimatedTax;
    
    if (isNaN(totalPrice)) totalPrice = baseRate > 0 ? baseRate : 0; 

    return {
      basePrice: baseRate,
      renterFee: renterFee,
      subtotal: subtotal,
      estimatedTax: estimatedTax,
      totalPrice,
      duration: durationValue,
      durationUnit: durationUnitText,
      pricingModelUsed: listing.pricingModel,
      displayRate: displayRateString,
    };
  }, [dateRange, listing, subscriptionStatus]);


  const handleBookingRequestOpen = () => {
    if (!currentUser) {
      toast({ title: "Login Required", description: "Please log in to request a booking or inquire.", variant: "default" });
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
     if (firebaseInitializationError && !currentUser?.appProfile) { // Already checked currentUser above
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
            });
            return;
        }
    }
    setShowBookingDialog(true);
  };

  const handleConfirmBooking = async () => {
    if (!currentUser || !listing) return; // currentUser check is redundant here if handleBookingRequestOpen did its job
    if (listing.pricingModel !== 'lease-to-own' && (!dateRange?.from || !dateRange?.to)) {
        toast({ title: "Error", description: "Date range is missing for this booking type.", variant: "destructive"});
        return;
    }

     if (firebaseInitializationError && !currentUser?.appProfile) {
      toast({ title: "Preview Mode", description: "Booking submission is disabled in full preview mode.", variant: "default" });
      setShowBookingDialog(false);
      return;
    }

    try {
       const bookingData = {
        listingId: listing.id,
        renterId: currentUser.uid,
        landownerId: listing.landownerId,
        dateRange: listing.pricingModel !== 'lease-to-own' && dateRange?.from && dateRange.to
                     ? { from: dateRange.from, to: dateRange.to }
                     : { from: new Date(), to: addDays(new Date(), (listing.minLeaseDurationMonths || 1) * 30) }, 
      };
      await addBookingRequest(bookingData);

      setShowBookingDialog(false);
      setIsBookingRequested(true);
      toast({
        title: listing.pricingModel === 'lease-to-own' ? "Inquiry Sent!" : "Booking Request Submitted!",
        description: listing.pricingModel === 'lease-to-own'
            ? `Your inquiry for "${listing.title}" has been sent to the landowner.`
            : `Your request for "${listing.title}" for ${priceDetails?.duration || ''} ${priceDetails?.durationUnit || ''} has been sent.`,
      });
    } catch (error: any) {
      toast({
        title: listing.pricingModel === 'lease-to-own' ? "Inquiry Failed" : "Booking Failed",
        description: error.message || "Could not submit request.",
        variant: "destructive",
      });
    }
  };

  if (isLoading || authLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-var(--header-height,8rem)-var(--footer-height,4rem))]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-lg text-muted-foreground">Loading listing...</p>
      </div>
    );
  }

  if (!listing && !isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Listing Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p>The listing you are looking for does not exist or could not be loaded.
                {firebaseInitializationError && " (Currently displaying sample data due to Firebase configuration issue.)"}
            </p>
            <Button asChild className="mt-4">
              <Link href="/search">Back to Search</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isCurrentUserLandowner = currentUser?.uid === listing?.landownerId;
  const mainImage = listing?.images && listing.images.length > 0 ? listing.images[0] : "https://placehold.co/1200x800.png?text=Listing+Image";
  const otherImages = listing?.images ? listing.images.slice(1,3) : []; 

  const getPriceDisplay = () => {
    if (!listing) return { amount: "0", unit: "month", model: 'monthly' as PricingModel };
    const priceAmount = (listing.price || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    switch(listing.pricingModel) {
      case 'nightly': return { amount: priceAmount, unit: "night", model: listing.pricingModel };
      case 'monthly': return { amount: priceAmount, unit: "month", model: listing.pricingModel };
      case 'lease-to-own': return { amount: `Est. ${priceAmount}`, unit: "month", model: listing.pricingModel };
      default: return { amount: priceAmount, unit: "month", model: 'monthly' as PricingModel };
    }
  };
  const displayPriceInfo = getPriceDisplay();


  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-6">
        <div className="relative w-full h-72 md:h-96 md:col-span-2 rounded-lg overflow-hidden shadow-lg">
          <Image src={mainImage} alt={listing.title} data-ai-hint="landscape field" fill sizes="(max-width: 768px) 100vw, 1200px" className="object-cover" priority />
        </div>
        {otherImages.map((img, index) => (
          <div key={index} className="relative w-full h-48 md:h-72 rounded-lg overflow-hidden shadow-md">
            <Image src={img} alt={`${listing.title} - view ${index + 1}`} data-ai-hint="nature detail" fill sizes="50vw" className="object-cover" />
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <Card className="overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-3xl font-headline">{listing.title}</CardTitle>
              <div className="flex items-center text-muted-foreground mt-1">
                <MapPin className="h-5 w-5 mr-2 text-primary" />
                <span>{listing.location}</span>
              </div>
               {listing.pricingModel === 'lease-to-own' && (
                  <Badge variant="secondary" className="mt-2 w-fit bg-accent/20 text-accent-foreground border-accent">Lease-to-Own Opportunity</Badge>
              )}
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-foreground/90 leading-relaxed">{listing.description}</p>

              <Separator className="my-6" />
              <h3 className="text-xl font-semibold mb-3 font-headline">Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div className="flex items-center"><Maximize className="h-5 w-5 mr-2 text-primary" /> Size: {listing.sizeSqft.toLocaleString()} sq ft</div>
                <div className="flex items-center"><DollarSign className="h-5 w-5 mr-2 text-primary" />
                    Price: <span className="font-bold ml-1">{displayPriceInfo.model === 'lease-to-own' ? displayPriceInfo.amount : `$${displayPriceInfo.amount}`}</span> / {displayPriceInfo.unit}
                </div>
                <div className="flex items-center col-span-1 sm:col-span-2"><CalendarDays className="h-5 w-5 mr-2 text-primary" /> Availability: {listing.isAvailable ? <span className="text-green-600 font-medium">Available</span> : <span className="text-red-600 font-medium">Not Available</span>}</div>
                {listing.leaseTerm && listing.pricingModel !== 'nightly' && (
                  <div className="flex items-center col-span-1 sm:col-span-2"><Info className="h-5 w-5 mr-2 text-primary" /> Lease Term: <span className="capitalize ml-1">{listing.leaseTerm}</span> {listing.minLeaseDurationMonths ? `(${listing.minLeaseDurationMonths}+ months)` : ''}</div>
                )}
                {listing.pricingModel === 'lease-to-own' && listing.leaseToOwnDetails && (
                  <div className="col-span-1 sm:col-span-2">
                    <h4 className="text-sm font-medium flex items-center mb-1"><Home className="h-4 w-4 mr-2 text-primary"/>Lease-to-Own Details:</h4>
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
               <AlertDialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
                <AlertDialogTrigger asChild>
                    {/* Review button is visually enabled; actual submission would be auth-gated. */}
                    <Button variant="outline" className="mt-4" disabled={isCurrentUserLandowner || (firebaseInitializationError !== null && !currentUser?.appProfile)}>
                         <Edit className="mr-2 h-4 w-4" /> Write a Review
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Feature Coming Soon</AlertDialogTitle>
                    <AlertDialogDescription>
                      The ability to write and submit reviews is currently under development. This is a placeholder for that functionality. Submitting reviews will require you to be logged in.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter><AlertDialogAction onClick={() => setShowReviewDialog(false)}>OK</AlertDialogAction></AlertDialogFooter>
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
          <Card className={cn("shadow-xl border-primary/30", listing.isBoosted && "ring-1 ring-accent")}>
             <CardHeader className="pb-4">
                <div className="flex items-baseline justify-start gap-1.5">
                     <span className={cn("text-3xl font-bold font-body", displayPriceInfo.model === 'lease-to-own' ? "text-2xl" : "text-primary")}>
                        {displayPriceInfo.model === 'lease-to-own' ? displayPriceInfo.amount : `$${displayPriceInfo.amount}`}
                    </span>
                    <span className="text-sm text-muted-foreground self-end pb-0.5">/ {displayPriceInfo.unit}</span>
                </div>
                {listing.pricingModel === 'lease-to-own' && (
                    <p className="text-xs text-muted-foreground -mt-2">Lease-to-Own Inquiry</p>
                )}
             </CardHeader>
             <CardContent className="space-y-4">
                {listing.isAvailable && !isCurrentUserLandowner && listing.pricingModel !== 'lease-to-own' && (
                  <div className="space-y-2">
                    <Label htmlFor="booking-calendar" className="font-medium block mb-1">Select Dates</Label>
                    <Calendar
                        id="booking-calendar"
                        mode="range"
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={1}
                        fromDate={today}
                        disabled={(date) => isBefore(date, today) || (firebaseInitializationError !== null && !currentUser?.appProfile)}
                        className="rounded-md border w-full"
                    />
                    {listing.pricingModel === 'monthly' && listing.minLeaseDurationMonths && (
                        <p className="text-xs text-accent flex items-center pt-1">
                            <AlertTriangle className="h-4 w-4 mr-1" /> Min. {listing.minLeaseDurationMonths}-month lease required for listed monthly rate. Shorter stays prorated.
                        </p>
                    )}
                  </div>
                )}
                {listing.pricingModel === 'lease-to-own' && listing.leaseToOwnDetails && (
                     <div>
                        <h4 className="text-sm font-medium flex items-center mb-1"><TrendingUp className="h-4 w-4 mr-2 text-primary"/>Key LTO Terms:</h4>
                        <p className="text-xs text-muted-foreground whitespace-pre-line bg-muted/30 p-3 rounded-md line-clamp-3 hover:line-clamp-none transition-all">
                            {listing.leaseToOwnDetails}
                        </p>
                     </div>
                )}

                {priceDetails && listing.pricingModel !== 'lease-to-own' && dateRange?.from && dateRange?.to && (
                  <div className="space-y-1 text-sm pt-2 border-t">
                    <div className="flex justify-between">
                        <span>{priceDetails.displayRate} ({priceDetails.duration} {priceDetails.durationUnit})</span>
                        <span>${(typeof priceDetails.basePrice === 'number' && !isNaN(priceDetails.basePrice)) ? priceDetails.basePrice.toFixed(2) : '--'}</span>
                    </div>
                    {priceDetails.renterFee > 0 && (
                         <div className="flex justify-between">
                            <span>Renter Service Fee:</span>
                            <span>${priceDetails.renterFee.toFixed(2)}</span>
                        </div>
                    )}
                    {subscriptionStatus === 'premium' && listing.pricingModel !== 'lease-to-own' && (
                        <div className="flex justify-between text-primary">
                            <span>Renter Service Fee (Premium Benefit!):</span>
                            <span>$0.00</span>
                        </div>
                    )}
                    <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>${(typeof priceDetails.subtotal === 'number' && !isNaN(priceDetails.subtotal)) ? priceDetails.subtotal.toFixed(2) : '--'}</span>
                    </div>
                     <div className="flex justify-between">
                        <span>Est. Taxes (5%):</span>
                        <span>${(typeof priceDetails.estimatedTax === 'number' && !isNaN(priceDetails.estimatedTax)) ? priceDetails.estimatedTax.toFixed(2) : '--'}</span>
                    </div>
                    <Separator className="my-1"/>
                    <div className="flex justify-between font-semibold text-base">
                        <span>Estimated Total:</span>
                        <span>${(typeof priceDetails.totalPrice === 'number' && !isNaN(priceDetails.totalPrice)) ? priceDetails.totalPrice.toFixed(2) : '--'}</span>
                    </div>
                  </div>
                )}
                 {!currentUser && !isCurrentUserLandowner && (
                     <p className="text-xs text-destructive flex items-center mt-2">
                        <UserCircle className="h-4 w-4 mr-1" /> Please <Link href={`/login?redirect=${encodeURIComponent(pathname)}`} className="underline hover:text-destructive/80 mx-1">log in</Link> to proceed.
                    </p>
                )}
                 {firebaseInitializationError && !currentUser?.appProfile && (
                    <p className="text-xs text-amber-600 flex items-center mt-2">
                        <AlertTriangle className="h-4 w-4 mr-1" /> Action disabled in preview mode without mock user login.
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
                        isBookingRequested ||
                        (firebaseInitializationError !== null && !currentUser?.appProfile)
                    }
                    >
                    {isBookingRequested ? (listing.pricingModel === 'lease-to-own' ? "Inquiry Sent" : "Booking Requested")
                        : (listing.isAvailable ? (listing.pricingModel === 'lease-to-own' ? "Inquire about Lease-to-Own" : "Request to Book")
                        : "Currently Unavailable")}
                    </Button>
                )}
                {landowner && (
                  <div className="flex items-center gap-3 w-full pt-2 border-t border-dashed">
                    <Avatar className="h-10 w-10 border">
                      <AvatarImage src={landowner.avatarUrl} alt={landowner.name} />
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
                            disabled={(firebaseInitializationError !== null && !currentUser?.appProfile)}
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
                        disabled={(firebaseInitializationError !== null && !currentUser?.appProfile)}
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
               {listing.pricingModel === 'lease-to-own'
                ? `You are about to send an inquiry for "${listing.title}". The landowner will contact you.`
                : `Please review the details of your booking request for "${listing.title}".`}
            </DialogDescription>
          </DialogHeader>
          {listing.pricingModel !== 'lease-to-own' && priceDetails && dateRange?.from && dateRange?.to && (
            <div className="space-y-2 py-4 text-sm">
              <p><strong>Check-in:</strong> {format(dateRange.from, "PPP")}</p>
              <p><strong>Check-out:</strong> {format(dateRange.to, "PPP")}</p>
              <p><strong>Duration:</strong> {priceDetails.duration} {priceDetails.durationUnit}</p>
              <Separator className="my-2"/>
              <div className="flex justify-between">
                <span>{priceDetails.displayRate}:</span>
                <span>${(typeof priceDetails.basePrice === 'number' && !isNaN(priceDetails.basePrice)) ? priceDetails.basePrice.toFixed(2) : '--'}</span>
              </div>
              {priceDetails.renterFee > 0 && <div className="flex justify-between"><span>Renter Service Fee:</span> <span>${priceDetails.renterFee.toFixed(2)}</span></div>}
              {subscriptionStatus === 'premium' && <div className="flex justify-between text-primary"><span>Renter Service Fee (Premium Benefit!):</span> <span>$0.00</span></div>}
              <div className="flex justify-between"><span>Subtotal:</span> <span>${(typeof priceDetails.subtotal === 'number' && !isNaN(priceDetails.subtotal)) ? priceDetails.subtotal.toFixed(2) : '--'}</span></div>
              <div className="flex justify-between"><span>Est. Taxes (5%):</span> <span>${(typeof priceDetails.estimatedTax === 'number' && !isNaN(priceDetails.estimatedTax)) ? priceDetails.estimatedTax.toFixed(2) : '--'}</span></div>
              <Separator className="my-2"/>
              <p className="text-lg font-semibold flex justify-between"><strong>Estimated Total:</strong> <span>${(typeof priceDetails.totalPrice === 'number' && !isNaN(priceDetails.totalPrice)) ? priceDetails.totalPrice.toFixed(2) : '--'}</span></p>
              {listing.pricingModel === 'monthly' && listing.minLeaseDurationMonths && priceDetails.duration < (listing.minLeaseDurationMonths * 28) && ( 
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
                <h4 className="font-medium mt-2">Key Terms from Landowner:</h4>
                <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-md whitespace-pre-line">{listing.leaseToOwnDetails}</p>
                <p className="text-xs text-muted-foreground mt-2">The landowner will receive your contact information and can discuss further details and specific terms with you.</p>
            </div>
          )}
           <p className="text-xs text-muted-foreground px-6">The landowner service fee (currently {currentUser?.appProfile?.subscriptionStatus === 'premium' ? "0.49%" : "2%"} of lease value) will be deducted from the landowner's payout for successful bookings.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBookingDialog(false)}>Cancel</Button>
            <Button onClick={handleConfirmBooking} disabled={
                !currentUser || (firebaseInitializationError !== null && !currentUser?.appProfile) ||
                (listing.pricingModel === 'monthly' && listing.minLeaseDurationMonths && priceDetails && (differenceInDays(dateRange?.to || new Date(), dateRange?.from || new Date()) + 1) < (listing.minLeaseDurationMonths * 28))
            }>
                {listing.pricingModel === 'lease-to-own' ? "Send Inquiry" : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
