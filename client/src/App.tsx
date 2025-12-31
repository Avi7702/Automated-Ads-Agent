import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import NotFound from "@/pages/not-found";
import Studio from "@/pages/Studio";
import Gallery from "@/pages/Gallery";
import GenerationDetail from "@/pages/GenerationDetail";
import BrandProfile from "@/pages/BrandProfile";
import Templates from "@/pages/Templates";
import TemplateAdmin from "@/pages/TemplateAdmin";
import QuotaDashboard from "@/pages/QuotaDashboard";
import ProductLibrary from "@/pages/ProductLibrary";
import InstallationScenarios from "@/pages/InstallationScenarios";
import BrandImageLibrary from "@/pages/BrandImageLibrary";
import TemplateLibrary from "@/pages/TemplateLibrary";

function Router() {
  return (
    <Switch>
      {/* Main Studio - the unified workspace */}
      <Route path="/" component={Studio} />

      {/* Gallery for browsing all generations */}
      <Route path="/gallery" component={Gallery} />

      {/* Generation details (accessed from gallery or after generation) */}
      <Route path="/generation/:id" component={GenerationDetail} />

      {/* Usage/Quota Dashboard */}
      <Route path="/usage" component={QuotaDashboard} />

      {/* Product Library */}
      <Route path="/products" component={ProductLibrary} />

      {/* Installation Scenarios */}
      <Route path="/installation-scenarios" component={InstallationScenarios} />

      {/* Brand Image Library */}
      <Route path="/brand-images" component={BrandImageLibrary} />

      {/* Template Library */}
      <Route path="/template-library" component={TemplateLibrary} />

      {/* Settings pages */}
      <Route path="/settings" component={BrandProfile} />
      <Route path="/brand-profile" component={BrandProfile} />

      {/* Templates (still needed for template management) */}
      <Route path="/templates" component={Templates} />
      <Route path="/admin/templates" component={TemplateAdmin} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
