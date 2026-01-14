import { Switch, Route } from "wouter";
import { lazy, Suspense } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Eager load only critical routes for instant access
import Login from "@/pages/Login";
import Studio from "@/pages/Studio";

// Lazy load all other routes to reduce initial bundle size
const Gallery = lazy(() => import("@/pages/Gallery"));
const GenerationDetail = lazy(() => import("@/pages/GenerationDetail"));
const BrandProfile = lazy(() => import("@/pages/BrandProfile"));
const Templates = lazy(() => import("@/pages/Templates"));
const TemplateAdmin = lazy(() => import("@/pages/TemplateAdmin"));
const QuotaDashboard = lazy(() => import("@/pages/QuotaDashboard"));
const ProductLibrary = lazy(() => import("@/pages/ProductLibrary"));
const InstallationScenarios = lazy(() => import("@/pages/InstallationScenarios"));
const BrandImageLibrary = lazy(() => import("@/pages/BrandImageLibrary"));
const TemplateLibrary = lazy(() => import("@/pages/TemplateLibrary"));
const SystemMap = lazy(() => import("@/pages/SystemMap"));
const ApiKeySettings = lazy(() => import("@/pages/ApiKeySettings"));
const LearnFromWinners = lazy(() => import("@/pages/LearnFromWinners"));
const NotFound = lazy(() => import("@/pages/not-found"));

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        {/* Public route - Login */}
        <Route path="/login" component={Login} />

      {/* Protected routes */}
      <Route path="/">
        <ProtectedRoute>
          <Studio />
        </ProtectedRoute>
      </Route>

      <Route path="/gallery">
        <ProtectedRoute>
          <Gallery />
        </ProtectedRoute>
      </Route>

      <Route path="/generation/:id">
        <ProtectedRoute>
          <GenerationDetail />
        </ProtectedRoute>
      </Route>

      <Route path="/usage">
        <ProtectedRoute>
          <QuotaDashboard />
        </ProtectedRoute>
      </Route>

      <Route path="/products">
        <ProtectedRoute>
          <ProductLibrary />
        </ProtectedRoute>
      </Route>

      <Route path="/installation-scenarios">
        <ProtectedRoute>
          <InstallationScenarios />
        </ProtectedRoute>
      </Route>

      <Route path="/brand-images">
        <ProtectedRoute>
          <BrandImageLibrary />
        </ProtectedRoute>
      </Route>

      <Route path="/template-library">
        <ProtectedRoute>
          <TemplateLibrary />
        </ProtectedRoute>
      </Route>

      <Route path="/learn-from-winners">
        <ProtectedRoute>
          <LearnFromWinners />
        </ProtectedRoute>
      </Route>

      <Route path="/settings/api-keys">
        <ProtectedRoute>
          <ApiKeySettings />
        </ProtectedRoute>
      </Route>

      <Route path="/settings">
        <ProtectedRoute>
          <BrandProfile />
        </ProtectedRoute>
      </Route>

      <Route path="/brand-profile">
        <ProtectedRoute>
          <BrandProfile />
        </ProtectedRoute>
      </Route>

      <Route path="/templates">
        <ProtectedRoute>
          <Templates />
        </ProtectedRoute>
      </Route>

      <Route path="/admin/templates">
        <ProtectedRoute>
          <TemplateAdmin />
        </ProtectedRoute>
      </Route>

      {/* Developer Tools */}
      <Route path="/system-map">
        <ProtectedRoute>
          <SystemMap />
        </ProtectedRoute>
      </Route>

      <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
