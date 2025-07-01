
import Image from 'next/image';
import { cn } from '@/lib/utils';
import logoImage from './logo.png';

export function Logo({ className }: { className?: string }) {
  // This approach imports the image directly.
  // Next.js's build system handles the path, making it very reliable.
  return (
    <Image
      src={logoImage}
      alt="LandHare Logo"
      className={cn("object-contain", className)}
      // When importing an image, width and height are handled automatically.
      // The `className` prop (e.g., "h-8 w-8") controls the display size.
    />
  );
}
