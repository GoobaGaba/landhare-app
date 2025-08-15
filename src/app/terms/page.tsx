'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-8 md:py-12 max-w-3xl">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <FileText className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl font-headline">Terms of Service</CardTitle>
          </div>
          <CardDescription>
            Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </CardDescription>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none">
          <p className="text-lg text-muted-foreground mb-6">
            Welcome to LandHare! These Terms of Service ("Terms") govern your access to and use of the LandHare website, applications, and services (collectively, the "Services"). Please read these Terms carefully before using our Services.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">1. Acceptance of Terms</h2>
          <p>
            By accessing or using our Services, you agree to be bound by these Terms and our Privacy Policy. If you do not agree to these Terms, you may not access or use the Services.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">2. Description of Services</h2>
          <p>
            LandHare provides an online platform that connects landowners ("Hosts") with individuals seeking to rent or lease land ("Renters") for various purposes, including but not limited to placing tiny homes, RVs, or manufactured homes.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">3. User Accounts</h2>
          <p>
            You may need to register for an account to access certain features of the Services. You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate, current, and complete. You are responsible for safeguarding your password and for all activities that occur under your account.
          </p>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">4. User Conduct</h2>
          <p>
            You agree not to use the Services for any unlawful purpose or in any way that interrupts, damages, impairs, or renders the Services less efficient. You agree not to misrepresent your identity or affiliation with any person or organization.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">5. Listings and Bookings</h2>
          <p>
            Hosts are solely responsible for their listings and compliance with all applicable laws. Renters are responsible for understanding the terms of any lease or rental agreement they enter into with a Host. LandHare is not a party to any agreements entered into between Hosts and Renters.
          </p>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">6. Fees and Payments</h2>
          <p>
            LandHare may charge fees for certain services, such as contract initiation fees for free users or subscription fees for premium features. Closing fees may also apply to landowner payouts. All applicable fees will be disclosed to you prior to you incurring them. More details can be found on our <a href="/pricing" className="text-primary hover:underline">Pricing Page</a>.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">7. Intellectual Property</h2>
          <p>
            The Services and all content therein, including but not limited to text, graphics, logos, and software, are the property of LandHare or its licensors and are protected by copyright and other intellectual property laws.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">8. Disclaimers and Limitation of Liability</h2>
          <p>
            The Services are provided "as is" and "as available" without any warranties of any kind. LandHare will not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or relating to your use of the Services.
          </p>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">9. Termination</h2>
          <p>
            We may terminate or suspend your access to the Services at any time, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">10. Changes to Terms</h2>
          <p>
            LandHare reserves the right to modify these Terms at any time. We will provide notice of any significant changes by posting the new Terms on our website or through other communication channels. Your continued use of the Services after such changes constitutes your acceptance of the new Terms.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">11. Governing Law</h2>
          <p>
            These Terms shall be governed and construed in accordance with the laws of [Your Jurisdiction/State, e.g., "the State of California"], without regard to its conflict of law provisions.
          </p>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">12. Contact Information</h2>
          <p>
            If you have any questions about these Terms, please contact us via our <a href="/contact" className="text-primary hover:underline">Contact Page</a>.
          </p>

          <p className="mt-8 text-sm text-muted-foreground">
            <strong>PLEASE NOTE:</strong> This is a template Terms of Service and is for informational purposes only.
            It is not legal advice. You should consult with a legal professional to ensure your Terms of Service are
            appropriate for your specific business and comply with all applicable laws and regulations.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
