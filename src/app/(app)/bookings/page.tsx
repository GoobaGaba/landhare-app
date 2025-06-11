
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CalendarCheck, Briefcase, CheckCircle, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import type { Booking } from '@/lib/types';
import { getBookings as fetchAllBookings, updateBookingStatus as dbUpdateBookingStatus } from '@/lib/mock-data';
import { format } from 'date-fns';

// Mock current user ID and role. In a real app, this would come from auth context.
const MOCK_CURRENT_USER_ID = 'user1'; // Switch to 'user2' (renter) or 'user1' (landowner)
const MOCK_CURRENT_USER_ROLE: 'landowner' | 'renter' = 'landowner'; // Correlate with MOCK_CURRENT_USER_ID

export default function BookingsPage() {
  const [userBookings, setUserBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadBookings = useCallback(async () => {
    setIsLoading(true);
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const allBookings = fetchAllBookings(); // This already populates denormalized fields
    let filteredBookings: Booking[];

    if (MOCK_CURRENT_USER_ROLE === 'renter') {
      filteredBookings = allBookings.filter(b => b.renterId === MOCK_CURRENT_USER_ID);
    } else { // landowner
      filteredBookings = allBookings.filter(b => b.landownerId === MOCK_CURRENT_USER_ID);
    }
    
    setUserBookings(filteredBookings);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);


  const handleUpdateBookingStatus = async (bookingId: string, newStatus: Booking['status']) => {
    const originalBookings = [...userBookings];
    // Optimistic UI update
    setUserBookings(prevBookings => 
      prevBookings.map(b => b.id === bookingId ? { ...b, status: newStatus } : b)
    );

    const updatedBooking = dbUpdateBookingStatus(bookingId, newStatus);
    if (updatedBooking) {
      toast({
        title: "Booking Updated",
        description: `Booking status changed to ${newStatus}.`,
      });
      // Optionally re-fetch or refine local state with the exact returned object
      // For now, optimistic update is fine since mock-db directly mutates.
      // If dbUpdateBookingStatus returned a new array or indicated failure, we'd handle it here.
      await loadBookings(); // Re-fetch to ensure UI is consistent with "DB"
    } else {
      toast({
        title: "Update Failed",
        description: "Could not update booking status.",
        variant: "destructive",
      });
      setUserBookings(originalBookings); // Revert optimistic update
    }
  };

  const getStatusColor = (status: Booking['status']) => {
    if (status.includes('Confirmed')) return 'text-primary';
    if (status.includes('Pending')) return 'text-accent';
    if (status.includes('Declined') || status.includes('Cancelled')) return 'text-destructive';
    return 'text-muted-foreground';
  };
  
  const formatDateRange = (dateRange: { from: Date; to: Date }): string => {
    return `${format(dateRange.from, "PPP")} - ${format(dateRange.to, "PPP")}`;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading bookings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold">
          {MOCK_CURRENT_USER_ROLE === 'renter' ? "My Rentals" : "Booking Requests & Confirmations"}
        </h1>
        {MOCK_CURRENT_USER_ROLE === 'renter' && (
          <Button asChild>
            <Link href="/search">
              <Briefcase className="mr-2 h-4 w-4" /> Find New Land
            </Link>
          </Button>
        )}
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
              {MOCK_CURRENT_USER_ROLE === 'renter' 
                ? "You haven't booked any land yet. Start exploring available plots!" 
                : "You don't have any booking requests or confirmed bookings for your land at the moment."}
            </p>
            {MOCK_CURRENT_USER_ROLE === 'renter' && (
                <Button asChild className="mt-4">
                    <Link href="/search">Explore Land</Link>
                </Button>
            )}
             {MOCK_CURRENT_USER_ROLE === 'landowner' && (
                <Button asChild className="mt-4">
                    <Link href="/my-listings">View My Listings</Link>
                </Button>
            )}
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
                <p className="text-sm"><strong>Dates:</strong> {formatDateRange(booking.dateRange)}</p>
                {MOCK_CURRENT_USER_ROLE === 'renter' && (
                  <p className="text-sm"><strong>Landowner:</strong> {booking.landownerName || 'N/A'}</p>
                )}
                {MOCK_CURRENT_USER_ROLE === 'landowner' && (
                  <p className="text-sm"><strong>Renter:</strong> {booking.renterName || 'N/A'}</p>
                )}
              </CardContent>
              <CardFooter className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                   <Link href={`/listings/${booking.listingId}`}>View Listing</Link>
                </Button>
                {MOCK_CURRENT_USER_ROLE === 'landowner' && booking.status.includes('Pending Confirmation') && (
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
                 {MOCK_CURRENT_USER_ROLE === 'renter' && booking.status.includes('Pending Confirmation') && (
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
                {MOCK_CURRENT_USER_ROLE === 'landowner' 
                  ? "Respond to booking requests promptly to provide a good experience for potential renters. Approved bookings will show as 'Confirmed'."
                  : "Keep an eye on your booking statuses. You'll be notified once a landowner responds. You can cancel 'Pending Confirmation' requests if needed."
                }
            </p>
        </CardContent>
      </Card>
    </div>
  );
}
