
'use client';

import { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, MapIcon, MapPin } from "lucide-react";
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow } from '@vis.gl/react-google-maps';
import type { Listing } from '@/lib/types';
import { Button } from '../ui/button';
import Link from 'next/link';

interface MapViewProps {
  listings: Listing[];
}

export function MapView({ listings }: MapViewProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);

  // Default center of the US for when no listings are available
  const defaultPosition = { lat: 39.8283, lng: -98.5795 };
  
  const mapCenter = listings.length > 0 && listings[0].lat && listings[0].lng
    ? { lat: listings[0].lat, lng: listings[0].lng }
    : defaultPosition;

  if (!apiKey) {
    return (
      <Card className="sticky top-20 shadow-md h-[calc(100vh-10rem)] flex items-center justify-center bg-muted/30">
        <CardContent className="text-center p-4">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-destructive">Map Service Unavailable</h3>
          <p className="text-sm text-muted-foreground mt-2">
            The Google Maps API key is missing. Please set <code className="text-xs bg-red-100 dark:bg-red-900 p-1 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in your <code className="text-xs bg-red-100 dark:bg-red-900 p-1 rounded">.env.local</code> file and restart the server.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="sticky top-24 shadow-md h-[calc(100vh-12rem)] flex flex-col bg-muted/30">
      <APIProvider apiKey={apiKey}>
        <Map
          defaultCenter={mapCenter}
          defaultZoom={listings.length > 0 ? 9 : 4}
          gestureHandling={'greedy'}
          disableDefaultUI={true}
          mapId={'landshare-map'}
          className="w-full h-full rounded-lg"
        >
          {listings.map((listing) => {
            if (!listing.lat || !listing.lng) return null;
            return (
              <AdvancedMarker
                key={listing.id}
                position={{ lat: listing.lat, lng: listing.lng }}
                onClick={() => setSelectedListingId(listing.id)}
              >
                <Pin background={'hsl(var(--primary))'} glyphColor={'hsl(var(--primary-foreground))'} borderColor={'hsl(var(--primary-foreground))'} />
              </AdvancedMarker>
            )
          })}

          {selectedListingId && (
            <InfoWindow
              position={listings.find(l => l.id === selectedListingId) ? { lat: listings.find(l => l.id === selectedListingId)!.lat!, lng: listings.find(l => l.id === selectedListingId)!.lng! } : undefined}
              onCloseClick={() => setSelectedListingId(null)}
              pixelOffset={[0, -40]}
            >
              <div className="p-1 max-w-xs">
                <h4 className="font-bold text-sm text-primary mb-1">{listings.find(l => l.id === selectedListingId)?.title}</h4>
                <p className="text-xs text-muted-foreground">${listings.find(l => l.id === selectedListingId)?.price} / {listings.find(l => l.id === selectedListingId)?.pricingModel}</p>
                <Button asChild variant="link" size="sm" className="p-0 h-auto text-xs mt-1">
                  <Link href={`/listings/${selectedListingId}`}>View Details</Link>
                </Button>
              </div>
            </InfoWindow>
          )}

        </Map>
      </APIProvider>
    </Card>
  );
}
