
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CalendarCheck, Briefcase, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { useToast } from '@/hooks/use-toast';

// Mock user type, in a real app, this would come from auth context
const currentUserRole: 'landowner' | 'renter' = 'landowner'; // Switch to 'renter' or 'landowner' to test views

interface Booking {
  id: string;
  listingTitle: string;
  status: 'Confirmed' | 'Pending' | 'Declined' | 'Cancelled' | 'Pending Confirmation';
  dateRange: string;
  landowner?: string;
  renter?: string;
}

const initialMockBookingsAsRenter: Booking[] = [
  { id: 'b1', listingTitle: 'Sunny Meadow Plot', status: 'Confirmed', dateRange: 'Jul 15, 2024 - Aug 14, 2024', landowner: 'Sarah M.'},
  { id: 'b2', listingTitle: 'Forest Retreat Lot', status: 'Pending', dateRange: 'Sep 01, 2024 - Sep 30, 2024', landowner: 'John B.'},
];

const initialMockBookingsAsLandowner: Booking[] = [
  { id: 'b3', listingTitle: 'My Lakeside Camping Spot', status: 'Pending Confirmation', dateRange: 'Jul 20, 2024 - Jul 27, 2024', renter: 'Alex P.'},
  { id: 'b4', listingTitle: 'My Urban Garden Plot', status: 'Confirmed', dateRange: 'Aug 01, 2024 - Oct 31, 2024', renter: 'Maria G.'},
  { id: 'b5', listingTitle: 'Riverside Retreat', status: 'Pending Confirmation', dateRange: 'Aug 10, 2024 - Aug 17, 2024', renter: 'Sam C.'},
];


export default function BookingsPage() {
  const [renterBookings, setRenterBookings] = useState<Booking[]>(initialMockBookingsAsRenter);
  const [landownerBookings, setLandownerBookings] = useState<Booking[]>(initialMockBookingsAsLandowner);
  const { toast } = useToast();

  const bookingsToDisplay = currentUserRole === 'renter' ? renterBookings : landownerBookings;

  const handleUpdateBookingStatus = (bookingId: string, newStatus: Booking['status']) => {
    if (currentUserRole === 'renter') {
      setRenterBookings(prevBookings => 
        prevBookings.map(b => b.id === bookingId ? { ...b, status: newStatus } : b)
      );
    } else {
      setLandownerBookings(prevBookings => 
        prevBookings.map(b => b.id === bookingId ? { ...b, status: newStatus } : b)
      );
    }
    toast({
      title: "Booking Updated",
      description: `Booking status changed to ${newStatus}.`,
    });
  };

  const handleApproveBooking = (bookingId: string) => {
    handleUpdateBookingStatus(bookingId, 'Confirmed');
  };

  const handleDeclineBooking = (bookingId: string) => {
    handleUpdateBookingStatus(bookingId, 'Declined');
  };

  const handleCancelRequest = (bookingId: string) => {
    handleUpdateBookingStatus(bookingId, 'Cancelled');
  };

  const getStatusColor = (status: Booking['status']) => {
    if (status.includes('Confirmed')) return 'text-primary';
    if (status.includes('Pending')) return 'text-accent';
    if (status.includes('Declined') || status.includes('Cancelled')) return 'text-destructive';
    return 'text-muted-foreground';
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold">
          {currentUserRole === 'renter' ? "My Rentals" : "Booking Requests & Confirmations"}
        </h1>
        {currentUserRole === 'renter' && (
          <Button asChild>
            <Link href="/search">
              <Briefcase className="mr-2 h-4 w-4" /> Find New Land
            </Link>
          </Button>
        )}
      </div>

      {bookingsToDisplay.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarCheck className="h-6 w-6 text-primary" />
              No Bookings Yet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {currentUserRole === 'renter' 
                ? "You haven't booked any land yet. Start exploring available plots!" 
                : "You don't have any booking requests or confirmed bookings for your land at the moment."}
            </p>
            {currentUserRole === 'renter' && (
                <Button asChild className="mt-4">
                    <Link href="/search">Explore Land</Link>
                </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
          {bookingsToDisplay.map((booking) => (
            <Card key={booking.id} className="shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>{booking.listingTitle}</CardTitle>
                <CardDescription>
                  Status: <span className={`font-semibold ${getStatusColor(booking.status)}`}>{booking.status}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm"><strong>Dates:</strong> {booking.dateRange}</p>
                {currentUserRole === 'renter' && 'landowner' in booking && (
                  <p className="text-sm"><strong>Landowner:</strong> {booking.landowner}</p>
                )}
                {currentUserRole === 'landowner' && 'renter' in booking && (
                  <p className="text-sm"><strong>Renter:</strong> {booking.renter}</p>
                )}
              </CardContent>
              <CardFooter className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm">View Details</Button>
                {currentUserRole === 'landowner' && booking.status.includes('Pending') && (
                  <>
                    <Button 
                      size="sm" 
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                      onClick={() => handleApproveBooking(booking.id)}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" /> Approve
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => handleDeclineBooking(booking.id)}
                    >
                      <XCircle className="mr-2 h-4 w-4" /> Decline
                    </Button>
                  </>
                )}
                 {currentUserRole === 'renter' && booking.status.includes('Pending') && (
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => handleCancelRequest(booking.id)}
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
                {currentUserRole === 'landowner' 
                  ? "Respond to booking requests promptly to provide a good experience for potential renters. Approved bookings will show as 'Confirmed'."
                  : "Keep an eye on your booking statuses. You'll be notified once a landowner responds. You can cancel 'Pending' requests if needed."
                }
            </p>
        </CardContent>
      </Card>
    </div>
  );
}
