
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto px-4 py-8 md:py-12 max-w-3xl">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl font-headline">Privacy Policy</CardTitle>
          </div>
          <CardDescription>
            Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </CardDescription>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none">
          <p className="text-lg text-muted-foreground mb-6">
            LandHare ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Services.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">1. Information We Collect</h2>
          <p>
            We may collect personal information that you provide directly to us, such as when you create an account, list a property, make a booking, or communicate with us. This information may include:
          </p>
          <ul className="list-disc pl-6 my-3">
            <li>Name, email address, phone number, and postal address.</li>
            <li>Account login credentials.</li>
            <li>Information about your land listings (location, size, amenities, photos).</li>
            <li>Booking details and payment information (processed by our third-party payment processors).</li>
            <li>Communications with us or other users.</li>
          </ul>
          <p>
            We may also automatically collect certain information when you use our Services, such as your IP address, browser type, operating system, and usage data.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">2. How We Use Your Information</h2>
          <p>
            We use the information we collect to:
          </p>
          <ul className="list-disc pl-6 my-3">
            <li>Provide, operate, and maintain our Services.</li>
            <li>Process your transactions and manage your account.</li>
            <li>Facilitate communication between Hosts and Renters.</li>
            <li>Improve and personalize your experience on our Services.</li>
            <li>Send you technical notices, updates, security alerts, and support messages.</li>
            <li>Respond to your comments, questions, and requests.</li>
            <li>Communicate with you about products, services, offers, promotions, and events offered by LandHare and others.</li>
            <li>Monitor and analyze trends, usage, and activities in connection with our Services.</li>
            <li>Protect against, investigate, and deter fraudulent, unauthorized, or illegal activity.</li>
          </ul>

          <h2 className="text-xl font-semibold mt-6 mb-3">3. How We Share Your Information</h2>
          <p>
            We may share your information in the following situations:
          </p>
          <ul className="list-disc pl-6 my-3">
            <li>With other users (e.g., sharing a Host's contact information with a Renter upon a confirmed booking).</li>
            <li>With third-party service providers who perform services on our behalf (e.g., payment processing, data analysis, email delivery, hosting services).</li>
            <li>In response to a request for information if we believe disclosure is in accordance with, or required by, any applicable law, regulation, or legal process.</li>
            <li>If we believe your actions are inconsistent with our user agreements or policies, or to protect the rights, property, and safety of LandHare or others.</li>
            <li>In connection with, or during negotiations of, any merger, sale of company assets, financing, or acquisition of all or a portion of our business by another company.</li>
            <li>With your consent or at your direction.</li>
          </ul>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">4. Data Security</h2>
          <p>
            We implement reasonable measures to help protect your personal information from loss, theft, misuse, and unauthorized access, disclosure, alteration, and destruction. However, no security system is impenetrable, and we cannot guarantee the security of our systems 100%.
          </p>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">5. Your Choices</h2>
          <p>
            You may review, update, or delete your account information by logging into your account settings. You may also opt-out of receiving promotional emails from us by following the instructions in those emails.
          </p>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">6. Cookies and Tracking Technologies</h2>
          <p>
            We may use cookies, web beacons, and other tracking technologies to collect information about your browsing activities over time and across different websites following your use of our Services.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">7. Children's Privacy</h2>
          <p>
            Our Services are not directed to individuals under the age of 18. We do not knowingly collect personal information from children under 18. If we become aware that a child under 18 has provided us with personal information, we will take steps to delete such information.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">8. Changes to This Privacy Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. If we make changes, we will notify you by revising the "Last Updated" date at the top of this policy and, in some cases, we may provide you with additional notice (such as adding a statement to our homepage or sending you a notification).
          </p>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">9. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us via our <a href="/contact" className="text-primary hover:underline">Contact Page</a>.
          </p>

          <p className="mt-8 text-sm text-muted-foreground">
            <strong>PLEASE NOTE:</strong> This is a template Privacy Policy and is for informational purposes only.
            It is not legal advice. You should consult with a legal professional to ensure your Privacy Policy is
            appropriate for your specific business and complies with all applicable laws and regulations, such as GDPR, CCPA, etc.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
