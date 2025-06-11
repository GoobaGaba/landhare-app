
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, BarChart3, Percent, FileText, Crown, Sparkles, Home, Search as SearchIcon } from 'lucide-react';
import Link from 'next/link';

const pricingPlans = [
  {
    title: "Free Account",
    price: "$0",
    period: "Get Started",
    description: "Perfect for browsing, occasional rentals, or listing a single property to test the waters.",
    features: [
      { text: "Unlimited browsing & account creation", icon: SearchIcon },
      { text: "List up to 1 property", icon: Home },
      { text: "$0.99 per contract initiation fee", icon: FileText },
      { text: "3% closing fee on landowner payouts", icon: Percent },
      { text: "Standard listing visibility", icon: Home },
      { text: "Basic support", icon: CheckCircle },
    ],
    cta: "Sign Up for Free",
    href: "/signup",
  },
  {
    title: "Premium Subscription",
    price: "$5",
    period: "/month",
    description: "Unlock the full potential of LandShare Connect. Ideal for active landowners and serious renters.",
    features: [
      { text: "Unlimited listings with more photos", icon: Home },
      { text: "No per-contract fees", icon: FileText },
      { text: "Boosted exposure in search results", icon: Sparkles },
      { text: "Access to exclusive market data & insights", icon: BarChart3 },
      { text: "Lower 0.99% closing fee on payouts", icon: Percent },
      { text: "Priority support", icon: Crown },
    ],
    cta: "Upgrade to Premium",
    href: "/profile?tab=billing", // Direct to billing tab on profile for upgrade (mock)
    highlight: true,
  },
];

const feeDetails = [
    {
        title: "Contract Initiation Fee (Free Accounts)",
        description: "A small fee of $0.99 is charged to the party initiating a lease agreement when using a Free Account. Premium subscribers do not pay this fee."
    },
    {
        title: "Closing Fees (Landowner Payouts)",
        description: "We apply a small percentage-based fee on the total value of a lease agreement, deducted from the landowner's payout. This helps us operate and improve the platform.",
        details: [
            "Non-subscribers: 3% of the total lease value.",
            "Subscribers: A reduced fee of 0.99% of the total lease value."
        ],
        example: "For an average land lease valued at $3,000/year: Non-subscribers would see a $90 fee, while Premium subscribers would see a significantly lower $29.70 fee."
    }
]

export default function PricingPage() {
  return (
    <div className="container mx-auto px-4 py-12 md:py-20">
      <header className="text-center mb-12 md:mb-16">
        <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4">
          Our Pricing Plans
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          Choose the plan that best fits your needs. Whether you're just starting out or ready to maximize your opportunities, LandShare Connect has you covered.
        </p>
      </header>

      <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-16">
        {pricingPlans.map((plan) => (
          <Card key={plan.title} className={`shadow-xl flex flex-col ${plan.highlight ? 'border-2 border-primary relative overflow-hidden ring-2 ring-primary/50' : 'border-border'}`}>
            {plan.highlight && (
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold rounded-bl-lg flex items-center gap-1 z-10">
                <Crown className="h-3 w-3" /> Most Popular
              </div>
            )}
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl font-semibold text-primary">{plan.title}</CardTitle>
              <div className="flex items-baseline mt-2">
                <span className="text-4xl font-bold">{plan.price}</span>
                {plan.period !== "Get Started" && <span className="text-muted-foreground ml-1">{plan.period}</span>}
              </div>
              <CardDescription className="mt-1 text-sm h-12">{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 flex-grow">
              <ul className="space-y-2 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature.text} className="flex items-start">
                    <feature.icon className={`h-5 w-5 mr-2 mt-0.5 shrink-0 ${plan.highlight ? 'text-primary' : 'text-accent'}`} />
                    <span>{feature.text}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter className="mt-auto">
              <Button size="lg" variant={plan.highlight ? "default" : "outline"} className="w-full" asChild>
                <Link href={plan.href}>{plan.cta}</Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <section className="max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-center text-primary mb-8">
          Understanding Our Fees
        </h2>
        <div className="space-y-6">
            {feeDetails.map(fee => (
                 <Card key={fee.title} className="bg-card/80">
                    <CardHeader>
                        <CardTitle className="text-xl">{fee.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground space-y-2">
                        <p>{fee.description}</p>
                        {fee.details && (
                            <ul className="list-disc list-inside pl-2 space-y-1">
                                {fee.details.map(detail => <li key={detail}>{detail}</li>)}
                            </ul>
                        )}
                        {fee.example && <p className="mt-2 text-xs italic">{fee.example}</p>}
                    </CardContent>
                 </Card>
            ))}
        </div>
         <p className="text-center mt-8 text-sm text-muted-foreground">
            All financial transactions are processed securely. For more details, please see our <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>.
        </p>
      </section>
    </div>
  );
}
