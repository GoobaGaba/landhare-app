import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Home, ListChecks, MessageSquare, Settings, DollarSign, PlusCircle } from "lucide-react";

// Mock user data - in a real app, this would come from authentication context
const mockUser = {
  name: "Alex Landowner",
  type: "landowner", // or "renter"
};

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Welcome back, {mockUser.name}!</h1>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Home className="text-primary"/> My Listings</CardTitle>
            <CardDescription>Manage your active and past land listings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>You have <strong>3 active listings</strong>.</p>
            <Button asChild variant="outline">
              <Link href="/my-listings">View My Listings</Link>
            </Button>
            <Button asChild className="ml-2">
              <Link href="/listings/new"><PlusCircle className="mr-2 h-4 w-4" /> Create New Listing</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ListChecks className="text-primary"/> Bookings</CardTitle>
            <CardDescription>View and manage your land rental bookings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {mockUser.type === "landowner" ? (
              <p>You have <strong>2 upcoming bookings</strong>.</p>
            ) : (
              <p>You have <strong>1 active rental</strong>.</p>
            )}
            <Button asChild variant="outline">
              <Link href="/bookings">View Bookings</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MessageSquare className="text-primary"/> Messages</CardTitle>
            <CardDescription>Check your conversations with renters/landowners.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>You have <strong>5 unread messages</strong>.</p>
            <Button asChild variant="outline">
              <Link href="/messages">Go to Messages</Link>
            </Button>
          </CardContent>
        </Card>

        {mockUser.type === "landowner" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><DollarSign className="text-primary"/> Earnings</CardTitle>
              <CardDescription>Track your income from LandShare Connect.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>Total earnings this month: <strong>$450.00</strong>.</p>
              <Button asChild variant="outline">
                <Link href="/earnings">View Earnings Report</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Settings className="text-primary"/> Profile Settings</CardTitle>
            <CardDescription>Update your personal information and preferences.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/profile">Edit Profile</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
