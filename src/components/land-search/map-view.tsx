
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
  selectedId: string | null;
  onMarkerClick: (id: string | null) => void;
  onMapClick: () => void;
}

const MapController = ({ listings }: { listings: Listing[] }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || listings.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    listings.forEach(listing => {
        if (listing.lat != null && listing.lng != null) {
            bounds.extend({ lat: listing.lat, lng: listing.lng });
        }
    });
    
    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, 100);
    }

  }, [map, listings]);

  return null;
};

export function MapView({ listings, selectedId, onMarkerClick, onMapClick }: MapViewProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const defaultPosition = { lat: 39.8283, lng: -98.5795 };
  const selectedListing = listings.find(l => l.id === selectedId);

  if (!apiKey) {
    return (
      <Card className="sticky top-20 shadow-md h-[calc(100vh-10rem)] flex items-center justify-center bg-muted/30 rounded-lg">
        <div className="text-center p-4">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-destructive">Map Service Unavailable</h3>
          <p className="text-sm text-muted-foreground mt-2">
            The Google Maps API key is missing. Please check your configuration.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-full w-full flex flex-col bg-muted/30 overflow-hidden rounded-lg shadow-md">
      <APIProvider apiKey={apiKey}>
        <Map
          defaultCenter={defaultPosition}
          defaultZoom={4}
          gestureHandling={'greedy'}
          disableDefaultUI={true}
          mapId={'landshare-map'}
          className="w-full h-full rounded-lg"
          onClick={onMapClick}
        >
          {listings.map((listing) => {
            if (listing.lat == null || listing.lng == null) return null;
            const isSelected = selectedId === listing.id;
            return (
              <AdvancedMarker
                key={listing.id}
                position={{ lat: listing.lat, lng: listing.lng }}
                onClick={() => onMarkerClick(listing.id)}
                zIndex={isSelected ? 10 : 1}
              >
                <Pin 
                  background={isSelected ? 'hsl(var(--accent))' : (listing.isBoosted ? 'hsl(var(--premium))' : 'hsl(var(--primary))')}
                  borderColor={isSelected ? 'hsl(var(--background))' : 'hsl(var(--primary-foreground))'}
                  glyphColor={isSelected ? 'hsl(var(--background))' : 'hsl(var(--primary-foreground))'}
                  scale={isSelected ? 1.5 : 1}
                />
              </AdvancedMarker>
            )
          })}

          {selectedListing && selectedListing.lat != null && selectedListing.lng != null && (
            <InfoWindow
              position={{ lat: selectedListing.lat, lng: selectedListing.lng }}
              onCloseClick={() => onMarkerClick(null)}
              pixelOffset={[0, -40]}
              headerDisabled
            >
              <div className="p-0 m-0 w-48 text-foreground bg-background rounded-lg shadow-lg overflow-hidden font-body">
                 <div className="relative h-24 w-full">
                    <Image src={selectedListing.images[0] || "https://placehold.co/600x400.png"} alt={selectedListing.title} fill className="object-cover" data-ai-hint="map listing" />
                 </div>
                 <div className="p-2">
                    <h4 className="font-headline text-base text-primary mb-1 truncate">{selectedListing.title}</h4>
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
