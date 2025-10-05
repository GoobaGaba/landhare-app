'use client';

import { Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { useState } from 'react';
import { AlertCircle, Loader2, Mail } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 48 48" {...props}>
            <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"></path>
            <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"></path>
            <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.223 0-9.641-3.219-11.303-8H2.394v8h.011C5.47 41.1 13.987 44 24 44z"></path>
            <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.021 35.846 44 30.138 44 24c0-1.341-.138-2.65-.389-3.917z"></path>
        </svg>
    )
}

function LoginForm() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/dashboard';
  const { signInWithEmailPassword, signInWithGoogle, loading: authLoading } = useAuth();
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onEmailSubmit = async (data: LoginFormValues) => {
    setIsFormLoading(true);
    setError(null);
    try {
      await signInWithEmailPassword(data);
      toast({
        title: 'Login Successful',
        description: "Welcome back! You're being redirected.",
      });
      router.push(redirectPath);
    } catch (err: any) {
      let errorMessage = "An unexpected error occurred. Please try again.";
      if (err.code) { // Firebase specific errors
        switch (err.code) {
          case 'auth/user-not-found':
          case 'auth/wrong-password':
          case 'auth/invalid-credential':
            errorMessage = 'Invalid email or password.';
            break;
          case 'auth/invalid-email':
            errorMessage = 'The email address is not valid.';
            break;
          default:
            errorMessage = "Login Failed: " + err.code;
        }
      }
      setError(errorMessage);
    } finally {
      setIsFormLoading(false);
    }
  };

  const onGoogleSubmit = async () => {
    setIsFormLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      toast({
        title: 'Login Successful',
        description: "Welcome! You're being redirected.",
      });
      router.push(redirectPath);
    } catch (err) {
      // Error is handled in the auth context, but we can clear loading state
    } finally {
      setIsFormLoading(false);
    }
  }

  const isLoading = authLoading || isFormLoading;

  return (
    <Card className="w-full max-w-sm shadow-xl">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-headline">Welcome Back!</CardTitle>
        <CardDescription>Log in to manage your land and bookings.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Login Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

        <Button variant="outline" className="w-full" onClick={onGoogleSubmit} disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon className="mr-2 h-5 w-5" />}
          Continue with Google
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onEmailSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@example.com" {...register('email')} disabled={isLoading}/>
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" placeholder="••••••••" {...register('password')} disabled={isLoading}/>
            {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
            Log In with Email
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col items-center space-y-2 text-sm">
        <p>
          Don&apos;t have an account?{' '}
          <Button variant="link" asChild className="p-0 h-auto">
            <Link href="/signup">Sign up</Link>
          </Button>
        </p>
         <Button variant="link" asChild className="p-0 h-auto text-xs">
            <Link href="/forgot-password">Forgot Password?</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

function LoadingFallback() {
    return (
        <Card className="w-full max-w-sm shadow-xl">
            <CardHeader className="space-y-1 text-center">
                <CardTitle className="text-2xl font-headline">Welcome Back!</CardTitle>
                <CardDescription>Log in to manage your land and bookings.</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center items-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </CardContent>
        </Card>
    )
}

// This is the main page component that now correctly uses Suspense
export default function LoginPage() {
    return (
        <Suspense fallback={<LoadingFallback />}>
            <LoginForm />
        </Suspense>
    )
}
