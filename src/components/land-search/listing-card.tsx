
'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { Listing } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, DollarSign, Maximize, Star, Home, Plus, Bookmark, Loader2, Crown, Sparkles, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/auth-context';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { FREE_TIER_BOOKMARK_LIMIT } from '@/lib/mock-data';
import { ToastAction } from '@/components/ui/toast';
import { useRouter } from 'next/navigation';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { firebaseInitializationError } from '@/lib/firebase';


interface ListingCardProps {
  listing: Listing;
  viewMode?: 'grid' | 'list';
  sizeVariant?: 'default' | 'compact';
  isSelected?: boolean;
  onCardClick?: (id: string | null) => void;
}

export function ListingCard({ listing, viewMode = 'grid', sizeVariant = 'default', isSelected = false, onCardClick }: ListingCardProps) {
  const { currentUser, addBookmark, removeBookmark, subscriptionStatus } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isBookmarking, setIsBookmarking] = useState(false);

  const isCompact = sizeVariant === 'compact';
  const isBookmarked = currentUser?.appProfile?.bookmarkedListingIds?.includes(listing.id) || false;
  const atBookmarkLimit = subscriptionStatus === 'standard' && (currentUser?.appProfile?.bookmarkedListingIds?.length || 0) >= FREE_TIER_BOOKMARK_LIMIT;

  const handleCardClick = () => {
    if (onCardClick) {
      onCardClick(isSelected ? null : listing.id);
    }
  }

  const handleBookmarkToggle = async (e: React.MouseEvent) => {
    e.preventDefault(); 
    e.stopPropagation();

    if (!currentUser) {
      toast({ title: "Login Required", description: "Please log in to bookmark listings.", variant: "default" });
      router.push(`/login?redirect=${window.location.pathname}`);
      return;
    }
    if (listing.landownerId === currentUser.uid) {
      toast({ title: "Action Not Allowed", description: "You cannot bookmark your own listing.", variant: "default"});
      return;
    }

    if (!isBookmarked && atBookmarkLimit) {
      toast({
        title: "Bookmark Limit Reached",
        description: `Standard accounts can save up to ${FREE_TIER_BOOKMARK_LIMIT} listings. Upgrade for unlimited bookmarks!`,
        variant: "default", 
        action: <ToastAction altText="Upgrade" onClick={() => router.push('/pricing')}>Upgrade</ToastAction>,
      });
      return;
    }

    setIsBookmarking(true);
    try {
      if (isBookmarked) {
        await removeBookmark(listing.id);
      } else {
        await addBookmark(listing.id);
      }
    } catch (error: any) {
      // Toast for error is handled by AuthContext's bookmark functions
    } finally {
      setIsBookmarking(false);
    }
  };


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
  const fallbackImageSrc = "https://placehold.co/600x400.png?text=Image+Not+Found";
  const imageSrc = listing.images && listing.images[0] ? listing.images[0] : fallbackImageSrc;
  const isMockModeNoUser = firebaseInitializationError !== null && !currentUser?.appProfile;

  const cardContent = (
    <>
        <div className="relative w-full sm:w-1/3 h-48 sm:h-auto flex-shrink-0">
          <Image
            src={imageSrc}
            alt={listing.title}
            data-ai-hint={imageSrc.includes('placehold.co') ? "property placeholder" : "landscape nature"}
            fill
            sizes="(max-width: 640px) 100vw, 33vw"
            className="object-cover"
          />
           {listing.isBoosted && (
            <TooltipProvider delayDuration={100}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="absolute top-2 left-2 z-10 bg-premium/80 text-premium-foreground p-1.5 rounded-full shadow-md cursor-default">
                            <TrendingUp
                                className={cn("text-premium-foreground", isCompact ? "h-3 w-3" : "h-4 w-4")}
                                strokeWidth={3}
                            />
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="right"><p>Boosted Listing (Premium)</p></TooltipContent>
                </Tooltip>
            </TooltipProvider>
          )}
           {currentUser && listing.landownerId !== currentUser.uid && (
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                      size="icon"
                      variant="ghost"
                      className={cn(
                        "absolute top-1 right-1 z-10 rounded-full h-8 w-8 bg-background/70 hover:bg-background",
                        isBookmarked ? "text-primary" : "text-muted-foreground",
                        (!isBookmarked && atBookmarkLimit) && "opacity-60 cursor-not-allowed"
                      )}
                      onClick={handleBookmarkToggle}
                      disabled={isBookmarking || isMockModeNoUser}
                    >
                      {isBookmarking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bookmark className={cn("h-5 w-5", isBookmarked && "fill-primary")} />}
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="left" className="flex items-center gap-1">
                  <p>{isBookmarked ? "Remove bookmark" : (atBookmarkLimit ? "Bookmark limit reached" : "Add bookmark")}</p>
                  {!isBookmarked && atBookmarkLimit && <Crown className="h-3 w-3 text-premium" />}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
           )}
        </div>
        <div className="flex flex-col flex-grow">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-headline hover:text-primary">
                  <Link href={`/listings/${listing.id}`} onClick={(e) => e.stopPropagation()}>{listing.title}</Link>
                </CardTitle>
                {listing.pricingModel === 'lease-to-own' && (
                  <TooltipProvider delayDuration={100}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="ml-2 text-xs bg-premium text-premium-foreground border-premium/80 tracking-wide cursor-default">LTO</Badge>
                      </TooltipTrigger>
                      <TooltipContent side="right"><p>Lease to own</p></TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
            </div>
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
            </div>
            <Button asChild size="sm" disabled={isMockModeNoUser} onClick={(e) => e.stopPropagation()}>
              <Link href={`/listings/${listing.id}`}>View Details</Link>
            </Button>
          </CardFooter>
        </div>
    </>
  );

  if (viewMode === 'list') {
    return (
      <Card 
        onClick={handleCardClick}
        className={cn(
            "overflow-hidden transition-all duration-300 flex flex-col sm:flex-row h-full shadow-lg hover:shadow-xl cursor-pointer",
            listing.isBoosted && "ring-1 ring-accent",
            isSelected && "ring-2 ring-primary shadow-2xl"
        )}>
        {cardContent}
      </Card>
    );
  }

  // Grid View (default or compact)
  return (
    <Card 
      onClick={handleCardClick}
      className={cn(
      "overflow-hidden transition-all duration-300 flex flex-col h-full shadow-lg hover:shadow-xl cursor-pointer", 
      isCompact ? "text-sm" : "",
      listing.isBoosted && "ring-1 ring-accent",
      isSelected && "ring-2 ring-primary shadow-2xl"
    )}>
      <CardHeader className="p-0 relative">
        <div className={cn("relative w-full", isCompact ? "h-32" : "h-48")}>
          <Image
            src={imageSrc}
            alt={listing.title}
            data-ai-hint={imageSrc.includes('placehold.co') ? "property placeholder" : "landscape nature"}
            fill
            sizes={isCompact ? "(max-width: 768px) 50vw, 256px" : "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"}
            className="object-cover"
          />
          {listing.isBoosted && (
            <TooltipProvider delayDuration={100}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="absolute top-2 left-2 z-10 bg-premium/80 text-premium-foreground p-1.5 rounded-full shadow-md cursor-default">
                            <TrendingUp
                                className={cn("text-premium-foreground", isCompact ? "h-3 w-3" : "h-4 w-4")}
                                strokeWidth={3}
                            />
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="right"><p>Boosted Listing (Premium)</p></TooltipContent>
                </Tooltip>
            </TooltipProvider>
          )}
          {listing.pricingModel === 'lease-to-own' && (
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className={cn("absolute top-2 right-2 z-10 text-xs bg-premium text-premium-foreground border-premium/80 tracking-wide cursor-default", isCompact ? "px-1.5 py-0.5 text-[0.6rem]" : "px-2 py-0.5")}>
                    <Sparkles className="mr-1 h-2.5 w-2.5"/>LTO
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="right"><p>Lease to own</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {currentUser && listing.landownerId !== currentUser.uid && (
             <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className={cn(
                        "absolute bottom-1 right-1 z-10 rounded-full h-8 w-8 bg-background/70 hover:bg-background", 
                        isBookmarked ? "text-primary" : "text-muted-foreground",
                        (!isBookmarked && atBookmarkLimit) && "opacity-60 cursor-not-allowed",
                        isCompact ? "h-7 w-7" : ""
                      )}
                      onClick={handleBookmarkToggle}
                      disabled={isBookmarking || isMockModeNoUser}
                    >
                      {isBookmarking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bookmark className={cn("h-5 w-5", isBookmarked && "fill-primary", isCompact ? "h-4 w-4" : "")} />}
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="left" className="flex items-center gap-1">
                  <p>{isBookmarked ? "Remove bookmark" : (atBookmarkLimit ? "Bookmark limit reached" : "Add bookmark")}</p>
                  {!isBookmarked && atBookmarkLimit && <Crown className="h-3 w-3 text-premium" />}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
           )}
        </div>
      </CardHeader>
      <CardContent className={cn("p-3 flex-grow space-y-1", isCompact ? "py-2" : "p-4")}>
        <CardTitle className={cn("font-headline line-clamp-1 hover:text-primary", isCompact ? "text-base leading-tight" : "text-lg")}>
          <Link href={`/listings/${listing.id}`} onClick={(e) => e.stopPropagation()}>{listing.title}</Link>
        </CardTitle>
        <div className={cn("text-muted-foreground flex items-center", isCompact ? "text-xs" : "text-sm")}>
          <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
          <span className="truncate">{listing.location}</span>
        </div>
        <div className={cn("text-muted-foreground flex items-center", isCompact ? "text-xs" : "text-sm")}>
          <Maximize className="h-3 w-3 mr-1 flex-shrink-0" />
          <span>{listing.sizeSqft.toLocaleString()} sq ft</span>
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
        </div>
        <Button asChild size="sm" className={cn(isCompact ? "h-7 px-2 text-xs rounded-sm" : "")} disabled={isMockModeNoUser} onClick={(e) => e.stopPropagation()}>
          <Link href={`/listings/${listing.id}`}>Details</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
