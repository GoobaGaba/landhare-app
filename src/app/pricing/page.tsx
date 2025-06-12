
'use client'; // Required for useAuth hook

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, BarChart3, Percent, FileText, Crown, Sparkles, Home, Search as SearchIcon, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context'; // Import useAuth
import { useToast } from '@/hooks/use-toast';

const pricingPlans = [
  {
    id: "free",
    title: "Free Account",
    price: "$0",
    period: "Get Started",
    description: "Perfect for browsing, occasional rentals, or listing a single property to test the waters.",
    features: [
      { text: "Unlimited browsing & account creation", icon: SearchIcon },
      { text: "List up to 1 property (mock rule)", icon: Home }, // Mocking the limit rule for display
      { text: "$0.99 per contract initiation fee", icon: FileText },
      { text: "3% closing fee on landowner payouts", icon: Percent },
      { text: "Standard listing visibility", icon: Home },
      { text: "Basic support", icon: CheckCircle },
    ],
    cta: "Sign Up for Free",
    href: "/signup",
  },
  {
    id: "premium",
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
    hrefSelfIfPremium: "/profile?tab=billing", // Link to billing if already premium
    highlight: true,
  },
];

const feeDetails = [
    {
        title: "Contract Initiation Fee",
        description: "A one-time $0.99 fee when you start a lease using a Free Account. Premium members don't pay this!",
    },
    {
        title: "Landowner Closing Fee",
        description: "When you successfully lease your land, we take a small percentage from your payout. This keeps LandShare Connect running and improving.",
        detailsTitle: "Fee based on your account:",
        details: [
            "Free Accounts: 3% of total lease value.",
            "Premium Members: Just 0.99% (Save over 65% on fees!)",
        ],
        exampleTitle: "Example (on a $3,000 lease):",
        example: [
            "Free User Fee: $90",
            "Premium User Fee: $29.70",
        ]
    }
];

export default function PricingPage() {
  const { currentUser, subscriptionStatus, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const handlePremiumCTAClick = () => {
    // In a real app, this would redirect to Stripe Checkout
    // For now, it's a placeholder.
    if (!currentUser) {
        toast({ title: "Login Required", description: "Please log in or sign up to subscribe.", variant: "default"});
        // Potentially redirect to login: router.push('/login?redirect=/pricing');
        return;
    }
    toast({ title: "Upgrade to Premium", description: "Stripe Checkout integration needed here."});
  };


  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

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
        {pricingPlans.map((plan) => {
          const isCurrentUserPremium = subscriptionStatus === 'premium';
          const ctaAction = plan.id === 'premium' ? handlePremiumCTAClick : undefined;
          const ctaLink = plan.id === 'premium'
            ? (isCurrentUserPremium ? plan.hrefSelfIfPremium : undefined) // Link to billing if premium, else undefined for action
            : (currentUser ? "/dashboard" : plan.href); // For free, if logged in go to dash, else signup

          const ctaText = plan.id === 'premium'
            ? (isCurrentUserPremium ? "Manage Subscription" : plan.cta)
            : (currentUser && plan.id === 'free' ? "Go to Dashboard" : plan.cta);

          return (
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
                {ctaAction ? (
                   <Button
                    size="lg"
                    variant={plan.highlight && !isCurrentUserPremium ? "default" : "outline"}
                    className="w-full"
                    onClick={ctaAction}
                    disabled={plan.highlight && isCurrentUserPremium} // Disable "Upgrade" if already premium
                  >
                    {plan.highlight && isCurrentUserPremium ? <Crown className="mr-2 h-4 w-4" /> : null}
                    {ctaText}
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    variant={plan.highlight ? "default" : "outline"}
                    className="w-full"
                    asChild
                  >
                    <Link href={ctaLink!}>{ctaText}</Link>
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
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
                        {fee.detailsTitle && <p className="font-medium text-foreground/90 mt-3">{fee.detailsTitle}</p>}
                        {fee.details && (
                            <ul className="list-disc list-inside pl-2 space-y-1">
                                {fee.details.map(detail => <li key={detail}>{detail}</li>)}
                            </ul>
                        )}
                        {fee.exampleTitle && <p className="font-medium text-foreground/90 mt-3">{fee.exampleTitle}</p>}
                        {fee.example && (
                             <ul className="list-disc list-inside pl-2 space-y-1 text-xs">
                                {fee.example.map(ex => <li key={ex}>{ex}</li>)}
                            </ul>
                        )}
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
