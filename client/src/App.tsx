import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
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
import SystemMap from "@/pages/SystemMap";
import ApiKeySettings from "@/pages/ApiKeySettings";
import LearnFromWinners from "@/pages/LearnFromWinners";
// Phase 3 consolidated pages
import Library from "@/pages/Library";
import Settings from "@/pages/Settings";
// Content Planner
import ContentPlanner from "@/pages/ContentPlanner";

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

      {/* Phase 3: Consolidated Routes */}
      <Route path="/library">
        <ProtectedRoute>
          <Library />
        </ProtectedRoute>
      </Route>

      <Route path="/settings">
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
      </Route>

      {/* Content Planner - Strategic posting guide */}
      <Route path="/content-planner">
        <ProtectedRoute>
          <ContentPlanner />
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
