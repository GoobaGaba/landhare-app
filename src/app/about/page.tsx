
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Home, Users, Feather, ShieldCheck } from "lucide-react";
import Image from 'next/image';

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
      <header className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-headline text-title mb-4">About LandShare Connect</h1>
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
          Reimagining land use and the dream of ownership for a new generation.
        </p>
      </header>

      <Card className="shadow-lg mb-12 overflow-hidden">
        <div className="relative h-64 w-full">
            <Image 
                src="https://placehold.co/1200x400.png" 
                alt="A beautiful, open landscape representing opportunity" 
                data-ai-hint="landscape opportunity"
                fill
                className="object-cover"
                sizes="100vw"
            />
        </div>
        <CardHeader>
          <CardTitle className="text-2xl">Our Mission</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-foreground/90 leading-relaxed">
            The dream of owning property feels more distant than ever for many. At the same time, countless acres of land sit unused. LandShare Connect was born from a simple idea: what if we could connect these two realities? Our mission is to bridge the gap between landowners and those seeking affordable, flexible land options. We are building a community-driven marketplace that empowers people to unlock the potential of land, fostering everything from tiny home communities and RV spots to sustainable agriculture and unique personal projects.
          </p>
        </CardContent>
      </Card>
      
      <div className="grid md:grid-cols-3 gap-8 text-center mb-12">
        <div className="space-y-3">
          <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit">
            <Home className="h-8 w-8 text-primary"/>
          </div>
          <h3 className="text-xl font-headline">For Landowners</h3>
          <p className="text-sm text-muted-foreground">Turn your idle land into a consistent source of income. Support a new generation of homeowners and creators while making your asset work for you.</p>
        </div>
        <div className="space-y-3">
          <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit">
            <Feather className="h-8 w-8 text-primary"/>
          </div>
          <h3 className="text-xl font-headline">For Land-Seekers</h3>
          <p className="text-sm text-muted-foreground">Find the freedom you've been searching for. Secure affordable plots for your tiny home, RV, or project with flexible terms, including unique pathways to ownership.</p>
        </div>
        <div className="space-y-3">
          <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit">
            <Users className="h-8 w-8 text-primary"/>
          </div>
          <h3 className="text-xl font-headline">For the Community</h3>
          <p className="text-sm text-muted-foreground">We believe in building more than just a platform. We're fostering a community that values sustainable living, innovative housing solutions, and mutual empowerment.</p>
        </div>
      </div>

       <Card className="shadow-md bg-muted/40">
        <CardHeader>
            <CardTitle>Join Us on Our Journey</CardTitle>
            <CardDescription>This is just the beginning.</CardDescription>
        </CardHeader>
        <CardContent>
            <p>
                LandShare Connect is more than a service—it's a movement. We are continuously working to improve the platform and add new features. We are excited about the future and the potential to create real change in the housing landscape. Thank you for being a part of our story.
            </p>
        </CardContent>
       </Card>

    </div>
  );
}
