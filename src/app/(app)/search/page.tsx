'use client';

import { Suspense } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { AlertTriangle, Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';

const SearchPageContent = dynamic(() => import('@/components/land-search/search-content').then(mod => mod.SearchPageContent), {
  ssr: false,
  loading: () => <LoadingFallback />,
});

function LoadingFallback() {
    return (
        <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    )
}

export default function SearchPage() {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey || apiKey.includes("...") || apiKey.length < 10) {
        return (
            <div className="container mx-auto px-4 py-8">
                <Card className="max-w-2xl mx-auto my-8">
                    <CardHeader>
                        <CardTitle className="text-destructive flex items-center gap-2"><AlertTriangle/> Map Service Error</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>The Google Maps API key is missing or invalid, which is required for the Search and Map functionality.</p>
                        <p className="text-sm text-muted-foreground mt-2">
                           <strong>Action Required:</strong> For local development, ensure `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set in your `.env.local` file. For deployment, ensure it is set as an environment variable for your App Hosting backend. Without a valid key, map features will not work on the live site.
                        </p>
                        <Button asChild variant="outline" className="mt-4"><Link href="/">Go Home</Link></Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <APIProvider apiKey={apiKey}>
            <Suspense fallback={<LoadingFallback />}>
                <SearchPageContent />
            </Suspense>
        </APIProvider>
    )
}
