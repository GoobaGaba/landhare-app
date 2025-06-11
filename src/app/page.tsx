
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MapPin, DollarSign, CheckCircle, Users, Home, Search as SearchIcon, Sparkles, Crown, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import type { Listing } from '@/lib/types';
import { getListings } from '@/lib/mock-data'; 
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
          setRecentListings(allListingsData.filter(l => l.isAvailable).slice(0, 8));
        } else {
          console.error("getListings did not return an array:", allListingsData);
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
  }, []);

  const getFirstName = () => {
    if (currentUser?.displayName) {
      return currentUser.displayName.split(' ')[0];
    }
    if (currentUser?.email) {
      return currentUser.email.split('@')[0];
    }
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
          
          {!authLoading && currentUser ? (
            <div className="mt-10 max-w-3xl mx-auto">
              <form onSubmit={handleSearchSubmit} className="relative flex items-center w-full shadow-md rounded-lg">
                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                <Input
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search land (e.g., location, keywords)"
                  className="w-full h-12 pl-12 pr-16 rounded-lg text-sm focus-visible:ring-primary" 
                  aria-label="Search for land"
                />
                 <Button
                    type="submit"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full"
                    aria-label="Search"
                  >
                    <ArrowRight className="h-5 w-5" />
                  </Button>
              </form>

              <div className="mt-16 text-center"> 
                <h2 className="text-2xl font-semibold mb-6 text-primary"> 
                  Recently added
                </h2>
                {isLoadingListings ? (
                  <div className="flex justify-center items-center h-48">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="ml-2 text-muted-foreground">Loading listings...</p>
                  </div>
                ) : recentListings.length > 0 ? (
                  <div className="flex overflow-x-auto space-x-4 pb-6 -mx-1 sm:-mx-4 px-1 sm:px-4 custom-scrollbar">
                    {recentListings.map(listing => (
                      <div key={listing.id} className="w-64 flex-shrink-0">
                        <ListingCard listing={listing} viewMode="grid" sizeVariant="compact" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No recent listings available at the moment. Check back soon!</p>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
              <Button size="lg" asChild>
                <Link href="/search">
                  <SearchIcon className="mr-2 h-5 w-5" /> Find Land
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="border-neon text-neon hover:bg-neon/10 hover:text-neon" asChild>
                <Link href="/listings/new">
                  <Home className="mr-2 h-5 w-5" /> List Your Land
                </Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* The Problem Section */}
      <section className="w-full py-16 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">The Housing Challenge</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Skyrocketing home prices and idle land. LandShare Connect offers a new path.
          </p>
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><DollarSign className="text-destructive h-7 w-7" />Aspiring Homeowners</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground/90">
                  Average U.S. home prices exceed $417,000, making traditional homeownership a distant dream for many.
                </p>
              </CardContent>
            </Card>
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><MapPin className="text-primary h-7 w-7" />Landowners' Dilemma</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground/90">
                  Millions of acres of private land sit unused, generating no income for their owners.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Our Solution Section */}
      <section className="w-full py-16 md:py-24 bg-secondary/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Our Solution: LandShare Connect</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            A platform connecting people with purpose. Rent land affordably, earn from your space.
          </p>
          <div className="grid md:grid-cols-2 gap-8 items-start">
            <div className="space-y-6">
              <h3 className="text-2xl font-semibold text-primary">For Renters & Buyers</h3>
              <p className="text-foreground/90">
                Discover unique plots for your tiny home, RV, or manufactured home. Flexible terms, transparent pricing, and a path to a place you can call your own.
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
                Monetize your unused land with ease. Our dashboard helps you list, price, and manage bookings, turning idle acres into passive income.
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
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Key Features</h2>
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
            Join LandShare Connect today. Whether you're looking for land or have land to share, opportunity awaits.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button size="lg" variant="secondary" className="bg-accent hover:bg-accent/90 text-accent-foreground" asChild>
              <Link href="/search">Start Searching Now</Link>
            </Button>
            <Button size="lg" variant="outline" className="border-neon text-neon hover:bg-neon/10 hover:text-neon" asChild>
              <Link href="/listings/new">Become a Host</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

