
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Mail, Shield, Bell, CreditCard, Save, Edit3, KeyRound, Loader2, Crown, RefreshCw, AlertTriangle, Repeat, ReceiptText, Wallet } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import type { SubscriptionStatus, User as AppUserType } from '@/lib/types';
import { Textarea } from '@/components/ui/textarea';
import { isPrototypeMode } from '@/lib/firebase';
import { Switch } from "@/components/ui/switch";
import { cn } from '@/lib/utils';
import { useListingsData } from '@/hooks/use-listings-data';
import { FREE_TIER_LISTING_LIMIT } from '@/lib/mock-data';

interface ProfileDisplayData {
  name: string;
  email: string;
  avatarUrl?: string;
  bio: string;
  memberSince: Date;
  subscriptionTier: SubscriptionStatus;
  walletBalance: number;
}

export default function ProfilePage() {
  const { currentUser, loading: authLoading, subscriptionStatus, refreshUserProfile, updateCurrentAppUserProfile, sendPasswordReset } = useAuth();
  const { myListings } = useListingsData();
  const { toast } = useToast();
  const router = useRouter();
  
  const [isEditing, setIsEditing] = useState(false);
  const [profileFormData, setProfileFormData] = useState<{name: string, bio: string}>({name: '', bio: ''});
  const [profileDisplayData, setProfileDisplayData] = useState<ProfileDisplayData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSwitchingSubscription, setIsSwitchingSubscription] = useState(false);

  useEffect(() => {
    if (currentUser && currentUser.appProfile) {
      const currentAppProfile = currentUser.appProfile;
      const currentSubscription = subscriptionStatus !== 'loading' ? subscriptionStatus : (currentAppProfile?.subscriptionStatus || 'standard');

      const displayData: ProfileDisplayData = {
        name: currentAppProfile?.name || currentUser.displayName || currentUser.email?.split('@')[0] || "User",
        email: currentUser.email || "No email provided",
        avatarUrl: currentAppProfile?.avatarUrl || currentUser.photoURL || `https://placehold.co/128x128.png?text=${(currentAppProfile?.name || currentUser.displayName || currentUser.email || 'U').charAt(0)}`,
        bio: currentAppProfile?.bio || (currentUser.uid === 'mock-user-uid-12345' && currentAppProfile?.bio === '' ? "I am the main mock user." : currentAppProfile?.bio || "Welcome to my LandShare profile!"),
        memberSince: currentUser.metadata?.creationTime ? new Date(currentUser.metadata.creationTime) : new Date(),
        subscriptionTier: currentSubscription,
        walletBalance: currentAppProfile.walletBalance ?? 10000,
      };
      setProfileDisplayData(displayData);
      
      if (!isEditing) {
        setProfileFormData({
            name: displayData.name,
            bio: displayData.bio,
        });
      }
    } else if (!currentUser && !authLoading) { 
      setProfileDisplayData(null);
      setProfileFormData({name: '', bio: ''});
    }
  }, [currentUser, authLoading, subscriptionStatus, isEditing]);

  const handleSave = async () => {
    if (!currentUser || !profileDisplayData) {
      toast({ title: "Error", description: "You must be logged in to save.", variant: "destructive" });
      return;
    }
    setIsSaving(true);

    const updateData: Partial<Pick<AppUserType, 'name' | 'bio'>> = {};
    if (profileFormData.name !== profileDisplayData.name) updateData.name = profileFormData.name;
    if (profileFormData.bio !== profileDisplayData.bio) updateData.bio = profileFormData.bio;

    if (Object.keys(updateData).length > 0) {
        await updateCurrentAppUserProfile(updateData);
    } else {
        toast({ title: "No Changes", description: "No information was changed."});
    }

    setIsEditing(false);
    setIsSaving(false);
  };

  const handleCancelEdit = () => {
    if (profileDisplayData) {
      setProfileFormData({
          name: profileDisplayData.name,
          bio: profileDisplayData.bio
      });
    }
    setIsEditing(false);
  };

  const handleRefreshProfile = async () => {
    setIsSaving(true); 
    toast({ title: "Refreshing...", description: "Fetching latest profile information."});
    await refreshUserProfile();
    setIsSaving(false);
    toast({ title: "Profile Refreshed", description: "Latest data loaded."});
  }

  const handleChangePassword = async () => {
    if (!currentUser?.email) {
        toast({ title: "Error", description: "Email address not found.", variant: "destructive"});
        return;
    }
    if (isPrototypeMode && !currentUser.appProfile) {
        toast({ title: "Preview Mode", description: "This action is disabled in full preview mode.", variant: "default" });
        return;
    }
    try {
        await sendPasswordReset(currentUser.email);
    } catch (error: any) {
      // Error handled by AuthContext
    }
  }

  const handleSubscriptionToggle = async () => {
    if (!currentUser || !profileDisplayData || profileDisplayData.subscriptionTier === 'loading') {
        toast({ title: "Action Unavailable", description: "Subscription status is still loading.", variant: "default"});
        return;
    }

    const newStatus = profileDisplayData.subscriptionTier === 'premium' ? 'standard' : 'premium';
    
    // Check for listing limit before allowing a downgrade from this simple toggle
    if (newStatus === 'standard' && myListings.length > FREE_TIER_LISTING_LIMIT) {
        toast({
            title: "Listing Limit Exceeded",
            description: `You have ${myListings.length} listings. The Standard tier only allows ${FREE_TIER_LISTING_LIMIT}. Please manage your listings to proceed.`,
            variant: "default",
            action: <Button variant="link" size="sm" onClick={() => router.push('/downgrade')}>Manage Listings</Button>,
            duration: 8000,
        });
        return;
    }

    setIsSwitchingSubscription(true);
    try {
        await updateCurrentAppUserProfile({ subscriptionStatus: newStatus });
        toast({ title: 'Subscription Changed', description: `Your account is now on the ${newStatus} tier.`});
    } catch (error: any) {
        // Error is handled by updateCurrentAppUserProfile
    } finally {
        setIsSwitchingSubscription(false);
    }
  };


  if (authLoading || (currentUser && !profileDisplayData && subscriptionStatus === 'loading') ) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  if (isPrototypeMode && !currentUser && !authLoading) { 
     return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            Service Unavailable
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Profile features are temporarily unavailable due to a configuration issue.
          </p>
           <p className="text-xs text-muted-foreground mt-2">Please ensure Firebase is correctly configured in your .env.local file and the server has been restarted.</p>
        </CardContent>
      </Card>
    );
  }


  if (!currentUser || !profileDisplayData) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Profile Not Available</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Please <Link href={`/login?redirect=${encodeURIComponent("/profile")}`} className="underline text-primary hover:text-primary/80">log in</Link> to view your profile.
          </p>
        </CardContent>
      </Card>
    );
  }

  const avatarFallback = (profileDisplayData.name || profileDisplayData.email || 'U').split(' ').map(n=>n[0]).join('').toUpperCase() || 'U';
  const isMockUserNoProfile = isPrototypeMode && !currentUser.appProfile;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
        <Avatar className="h-24 w-24 border-2 border-primary">
          <AvatarImage src={profileDisplayData.avatarUrl} alt={profileDisplayData.name} data-ai-hint="person portrait" />
          <AvatarFallback>{avatarFallback}</AvatarFallback>
        </Avatar>
        <div className="text-center sm:text-left">
          <h1 className="text-3xl font-bold">{profileDisplayData.name}</h1>
          <p className="text-muted-foreground">{profileDisplayData.email}</p>
          <p className="text-sm text-muted-foreground">Member since {profileDisplayData.memberSince.toLocaleDateString()}</p>
          <p className="text-sm text-muted-foreground capitalize flex items-center gap-1.5">
            Current Plan: 
            <span className={cn(profileDisplayData.subscriptionTier === 'premium' ? "text-premium font-semibold" : "")}>
                {profileDisplayData.subscriptionTier === 'loading' ? 'Checking...' : (profileDisplayData.subscriptionTier === 'premium' ? 'Premium' : 'Standard')}
            </span>
            {profileDisplayData.subscriptionTier === 'premium' && <Crown className="h-4 w-4 text-premium"/>}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefreshProfile} className="ml-auto self-start sm:self-center" disabled={authLoading || isSaving || isSwitchingSubscription || isMockUserNoProfile}>
          {authLoading || isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : <><RefreshCw className="mr-2 h-4 w-4" /> Refresh Profile</>}
        </Button>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 mb-6">
          <TabsTrigger value="profile"> <User className="mr-2 h-4 w-4" /> Profile</TabsTrigger>
          <TabsTrigger value="security"> <Shield className="mr-2 h-4 w-4" /> Security</TabsTrigger>
          <TabsTrigger value="notifications"> <Bell className="mr-2 h-4 w-4" /> Notifications</TabsTrigger>
          <TabsTrigger value="billing"> <CreditCard className="mr-2 h-4 w-4" /> Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <div>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Manage your personal details and preferences.</CardDescription>
              </div>
              <Button variant={isEditing ? "default" : "outline"} size="sm" onClick={() => isEditing ? handleSave() : setIsEditing(true)} disabled={isSaving || authLoading || isSwitchingSubscription || isMockUserNoProfile}>
                {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : (isEditing ? <><Save className="mr-2 h-4 w-4" /> Save Changes</> : <><Edit3 className="mr-2 h-4 w-4" /> Edit Profile</>)}
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" value={profileFormData.name} onChange={(e) => setProfileFormData(prev => ({...prev, name: e.target.value}))} disabled={!isEditing || isSaving || isMockUserNoProfile} />
              </div>
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" value={profileDisplayData.email} disabled />
                 <p className="text-xs text-muted-foreground mt-1">Email address cannot be changed here. Contact support for assistance.</p>
              </div>
              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={profileFormData.bio}
                  onChange={(e) => setProfileFormData(prev => ({...prev, bio: e.target.value}))}
                  disabled={!isEditing || isSaving || isMockUserNoProfile}
                  rows={4}
                  placeholder="Tell us a bit about yourself or your land interests..."
                />
              </div>
               <div>
                <Label htmlFor="avatarUrl">Avatar URL (Optional)</Label>
                <Input id="avatarUrl" value={profileDisplayData.avatarUrl || ''} disabled />
                 <p className="text-xs text-muted-foreground mt-1">Avatar is typically set via your authentication provider or uses a placeholder. Custom avatar uploads are not yet implemented.</p>
              </div>
            </CardContent>
            {isEditing && (
              <CardFooter>
                <Button variant="ghost" onClick={handleCancelEdit} disabled={isSaving}>Cancel</Button>
              </CardFooter>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Manage your account security, like password and two-factor authentication.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                    <TooltipTrigger asChild>
                      <div> 
                        <Button variant="outline" onClick={handleChangePassword} disabled={authLoading || isMockUserNoProfile}>
                            <KeyRound className="mr-2 h-4 w-4" /> Change Password
                        </Button>
                      </div>
                    </TooltipTrigger>
                    {isMockUserNoProfile && <TooltipContent><p>Action disabled in preview mode.</p></TooltipContent>}
                </Tooltip>
              </TooltipProvider>

              <p className="text-sm text-muted-foreground">Two-factor authentication is currently disabled. 
                <TooltipProvider delayDuration={100}><Tooltip><TooltipTrigger asChild>
                  <Button variant="link" className="p-0 h-auto ml-1" onClick={() => toast({title: "Coming Soon!", description: "Two-factor authentication (2FA) setup is not yet implemented."})} disabled={isMockUserNoProfile}>Enable 2FA</Button>
                </TooltipTrigger><TooltipContent><p>Feature coming soon</p></TooltipContent></Tooltip></TooltipProvider>
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose how you want to be notified.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <TooltipProvider delayDuration={100}>
                <div className="flex items-center justify-between p-3 border rounded-md">
                  <Label htmlFor="email-notifications" className="cursor-pointer">Email Notifications for New Messages</Label>
                  <Tooltip><TooltipTrigger asChild>
                    <Switch id="email-notifications" defaultChecked onCheckedChange={(checked) => toast({title: "Notification Setting (Mock)", description: `New message emails ${checked ? 'enabled' : 'disabled'}. Full functionality coming soon.`})} disabled={isMockUserNoProfile} />
                  </TooltipTrigger><TooltipContent><p>This is a placeholder setting.</p></TooltipContent></Tooltip>
                </div>
                 <div className="flex items-center justify-between p-3 border rounded-md">
                  <Label htmlFor="promo-emails" className="cursor-pointer">Promotional Emails & Updates</Label>
                  <Tooltip><TooltipTrigger asChild>
                    <Switch id="promo-emails" onCheckedChange={(checked) => toast({title: "Notification Setting (Mock)", description: `Promotional emails ${checked ? 'enabled' : 'disabled'}. Full functionality coming soon.`})} disabled={isMockUserNoProfile}/>
                  </TooltipTrigger><TooltipContent><p>This is a placeholder setting.</p></TooltipContent></Tooltip>
                </div>
              </TooltipProvider>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle>Billing & Subscription</CardTitle>
              <CardDescription>Manage your payment methods, view billing history, and your subscription.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><Wallet className="h-5 w-5 text-primary" /> Current Wallet Balance</CardTitle>
                  <CardDescription>This is your simulated balance for testing transactions on the platform.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-primary">${profileDisplayData.walletBalance.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground mt-1">This balance will update as you make payments or receive payouts.</p>
                </CardContent>
              </Card>

              <div className="p-4 border rounded-lg bg-muted/30">
                <h3 className="text-md font-semibold mb-1 flex items-center gap-1.5">
                    Current Plan: 
                    <span className={cn("capitalize", profileDisplayData.subscriptionTier === 'premium' ? 'text-premium font-bold' : '')}>
                        {profileDisplayData.subscriptionTier === 'loading' ? 'Checking...' : (profileDisplayData.subscriptionTier === 'premium' ? 'Premium' : 'Standard')} Tier
                    </span>
                    {profileDisplayData.subscriptionTier === 'premium' && <Crown className="h-4 w-4 text-premium"/>}
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {profileDisplayData.subscriptionTier === 'premium' 
                    ? "You're enjoying all the benefits of Premium! Thank you for your support." 
                    : "Upgrade to Premium for unlimited listings, no renter fees, boosted listings, and lower service fees (0.49% vs 2%)."
                  }
                </p>
                <p className="text-xs text-muted-foreground">
                  (For developer testing, you can freely toggle your subscription status below.)
                </p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Developer Tools: Subscription Simulation</CardTitle>
                  <CardDescription>Instantly switch your account's subscription tier for testing purposes. Downgrading will simulate a refund.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button
                        onClick={handleSubscriptionToggle}
                        variant="outline"
                        disabled={isSwitchingSubscription || authLoading || profileDisplayData.subscriptionTier === 'loading' || isMockUserNoProfile}
                        className="w-full sm:w-auto"
                    >
                        {isSwitchingSubscription ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Repeat className="mr-2 h-4 w-4"/>}
                        Switch to {profileDisplayData.subscriptionTier === 'premium' ? 'Standard' : 'Premium'}
                    </Button>
                    {isMockUserNoProfile &&
                        <p className="text-xs text-destructive mt-2">Note: Full subscription simulation disabled in preview mode without a mock user.</p>
                    }
                </CardContent>
              </Card>
              
              <div>
                <h4 className="font-medium mb-2">Transaction History</h4>
                <p className="text-sm text-muted-foreground mb-3">View all your payments, payouts, and service fees in one place.</p>
                <Button asChild variant="outline" disabled={(isMockUserNoProfile)}>
                    <Link href="/transactions"><ReceiptText className="mr-2 h-4 w-4"/> View All Transactions</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
