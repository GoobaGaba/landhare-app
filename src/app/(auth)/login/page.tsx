'use client';

import { Suspense } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';

const LoginForm = dynamic(() => import('@/components/auth/login-form').then(mod => mod.LoginForm), {
    ssr: false,
    loading: () => <LoadingFallback />,
});

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
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<LoadingFallback />}>
            <LoginForm />
        </Suspense>
    );
}
