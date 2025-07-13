
'use client';
import type { ReactNode } from 'react';

// This layout ensures all pages within the (app) group are rendered as Client Components.
export default function AppPagesLayout({ children }: { children: ReactNode }) {
  // In a real app, this layout might include a sidebar, user-specific navigation,
  // or authentication checks. For now, it just renders children.
  // The main header and footer are handled by the root layout.
  return (
    <div className="container mx-auto px-4 py-8">
      {children}
    </div>
  );
}
