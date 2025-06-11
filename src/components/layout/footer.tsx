
import Link from "next/link";

export default function AppFooter() {
  return (
    <footer className="border-t bg-background">
      <div className="container py-8 text-center text-sm text-muted-foreground">
        <div className="flex justify-center gap-4 mb-2">
          <Link href="/about" className="hover:text-primary">About Us</Link>
          <Link href="/contact" className="hover:text-primary">Contact</Link>
          <Link href="/terms" className="hover:text-primary">Terms of Service</Link>
          <Link href="/privacy" className="hover:text-primary">Privacy Policy</Link>
          <Link href="/pricing" className="hover:text-primary">Pricing</Link>
        </div>
        <p>&copy; {new Date().getFullYear()} LandShare Connect. All rights reserved.</p>
        <p className="mt-1">Disrupting housing, one plot at a time.</p>
      </div>
    </footer>
  );
}
