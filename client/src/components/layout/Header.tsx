import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { LogOut, Menu } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";

interface HeaderProps {
  currentPage?: "studio" | "gallery" | "products" | "template-library" | "installation-scenarios" | "brand-images" | "settings" | "templates" | "generation";
}

export function Header({ currentPage }: HeaderProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Determine active page from location if not provided
  const activePage = currentPage || (() => {
    if (location === "/") return "studio";
    if (location === "/gallery") return "gallery";
    if (location === "/products") return "products";
    if (location === "/template-library") return "template-library";
    if (location === "/installation-scenarios") return "installation-scenarios";
    if (location === "/brand-images") return "brand-images";
    if (location === "/usage") return "usage";
    if (location === "/settings" || location === "/brand-profile") return "settings";
    if (location.startsWith("/templates") || location.startsWith("/admin/templates")) return "templates";
    if (location.startsWith("/generation/")) return "generation";
    return "studio";
  })();

  const navItems = [
    { id: "studio", label: "Studio", href: "/" },
    { id: "gallery", label: "History", href: "/gallery" },
    { id: "products", label: "Products", href: "/products" },
    { id: "template-library", label: "Templates", href: "/template-library" },
    { id: "installation-scenarios", label: "Scenarios", href: "/installation-scenarios" },
    { id: "brand-images", label: "Brand Images", href: "/brand-images" },
    { id: "usage", label: "Usage", href: "/usage" },
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

export default Header;
