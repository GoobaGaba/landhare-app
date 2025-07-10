
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MapPin, DollarSign, CheckCircle, Users, Home, Search as SearchIcon, Sparkles, Crown, Loader2, ArrowRight, ShieldCheck, ClipboardList, Feather, TrendingUp, ChevronDown } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { ListingCard } from '@/components/land-search/listing-card';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useListingsData } from '@/hooks/use-listings-data';
import { cn } from '@/lib/utils';
import CommunityImage from '@/components/icons/community-image.png';


export default function HomePage() {
  const { currentUser, loading: authLoading } = useAuth();
  const { recentListings, isLoading: listingsLoading, error: listingsError, refreshListings } = useListingsData();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (listingsError) {
      console.error("Error fetching recent listings for homepage:", listingsError);
    }
  }, [listingsError]);

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
      <section className="w-full py-16 md:py-24 bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="container mx-auto text-center px-4">
          {!authLoading && currentUser && (
            <p className="mb-4 text-lg text-muted-foreground">Welcome back, {getFirstName()}!</p>
          )}
          <h1 className="text-4xl md:text-6xl font-headline tracking-tight mb-6 text-title">Unlock Your Land. Own Your Future.</h1>
          {!authLoading && !currentUser && (
             <>
              <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
                <Button size="lg" asChild><Link href="/search"><SearchIcon className="mr-2 h-5 w-5" /> Find Land</Link></Button>
                <Button size="lg" variant="secondary" asChild><Link href="/listings/new"><Home className="mr-2 h-5 w-5" /> List Your Land</Link></Button>
              </div>
            </>
          )}
          <div className="mt-10 max-w-2xl mx-auto">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center w-full shadow-lg rounded-full">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
              <Input type="search" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search land (e.g., location, keywords, amenities)" className="w-full h-14 pl-12 pr-16 rounded-full text-base focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" aria-label="Search for land" />
              <Button type="submit" size="lg" className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full p-0" aria-label="Search"><ArrowRight className="h-5 w-5" /></Button>
            </form>
          </div>

          <div className="mt-16 text-center">
            <h2 className="text-2xl font-headline mb-6 text-primary text-center">Recently added</h2>
            {listingsLoading ? (
              <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2 text-muted-foreground">Loading listings...</p></div>
            ) : recentListings.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {recentListings.map(listing => (<ListingCard key={listing.id} listing={listing} viewMode="grid" sizeVariant="compact" />))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No recent listings available at the moment. Check back soon!</p>
            )}
            <Button variant="link" asChild className="mt-6"><Link href="/search">View all listings <ArrowRight className="ml-1 h-4 w-4"/></Link></Button>
            <div className="mt-12 animate-bounce text-center">
              <ChevronDown className="h-8 w-8 text-primary/70 mx-auto" />
            </div>
          </div>
        </div>
      </section>
      
      <section className="w-full py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-headline text-center mb-12 text-primary font-extrabold">How LandHare Works</h2>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <Card className="shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
                  <SearchIcon className="h-10 w-10 text-primary" />
                </div>
                <CardTitle className="text-xl font-headline">Find Land</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">Browse diverse listings with our interactive map and powerful filters. Find the perfect spot for your needs.</p>
              </CardContent>
            </Card>
            <Card className="shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
                  <ShieldCheck className="h-10 w-10 text-primary" />
                </div>
                <CardTitle className="text-xl font-headline">Book Securely</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">Easily book your chosen land with transparent pricing. Our platform helps manage bookings and agreements.</p>
              </CardContent>
            </Card>
            <Card className="shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
                  <ClipboardList className="h-10 w-10 text-primary" />
                </div>
                <CardTitle className="text-xl font-headline">List Your Land</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">Turn your unused land into income. Create listings easily and reach a wide audience of potential renters.</p>
              </CardContent>
            </Card>
          </div>
          <div className="mt-16 animate-bounce text-center">
            <ChevronDown className="h-6 w-6 text-primary/70 mx-auto" />
          </div>
        </div>
      </section>

      <section className="w-full py-16 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-headline text-center mb-6 text-primary font-extrabold">What Makes Us Special</h2>
          <p className="text-lg text-muted-foreground text-center max-w-3xl mx-auto mb-12">
            We're more than just a listing site. We're a community empowering new ways of living and land use.
          </p>
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="relative aspect-[4/3] rounded-lg overflow-hidden shadow-xl">
              <Image 
                src={CommunityImage} 
                alt="A happy couple and their dog standing in front of a modern tiny home with solar panels in a grassy field."
                fill 
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
                placeholder="blur"
              />
            </div>
            <div className="space-y-8">
              <div>
                <Users className="h-8 w-8 text-accent mb-3" />
                <h3 className="text-2xl font-headline text-primary mb-3 font-extrabold">Empowerment for Landowners</h3>
                <p className="text-foreground/90 leading-relaxed">
                  Unlock the potential of your idle land. Generate income, support alternative lifestyles, and contribute to a growing community focused on sustainable and flexible land use.
                </p>
              </div>
              <div>
                <Feather className="h-8 w-8 text-accent mb-3" />
                <h3 className="text-2xl font-headline text-primary mb-3 font-extrabold">Freedom for Land-Seekers</h3>
                <p className="text-foreground/90 leading-relaxed">
                  Find flexible, affordable land options for your tiny home, RV, or unique project. Our "Bring Your Own Home" (BYOH) model offers unparalleled freedom to live life on your terms.
                </p>
              </div>
              <div>
                <TrendingUp className="h-8 w-8 text-accent mb-3" />
                <h3 className="text-2xl font-headline text-primary mb-3 font-extrabold">Pathways to Ownership</h3>
                <p className="text-foreground/90 leading-relaxed">
                  Discover unique Lease-to-Own (LTO) opportunities. Take incremental steps towards owning your piece of land and building your future, with clear terms and community support.
                </p>
              </div>
            </div>
          </div>
          <div className="mt-16 animate-bounce text-center">
            <ChevronDown className="h-6 w-6 text-primary/70 mx-auto" />
          </div>
        </div>
      </section>

      <section className="w-full py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-headline text-center mb-12 text-primary font-extrabold">Key Features</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: SearchIcon, title: 'Instant Search & Booking', description: 'Map-based search with filters for price, size, and amenities.' },
              { icon: Home, title: 'Flexible Terms', description: 'Daily, monthly, or lease-to-own options with transparent pricing.' },
              { icon: Users, title: 'Direct Communication', description: 'Connect directly with landowners or renters through our secure messaging.' },
              { icon: DollarSign, title: 'Dynamic Pricing', description: 'AI-powered suggestions to help landowners price competitively.' },
              { icon: CheckCircle, title: 'Secure Payments & Reviews', description: 'In-app payments, ratings, and 24/7 support.' },
              { icon: MapPin, title: 'Lease-to-Own Pathway', description: 'Opportunities for renters to convert leases into property ownership.' },
            ].map((feature) => (
              <Card key={feature.title} className="text-center shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="mx-auto bg-accent/20 p-3 rounded-full w-fit mb-4">
                    <feature.icon className="h-8 w-8 text-accent" />
                  </div>
                  <CardTitle className="font-headline">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
           <div className="mt-16 animate-bounce text-center">
            <ChevronDown className="h-6 w-6 text-primary/70 mx-auto" />
          </div>
        </div>
      </section>

      <section className="w-full py-16 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-headline text-center mb-12 text-primary font-extrabold">Make U.S. Housing Great Again</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="shadow-lg"><CardHeader><CardTitle className="font-headline flex items-center gap-2"><DollarSign className="text-destructive h-7 w-7" />The Ownership Dilemma</CardTitle></CardHeader><CardContent><p className="text-foreground/90">The average U.S. home now costs over $415,000. With rising interest rates and mortgage burdens, it's time to rethink what affordable housing really means — starting with downsizing, flexibility, and financial freedom.</p></CardContent></Card>
            <Card className="shadow-lg"><CardHeader><CardTitle className="font-headline flex items-center gap-2"><MapPin className="text-primary h-7 w-7" />Unlock Your Land's Earnings</CardTitle></CardHeader><CardContent><p className="text-foreground/90">Millions of acres are sitting idle — yours doesn’t have to. LandHare turns unused land into monthly income. We make it simple to list, connect, and earn — starting today.</p></CardContent></Card>
          </div>
          <div className="mt-16 animate-bounce text-center">
            <ChevronDown className="h-6 w-6 text-primary/70 mx-auto" />
          </div>
        </div>
      </section>

      <section className="w-full py-20 md:py-32 bg-primary text-primary-foreground">
        <div className="container mx-auto text-center px-4">
          <h2 className="text-3xl md:text-4xl font-headline font-extrabold mb-6 text-title-foreground">Ready to Change the Game?</h2>
          <p className="text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto mb-10">
            Join LandHare today. Whether you're looking for land or have land to share, opportunity awaits.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button size="lg" variant="secondary" className="bg-accent hover:bg-accent/90 text-accent-foreground transition-transform hover:scale-105" asChild>
              <Link href="/search">Start Searching Now</Link>
            </Button>
            <Button size="lg" variant="secondary" asChild className="transition-transform hover:scale-105">
               <Link href={currentUser ? "/listings/new" : `/login?redirect=${encodeURIComponent("/listings/new")}`}>Become a Host</Link>
            </Button>
            <Button size="lg" asChild className="bg-premium hover:bg-premium/90 text-premium-foreground transition-transform hover:scale-105">
              <Link href="/pricing"><Crown className="mr-2 h-5 w-5" /> Explore Premium</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
