'use client';
import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Mail, Shield, Bell, CreditCard, Save, Edit3, KeyRound } from "lucide-react";

// Mock user data
const mockUser = {
  id: "user123",
  name: "Gabriel Leunda",
  email: "gabe.leunda@landshare.com",
  avatarUrl: "https://placehold.co/128x128.png?text=GL",
  userType: "landowner",
  bio: "Passionate about sustainable living and connecting people with land. Happy to help you find your perfect spot!",
  memberSince: new Date("2023-01-15"),
};

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(mockUser.name);
  const [email, setEmail] = useState(mockUser.email);
  const [bio, setBio] = useState(mockUser.bio);

  const handleSave = () => {
    // In a real app, call an API to save changes
    console.log("Saving profile:", { name, email, bio });
    setIsEditing(false);
    // Update mockUser or refetch
    mockUser.name = name;
    mockUser.email = email;
    mockUser.bio = bio;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center space-x-6">
        <Avatar className="h-24 w-24 border-2 border-primary">
          <AvatarImage src={mockUser.avatarUrl} alt={mockUser.name} />
          <AvatarFallback>{mockUser.name.split(' ').map(n=>n[0]).join('')}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-3xl font-bold">{mockUser.name}</h1>
          <p className="text-muted-foreground">{mockUser.email}</p>
          <p className="text-sm text-muted-foreground">Member since {mockUser.memberSince.toLocaleDateString()}</p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-5 mb-6">
          <TabsTrigger value="profile"> <User className="mr-2 h-4 w-4" /> Profile</TabsTrigger>
          <TabsTrigger value="security"> <Shield className="mr-2 h-4 w-4" /> Security</TabsTrigger>
          <TabsTrigger value="notifications"> <Bell className="mr-2 h-4 w-4" /> Notifications</TabsTrigger>
          <TabsTrigger value="billing"> <CreditCard className="mr-2 h-4 w-4" /> Billing</TabsTrigger>
          {/* Add more tabs as needed */}
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
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!isEditing} />
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
              <div>
                <Label>User Type</Label>
                <Input value={mockUser.userType.charAt(0).toUpperCase() + mockUser.userType.slice(1)} disabled className="capitalize" />
              </div>
            </CardContent>
            {isEditing && (
              <CardFooter>
                <Button variant="ghost" onClick={() => { setIsEditing(false); setName(mockUser.name); setEmail(mockUser.email); setBio(mockUser.bio); }}>Cancel</Button>
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
