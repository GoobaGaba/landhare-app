import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MapPin, DollarSign, CheckCircle, Users, Home, Search } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="w-full py-20 md:py-32 bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="container mx-auto text-center px-4">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 text-primary">
            Unlock Your Land. Find Your Space.
          </h1>
          <p className="text-lg md:text-xl text-foreground/80 max-w-3xl mx-auto mb-10">
            LandShare Connect makes affordable housing accessible and helps landowners earn.
            Rent or list land for tiny homes, RVs, and more.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/search">
                <Search className="mr-2 h-5 w-5" /> Find Land
              </Link>
            </Button>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/listings/new">
                <Home className="mr-2 h-5 w-5" /> List Your Land
              </Link>
            </Button>
          </div>
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
              { icon: Search, title: 'Instant Search & Booking', description: 'Map-based search with filters for price, size, and amenities.' },
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
            <Button size="lg" variant="outline" className="border-primary-foreground/50 text-primary-foreground hover:bg-primary-foreground/10" asChild>
              <Link href="/listings/new">Become a Host</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
