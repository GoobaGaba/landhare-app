
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Home, ListChecks, MessageSquare, Settings, DollarSign, PlusCircle, Loader2, UserCircle, BarChart3, Bookmark } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { LineChart, Line, CartesianGrid, XAxis, YAxis } from 'recharts';
import { useAuth } from "@/contexts/auth-context";
import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useListingsData } from '@/hooks/use-listings-data';
import type { Listing } from '@/lib/types';
import { FREE_TIER_BOOKMARK_LIMIT } from '@/lib/mock-data';


// Mock data for the earnings graph
const chartData = [
  { month: "Jan '24", earnings: 220 },
  { month: "Feb '24", earnings: 310 },
  { month: "Mar '24", earnings: 400 },
  { month: "Apr '24", earnings: 350 },
  { month: "May '24", earnings: 520 },
  { month: "Jun '24", earnings: 610 }, // Current month example
];

const chartConfig = {
  earnings: {
    label: "Earnings ($)",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;


export default function DashboardPage() {
  const { currentUser, loading: authLoading, subscriptionStatus } = useAuth();
  const { allAvailableListings, isLoading: listingsLoading } = useListingsData();
  const [userName, setUserName] = useState("Guest");
  const [bookmarkedItems, setBookmarkedItems] = useState<Listing[]>([]);
  
  useEffect(() => {
    if (currentUser) {
      setUserName(currentUser.displayName || currentUser.appProfile?.name || currentUser.email || "User");
    } else {
      setUserName("Guest");
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser?.appProfile?.bookmarkedListingIds && allAvailableListings.length > 0) {
      const userBookmarkIds = currentUser.appProfile.bookmarkedListingIds;
      const filtered = allAvailableListings.filter(listing => userBookmarkIds.includes(listing.id));
      setBookmarkedItems(filtered);
    } else {
      setBookmarkedItems([]);
    }
  }, [currentUser, allAvailableListings]);

  if (authLoading || subscriptionStatus === 'loading' || (currentUser && listingsLoading)) {
     return (
      <div className="flex justify-center items-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCircle className="h-6 w-6 text-primary" />
            Access Denied
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Please <Link href="/login" className="text-primary hover:underline">log in</Link> to view your dashboard.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  const currentMonthEarnings = chartData[chartData.length - 1].earnings;
  const isPremiumUser = subscriptionStatus === 'premium';

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Welcome back, {userName}!</h1>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Earnings Overview - Potentially enhanced for premium users or based on actual earnings data */}
        <Card className="md:col-span-2 lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="text-primary h-6 w-6" />
                Earnings Overview
              </CardTitle>
              <CardDescription>Your income trend over the last {chartData.length} months. (Mock data)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">This Month's Earnings (June '24 - Mock)</p>
                <p className="text-2xl font-bold text-primary">
                  ${currentMonthEarnings.toFixed(2)}
                </p>
              </div>
              <div className="h-[250px] w-full">
                <ChartContainer config={chartConfig} className="h-full w-full">
                  <LineChart
                    accessibilityLayer
                    data={chartData}
                    margin={{ top: 20, right: 20, left: -10, bottom: 5 }}
                  >
                    <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      className="text-xs"
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(value) => `$${value}`}
                      className="text-xs"
                      width={60}
                    />
                    <ChartTooltip
                      cursor={true}
                      content={<ChartTooltipContent indicator="dot" labelFormatter={(value) => `Month: ${value}`} />}
                    />
                    <Line
                      dataKey="earnings"
                      type="monotone"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2.5}
                      dot={{
                        fill: "hsl(var(--primary))",
                        r: 4,
                      }}
                      activeDot={{
                        r: 7,
                        fill: "hsl(var(--background))",
                        stroke: "hsl(var(--primary))",
                      }}
                    />
                  </LineChart>
                </ChartContainer>
              </div>
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link href="/earnings">View Full Earnings Report</Link>
              </Button>
            </CardContent>
          </Card>
        
        {/* Market Insights - Placeholder for Premium users */}
        {isPremiumUser && (
          <Card className="md:col-span-2 lg:col-span-3 border-primary ring-1 ring-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <BarChart3 className="h-6 w-6"/> Market Insights (Premium)
              </CardTitle>
              <CardDescription>Exclusive data to help you optimize your listings and pricing.</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <BarChart3 className="h-4 w-4" />
                <AlertTitle>Coming Soon!</AlertTitle>
                <AlertDescription>
                  Detailed market trends, demand forecasts, and competitive analysis will be available here for Premium subscribers.
                  This could include AI-powered insights on optimal pricing, amenity popularity, and seasonal demand.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}


        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Home className="h-6 w-6 text-primary"/> My Listings</CardTitle>
            <CardDescription>Manage your active and past land listings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Real data for active listings count would come from backend */}
            <p>You have <strong>X active listings</strong>. (Count from Firestore needed)</p> 
            <div className="flex flex-col sm:flex-row gap-2">
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link href="/my-listings">View My Listings</Link>
              </Button>
              <Button asChild className="w-full sm:w-auto">
                {/* Placeholder: This button might be disabled or prompt for upgrade if user is free and at listing limit */}
                <Link href="/listings/new"><PlusCircle className="mr-2 h-4 w-4" /> Create New Listing</Link>
              </Button>
            </div>
            {!isPremiumUser && (
                 <p className="text-xs text-muted-foreground mt-2">
                    Free accounts can list 1 property. <Link href="/pricing" className="text-primary hover:underline">Upgrade to Premium</Link> for unlimited listings.
                </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ListChecks className="h-6 w-6 text-primary"/> Bookings</CardTitle>
            <CardDescription>View and manage your land rental bookings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
             {/* Real data for bookings count would come from backend */}
            <p>You have <strong>Y upcoming bookings/rentals</strong>. (Count from Firestore needed)</p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/bookings">View Bookings</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MessageSquare className="h-6 w-6 text-primary"/> Messages</CardTitle>
            <CardDescription>Check your conversations with renters/landowners.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Real data for unread messages would come from backend */}
            <p>You have <strong>Z unread messages</strong>. (Count from Firestore needed)</p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/messages">Go to Messages</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bookmark className="h-6 w-6 text-primary"/> My Bookmarks</CardTitle>
            <CardDescription>Access your saved land listings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {listingsLoading && !bookmarkedItems.length ? (
              <div className="flex items-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading bookmarks...
              </div>
            ) : bookmarkedItems.length > 0 ? (
              <>
                <p>You have <strong>{bookmarkedItems.length} bookmarked listing{bookmarkedItems.length === 1 ? '' : 's'}</strong>.</p>
                <ul className="space-y-1 text-sm max-h-24 overflow-y-auto custom-scrollbar pr-2">
                  {bookmarkedItems.slice(0, 5).map(listing => ( // Show up to 5 directly
                    <li key={listing.id}>
                      <Link href={`/listings/${listing.id}`} className="text-primary hover:underline truncate block">
                        {listing.title}
                      </Link>
                    </li>
                  ))}
                </ul>
                {bookmarkedItems.length > 5 && (
                  <p className="text-xs text-muted-foreground">...and {bookmarkedItems.length - 5} more.</p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">You have no listings bookmarked yet.</p>
            )}
            <Button asChild variant="outline" className="w-full">
              <Link href="/bookmarks">View All Bookmarks</Link>
            </Button>
            {subscriptionStatus === 'free' && bookmarkedItems.length >= FREE_TIER_BOOKMARK_LIMIT && (
              <p className="text-xs text-destructive mt-2">
                Standard accounts can save up to {FREE_TIER_BOOKMARK_LIMIT} bookmarks. <Link href="/pricing" className="text-primary hover:underline">Upgrade to Premium</Link> for unlimited.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Settings className="h-6 w-6 text-primary"/> Profile Settings</CardTitle>
            <CardDescription>Update your personal information and preferences.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/profile">Edit Profile</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

    