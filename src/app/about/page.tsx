
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Info, Users, MapPin, DollarSign, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <header className="text-center mb-12 md:mb-16">
        <Info className="h-16 w-16 text-primary mx-auto mb-4" />
        <h1 className="text-4xl md:text-5xl font-bold text-primary mb-3">About LandShare Connect</h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
          Connecting landowners with those seeking affordable and flexible land options, fostering a new approach to housing and land use.
        </p>
      </header>

      <section className="mb-12 md:mb-16">
        <Card className="shadow-lg overflow-hidden">
          <div className="md:flex">
            <div className="md:w-1/2 relative h-64 md:h-auto">
              <Image
                src="https://placehold.co/800x600.png"
                alt="Diverse group of people collaborating on a map"
                data-ai-hint="community collaboration"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
            <div className="md:w-1/2 p-6 md:p-8">
              <h2 className="text-2xl md:text-3xl font-semibold text-primary mb-4">Our Mission</h2>
              <p className="text-foreground/90 leading-relaxed mb-4">
                At LandShare Connect, our mission is to bridge the gap between unused land and the growing need for affordable, flexible living spaces. We believe that by connecting landowners with individuals and families seeking plots for tiny homes, RVs, manufactured housing, or other innovative uses, we can create a more sustainable and accessible housing market.
              </p>
              <p className="text-foreground/90 leading-relaxed">
                We aim to empower landowners to generate income from their idle property while providing renters with unique opportunities to find their perfect spot, whether for short-term stays or long-term settlement.
              </p>
            </div>
          </div>
        </Card>
      </section>

      <section className="mb-12 md:mb-16">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-primary mb-8">What We Do</h2>
        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
          <Card className="text-center p-6 shadow-md hover:shadow-lg transition-shadow">
            <Users className="h-12 w-12 text-accent mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Connect People</h3>
            <p className="text-sm text-muted-foreground">
              We provide a user-friendly platform for landowners to list their property and for renters to discover available land.
            </p>
          </Card>
          <Card className="text-center p-6 shadow-md hover:shadow-lg transition-shadow">
            <MapPin className="h-12 w-12 text-accent mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Unlock Land Potential</h3>
            <p className="text-sm text-muted-foreground">
              We help turn underutilized land into valuable assets for owners and opportunities for those seeking space.
            </p>
          </Card>
          <Card className="text-center p-6 shadow-md hover:shadow-lg transition-shadow">
            <DollarSign className="h-12 w-12 text-accent mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Facilitate Agreements</h3>
            <p className="text-sm text-muted-foreground">
              Our platform supports secure communication and aims to make the process of leasing land simpler and more transparent.
            </p>
          </Card>
        </div>
      </section>
      
      <section className="py-12 bg-secondary/30 rounded-lg">
        <div className="container mx-auto px-4 text-center">
            <Sparkles className="h-12 w-12 text-primary mx-auto mb-4" />
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">Join the Movement</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Whether you have land to share or are looking for a place to call your own, LandShare Connect is here to help you make meaningful connections.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/search">Find Land Now</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/listings/new">List Your Land</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mt-16 text-center">
          <p className="text-muted-foreground">
            Have questions? <Link href="/contact" className="text-primary hover:underline">Contact us</Link>.
          </p>
      </section>
    </div>
  );
}
