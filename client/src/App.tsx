import { Switch, Route } from "wouter";
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
