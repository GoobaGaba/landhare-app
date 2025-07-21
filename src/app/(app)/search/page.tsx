
'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { ListingCard } from "@/components/land-search/listing-card";
import { FilterPanel } from "@/components/land-search/filter-panel";
import { MapView } from "@/components/land-search/map-view";
import type { Listing, LeaseTerm } from "@/lib/types";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from '@/components/ui/input';
import { SearchIcon, LayoutGrid, List, Loader2, AlertTriangle, Sparkles, MapPin } from "lucide-react";
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { firebaseInitializationError } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';
import { useListingsData } from '@/hooks/use-listings-data';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

const ITEMS_PER_PAGE = 12;
const initialPriceRange: [number, number] = [0, 2000];
const initialSizeRange: [number, number] = [100, 500000];

function SearchPageContent() {
  const { allAvailableListings, isLoading: listingsLoading, error: listingsError } = useListingsData();
  const { toast } = useToast();
  const { subscriptionStatus, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();

  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [priceRange, setPriceRange] = useState<[number, number]>(initialPriceRange);
  const [sizeRange, setSizeRange] = useState<[number, number]>(initialSizeRange);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [selectedLeaseTerm, setSelectedLeaseTerm] = useState<LeaseTerm | 'any'>('any');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<string>('rating_desc');
  const [showMap, setShowMap] = useState(true);
  
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);

  useEffect(() => {
    if (listingsError) {
      toast({ title: "Error loading listings", description: listingsError, variant: "destructive" });
    }
  }, [listingsError, toast]);

  const resetFilters = () => {
    setSearchTerm('');
    setPriceRange(initialPriceRange);
    setSizeRange(initialSizeRange);
    setSelectedAmenities([]);
    setSelectedLeaseTerm('any');
    setSortBy('rating_desc');
    setCurrentPage(1);
  };

  const filteredListings = useMemo(() => {
    let listingsToFilter = [...allAvailableListings];

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      listingsToFilter = listingsToFilter.filter(
        l =>
          l.title.toLowerCase().includes(lowerSearchTerm) ||
          l.description.toLowerCase().includes(lowerSearchTerm) ||
          l.location.toLowerCase().includes(lowerSearchTerm)
      );
    }
    listingsToFilter = listingsToFilter.filter(
      l => (l.price ?? 0) >= priceRange[0] && (l.price ?? 0) <= priceRange[1]
    );
    listingsToFilter = listingsToFilter.filter(
      l => l.sizeSqft >= sizeRange[0] && l.sizeSqft <= sizeRange[1]
    );
    if (selectedAmenities.length > 0) {
      listingsToFilter = listingsToFilter.filter(l =>
        selectedAmenities.every(amenity => l.amenities.map(a => a.toLowerCase()).includes(amenity.toLowerCase()))
      );
    }
    if (selectedLeaseTerm !== 'any') {
        listingsToFilter = listingsToFilter.filter(l => l.leaseTerm === selectedLeaseTerm);
    }

    return [...listingsToFilter].sort((a, b) => {
      if (a.isBoosted && !b.isBoosted) return -1;
      if (!a.isBoosted && b.isBoosted) return 1;

      let comparison = 0;
      switch (sortBy) {
        case 'price_asc': comparison = (a.price ?? 0) - (b.price ?? 0); break;
        case 'price_desc': comparison = (b.price ?? 0) - (a.price ?? 0); break;
        case 'size_asc': comparison = a.sizeSqft - b.sizeSqft; break;
        case 'size_desc': comparison = b.sizeSqft - a.sizeSqft; break;
        case 'rating_desc': 
        default: comparison = (b.rating || 0) - (a.rating || 0); break;
      }
      return comparison;
    });
  }, [searchTerm, priceRange, sizeRange, selectedAmenities, selectedLeaseTerm, sortBy, allAvailableListings]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedListingId(null);
  }, [searchTerm, priceRange, sizeRange, selectedAmenities, selectedLeaseTerm, sortBy]);

  const paginatedListings = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredListings.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredListings, currentPage]);

  const totalPages = Math.ceil(filteredListings.length / ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setSelectedListingId(null);
      window.scrollTo(0, 0);
    }
  };
  
  const filteredMapIds = useMemo(() => {
      return new Set(filteredListings.map(l => l.id));
  }, [filteredListings]);

  if (authLoading || listingsLoading || subscriptionStatus === 'loading') {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-lg text-muted-foreground">Loading available land...</p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col lg:flex-row gap-8", showMap && "lg:h-[calc(100vh-var(--header-height,8rem)-1rem)] lg:overflow-hidden")}>
      <aside className="w-full lg:w-1/3 xl:w-1/4 lg:overflow-y-auto lg:h-full lg:pr-4 custom-scrollbar">
        <FilterPanel
          priceRange={priceRange} setPriceRange={setPriceRange}
          sizeRange={sizeRange} setSizeRange={setSizeRange}
          selectedAmenities={selectedAmenities} setSelectedAmenities={setSelectedAmenities}
          selectedLeaseTerm={selectedLeaseTerm} setSelectedLeaseTerm={setSelectedLeaseTerm}
          resetFilters={resetFilters}
        />
      </aside>
      <main className="w-full lg:w-2/3 xl:w-3/4 space-y-6 lg:overflow-y-auto lg:h-full lg:pr-4 custom-scrollbar">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4">
          <div className="relative w-full sm:max-w-xs">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Search by keyword..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-center">
             <div className="flex items-center space-x-2">
                <Switch id="show-map" checked={showMap} onCheckedChange={setShowMap} />
                <Label htmlFor="show-map" className="flex items-center gap-1"><MapPin className="h-4 w-4"/> Show Map</Label>
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Sort by..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="rating_desc">Rating (High to Low)</SelectItem>
                <SelectItem value="price_asc">Price (Low to High)</SelectItem>
                <SelectItem value="price_desc">Price (High to Low)</SelectItem>
                <SelectItem value="size_asc">Size (Small to Large)</SelectItem>
                <SelectItem value="size_desc">Size (Large to Small)</SelectItem>
              </SelectContent>
            </Select>
            <Button variant={viewMode === 'grid' ? 'secondary' : 'outline'} size="icon" onClick={() => setViewMode('grid')} title="Grid View"><LayoutGrid className="h-4 w-4"/></Button>
            <Button variant={viewMode === 'list' ? 'secondary' : 'outline'} size="icon" onClick={() => setViewMode('list')} title="List View"><List className="h-4 w-4"/></Button>
          </div>
        </div>
        <h2 className="text-2xl font-semibold">Available Land ({filteredListings.length} results)</h2>
        {subscriptionStatus === 'premium' && (
          <Alert variant="default" className="border-premium/50 bg-premium/5 text-premium"><Sparkles className="h-4 w-4 text-premium" /><AlertTitle className="font-semibold text-premium">Premium Search</AlertTitle><AlertDescription>As a Premium member, your listings are boosted and you may see advanced search filters in the future!</AlertDescription></Alert>
        )}
        {filteredListings.length === 0 && !listingsLoading ? (
          <Alert><SearchIcon className="h-4 w-4" /><AlertTitle>No Listings Found</AlertTitle><AlertDescription>Try adjusting your filters or search term.{firebaseInitializationError && " (Note: Real-time data may be unavailable if Firebase isn't configured.)"}</AlertDescription></Alert>
        ) : (
          <div className={viewMode === 'grid' ? "grid sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-6" : "space-y-4"}>
            {paginatedListings.map((listing) => (
                <ListingCard 
                    key={listing.id} 
                    listing={listing} 
                    viewMode={viewMode}
                    isSelected={listing.id === selectedListingId}
                    onCardClick={setSelectedListingId}
                 />
            ))}
          </div>
        )}
        {totalPages > 1 && (
          <Pagination className="mt-8 pb-8"><PaginationContent>
              <PaginationItem><PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); handlePageChange(currentPage - 1);}} className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}/></PaginationItem>
              {[...Array(totalPages)].map((_, i) => (<PaginationItem key={i}><PaginationLink href="#" isActive={currentPage === i + 1} onClick={(e) => { e.preventDefault(); handlePageChange(i + 1);}}>{i + 1}</PaginationLink></PaginationItem>))}
              <PaginationItem><PaginationNext href="#" onClick={(e) => { e.preventDefault(); handlePageChange(currentPage + 1);}} className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}/></PaginationItem>
          </PaginationContent></Pagination>
        )}
      </main>
      {showMap && (
        <aside className="hidden lg:block w-1/3 xl:w-2/5 h-full">
            <MapView 
                listings={allAvailableListings}
                filteredListingIds={Array.from(filteredMapIds)}
                selectedId={selectedListingId} 
                onMarkerClick={setSelectedListingId}
                onMapClick={() => setSelectedListingId(null)}
            />
        </aside>
      )}
    </div>
  );
}

function SearchPageFallback() {
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
            <Suspense fallback={<SearchPageFallback />}>
                <SearchPageContent />
            </Suspense>
        </APIProvider>
    )
}
