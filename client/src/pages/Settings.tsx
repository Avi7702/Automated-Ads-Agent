import { lazy, Suspense } from 'react';
import { useSettingsSectionUrl } from '@/hooks/useUrlState';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { User, Key, BarChart3, Database, Target, Loader2, ChevronRight } from 'lucide-react';

// Lazy load section content for code splitting
const BrandProfile = lazy(() => import('./BrandProfile'));
const ApiKeySettings = lazy(() => import('./ApiKeySettings'));
const QuotaDashboard = lazy(() => import('./QuotaDashboard'));
const KnowledgeBaseSection = lazy(() =>
  import('@/components/settings/KnowledgeBaseSection').then((m) => ({ default: m.KnowledgeBaseSection })),
);
const StrategySection = lazy(() =>
  import('@/components/settings/StrategySection').then((m) => ({ default: m.StrategySection })),
);

const sections = [
  { id: 'brand', label: 'Brand Profile', icon: User, description: 'Manage your brand identity and voice' },
  {
    id: 'knowledge-base',
    label: 'Knowledge Base',
    icon: Database,
    description: 'Products, scenarios, and brand assets',
  },
  { id: 'api-keys', label: 'API Keys', icon: Key, description: 'Configure external service integrations' },
  { id: 'strategy', label: 'Strategy', icon: Target, description: 'Content strategy and product priorities' },
  { id: 'usage', label: 'Usage & Quotas', icon: BarChart3, description: 'Monitor API usage and costs' },
] as const;

// Loading fallback
function SectionLoading() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

/**
 * Settings - Consolidated settings/configuration page
 *
 * Combines 3 separate pages into a navigation + content layout:
 * - Brand Profile (/settings)
 * - API Keys (/settings/api-keys)
 * - Usage Dashboard (/usage)
 *
 * URL state: /settings?section=brand|api-keys|usage
 */
export default function Settings() {
  const { activeSection, setSection } = useSettingsSectionUrl();

  return (
    <div className="min-h-screen bg-background">
      <Header currentPage="settings" />

      <main className="container mx-auto px-4 py-6 md:py-8 stagger-container">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">Configure your account and preferences</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 min-h-0">
          {/* Navigation Sidebar */}
          <nav className="w-full lg:w-64 shrink-0">
            <div className="space-y-1">
              {sections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;

                return (
                  <Button
                    key={section.id}
                    variant={isActive ? 'secondary' : 'ghost'}
                    onClick={() => setSection(section.id)}
                    className={cn('w-full justify-start gap-3 h-auto py-3', isActive && 'bg-primary/10')}
                  >
                    <Icon className={cn('w-5 h-5', isActive && 'text-primary')} />
                    <div className="flex-1 text-left">
                      <p className={cn('font-medium', isActive && 'text-primary')}>{section.label}</p>
                      <p className="text-xs text-muted-foreground font-normal">{section.description}</p>
                    </div>
                    <ChevronRight className={cn('w-4 h-4 text-muted-foreground', isActive && 'text-primary')} />
                  </Button>
                );
              })}
            </div>
          </nav>

          {/* Content Area */}
          <div className="flex-1 min-w-0 min-h-0">
            <div className="bg-card rounded-lg border border-border p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
              <Suspense fallback={<SectionLoading />}>
                {activeSection === 'brand' && <BrandProfileContent />}
                {activeSection === 'knowledge-base' && <KnowledgeBaseSection />}
                {activeSection === 'strategy' && <StrategySection />}
                {activeSection === 'api-keys' && <ApiKeySettingsContent />}
                {activeSection === 'usage' && <QuotaDashboardContent />}
              </Suspense>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Wrapper components that embed existing pages without their headers
// These will be replaced with proper content extraction in future iterations

function BrandProfileContent() {
  return <BrandProfile embedded />;
}

function ApiKeySettingsContent() {
  return <ApiKeySettings embedded />;
}

function QuotaDashboardContent() {
  return <QuotaDashboard embedded />;
}
