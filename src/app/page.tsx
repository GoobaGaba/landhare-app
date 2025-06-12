
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MapPin, DollarSign, CheckCircle, Users, Home, Search as SearchIcon, Sparkles, Crown, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import type { Listing } from '@/lib/types';
import { getListings, mockDataVersion } from '@/lib/mock-data';
import { ListingCard } from '@/components/land-search/listing-card';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [recentListings, setRecentListings] = useState<Listing[]>([]);
  const [isLoadingListings, setIsLoadingListings] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function fetchRecentListings() {
      setIsLoadingListings(true);
      try {
        const allListingsData = await getListings();
        if (Array.isArray(allListingsData)) {
          const sortedAvailable = allListingsData
            .filter(l => l.isAvailable)
            .sort((a, b) => {
              const timeA = a.createdAt instanceof Date ? a.createdAt.getTime() : (a.createdAt as any)?.seconds * 1000 || 0;
              const timeB = b.createdAt instanceof Date ? b.createdAt.getTime() : (b.createdAt as any)?.seconds * 1000 || 0;
              return timeB - timeA; 
            });
          setRecentListings(sortedAvailable.slice(0, 4));
        } else {
          setRecentListings([]);
        }
      } catch (error) {
        console.error("Failed to fetch recent listings:", error);
        setRecentListings([]);
      } finally {
        setIsLoadingListings(false);
      }
    }
    fetchRecentListings();
  }, [mockDataVersion]); // Added mockDataVersion

  const getFirstName = () => {
    if (currentUser?.appProfile?.name) return currentUser.appProfile.name.split(' ')[0];
    if (currentUser?.displayName) return currentUser.displayName.split(' ')[0];
    if (currentUser?.email) return currentUser.email.split('@')[0];
    return 'Valued User';
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
    } else {
      router.push('/search');
    }
  };

  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="w-full py-16 md:py-24 bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="container mx-auto text-center px-4">
          {!authLoading && currentUser && (
            <p className="mb-4 text-lg text-muted-foreground">
              Welcome back, {getFirstName()}!
            </p>
          )}
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 text-primary">
            Unlock Your Land. Find Your Space.
          </h1>
          
          {!authLoading && !currentUser && (
             <>
              
              <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
                <Button size="lg" asChild>
                  <Link href="/search">
                    <SearchIcon className="mr-2 h-5 w-5" /> Find Land
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="border-neon text-neon hover:bg-neon/10 hover:text-neon" asChild>
                  <Link href="/login?redirect=%2Flistings%2Fnew">
                    <Home className="mr-2 h-5 w-5" /> List Your Land
                  </Link>
                </Button>
              </div>
            </>
          )}

          <div className="mt-10 max-w-2xl mx-auto">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center w-full shadow-lg rounded-full">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
              <Input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search land (e.g., location, keywords, amenities)"
                className="w-full h-14 pl-12 pr-16 rounded-full text-base focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                aria-label="Search for land"
              />
               <Button
                  type="submit"
                  size="lg"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full p-0"
                  aria-label="Search"
                >
                  <ArrowRight className="h-5 w-5" />
                </Button>
            </form>
          </div>

          <div className="mt-16 text-center">
            <h2 className="text-2xl font-semibold mb-6 text-primary text-center">
              Recently added
            </h2>
            {isLoadingListings ? (
              <div className="flex justify-center items-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2 text-muted-foreground">Loading listings...</p>
              </div>
            ) : recentListings.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {recentListings.map(listing => (
                  <ListingCard key={listing.id} listing={listing} viewMode="grid" sizeVariant="compact" />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No recent listings available at the moment. Check back soon!</p>
            )}
            <Button variant="link" asChild className="mt-6">
              <Link href="/search">View all listings <ArrowRight className="ml-1 h-4 w-4"/></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* The Problem Section / Housing Challenge */}
      <section className="w-full py-16 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-primary">
            The platform built to make affordable housing Great again
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><DollarSign className="text-destructive h-7 w-7" />The Ownership Dilemma</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground/90">
                  The average U.S. home now costs over $415,000. With rising interest rates and mortgage burdens, it's time to rethink what affordable housing really means — starting with downsizing, flexibility, and financial freedom.
                </p>
              </CardContent>
            </Card>
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><MapPin className="text-primary h-7 w-7" />Unlock Your Land's Earnings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground/90">
                  Millions of acres are sitting idle — yours doesn’t have to. LandShare turns unused land into monthly income. We make it simple to list, connect, and earn — starting today.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Content Section (Formerly "Our Solution") */}
      <section className="w-full py-16 md:py-24 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8 items-start">
            <div className="space-y-6">
              <h3 className="text-2xl font-semibold text-primary">For Land Seekers</h3>
              <p className="text-foreground/90">
                Searching for space for your tiny home, RV, or next big idea? Discover affordable land leases directly from property owners. Your perfect plot is just a click away.
              </p>
              <Image
                src="https://placehold.co/600x400.png"
                alt="Happy person in a tiny home"
                data-ai-hint="tiny home lifestyle"
                width={600}
                height={400}
                className="rounded-lg shadow-md object-cover w-full"
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 600px"
              />
            </div>
            <div className="space-y-6">
              <h3 className="text-2xl font-semibold text-primary">For Landowners</h3>
              <p className="text-foreground/90">
                Have land sitting idle? List it on LandShare and start earning. We provide easy tools for listing, managing bookings, and secure payments. Turn your empty space into opportunity.
              </p>
              <Image
                src="https://placehold.co/600x400.png"
                alt="Landowner managing listing on a tablet"
                data-ai-hint="landowner technology"
                width={600}
                height={400}
                className="rounded-lg shadow-md object-cover w-full"
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 600px"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Key Features Section */}
      <section className="w-full py-16 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-primary">Key Features</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: SearchIcon, title: 'Instant Search & Booking', description: 'Map-based search with filters for price, size, and amenities.' },
              { icon: Home, title: 'Flexible Terms', description: 'Daily, monthly, or lease-to-own options with transparent pricing.' },
              { icon: CheckCircle, title: 'Secure Payments & Reviews', description: 'In-app payments, ratings, and 24/7 support.' },
              { icon: Users, title: 'Direct Communication', description: 'Connect directly with landowners or renters through our secure messaging.' },
              { icon: DollarSign, title: 'Dynamic Pricing', description: 'AI-powered suggestions to help landowners price competitively.' },
              { icon: MapPin, title: 'Lease-to-Own Pathway', description: 'Opportunities for renters to convert leases into property ownership.' },
            ].map((feature) => (
              <Card key={feature.title} className="text-center shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="mx-auto bg-accent/20 p-3 rounded-full w-fit mb-4">
                    <feature.icon className="h-8 w-8 text-accent" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
       
      {/* Call to Action Section */}
      <section className="w-full py-20 md:py-32 bg-primary text-primary-foreground">
        <div className="container mx-auto text-center px-4">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Change the Game?</h2>
          <p className="text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto mb-10">
            Join LandShare today. Whether you're looking for land or have land to share, opportunity awaits.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button size="lg" variant="secondary" className="bg-accent hover:bg-accent/90 text-accent-foreground" asChild>
              <Link href="/search">Start Searching Now</Link>
            </Button>
            <Button size="lg" variant="outline" className="border-neon text-neon hover:bg-neon/10 hover:text-neon" asChild>
               <Link href={currentUser ? "/listings/new" : `/login?redirect=${encodeURIComponent("/listings/new")}`}>Become a Host</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
    

    
