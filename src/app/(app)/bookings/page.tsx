
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CalendarCheck, Briefcase } from "lucide-react"; // Example icons

// Mock user type, in a real app, this would come from auth context
const userType: 'landowner' | 'renter' = 'renter'; // or 'landowner'

// Mock data - replace with actual data fetching
const mockBookingsAsRenter = [
  { id: 'b1', listingTitle: 'Sunny Meadow Plot', status: 'Confirmed', dateRange: 'Jul 15, 2024 - Aug 14, 2024', landowner: 'Sarah M.'},
  { id: 'b2', listingTitle: 'Forest Retreat Lot', status: 'Pending', dateRange: 'Sep 01, 2024 - Sep 30, 2024', landowner: 'John B.'},
];

const mockBookingsAsLandowner = [
  { id: 'b3', listingTitle: 'My Lakeside Camping Spot', status: 'Pending Confirmation', dateRange: 'Jul 20, 2024 - Jul 27, 2024', renter: 'Alex P.'},
  { id: 'b4', listingTitle: 'My Urban Garden Plot', status: 'Confirmed', dateRange: 'Aug 01, 2024 - Oct 31, 2024', renter: 'Maria G.'},
];


export default function BookingsPage() {
  const bookingsToDisplay = userType === 'renter' ? mockBookingsAsRenter : mockBookingsAsLandowner;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold">
          {userType === 'renter' ? "My Rentals" : "Booking Requests"}
        </h1>
        {userType === 'renter' && (
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
              {userType === 'renter' 
                ? "You haven't booked any land yet. Start exploring available plots!" 
                : "You don't have any booking requests for your land at the moment."}
            </p>
            {userType === 'renter' && (
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
                  Status: <span className={`font-semibold ${booking.status.includes('Confirmed') ? 'text-green-600' : booking.status.includes('Pending') ? 'text-orange-500' : 'text-muted-foreground'}`}>{booking.status}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm"><strong>Dates:</strong> {booking.dateRange}</p>
                {userType === 'renter' && 'landowner' in booking && (
                  <p className="text-sm"><strong>Landowner:</strong> {booking.landowner}</p>
                )}
                {userType === 'landowner' && 'renter' in booking && (
                  <p className="text-sm"><strong>Renter:</strong> {booking.renter}</p>
                )}
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button variant="outline" size="sm">View Details</Button>
                {userType === 'landowner' && booking.status.includes('Pending') && (
                  <>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">Approve</Button>
                    <Button variant="destructive" size="sm">Decline</Button>
                  </>
                )}
                 {userType === 'renter' && booking.status.includes('Pending') && (
                  <Button variant="destructive" size="sm">Cancel Request</Button>
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
                For landowners: Respond to booking requests promptly to provide a good experience for potential renters.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
                For renters: Keep an eye on your booking statuses. You'll be notified once a landowner responds.
            </p>
        </CardContent>
      </Card>
    </div>
  );
}
