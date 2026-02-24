import { useState, memo, useMemo } from 'react';
import { motion } from 'motion/react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { MOTION, useReducedMotion } from '@/lib/motion';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { LogOut, Menu } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';

interface HeaderProps {
  currentPage?:
    | 'studio'
    | 'gallery'
    | 'pipeline'
    | 'library'
    | 'settings'
    | 'content-planner'
    | 'social-accounts'
    | 'approval-queue'
    | 'templates'
    | undefined;
}

export function Header({ currentPage }: HeaderProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const reduced = useReducedMotion();

  // Determine active page from location if not provided
  // Unified Studio: 4 main routes
  const activePage = useMemo(() => {
    if (currentPage) return currentPage;
    if (location === '/' || location.startsWith('/?')) return 'studio';
    if (location.startsWith('/gallery')) return 'gallery';
    if (location.startsWith('/pipeline')) return 'pipeline';
    if (location.startsWith('/settings')) return 'settings';
    // Legacy routes map to their consolidated equivalents
    if (
      location.startsWith('/content-planner') ||
      location.startsWith('/approval-queue') ||
      location.startsWith('/social-accounts')
    )
      return 'pipeline';
    if (location.startsWith('/library')) return 'library';
    if (location.startsWith('/generation/')) return 'studio';
    if (location === '/usage' || location === '/settings/api-keys' || location === '/brand-profile') return 'settings';
    return 'studio';
  }, [currentPage, location]);

  // Unified Studio: 4 focused nav items
  const navItems = [
    { id: 'studio', label: 'Studio', href: '/' },
    { id: 'gallery', label: 'Gallery', href: '/gallery' },
    { id: 'pipeline', label: 'Pipeline', href: '/pipeline' },
    { id: 'library', label: 'Library', href: '/library' },
    { id: 'settings', label: 'Settings', href: '/settings' },
  ];

  return (
    <header
      className="sticky top-0 z-50 w-full header-shadow bg-background/80 backdrop-blur-md"
      style={{ viewTransitionName: 'header' }}
    >
      <div className="container flex h-14 md:h-16 items-center justify-between px-4 md:px-6">
        {/* Logo & Brand */}
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <motion.span
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs font-bold"
              {...(!reduced ? { whileHover: { scale: 1.08 }, whileTap: { scale: 0.95 } } : {})}
              transition={MOTION.transitions.fast}
            >
              V3
            </motion.span>
            <span className="font-semibold text-lg hidden sm:inline">Product Content Studio</span>
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden min-h-12 min-w-12"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
          {navItems.map((item) => (
            <Link key={item.id} href={item.href} aria-current={activePage === item.id ? 'page' : undefined}>
              <motion.span
                className={cn(
                  'nav-indicator px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer inline-block',
                  activePage === item.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                )}
                data-active={activePage === item.id}
                {...(!reduced ? { whileHover: { scale: 1.04 }, whileTap: { scale: 0.97 } } : {})}
                transition={MOTION.transitions.fast}
              >
                {item.label}
              </motion.span>
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user && (
            <>
              <span className="text-sm text-muted-foreground hidden sm:inline">{user.email || 'User'}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-muted-foreground hover:text-foreground min-h-11 md:min-h-9"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>

        {/* Mobile Navigation Sheet */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="w-4/5 max-w-sm">
            <SheetHeader>
              <SheetTitle>Navigation</SheetTitle>
              <SheetDescription>Navigate through the Product Content Studio</SheetDescription>
            </SheetHeader>
            <nav className="flex flex-col gap-2 mt-6">
              {navItems.map((item) => (
                <Link key={item.id} href={item.href} aria-current={activePage === item.id ? 'page' : undefined}>
                  <span
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center min-h-12 px-4 py-3 rounded-md text-base font-medium transition-colors cursor-pointer',
                      activePage === item.id ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted',
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}

// Memoized to prevent unnecessary re-renders on parent re-renders
export default memo(Header);
