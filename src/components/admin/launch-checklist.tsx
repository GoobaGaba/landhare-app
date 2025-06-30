
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Circle, CheckCircle, AlertTriangle, Cpu, Database, Cloud, Shield, Bot, DollarSign, Scale, ExternalLink, Mail, MessageSquare, Smartphone, Search, BarChart } from 'lucide-react';
import { useChecklistState } from '@/hooks/use-checklist-state';
import { cn } from '@/lib/utils';

const checklistData = [
    {
        category: "Phase 1: Foundation & Launch Readiness",
        description: "Critical configurations and core features that MUST be working for a successful launch.",
        tasks: [
            {
                id: 'firebase_project',
                title: "Firebase Project Created & Configured",
                status: 'Completed',
                details: "The core of the backend. Ensures Authentication, Firestore, and Storage are available.",
                actionLink: 'https://console.firebase.google.com/',
                actionText: 'Go to Firebase Console'
            },
            {
                id: 'api_keys_set',
                title: "API Keys set in .env.local",
                status: 'In Progress',
                details: "Crucial for connecting the app to Google services. The app will be in mock mode without these. Keys needed: NEXT_PUBLIC_FIREBASE_*, GEMINI_API_KEY, NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.",
            },
            {
                id: 'maps_api_rules',
                title: "Google Maps API Key Secured",
                status: 'In Progress',
                details: "Prevents unauthorized use of your Maps API key. Restrict the key to your website's domain using 'HTTP referrers' in the Google Cloud Console.",
                actionLink: 'https://console.cloud.google.com/apis/credentials',
                actionText: 'Manage API Keys'
            },
            {
                id: 'storage_rules',
                title: "Firebase Storage Rules Deployed",
                status: 'In Progress',
                details: "Secures user file uploads. Rules must allow authenticated users to write to their own directory, while allowing global read access for viewing images.",
            },
            {
                id: 'firestore_rules',
                title: "Firestore Security Rules Deployed",
                status: 'In Progress',
                details: "Protects your database. Rules should ensure users can only write/edit their own data (profiles, listings) but can read public data (listings).",
            },
            {
                id: 'auth_flow',
                title: "Authentication Flow Verified",
                status: 'Completed',
                details: "Users can successfully sign up, log in, and log out using both email/password and Google providers.",
            },
            {
                id: 'listing_flow',
                title: "Core Listing Lifecycle Verified",
                status: 'Completed',
                details: "Users can create, edit, view, and delete their own listings. Image uploads are functional, including on mobile.",
            },
             {
                id: 'booking_flow',
                title: "Core Booking & Payment Flow Verified",
                status: 'Completed',
                details: "The entire booking lifecycle (request, confirmation, cancellation, refund) works. Wallet balances update correctly and transactions are logged.",
            },
        ]
    },
    {
        category: "Phase 2: Growth & Monetization",
        description: "Features that build upon the core product to retain users and generate revenue.",
        tasks: [
             {
                id: 'subscription_logic',
                title: "Subscription Tier Logic Verified",
                status: 'Completed',
                details: "The distinction between Standard and Premium users is working correctly, including feature gating (AI tools), listing/bookmark limits, and reduced service fees.",
            },
            {
                id: 'admin_dashboard',
                title: "Admin Dashboard & Metrics Verified",
                status: 'Completed',
                details: "Admin user can view platform-wide metrics and access protected admin tools.",
            },
            {
                id: 'bot_simulator',
                title: "Bot Simulator Operational",
                status: 'Completed',
                details: "The simulation tool on the admin dashboard successfully generates new data to help backtest the economic model.",
            },
            {
                id: 'email_notifications',
                title: "Transactional Email Integration",
                status: 'Not Started',
                details: "Integrate a service like SendGrid or Resend to send critical emails (e.g., booking confirmations, password resets). This requires backend setup.",
                icon: Mail
            },
            {
                id: 'payment_gateway',
                title: "Real Payment Gateway Integration",
                status: 'Not Started',
                details: "To move beyond the simulated economy, integrate Stripe or PayPal to handle real credit card transactions for subscriptions and booking payments.",
                icon: DollarSign,
            },
        ]
    },
    {
        category: "Phase 3: Scale & Competitive Edge",
        description: "Advanced features required to compete with established platforms and scale the business.",
        tasks: [
             {
                id: 'live_messaging',
                title: "Real-Time Messaging",
                status: 'Not Started',
                details: "Replace the mock messaging system with a real-time solution using Firestore or a dedicated service like Stream/Twilio for instant user-to-user communication.",
                icon: MessageSquare
            },
            {
                id: 'reputation_system',
                title: "Advanced Reputation System",
                status: 'Not Started',
                details: "Build a more robust review and reputation system. Allow landowners to review renters, show user verification badges, and track reliability scores.",
                icon: Shield
            },
             {
                id: 'advanced_search',
                title: "Advanced Search & Discovery",
                status: 'Not Started',
                details: "Integrate a dedicated search service like Algolia or Elasticsearch for lightning-fast, typo-tolerant search, and personalized recommendations.",
                icon: Search
            },
             {
                id: 'mobile_apps',
                title: "Native Mobile Apps",
                status: 'Not Started',
                details: "Develop native iOS and Android applications for a superior mobile user experience, push notifications, and offline capabilities.",
                icon: Smartphone
            },
             {
                id: 'analytics',
                title: "In-Depth Analytics Platform",
                status: 'Not Started',
                details: "Integrate a full analytics suite (e.g., Mixpanel, Amplitude) to track user funnels, feature adoption, and cohort analysis to make data-driven decisions.",
                icon: BarChart
            },
        ]
    }
];

