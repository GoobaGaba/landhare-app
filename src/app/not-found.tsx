
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Home, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function NotFound() {
    const router = useRouter();

    return (
        <div className="flex min-h-[calc(100vh-var(--header-height,8rem)-var(--footer-height,4rem))] items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-muted/30">
            <Card className="w-full max-w-lg text-center shadow-lg">
                <CardHeader>
                    <CardTitle className="text-6xl font-bold text-primary">404</CardTitle>
                    <CardDescription className="text-xl text-muted-foreground mt-2">
                        Page Not Found
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="mb-6">
                        Oops! The page you are looking for does not exist. It might have been moved or deleted.
                    </p>
                    <div className="flex justify-center gap-4">
                        <Button variant="outline" onClick={() => router.back()}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
                        </Button>
                        <Button asChild>
                            <Link href="/">
                                <Home className="mr-2 h-4 w-4" /> Return Home
                            </Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
