import Image from 'next/image';
import { cn } from '@/lib/utils';
// Correcting the import path is not necessary if the file doesn't exist.
// We will use a placeholder directly.

export function Logo({ className }: { className?: string }) {
  // Using a reliable placeholder as the logo.png file does not exist.
  // This ensures the build does not fail due to a missing image.
  return (
    <Image
      src="https://placehold.co/128x128.png?text=LH"
      alt="LandHare Logo"
      width={128}
      height={128}
      className={cn("object-contain", className)}
      priority
    />
  );
}
