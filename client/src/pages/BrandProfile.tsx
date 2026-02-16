import { BrandProfileDisplay } from "@/components/BrandProfileDisplay";
import { Link } from "wouter";
import { ArrowLeft, KeyRound, Building2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface BrandProfileProps {
  embedded?: boolean;
}

export default function BrandProfile({ embedded = false }: BrandProfileProps) {
  // Embedded mode - just render content
  if (embedded) {
    return <BrandProfileDisplay className="max-w-3xl" />;
  }

  // Standalone mode - full page layout
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-primary font-sans overflow-hidden relative">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 blur-[120px] rounded-full" />
      </div>

      <Header currentPage="settings" />

      <main className="container max-w-7xl mx-auto px-6 pt-24 pb-20 relative z-10">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Studio
            </Button>
          </Link>
        </div>

        <h1 className="text-2xl font-semibold text-foreground mb-6">Settings</h1>

        {/* Settings Navigation Cards */}
        <div className="grid gap-4 md:grid-cols-2 mb-8 max-w-3xl">
          <Card className="group cursor-default border-primary/20 bg-primary/5">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Brand Profile</CardTitle>
                    <CardDescription className="text-xs">
                      Your brand identity and voice
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Link href="/settings/api-keys">
            <Card className="group cursor-pointer hover:border-primary/30 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <KeyRound className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div>
                      <CardTitle className="text-base">API Keys</CardTitle>
                      <CardDescription className="text-xs">
                        Manage external service keys
                      </CardDescription>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </CardHeader>
            </Card>
          </Link>
        </div>

        {/* Brand Profile Content */}
        <h2 className="text-lg font-medium text-foreground mb-4">Brand Profile</h2>
        <BrandProfileDisplay className="max-w-3xl" />
      </main>
    </div>
  );
}
