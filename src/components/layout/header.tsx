
'use client';
import Link from 'next/link';
import { Logo } from '@/components/icons/logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Menu, Home, Search, PlusCircle, MessageSquare, UserCircle, Settings as SettingsIcon, Sun, Moon, LogIn, UserPlus, Landmark } from 'lucide-react'; // Added Landmark for consistency with logo component
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { MobileThemeToggleButton } from './theme-toggle-button'; // Assuming this is still desired for mobile
import type { ComponentType } from 'react';

interface NavLink {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

const dropdownNavLinks: NavLink[] = [
  { href: '/profile', label: 'Profile', icon: UserCircle },
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/messages', label: 'Messages', icon: MessageSquare },
  { href: '/settings', label: 'Settings', icon: SettingsIcon },
];

export default function AppHeader() {
  const pathname = usePathname();
  const { setTheme, theme } = useTheme();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between gap-4">
        {/* Left Part: Logo + Name */}
        <Link href="/" className="flex items-center gap-2" aria-label="Go to homepage">
          <Logo className="h-8 w-8" />
          <span className="font-headline text-xl font-bold text-primary hidden sm:inline-block">LandShare Connect</span>
        </Link>

        {/* Center Part (Desktop): Search Bar + List your Land */}
        <div className="hidden md:flex items-center gap-3 flex-1 min-w-0 px-4">
          <div className="relative w-full max-w-md"> {/* Search bar itself */}
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              type="search" 
              placeholder="Search land (e.g., Willow Creek, CO)" 
              className="pl-10 w-full h-10 bg-card focus-visible:ring-primary" 
            />
          </div>
          <Button variant="link" asChild className="text-primary hover:text-primary/90 hover:no-underline font-semibold whitespace-nowrap px-2">
            <Link href="/listings/new">
                <PlusCircle className="mr-2 h-4 w-4 md:hidden lg:inline-block" /> List Your Land
            </Link>
          </Button>
        </div>

        {/* Right Part: Auth Buttons + User Dropdown / Mobile Menu */}
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2">
            <Button variant="outline">Log In</Button>
            <Button>Sign Up</Button>
          </div>
          
          {/* Desktop User Dropdown */}
          <div className="hidden md:block">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
                  <UserCircle className="h-5 w-5" />
                   <span className="sr-only">Open user menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {dropdownNavLinks.map((link) => (
                  <DropdownMenuItem key={link.href} asChild>
                    <Link href={link.href} className={cn("flex items-center gap-2", pathname === link.href && "bg-muted")}>
                      <link.icon className="h-4 w-4" />
                      <span>{link.label}</span>
                    </Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Theme</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setTheme("light")}>
                  <Sun className="mr-2 h-4 w-4" /> Light
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}>
                  <Moon className="mr-2 h-4 w-4" /> Dark
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")}>
                  {/* Using Landmark as a generic system icon, or could use Laptop */}
                  <Landmark className="mr-2 h-4 w-4" /> System 
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile Menu Trigger */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[calc(100vw-4rem)] max-w-sm p-0">
                <div className="flex flex-col h-full">
                  <div className="p-4 border-b">
                    <Link href="/" className="flex items-center gap-2" aria-label="Go to homepage">
                      <Logo className="h-8 w-8" />
                      <span className="font-headline text-xl font-bold text-primary">LandShare Connect</span>
                    </Link>
                  </div>
                  
                  <div className="p-4">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input type="search" placeholder="Search land..." className="pl-8 w-full bg-background h-10" />
                    </div>
                  </div>

                  <nav className="flex flex-col gap-1 px-4">
                    <SheetClose asChild>
                      <Button variant="ghost" asChild className="w-full justify-start text-base py-3">
                        <Link href="/listings/new"><PlusCircle className="mr-2 h-4 w-4" />List Your Land</Link>
                      </Button>
                    </SheetClose>
                    {dropdownNavLinks.map((link) => (
                      <SheetClose asChild key={`mobile-${link.href}`}>
                        <Button 
                          variant={pathname === link.href ? 'secondary' : 'ghost'} 
                          asChild 
                          className="w-full justify-start text-base py-3"
                        >
                          <Link href={link.href}><link.icon className="mr-2 h-4 w-4" />{link.label}</Link>
                        </Button>
                      </SheetClose>
                    ))}
                  </nav>
                  
                  <Separator className="my-4" />
                  
                  <div className="flex flex-col gap-2 px-4">
                    <SheetClose asChild>
                      <Button variant="outline" className="w-full justify-start text-base py-3"><LogIn className="mr-2 h-4 w-4"/>Log In</Button>
                    </SheetClose>
                    <SheetClose asChild>
                     <Button className="w-full justify-start text-base py-3"><UserPlus className="mr-2 h-4 w-4"/>Sign Up</Button>
                    </SheetClose>
                  </div>
                  
                  <div className="mt-auto p-4 border-t">
                    <MobileThemeToggleButton />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
