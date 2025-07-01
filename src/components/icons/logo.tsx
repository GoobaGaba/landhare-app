import Image from 'next/image';
import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  // This version uses explicit width and height, which is the most reliable
  // way to display a logo of a known aspect ratio. The className, which
  // contains Tailwind's h- and w- utilities, will then resize the rendered image.
  // This avoids the complexities of the 'fill' and 'sizes' props that were causing issues.
  return (
    <Image
      src="/logo.png" // The leading '/' points to the 'public' directory.
      alt="LandHare Logo"
      width={40} // Sets the base aspect ratio
      height={40} // Sets the base aspect ratio
      className={cn("object-contain", className)} // The className from header/footer will apply sizing
      priority // Ensures the logo loads quickly
    />
  );
}
