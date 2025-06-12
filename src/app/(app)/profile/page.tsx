
'use client';
import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Mail, Shield, Bell, CreditCard, Save, Edit3, KeyRound, Loader2, Crown, RefreshCw, AlertTriangle, Repeat } from "lucide-react";
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import type { SubscriptionStatus, User as AppUserType } from '@/lib/types';
import { Textarea } from '@/components/ui/textarea';
import { firebaseInitializationError } from '@/lib/firebase';
import { Switch } from "@/components/ui/switch";


interface ProfileDisplayData {
  name: string;
  email: string;
  avatarUrl?: string;
  bio: string;
  memberSince: Date;
  subscriptionTier: SubscriptionStatus;
}

export default function ProfilePage() {
  const { currentUser, loading: authLoading, subscriptionStatus, refreshUserProfile, updateCurrentAppUserProfile, sendPasswordReset } = useAuth();
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [profileDisplayData, setProfileDisplayData] = useState<ProfileDisplayData | null>(null);

  const [nameInput, setNameInput] = useState('');
  const [emailDisplay, setEmailDisplay] = useState('');
  const [bioInput, setBioInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSwitchingSubscription, setIsSwitchingSubscription] = useState(false);


  useEffect(() => {
    if (currentUser) {
      const currentAppProfile = currentUser.appProfile;
      // Use subscriptionStatus from AuthContext as the primary source of truth
      const currentSubscription = subscriptionStatus !== 'loading' ? subscriptionStatus : (currentAppProfile?.subscriptionStatus || 'free');

      const currentProfile: ProfileDisplayData = {
        name: currentAppProfile?.name || currentUser.displayName || currentUser.email?.split('@')[0] || "User",
        email: currentUser.email || "No email provided",
        avatarUrl: currentAppProfile?.avatarUrl || currentUser.photoURL || `https://placehold.co/128x128.png?text=${(currentAppProfile?.name || currentUser.displayName || currentUser.email || 'U').charAt(0)}`,
        bio: currentAppProfile?.bio || (currentUser.uid === 'mock-user-uid-12345' ? "I am the main mock user." : "Welcome to my LandShare profile!"),
        memberSince: currentUser.metadata?.creationTime ? new Date(currentUser.metadata.creationTime) : new Date(),
        subscriptionTier: currentSubscription,
      };
      setProfileDisplayData(currentProfile);
      setNameInput(currentProfile.name);
      setEmailDisplay(currentProfile.email);
      setBioInput(currentProfile.bio);
    } else {
      setProfileDisplayData(null);
    }
  }, [currentUser, authLoading, subscriptionStatus]); // Depend on subscriptionStatus from AuthContext

  const handleSave = async () => {
    if (!currentUser || !profileDisplayData) {
      toast({ title: "Error", description: "You must be logged in to save.", variant: "destructive" });
      return;
    }
    setIsSaving(true);

    const updateData: Partial<Pick<AppUserType, 'name' | 'bio'>> = {};
    if (nameInput !== profileDisplayData.name) updateData.name = nameInput;
    if (bioInput !== profileDisplayData.bio) updateData.bio = bioInput;

    if (Object.keys(updateData).length > 0) {
        const updatedUser = await updateCurrentAppUserProfile(updateData);
        if (updatedUser && updatedUser.appProfile) {
            // ProfileDisplayData will update via useEffect listening to currentUser & subscriptionStatus
        }
    } else {
        toast({ title: "No Changes", description: "No information was changed."});
    }

    setIsEditing(false);
    setIsSaving(false);
  };

  const handleCancelEdit = () => {
    if (profileDisplayData) {
      setNameInput(profileDisplayData.name);
      setBioInput(profileDisplayData.bio);
    }
    setIsEditing(false);
  };

  const handleRefreshProfile = async () => {
    toast({ title: "Refreshing...", description: "Fetching latest profile information."});
    await refreshUserProfile();
    toast({ title: "Profile Refreshed", description: "Latest data loaded."});
  }

  const handleChangePassword = async () => {
    if (!currentUser?.email) {
        toast({ title: "Error", description: "Email address not found.", variant: "destructive"});
        return;
    }
    try {
        await sendPasswordReset(currentUser.email);
    } catch (error: any) {
        toast({ title: "Password Reset Failed", description: error.message || "Could not send password reset email.", variant: "destructive"});
    }
  }

  const handleSubscriptionToggle = async () => {
    if (!currentUser || !profileDisplayData) return;
    setIsSwitchingSubscription(true);
    const newStatus = profileDisplayData.subscriptionTier === 'premium' ? 'free' : 'premium';
    try {
      const updatedUser = await updateCurrentAppUserProfile({ subscriptionStatus: newStatus });
      if (updatedUser && updatedUser.appProfile) {
        // The subscriptionStatus state in AuthContext will be updated by its own effect listener.
        // The profileDisplayData state here will also update via its own useEffect.
        toast({ title: "Subscription Updated (Simulation)", description: `Your account is now simulated as ${newStatus}.` });
      } else {
        throw new Error("Failed to update subscription status in simulation.");
      }
    } catch (error: any) {
      toast({ title: "Subscription Switch Failed", description: error.message, variant: "destructive" });
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

  if (firebaseInitializationError && !currentUser) {
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
            Profile features are temporarily unavailable due to a configuration issue: <span className="font-semibold text-destructive">{firebaseInitializationError}</span>
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
            Please <Link href="/login" className="underline text-primary hover:text-primary/80">log in</Link> to view your profile.
          </p>
        </CardContent>
      </Card>
    );
  }

  const avatarFallback = (profileDisplayData.name || profileDisplayData.email || 'U').split(' ').map(n=>n[0]).join('').toUpperCase() || 'U';

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
          <p className="text-sm text-muted-foreground capitalize">Current Plan: <span className={profileDisplayData.subscriptionTier === 'premium' ? "text-primary font-semibold" : ""}>{profileDisplayData.subscriptionTier}</span></p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefreshProfile} className="ml-auto self-start sm:self-center" disabled={authLoading || isSaving || isSwitchingSubscription}>
          {authLoading || isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <RefreshCw className="mr-2 h-4 w-4"/>} Refresh Profile
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
              <Button variant={isEditing ? "default" : "outline"} size="sm" onClick={() => isEditing ? handleSave() : setIsEditing(true)} disabled={isSaving || authLoading || isSwitchingSubscription}>
                {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : (isEditing ? <><Save className="mr-2 h-4 w-4" /> Save Changes</> : <><Edit3 className="mr-2 h-4 w-4" /> Edit Profile</>)}
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" value={nameInput} onChange={(e) => setNameInput(e.target.value)} disabled={!isEditing || isSaving} />
              </div>
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" value={emailDisplay} disabled />
                 <p className="text-xs text-muted-foreground mt-1">Email address cannot be changed here. Contact support for assistance.</p>
              </div>
              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={bioInput}
                  onChange={(e) => setBioInput(e.target.value)}
                  disabled={!isEditing || isSaving}
                  rows={4}
                  placeholder="Tell us a bit about yourself or your land interests..."
                />
              </div>
               <div>
                <Label htmlFor="avatarUrl">Avatar URL (Optional)</Label>
                <Input id="avatarUrl" value={profileDisplayData.avatarUrl || ''} disabled />
                 <p className="text-xs text-muted-foreground mt-1">Avatar is typically set via your authentication provider (e.g., Google profile picture) or uses a placeholder. Custom avatar uploads (via URL or file) are not yet implemented.</p>
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
              <Button variant="outline" onClick={handleChangePassword} disabled={authLoading || !!firebaseInitializationError}>
                <KeyRound className="mr-2 h-4 w-4" /> Change Password
              </Button>
              <p className="text-sm text-muted-foreground">Two-factor authentication is currently disabled. <Button variant="link" className="p-0 h-auto" onClick={() => toast({title: "Coming Soon!", description: "Two-factor authentication (2FA) setup is not yet implemented."})}>Enable 2FA</Button></p>
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
              <div className="flex items-center justify-between p-3 border rounded-md">
                <Label htmlFor="email-notifications" className="cursor-pointer">Email Notifications for New Messages</Label>
                <Switch id="email-notifications" defaultChecked onCheckedChange={(checked) => toast({title: "Notification Setting (Mock)", description: `New message emails ${checked ? 'enabled' : 'disabled'}. Full functionality coming soon.`})} />
              </div>
               <div className="flex items-center justify-between p-3 border rounded-md">
                <Label htmlFor="promo-emails" className="cursor-pointer">Promotional Emails & Updates</Label>
                <Switch id="promo-emails" onCheckedChange={(checked) => toast({title: "Notification Setting (Mock)", description: `Promotional emails ${checked ? 'enabled' : 'disabled'}. Full functionality coming soon.`})} />
              </div>
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
              <div className="p-4 border rounded-lg bg-muted/30">
                <h3 className="text-md font-semibold mb-1">Current Plan: <span className={`capitalize ${profileDisplayData.subscriptionTier === 'premium' ? 'text-primary font-bold' : ''}`}>{profileDisplayData.subscriptionTier} Tier</span></h3>
                {profileDisplayData.subscriptionTier === 'free' ? (
                  <>
                    <p className="text-sm text-muted-foreground mb-3">Upgrade to Premium for unlimited listings, no contract fees, boosted exposure, market insights, and lower closing fees (0.99% vs 3%).</p>
                    <Button asChild disabled={!!firebaseInitializationError}>
                      <Link href="/pricing"><Crown className="mr-2 h-4 w-4" /> Upgrade to Premium</Link>
                    </Button>
                  </>
                ) : (
                  <>
                  <p className="text-sm text-muted-foreground mb-3">You're enjoying all the benefits of Premium! Thank you for your support.</p>
                  <Button variant="outline" onClick={() => toast({title: "Coming Soon!", description: "Stripe Customer Portal integration for managing your subscription is not yet implemented."})} disabled={!!firebaseInitializationError}>
                    Manage Subscription
                  </Button>
                  </>
                )}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Simulate Subscription Tier</CardTitle>
                  <CardDescription>For testing purposes, you can switch your account's simulated subscription status. This will affect UI elements like fees and feature access across the app.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button
                        onClick={handleSubscriptionToggle}
                        variant="outline"
                        disabled={isSwitchingSubscription || authLoading || (firebaseInitializationError !== null && !currentUser?.appProfile)}
                        className="w-full sm:w-auto"
                    >
                        {isSwitchingSubscription ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Repeat className="mr-2 h-4 w-4"/>}
                        Switch to {profileDisplayData.subscriptionTier === 'premium' ? 'Free' : 'Premium'}
                    </Button>
                    {firebaseInitializationError && !currentUser?.appProfile &&
                        <p className="text-xs text-destructive mt-2">Note: Full subscription simulation disabled in Firebase preview mode without a mock user.</p>
                    }
                     <p className="text-xs text-muted-foreground mt-2">
                        This simulation affects UI elements like displayed fees and listing limits for testing. It does not involve real payments. A page refresh might be needed to see changes on other pages.
                    </p>
                </CardContent>
              </Card>

              <div>
                <h4 className="font-medium mb-2">Payment Methods</h4>
                <p className="text-sm text-muted-foreground">Your payment methods are managed securely via Stripe. (Placeholder)</p>
                <div className="mt-3 flex gap-2">
                    <Button variant="outline" onClick={() => toast({title: "Coming Soon!", description: "Stripe integration for updating payment methods is not yet implemented."})} disabled={!!firebaseInitializationError}>Update Payment Method</Button>
                    <Button variant="outline" onClick={() => toast({title: "Coming Soon!", description: "Stripe integration for viewing billing history is not yet implemented."})} disabled={!!firebaseInitializationError}>View Billing History</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
