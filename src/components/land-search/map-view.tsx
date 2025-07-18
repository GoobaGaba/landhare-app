'use client';

import { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { DollarSign } from "lucide-react";
import { Map, AdvancedMarker, Pin, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import type { Listing } from '@/lib/types';
import { Button } from '../ui/button';
import Link from 'next/link';
import Image from 'next/image';

interface MapViewProps {
  listings: Listing[];
  selectedId: string | null;
  onMarkerClick: (id: string | null) => void;
  onMapClick: () => void;
}

const MapController = ({ listings, selectedId }: { listings: Listing[], selectedId: string | null }) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    if (selectedId) {
      const selectedListing = listings.find(l => l.id === selectedId);
      if (selectedListing && selectedListing.lat != null && selectedListing.lng != null) {
        map.panTo({ lat: selectedListing.lat, lng: selectedListing.lng });
        return;
      }
    }
    
    if (listings.length === 0) {
        map.panTo({ lat: 39.8283, lng: -98.5795 });
        map.setZoom(4);
        return;
    }

    const bounds = new google.maps.LatLngBounds();
    listings.forEach(listing => {
        if (listing.lat != null && listing.lng != null) {
            bounds.extend({ lat: listing.lat, lng: listing.lng });
        }
    });
    
    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, 100);
    }

  }, [map, listings, selectedId]);

  return null;
};

// This new function uses direct hex codes to avoid CSS variable issues with the map overlay.
const getPinColors = (listing: Listing, isSelected: boolean) => {
    const darkDotColor = '#1A1A1A'; // 90% black for the pin's dot.
    if (isSelected) {
        return {
            background: '#CC6633', // Burnt Orange (Accent color)
            glyphColor: darkDotColor,
            borderColor: '#FFFFFF' // White border for selected to make it pop
        };
    }
    if (listing.isBoosted) {
        return {
            background: '#8B5CF6', // Vibrant Purple for Premium/Boosted
            glyphColor: darkDotColor,
            borderColor: '#FFFFFF'
        };
    }
    return {
        background: '#336633', // Forest Green (Primary color)
        glyphColor: darkDotColor,
        borderColor: '#FFFFFF'
    };
};

export function MapView({ listings, selectedId, onMarkerClick, onMapClick }: MapViewProps) {
  const defaultPosition = { lat: 39.8283, lng: -98.5795 };
  const selectedListing = listings.find(l => l.id === selectedId);

  return (
    <Card className="h-full w-full flex flex-col bg-muted/30 overflow-hidden rounded-lg shadow-md">
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
            const pinColors = getPinColors(listing, isSelected);

            return (
              <AdvancedMarker
                key={listing.id}
                position={{ lat: listing.lat, lng: listing.lng }}
                onClick={() => onMarkerClick(listing.id)}
                zIndex={isSelected ? 10 : (listing.isBoosted ? 5 : 1)}
              >
                <Pin 
                  background={pinColors.background}
                  borderColor={pinColors.borderColor}
                  glyphColor={pinColors.glyphColor}
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

          <MapController listings={listings} selectedId={selectedId} />

        </Map>
    </Card>
  );
}
