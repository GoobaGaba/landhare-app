
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { getPlatformMetrics, processMonthlyEconomicCycle, ADMIN_EMAILS } from '@/lib/mock-data';
import type { PlatformMetrics } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Users, Home, Book, DollarSign, Bot, Loader2, AlertTriangle, Shield, PlayCircle, Rocket, FlaskConical, ExternalLink, Repeat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { LaunchChecklist } from '@/components/admin/launch-checklist';
import Link from 'next/link';


export default function AdminDashboardPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingCycle, setIsProcessingCycle] = useState(false);

  const fetchMetrics = useCallback(async () => {
      setIsLoading(true);
      try {
        const platformMetrics = await getPlatformMetrics();
        setMetrics(platformMetrics);
      } catch (error: any) {
        toast({ title: 'Error', description: `Failed to load platform metrics: ${error.message}`, variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    }, [toast]);


  useEffect(() => {
    if (authLoading) return;
    if (!currentUser?.email || !ADMIN_EMAILS.includes(currentUser.email)) {
      setIsLoading(false);
      return;
    }
    fetchMetrics();
  }, [currentUser, authLoading, fetchMetrics]);
  
  const handleRunEconomicCycle = async () => {
      setIsProcessingCycle(true);
      toast({
            title: "Economic Cycle Started",
            description: "Processing monthly lease payments... This may take a moment.",
        });
      try {
        const result = await processMonthlyEconomicCycle();
        toast({
            title: "Economic Cycle Complete",
            description: result.message,
        });
        await fetchMetrics(); // Re-fetch metrics to update the dashboard
      } catch (error: any) {
            toast({
            title: "Economic Cycle Failed",
            description: error.message || "An unexpected error occurred.",
            variant: "destructive",
        });
      } finally {
        setIsProcessingCycle(false);
      }
  };

  if (authLoading || (isLoading && !metrics)) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading Admin Dashboard...</p>
      </div>
    );
  }

  if (!currentUser?.email || !ADMIN_EMAILS.includes(currentUser.email)) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive"><Shield className="h-6 w-6"/> Access Denied</CardTitle>
          <CardDescription>You do not have permission to view this page.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">This area is restricted to platform administrators.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      </div>
      <p className="text-muted-foreground">
        A top-level overview of the LandShare platform's simulated economy and user activity.
      </p>

       <Card className="border-accent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-accent"><Rocket className="h-5 w-5"/>Launch Readiness Checklist</CardTitle>
          <CardDescription>
            An interactive checklist to track critical configuration, features, and future goals for the platform. Progress is saved automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LaunchChecklist />
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">${(metrics?.totalRevenue || 0).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">From all fees and subscriptions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Service Fee Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(metrics?.totalServiceFees || 0).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">From landowner payouts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subscription Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(metrics?.totalSubscriptionRevenue || 0).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">From premium user plans</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">Total registered accounts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Listings</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalListings || 0}</div>
            <p className="text-xs text-muted-foreground">Active and inactive listings</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Book className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalBookings || 0}</div>
            <p className="text-xs text-muted-foreground">All booking requests made</p>
          </CardContent>
        </Card>
      </div>

       <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FlaskConical className="h-5 w-5 text-primary"/>Landhare Backtest BETA</CardTitle>
          <CardDescription>
            An interactive tool to simulate business strategies and backtest economic models over time. Adjust variables and see their impact on a dynamic graph.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <Button asChild>
                <Link href="/admin/backtest">Launch Backtest Tool <ExternalLink className="ml-2 h-4 w-4" /></Link>
            </Button>
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5 text-primary"/>Economic Cycle Controls</CardTitle>
          <CardDescription>
            Manually trigger the monthly processing of all active lease payments on the platform. This affects user wallets and platform revenue metrics.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Clicking the button below will find all "Confirmed" monthly or lease-to-own bookings and process one month's rent payment. Renter wallets will be debited, landowner wallets credited, and service fees collected.
          </p>
          <Button onClick={handleRunEconomicCycle} disabled={isProcessingCycle}>
            {isProcessingCycle ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Repeat className="mr-2 h-4 w-4"/>}
            Process Monthly Economic Cycle
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
