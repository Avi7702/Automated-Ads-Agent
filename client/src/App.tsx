import { Switch, Route, Redirect } from "wouter";
import { lazy, Suspense, useEffect } from "react";
import { queryClient, initializeCsrf } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Eager load only critical pages
import Login from "@/pages/Login";
import Studio from "@/pages/Studio";

// Optimized Studio (memoized components) - for A/B testing
const StudioOptimized = lazy(() => import("@/pages/StudioOptimized"));

// Lazy load all other pages to reduce initial bundle size
const Library = lazy(() => import("@/pages/Library"));
const Settings = lazy(() => import("@/pages/Settings"));
const ContentPlanner = lazy(() => import("@/pages/ContentPlanner"));
const SocialAccounts = lazy(() => import("@/pages/SocialAccounts"));
const ApprovalQueue = lazy(() => import("@/pages/ApprovalQueue"));
const TemplateAdmin = lazy(() => import("@/pages/TemplateAdmin"));
const SystemMap = lazy(() => import("@/pages/SystemMap"));
const NotFound = lazy(() => import("@/pages/not-found"));

// Loading fallback component
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      {/* Public route - Login */}
      <Route path="/login" component={Login} />

      {/* Protected routes */}
      <Route path="/">
        <ProtectedRoute>
          <Studio />
        </ProtectedRoute>
      </Route>

      {/* Phase 3: Consolidated Routes - Lazy Loaded */}
      <Route path="/library">
        <ProtectedRoute>
          <Suspense fallback={<PageLoader />}>
            <Library />
          </Suspense>
        </ProtectedRoute>
      </Route>

      <Route path="/settings">
        <ProtectedRoute>
          <Suspense fallback={<PageLoader />}>
            <Settings />
          </Suspense>
        </ProtectedRoute>
      </Route>

      {/* Content Planner - Strategic posting guide */}
      <Route path="/content-planner">
        <ProtectedRoute>
          <Suspense fallback={<PageLoader />}>
            <ContentPlanner />
          </Suspense>
        </ProtectedRoute>
      </Route>

      {/* Phase 8.1: Social Accounts Management */}
      <Route path="/social-accounts">
        <ProtectedRoute>
          <Suspense fallback={<PageLoader />}>
            <SocialAccounts />
          </Suspense>
        </ProtectedRoute>
      </Route>

      {/* Phase 8: Approval Queue */}
      <Route path="/approval-queue">
        <ProtectedRoute>
          <Suspense fallback={<PageLoader />}>
            <ApprovalQueue />
          </Suspense>
        </ProtectedRoute>
      </Route>

      {/* Legacy routes - redirect to consolidated pages */}
      <Route path="/gallery">
        <Redirect to="/?view=history" />
      </Route>

      <Route path="/generation/:id">
        {(params: { id: string }) => <Redirect to={`/?generation=${params.id}`} />}
      </Route>

      <Route path="/usage">
        <Redirect to="/settings?section=usage" />
      </Route>

      <Route path="/products">
        <Redirect to="/library?tab=products" />
      </Route>

      <Route path="/installation-scenarios">
        <Redirect to="/library?tab=scenarios" />
      </Route>

      <Route path="/brand-images">
        <Redirect to="/library?tab=brand-images" />
      </Route>

      <Route path="/template-library">
        <Redirect to="/library?tab=templates" />
      </Route>

      <Route path="/learn-from-winners">
        <Redirect to="/library?tab=patterns" />
      </Route>

      <Route path="/settings/api-keys">
        <Redirect to="/settings?section=api-keys" />
      </Route>

      <Route path="/brand-profile">
        <Redirect to="/settings" />
      </Route>

      <Route path="/templates">
        <Redirect to="/library?tab=scene-templates" />
      </Route>

      <Route path="/admin/templates">
        <ProtectedRoute>
          <Suspense fallback={<PageLoader />}>
            <TemplateAdmin />
          </Suspense>
        </ProtectedRoute>
      </Route>

      {/* Developer Tools */}
      <Route path="/system-map">
        <ProtectedRoute>
          <Suspense fallback={<PageLoader />}>
            <SystemMap />
          </Suspense>
        </ProtectedRoute>
      </Route>

      {/* Performance Testing: Optimized Studio with memoized components */}
      <Route path="/studio-v2">
        <ProtectedRoute>
          <Suspense fallback={<PageLoader />}>
            <StudioOptimized />
          </Suspense>
        </ProtectedRoute>
      </Route>

      <Route>
        <Suspense fallback={<PageLoader />}>
          <NotFound />
        </Suspense>
      </Route>
    </Switch>
  );
}

function App() {
  // Initialize CSRF token on app load
  useEffect(() => {
    initializeCsrf();
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <TooltipProvider>
              <Toaster />
              <SonnerToaster
                position="bottom-right"
                toastOptions={{
                  duration: 3000,
                  className: 'font-sans'
                }}
              />
              <Router />
            </TooltipProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
