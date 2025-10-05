
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { useState } from 'react';
import { AlertCircle, Loader2, Mail, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { isPrototypeMode } from '@/lib/firebase';

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
  const { toast } = useToast();
  const { sendPasswordReset, loading: authLoading } = useAuth();
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    if (isPrototypeMode) {
        setError("This feature is not available in prototype mode as there are no real user accounts to reset.");
        return;
    }

    setIsFormLoading(true);
    setError(null);
    setIsSuccess(false);
    try {
      await sendPasswordReset(data.email);
      setIsSuccess(true);
    } catch (err: any) {
      let errorMessage = "An unexpected error occurred. Please try again.";
      if (err.code) { // Firebase specific errors
        switch (err.code) {
          case 'auth/user-not-found':
            errorMessage = 'No user found with this email address.';
            break;
          case 'auth/invalid-email':
            errorMessage = 'The email address is not valid.';
            break;
          default:
            errorMessage = "Request Failed: " + err.code;
        }
      }
      setError(errorMessage);
    } finally {
      setIsFormLoading(false);
    }
  };

  const isLoading = authLoading || isFormLoading;

  return (
    <Card className="w-full max-w-sm shadow-xl">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-headline">Forgot Password</CardTitle>
        <CardDescription>Enter your email to receive a reset link.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

        {isSuccess ? (
            <Alert variant="default" className="border-primary/50 bg-primary/10 text-primary-foreground">
                <Mail className="h-4 w-4 text-primary" />
                <AlertTitle className="text-primary font-semibold">Check Your Email</AlertTitle>
                <AlertDescription className="text-primary/90">
                    A password reset link has been sent to your email address. Please follow the instructions to reset your password.
                </AlertDescription>
            </Alert>
        ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" {...register('email')} disabled={isLoading}/>
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                Send Reset Link
            </Button>
            </form>
        )}
      </CardContent>
      <CardFooter className="flex flex-col items-center space-y-2 text-sm">
        <Button variant="link" asChild className="p-0 h-auto">
            <Link href="/login"><ArrowLeft className="mr-2 h-4 w-4"/> Back to Log In</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
