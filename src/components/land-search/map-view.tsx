
'use client';

import { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import type { Listing } from '@/lib/types';
import { Button } from '../ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface MapViewProps {
  listings: Listing[];
}

// A component that uses the Map context to control its view.
const MapController = ({ listings }: { listings: Listing[] }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !listings) return;

    // When there are no listings, don't change the map view.
    // It will remain at the default centered on the US.
    if (listings.length === 0) {
        // Optional: you could reset the view here if desired
        // map.setCenter({ lat: 39.8283, lng: -98.5795 });
        // map.setZoom(4);
        return;
    }

    const bounds = new google.maps.LatLngBounds();
    let validListings = 0;
    listings.forEach(listing => {
      if (listing.lat && listing.lng) {
        bounds.extend({ lat: listing.lat, lng: listing.lng });
        validListings++;
      }
    });

    if (validListings === 0) return;

    // If there's only one valid listing, center on it with a fixed zoom.
    if (validListings === 1) {
        const firstValidListing = listings.find(l => l.lat && l.lng);
        if (firstValidListing) {
            map.setCenter({ lat: firstValidListing.lat!, lng: firstValidListing.lng! });
            map.setZoom(12);
        }
    } else {
        // If there are multiple listings, fit them all within the map view.
        map.fitBounds(bounds, 100); // 100px padding
    }

  }, [map, listings]);

  return null; // This component does not render anything.
};

export function MapView({ listings }: MapViewProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);

  // Default center of the US for when no listings are available
  const defaultPosition = { lat: 39.8283, lng: -98.5795 };
  
  if (!apiKey) {
    return (
      <Card className="sticky top-20 shadow-md h-[calc(100vh-10rem)] flex items-center justify-center bg-muted/30">
        <div className="text-center p-4">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-destructive">Map Service Unavailable</h3>
          <p className="text-sm text-muted-foreground mt-2">
            The Google Maps API key is missing. Please set <code className="text-xs bg-red-100 dark:bg-red-900 p-1 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in your <code className="text-xs bg-red-100 dark:bg-red-900 p-1 rounded">.env.local</code> file and restart the server.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="sticky top-24 shadow-md h-[calc(100vh-12rem)] flex flex-col bg-muted/30">
      <APIProvider apiKey={apiKey}>
        <Map
          defaultCenter={defaultPosition}
          defaultZoom={4}
          gestureHandling={'greedy'}
          disableDefaultUI={true}
          mapId={'landshare-map'}
          className="w-full h-full rounded-lg"
        >
          {listings.map((listing) => {
            if (!listing.lat || !listing.lng) return null;
            const isSelected = selectedListingId === listing.id;
            return (
              <AdvancedMarker
                key={listing.id}
                position={{ lat: listing.lat, lng: listing.lng }}
                onClick={() => setSelectedListingId(listing.id)}
              >
                <Pin 
                  background={isSelected ? 'hsl(var(--accent))' : 'hsl(var(--primary))'}
                  borderColor={isSelected ? 'hsl(var(--accent-foreground))' : 'hsl(var(--primary-foreground))'}
                  glyphColor={isSelected ? 'hsl(var(--accent-foreground))' : 'hsl(var(--primary-foreground))'}
                  scale={isSelected ? 1.5 : 1}
                />
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

          <MapController listings={listings} />

        </Map>
      </APIProvider>
    </Card>
  );
}
