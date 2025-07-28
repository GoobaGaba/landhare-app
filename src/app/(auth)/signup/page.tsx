'use client';

import { Suspense } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';

const SignupForm = dynamic(() => import('@/components/auth/signup-form').then(mod => mod.SignupForm), {
    ssr: false,
    loading: () => <LoadingFallback />,
});

function LoadingFallback() {
    return (
        <Card className="w-full max-w-sm shadow-xl">
            <CardHeader className="space-y-1 text-center">
                <CardTitle className="text-2xl font-headline">Create an Account</CardTitle>
                <CardDescription>Join LandHare to find or list land.</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center items-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </CardContent>
        </Card>
    );
}

export default function SignupPage() {
    return (
        <Suspense fallback={<LoadingFallback />}>
            <SignupForm />
        </Suspense>
    );
}
