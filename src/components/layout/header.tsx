'use client';
import Link from 'next/link';
import { Logo } from '@/components/icons/logo';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, Home, MapPin, DollarSign, PlusCircle, MessageSquare, UserCircle, Search } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navLinks = [
  { href: '/search', label: 'Find Land', icon: Search },
  { href: '/listings/new', label: 'List Your Land', icon: PlusCircle },
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/messages', label: 'Messages', icon: MessageSquare },
  { href: '/profile', label: 'Profile', icon: UserCircle },
];

export default function AppHeader() {
  const pathname = usePathname();

  const NavLinkItems = ({ isMobile = false }: { isMobile?: boolean }) => (
    <>
      {navLinks.map((link) => (
        <Button
          key={link.href}
          variant={pathname === link.href ? 'secondary' : 'ghost'}
          asChild
          className={cn(isMobile && 'w-full justify-start')}
        >
          <Link href={link.href}>
            <link.icon className="mr-2 h-4 w-4" />
            {link.label}
          </Link>
        </Button>
      ))}
    </>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2" aria-label="Go to homepage">
          <Logo className="h-8 w-8" />
          <span className="font-headline text-xl font-bold text-primary">LandShare Connect</span>
        </Link>

        <nav className="hidden md:flex items-center gap-2">
          <NavLinkItems />
        </nav>
        
        <div className="hidden md:flex items-center gap-2">
            <Button variant="outline">Log In</Button>
            <Button>Sign Up</Button>
        </div>

        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <div className="flex flex-col gap-4 py-6">
                <Link href="/" className="flex items-center gap-2 mb-4 px-2" aria-label="Go to homepage">
                  <Logo className="h-8 w-8" />
                  <span className="font-headline text-xl font-bold text-primary">LandShare Connect</span>
                </Link>
                <NavLinkItems isMobile />
                 <div className="flex flex-col gap-2 mt-4">
                    <Button variant="outline">Log In</Button>
                    <Button>Sign Up</Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
