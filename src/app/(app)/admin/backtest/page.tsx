
'use client';

import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Shield } from 'lucide-react';
import { BacktestSimulator } from '@/components/admin/backtest-simulator';
import { ADMIN_UIDS } from '@/lib/mock-data';

export default function BacktestPage() {
  const { currentUser, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Verifying access...</p>
      </div>
    );
  }

  if (!currentUser || !ADMIN_UIDS.includes(currentUser.uid)) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive"><Shield className="h-6 w-6"/> Access Denied</CardTitle>
          <CardDescription>You do not have permission to view this tool.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">The Backtest BETA is restricted to platform administrators.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
       <div>
        <h1 className="text-3xl font-bold">Landhare Backtest BETA</h1>
        <p className="text-muted-foreground">
         Interactive business and economic backtesting environment.
        </p>
      </div>
      <BacktestSimulator />
    </div>
  );
}
