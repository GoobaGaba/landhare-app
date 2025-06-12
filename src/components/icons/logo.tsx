
import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg 
      width="48" 
      height="48" 
      viewBox="0 0 48 48" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      aria-label="LandShare Logo"
      {...props}
    >
      <rect x="4" y="20" width="40" height="20" rx="2" className="fill-primary" /> {/* Land parcel */}
      <path d="M18 18H30L24 12L18 18Z" className="fill-accent" /> {/* Roof */}
      <rect x="20" y="18" width="8" height="8" className="fill-primary-foreground" /> {/* House body */}
      <circle cx="12" cy="28" r="2" className="fill-secondary" /> {/* Amenity dot 1 */}
      <circle cx="36" cy="28" r="2" className="fill-secondary" /> {/* Amenity dot 2 */}
    </svg>
  );
}

    