
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import type { Listing, Review as ReviewType, User } from '@/lib/types';
import { getListingById, getUserById, getReviewsForListing, addBookingRequest } from '@/lib/mock-data';
import { MapPin, DollarSign, Maximize, CheckCircle, MessageSquare, Star, CalendarDays, Award, AlertTriangle, Info, UserCircle, Loader2, Edit } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { addDays, format, differenceInCalendarMonths, startOfMonth, endOfMonth, isBefore } from 'date-fns';
import { useAuth } from '@/contexts/auth-context';
import { firebaseInitializationError } from '@/lib/firebase';


export default function ListingDetailPage({ params }: { params: { id: string } }) {
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
        const listingData = await getListingById(params.id);
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
    fetchData();
  }, [params.id, toast]);

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
    router.push('/messages'); // In a real app, might pre-fill chat with listing/landowner info
  };

  if (isLoading || authLoading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading listing details...</p>
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

  const handleBookingRequestOpen = () => {
     if (firebaseInitializationError && !currentUser?.appProfile) { // Allow for mock user
      toast({
          title: "Preview Mode",
          description: "Booking is disabled in full preview mode (no mock user).",
          variant: "default"
      });
      return;
    }
    if (!currentUser) {
      toast({
        title: "Login Required",
        description: "Please log in to request a booking.",
        variant: "destructive",
      });
      router.push('/login');
      return;
    }
    if (!dateRange || !dateRange.from || !dateRange.to) {
      toast({
        title: "Select Dates",
        description: "Please select a check-in and check-out date.",
        variant: "destructive",
      });
      return;
    }
    if (listing!.minLeaseDurationMonths) {
        const monthsSelected = differenceInCalendarMonths(endOfMonth(dateRange.to), startOfMonth(dateRange.from)) + 1;
        if (monthsSelected < listing!.minLeaseDurationMonths) {
            toast({
                title: "Minimum Lease Duration",
                description: `This listing requires a minimum lease of ${listing!.minLeaseDurationMonths} months. You selected ${monthsSelected} month(s).`,
                variant: "destructive",
            });
            return;
        }
    }
    setShowBookingDialog(true);
  };

  const handleConfirmBooking = async () => {
    if (!currentUser || !dateRange?.from || !dateRange?.to || !listing) return;
     if (firebaseInitializationError && !currentUser?.appProfile) {
      toast({ title: "Preview Mode", description: "Booking submission is disabled in full preview mode.", variant: "default" });
      setShowBookingDialog(false);
      return;
    }

    try {
      await addBookingRequest({
        listingId: listing.id,
        renterId: currentUser.uid,
        landownerId: listing.landownerId, // LandownerID taken from listing
        dateRange: { from: dateRange.from, to: dateRange.to },
      });

      setShowBookingDialog(false);
      setIsBookingRequested(true);
      toast({
        title: "Booking Request Submitted!",
        description: `Your request for "${listing.title}" from ${format(dateRange.from, "PPP")} to ${format(dateRange.to, "PPP")} has been sent to the landowner.`,
      });
    } catch (error: any) {
      toast({
        title: "Booking Failed",
        description: error.message || "Could not submit booking request.",
        variant: "destructive",
      });
    }
  };

  const today = new Date();
  today.setHours(0,0,0,0);

  const calculatePriceDetails = () => {
    if (!dateRange || !dateRange.from || !dateRange.to || !listing) return { basePrice: 0, renterFee: 0, totalPrice: 0, months: 0 };
    
    const fromDate = startOfMonth(dateRange.from);
    const toDate = endOfMonth(dateRange.to);
    let months = differenceInCalendarMonths(toDate, fromDate) + 1;
    if (months <= 0) months = 1;

    const basePrice = listing.pricePerMonth * months;
    // Renter booking fee: $0 for premium, $0.99 for standard
    const renterFee = subscriptionStatus === 'premium' ? 0 : 0.99; 
    const totalPrice = basePrice + renterFee;

    return { basePrice, renterFee, totalPrice, months };
  };

  const priceDetails = calculatePriceDetails();

  const isCurrentUserLandowner = currentUser?.uid === listing?.landownerId;
  const mainImage = listing?.images && listing.images.length > 0 ? listing.images[0] : "https://placehold.co/800x600.png?text=Listing";
  const otherImages = listing?.images ? listing.images.slice(1) : [];


  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div className="relative w-full h-96 md:col-span-2 rounded-lg overflow-hidden shadow-lg">
          <Image
            src={mainImage}
            alt={listing?.title || "Listing Image"}
            data-ai-hint="landscape field"
            fill
            sizes="(max-width: 768px) 100vw, 800px"
            className="object-cover"
            priority
          />
        </div>
        {otherImages.map((img, index) => (
          <div key={index} className="relative w-full h-48 rounded-lg overflow-hidden shadow-md">
            <Image src={img} alt={`${listing?.title} - view ${index + 1}`} data-ai-hint="nature detail" fill sizes="400px" className="object-cover" />
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl">{listing?.title}</CardTitle>
              <div className="flex items-center text-muted-foreground">
                <MapPin className="h-5 w-5 mr-2 text-primary" />
                <span>{listing?.location}</span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-foreground/90 leading-relaxed">{listing?.description}</p>
              <Separator className="my-6" />
              <h3 className="text-xl font-semibold mb-3">Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center"><Maximize className="h-5 w-5 mr-2 text-primary" /> Size: {listing?.sizeSqft.toLocaleString()} sq ft</div>
                <div className="flex items-center"><DollarSign className="h-5 w-5 mr-2 text-primary" /> Price: ${listing?.pricePerMonth}/month</div>
                <div className="flex items-center col-span-2"><CalendarDays className="h-5 w-5 mr-2 text-primary" /> Availability: {listing?.isAvailable ? <span className="text-green-600 font-medium">Available</span> : <span className="text-red-600 font-medium">Not Available</span>}</div>
                {listing?.leaseTerm && (
                  <div className="flex items-center col-span-2"><Info className="h-5 w-5 mr-2 text-primary" /> Lease Term: <span className="capitalize ml-1">{listing.leaseTerm}</span> {listing.minLeaseDurationMonths ? `(${listing.minLeaseDurationMonths}+ months)` : ''}</div>
                )}
              </div>
              <Separator className="my-6" />
              <h3 className="text-xl font-semibold mb-3">Amenities</h3>
              <ul className="grid grid-cols-2 gap-2 text-sm">
                {listing?.amenities.map(amenity => (
                  <li key={amenity} className="flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2 text-green-500" /> {amenity}
                  </li>
                ))}
                {listing?.amenities.length === 0 && <li className="text-muted-foreground">No specific amenities listed.</li>}
              </ul>
            </CardContent>
          </Card>

           {listing?.isAvailable && !isCurrentUserLandowner && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Select Your Dates</CardTitle>
                <CardDescription>Choose your check-in and check-out dates. Prices are per full calendar month.</CardDescription>
                {listing.minLeaseDurationMonths && (
                    <p className="text-xs text-accent flex items-center mt-1">
                        <AlertTriangle className="h-4 w-4 mr-1" /> This listing requires a minimum {listing.minLeaseDurationMonths}-month lease.
                    </p>
                )}
                {!currentUser && (
                     <p className="text-xs text-destructive flex items-center mt-2">
                        <UserCircle className="h-4 w-4 mr-1" /> Please <Link href="/login" className="underline hover:text-destructive/80 mx-1">log in</Link> to request a booking.
                    </p>
                )}
                 {firebaseInitializationError && !currentUser?.appProfile && (
                    <p className="text-xs text-amber-600 flex items-center mt-2">
                        <AlertTriangle className="h-4 w-4 mr-1" /> Booking disabled in preview mode.
                    </p>
                 )}
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={1}
                  fromDate={today}
                  disabled={(date) => isBefore(date, today) || !currentUser || (firebaseInitializationError !== null && !currentUser?.appProfile)}
                  className="rounded-md border"
                />
                {dateRange?.from && dateRange?.to && (
                  <p className="mt-4 text-sm">
                    Selected: <strong>{format(dateRange.from, "PPP")}</strong> to <strong>{format(dateRange.to, "PPP")}</strong>
                    {" "}({priceDetails.months} month{priceDetails.months > 1 ? 's' : ''})
                  </p>
                )}
              </CardContent>
            </Card>
           )}

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl flex items-center">
                <Star className="h-6 w-6 mr-2 text-yellow-400 fill-yellow-400" />
                Reviews ({listing?.numberOfRatings || reviews.length})
                {listing?.rating && <span className="ml-2 text-xl font-bold text-muted-foreground">{listing.rating.toFixed(1)}/5</span>}
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
                  <Button
                    variant="outline"
                    className="mt-4"
                    disabled={!currentUser || isCurrentUserLandowner || (firebaseInitializationError !== null && !currentUser?.appProfile)}
                  >
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
                  <AlertDialogFooter>
                    <AlertDialogAction onClick={() => setShowReviewDialog(false)}>OK</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="sticky top-24 shadow-lg">
            <CardHeader className="items-center text-center">
              {landowner && (
                <>
                  <Avatar className="w-20 h-20 mb-2 border-2 border-primary">
                    <AvatarImage src={landowner.avatarUrl} alt={landowner.name} />
                    <AvatarFallback>{landowner.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  <CardTitle>{landowner.name}</CardTitle>
                  <CardDescription className="flex items-center justify-center">
                    <Award className="h-4 w-4 mr-1 text-accent"/> Verified Landowner
                  </CardDescription>
                </>
              )}
               {!landowner && <UserCircle className="w-20 h-20 mb-2 text-muted-foreground" />}
            </CardHeader>
            <CardContent className="text-center">
               <p className="text-2xl font-bold text-primary">${listing?.pricePerMonth} <span className="text-sm font-normal text-muted-foreground">/ month</span></p>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              {!isCurrentUserLandowner && (
                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleBookingRequestOpen}
                  disabled={!listing?.isAvailable || !dateRange?.from || !dateRange?.to || isBookingRequested || !currentUser || (firebaseInitializationError !== null && !currentUser?.appProfile)}
                >
                  {isBookingRequested ? "Booking Requested" : (listing?.isAvailable ? "Request to Book" : "Currently Unavailable")}
                </Button>
              )}
              <Button
                variant="outline"
                className="w-full"
                onClick={handleContactLandowner}
                disabled={!currentUser || isCurrentUserLandowner || (firebaseInitializationError !== null && !currentUser?.appProfile)}
              >
                <MessageSquare className="h-4 w-4 mr-2" /> Contact Landowner
              </Button>
              {isCurrentUserLandowner && (
                <Button variant="secondary" className="w-full" asChild>
                    <Link href={`/my-listings`}>Manage My Listings</Link>
                </Button>
              )}
            </CardFooter>
          </Card>
           <Card>
            <CardHeader>
              <CardTitle className="text-lg">Safety & Guidelines</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-1">
              <p>Ensure you understand the land use rules.</p>
              <p>Communicate clearly with the landowner.</p>
              <p>All payments are processed securely through LandShare.</p>
              <Link href="/safety" className="text-primary hover:underline">Read our safety tips</Link>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Your Booking Request</DialogTitle>
            <DialogDescription>
              Please review the details of your booking request for "{listing?.title}".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4 text-sm">
            <p><strong>Check-in:</strong> {dateRange?.from ? format(dateRange.from, "PPP") : 'N/A'}</p>
            <p><strong>Check-out:</strong> {dateRange?.to ? format(dateRange.to, "PPP") : 'N/A'}</p>
            <p><strong>Duration:</strong> {priceDetails.months} month{priceDetails.months !== 1 ? 's' : ''}</p>
            <Separator className="my-2"/>
            <div className="flex justify-between"><span>Monthly Rate:</span> <span>${listing?.pricePerMonth.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Base Lease ({priceDetails.months} mo):</span> <span>${priceDetails.basePrice.toFixed(2)}</span></div>
            {subscriptionStatus !== 'premium' && <div className="flex justify-between"><span>Renter Booking Fee:</span> <span>${priceDetails.renterFee.toFixed(2)}</span></div>}
            {subscriptionStatus === 'premium' && <div className="flex justify-between text-primary"><span>Renter Booking Fee:</span> <span>$0.00 (Premium Benefit!)</span></div>}
            <Separator className="my-2"/>
            <p className="text-lg font-semibold flex justify-between"><strong>Estimated Total:</strong> <span>${priceDetails.totalPrice.toFixed(2)}</span></p>
            {listing?.minLeaseDurationMonths && dateRange?.from && dateRange.to && priceDetails.months < listing.minLeaseDurationMonths && (
                <p className="text-sm text-destructive flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-1" /> Selected duration is less than the minimum requirement of {listing.minLeaseDurationMonths} months.
                </p>
            )}
             <p className="text-xs text-muted-foreground mt-2">The landowner service fee ({(currentUser?.appProfile?.subscriptionStatus === 'premium' ? "0.49%" : "2%")}) will be deducted from the landowner's payout.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBookingDialog(false)}>Cancel</Button>
            <Button onClick={handleConfirmBooking} disabled={
                !currentUser || (firebaseInitializationError !== null && !currentUser?.appProfile) ||
                (listing?.minLeaseDurationMonths && priceDetails.months < listing.minLeaseDurationMonths)
            }>Submit Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
