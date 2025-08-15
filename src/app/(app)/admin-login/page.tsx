'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { AlertCircle, ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const adminLoginSchema = z.object({
  pin: z.string().min(4, { message: 'PIN must be at least 4 digits.' }),
});

type AdminLoginFormValues = z.infer<typeof adminLoginSchema>;

const ADMIN_EMAIL = 'Gabrielleunda@gmail.com'; 
const ADMIN_PASSWORD = 'defaultAdminPassword123';
const CORRECT_PIN = '6969';

export default function AdminLoginPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { signInWithEmailPassword, loading: authLoading } = useAuth();
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<AdminLoginFormValues>({
    resolver: zodResolver(adminLoginSchema),
  });

  const onSubmit = async (data: AdminLoginFormValues) => {
    setIsFormLoading(true);
    setError(null);

    if (data.pin !== CORRECT_PIN) {
      setError('Invalid PIN.');
      setIsFormLoading(false);
      return;
    }

    try {
      await signInWithEmailPassword({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
      toast({
        title: 'Admin Login Successful',
        description: "Welcome, Admin! You're being redirected.",
      });
      router.push('/admin');
    } catch (err: any) {
      let errorMessage = "An unexpected error occurred. Please try again.";
      if (err.code) {
        switch (err.code) {
          case 'auth/user-not-found':
          case 'auth/invalid-credential':
             errorMessage = 'Default admin account not found. Please ensure "Gabrielleunda@gmail.com" is created.';
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

  const isLoading = authLoading || isFormLoading;

  return (
    <Card className="w-full max-w-sm shadow-xl">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-headline">Admin Access</CardTitle>
        <CardDescription>Enter the PIN to log into the admin account.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Login Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pin">Security PIN</Label>
            <Input id="pin" type="password" {...register('pin')} disabled={isLoading} />
            {errors.pin && <p className="text-sm text-destructive">{errors.pin.message}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
            Log In as Admin
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col items-center space-y-2 text-sm">
        <Button variant="link" asChild className="p-0 h-auto">
            <Link href="/login"><ArrowLeft className="mr-2 h-4 w-4"/> Back to User Log In</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
