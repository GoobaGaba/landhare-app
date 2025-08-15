'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail, MessageSquare, HelpCircle } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

export default function ContactPage() {
  const { toast } = useToast();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // In a real app, this would send data.
    // For now, clear the form and show a toast.
    const form = event.currentTarget;
    form.reset();

    toast({
      title: "Message Sent (Mock)",
      description: "Thank you for reaching out! In a real application, your message would be processed.",
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <header className="text-center mb-12 md:mb-16">
        <MessageSquare className="h-16 w-16 text-primary mx-auto mb-4" />
        <h1 className="text-4xl md:text-5xl font-headline text-primary mb-3">Get In Touch</h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          We're here to help! Whether you have questions about our platform, need support, or just want to say hello, feel free to reach out.
        </p>
      </header>

      <div className="grid md:grid-cols-2 gap-8 md:gap-12 max-w-4xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Mail className="h-6 w-6 text-accent" /> Send Us a Message
            </CardTitle>
            <CardDescription>
              Fill out the form below and we'll get back to you as soon as possible.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" type="text" placeholder="John Doe" required />
              </div>
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" placeholder="you@example.com" required />
              </div>
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" type="text" placeholder="Question about listings" required />
              </div>
              <div>
                <Label htmlFor="message">Message</Label>
                <Textarea id="message" placeholder="Your message here..." rows={5} required />
              </div>
              <Button type="submit" className="w-full">Send Message</Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-8">
           <Card className="shadow-md">
            <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                    <Mail className="h-5 w-5 text-accent"/> Direct Email
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">
                    For direct inquiries, you can also email us at:
                </p>
                <a href="mailto:support@landhare.example.com" className="text-primary hover:underline font-medium">
                    support@landhare.example.com
                </a>
                <p className="text-xs text-muted-foreground mt-1">(Please allow 1-2 business days for a response)</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
