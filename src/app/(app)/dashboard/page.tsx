
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Home, ListChecks, MessageSquare, Settings, DollarSign, PlusCircle, Loader2, UserCircle, BarChart3, Bookmark, Crown, ReceiptText, Wallet } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip } from 'recharts';
import { useAuth } from "@/contexts/auth-context";
import { useEffect, useState, useMemo } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useListingsData } from '@/hooks/use-listings-data';
import type { Listing, Booking, Transaction } from '@/lib/types';
import { FREE_TIER_BOOKMARK_LIMIT, FREE_TIER_LISTING_LIMIT, getBookingsForUser, getTransactionsForUser } from '@/lib/mock-data';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { firebaseInitializationError } from '@/lib/firebase';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from "@/lib/utils";


const chartConfig = {
  earnings: {
    label: "Earnings ($)",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;


export default function DashboardPage() {
  const { currentUser, loading: authLoading, subscriptionStatus } = useAuth();
  const { allAvailableListings, myListings, isLoading: listingsLoading } = useListingsData();
  const [userName, setUserName] = useState("Guest");
  const [bookmarkedItems, setBookmarkedItems] = useState<Listing[]>([]);
  const [bookingCount, setBookingCount] = useState<number>(0);
  const [isBookingCountLoading, setIsBookingCountLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isTransactionsLoading, setIsTransactionsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();
  
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

  useEffect(() => {
    async function fetchData() {
      if (!currentUser) {
        setBookingCount(0);
        setTransactions([]);
        setIsBookingCountLoading(false);
        setIsTransactionsLoading(false);
        return;
      }
      setIsBookingCountLoading(true);
      setIsTransactionsLoading(true);
      try {
        const [bookings, userTransactions] = await Promise.all([
          getBookingsForUser(currentUser.uid),
          getTransactionsForUser(currentUser.uid)
        ]);
        const upcomingBookings = bookings.filter(b => b.status === 'Confirmed' || b.status === 'Pending Confirmation');
        setBookingCount(upcomingBookings.length);
        setTransactions(userTransactions);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
        setBookingCount(0);
        setTransactions([]);
        toast({ title: "Error", description: "Could not load dashboard data."});
      } finally {
        setIsBookingCountLoading(false);
        setIsTransactionsLoading(false);
      }
    }
    fetchData();
  }, [currentUser, toast]);

  const chartData = useMemo(() => {
    const last6Months = Array.from({ length: 6 }, (_, i) => subMonths(new Date(), i)).reverse();
    
    const monthlyEarnings = last6Months.map(monthDate => {
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      
      const earningsForMonth = transactions
        .filter(t => t.type === 'Landowner Payout' && t.status === 'Completed')
        .filter(t => {
            const tDate = t.date instanceof Date ? t.date : (t.date as any).toDate();
            return tDate >= monthStart && tDate <= monthEnd;
        })
        .reduce((sum, t) => sum + t.amount, 0);

      return {
        month: format(monthDate, "MMM 'yy"),
        earnings: earningsForMonth
      };
    });

    return monthlyEarnings;

  }, [transactions]);


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
  
  const currentMonthEarnings = chartData[chartData.length - 1]?.earnings || 0;
  const isPremiumUser = subscriptionStatus === 'premium';
  const atListingLimit = !isPremiumUser && myListings.length >= FREE_TIER_LISTING_LIMIT;
  const atBookmarkLimit = !isPremiumUser && bookmarkedItems.length >= FREE_TIER_BOOKMARK_LIMIT;

  const handleCreateListingClick = () => {
    if (atListingLimit) {
      toast({
        title: "Listing Limit Reached",
        description: `Free accounts can create ${FREE_TIER_LISTING_LIMIT} listing. Upgrade to Premium for more.`,
        action: <ToastAction altText="Upgrade" onClick={() => router.push('/pricing')}>Upgrade</ToastAction>,
      });
    } else if (firebaseInitializationError && !currentUser.appProfile) {
        toast({ title: "Preview Mode", description: "This action is disabled in full preview mode.", variant: "default" });
    }
    else {
      router.push('/listings/new');
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Welcome back, {userName}!</h1>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

        <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className={cn("text-3xl font-bold", (currentUser.appProfile?.walletBalance ?? 0) < 0 ? 'text-destructive' : 'text-primary')}>
                    ${(currentUser.appProfile?.walletBalance ?? 0).toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">Your current simulated balance across the platform.</p>
                 <Button asChild variant="outline" size="sm" className="mt-4">
                    <Link href="/transactions">View All Transactions</Link>
                </Button>
            </CardContent>
        </Card>

        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">This Month's Earnings</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-bold text-primary">
                    ${currentMonthEarnings.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">From completed payouts this month.</p>
                 <Button asChild variant="outline" size="sm" className="mt-4">
                    <Link href="/transactions">View Payout History</Link>
                </Button>
            </CardContent>
        </Card>
        
        <Card className="md:col-span-2 lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="text-primary h-6 w-6" />
                Earnings Overview
              </CardTitle>
              <CardDescription>Your landowner payout trend over the last 6 months.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-[250px] w-full">
                {isTransactionsLoading ? (
                    <div className="flex justify-center items-center h-full">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <p className="ml-2 text-sm text-muted-foreground">Loading earnings data...</p>
                    </div>
                ) : chartData.every(d => d.earnings === 0) ? (
                     <div className="flex justify-center items-center h-full text-center">
                        <p className="text-sm text-muted-foreground">No earnings recorded in the last 6 months.<br/>Approve bookings to see your earnings here!</p>
                     </div>
                ) : (
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
                      <RechartsTooltip
                        cursor={true}
                        content={<ChartTooltipContent indicator="dot" />}
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
                )}
              </div>
            </CardContent>
          </Card>
        
        {isPremiumUser && (
          <Card className="md:col-span-2 lg:col-span-3 border-premium ring-1 ring-premium/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-premium">
                <BarChart3 className="h-6 w-6"/> Market Insights (Premium)
              </CardTitle>
              <CardDescription>Exclusive data to help you optimize your listings and pricing.</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="border-premium/50 bg-premium/5 text-premium">
                <BarChart3 className="h-4 w-4 text-premium" />
                <AlertTitle className="text-premium">Coming Soon!</AlertTitle>
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
            <p>You have <strong>{myListings.length} active listing{myListings.length === 1 ? '' : 's'}</strong>.</p> 
            <div className="flex flex-col gap-2">
              <Button asChild variant="outline" className="w-full" disabled={(firebaseInitializationError !== null && !currentUser.appProfile)}>
                <Link href="/my-listings">View My Listings</Link>
              </Button>
              <Button onClick={handleCreateListingClick} className="w-full" disabled={(firebaseInitializationError !== null && !currentUser.appProfile)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Create New Listing
              </Button>
            </div>
            {atListingLimit && (
                 <p className="text-xs text-premium mt-2 flex items-center gap-1">
                    <Crown className="h-3 w-3 text-premium"/> Limit reached. <Link href="/pricing" className="text-premium hover:underline">Upgrade</Link> for more.
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
            {isBookingCountLoading ? (
               <div className="flex items-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Loading bookings...</div>
            ) : (
               <p>You have <strong>{bookingCount} active bookings/requests</strong>.</p>
            )}
            <Button asChild variant="outline" className="w-full" disabled={(firebaseInitializationError !== null && !currentUser.appProfile)}>
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
            <p className="text-sm text-muted-foreground">This feature is currently using placeholder data.</p>
            <Button asChild variant="outline" className="w-full" disabled={(firebaseInitializationError !== null && !currentUser.appProfile)}>
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
                  {bookmarkedItems.slice(0, 5).map(listing => (
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
            <Button asChild variant="outline" className="w-full" disabled={(firebaseInitializationError !== null && !currentUser.appProfile)}>
              <Link href="/bookmarks">View All Bookmarks</Link>
            </Button>
            {atBookmarkLimit && (
              <p className="text-xs text-premium mt-2 flex items-center gap-1">
                <Crown className="h-3 w-3 text-premium"/> Limit reached. <Link href="/pricing" className="text-premium hover:underline">Upgrade</Link> for more.
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
            <Button asChild variant="outline" className="w-full" disabled={(firebaseInitializationError !== null && !currentUser.appProfile)}>
              <Link href="/profile">Edit Profile</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
