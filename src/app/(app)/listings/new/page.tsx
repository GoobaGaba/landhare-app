'use client';
import { ListingForm } from "@/components/listing-form/listing-form";
import { Suspense } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2, AlertTriangle } from 'lucide-react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { Button } from "@/components/ui/button";
import Link from 'next/link';

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
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
        return (
             <Card className="max-w-2xl mx-auto my-8">
                <CardHeader>
                    <CardTitle className="text-destructive flex items-center gap-2"><AlertTriangle/> Maps API Error</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>The Google Maps API key is missing. This form requires geocoding services to function.</p>
                    <p className="text-xs text-muted-foreground mt-2">Please set <code className="p-1 bg-muted rounded-sm">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in your <code className="p-1 bg-muted rounded-sm">.env.local</code> file.</p>
                    <Button asChild variant="outline" className="mt-4"><Link href="/dashboard">Go to Dashboard</Link></Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <APIProvider apiKey={apiKey}>
            <Suspense fallback={<ListingFormFallback />}>
                <ListingForm />
            </Suspense>
        </APIProvider>
    );
}
