
'use client';
import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Mail, Shield, Bell, CreditCard, Save, Edit3, KeyRound, Loader2 } from "lucide-react";
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';


interface ProfileData {
  name: string;
  email: string;
  avatarUrl?: string;
  bio: string;
  memberSince: Date;
}

export default function ProfilePage() {
  const { currentUser, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  
  // Form state for editing
  const [name, setName] = useState('');
  const [email, setEmail] = useState(''); // Email might not be editable usually
  const [bio, setBio] = useState('');

  useEffect(() => {
    if (currentUser) {
      const currentProfile: ProfileData = {
        name: currentUser.displayName || currentUser.email?.split('@')[0] || "User",
        email: currentUser.email || "No email provided",
        avatarUrl: currentUser.photoURL || `https://placehold.co/128x128.png?text=${(currentUser.displayName || currentUser.email || 'U').charAt(0)}`,
        bio: "Welcome to my LandShare profile! More details coming soon.", // Placeholder bio
        memberSince: currentUser.metadata?.creationTime ? new Date(currentUser.metadata.creationTime) : new Date(),
      };
      setProfileData(currentProfile);
      setName(currentProfile.name);
      setEmail(currentProfile.email);
      setBio(currentProfile.bio);
    } else {
      setProfileData(null);
    }
  }, [currentUser]);

  const handleSave = async () => {
    if (!currentUser) {
      toast({ title: "Error", description: "You must be logged in to save.", variant: "destructive" });
      return;
    }
    // In a real app, call an API to save changes (e.g., updateProfile in Firebase)
    console.log("Saving profile:", { name, bio }); 
    // Example: await updateProfile(currentUser, { displayName: name, photoURL: newAvatarUrl });
    // For now, we'll just update local state and mock
    setProfileData(prev => prev ? { ...prev, name, bio } : null);
    setIsEditing(false);
    toast({ title: "Profile Updated", description: "Your changes have been saved (mocked)." });
  };

  const handleCancelEdit = () => {
    if (profileData) {
      setName(profileData.name);
      setEmail(profileData.email);
      setBio(profileData.bio);
    }
    setIsEditing(false);
  };

  if (authLoading || !profileData && !authLoading && currentUser) {
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
           <Button asChild className="mt-4"><a href="/login">Log In</a></Button>
        </CardContent>
      </Card>
    );
  }
  
  const avatarFallback = profileData.name.split(' ').map(n=>n[0]).join('').toUpperCase() || profileData.email[0].toUpperCase();


  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center space-x-6">
        <Avatar className="h-24 w-24 border-2 border-primary">
          <AvatarImage src={profileData.avatarUrl} alt={profileData.name} />
          <AvatarFallback>{avatarFallback}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-3xl font-bold">{profileData.name}</h1>
          <p className="text-muted-foreground">{profileData.email}</p>
          <p className="text-sm text-muted-foreground">Member since {profileData.memberSince.toLocaleDateString()}</p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-4 mb-6">
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
              <Button variant="outline"><KeyRound className="mr-2 h-4 w-4" /> Change Password</Button>
              <p className="text-sm text-muted-foreground">Two-factor authentication is currently disabled. <Button variant="link" className="p-0 h-auto">Enable 2FA</Button></p>
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
                <Label htmlFor="email-notifications">Email Notifications for New Messages</Label>
                <Input type="checkbox" id="email-notifications" className="h-5 w-5" defaultChecked />
              </div>
               <div className="flex items-center justify-between p-3 border rounded-md">
                <Label htmlFor="promo-emails">Promotional Emails</Label>
                <Input type="checkbox" id="promo-emails" className="h-5 w-5" />
              </div>
              <Button><Save className="mr-2 h-4 w-4" /> Save Notification Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle>Billing Information</CardTitle>
              <CardDescription>Manage your payment methods and view billing history.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">Your current primary payment method: Visa **** **** **** 1234</p>
              <Button variant="outline">Update Payment Method</Button>
              <Button variant="outline">View Billing History</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
