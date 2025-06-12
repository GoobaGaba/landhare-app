
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { ListingCard } from "@/components/land-search/listing-card";
import { FilterPanel } from "@/components/land-search/filter-panel";
import { MapView } from "@/components/land-search/map-view";
import type { Listing, LeaseTerm } from "@/lib/types";
import { getListings as fetchAllListings, mockDataVersion } from '@/lib/mock-data';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from '@/components/ui/input';
import { SearchIcon, LayoutGrid, List, Loader2, AlertTriangle, Sparkles } from "lucide-react";
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { firebaseInitializationError } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';

const ITEMS_PER_PAGE = 6;
const initialPriceRange: [number, number] = [0, 2000];
const initialSizeRange: [number, number] = [100, 500000];

export default function SearchPage() {
  const [allListings, setAllListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { subscriptionStatus } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [priceRange, setPriceRange] = useState<[number, number]>(initialPriceRange);
  const [sizeRange, setSizeRange] = useState<[number, number]>(initialSizeRange);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [selectedLeaseTerm, setSelectedLeaseTerm] = useState<LeaseTerm | 'any'>('any');
  const [filteredListings, setFilteredListings] = useState<Listing[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<string>('rating_desc');

  useEffect(() => {
    const loadInitialListings = async () => {
      if (firebaseInitializationError) {
        toast({
            title: "Preview Mode Active",
            description: "Firebase not configured. Displaying sample listings for preview.",
            variant: "default",
            duration: 5000
        });
      }
      setIsLoading(true);
      try {
        const listings = await fetchAllListings(); // Uses mockDataVersion internally if in mock mode
        const availableListings = listings.filter(l => l.isAvailable);
        setAllListings(availableListings);
      } catch (error: any) {
        console.error("Error fetching listings:", error);
        toast({ title: "Loading Error", description: error.message || "Could not load listings.", variant: "destructive" });
        setAllListings([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialListings();
  }, [toast, mockDataVersion]);


  const resetFilters = () => {
    setSearchTerm('');
    setPriceRange(initialPriceRange);
    setSizeRange(initialSizeRange);
    setSelectedAmenities([]);
    setSelectedLeaseTerm('any');
    setSortBy('rating_desc');
  };

  useEffect(() => {
    if (isLoading) return;

    let listings = [...allListings];

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      listings = listings.filter(
        l =>
          l.title.toLowerCase().includes(lowerSearchTerm) ||
          l.description.toLowerCase().includes(lowerSearchTerm) ||
          l.location.toLowerCase().includes(lowerSearchTerm)
      );
    }

    listings = listings.filter(
      l => (l.price ?? 0) >= priceRange[0] && (l.price ?? 0) <= priceRange[1]
    );

    listings = listings.filter(
      l => l.sizeSqft >= sizeRange[0] && l.sizeSqft <= sizeRange[1]
    );

    if (selectedAmenities.length > 0) {
      listings = listings.filter(l =>
        selectedAmenities.every(amenity => l.amenities.map(a => a.toLowerCase()).includes(amenity.toLowerCase()))
      );
    }

    if (selectedLeaseTerm !== 'any') {
        listings = listings.filter(l => l.leaseTerm === selectedLeaseTerm);
    }

    listings = [...listings].sort((a, b) => {
      let comparison = 0;
      if (a.isBoosted && !b.isBoosted) comparison = -1;
      if (!a.isBoosted && b.isBoosted) comparison = 1;
      if (comparison !== 0 && (sortBy.includes('rating') || sortBy === 'default_sort_perhaps')) return comparison;
      
      const priceA = a.price ?? 0;
      const priceB = b.price ?? 0;

      switch (sortBy) {
        case 'price_asc': comparison = priceA - priceB; break;
        case 'price_desc': comparison = priceB - priceA; break;
        case 'size_asc': comparison = a.sizeSqft - b.sizeSqft; break;
        case 'size_desc': comparison = b.sizeSqft - a.sizeSqft; break;
        case 'rating_desc': comparison = (b.rating || 0) - (a.rating || 0); break;
        default: comparison = 0;
      }
      // If primary sort criteria are equal, then consider boost status
      if (comparison === 0) {
        if (a.isBoosted && !b.isBoosted) return -1;
        if (!a.isBoosted && b.isBoosted) return 1;
      }
      return comparison;
    });

    setFilteredListings(listings);
    setCurrentPage(1);
  }, [searchTerm, priceRange, sizeRange, selectedAmenities, selectedLeaseTerm, sortBy, allListings, isLoading]);

  const paginatedListings = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredListings.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredListings, currentPage]);

  const totalPages = Math.ceil(filteredListings.length / ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  if (isLoading || subscriptionStatus === 'loading') {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-lg text-muted-foreground">Loading available land...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <div className="w-full lg:w-1/3 xl:w-1/4">
        <FilterPanel
          priceRange={priceRange}
          setPriceRange={setPriceRange}
          sizeRange={sizeRange}
          setSizeRange={setSizeRange}
          selectedAmenities={selectedAmenities}
          setSelectedAmenities={setSelectedAmenities}
          selectedLeaseTerm={selectedLeaseTerm}
          setSelectedLeaseTerm={setSelectedLeaseTerm}
          resetFilters={resetFilters}
        />
      </div>
      <div className="w-full lg:w-2/3 xl:w-3/4 space-y-6">
        <div className="lg:hidden sticky top-16 bg-background py-2 z-10">
          <MapView />
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4">
          <div className="relative w-full sm:max-w-xs">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by keyword..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rating_desc">Rating (High to Low)</SelectItem>
                <SelectItem value="price_asc">Price (Low to High)</SelectItem>
                <SelectItem value="price_desc">Price (High to Low)</SelectItem>
                <SelectItem value="size_asc">Size (Small to Large)</SelectItem>
                <SelectItem value="size_desc">Size (Large to Small)</SelectItem>
              </SelectContent>
            </Select>
            <Button variant={viewMode === 'grid' ? 'secondary' : 'outline'} size="icon" onClick={() => setViewMode('grid')} title="Grid View">
              <LayoutGrid className="h-4 w-4"/>
            </Button>
            <Button variant={viewMode === 'list' ? 'secondary' : 'outline'} size="icon" onClick={() => setViewMode('list')} title="List View">
              <List className="h-4 w-4"/>
            </Button>
          </div>
        </div>

        <h2 className="text-2xl font-semibold">Available Land ({filteredListings.length} results)</h2>

        {subscriptionStatus === 'premium' && (
          <Alert variant="default" className="border-primary/50 bg-primary/5 text-primary">
            <Sparkles className="h-4 w-4 text-primary" />
            <AlertTitle className="font-semibold">Premium Search</AlertTitle>
            <AlertDescription>
              As a Premium member, your listings are boosted and you may see advanced search filters in the future!
            </AlertDescription>
          </Alert>
        )}

        {filteredListings.length === 0 && !isLoading ? (
          <Alert>
            <SearchIcon className="h-4 w-4" />
            <AlertTitle>No Listings Found</AlertTitle>
            <AlertDescription>
              Try adjusting your filters or search term.
              {firebaseInitializationError && " (Currently displaying sample data due to Firebase configuration issue.)"}
            </AlertDescription>
          </Alert>
        ) : (
          <div className={viewMode === 'grid' ? "grid sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" : "space-y-4"}>
            {paginatedListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} viewMode={viewMode} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <Pagination className="mt-8">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); handlePageChange(currentPage - 1);}} className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}/>
              </PaginationItem>
              {[...Array(totalPages)].map((_, i) => (
                <PaginationItem key={i}>
                  <PaginationLink
                    href="#"
                    isActive={currentPage === i + 1}
                    onClick={(e) => { e.preventDefault(); handlePageChange(i + 1);}}
                  >
                    {i + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext href="#" onClick={(e) => { e.preventDefault(); handlePageChange(currentPage + 1);}} className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}/>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
      <div className="hidden xl:block xl:w-1/3 sticky top-24 self-start">
        <MapView />
      </div>
    </div>
  );
}
