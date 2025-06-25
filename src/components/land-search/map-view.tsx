
'use client';

import { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { AlertTriangle, DollarSign } from "lucide-react";
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import type { Listing } from '@/lib/types';
import { Button } from '../ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface MapViewProps {
  listings: Listing[];
}

// A component that uses the Map context to control its view.
const MapController = ({ listings }: { listings: Listing[] }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !listings) return;

    if (listings.length === 0) {
      // Don't move the map if there are no listings to show
      return;
    }

    const bounds = new google.maps.LatLngBounds();
    let validListings = 0;
    listings.forEach(listing => {
      if (listing.lat != null && listing.lng != null) { // Check for null/undefined
        bounds.extend({ lat: listing.lat, lng: listing.lng });
        validListings++;
      }
    });

    if (validListings === 0) return;

    if (validListings === 1) {
        const firstValidListing = listings.find(l => l.lat != null && l.lng != null);
        if (firstValidListing) {
            map.setCenter({ lat: firstValidListing.lat!, lng: firstValidListing.lng! });
            map.setZoom(12);
        }
    } else {
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
  
  const selectedListing = listings.find(l => l.id === selectedListingId);

  if (!apiKey) {
    return (
      <Card className="sticky top-20 shadow-md h-[calc(100vh-10rem)] flex items-center justify-center bg-muted/30 rounded-lg">
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
    <Card className="sticky top-24 shadow-md h-[calc(100vh-12rem)] flex flex-col bg-muted/30 overflow-hidden rounded-lg">
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
            if (listing.lat == null || listing.lng == null) return null; // Use == null to check for both null and undefined
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

          {selectedListing && selectedListing.lat != null && selectedListing.lng != null && (
            <InfoWindow
              position={{ lat: selectedListing.lat, lng: selectedListing.lng }}
              onCloseClick={() => setSelectedListingId(null)}
              pixelOffset={[0, -40]}
              headerDisabled
            >
              <div className="p-0 m-0 w-48 text-foreground bg-background rounded-lg shadow-lg overflow-hidden">
                 <div className="relative h-20 w-full">
                    <Image src={selectedListing.images[0] || "https://placehold.co/600x400.png"} alt={selectedListing.title} fill className="object-cover" data-ai-hint="map listing" />
                 </div>
                 <div className="p-2">
                    <h4 className="font-bold text-sm text-primary mb-1 truncate">{selectedListing.title}</h4>
                    <p className="text-xs text-muted-foreground flex items-center">
                        <DollarSign className="h-3 w-3 mr-1"/>{selectedListing.price} / {selectedListing.pricingModel}
                    </p>
                    <Button asChild variant="link" size="sm" className="p-0 h-auto text-xs mt-1">
                      <Link href={`/listings/${selectedListing.id}`}>View Details</Link>
                    </Button>
                 </div>
              </div>
            </InfoWindow>
          )}

          <MapController listings={listings} />

        </Map>
      </APIProvider>
    </Card>
  );
}
