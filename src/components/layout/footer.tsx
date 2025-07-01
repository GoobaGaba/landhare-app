import Link from "next/link";
import { Logo } from '@/components/icons/logo';

export default function AppFooter() {
  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
                <Logo className="h-12 w-12"/>
                <span className="font-headline text-lg font-bold text-title">LandHare</span>
            </div>
            <nav className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                <Link href="/about" className="hover:text-primary transition-colors">About Us</Link>
                <Link href="/contact" className="hover:text-primary transition-colors">Contact</Link>
                <Link href="/safety" className="hover:text-primary transition-colors">Safety</Link>
                <Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
                <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
            </nav>
        </div>
        <div className="mt-6 pt-4 border-t text-center text-xs text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} LandHare. All Rights Reserved.</p>
            <p className="mt-1">Disrupting housing, one plot at a time.</p>
        </div>
      </div>
    </footer>
  );
}
