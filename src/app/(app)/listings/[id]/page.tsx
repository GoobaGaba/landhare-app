import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Listing, Review as ReviewType, User } from '@/lib/types'; // Assuming User type exists
import { MapPin, DollarSign, Maximize, CheckCircle, MessageSquare, Star, CalendarDays, Award } from 'lucide-react';
import Link from 'next/link';

// Mock data - replace with API call
const getListingDetails = async (id: string): Promise<Listing | null> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  const mockListings: Listing[] = [
     {
      id: "1",
      title: "Sunny Meadow Plot",
      description: "Beautiful 2-acre plot perfect for a tiny home. Quiet and serene with great views. Enjoy the open space and connect with nature. Ideal for long-term lease or a weekend getaway. Close to local hiking trails and a small town for supplies.",
      location: "Willow Creek, CO",
      sizeSqft: 87120,
      amenities: ["Water Hookup", "Road Access", "Pet Friendly"],
      pricePerMonth: 350,
      images: ["https://placehold.co/800x600.png?text=Sunny+Meadow+1", "https://placehold.co/400x300.png?text=View+1", "https://placehold.co/400x300.png?text=View+2"],
      landownerId: "user1",
      isAvailable: true,
      rating: 4.5,
      numberOfRatings: 12,
    },
    // Add more mock listings if needed to test different scenarios
  ];
  return mockListings.find(l => l.id === id) || null;
};

const getLandownerDetails = async (id: string): Promise<User | null> => {
  await new Promise(resolve => setTimeout(resolve, 200));
  const mockUsers: User[] = [
    { id: "user1", name: "Sarah Miller", email: "sarah@example.com", avatarUrl: "https://placehold.co/100x100.png?text=SM", userType: "landowner" },
  ];
  return mockUsers.find(u => u.id === id) || null;
};

const getListingReviews = async (listingId: string): Promise<ReviewType[]> => {
   await new Promise(resolve => setTimeout(resolve, 300));
   return [
     { id: "rev1", listingId, userId: "user2", rating: 5, comment: "Amazing spot! So peaceful and the host was very helpful.", createdAt: new Date("2023-10-15")},
     { id: "rev2", listingId, userId: "user3", rating: 4, comment: "Great location, amenities as described. A bit tricky to find initially.", createdAt: new Date("2023-09-20")},
   ];
};


export default async function ListingDetailPage({ params }: { params: { id: string } }) {
  const listing = await getListingDetails(params.id);
  
  if (!listing) {
    return <div className="text-center py-10">Listing not found.</div>;
  }

  const landowner = await getLandownerDetails(listing.landownerId);
  const reviews = await getListingReviews(listing.id);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Image Gallery */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div className="relative w-full h-96 md:col-span-2 rounded-lg overflow-hidden shadow-lg">
          <Image
            src={listing.images[0]}
            alt={listing.title}
            data-ai-hint="landscape field"
            fill
            sizes="(max-width: 768px) 100vw, 800px"
            className="object-cover"
            priority
          />
        </div>
        {listing.images.slice(1).map((img, index) => (
          <div key={index} className="relative w-full h-48 rounded-lg overflow-hidden shadow-md">
            <Image src={img} alt={`${listing.title} - view ${index + 1}`} data-ai-hint="nature detail" fill sizes="400px" className="object-cover" />
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Main Listing Info */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl">{listing.title}</CardTitle>
              <div className="flex items-center text-muted-foreground">
                <MapPin className="h-5 w-5 mr-2 text-primary" />
                <span>{listing.location}</span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-foreground/90 leading-relaxed">{listing.description}</p>
              <Separator className="my-6" />
              <h3 className="text-xl font-semibold mb-3">Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center"><Maximize className="h-5 w-5 mr-2 text-primary" /> Size: {listing.sizeSqft.toLocaleString()} sq ft</div>
                <div className="flex items-center"><DollarSign className="h-5 w-5 mr-2 text-primary" /> Price: ${listing.pricePerMonth}/month</div>
                <div className="flex items-center col-span-2"><CalendarDays className="h-5 w-5 mr-2 text-primary" /> Availability: {listing.isAvailable ? <span className="text-green-600 font-medium">Available</span> : <span className="text-red-600 font-medium">Not Available</span>}</div>
              </div>
              <Separator className="my-6" />
              <h3 className="text-xl font-semibold mb-3">Amenities</h3>
              <ul className="grid grid-cols-2 gap-2 text-sm">
                {listing.amenities.map(amenity => (
                  <li key={amenity} className="flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2 text-green-500" /> {amenity}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Reviews Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl flex items-center">
                <Star className="h-6 w-6 mr-2 text-yellow-400 fill-yellow-400" />
                Reviews ({listing.numberOfRatings || 0})
                {listing.rating && <span className="ml-2 text-xl font-bold text-muted-foreground">{listing.rating.toFixed(1)}/5</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {reviews.length > 0 ? reviews.map(review => (
                <Card key={review.id} className="bg-muted/30">
                  <CardHeader className="flex flex-row justify-between items-start pb-2">
                    <div>
                      {/* Placeholder for reviewer name - would fetch user details */}
                      <CardTitle className="text-sm">Reviewer {review.userId.slice(-4)}</CardTitle>
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`h-4 w-4 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}`} />
                        ))}
                      </div>
                    </div>
                    <CardDescription className="text-xs">{review.createdAt.toLocaleDateString()}</CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm pt-0">
                    {review.comment}
                  </CardContent>
                </Card>
              )) : <p className="text-muted-foreground">No reviews yet for this listing.</p>}
               <Button variant="outline" className="mt-4">Write a Review</Button>
            </CardContent>
          </Card>
        </div>

        {/* Landowner & Booking Card */}
        <div className="space-y-6">
          <Card className="sticky top-24 shadow-lg">
            <CardHeader className="items-center text-center">
              {landowner && (
                <>
                  <Avatar className="w-20 h-20 mb-2 border-2 border-primary">
                    <AvatarImage src={landowner.avatarUrl} alt={landowner.name} />
                    <AvatarFallback>{landowner.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  <CardTitle>{landowner.name}</CardTitle>
                  <CardDescription className="flex items-center justify-center">
                    <Award className="h-4 w-4 mr-1 text-accent"/> Verified Landowner
                  </CardDescription>
                </>
              )}
            </CardHeader>
            <CardContent className="text-center">
               <p className="text-2xl font-bold text-primary">${listing.pricePerMonth} <span className="text-sm font-normal text-muted-foreground">/ month</span></p>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button size="lg" className="w-full" disabled={!listing.isAvailable}>
                {listing.isAvailable ? "Request to Book" : "Currently Unavailable"}
              </Button>
              <Button variant="outline" className="w-full">
                <MessageSquare className="h-4 w-4 mr-2" /> Contact Landowner
              </Button>
            </CardFooter>
          </Card>
           <Card>
            <CardHeader>
              <CardTitle className="text-lg">Safety & Guidelines</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-1">
              <p>Ensure you understand the land use rules.</p>
              <p>Communicate clearly with the landowner.</p>
              <p>All payments are processed securely through LandShare Connect.</p>
              <Link href="/safety" className="text-primary hover:underline">Read our safety tips</Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
