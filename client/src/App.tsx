import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Gallery from "@/pages/Gallery";
import GenerationDetail from "@/pages/GenerationDetail";
import ProductLibrary from "@/pages/ProductLibrary";
import PromptTemplatesManager from "@/pages/PromptTemplatesManager";
import BrandProfile from "@/pages/BrandProfile";
import Templates from "@/pages/Templates";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/library" component={ProductLibrary} />
      <Route path="/prompts" component={PromptTemplatesManager} />
      <Route path="/templates" component={Templates} />
      <Route path="/gallery" component={Gallery} />
      <Route path="/brand-profile" component={BrandProfile} />
      <Route path="/generation/:id" component={GenerationDetail} />
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
