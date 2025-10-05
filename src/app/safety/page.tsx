'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Info } from "lucide-react";
import Link from "next/link";

export default function SafetyPage() {
  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <Card className="max-w-3xl mx-auto shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck className="h-10 w-10 text-primary" />
            <CardTitle className="text-3xl md:text-4xl font-headline">LandHare Safety</CardTitle>
          </div>
          <CardDescription>
            Your safety and trust are important to us. Here are some guidelines and tips for a secure experience.
          </CardDescription>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none">
          <p className="text-lg text-muted-foreground mb-6">
            At LandHare, we strive to create a trustworthy community. While we facilitate connections, it's important for both landowners and renters to take precautions.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">General Safety Tips</h2>
          <ul className="list-disc pl-6 my-3 space-y-2">
            <li><strong>Communicate Clearly:</strong> Use LandHare's messaging system for initial communications. Be clear about expectations, rules, and terms.</li>
            <li><strong>Verify Information:</strong> Do your due diligence. Ask questions. If something feels off, trust your intuition.</li>
            <li><strong>Meet Safely (If Applicable):</strong> If you decide to meet in person before finalizing an agreement (e.g., to view land), choose a public place or go with a friend. Inform someone of your plans.</li>
            <li><strong>Secure Payments:</strong> Keep all payments and bookings within the LandHare platform. Our system is designed to protect your information and manage transactions securely. Avoid off-platform payment requests.</li>
            <li><strong>Understand Local Laws:</strong> Be aware of local zoning laws, land use regulations, and any permits required for your intended use of the land (especially for structures like tiny homes or RVs).</li>
          </ul>

          <h2 className="text-xl font-semibold mt-6 mb-3">For Landowners</h2>
          <ul className="list-disc pl-6 my-3 space-y-2">
            <li><strong>Screen Renters:</strong> Review renter profiles and communicate thoroughly before accepting a booking.</li>
            <li><strong>Clear Lease Agreements:</strong> Use a clear, written lease agreement that outlines all terms, responsibilities, and rules. Consider using the AI-generated lease suggestion as a starting point and have it reviewed by legal counsel.</li>
            <li><strong>Insurance:</strong> Check with your insurance provider about coverage for renting out your land.</li>
          </ul>

          <h2 className="text-xl font-semibold mt-6 mb-3">For Renters</h2>
          <ul className="list-disc pl-6 my-3 space-y-2">
            <li><strong>Inspect the Land (If Possible):</strong> If feasible and safe, try to visit the land before committing to a long-term lease.</li>
            <li><strong>Understand Restrictions:</strong> Clarify any restrictions on land use, access, noise, pets, etc. before you book.</li>
            <li><strong>Document Everything:</strong> Keep records of your communications and agreements within the LandHare platform.</li>
          </ul>

          <h2 className="text-xl font-semibold mt-6 mb-3">Reporting Concerns</h2>
          <p>
            If you encounter any suspicious activity, safety concerns, or violations of our terms, please <Link href="/contact" className="text-primary hover:underline">contact us</Link> immediately.
          </p>

          <div className="mt-8 p-4 border-l-4 border-primary bg-muted/50 rounded">
            <div className="flex items-start">
              <Info className="h-5 w-5 text-primary mr-3 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-primary">Disclaimer</h3>
                <p className="text-sm text-muted-foreground">
                  LandHare is a platform connecting users. We do not own, manage, or inspect any properties listed. Users are responsible for their own safety and decisions. This page provides general guidance and is not exhaustive.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

    