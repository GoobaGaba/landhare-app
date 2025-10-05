'use client';

import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Shield } from 'lucide-react';
import { BacktestSimulator } from '@/components/admin/backtest-simulator';

export default function BacktestPage() {
  const { currentUser, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // This page is now accessible to all logged-in users.
  if (!currentUser) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive"><Shield className="h-6 w-6"/> Access Denied</CardTitle>
          <CardDescription>You must be logged in to view this tool.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">The Backtest BETA is restricted to logged-in users.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
       <div>
        <h1 className="text-3xl font-bold">LandShare Backtest BETA</h1>
        <p className="text-muted-foreground">
         Interactive business and economic backtesting environment.
        </p>
      </div>
      <BacktestSimulator />
    </div>
  );
}
