
'use client';

import { useState, useEffect, useMemo } from 'react';
import { ListingCard } from "@/components/land-search/listing-card";
import { FilterPanel } from "@/components/land-search/filter-panel";
import { MapView } from "@/components/land-search/map-view";
import type { Listing, LeaseTerm } from "@/lib/types";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from '@/components/ui/input';
import { SearchIcon, LayoutGrid, List } from "lucide-react";
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Mock data for listings - replace with API call in a real app
const mockListings: Listing[] = [
  {
    id: "1",
    title: "Sunny Meadow Plot",
    description: "Beautiful 2-acre plot perfect for a tiny home. Quiet and serene with great views.",
    location: "Willow Creek, CO",
    sizeSqft: 87120, // 2 acres
    amenities: ["Water Hookup", "Road Access", "Pet Friendly"], // Matched amenity names
    pricePerMonth: 350,
    images: ["https://placehold.co/600x400.png?text=Sunny+Meadow"],
    landownerId: "user1",
    isAvailable: true,
    rating: 4.5,
    numberOfRatings: 12,
    leaseTerm: "long-term",
    minLeaseDurationMonths: 6,
  },
  {
    id: "2",
    title: "Forest Retreat Lot",
    description: "Secluded 5000 sq ft lot surrounded by trees. Power available at street.",
    location: "Pine Ridge, FL",
    sizeSqft: 5000,
    amenities: ["Power Access"], // Matched amenity names
    pricePerMonth: 200,
    images: ["https://placehold.co/600x400.png?text=Forest+Retreat"],
    landownerId: "user2",
    isAvailable: true,
    rating: 4.2,
    numberOfRatings: 8,
    leaseTerm: "short-term",
    minLeaseDurationMonths: 1,
  },
  {
    id: "3",
    title: "Lakeside Camping Spot",
    description: "Spacious area near the lake, ideal for RVs or short-term stays. Septic hookup available.",
    location: "Blue Lake, CA",
    sizeSqft: 10000,
    amenities: ["Septic System", "Water Hookup"], // Matched amenity names
    pricePerMonth: 500,
    images: ["https://placehold.co/600x400.png?text=Lakeside+Spot"],
    landownerId: "user1",
    isAvailable: false, 
    leaseTerm: "flexible",
  },
  {
    id: "4",
    title: "Desert Oasis Parcel",
    description: "Large 10-acre parcel with stunning desert views. Off-grid living potential.",
    location: "Red Rock, AZ",
    sizeSqft: 435600, // 10 acres
    amenities: [],
    pricePerMonth: 150,
    images: ["https://placehold.co/600x400.png?text=Desert+Oasis"],
    landownerId: "user3",
    isAvailable: true,
    rating: 3.9,
    numberOfRatings: 5,
    leaseTerm: "long-term",
    minLeaseDurationMonths: 12,
  },
   {
    id: "5",
    title: "Quick Getaway Nook",
    description: "Small, convenient plot for weekend RV parking or a very short term tiny home spot.",
    location: "Highway Rest, NV",
    sizeSqft: 2000, 
    amenities: ["Road Access"], // Matched amenity names
    pricePerMonth: 100,
    images: ["https://placehold.co/600x400.png?text=Quick+Nook"],
    landownerId: "user4",
    isAvailable: true,
    rating: 4.0,
    numberOfRatings: 3,
    leaseTerm: "short-term",
  },
];

const ITEMS_PER_PAGE = 6; // Example items per page

const initialPriceRange: [number, number] = [0, 2000];
const initialSizeRange: [number, number] = [100, 500000];

export default function SearchPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [priceRange, setPriceRange] = useState<[number, number]>(initialPriceRange);
  const [sizeRange, setSizeRange] = useState<[number, number]>(initialSizeRange);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [selectedLeaseTerm, setSelectedLeaseTerm] = useState<LeaseTerm | 'any'>('any');
  const [filteredListings, setFilteredListings] = useState<Listing[]>(mockListings.filter(l => l.isAvailable));
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<string>('rating_desc');


  const resetFilters = () => {
    setSearchTerm('');
    setPriceRange(initialPriceRange);
    setSizeRange(initialSizeRange);
    setSelectedAmenities([]);
    setSelectedLeaseTerm('any');
    setSortBy('rating_desc');
  };

  useEffect(() => {
    let listings = mockListings.filter(l => l.isAvailable);

    // Search term filter
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      listings = listings.filter(
        l =>
          l.title.toLowerCase().includes(lowerSearchTerm) ||
          l.description.toLowerCase().includes(lowerSearchTerm) ||
          l.location.toLowerCase().includes(lowerSearchTerm)
      );
    }

    // Price filter
    listings = listings.filter(
      l => l.pricePerMonth >= priceRange[0] && l.pricePerMonth <= priceRange[1]
    );

    // Size filter
    listings = listings.filter(
      l => l.sizeSqft >= sizeRange[0] && l.sizeSqft <= sizeRange[1]
    );

    // Amenities filter
    if (selectedAmenities.length > 0) {
      listings = listings.filter(l =>
        selectedAmenities.every(amenity => l.amenities.map(a => a.toLowerCase()).includes(amenity.toLowerCase()))
      );
    }
    
    // Lease term filter
    if (selectedLeaseTerm !== 'any') {
        listings = listings.filter(l => l.leaseTerm === selectedLeaseTerm);
    }

    // Sorting
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
    setCurrentPage(1); // Reset to first page on filter change
  }, [searchTerm, priceRange, sizeRange, selectedAmenities, selectedLeaseTerm, sortBy]);

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
        <div className="lg:hidden sticky top-16 bg-background py-2 z-10"> {/* Show map placeholder on top for smaller screens */}
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

        {filteredListings.length === 0 ? (
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
              {/* We can add ellipsis logic later if many pages */}
              <PaginationItem>
                <PaginationNext href="#" onClick={(e) => { e.preventDefault(); handlePageChange(currentPage + 1);}} className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}/>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
      <div className="hidden xl:block xl:w-1/3 sticky top-24 self-start"> {/* Show map on the side for larger screens */}
        <MapView />
      </div>
    </div>
  );
}
