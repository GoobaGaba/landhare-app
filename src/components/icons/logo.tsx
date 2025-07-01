import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  // Using an inline SVG for the logo for better quality, styling, and to avoid background issues.
  return (
    <svg
      role="img"
      aria-label="LandHare Logo"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      className={cn("text-neon-DEFAULT", className)}
    >
      <g 
        stroke="currentColor" 
        fill="none"
        strokeWidth="5"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        <path d="M 60,82 C 50,95, 30,95, 22,82 C 15,70, 15,55, 25,45 C 35,35, 45,35, 58,43 L 60,25 C 60,10, 70,3, 75,3 C 80,3, 85,10, 85,25 L 83,40 C 95,45, 98,55, 95,65 C 92,75, 85,80, 75,82 L 60,82 Z" />
      </g>
      <circle cx="78" cy="48" r="3" fill="currentColor" />
    </svg>
  );
}
