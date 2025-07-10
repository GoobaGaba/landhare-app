
'use client';
import Link from 'next/link';
import { Logo } from '@/components/icons/logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Menu, Home, Search, PlusCircle, MessageSquare, UserCircle, LogIn, UserPlus, Landmark, LogOut, ListChecks, Crown, Bookmark, Sun, Moon, Settings, ReceiptText, BarChart3, Shield, Beaker } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { MobileThemeToggleButton } from './theme-toggle-button';
import type { ComponentType } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { ADMIN_EMAILS } from '@/lib/mock-data';
import { isPrototypeMode } from '@/lib/firebase';


interface NavLink {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  action?: () => void;
  className?: string;
}

export default function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { currentUser, logoutUser, loading, subscriptionStatus } = useAuth();
  const { toast } = useToast();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logoutUser();
      toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
      router.push('/');
    } catch (error) {
      toast({ title: 'Logout Failed', description: 'Could not log you out. Please try again.', variant: 'destructive' });
    }
  };
  
  const handleSearch = (query: string) => {
    const trimmedQuery = query.trim();
    if (trimmedQuery) {
      router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`);
    } else {
      router.push('/search');
    }
    setIsMobileMenuOpen(false); // Close mobile sheet if open
  };

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const searchQuery = formData.get('q') as string;
    handleSearch(searchQuery);
  };


  const userNavLinks: NavLink[] = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/bookmarks', label: 'My Bookmarks', icon: Bookmark },
    { href: '/messages', label: 'Messages', icon: MessageSquare },
    { href: '/profile', label: 'Profile & Settings', icon: UserCircle },
    { href: '/pricing', label: 'Premium', icon: Crown, className: "text-premium hover:text-premium focus:text-premium focus:bg-premium/10 hover:bg-premium/10" },
  ];
  
  const guestNavLinks: NavLink[] = [
     { href: '/login', label: 'Log In', icon: LogIn },
     { href: '/signup', label: 'Sign Up', icon: UserPlus },
  ];

  const listYourLandHref = currentUser ? "/listings/new" : `/login?redirect=${encodeURIComponent("/listings/new")}`;
  const isUserAdmin = currentUser?.email ? ADMIN_EMAILS.includes(currentUser.email) : false;


  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {isPrototypeMode && (
         <div className="w-full bg-amber-400 text-amber-900 text-xs font-bold text-center py-1 flex items-center justify-center gap-2">
            <Beaker className="h-3 w-3" />
            PROTOTYPE MODE (Using Mock Data)
        </div>
      )}
      <div className="container flex h-16 items-center justify-between gap-4">
        {/* Left Part: Logo + Name */}
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/" className="flex items-center gap-2" aria-label="Go to homepage">
            <Logo className="h-12 w-12" />
            <span className="font-headline text-xl font-bold text-title hidden sm:inline-block">LandHare</span>
          </Link>
        </div>

        {/* Center Part (Desktop): Search Bar + Browse + List your Land */}
        <div className="hidden md:flex items-center justify-center gap-3 flex-1 min-w-0 px-4">
          <form onSubmit={handleFormSubmit} className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              name="q"
              placeholder="Search land (e.g., Willow Creek, CO)"
              className="pl-10 w-full h-10 bg-card focus-visible:ring-primary"
            />
          </form>
          <Button variant="ghost" className="h-10 px-4 text-muted-foreground hover:text-primary" asChild>
            <Link href="/search">
                <Search className="mr-2 h-4 w-4 hidden lg:inline-block" /> Browse Land
            </Link>
          </Button>
          <Button variant="outline" className="h-10 px-4 border-neon-DEFAULT text-neon-DEFAULT hover:bg-neon-DEFAULT hover:text-neon-foreground" asChild>
            <Link href={listYourLandHref}>
                <PlusCircle className="mr-2 h-4 w-4 hidden lg:inline-block" /> List Your Land
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
                           <AvatarImage src={currentUser.appProfile?.avatarUrl || currentUser.photoURL || undefined} alt={currentUser.appProfile?.name || currentUser.displayName || currentUser.email || 'User'} />
                           <AvatarFallback>{(currentUser.appProfile?.name || currentUser.displayName || currentUser.email || 'U').split(' ').map(n=>n[0]).join('').toUpperCase() || 'U'}</AvatarFallback>
                        </Avatar>
                         <span className="sr-only">Open user menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>
                        <div className="flex items-center gap-2">
                           <span>{currentUser.appProfile?.name || currentUser.displayName || currentUser.email}</span>
                           {subscriptionStatus === 'premium' && !currentUser.appProfile?.isAdmin && <Crown className="h-4 w-4 text-premium" />}
                           {currentUser.appProfile?.isAdmin && <Shield className="h-4 w-4 text-primary" title="Administrator" />}
                        </div>
                      </DropdownMenuLabel>
                      {isUserAdmin && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link href="/admin" className={cn("flex items-center gap-2 font-semibold text-accent", pathname.startsWith("/admin") && "bg-muted")}>
                              <Shield className="h-4 w-4" />
                              <span>Admin Tools</span>
                            </Link>
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator />
                      {userNavLinks.map((link) => (
                        <DropdownMenuItem key={link.href} asChild>
                          <Link href={link.href} className={cn("flex items-center gap-2", pathname === link.href && "bg-muted", link.className)}>
                            <link.icon className={cn("h-4 w-4", link.className?.includes('text-premium') ? 'text-premium' : '')} />
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
                      <DropdownMenuItem
                        onSelect={(event) => {
                          event.preventDefault();
                          setTheme(theme === 'dark' ? 'light' : 'dark');
                        }}
                        className="cursor-pointer"
                      >
                        {theme === 'dark' ? (
                          <><Sun className="mr-2 h-4 w-4" /> Light Mode</>
                        ) : (
                          <><Moon className="mr-2 h-4 w-4" /> Dark Mode</>
                        )}
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
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[calc(100vw-4rem)] max-w-sm p-0 flex flex-col">
                <div className="p-4 border-b">
                  <Link href="/" className="flex items-center gap-2" aria-label="Go to homepage" onClick={() => setIsMobileMenuOpen(false)}>
                    <Logo className="h-10 w-10" />
                    <span className="font-headline text-xl text-title">LandHare</span>
                  </Link>
                </div>

                <div className="p-4">
                    <form onSubmit={handleFormSubmit}>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                            type="search"
                            name="q"
                            placeholder="Search land..."
                            className="pl-8 w-full bg-background h-10"
                            />
                        </div>
                         <button type="submit" className="hidden" aria-hidden="true"></button>
                    </form>
                </div>

                <nav className="flex flex-col gap-1 px-4 flex-grow">
                  <SheetClose asChild>
                    <Button asChild variant="ghost" className="w-full justify-start text-base py-3">
                      <Link href="/search"><Search className="mr-2 h-4 w-4" />Browse Land</Link>
                    </Button>
                  </SheetClose>
                  <SheetClose asChild>
                    <Button asChild variant="outline" className="w-full justify-start text-base py-3 border-neon-DEFAULT text-neon-DEFAULT hover:bg-neon-DEFAULT hover:text-neon-foreground">
                      <Link href={listYourLandHref}><PlusCircle className="mr-2 h-4 w-4" />List Your Land</Link>
                    </Button>
                  </SheetClose>

                  {!loading && isUserAdmin && (
                      <SheetClose asChild>
                          <Button
                          variant={pathname.startsWith('/admin') ? 'secondary' : 'ghost'}
                          asChild
                          className="w-full justify-start text-base py-3"
                          >
                          <Link href="/admin">
                              <Shield className="mr-2 h-4 w-4" />
                              Admin Tools
                          </Link>
                          </Button>
                      </SheetClose>
                  )}

                  {!loading && currentUser && userNavLinks.map((link) => (
                    <SheetClose asChild key={`mobile-user-${link.href}`}>
                      <Button
                        variant={pathname === link.href ? 'secondary' : 'ghost'}
                        asChild
                        className={cn("w-full justify-start text-base py-3", link.className?.includes('text-premium') && 'text-premium hover:text-premium focus:text-premium hover:bg-premium/10')}
                      >
                        <Link href={link.href}>
                          <link.icon className={cn("mr-2 h-4 w-4", link.className?.includes('text-premium') ? 'text-premium' : '')} />
                          {link.label}
                        </Link>
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
