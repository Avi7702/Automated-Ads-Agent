// @ts-nocheck
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { User, LogOut } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface HeaderProps {
  currentPage?: "studio" | "gallery" | "settings" | "templates" | "generation";
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

  const demoLoginMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/auth/demo", { credentials: "include" });
      if (!res.ok) throw new Error("Demo login failed");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["auth"] }),
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
    if (location === "/usage") return "usage";
    if (location === "/settings" || location === "/brand-profile") return "settings";
    if (location.startsWith("/templates") || location.startsWith("/admin/templates")) return "templates";
    if (location.startsWith("/generation/")) return "generation";
    return "studio";
  })();

  const navItems = [
    { id: "studio", label: "Studio", href: "/" },
    { id: "gallery", label: "Gallery", href: "/gallery" },
    { id: "usage", label: "Usage", href: "/usage" },
    { id: "settings", label: "Settings", href: "/settings" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-background/80 backdrop-blur-md">
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
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                )}
              >
                {item.label}
              </span>
            </Link>
          ))}
        </nav>

        {/* Auth Section */}
        <div className="flex items-center gap-2">
          {authUser ? (
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
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => demoLoginMutation.mutate()}
              disabled={demoLoginMutation.isPending}
            >
              <User className="w-4 h-4 mr-2" />
              {demoLoginMutation.isPending ? "..." : "Demo Login"}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
