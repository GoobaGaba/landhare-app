import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  // This version uses a standard <img> tag to bypass Next.js image optimization,
  // which seems to be the source of the issue. It directly requests the file
  // from the /public directory.
  return (
    <img
      src="/logo.png" // The leading '/' points to the 'public' directory.
      alt="LandHare Logo"
      className={cn("object-contain", className)} // The className from header/footer will apply sizing
    />
  );
}
