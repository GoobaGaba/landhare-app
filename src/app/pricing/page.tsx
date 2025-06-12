
'use client'; // Required for useAuth hook

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, BarChart3, Percent, Home, Crown, Sparkles, Search as SearchIcon, DollarSign, ShieldCheck, TrendingUp, ImagePlus, InfinityIcon, Tag, Info } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context'; 
import { useToast } from '@/hooks/use-toast';

const pricingPlans = [
  {
    id: "standard",
    title: "Standard Account",
    price: "Free",
    period: "to Join",
    description: "Great for getting started, browsing, and occasional use. Clear, straightforward fees.",
    features: [
      { text: "Unlimited browsing & account creation", icon: SearchIcon, category: "general" },
      { text: "List 1 property", icon: Home, category: "landowner" },
      { text: "$0.99 Per-Booking Fee (when you rent)", icon: DollarSign, category: "renter" },
      { text: "2% Service Fee (on your lease earnings)", icon: Percent, category: "landowner" },
      { text: "Standard listing visibility", icon: TrendingUp, category: "landowner" },
      { text: "Basic support", icon: CheckCircle, category: "general" },
    ],
    cta: "Sign Up for Standard",
    href: "/signup",
  },
  {
    id: "premium",
    title: "Premium Subscription",
    price: "$5",
    period: "/month",
    description: "Maximize your earnings and savings. Best for active landowners and frequent renters.",
    features: [
      { text: "$0 Per-Booking Fee (when you rent - save $0.99 each time!)", icon: Tag, category: "renter", iconColor: "text-green-500" },
      { text: "List unlimited properties", icon: InfinityIcon, category: "landowner" },
      { text: "Add more photos to listings", icon: ImagePlus, category: "landowner"},
      { text: "Only 0.49% Service Fee (on your lease earnings - save over 75%!)", icon: Percent, category: "landowner", iconColor: "text-green-500" },
      { text: "Boosted exposure for your listings", icon: Sparkles, category: "landowner" },
      { text: "Access to exclusive Market Insights", icon: BarChart3, category: "landowner" },
      { text: "Priority support", icon: Crown, category: "general" },
    ],
    cta: "Upgrade to Premium",
    hrefSelfIfPremium: "/profile?tab=billing", 
    highlight: true,
  },
];

export default function PricingPage() {
  const { currentUser, subscriptionStatus, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const handlePremiumCTAClick = () => {
    if (!currentUser) {
        toast({ title: "Login Required", description: "Please log in or sign up to subscribe.", variant: "default"});
        return;
    }
    // Placeholder for Stripe integration
    toast({ title: "Upgrade to Premium", description: "Stripe Checkout integration needed here."});
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        {/* Loader can be added here if desired */}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 md:py-20">
      <header className="text-center mb-12 md:mb-16">
        <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4">
          Industry Low Fees
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          Choose the plan that works for you. Transparent pricing designed to help you save and earn more.
        </p>
      </header>

      <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-16">
        {pricingPlans.map((plan) => {
          const isCurrentUserPremium = subscriptionStatus === 'premium';
          const ctaAction = plan.id === 'premium' ? handlePremiumCTAClick : undefined;
          let ctaLink = plan.id === 'premium'
            ? (isCurrentUserPremium ? plan.hrefSelfIfPremium : undefined)
            : (currentUser ? "/dashboard" : plan.href);
          if (plan.id === 'premium' && !currentUser && !isCurrentUserPremium) ctaLink = "/signup?redirect=/pricing"; // Direct to signup then pricing for premium if not logged in

          const ctaText = plan.id === 'premium'
            ? (isCurrentUserPremium ? "Manage Subscription" : plan.cta)
            : (currentUser && plan.id === 'standard' ? "Go to Dashboard" : plan.cta);
          
          const generalFeatures = plan.features.filter(f => f.category === 'general');
          const renterFeatures = plan.features.filter(f => f.category === 'renter');
          const landownerFeatures = plan.features.filter(f => f.category === 'landowner');

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
                  {plan.period !== "to Join" && <span className="text-muted-foreground ml-1">{plan.period}</span>}
                </div>
                <CardDescription className="mt-1 text-sm h-12">{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 flex-grow">
                {renterFeatures.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 text-accent">For Renters:</h4>
                    <ul className="space-y-2 text-sm">
                      {renterFeatures.map((feature) => (
                        <li key={feature.text} className="flex items-start">
                          <feature.icon className={`h-5 w-5 mr-2 mt-0.5 shrink-0 ${feature.iconColor || (plan.highlight ? 'text-primary' : 'text-accent')}`} />
                          <span>{feature.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {landownerFeatures.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mt-3 mb-2 text-accent">For Landowners:</h4>
                    <ul className="space-y-2 text-sm">
                      {landownerFeatures.map((feature) => (
                        <li key={feature.text} className="flex items-start">
                          <feature.icon className={`h-5 w-5 mr-2 mt-0.5 shrink-0 ${feature.iconColor || (plan.highlight ? 'text-primary' : 'text-accent')}`} />
                          <span>{feature.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                 {generalFeatures.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mt-3 mb-2 text-accent">General:</h4>
                    <ul className="space-y-2 text-sm">
                      {generalFeatures.map((feature) => (
                        <li key={feature.text} className="flex items-start">
                          <feature.icon className={`h-5 w-5 mr-2 mt-0.5 shrink-0 ${feature.iconColor || (plan.highlight ? 'text-primary' : 'text-accent')}`} />
                          <span>{feature.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
              <CardFooter className="mt-auto">
                {ctaAction ? (
                   <Button
                    size="lg"
                    variant={plan.highlight && !isCurrentUserPremium ? "default" : "outline"}
                    className="w-full"
                    onClick={ctaAction}
                    disabled={plan.highlight && isCurrentUserPremium} 
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

      <section className="max-w-3xl mx-auto text-center mt-16">
         <Card className="bg-muted/30">
            <CardHeader>
                <CardTitle className="text-xl flex items-center justify-center gap-2">
                    <Info className="h-5 w-5 text-primary"/> Additional Information
                </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>
                    The $0.99 Per-Booking fee for Standard accounts is applied to the renter at checkout. Premium renters enjoy a $0 fee on bookings they initiate.
                </p>
                <p>
                    Service Fees (2% for Standard, 0.49% for Premium) are calculated on the total lease value and deducted from the landowner's payout per booking. This applies whether the lease is short-term, long-term, or paid monthly.
                </p>
                <p>
                    Please note: National or regional sales taxes (typically 5-7%) may apply to transactions and are handled according to local regulations. These are separate from LandShare Connect's fees.
                </p>
            </CardContent>
         </Card>
         <p className="text-center mt-8 text-sm text-muted-foreground">
            All financial transactions are processed securely. For more details, please see our <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>.
        </p>
      </section>
    </div>
  );
}
