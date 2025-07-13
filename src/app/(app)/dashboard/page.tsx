
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Home, ListChecks, MessageSquare, Settings, DollarSign, PlusCircle, Loader2, UserCircle, BarChart3, Bookmark, Crown, ReceiptText, Wallet, Shield } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip } from 'recharts';
import { useAuth } from "@/contexts/auth-context";
import { useEffect, useState, useMemo } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useListingsData } from '@/hooks/use-listings-data';
import type { Listing, Booking, Transaction, MarketInsightsData } from '@/lib/types';
import { ADMIN_EMAILS, FREE_TIER_BOOKMARK_LIMIT, FREE_TIER_LISTING_LIMIT, getBookingsForUser, getTransactionsForUser, getMarketInsights } from '@/lib/mock-data';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { firebaseInitializationError } from '@/lib/firebase';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from "@/lib/utils";
import { MarketInsights } from "@/components/dashboard/market-insights";


const chartConfig = {
  earnings: {
    label: "Earnings ($)",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;


export default function DashboardPage() {
  const { currentUser, loading: authLoading, subscriptionStatus } = useAuth();
  const { myListings, isLoading: listingsLoading } = useListingsData();
  const [userName, setUserName] = useState("Guest");
  const [bookmarkedCount, setBookmarkedCount] = useState<number>(0);
  const [bookingCount, setBookingCount] = useState<number>(0);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [marketInsights, setMarketInsights] = useState<MarketInsightsData | null>(null);
  const [isInsightsLoading, setIsInsightsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  
  const isUserAdmin = useMemo(() => {
      if (!currentUser?.email) return false;
      return ADMIN_EMAILS.includes(currentUser.email);
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      setUserName(currentUser.appProfile?.name || "User");
      setBookmarkedCount(currentUser.appProfile?.bookmarkedListingIds?.length || 0);
    } else {
      setUserName("Guest");
      setBookmarkedCount(0);
    }
  }, [currentUser]);


  useEffect(() => {
    async function fetchData() {
      if (!currentUser) {
        setBookingCount(0);
        setTransactions([]);
        setIsDataLoading(false);
        return;
      }
      setIsDataLoading(true);
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
        setIsDataLoading(false);
      }
    }
    fetchData();
  }, [currentUser, toast]);

  useEffect(() => {
    async function fetchInsights() {
        if (subscriptionStatus === 'premium') {
            setIsInsightsLoading(true);
            try {
                const insightsData = await getMarketInsights();
                setMarketInsights(insightsData);
            } catch (error) {
                console.error("Failed to fetch market insights:", error);
                toast({ title: "Error", description: "Could not load market insights.", variant: "destructive" });
            } finally {
                setIsInsightsLoading(false);
            }
        } else {
            setMarketInsights(null);
        }
    }
    if (!authLoading) {
      fetchInsights();
    }
  }, [subscriptionStatus, authLoading, toast]);

  const chartData = useMemo(() => {
    const last6Months = Array.from({ length: 6 }, (_, i) => subMonths(new Date(), i)).reverse();
    
    return last6Months.map(monthDate => {
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

  }, [transactions]);


  if (authLoading || (currentUser && (listingsLoading || isDataLoading))) {
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
            Please <Link href="/login" className="underline text-primary hover:underline">log in</Link> to view your dashboard.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  const currentMonthEarnings = chartData[chartData.length - 1]?.earnings || 0;
  const isPremiumUser = subscriptionStatus === 'premium';
  const atListingLimit = !isPremiumUser && myListings.length >= FREE_TIER_LISTING_LIMIT;
  const atBookmarkLimit = !isPremiumUser && bookmarkedCount >= FREE_TIER_BOOKMARK_LIMIT;

  const handleCreateListingClick = () => {
    if (atListingLimit) {
      toast({
        title: "Listing Limit Reached",
        description: `Standard accounts can create ${FREE_TIER_LISTING_LIMIT} listing. Upgrade to Premium for more.`,
        action: <ToastAction altText="Upgrade" onClick={() => router.push('/pricing')}>Upgrade</ToastAction>,
      });
    } else {
      router.push('/listings/new');
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Welcome back, {userName}!</h1>
      
      {isUserAdmin && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Shield className="h-6 w-6"/>
              Administrator Tools
            </CardTitle>
            <CardDescription>
              Access platform-wide metrics, user data, and simulation controls. This panel is only visible to you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/admin">Go to Admin Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      )}

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
                {isDataLoading ? (
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
        
        {isPremiumUser ? (
            <div className="md:col-span-2 lg:col-span-3">
              {isInsightsLoading ? (
                <Card className="flex items-center justify-center min-h-[300px]">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="ml-2 text-muted-foreground">Loading Market Insights...</p>
                </Card>
              ) : marketInsights ? (
                <MarketInsights insights={marketInsights} />
              ) : (
                <Card className="flex items-center justify-center min-h-[300px] bg-muted/30">
                  <p className="text-muted-foreground">Could not load market insights data.</p>
                </Card>
              )}
            </div>
        ) : (
            <Card className="md:col-span-2 lg:col-span-3 bg-muted/30">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Crown className="text-premium h-6 w-6"/> Unlock Market Insights
                    </CardTitle>
                    <CardDescription>Upgrade to Premium to see exclusive market data like popular amenities and average pricing in your area to optimize your listings.</CardDescription>
                </CardHeader>
                <CardContent>
                     <Button asChild className="bg-premium hover:bg-premium/90 text-premium-foreground">
                        <Link href="/pricing">Upgrade to Premium</Link>
                    </Button>
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
              <Button asChild variant="outline" className="w-full">
                <Link href="/my-listings">View My Listings</Link>
              </Button>
              <Button onClick={handleCreateListingClick} className="w-full">
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
            {isDataLoading ? (
               <div className="flex items-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Loading bookings...</div>
            ) : (
               <p>You have <strong>{bookingCount} active bookings/requests</strong>.</p>
            )}
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
            <p className="text-sm text-muted-foreground">This feature is currently using placeholder data.</p>
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
            {isDataLoading ? (
              <div className="flex items-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading bookmarks...
              </div>
            ) : (
              <p>You have <strong>{bookmarkedCount} bookmarked listing{bookmarkedCount === 1 ? '' : 's'}</strong>.</p>
            )}
            <Button asChild variant="outline" className="w-full">
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
            <Button asChild variant="outline" className="w-full">
              <Link href="/profile">Edit Profile</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

    