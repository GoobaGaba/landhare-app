
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { getPlatformMetrics, runBotSimulationCycle, ADMIN_UIDS } from '@/lib/mock-data';
import type { PlatformMetrics } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Users, Home, Book, DollarSign, Bot, Loader2, AlertTriangle, Shield, PlayCircle, Info, Copy, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';

export default function AdminDashboardPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [siteUrl, setSiteUrl] = useState<string>('');
  const [referrerPattern, setReferrerPattern] = useState<string>('');

  useEffect(() => {
    // This value is set during the App Hosting build process
    const url = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    setSiteUrl(url);

    // Create the pattern needed for Google Cloud API key restriction
    try {
      const urlObject = new URL(url);
      setReferrerPattern(`${urlObject.hostname}/*`);
    } catch (e) {
      setReferrerPattern('Could not determine referrer pattern.');
    }
  }, []);

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast({ title: 'Copied!', description: 'The text has been copied to your clipboard.' });
  };


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
    if (!currentUser || !ADMIN_UIDS.includes(currentUser.uid)) {
      setIsLoading(false);
      return;
    }
    fetchMetrics();
  }, [currentUser, authLoading, fetchMetrics]);
  
  const handleRunBots = async () => {
      setIsSimulating(true);
      toast({
            title: "Bot Simulation Started",
            description: "Generating new listings and booking activity... This may take a moment.",
        });
      try {
        const result = await runBotSimulationCycle();
        toast({
            title: "Bot Simulation Complete",
            description: result.message,
        });
        await fetchMetrics(); // Re-fetch metrics to update the dashboard
      } catch (error: any) {
            toast({
            title: "Bot Simulation Failed",
            description: error.message || "An unexpected error occurred.",
            variant: "destructive",
        });
      } finally {
        setIsSimulating(false);
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

  if (!currentUser || !ADMIN_UIDS.includes(currentUser.uid)) {
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
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      <p className="text-muted-foreground">
        A top-level overview of the LandShare platform's simulated economy and user activity.
      </p>
      
      <Card className="border-accent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-accent"><Globe className="h-5 w-5"/>Deployment Information</CardTitle>
          <CardDescription>
            Use this information to secure your Google Cloud API keys. This is only visible to admins.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-1">Your Live Site URL</p>
            <div className="flex items-center gap-2">
              <Input value={siteUrl} readOnly className="bg-muted"/>
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(siteUrl)}><Copy className="h-4 w-4"/></Button>
            </div>
          </div>
           <div>
            <p className="text-sm font-medium mb-1">API Key Referrer Pattern (for Google Cloud)</p>
            <div className="flex items-center gap-2">
              <Input value={referrerPattern} readOnly className="bg-muted font-mono text-xs"/>
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(referrerPattern)}><Copy className="h-4 w-4"/></Button>
            </div>
             <p className="text-xs text-muted-foreground mt-1">Copy this value and add it to your Google Maps API Key's "HTTP referrers" restrictions to secure it.</p>
          </div>
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
          <CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5 text-primary"/>Bot Simulation Controls</CardTitle>
          <CardDescription>
            Generate realistic, automated activity on the platform to test its economic model and data tracking at scale. This will create real data if Firebase is configured.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Clicking the button below will trigger a set of actions from pre-defined "bot" users. This includes creating new listings and booking existing ones, which will affect all platform metrics.
          </p>
          <Button onClick={handleRunBots} disabled={isSimulating}>
            {isSimulating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PlayCircle className="mr-2 h-4 w-4"/>}
            Run Bot Simulation Cycle
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
