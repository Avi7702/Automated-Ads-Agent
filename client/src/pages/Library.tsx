import { lazy, Suspense, useState } from 'react';
import { useLibraryTabUrl } from '@/hooks/useUrlState';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { Package, ImageIcon, Layout, Layers, Sparkles, Grid3X3, Loader2, Settings2 } from 'lucide-react';

// Lazy load tab content for code splitting
const ProductLibrary = lazy(() => import('./ProductLibrary'));
const BrandImageLibrary = lazy(() => import('./BrandImageLibrary'));
const TemplateLibrary = lazy(() => import('./TemplateLibrary'));
const Templates = lazy(() => import('./Templates'));
const InstallationScenarios = lazy(() => import('./InstallationScenarios'));
const LearnFromWinners = lazy(() => import('./LearnFromWinners'));
const TemplateAdmin = lazy(() => import('./TemplateAdmin'));

const tabs = [
  { id: 'products', label: 'Products', icon: Package },
  { id: 'brand-images', label: 'Brand Images', icon: ImageIcon },
  { id: 'templates', label: 'Ad References', icon: Layout },
  { id: 'scene-templates', label: 'Gen Templates', icon: Grid3X3 },
  { id: 'scenarios', label: 'Scenarios', icon: Layers },
  { id: 'patterns', label: 'Patterns', icon: Sparkles },
] as const;

// Loading fallback
function TabLoading() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

/**
 * Library - Consolidated resource library page
 *
 * Combines 6 separate pages into a tabbed interface:
 * - Products (/products)
 * - Brand Images (/brand-images)
 * - Ad References (/template-library)
 * - Gen Templates (/templates)
 * - Scenarios (/installation-scenarios)
 * - Patterns (/learn-from-winners)
 *
 * URL state: /library?tab=products&item=:id
 */
export default function Library() {
  const { activeTab, setTab, selectedItemId } = useLibraryTabUrl();

  return (
    <div className="min-h-screen bg-background">
      <Header currentPage="library" />

      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Library</h1>
          <p className="text-muted-foreground">
            Manage your products, ad references, gen templates, and creative assets
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-flex">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="products" className="mt-6">
            <Suspense fallback={<TabLoading />}>
              <ProductLibraryContent selectedId={selectedItemId} />
            </Suspense>
          </TabsContent>

          <TabsContent value="brand-images" className="mt-6">
            <Suspense fallback={<TabLoading />}>
              <BrandImageLibraryContent selectedId={selectedItemId} />
            </Suspense>
          </TabsContent>

          <TabsContent value="templates" className="mt-6">
            <Suspense fallback={<TabLoading />}>
              <TemplateLibraryContent selectedId={selectedItemId} />
            </Suspense>
          </TabsContent>

          <TabsContent value="scene-templates" className="mt-6">
            <Suspense fallback={<TabLoading />}>
              <SceneTemplatesContent selectedId={selectedItemId} />
            </Suspense>
          </TabsContent>

          <TabsContent value="scenarios" className="mt-6">
            <Suspense fallback={<TabLoading />}>
              <ScenariosContent selectedId={selectedItemId} />
            </Suspense>
          </TabsContent>

          <TabsContent value="patterns" className="mt-6">
            <Suspense fallback={<TabLoading />}>
              <PatternsContent selectedId={selectedItemId} />
            </Suspense>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// Wrapper components that embed existing pages without their headers
// selectedId enables deep linking to specific items within each tab

function ProductLibraryContent({ selectedId }: { selectedId: string | null }) {
  return <ProductLibrary embedded selectedId={selectedId} />;
}

function BrandImageLibraryContent({ selectedId }: { selectedId: string | null }) {
  return <BrandImageLibrary embedded selectedId={selectedId} />;
}

function TemplateLibraryContent({ selectedId }: { selectedId: string | null }) {
  return <TemplateLibrary embedded selectedId={selectedId} />;
}

function SceneTemplatesContent({ selectedId }: { selectedId: string | null }) {
  const [adminMode, setAdminMode] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-end mb-4">
        <Button
          variant={adminMode ? 'default' : 'outline'}
          size="sm"
          className="gap-2"
          onClick={() => setAdminMode(!adminMode)}
        >
          <Settings2 className="w-4 h-4" />
          {adminMode ? 'Exit Admin Mode' : 'Admin Mode'}
        </Button>
      </div>
      {adminMode ? (
        <Suspense fallback={<TabLoading />}>
          <TemplateAdmin embedded />
        </Suspense>
      ) : (
        <Templates embedded selectedId={selectedId} />
      )}
    </div>
  );
}

function ScenariosContent({ selectedId }: { selectedId: string | null }) {
  return <InstallationScenarios embedded selectedId={selectedId} />;
}

function PatternsContent({ selectedId }: { selectedId: string | null }) {
  return <LearnFromWinners embedded selectedId={selectedId} />;
}
