import Link from "next/link";
import { Logo } from '@/components/icons/logo';

export default function AppFooter() {
  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-3 relative flex items-center justify-between">
        {/* Left: Logo */}
        <div className="flex-shrink-0">
          <Logo className="h-8 w-8" />
        </div>
        
        {/* Center: Nav links (absolutely positioned for true centering) */}
        <nav className="hidden md:flex flex-wrap justify-center items-center gap-x-4 text-sm text-muted-foreground absolute left-1/2 -translate-x-1/2">
          <Link href="/about" className="hover:text-primary transition-colors">About Us</Link>
          <Link href="/contact" className="hover:text-primary transition-colors">Contact</Link>
          <Link href="/safety" className="hover:text-primary transition-colors">Safety</Link>
          <Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
          <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
        </nav>
        
        {/* Right: Copyright text */}
        <div className="text-xs text-muted-foreground text-right w-full md:w-auto">
          <p>&copy; {new Date().getFullYear()} LandHare. All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
}
