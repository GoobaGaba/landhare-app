
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CalendarCheck, Briefcase, CheckCircle, XCircle, AlertTriangle, Loader2, UserCircle } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import type { Booking } from '@/lib/types';
// Updated to use Firestore-backed functions
import { getBookingsForUser, updateBookingStatus as dbUpdateBookingStatus, getUserById, getListingById } from '@/lib/mock-data'; // Renamed getBookings to getBookingsForUser
import { format } from 'date-fns';
import { useAuth } from '@/contexts/auth-context';
import { firebaseInitializationError } from '@/lib/firebase';

export default function BookingsPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const [userBookings, setUserBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadBookings = useCallback(async () => {
    if (firebaseInitializationError || !currentUser) {
      setIsLoading(false);
      setUserBookings([]);
      if (firebaseInitializationError) {
        toast({ title: "Database Error", description: "Cannot load bookings: " + firebaseInitializationError, variant: "destructive" });
      }
      return;
    }
    setIsLoading(true);
    
    try {
      const bookingsFromDb = await getBookingsForUser(currentUser.uid);
      // The new getBookingsForUser already populates names and titles.
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
    if (!authLoading) {
      loadBookings();
    }
  }, [authLoading, currentUser, loadBookings]);


  const handleUpdateBookingStatus = async (bookingId: string, newStatus: Booking['status']) => {
    if (firebaseInitializationError || !currentUser) {
        toast({ title: "Authentication/Database Error", description: "Cannot update booking: " + (firebaseInitializationError || "User not logged in."), variant: "destructive"});
        return;
    }
    // Optimistic UI update (can be removed if direct re-fetch is preferred)
    const originalBookings = [...userBookings];
    setUserBookings(prevBookings => 
      prevBookings.map(b => b.id === bookingId ? { ...b, status: newStatus } : b)
    );

    try {
      const updatedBooking = await dbUpdateBookingStatus(bookingId, newStatus);
      if (updatedBooking) {
        toast({
          title: "Booking Updated",
          description: `Booking status changed to ${newStatus}.`,
        });
        await loadBookings(); // Re-fetch to ensure UI consistency
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
  
  const formatDateRange = (dateRange: { from: Date; to: Date }): string => {
    // Ensure dates are JS Date objects
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
  
  if (firebaseInitializationError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            Service Unavailable
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            The booking service is temporarily unavailable due to a configuration issue: <span className="font-semibold text-destructive">{firebaseInitializationError}</span>
          </p>
           <p className="text-xs text-muted-foreground mt-2">Please ensure Firebase is correctly configured in your .env.local file and the server has been restarted.</p>
        </CardContent>
      </Card>
    );
  }


  if (!currentUser) {
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
                <CardTitle>{booking.listingTitle || `Listing ID: ${booking.listingId}`}</CardTitle>
                <CardDescription>
                  Status: <span className={`font-semibold ${getStatusColor(booking.status)}`}>{booking.status}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm"><strong>Dates:</strong> {formatDateRange(booking.dateRange as { from: Date; to: Date })}</p>
                {booking.landownerId === currentUser.uid && (
                  <p className="text-sm"><strong>Renter:</strong> {booking.renterName || `Renter ID: ${booking.renterId.substring(0,6)}`}</p>
                )}
                {booking.renterId === currentUser.uid && (
                  <p className="text-sm"><strong>Landowner:</strong> {booking.landownerName || `Owner ID: ${booking.landownerId.substring(0,6)}`}</p>
                )}
              </CardContent>
              <CardFooter className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                   <Link href={`/listings/${booking.listingId}`}>View Listing</Link>
                </Button>
                {booking.landownerId === currentUser.uid && booking.status.includes('Pending Confirmation') && (
                  <>
                    <Button 
                      size="sm" 
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                      onClick={() => handleUpdateBookingStatus(booking.id, 'Confirmed')}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" /> Approve
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => handleUpdateBookingStatus(booking.id, 'Declined')}
                    >
                      <XCircle className="mr-2 h-4 w-4" /> Decline
                    </Button>
                  </>
                )}
                 {booking.renterId === currentUser.uid && booking.status.includes('Pending Confirmation') && (
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => handleUpdateBookingStatus(booking.id, 'Cancelled')}
                  >
                    <AlertTriangle className="mr-2 h-4 w-4" /> Cancel Request
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      
      <Card className="mt-8 bg-muted/30">
        <CardHeader>
            <CardTitle className="text-lg">Booking Management Tip</CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-sm text-muted-foreground">
               Respond to booking requests promptly. Approved bookings show as 'Confirmed'.
               You can cancel 'Pending Confirmation' requests if your plans change.
               Landowners should check for new requests often.
            </p>
        </CardContent>
      </Card>
    </div>
  );
}
