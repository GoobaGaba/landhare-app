
'use client'; 

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, BarChart3, Percent, Home, Crown, Sparkles, Search as SearchIcon, DollarSign, ShieldCheck, TrendingUp, ImagePlus, InfinityIcon, Tag, Info, Users, MessageSquare, AlertTriangle, ExternalLink, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context'; 
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; 

const pricingPlans = [
  {
    id: "standard",
    title: "Standard Account",
    price: "Free",
    period: "to Join",
    description: "Great for getting started, browsing, and listing a couple of properties.",
    renterFeatures: [
      { text: "$0.99 Per-Booking Fee (when you rent)", icon: DollarSign },
      { text: "Standard search filters", icon: SearchIcon},
      { text: "Direct messaging with landowners", icon: MessageSquare},
    ],
    landownerFeatures: [
      { text: "List up to 2 properties", icon: Home },
      { text: "2% Service Fee (on your lease earnings)", icon: Percent },
      { text: "Standard listing visibility", icon: CheckCircle },
      { text: "Basic support", icon: Users },
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
    renterFeatures: [
      { text: "$0 Per-Booking Fee (when you rent - save $0.99 each time!)", icon: Tag, isBenefit: true, premiumIconColor: true },
      { text: "Advanced search filters (coming soon)", icon: SearchIcon, isBenefit: true, premiumIconColor: true},
      { text: "Early access to new listings (coming soon)", icon: Sparkles, isBenefit: true, premiumIconColor: true },
    ],
    landownerFeatures: [
      { text: "List unlimited properties", icon: InfinityIcon, isBenefit: true, premiumIconColor: true },
      { text: "Add more photos to listings (up to 10)", icon: ImagePlus, isBenefit: true, premiumIconColor: true},
      { text: "Only 0.49% Service Fee (on your lease earnings - save over 75%!)", icon: Percent, isBenefit: true, premiumIconColor: true },
      { text: "Boosted exposure for your listings", icon: TrendingUp, isBenefit: true, premiumIconColor: true },
    ],
    generalFeatures: [ 
      { text: "Access to exclusive Market Insights (AI-powered)", icon: BarChart3, isBenefit: true, premiumIconColor: true },
      { text: "Priority support", icon: Crown, isBenefit: true, premiumIconColor: true },
    ],
    cta: "Upgrade to Premium",
    actionKey: "upgradePremium", 
    hrefSelfIfPremium: "/profile", 
    highlight: true,
  },
];

export default function PricingPage() {
  const { currentUser, subscriptionStatus, loading: authLoading, updateCurrentAppUserProfile } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isUpgrading, setIsUpgrading] = useState(false);
  
  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleSimulatedUpgrade = async () => {
    if (!currentUser) {
      toast({ title: 'Please log in', description: 'You must be logged in to upgrade your plan.', action: <Button onClick={() => router.push('/login?redirect=/pricing')} variant="link">Log In</Button> });
      return;
    }
    setIsUpgrading(true);
    try {
      await updateCurrentAppUserProfile({ subscriptionStatus: 'premium' });
      toast({
        title: 'Upgrade Successful! (Simulation)',
        description: 'Your account has been upgraded to Premium.',
      });
    } catch (error: any) {
      toast({
        title: 'Upgrade Failed',
        description: error.message || 'Could not complete the simulated upgrade.',
        variant: 'destructive',
      });
    } finally {
      setIsUpgrading(false);
    }
  };


  return (
    <div className="container mx-auto px-4 py-12 md:py-20">
      <header className="text-center mb-12 md:mb-16">
        <h1 className="text-4xl md:text-5xl font-bold text-title mb-4">
          Industry Low Fees
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          Choose the plan that works for you. Transparent pricing designed to help you save and earn more.
        </p>
      </header>

      <Alert variant="default" className="max-w-3xl mx-auto mb-8 border-amber-500 bg-amber-50 text-amber-700">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-700 font-semibold">Test Mode Active</AlertTitle>
        <AlertDescription>
          This page is in **simulation mode**. Clicking 'Upgrade' will instantly grant your account Premium status for testing purposes without any real payment.
        </AlertDescription>
      </Alert>

      <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-16">
        {pricingPlans.map((plan) => {
          const isCurrentUserPremium = subscriptionStatus === 'premium';

          return (
            <Card key={plan.title} className={cn(`shadow-xl flex flex-col`, plan.highlight ? 'border-2 border-premium relative overflow-hidden ring-2 ring-premium/30' : 'border-border')}>
              {plan.highlight && (
                <div className="absolute top-0 right-0 bg-premium text-premium-foreground px-3 py-1 text-xs font-semibold rounded-bl-lg flex items-center gap-1 z-10">
                  <Crown className="h-3 w-3" /> Most Popular
                </div>
              )}
              <CardHeader className="pb-4">
                <CardTitle className={cn("text-2xl font-semibold", plan.highlight ? "text-premium" : "text-primary")}>{plan.title}</CardTitle>
                <div className="flex items-baseline mt-2">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.period !== "to Join" && <span className="text-muted-foreground ml-1">{plan.period}</span>}
                </div>
                <CardDescription className="mt-1 text-sm h-12">{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 flex-grow">
                {plan.renterFeatures && plan.renterFeatures.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 text-accent">For Renters:</h4>
                    <ul className="space-y-2 text-sm">
                      {plan.renterFeatures.map((feature) => (
                        <li key={feature.text} className="flex items-start">
                          <feature.icon className={cn("h-5 w-5 mr-2 mt-0.5 shrink-0", feature.premiumIconColor ? 'text-premium' : 'text-accent')} />
                          <span>{feature.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {plan.landownerFeatures && plan.landownerFeatures.length > 0 && (
                  <div className="mt-3">
                    <h4 className="text-sm font-semibold mb-2 text-accent">For Landowners:</h4>
                    <ul className="space-y-2 text-sm">
                      {plan.landownerFeatures.map((feature) => (
                        <li key={feature.text} className="flex items-start">
                          <feature.icon className={cn("h-5 w-5 mr-2 mt-0.5 shrink-0", feature.premiumIconColor ? 'text-premium' : 'text-accent')} />
                          <span>{feature.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                 {plan.generalFeatures && plan.generalFeatures.length > 0 && ( 
                  <div className="mt-3">
                    <h4 className="text-sm font-semibold mb-2 text-premium">Premium Benefits:</h4>
                    <ul className="space-y-2 text-sm">
                      {plan.generalFeatures.map((feature) => (
                        <li key={feature.text} className="flex items-start">
                           <feature.icon className={cn("h-5 w-5 mr-2 mt-0.5 shrink-0", feature.premiumIconColor ? 'text-premium' : 'text-accent')} />
                          <span>{feature.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
              <CardFooter className="mt-auto pt-4">
                 <div className="w-full">
                    {plan.id === 'premium' ? (
                      <>
                        {isCurrentUserPremium ? (
                          <Button size="lg" variant="outline" asChild className="w-full">
                            <Link href={plan.hrefSelfIfPremium || '/profile'}><ShieldCheck className="mr-2 h-4 w-4" /> Manage Subscription</Link>
                          </Button>
                        ) : (
                          <Button
                            size="lg"
                            className="w-full bg-premium hover:bg-premium/90 text-premium-foreground"
                            onClick={handleSimulatedUpgrade}
                            disabled={isUpgrading}
                          >
                            {isUpgrading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Crown className="mr-2 h-4 w-4"/>}
                            {plan.cta} (Simulated)
                          </Button>
                        )}
                      </>
                    ) : (
                       <Button size="lg" variant="outline" asChild className="w-full">
                          <Link href={currentUser ? '/dashboard' : plan.href}>{currentUser ? "Go to Dashboard" : plan.cta}</Link>
                       </Button>
                    )}
                 </div>
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
                    The $0.99 Per-Booking fee for Standard account renters is applied at checkout. Premium renters enjoy a $0 fee on bookings they initiate.
                </p>
                <p>
                    Service Fees (2% for Standard, 0.49% for Premium landowners) are calculated on the total lease value and deducted from the landowner's payout per booking. This applies whether the lease is short-term, long-term, or paid monthly.
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
