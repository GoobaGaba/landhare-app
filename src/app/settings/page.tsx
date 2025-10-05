
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// This page now acts as a redirect to the main profile page
// for a cleaner user experience.
export default function SettingsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/profile');
  }, [router]);

  return (
    <div className="flex flex-col justify-center items-center min-h-[300px] text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <h1 className="text-xl font-semibold">Redirecting to Profile...</h1>
        <p className="text-muted-foreground">Please wait a moment.</p>
    </div>
  );
}

    