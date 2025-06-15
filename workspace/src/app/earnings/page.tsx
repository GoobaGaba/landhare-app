
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, BarChart3, Construction } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function EarningsPage() {
  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <Card className="max-w-3xl mx-auto shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="h-10 w-10 text-primary" />
            <CardTitle className="text-3xl md:text-4xl font-bold">Earnings Report</CardTitle>
          </div>
          <CardDescription>
            Track your income and financial performance on LandShare.
          </CardDescription>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none">
          <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-muted rounded-lg">
            <BarChart3 className="h-16 w-16 text-primary/70 mb-6" />
            <h2 className="text-2xl font-semibold mb-3">Earnings Dashboard Coming Soon!</h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              We're working on a comprehensive earnings dashboard that will provide you with detailed insights into your revenue, payouts, and financial trends from your land listings.
            </p>
            <p className="text-sm text-muted-foreground">
              This feature will include:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground/80 my-3 text-left max-w-xs mx-auto">
              <li>Monthly and yearly earnings breakdowns.</li>
              <li>Transaction history.</li>
              <li>Payout summaries.</li>
              <li>Performance metrics for your listings.</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Stay tuned for updates! In the meantime, you can manage your listings and bookings through your dashboard.
            </p>
            <Button asChild className="mt-8">
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
