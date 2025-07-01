import Image from 'next/image';
import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  // This component now uses the Next.js Image component to display the user's logo.
  // It expects a file named 'logo.png' to be present in the '/public' directory.
  return (
    <div className={cn("relative", className)}>
      <Image
        src="/logo.png" // The leading '/' points to the 'public' directory.
        alt="LandHare Logo"
        fill
        className="object-contain" // 'contain' ensures the logo's aspect ratio is preserved without cropping.
        priority // Tells Next.js to load the logo early as it's a critical visual element.
      />
    </div>
  );
}
