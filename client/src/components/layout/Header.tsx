import { useState, memo, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { LogOut, Menu } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";

interface HeaderProps {
  currentPage?: "studio" | "library" | "settings" | "content-planner" | "social-accounts";
}

export function Header({ currentPage }: HeaderProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Determine active page from location if not provided
  // Phase 3: Simplified to 3 main routes + Content Planner
  // Memoized to prevent re-calculation on every render
  const activePage = useMemo(() => {
    if (currentPage) return currentPage;
    if (location === "/" || location.startsWith("/?")) return "studio";
    if (location.startsWith("/library")) return "library";
    if (location.startsWith("/settings")) return "settings";
    if (location.startsWith("/content-planner")) return "content-planner";
    if (location.startsWith("/social-accounts")) return "social-accounts";
    // Legacy routes map to their consolidated equivalents
    if (location === "/gallery" || location.startsWith("/generation/")) return "studio";
    if (["/products", "/brand-images", "/template-library", "/templates", "/installation-scenarios", "/learn-from-winners"].includes(location)) return "library";
    if (location === "/usage" || location === "/settings/api-keys" || location === "/brand-profile") return "settings";
    return "studio";
  }, [currentPage, location]);

  // Phase 3: Simplified navigation - 5 main items (including Content Planner & Social Accounts)
  const navItems = [
    { id: "studio", label: "Studio", href: "/" },
    { id: "content-planner", label: "Content Planner", href: "/content-planner" },
    { id: "social-accounts", label: "Social Accounts", href: "/social-accounts" },
    { id: "library", label: "Library", href: "/library" },
    { id: "settings", label: "Settings", href: "/settings" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container flex h-14 md:h-16 items-center justify-between px-4 md:px-6">
        {/* Logo & Brand */}
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs font-bold">
              V3
            </span>
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
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Link key={item.id} href={item.href}>
              <span
                className={cn(
                  "px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                  activePage === item.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {item.label}
              </span>
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user && (
            <>
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {user.email || "User"}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-muted-foreground hover:text-foreground min-h-11 md:min-h-9"
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
              <SheetDescription>
                Navigate through the Product Content Studio
              </SheetDescription>
            </SheetHeader>
            <nav className="flex flex-col gap-2 mt-6">
              {navItems.map((item) => (
                <Link key={item.id} href={item.href}>
                  <span
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center min-h-12 px-4 py-3 rounded-md text-base font-medium transition-colors cursor-pointer",
                      activePage === item.id
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-muted"
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
