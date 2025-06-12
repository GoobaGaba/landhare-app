
import Image from 'next/image';
import Link from 'next/link';
import type { Listing } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, DollarSign, Maximize, Star, Home, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface ListingCardProps {
  listing: Listing;
  viewMode?: 'grid' | 'list';
  sizeVariant?: 'default' | 'compact';
}

export function ListingCard({ listing, viewMode = 'grid', sizeVariant = 'default' }: ListingCardProps) {
  const isCompact = sizeVariant === 'compact';

  const getPriceDisplay = () => {
    if (!listing) return { amount: "N/A", unit: "", model: 'monthly' };
    const priceAmount = (listing.price || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    switch(listing.pricingModel) {
      case 'nightly': return { amount: priceAmount, unit: "night", model: listing.pricingModel };
      case 'monthly': return { amount: priceAmount, unit: "month", model: listing.pricingModel };
      case 'lease-to-own': return { amount: `Est. ${priceAmount}`, unit: "month", model: listing.pricingModel };
      default: return { amount: priceAmount, unit: "month", model: 'monthly' };
    }
  };
  const displayPriceInfo = getPriceDisplay();

  if (viewMode === 'list') {
    return (
      <Card className={cn(
        "overflow-hidden transition-shadow duration-300 flex flex-col sm:flex-row h-full shadow-lg hover:shadow-xl",
        listing.isBoosted && "ring-1 ring-accent"
      )}>
        <div className="relative w-full sm:w-1/3 h-48 sm:h-auto flex-shrink-0">
          <Image
            src={listing.images[0] || "https://placehold.co/600x400.png"}
            alt={listing.title}
            data-ai-hint="landscape nature"
            fill
            sizes="(max-width: 640px) 100vw, 33vw"
            className="object-cover"
          />
           {listing.isBoosted && (
            <Plus
              className="absolute top-2 left-2 z-10 text-accent h-5 w-5"
              strokeWidth={3}
              title="Boosted Listing"
            />
          )}
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
               {listing.pricingModel === 'lease-to-own' && <Home className="h-4 w-4 ml-3 mr-1 text-primary" />}
            </div>
            {listing.rating !== undefined && listing.rating > 0 && (
              <div className="text-sm text-muted-foreground mb-2 flex items-center">
                <Star className="h-4 w-4 mr-1 text-yellow-400 fill-yellow-400 flex-shrink-0" />
                <span>{listing.rating.toFixed(1)} ({listing.numberOfRatings} reviews)</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{listing.description}</p>
            {listing.amenities.length > 0 && (
              <div className="mb-3">
                <h4 className="text-xs font-medium text-foreground mb-1">Amenities:</h4>
                <div className="flex flex-wrap gap-1">
                  {listing.amenities.slice(0, 3).map(amenity => (
                    <Badge key={amenity} variant="outline" className="text-xs font-normal py-0">
                       {amenity}
                    </Badge>
                  ))}
                  {listing.amenities.length > 3 && <Badge variant="outline" className="text-xs font-normal py-0">+{listing.amenities.length - 3} more</Badge>}
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="p-4 border-t items-center justify-between mt-auto">
            <div className="flex items-baseline">
              <DollarSign className="h-5 w-5 text-primary mr-0.5" />
              <span className="text-xl font-bold text-primary">{displayPriceInfo.amount}</span>
              <span className="text-xs text-muted-foreground ml-1">/ {displayPriceInfo.unit}</span>
               {displayPriceInfo.model === 'lease-to-own' && <Badge variant="outline" className="ml-2 text-primary border-primary/70">LTO</Badge>}
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
    <Card className={cn(
      "overflow-hidden transition-shadow duration-300 flex flex-col h-full shadow-lg hover:shadow-xl", 
      isCompact ? "text-sm" : "",
      listing.isBoosted && "ring-1 ring-accent"
    )}>
      <CardHeader className="p-0 relative">
        <div className={cn("relative w-full", isCompact ? "h-32" : "h-48")}>
          <Image
            src={listing.images[0] || "https://placehold.co/600x400.png"}
            alt={listing.title}
            data-ai-hint="landscape nature"
            fill
            sizes={isCompact ? "(max-width: 768px) 50vw, 256px" : "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"}
            className="object-cover"
          />
          {listing.isBoosted && (
            <Plus
              className={cn(
                "absolute top-2 left-2 z-10 text-accent",
                isCompact ? "h-4 w-4" : "h-5 w-5"
              )}
              strokeWidth={3}
              title="Boosted Listing"
            />
          )}
        </div>
      </CardHeader>
      <CardContent className={cn("p-3 flex-grow space-y-1", isCompact ? "py-2" : "p-4")}>
        <CardTitle className={cn("font-semibold line-clamp-1 hover:text-primary", isCompact ? "text-base leading-tight" : "text-lg")}>
          <Link href={`/listings/${listing.id}`}>{listing.title}</Link>
        </CardTitle>
        <div className={cn("text-muted-foreground flex items-center", isCompact ? "text-xs" : "text-sm")}>
          <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
          <span className="truncate">{listing.location}</span>
        </div>
        <div className={cn("text-muted-foreground flex items-center", isCompact ? "text-xs" : "text-sm")}>
          <Maximize className="h-3 w-3 mr-1 flex-shrink-0" />
          <span>{listing.sizeSqft.toLocaleString()} sq ft</span>
          {listing.pricingModel === 'lease-to-own' && <Home className="h-3 w-3 ml-2 mr-0.5 text-primary" />}
        </div>
        {listing.rating !== undefined && listing.rating > 0 && (
           <div className={cn("text-muted-foreground flex items-center", isCompact ? "text-xs" : "text-sm")}>
            <Star className="h-3 w-3 mr-1 text-yellow-400 fill-yellow-400 flex-shrink-0" />
            <span>{listing.rating.toFixed(1)} ({listing.numberOfRatings} rev.)</span>
          </div>
        )}
        <p className={cn("text-muted-foreground line-clamp-2", isCompact ? "text-xs leading-snug h-8" : "text-xs h-8")}>{listing.description}</p>
      </CardContent>
      <CardFooter className={cn("border-t items-center justify-between mt-auto", isCompact ? "p-2" : "p-3")}>
        <div className="flex items-baseline">
          <DollarSign className={cn("text-primary mr-0.5", isCompact ? "h-4 w-4" : "h-5 w-5")} />
          <span className={cn("font-bold text-primary", isCompact ? "text-base" : "text-lg")}>{displayPriceInfo.amount}</span>
          <span className={cn("text-muted-foreground ml-0.5", isCompact ? "text-[0.65rem]" : "text-xs")}>/ {displayPriceInfo.unit}</span>
          {displayPriceInfo.model === 'lease-to-own' && <Badge variant="outline" className={cn("ml-1 text-primary border-primary/70", isCompact ? "text-[0.6rem] px-1 py-0" : "text-xs")}>LTO</Badge>}
        </div>
        <Button asChild size="sm" className={cn(isCompact ? "h-7 px-2 text-xs rounded-sm" : "")}>
          <Link href={`/listings/${listing.id}`}>Details</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
