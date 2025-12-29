import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Studio from "@/pages/Studio";
import Gallery from "@/pages/Gallery";
import GenerationDetail from "@/pages/GenerationDetail";
import BrandProfile from "@/pages/BrandProfile";
import Templates from "@/pages/Templates";
import TemplateAdmin from "@/pages/TemplateAdmin";

function Router() {
  return (
    <Switch>
      {/* Main Studio - the unified workspace */}
      <Route path="/" component={Studio} />

      {/* Gallery for browsing all generations */}
      <Route path="/gallery" component={Gallery} />

      {/* Generation details (accessed from gallery or after generation) */}
      <Route path="/generation/:id" component={GenerationDetail} />

      {/* Settings pages */}
      <Route path="/settings" component={BrandProfile} />
      <Route path="/brand-profile" component={BrandProfile} />

      {/* Legacy routes - redirect to Studio */}
      <Route path="/library">
        <Redirect to="/" />
      </Route>
      <Route path="/prompts">
        <Redirect to="/" />
      </Route>

      {/* Templates (still needed for template management) */}
      <Route path="/templates" component={Templates} />
      <Route path="/admin/templates" component={TemplateAdmin} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
