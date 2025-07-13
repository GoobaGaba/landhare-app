
'use client';
import type { ReactNode } from 'react';

// This layout ensures all pages within the (auth) group are rendered as Client Components.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-var(--header-height,8rem)-var(--footer-height,4rem))] items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-muted/30">
      <div className="w-full max-w-md space-y-8">
        {children}
      </div>
    </div>
  );
}
