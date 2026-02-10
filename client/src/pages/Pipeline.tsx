import { lazy, Suspense, useMemo } from 'react';
import { useSearch } from 'wouter';
import { Header } from '@/components/layout/Header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarDays, CheckCircle, Share2, Calendar } from 'lucide-react';

const ContentPlanner = lazy(() => import('@/pages/ContentPlanner'));
const ApprovalQueue = lazy(() => import('@/pages/ApprovalQueue'));
const SocialAccounts = lazy(() => import('@/pages/SocialAccounts'));
const CalendarView = lazy(() => import('@/components/calendar/CalendarView'));

function TabLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

type PipelineTab = 'planner' | 'calendar' | 'approval' | 'accounts';

const TAB_CONFIG = [
  { id: 'planner' as const, label: 'Content Planner', icon: CalendarDays },
  { id: 'calendar' as const, label: 'Calendar', icon: Calendar },
  { id: 'approval' as const, label: 'Approval Queue', icon: CheckCircle },
  { id: 'accounts' as const, label: 'Social Accounts', icon: Share2 },
];

export default function Pipeline() {
  const search = useSearch();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const activeTab = (params.get('tab') as PipelineTab) || 'planner';

  return (
    <div className="min-h-screen bg-background">
      <Header currentPage="pipeline" />
      <div className="container px-4 md:px-6 py-4 md:py-6">
        <Tabs value={activeTab} className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-4 mb-6">
            {TAB_CONFIG.map(({ id, label, icon: Icon }) => (
              <TabsTrigger
                key={id}
                value={id}
                onClick={() => {
                  const url = new URL(window.location.href);
                  url.searchParams.set('tab', id);
                  window.history.replaceState(null, '', url.toString());
                }}
                className="gap-2"
              >
                <Icon className="h-4 w-4 hidden sm:block" />
                <span className="text-xs sm:text-sm">{label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="planner">
            <Suspense fallback={<TabLoader />}>
              <ContentPlanner embedded />
            </Suspense>
          </TabsContent>

          <TabsContent value="calendar">
            <Suspense fallback={<TabLoader />}>
              <CalendarView />
            </Suspense>
          </TabsContent>

          <TabsContent value="approval">
            <Suspense fallback={<TabLoader />}>
              <ApprovalQueue embedded />
            </Suspense>
          </TabsContent>

          <TabsContent value="accounts">
            <Suspense fallback={<TabLoader />}>
              <SocialAccounts embedded />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
