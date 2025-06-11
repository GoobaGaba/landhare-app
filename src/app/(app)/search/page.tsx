
import { ListingCard } from "@/components/land-search/listing-card";
import { FilterPanel } from "@/components/land-search/filter-panel";
import { MapView } from "@/components/land-search/map-view";
import type { Listing } from "@/lib/types";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SearchIcon } from "lucide-react";

// Mock data for listings - replace with API call in a real app
const mockListings: Listing[] = [
  {
    id: "1",
    title: "Sunny Meadow Plot",
    description: "Beautiful 2-acre plot perfect for a tiny home. Quiet and serene with great views.",
    location: "Willow Creek, CO",
    sizeSqft: 87120, // 2 acres
    amenities: ["water", "road_access", "Pet Friendly"],
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
    amenities: ["power"],
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
    amenities: ["septic", "water"],
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
    amenities: ["road_access"],
    pricePerMonth: 100,
    images: ["https://placehold.co/600x400.png?text=Quick+Nook"],
    landownerId: "user4",
    isAvailable: true,
    rating: 4.0,
    numberOfRatings: 3,
    leaseTerm: "short-term",
  },
];

export default function SearchPage() {
  // Filtering logic would be more complex in a real app,
  // typically handled by API calls based on filter state.
  // For this mock, we'll just show available listings.
  const availableListings = mockListings.filter(l => l.isAvailable);

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <div className="w-full lg:w-1/3 xl:w-1/4">
        <FilterPanel />
      </div>
      <div className="w-full lg:w-2/3 xl:w-3/4 space-y-6">
        <div className="lg:hidden"> {/* Show map placeholder on top for smaller screens */}
          <MapView />
        </div>
        <h2 className="text-2xl font-semibold">Available Land ({availableListings.length} results)</h2>
        {availableListings.length === 0 ? (
          <Alert>
            <SearchIcon className="h-4 w-4" />
            <AlertTitle>No Listings Found</AlertTitle>
            <AlertDescription>
              Try adjusting your filters or expanding your search area.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {availableListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
        
        {availableListings.length > 0 && (
          <Pagination className="mt-8">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious href="#" />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink href="#">1</PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationLink href="#" isActive>
                  2
                </PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationLink href="#">3</PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
              <PaginationItem>
                <PaginationNext href="#" />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
      <div className="hidden xl:block xl:w-1/3"> {/* Show map on the side for larger screens */}
        <MapView />
      </div>
    </div>
  );
}
