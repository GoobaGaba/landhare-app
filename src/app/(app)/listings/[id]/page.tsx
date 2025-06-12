
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { use, useState, useEffect, useMemo, useCallback } from 'react'; // Import use
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import type { Listing, Review as ReviewType, User, PricingModel as ListingPricingModel } from '@/lib/types';
import { getListingById, getUserById, getReviewsForListing, addBookingRequest } from '@/lib/mock-data';
import { MapPin, DollarSign, Maximize, CheckCircle, MessageSquare, Star, CalendarDays, Award, AlertTriangle, Info, UserCircle, Loader2, Edit, TrendingUp, ExternalLink, Home } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { addDays, format, differenceInCalendarMonths, differenceInDays, startOfMonth, endOfMonth, isBefore } from 'date-fns';
import { useAuth } from '@/contexts/auth-context';
import { firebaseInitializationError } from '@/lib/firebase';
import { cn } from '@/lib/utils';

interface PriceDetails {
  basePrice: number;
  renterFee: number;
  totalPrice: number;
  duration: number;
  durationUnit: 'night' | 'month' | 'nights' | 'months';
  pricingModelUsed: ListingPricingModel;
}

// Update the params prop type to Promise<{ id: string }> as per the warning
export default function ListingDetailPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = use(paramsPromise); // Unwrap the promise to get the params object
  const { id } = params; // Destructure id from the resolved params

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
        // Use the resolved 'id' here
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
    if (id) { // Ensure id is available (it should be after `use(paramsPromise)`)
        fetchData();
    }
  }, [id, toast]); // 'id' is now stable from the use(paramsPromise) call

  const handleContactLandowner = () => {
    if (!currentUser) {
      toast({ title: "Login Required", description: "Please log in to contact the landowner.", variant: "destructive" });
      router.push('/login');
      return;
    }
    if (isCurrentUserLandowner) {
      toast({ title: "Action Not Available", description: "You cannot contact yourself.", variant: "default" });
      return;
    }
    router.push('/messages');
  };

  const today = new Date();
  today.setHours(0,0,0,0);

  const priceDetails: PriceDetails | null = useMemo(() => {
    if (!dateRange || !dateRange.from || !dateRange.to || !listing) return null;
    
    let durationValue = 0;
    let durationUnitText: PriceDetails['durationUnit'] = 'nights';
    let baseRate = 0;

    if (listing.pricingModel === 'nightly') {
      durationValue = differenceInDays(dateRange.to, dateRange.from) + 1; // +1 to include the start day
      durationUnitText = durationValue === 1 ? 'night' : 'nights';
      baseRate = listing.price * durationValue;
    } else if (listing.pricingModel === 'monthly') {
      durationValue = differenceInCalendarMonths(endOfMonth(dateRange.to), startOfMonth(dateRange.from)) + 1;
      if (durationValue <= 0) durationValue = 1; // Ensure at least 1 month for short selections
      durationUnitText = durationValue === 1 ? 'month' : 'months';
      baseRate = listing.price * durationValue;
    } else { // 'lease-to-own'
      durationValue = 1; 
      durationUnitText = 'month';
      baseRate = listing.price; 
    }
    
    const renterFee = subscriptionStatus === 'premium' ? 0 : 0.99; 
    const totalPrice = baseRate + (listing.pricingModel !== 'lease-to-own' ? renterFee : 0);

    return { 
      basePrice: baseRate, 
      renterFee: listing.pricingModel !== 'lease-to-own' ? renterFee : 0,
      totalPrice, 
      duration: durationValue, 
      durationUnit: durationUnitText,
      pricingModelUsed: listing.pricingModel,
    };
  }, [dateRange, listing, subscriptionStatus]);


  const handleBookingRequestOpen = () => {
     if (firebaseInitializationError && !currentUser?.appProfile) {
      toast({ title: "Preview Mode", description: "Booking is disabled in full preview mode (no mock user).", variant: "default" });
      return;
    }
    if (!currentUser) {
      toast({ title: "Login Required", description: "Please log in to request a booking or inquire.", variant: "destructive" });
      router.push('/login');
      return;
    }
    if (listing?.pricingModel !== 'lease-to-own' && (!dateRange || !dateRange.from || !dateRange.to)) {
      toast({ title: "Select Dates", description: "Please select a check-in and check-out date.", variant: "destructive" });
      return;
    }
     if (listing?.pricingModel === 'monthly' && listing.minLeaseDurationMonths && priceDetails && priceDetails.duration < listing.minLeaseDurationMonths) {
        toast({
            title: "Minimum Lease Duration",
            description: `This listing requires a minimum lease of ${listing.minLeaseDurationMonths} months. You selected ${priceDetails.duration} month(s).`,
            variant: "destructive",
        });
        return;
    }
    setShowBookingDialog(true);
  };

  const handleConfirmBooking = async () => {
    if (!currentUser || !listing) return;
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
        landownerId: listing.landownerId, // This should be correct from the fetched listing
        dateRange: listing.pricingModel !== 'lease-to-own' && dateRange?.from && dateRange.to 
                     ? { from: dateRange.from, to: dateRange.to } 
                     : { from: new Date(), to: addDays(new Date(), 1) }, // Placeholder for LTO if dates not strictly needed for inquiry
      };
      await addBookingRequest(bookingData);

      setShowBookingDialog(false);
      setIsBookingRequested(true);
      toast({
        title: listing.pricingModel === 'lease-to-own' ? "Inquiry Sent!" : "Booking Request Submitted!",
        description: listing.pricingModel === 'lease-to-own' 
            ? `Your inquiry for "${listing.title}" has been sent to the landowner.`
            : `Your request for "${listing.title}" from ${format(dateRange!.from!, "PPP")} to ${format(dateRange!.to!, "PPP")} has been sent.`,
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
  const otherImages = listing?.images ? listing.images.slice(1) : [];

  const getPriceDisplay = () => {
    if (!listing) return "";
    switch(listing.pricingModel) {
      case 'nightly': return `$${listing.price} / night`;
      case 'monthly': return `$${listing.price} / month`;
      case 'lease-to-own': return `Est. $${listing.price} / month (Lease-to-Own)`;
      default: return `$${listing.price} / month`; // Fallback, should ideally not happen
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-8">
      {/* Image Gallery */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div className="relative w-full h-96 md:col-span-2 rounded-lg overflow-hidden shadow-lg">
          <Image src={mainImage} alt={listing.title} data-ai-hint="landscape field" fill sizes="(max-width: 768px) 100vw, 1200px" className="object-cover" priority />
        </div>
        {otherImages.map((img, index) => (
          <div key={index} className="relative w-full h-48 rounded-lg overflow-hidden shadow-md">
            <Image src={img} alt={`${listing.title} - view ${index + 1}`} data-ai-hint="nature detail" fill sizes="50vw" className="object-cover" />
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Main Content Area (Left) */}
        <div className="md:col-span-2 space-y-6">
          <Card className="overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-3xl font-headline">{listing.title}</CardTitle>
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
                <div className="flex items-center"><DollarSign className="h-5 w-5 mr-2 text-primary" /> Price: {getPriceDisplay()}</div>
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
                {listing.rating && <span className="ml-2 text-xl font-bold text-muted-foreground">{listing.rating.toFixed(1)}/5</span>}
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
                    <Button variant="outline" className="mt-4" disabled={!currentUser || isCurrentUserLandowner || (firebaseInitializationError !== null && !currentUser?.appProfile)}>
                         <Edit className="mr-2 h-4 w-4" /> Write a Review
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Feature Coming Soon</AlertDialogTitle>
                    <AlertDialogDescription>
                      The ability to write and submit reviews is currently under development and will be available in a future update.
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

        {/* Booking Card Area (Right Sticky Column) */}
        <div className="space-y-6 md:sticky md:top-24 self-start">
          <Card className="shadow-xl border-primary ring-1 ring-primary/30">
             <CardHeader className="pb-4">
                <div className="flex items-baseline justify-start gap-2">
                    <span className={cn("text-3xl font-bold text-primary font-headline", listing.pricingModel === 'lease-to-own' && "text-2xl")}>{listing.pricingModel === 'lease-to-own' ? `Est. $${listing.price}` : `$${listing.price}`}</span>
                    {listing.pricingModel !== 'lease-to-own' && <span className="text-sm text-muted-foreground self-end pb-1">/ {listing.pricingModel === 'nightly' ? 'night' : 'month'}</span>}
                    {listing.pricingModel === 'lease-to-own' && <span className="text-sm text-muted-foreground self-end pb-1">/ month (Lease-to-Own)</span>}
                </div>
             </CardHeader>
             <CardContent className="space-y-4">
                {listing.isAvailable && !isCurrentUserLandowner && listing.pricingModel !== 'lease-to-own' && (
                    <>
                        <Label htmlFor="booking-calendar" className="font-medium">Select Dates</Label>
                        <Calendar
                            id="booking-calendar"
                            mode="range"
                            selected={dateRange}
                            onSelect={setDateRange}
                            numberOfMonths={1}
                            fromDate={today} // Can select today
                            disabled={(date) => isBefore(date, today) || !currentUser || (firebaseInitializationError !== null && !currentUser?.appProfile)} // Disable past dates
                            className="rounded-md border p-0 mx-auto"
                        />
                        {listing.pricingModel === 'monthly' && listing.minLeaseDurationMonths && (
                            <p className="text-xs text-accent flex items-center mt-1">
                                <AlertTriangle className="h-4 w-4 mr-1" /> Min. {listing.minLeaseDurationMonths}-month lease.
                            </p>
                        )}
                    </>
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
                        <span>Base Rate ({priceDetails.duration} {priceDetails.durationUnit}):</span> 
                        <span>${priceDetails.basePrice.toFixed(2)}</span>
                    </div>
                    {priceDetails.renterFee > 0 && (
                         <div className="flex justify-between">
                            <span>Renter Booking Fee:</span> 
                            <span>${priceDetails.renterFee.toFixed(2)}</span>
                        </div>
                    )}
                    {subscriptionStatus === 'premium' && ( // Renter is premium
                        <div className="flex justify-between text-primary">
                            <span>Renter Booking Fee:</span> 
                            <span>$0.00 (Premium!)</span>
                        </div>
                    )}
                    <Separator className="my-1"/>
                    <div className="flex justify-between font-semibold">
                        <span>Estimated Total:</span> 
                        <span>${priceDetails.totalPrice.toFixed(2)}</span>
                    </div>
                  </div>
                )}
                 {!currentUser && (
                     <p className="text-xs text-destructive flex items-center mt-2">
                        <UserCircle className="h-4 w-4 mr-1" /> Please <Link href="/login" className="underline hover:text-destructive/80 mx-1">log in</Link> to proceed.
                    </p>
                )}
                 {firebaseInitializationError && !currentUser?.appProfile && (
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
                        isBookingRequested || 
                        !currentUser || 
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
                      <AvatarFallback>{landowner.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
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
                            disabled={!currentUser || (firebaseInitializationError !== null && !currentUser?.appProfile)}
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
                        disabled={!currentUser || (firebaseInitializationError !== null && !currentUser?.appProfile)}
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
              <div className="flex justify-between"><span>{listing.pricingModel === 'nightly' ? 'Nightly Rate:' : 'Monthly Rate:'}</span> <span>${listing.price.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Base Lease ({priceDetails.duration} {priceDetails.durationUnit}):</span> <span>${priceDetails.basePrice.toFixed(2)}</span></div>
              {priceDetails.renterFee > 0 && <div className="flex justify-between"><span>Renter Booking Fee:</span> <span>${priceDetails.renterFee.toFixed(2)}</span></div>}
              {subscriptionStatus === 'premium' && <div className="flex justify-between text-primary"><span>Renter Booking Fee:</span> <span>$0.00 (Premium Benefit!)</span></div>}
              <Separator className="my-2"/>
              <p className="text-lg font-semibold flex justify-between"><strong>Estimated Total:</strong> <span>${priceDetails.totalPrice.toFixed(2)}</span></p>
              {listing.pricingModel === 'monthly' && listing.minLeaseDurationMonths && priceDetails.duration < listing.minLeaseDurationMonths && (
                    <p className="text-sm text-destructive flex items-center">
                        <AlertTriangle className="h-4 w-4 mr-1" /> Selected duration is less than the minimum requirement of {listing.minLeaseDurationMonths} months.
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
           <p className="text-xs text-muted-foreground px-6">The landowner service fee ({(currentUser?.appProfile?.subscriptionStatus === 'premium' ? "0.49%" : "2%")}) will be deducted from the landowner's payout for successful bookings.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBookingDialog(false)}>Cancel</Button>
            <Button onClick={handleConfirmBooking} disabled={
                !currentUser || (firebaseInitializationError !== null && !currentUser?.appProfile) ||
                (listing.pricingModel === 'monthly' && listing.minLeaseDurationMonths && priceDetails && priceDetails.duration < listing.minLeaseDurationMonths)
            }>
                {listing.pricingModel === 'lease-to-own' ? "Send Inquiry" : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

    