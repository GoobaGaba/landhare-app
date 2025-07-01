import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  // This is the most direct way to reference an image in the `public` folder.
  // It bypasses the Next.js Image component to avoid potential optimization issues
  // and directly uses the browser's ability to load an image.
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src="/logo.png"
      alt="LandHare Logo"
      className={cn("object-contain", className)}
    />
  );
}
