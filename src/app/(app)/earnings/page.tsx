
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";

export default function EarningsPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Earnings Report</h1>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-primary" />
            Earnings Details
          </CardTitle>
          <CardDescription>
            This is a placeholder for your earnings report. Detailed breakdown and history will be displayed here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Detailed earnings data, charts, and transaction history will appear here once implemented.
          </p>
          {/* Placeholder for future content */}
          <div className="mt-6 p-8 border-2 border-dashed border-muted rounded-lg text-center text-muted-foreground">
            Earnings data and visualizations coming soon.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
