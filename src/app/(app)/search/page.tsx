
'use client';

import { useState, useEffect, useMemo } from 'react';
import { ListingCard } from "@/components/land-search/listing-card";
import { FilterPanel } from "@/components/land-search/filter-panel";
import { MapView } from "@/components/land-search/map-view";
import type { Listing, LeaseTerm } from "@/lib/types";
import { getListings as fetchAllListings } from '@/lib/mock-data'; // Using Firestore backed getListings
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from '@/components/ui/input';
import { SearchIcon, LayoutGrid, List, Loader2, AlertTriangle } from "lucide-react";
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { firebaseInitializationError } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ITEMS_PER_PAGE = 6; 
const initialPriceRange: [number, number] = [0, 2000];
const initialSizeRange: [number, number] = [100, 500000];

export default function SearchPage() {
  const [allListings, setAllListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

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
        toast({ title: "Database Error", description: "Cannot load listings: " + firebaseInitializationError, variant: "destructive" });
        setIsLoading(false);
        setAllListings([]);
        setFilteredListings([]);
        return;
      }
      setIsLoading(true);
      try {
        const listings = await fetchAllListings();
        const availableListings = listings.filter(l => l.isAvailable);
        setAllListings(availableListings);
        setFilteredListings(availableListings); // Initially set filtered to all available
      } catch (error: any) {
        console.error("Error fetching listings:", error);
        toast({ title: "Loading Error", description: error.message || "Could not load listings.", variant: "destructive" });
        setAllListings([]);
        setFilteredListings([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialListings();
  }, [toast]);


  const resetFilters = () => {
    setSearchTerm('');
    setPriceRange(initialPriceRange);
    setSizeRange(initialSizeRange);
    setSelectedAmenities([]);
    setSelectedLeaseTerm('any');
    setSortBy('rating_desc');
  };

  useEffect(() => {
    if (isLoading) return; // Don't filter if initial data isn't loaded

    let listings = [...allListings]; // Use the fetched and stored allListings

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
      l => l.pricePerMonth >= priceRange[0] && l.pricePerMonth <= priceRange[1]
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
      switch (sortBy) {
        case 'price_asc':
          return a.pricePerMonth - b.pricePerMonth;
        case 'price_desc':
          return b.pricePerMonth - a.pricePerMonth;
        case 'size_asc':
          return a.sizeSqft - b.sizeSqft;
        case 'size_desc':
          return b.sizeSqft - a.sizeSqft;
        case 'rating_desc':
          return (b.rating || 0) - (a.rating || 0);
        default:
          return 0;
      }
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-lg text-muted-foreground">Loading available land...</p>
      </div>
    );
  }
  
  if (firebaseInitializationError && !isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              Service Unavailable
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Land search is temporarily unavailable due to a configuration issue: <span className="font-semibold text-destructive">{firebaseInitializationError}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-2">Please ensure Firebase is correctly configured in your .env.local file and the server has been restarted.</p>
          </CardContent>
        </Card>
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
          disabled={firebaseInitializationError !== null}
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
              disabled={firebaseInitializationError !== null}
            />
          </div>
          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={setSortBy} disabled={firebaseInitializationError !== null}>
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
            <Button variant={viewMode === 'grid' ? 'secondary' : 'outline'} size="icon" onClick={() => setViewMode('grid')} title="Grid View" disabled={firebaseInitializationError !== null}>
              <LayoutGrid className="h-4 w-4"/>
            </Button>
            <Button variant={viewMode === 'list' ? 'secondary' : 'outline'} size="icon" onClick={() => setViewMode('list')} title="List View" disabled={firebaseInitializationError !== null}>
              <List className="h-4 w-4"/>
            </Button>
          </div>
        </div>
        
        <h2 className="text-2xl font-semibold">Available Land ({filteredListings.length} results)</h2>

        {filteredListings.length === 0 && !firebaseInitializationError ? (
          <Alert>
            <SearchIcon className="h-4 w-4" />
            <AlertTitle>No Listings Found</AlertTitle>
            <AlertDescription>
              Try adjusting your filters or search term.
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
