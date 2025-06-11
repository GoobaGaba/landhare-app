
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ListChecks, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function MyListingsPage() {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">My Listings</h1>
        <Button asChild>
          <Link href="/listings/new">
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Listing
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-6 w-6 text-primary" />
            Manage Your Land Listings
          </CardTitle>
          <CardDescription>
            View, edit, or unlist your land offerings. You can also create new listings from here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Your active and inactive listings will be displayed here. You'll be able to manage them, see their performance, and make updates.
          </p>
          {/* Placeholder for future content */}
          <div className="mt-6 p-8 border-2 border-dashed border-muted rounded-lg text-center text-muted-foreground">
            Listing management features coming soon.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
