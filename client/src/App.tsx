import { Switch, Route, Redirect, useLocation } from 'wouter';
import { lazy, Suspense, useEffect } from 'react';
import { queryClient, initializeCsrf } from './lib/queryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PWAUpdatePrompt } from '@/components/PWAUpdatePrompt';
import { GlobalChatButton } from '@/components/chat/GlobalChatButton';
import { OnboardingGate } from '@/components/onboarding/OnboardingGate';

// Eager load only critical pages
import Login from '@/pages/Login';
import Studio from '@/pages/Studio';

// Lazy load all other pages to reduce initial bundle size
const GalleryPage = lazy(() => import('@/pages/GalleryPage'));
const Pipeline = lazy(() => import('@/pages/Pipeline'));
const Library = lazy(() => import('@/pages/Library'));
const Settings = lazy(() => import('@/pages/Settings'));
const NotFound = lazy(() => import('@/pages/not-found'));

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

      {/* Unified Studio: 4 main routes */}
      <Route path="/gallery">
        <ProtectedRoute>
          <Suspense fallback={<PageLoader />}>
            <GalleryPage />
          </Suspense>
        </ProtectedRoute>
      </Route>

      <Route path="/pipeline">
        <ProtectedRoute>
          <Suspense fallback={<PageLoader />}>
            <Pipeline />
          </Suspense>
        </ProtectedRoute>
      </Route>

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

      {/* Legacy routes → Pipeline */}
      <Route path="/content-planner">
        <Redirect to="/pipeline?tab=planner" />
      </Route>

      <Route path="/approval-queue">
        <Redirect to="/pipeline?tab=approval" />
      </Route>

      <Route path="/social-accounts">
        <Redirect to="/pipeline?tab=accounts" />
      </Route>

      {/* Legacy routes → Studio / Settings */}
      <Route path="/generation/:id">{(params: { id: string }) => <Redirect to={`/?generation=${params.id}`} />}</Route>

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
        <Redirect to="/library?tab=scene-templates" />
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
  const [location] = useLocation();
  const showGlobalChat = location !== '/';

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
              <a href="#main-content" className="skip-to-content">
                Skip to main content
              </a>
              <Toaster
                position="bottom-right"
                toastOptions={{
                  duration: 3000,
                  className: 'font-sans',
                }}
              />
              <OnboardingGate>
                <main id="main-content">
                  <Router />
                </main>
              </OnboardingGate>
              <PWAUpdatePrompt />
              {showGlobalChat && <GlobalChatButton />}
            </TooltipProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
