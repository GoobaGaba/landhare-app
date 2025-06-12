
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CalendarCheck, Briefcase, CheckCircle, XCircle, AlertTriangle, Loader2, UserCircle, FileText } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import type { Booking, GenerateLeaseTermsInput } from '@/lib/types';
import { getBookingsForUser, updateBookingStatus as dbUpdateBookingStatus, getListingById } from '@/lib/mock-data';
import { format, differenceInDays, differenceInCalendarMonths, startOfMonth, endOfMonth } from 'date-fns';
import { useAuth } from '@/contexts/auth-context';
import { firebaseInitializationError } from '@/lib/firebase';
import { getGeneratedLeaseTermsAction } from '@/lib/actions/ai-actions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function BookingsPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const [userBookings, setUserBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLeaseTermsLoading, setIsLeaseTermsLoading] = useState(false);
  const [leaseTermsModalOpen, setLeaseTermsModalOpen] = useState(false);
  const [currentLeaseTerms, setCurrentLeaseTerms] = useState<string | null>(null);
  const [currentLeaseSummary, setCurrentLeaseSummary] = useState<string[] | null>(null);
  const { toast } = useToast();

  const loadBookings = useCallback(async () => {
    if (firebaseInitializationError && !currentUser?.appProfile) {
      setIsLoading(false);
      setUserBookings([]);
      if (firebaseInitializationError) {
          toast({
            title: "Preview Mode Active",
            description: "Firebase not configured. Cannot load live bookings.",
            variant: "default",
            duration: 5000
          });
      }
      return;
    }

    if (firebaseInitializationError && currentUser?.appProfile) {
         toast({
            title: "Preview Mode Active",
            description: "Firebase not configured. Displaying sample bookings for preview.",
            variant: "default",
            duration: 5000
        });
    }

    setIsLoading(true);

    try {
      const bookingsFromDb = await getBookingsForUser(currentUser!.uid);
      setUserBookings(bookingsFromDb);
    } catch (error: any) {
      console.error("Failed to load bookings:", error);
      toast({
        title: "Loading Failed",
        description: error.message || "Could not load your bookings.",
        variant: "destructive",
      });
      setUserBookings([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, toast]);

  useEffect(() => {
    if (!authLoading && currentUser) {
      loadBookings();
    } else if (!authLoading && !currentUser) {
      setIsLoading(false);
    }
  }, [authLoading, currentUser, loadBookings]);


  const handleGenerateAndShowLeaseTerms = async (booking: Booking) => {
    if (!currentUser || !booking.listingTitle || !booking.renterName || !booking.landownerName) {
        toast({title: "Missing Data", description: "Cannot generate lease terms due to missing booking details.", variant: "destructive"});
        return;
    }
    setIsLeaseTermsLoading(true);
    const listingDetails = await getListingById(booking.listingId);
    if (!listingDetails) {
        toast({title: "Error", description: "Could not fetch listing details for lease terms.", variant: "destructive"});
        setIsLeaseTermsLoading(false);
        return;
    }

    const fromDate = booking.dateRange.from instanceof Date ? booking.dateRange.from : (booking.dateRange.from as any).toDate();
    const toDate = booking.dateRange.to instanceof Date ? booking.dateRange.to : (booking.dateRange.to as any).toDate();

    let durationDesc = "";
    let priceForLease = listingDetails.price;

    if (listingDetails.pricingModel === 'nightly') {
        const days = differenceInDays(toDate, fromDate) + 1;
        durationDesc = `${days} day(s)`;
        priceForLease = listingDetails.price * days; // Total for term, AI prompt asks for monthly equivalent, adjust if needed
    } else if (listingDetails.pricingModel === 'monthly') {
        const days = differenceInDays(toDate, fromDate) + 1;
        const approxMonths = parseFloat((days / 30.4375).toFixed(2)); // Average days in month
        if (days < 28 && listingDetails.minLeaseDurationMonths && listingDetails.minLeaseDurationMonths > 0) { // If less than a month but monthly listing
            durationDesc = `${days} day(s) (Note: This is a short-term rental of a monthly-priced plot)`;
             priceForLease = (listingDetails.price / 30) * days; // Prorated
        } else {
             const fullMonths = differenceInCalendarMonths(endOfMonth(toDate), startOfMonth(fromDate)) + 1;
             durationDesc = `${fullMonths} month(s)`;
             priceForLease = listingDetails.price; // The monthly rate
        }

    } else if (listingDetails.pricingModel === 'lease-to-own') {
        const fullMonths = differenceInCalendarMonths(endOfMonth(toDate), startOfMonth(fromDate)) + 1;
        durationDesc = `${fullMonths} month(s) (Lease-to-Own)`;
        priceForLease = listingDetails.price;
    }

    const input: GenerateLeaseTermsInput = {
        listingType: listingDetails.pricingModel === 'nightly' ? `Short-term rental for ${listingDetails.title}` : `Plot for ${listingDetails.title} (${listingDetails.pricingModel})`,
        durationDescription: durationDesc,
        pricePerMonthEquivalent: priceForLease,
        landownerName: booking.landownerName,
        renterName: booking.renterName,
        listingAddress: listingDetails.location,
        additionalRules: listingDetails.leaseToOwnDetails || "No permanent structures without written consent. Maintain cleanliness of the plot."
    };

    const result = await getGeneratedLeaseTermsAction(input);
    setIsLeaseTermsLoading(false);

    if (result.data) {
        setCurrentLeaseTerms(result.data.leaseAgreementText);
        setCurrentLeaseSummary(result.data.summaryPoints);
        setLeaseTermsModalOpen(true);
    } else {
        toast({title: "AI Error", description: result.error || "Failed to generate lease terms.", variant: "destructive"});
    }
  };


  const handleUpdateBookingStatus = async (booking: Booking, newStatus: Booking['status']) => {
    if (firebaseInitializationError && !currentUser?.appProfile) {
        toast({
            title: "Preview Mode",
            description: "Updating booking status is disabled in full preview mode.",
            variant: "default"
        });
        return;
    }
    if(!currentUser){
         toast({ title: "Authentication Error", description: "User not logged in.", variant: "destructive"});
        return;
    }

    const originalBookings = [...userBookings];
    setUserBookings(prevBookings =>
      prevBookings.map(b => b.id === booking.id ? { ...b, status: newStatus } : b)
    );

    try {
      const updatedBooking = await dbUpdateBookingStatus(booking.id, newStatus);
      if (updatedBooking) {
        toast({
          title: "Booking Updated",
          description: `Booking status changed to ${newStatus}.`,
        });
        await loadBookings();
        if (newStatus === 'Confirmed' && currentUser.uid === booking.landownerId) {
            await handleGenerateAndShowLeaseTerms(updatedBooking);
        }
      } else {
        throw new Error("Update operation returned undefined.");
      }
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Could not update booking status.",
        variant: "destructive",
      });
      setUserBookings(originalBookings);
    }
  };

  const getStatusColor = (status: Booking['status']) => {
    if (status.includes('Confirmed')) return 'text-primary';
    if (status.includes('Pending')) return 'text-accent';
    if (status.includes('Declined') || status.includes('Cancelled')) return 'text-destructive';
    return 'text-muted-foreground';
  };

  const formatDateRange = (dateRange: { from: Date | { toDate: () => Date }; to: Date | { toDate: () => Date } }): string => {
    const fromDate = dateRange.from instanceof Date ? dateRange.from : (dateRange.from as any).toDate();
    const toDate = dateRange.to instanceof Date ? dateRange.to : (dateRange.to as any).toDate();
    return `${format(fromDate, "PPP")} - ${format(toDate, "PPP")}`;
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading bookings...</p>
      </div>
    );
  }

  if (!currentUser && !isLoading) {
     return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCircle className="h-6 w-6 text-primary" />
            Please Log In
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            You need to be logged in to view your bookings.
          </p>
          <Button asChild className="mt-4">
            <Link href="/login">Log In</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }


  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold">
          My Bookings & Requests
        </h1>
         <Button asChild>
            <Link href="/search">
              <Briefcase className="mr-2 h-4 w-4" /> Find New Land
            </Link>
          </Button>
      </div>

      {userBookings.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarCheck className="h-6 w-6 text-primary" />
              No Bookings Yet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
             You don't have any active bookings or requests at the moment.
            {firebaseInitializationError && " (Currently displaying sample data due to Firebase configuration issue.)"}
            </p>
            <div className="flex gap-2 mt-4">
                <Button asChild>
                    <Link href="/search">Explore Land</Link>
                </Button>
                <Button asChild variant="outline">
                    <Link href="/my-listings">View My Listings</Link>
                </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
          {userBookings.map((booking) => (
            <Card key={booking.id} className="shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>{booking.listingTitle || `Listing: ${booking.listingId.substring(0,10)}...`}</CardTitle>
                <CardDescription>
                  Status: <span className={`font-semibold ${getStatusColor(booking.status)}`}>{booking.status}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm"><strong>Dates:</strong> {formatDateRange(booking.dateRange as { from: Date; to: Date })}</p>
                {booking.landownerId === currentUser!.uid && (
                  <p className="text-sm"><strong>Renter:</strong> {booking.renterName || `Renter ID: ${booking.renterId.substring(0,6)}`}</p>
                )}
                {booking.renterId === currentUser!.uid && (
                  <p className="text-sm"><strong>Landowner:</strong> {booking.landownerName || `Owner ID: ${booking.landownerId.substring(0,6)}`}</p>
                )}
              </CardContent>
              <CardFooter className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                   <Link href={`/listings/${booking.listingId}`}>View Listing</Link>
                </Button>
                {booking.landownerId === currentUser!.uid && booking.status.includes('Pending Confirmation') && (
                  <>
                    <Button
                      size="sm"
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                      onClick={() => handleUpdateBookingStatus(booking, 'Confirmed')}
                      disabled={(firebaseInitializationError !== null && !currentUser!.appProfile) || isLeaseTermsLoading}
                    >
                      {isLeaseTermsLoading && booking.status === 'Pending Confirmation' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                       Approve
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleUpdateBookingStatus(booking, 'Declined')}
                      disabled={firebaseInitializationError !== null && !currentUser!.appProfile}
                    >
                      <XCircle className="mr-2 h-4 w-4" /> Decline
                    </Button>
                  </>
                )}
                 {booking.renterId === currentUser!.uid && booking.status.includes('Pending Confirmation') && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleUpdateBookingStatus(booking, 'Cancelled')}
                    disabled={firebaseInitializationError !== null && !currentUser!.appProfile}
                  >
                    <AlertTriangle className="mr-2 h-4 w-4" /> Cancel Request
                  </Button>
                )}
                {booking.status === 'Confirmed' && (
                     <Button variant="secondary" size="sm" onClick={() => handleGenerateAndShowLeaseTerms(booking)} disabled={isLeaseTermsLoading}>
                        {isLeaseTermsLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                        View Lease Suggestion
                    </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={leaseTermsModalOpen} onOpenChange={setLeaseTermsModalOpen}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary"/>AI Suggested Lease Terms</AlertDialogTitle>
            <AlertDialogDescription>
              This is an AI-generated lease suggestion based on the booking details.
              <strong> It is for informational purposes only and should be reviewed by legal counsel before use. Ensure compliance with all local and state laws.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-[60vh] overflow-y-auto p-1 pr-4 custom-scrollbar text-sm space-y-4">
            {currentLeaseSummary && (
                <div className="mb-4 p-3 bg-muted/50 rounded-md">
                    <h3 className="font-semibold mb-2 text-foreground">Key Summary Points:</h3>
                    <ul className="list-disc list-inside space-y-1">
                        {currentLeaseSummary.map((point, idx) => <li key={idx}>{point}</li>)}
                    </ul>
                </div>
            )}
            <pre className="whitespace-pre-wrap font-sans bg-card p-4 rounded-md border">
                {currentLeaseTerms || "No lease terms generated."}
            </pre>
          </div>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setLeaseTermsModalOpen(false)}>Close</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="mt-8 bg-muted/30">
        <CardHeader>
            <CardTitle className="text-lg">Booking Management Tip</CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-sm text-muted-foreground">
               Respond to booking requests promptly. Approved bookings show as 'Confirmed'.
               You can cancel 'Pending Confirmation' requests if your plans change.
               Landowners should check for new requests often. Confirmed bookings will have an AI-suggested lease available.
            </p>
        </CardContent>
      </Card>
    </div>
  );
}