const getStatusStyles = (status?: 'Completed' | 'In Progress' | 'Not Started') => {
    switch (status) {
        case 'Completed': return { badge: 'default', icon: CheckCircle, color: 'text-primary' };
        case 'In Progress': return { badge: 'outline', icon: Circle, color: 'text-accent' };
        case 'Not Started': return { badge: 'secondary', icon: Circle, color: 'text-muted-foreground' };
        default: return { badge: 'secondary', icon: Circle, color: 'text-muted-foreground' };
    }
};

export function LaunchChecklist() {
    const { checkedItems, toggleItem, isLoaded } = useChecklistState('launchChecklist');
    const [siteUrl, setSiteUrl] = useState('');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setSiteUrl(window.location.origin);
        }
    }, []);

    const getReferrerPattern = () => {
        if (!siteUrl) return 'Loading...';
        try {
            const urlObject = new URL(siteUrl);
            // For live Firebase URLs (e.g., project-id.web.app), this is correct.
            if (urlObject.hostname.endsWith('.web.app')) {
                return `${urlObject.hostname}/*`;
            }
            // For localhost, no referrer is needed, but showing this helps.
            if (urlObject.hostname === 'localhost') {
                return 'localhost is usually trusted by default.';
            }
            // For other custom domains, this is a good pattern.
            return `*.${urlObject.hostname}/*`;
        } catch (e) {
            return 'Could not determine pattern.';
        }
    };

    if (!isLoaded) {
        return <div className="p-4 text-center text-muted-foreground">Loading checklist...</div>;
    }
    
    return (
        <TooltipProvider>
            <Accordion type="multiple" defaultValue={[checklistData[0].category]} className="w-full">
                {checklistData.map((section, index) => (
                    <AccordionItem value={section.category} key={section.category}>
                        <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                            {section.category}
                        </AccordionTrigger>
                        <AccordionContent>
                             <p className="text-sm text-muted-foreground mb-4 px-1">{section.description}</p>
                            <div className="space-y-3">
                                {section.tasks.map((task) => {
                                    const isChecked = checkedItems.has(task.id);
                                    const styles = getStatusStyles(isChecked ? 'Completed' : task.status);
                                    
                                    return (
                                        <div key={task.id} className="flex items-start gap-3 p-3 rounded-md border bg-background hover:bg-muted/50 transition-colors">
                                            <Checkbox
                                                id={task.id}
                                                checked={isChecked}
                                                onCheckedChange={() => toggleItem(task.id)}
                                                className="mt-1"
                                            />
                                            <div className="flex-grow">
                                                <Tooltip delayDuration={200}>
                                                    <TooltipTrigger asChild>
                                                         <Label htmlFor={task.id} className={cn("font-medium cursor-pointer", isChecked && "line-through text-muted-foreground")}>
                                                            {task.title}
                                                        </Label>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top" align="start" className="max-w-xs">
                                                        <p>{task.details}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                               {task.id === 'maps_api_rules' && (
                                                    <div className="text-xs mt-1 text-muted-foreground">
                                                        Your Pattern: <code className="p-1 text-accent bg-accent/10 rounded-sm font-mono">{getReferrerPattern()}</code>
                                                    </div>
                                                )}

                                            </div>
                                            <div className="flex items-center gap-2">
                                                {task.actionLink && (
                                                    <Button variant="ghost" size="sm" asChild className="h-7">
                                                        <Link href={task.actionLink} target="_blank" rel="noopener noreferrer">
                                                           {task.actionText} <ExternalLink className="ml-2 h-3 w-3" />
                                                        </Link>
                                                    </Button>
                                                )}
                                                <Badge variant={styles.badge} className="hidden sm:inline-flex">
                                                    <styles.icon className={cn("mr-1.5 h-3.5 w-3.5", styles.color)} />
                                                    {isChecked ? 'Completed' : task.status}
                                                </Badge>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </TooltipProvider>
    );
}
