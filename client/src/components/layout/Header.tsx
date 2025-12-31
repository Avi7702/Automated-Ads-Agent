// @ts-nocheck
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ThemeToggle } from "@/components/ThemeToggle";

interface HeaderProps {
  currentPage?: "studio" | "gallery" | "products" | "template-library" | "settings" | "templates" | "generation";
}

export function Header({ currentPage }: HeaderProps) {
  const [location] = useLocation();
  const queryClient = useQueryClient();

  // Auth state
  const { data: authUser } = useQuery({
    queryKey: ["auth"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["auth"] }),
  });

  // Determine active page from location if not provided
  const activePage = currentPage || (() => {
    if (location === "/") return "studio";
    if (location === "/gallery") return "gallery";
    if (location === "/products") return "products";
    if (location === "/template-library") return "template-library";
    if (location === "/usage") return "usage";
    if (location === "/settings" || location === "/brand-profile") return "settings";
    if (location.startsWith("/templates") || location.startsWith("/admin/templates")) return "templates";
    if (location.startsWith("/generation/")) return "generation";
    return "studio";
  })();

  const navItems = [
    { id: "studio", label: "Studio", href: "/" },
    { id: "gallery", label: "Gallery", href: "/gallery" },
    { id: "products", label: "Products", href: "/products" },
    { id: "template-library", label: "Templates", href: "/template-library" },
    { id: "usage", label: "Usage", href: "/usage" },
    { id: "settings", label: "Settings", href: "/settings" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo & Brand */}
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs font-bold">
              V3
            </span>
            <span className="font-semibold text-lg hidden sm:inline">Product Content Studio</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-1">
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
          {authUser && (
            <>
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {authUser.username || "User"}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => logoutMutation.mutate()}
                className="text-muted-foreground hover:text-foreground"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
