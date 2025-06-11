
'use client';
import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Mail, Shield, Bell, CreditCard, Save, Edit3, KeyRound, Loader2, Crown, RefreshCw } from "lucide-react";
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import type { SubscriptionStatus } from '@/lib/types';


interface ProfileData {
  name: string;
  email: string;
  avatarUrl?: string;
  bio: string;
  memberSince: Date;
  subscriptionTier: SubscriptionStatus; 
}

export default function ProfilePage() {
  const { currentUser, loading: authLoading, subscriptionStatus, refreshUserProfile } = useAuth();
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState(''); 
  const [bio, setBio] = useState('');

  useEffect(() => {
    if (currentUser) {
      const currentProfile: ProfileData = {
        name: currentUser.displayName || currentUser.email?.split('@')[0] || "User",
        email: currentUser.email || "No email provided",
        avatarUrl: currentUser.photoURL || `https://placehold.co/128x128.png?text=${(currentUser.displayName || currentUser.email || 'U').charAt(0)}`,
        bio: currentUser.appProfile?.bio || "Welcome to my LandShare profile! More details coming soon.", 
        memberSince: currentUser.metadata?.creationTime ? new Date(currentUser.metadata.creationTime) : new Date(),
        subscriptionTier: subscriptionStatus !== 'loading' ? subscriptionStatus : (currentUser.appProfile?.subscriptionStatus || 'free'),
      };
      setProfileData(currentProfile);
      setName(currentProfile.name);
      setEmail(currentProfile.email);
      setBio(currentProfile.bio);
    } else {
      setProfileData(null);
    }
  }, [currentUser, subscriptionStatus]);

  const handleSave = async () => {
    if (!currentUser) {
      toast({ title: "Error", description: "You must be logged in to save.", variant: "destructive" });
      return;
    }
    // In a real app, this would call an action to update profile in Firestore
    // For example: await updateUserProfile(currentUser.uid, { name, bio });
    console.log("Saving profile:", { name, bio }); 
    
    // Optimistically update local state
    setProfileData(prev => prev ? { ...prev, name, bio } : null);
    setIsEditing(false);
    toast({ title: "Profile Updated", description: "Your changes have been saved (mocked)." });
    // Potentially call refreshUserProfile() if backend updates Firebase Auth profile
  };

  const handleCancelEdit = () => {
    if (profileData) {
      setName(profileData.name);
      setEmail(profileData.email);
      setBio(profileData.bio);
    }
    setIsEditing(false);
  };
  
  const handleRefreshProfile = async () => {
    toast({ title: "Refreshing...", description: "Fetching latest profile information."});
    await refreshUserProfile();
    toast({ title: "Profile Refreshed", description: "Latest data loaded."});
  }


  if (authLoading || (!profileData && !authLoading && currentUser) || subscriptionStatus === 'loading') {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  if (!currentUser || !profileData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profile Not Available</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Please log in to view your profile.
          </p>
           <Button asChild className="mt-4"><Link href="/login">Log In</Link></Button>
        </CardContent>
      </Card>
    );
  }
  
  const avatarFallback = profileData.name.split(' ').map(n=>n[0]).join('').toUpperCase() || profileData.email[0].toUpperCase();


  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
        <Avatar className="h-24 w-24 border-2 border-primary">
          <AvatarImage src={profileData.avatarUrl} alt={profileData.name} />
          <AvatarFallback>{avatarFallback}</AvatarFallback>
        </Avatar>
        <div className="text-center sm:text-left">
          <h1 className="text-3xl font-bold">{profileData.name}</h1>
          <p className="text-muted-foreground">{profileData.email}</p>
          <p className="text-sm text-muted-foreground">Member since {profileData.memberSince.toLocaleDateString()}</p>
          <p className="text-sm text-muted-foreground capitalize">Current Plan: <span className={profileData.subscriptionTier === 'premium' ? "text-primary font-semibold" : ""}>{profileData.subscriptionTier}</span></p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefreshProfile} className="ml-auto">
          <RefreshCw className="mr-2 h-4 w-4"/> Refresh Profile
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
              <Button variant={isEditing ? "default" : "outline"} size="sm" onClick={() => isEditing ? handleSave() : setIsEditing(true)}>
                {isEditing ? <><Save className="mr-2 h-4 w-4" /> Save Changes</> : <><Edit3 className="mr-2 h-4 w-4" /> Edit Profile</>}
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} disabled={!isEditing} />
              </div>
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" value={email} disabled />
                 <p className="text-xs text-muted-foreground mt-1">Email address cannot be changed here. Contact support for assistance.</p>
              </div>
              <div>
                <Label htmlFor="bio">Bio</Label>
                <textarea 
                  id="bio" 
                  value={bio} 
                  onChange={(e) => setBio(e.target.value)} 
                  disabled={!isEditing}
                  rows={4}
                  placeholder="Tell us a bit about yourself or your land interests..."
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </CardContent>
            {isEditing && (
              <CardFooter>
                <Button variant="ghost" onClick={handleCancelEdit}>Cancel</Button>
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
              <Button variant="outline" onClick={() => toast({ title: "Password Change", description: "Password change flow not implemented yet."})}><KeyRound className="mr-2 h-4 w-4" /> Change Password</Button>
              <p className="text-sm text-muted-foreground">Two-factor authentication is currently disabled. <Button variant="link" className="p-0 h-auto" onClick={() => toast({title: "2FA", description: "2FA setup not implemented."})}>Enable 2FA</Button></p>
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
                <Input type="checkbox" id="email-notifications" className="h-5 w-5 cursor-pointer" defaultChecked />
              </div>
               <div className="flex items-center justify-between p-3 border rounded-md">
                <Label htmlFor="promo-emails" className="cursor-pointer">Promotional Emails & Updates</Label>
                <Input type="checkbox" id="promo-emails" className="h-5 w-5 cursor-pointer" />
              </div>
              <Button onClick={() => toast({title: "Settings Saved", description:"Notification preferences updated (mocked)."}) }><Save className="mr-2 h-4 w-4" /> Save Notification Settings</Button>
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
                <h3 className="text-md font-semibold mb-1">Current Plan: <span className={`capitalize ${profileData.subscriptionTier === 'premium' ? 'text-primary font-bold' : ''}`}>{profileData.subscriptionTier} Tier</span></h3>
                {profileData.subscriptionTier === 'free' ? (
                  <>
                    <p className="text-sm text-muted-foreground mb-3">Upgrade to Premium for unlimited listings, no contract fees, boosted exposure, market insights, and lower closing fees (0.99% vs 3%).</p>
                    <Button asChild>
                      {/* This button would ideally initiate a Stripe Checkout session */}
                      <Link href="/pricing"><Crown className="mr-2 h-4 w-4" /> Upgrade to Premium</Link>
                    </Button>
                  </>
                ) : (
                  <>
                  <p className="text-sm text-muted-foreground mb-3">You're enjoying all the benefits of Premium! Thank you for your support.</p>
                   {/* This button would ideally link to your Stripe Customer Portal */}
                  <Button variant="outline" onClick={() => toast({title: "Manage Subscription", description: "Stripe Customer Portal integration needed."})}>
                    Manage Subscription
                  </Button>
                  </>
                )}
              </div>
              <div>
                <h4 className="font-medium mb-2">Payment Methods</h4>
                {/* Payment methods would be managed via Stripe Elements or Customer Portal */}
                <p className="text-sm text-muted-foreground">Your payment methods are managed securely via Stripe. (Placeholder)</p>
                <div className="mt-3 flex gap-2">
                    <Button variant="outline" onClick={() => toast({title: "Payment Methods", description: "Stripe integration needed."})}>Update Payment Method</Button>
                    <Button variant="outline" onClick={() => toast({title: "Billing History", description: "Stripe integration needed."})}>View Billing History</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
