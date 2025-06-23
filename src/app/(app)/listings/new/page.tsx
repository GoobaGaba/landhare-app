
import { ListingForm } from "@/components/listing-form/listing-form";
import { Suspense } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

function ListingFormFallback() {
    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader><CardTitle>Create New Land Listing</CardTitle></CardHeader>
            <CardContent className="flex justify-center items-center min-h-[300px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2">Loading form...</p>
            </CardContent>
        </Card>
    )
}

export default function NewListingPage() {
  return (
    <div>
        <Suspense fallback={<ListingFormFallback />}>
            <ListingForm />
        </Suspense>
    </div>
  );
}
