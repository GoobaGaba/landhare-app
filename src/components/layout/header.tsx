
'use client';
import Link from 'next/link';
import { Logo } from '@/components/icons/logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Menu, Home, Search, PlusCircle, MessageSquare, UserCircle, Settings as SettingsIcon, Sun, Moon, LogIn, UserPlus, Landmark, LogOut, ListChecks, Crown } from 'lucide-react'; 
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { MobileThemeToggleButton } from './theme-toggle-button'; 
import type { ComponentType } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';


interface NavLink {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  action?: () => void;
  className?: string; // Added for custom styling
}

export default function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { setTheme } = useTheme();
  const { currentUser, logoutUser, loading } = useAuth();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await logoutUser();
      toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
      router.push('/'); // Redirect to home page after logout
    } catch (error) {
      toast({ title: 'Logout Failed', description: 'Could not log you out. Please try again.', variant: 'destructive' });
    }
  };

  const userNavLinks: NavLink[] = [
    { href: '/profile', label: 'Profile', icon: UserCircle },
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/my-listings', label: 'My Listings', icon: ListChecks },
    { href: '/messages', label: 'Messages', icon: MessageSquare },
    { href: '/pricing', label: 'Premium', icon: Crown, className: "text-neon focus:bg-neon/10 focus:text-neon hover:bg-neon/10 hover:text-neon" }, // Styled "Premium" link
    { href: '/settings', label: 'Settings', icon: SettingsIcon },
  ];
  
  const guestNavLinks: NavLink[] = [
     { href: '/login', label: 'Log In', icon: LogIn },
     { href: '/signup', label: 'Sign Up', icon: UserPlus },
  ];


  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between gap-4">
        {/* Left Part: Logo + Name */}
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/" className="flex items-center gap-2" aria-label="Go to homepage">
            <Logo className="h-8 w-8" />
            <span className="font-headline text-xl font-bold text-primary hidden sm:inline-block">LandShare</span>
          </Link>
        </div>

        {/* Center Part (Desktop): Search Bar + List your Land */}
        <div className="hidden md:flex items-center justify-center gap-3 flex-1 min-w-0 px-4">
          <div className="relative w-full max-w-md"> 
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              type="search" 
              placeholder="Search land (e.g., Willow Creek, CO)" 
              className="pl-10 w-full h-10 bg-card focus-visible:ring-primary" 
              onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/search?q=${e.currentTarget.value}`); }}
            />
          </div>
          <Button variant="outline" className="h-10 px-4 border-neon text-neon hover:bg-neon/10 hover:text-neon" asChild>
            <Link href="/listings/new">
                <PlusCircle className="mr-2 h-4 w-4 md:hidden lg:inline-block" /> List Your Land
            </Link>
          </Button>
        </div>

        {/* Right Part: Auth Buttons + User Dropdown / Mobile Menu */}
        <div className="flex items-center gap-2 shrink-0">
          {!loading && (
            <>
              {currentUser ? (
                <div className="hidden md:block">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={currentUser.photoURL || undefined} alt={currentUser.displayName || currentUser.email || 'User'} />
                          <AvatarFallback>{currentUser.displayName ? currentUser.displayName.split(' ').map(n => n[0]).join('').toUpperCase() : (currentUser.email ? currentUser.email[0].toUpperCase() : 'U')}</AvatarFallback>
                        </Avatar>
                         <span className="sr-only">Open user menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>
                        {currentUser.displayName || currentUser.email}
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {userNavLinks.map((link) => (
                        <DropdownMenuItem key={link.href} asChild>
                          <Link href={link.href} className={cn("flex items-center gap-2", pathname === link.href && "bg-muted", link.className)}>
                            <link.icon className="h-4 w-4" />
                            <span>{link.label}</span>
                          </Link>
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                       <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2 cursor-pointer">
                        <LogOut className="h-4 w-4" />
                        <span>Log Out</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>Theme</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => setTheme("light")}>
                        <Sun className="mr-2 h-4 w-4" /> Light
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTheme("dark")}>
                        <Moon className="mr-2 h-4 w-4" /> Dark
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTheme("system")}>
                        <Landmark className="mr-2 h-4 w-4" /> System 
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                <div className="hidden md:flex items-center gap-2">
                  <Button variant="outline" asChild><Link href="/login">Log In</Link></Button>
                  <Button asChild><Link href="/signup">Sign Up</Link></Button>
                </div>
              )}
            </>
          )}
          
          {/* Mobile Menu Trigger */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[calc(100vw-4rem)] max-w-sm p-0 flex flex-col">
                <div className="p-4 border-b">
                  <Link href="/" className="flex items-center gap-2" aria-label="Go to homepage">
                    <Logo className="h-8 w-8" />
                    <span className="font-headline text-xl font-bold text-primary">LandShare</span>
                  </Link>
                </div>
                
                <div className="p-4">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      type="search" 
                      placeholder="Search land..." 
                      className="pl-8 w-full bg-background h-10" 
                      onKeyDown={(e) => { if (e.key === 'Enter') { router.push(`/search?q=${e.currentTarget.value}`); (e.currentTarget.closest('[data-radix-dialog-content]')?.querySelector('[data-radix-dialog-close]') as HTMLElement)?.click(); }}}
                    />
                  </div>
                </div>

                <nav className="flex flex-col gap-1 px-4 flex-grow">
                  <SheetClose asChild>
                    <Button asChild variant="outline" className="w-full justify-start text-base py-3 border-neon text-neon hover:bg-neon/10 hover:text-neon">
                      <Link href="/listings/new"><PlusCircle className="mr-2 h-4 w-4" />List Your Land</Link>
                    </Button>
                  </SheetClose>
                  
                  {!loading && currentUser && userNavLinks.map((link) => (
                    <SheetClose asChild key={`mobile-user-${link.href}`}>
                      <Button 
                        variant={pathname === link.href ? 'secondary' : 'ghost'} 
                        asChild 
                        className={cn("w-full justify-start text-base py-3", link.className?.includes('text-neon') && 'text-neon hover:text-neon hover:bg-neon/10')}
                      >
                        <Link href={link.href}><link.icon className="mr-2 h-4 w-4" />{link.label}</Link>
                      </Button>
                    </SheetClose>
                  ))}
                </nav>
                
                <Separator className="my-4" />
                
                <div className="px-4 pb-4">
                  {!loading && (
                    <>
                      {currentUser ? (
                        <SheetClose asChild>
                          <Button variant="outline" className="w-full justify-start text-base py-3" onClick={handleLogout}>
                            <LogOut className="mr-2 h-4 w-4"/>Log Out
                          </Button>
                        </SheetClose>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {guestNavLinks.map(link => (
                             <SheetClose asChild key={`mobile-guest-${link.href}`}>
                               <Button 
                                variant={pathname === link.href ? 'secondary' : (link.label === 'Sign Up' ? 'default' : 'outline')} 
                                asChild 
                                className="w-full justify-start text-base py-3"
                              >
                                <Link href={link.href}><link.icon className="mr-2 h-4 w-4"/>{link.label}</Link>
                              </Button>
                            </SheetClose>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
                
                <div className="mt-auto p-4 border-t">
                  <MobileThemeToggleButton />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
