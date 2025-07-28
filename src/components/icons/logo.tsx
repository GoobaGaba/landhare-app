import Image from 'next/image';
import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  // Using the correct brand image for the logo.
  return (
    <Image
      src="/logo.png"
      alt="LandHare Logo"
      width={128}
      height={128}
      className={cn("object-cover rounded-full", className)}
      priority
    />
  );
}
