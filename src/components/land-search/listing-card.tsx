
import Image from 'next/image';
import Link from 'next/link';
import type { Listing } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, DollarSign, Maximize, Star, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ListingCardProps {
  listing: Listing;
  viewMode?: 'grid' | 'list';
}

export function ListingCard({ listing, viewMode = 'grid' }: ListingCardProps) {
  if (viewMode === 'list') {
    return (
      <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col sm:flex-row h-full">
        <div className="relative w-full sm:w-1/3 h-48 sm:h-auto flex-shrink-0">
          <Image
            src={listing.images[0] || "https://placehold.co/600x400.png"}
            alt={listing.title}
            data-ai-hint="landscape nature"
            fill
            sizes="(max-width: 640px) 100vw, 33vw"
            className="object-cover"
          />
        </div>
        <div className="flex flex-col flex-grow">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-lg font-semibold hover:text-primary">
              <Link href={`/listings/${listing.id}`}>{listing.title}</Link>
            </CardTitle>
            <div className="text-sm text-muted-foreground flex items-center mt-1">
              <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
              <span>{listing.location}</span>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 flex-grow">
            <div className="text-sm text-muted-foreground mb-2 flex items-center">
              <Maximize className="h-4 w-4 mr-1 flex-shrink-0" />
              <span>{listing.sizeSqft.toLocaleString()} sq ft</span>
            </div>
            {listing.rating && (
              <div className="text-sm text-muted-foreground mb-2 flex items-center">
                <Star className="h-4 w-4 mr-1 text-yellow-400 fill-yellow-400 flex-shrink-0" />
                <span>{listing.rating.toFixed(1)} ({listing.numberOfRatings} reviews)</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{listing.description}</p>
            {listing.amenities.length > 0 && (
              <div className="mb-3">
                <h4 className="text-xs font-medium text-foreground mb-1">Amenities:</h4>
                <div className="flex flex-wrap gap-2">
                  {listing.amenities.slice(0, 3).map(amenity => (
                    <span key={amenity} className="text-xs bg-muted px-2 py-0.5 rounded-full flex items-center">
                      <CheckCircle className="h-3 w-3 mr-1 text-green-500" /> {amenity}
                    </span>
                  ))}
                  {listing.amenities.length > 3 && <span className="text-xs text-muted-foreground">&amp; more</span>}
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="p-4 border-t items-center justify-between">
            <div className="flex items-center">
              <DollarSign className="h-5 w-5 text-primary mr-1" />
              <span className="text-xl font-bold text-primary">${listing.pricePerMonth}</span>
              <span className="text-xs text-muted-foreground ml-1">/month</span>
            </div>
            <Button asChild size="sm">
              <Link href={`/listings/${listing.id}`}>View Details</Link>
            </Button>
          </CardFooter>
        </div>
      </Card>
    );
  }

  // Grid View (default)
  return (
    <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col h-full">
      <CardHeader className="p-0">
        <div className="relative w-full h-48">
          <Image
            src={listing.images[0] || "https://placehold.co/600x400.png"}
            alt={listing.title}
            data-ai-hint="landscape nature"
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover"
          />
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <CardTitle className="text-lg font-semibold mb-1 truncate hover:text-primary">
          <Link href={`/listings/${listing.id}`}>{listing.title}</Link>
        </CardTitle>
        <div className="text-sm text-muted-foreground mb-2 flex items-center">
          <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
          <span>{listing.location}</span>
        </div>
        <div className="text-sm text-muted-foreground mb-2 flex items-center">
          <Maximize className="h-4 w-4 mr-1 flex-shrink-0" />
          <span>{listing.sizeSqft.toLocaleString()} sq ft</span>
        </div>
        {listing.rating && (
           <div className="text-sm text-muted-foreground mb-2 flex items-center">
            <Star className="h-4 w-4 mr-1 text-yellow-400 fill-yellow-400 flex-shrink-0" />
            <span>{listing.rating.toFixed(1)} ({listing.numberOfRatings} reviews)</span>
          </div>
        )}
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{listing.description}</p>
      </CardContent>
      <CardFooter className="p-4 border-t items-center justify-between">
        <div className="flex items-center">
          <DollarSign className="h-5 w-5 text-primary mr-1" />
          <span className="text-xl font-bold text-primary">${listing.pricePerMonth}</span>
          <span className="text-xs text-muted-foreground ml-1">/month</span>
        </div>
        <Button asChild size="sm">
          <Link href={`/listings/${listing.id}`}>View Details</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
