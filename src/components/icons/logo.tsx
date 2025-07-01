
import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg 
      width="48" 
      height="48" 
      viewBox="0 0 48 48" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      aria-label="LandHare Logo"
      {...props}
    >
      {/* Green land arc */}
      <path d="M4 36C12.3333 28 24.3 28 44 36H4Z" className="fill-primary" />
      {/* Hare silhouette */}
      <path d="M25.5 22C25.5 20.9 25.1 20 24.5 19.5C24.5 18.5 24 18 23 18C22.5 18 22 17.5 21.5 17C21 16.5 20.5 15 20.5 14C20.5 13.5 20 13 19.5 13C18.5 13 18 14 17.5 14.5C17 15 16.5 16 17 17.5C17.5 19 18.5 20.5 19.5 21.5C20.5 22.5 22.5 24.5 22.5 26C22.5 27.5 23.5 28.5 24.5 28.5C25.5 28.5 26.5 27.5 27 26.5C27.5 25.5 27.5 24 26.5 23C25.5 22.5 25.5 22 25.5 22Z" className="fill-accent" />
    </svg>
  );
}
