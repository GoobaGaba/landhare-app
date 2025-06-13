
import Link from "next/link";

export default function AppFooter() {
  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-4 text-sm text-muted-foreground text-center">
        <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-1 mb-2">
          <span>&copy; {new Date().getFullYear()} LandShare.</span>
          <Link href="/about" className="hover:text-primary">About</Link>
          <Link href="/contact" className="hover:text-primary">Contact</Link>
          <Link href="/terms" className="hover:text-primary">Terms</Link>
          <Link href="/privacy" className="hover:text-primary">Privacy</Link>
          <Link href="/pricing" className="hover:text-primary">Pricing</Link>
        </div>
        <p className="text-xs">Disrupting housing, one plot at a time.</p>
      </div>
    </footer>
  );
}
