
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
  sizeVariant?: 'default' | 'compact';
}

export function ListingCard({ listing, viewMode = 'grid', sizeVariant = 'default' }: ListingCardProps) {
  const isCompact = sizeVariant === 'compact';

  if (viewMode === 'list') {
    // List view does not currently support compact variant, but could be added
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
          <CardFooter className="p-4 border-t items-center justify-between mt-auto">
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

  // Grid View (default or compact)
  return (
    <Card className={cn("overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col h-full", isCompact ? "text-sm" : "")}>
      <CardHeader className="p-0">
        <div className={cn("relative w-full", isCompact ? "h-36" : "h-48")}>
          <Image
            src={listing.images[0] || "https://placehold.co/600x400.png"}
            alt={listing.title}
            data-ai-hint="landscape nature"
            fill
            sizes={isCompact ? "(max-width: 768px) 50vw, 256px" : "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"}
            className="object-cover"
          />
        </div>
      </CardHeader>
      <CardContent className={cn("p-3 flex-grow", isCompact ? "py-2" : "p-4")}>
        <CardTitle className={cn("font-semibold mb-1 truncate hover:text-primary", isCompact ? "text-base leading-tight" : "text-lg")}>
          <Link href={`/listings/${listing.id}`}>{listing.title}</Link>
        </CardTitle>
        <div className={cn("text-muted-foreground mb-1 flex items-center", isCompact ? "text-xs" : "text-sm")}>
          <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
          <span className="truncate">{listing.location}</span>
        </div>
        <div className={cn("text-muted-foreground mb-1 flex items-center", isCompact ? "text-xs" : "text-sm")}>
          <Maximize className="h-4 w-4 mr-1 flex-shrink-0" />
          <span>{listing.sizeSqft.toLocaleString()} sq ft</span>
        </div>
        {listing.rating && (
           <div className={cn("text-muted-foreground mb-1 flex items-center", isCompact ? "text-xs" : "text-sm")}>
            <Star className="h-4 w-4 mr-1 text-yellow-400 fill-yellow-400 flex-shrink-0" />
            <span>{listing.rating.toFixed(1)} ({listing.numberOfRatings} rev.)</span>
          </div>
        )}
        <p className={cn("text-muted-foreground line-clamp-2", isCompact ? "text-xs leading-snug mt-1 mb-2 h-8" : "text-xs mb-3")}>{listing.description}</p>
      </CardContent>
      <CardFooter className={cn("border-t items-center justify-between mt-auto", isCompact ? "p-2" : "p-4")}>
        <div className="flex items-center">
          <DollarSign className={cn("text-primary mr-1", isCompact ? "h-4 w-4" : "h-5 w-5")} />
          <span className={cn("font-bold text-primary", isCompact ? "text-base" : "text-xl")}>${listing.pricePerMonth}</span>
          <span className={cn("text-muted-foreground ml-1", isCompact ? "text-xs" : "text-xs")}>/mo</span>
        </div>
        <Button asChild size="sm" className={cn(isCompact ? "h-7 px-2 text-xs rounded-sm" : "")}>
          <Link href={`/listings/${listing.id}`}>Details</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
