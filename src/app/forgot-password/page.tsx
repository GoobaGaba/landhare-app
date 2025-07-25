
'use client';

import { Suspense } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';

const ForgotPasswordForm = dynamic(() => import('@/components/auth/forgot-password-form').then(mod => mod.ForgotPasswordForm), {
    ssr: false,
    loading: () => <LoadingFallback />,
});

function LoadingFallback() {
    return (
        <Card className="w-full max-w-sm shadow-xl">
            <CardHeader className="space-y-1 text-center">
                <CardTitle className="text-2xl font-headline">Forgot Password</CardTitle>
                <CardDescription>Loading form...</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center items-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </CardContent>
        </Card>
    );
}

export default function ForgotPasswordPage() {
    return (
        <Suspense fallback={<LoadingFallback />}>
            <ForgotPasswordForm />
        </Suspense>
    );
}
