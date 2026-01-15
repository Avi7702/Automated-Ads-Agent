import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Package,
  Layout,
  ImageIcon,
  Layers,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import { ProductsTab } from './tabs/ProductsTab';
import { TemplatesTab } from './tabs/TemplatesTab';
import { BrandAssetsTab } from './tabs/BrandAssetsTab';
import { ScenariosTab } from './tabs/ScenariosTab';
import { PatternsTab } from './tabs/PatternsTab';

interface AssetDrawerProps {
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}

const tabs = [
  { id: 'products', label: 'Products', icon: Package },
  { id: 'templates', label: 'Templates', icon: Layout },
  { id: 'brand', label: 'Brand', icon: ImageIcon },
  { id: 'scenarios', label: 'Scenarios', icon: Layers },
  { id: 'patterns', label: 'Patterns', icon: Sparkles },
] as const;

type TabId = (typeof tabs)[number]['id'];

export function AssetDrawer({ isOpen, onToggle, className }: AssetDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabId>('products');

  return (
    <div
      className={cn(
        'flex flex-col bg-card border-r border-border transition-all duration-300',
        isOpen ? 'w-80' : 'w-12',
        className
      )}
    >
      {/* Header with toggle */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        {isOpen && (
          <h2 className="text-sm font-medium text-foreground">Assets</h2>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className={cn('h-8 w-8', !isOpen && 'mx-auto')}
        >
          {isOpen ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Collapsed state - just icons */}
      {!isOpen && (
        <div className="flex flex-col items-center gap-2 py-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => {
                  setActiveTab(tab.id);
                  onToggle();
                }}
                title={tab.label}
                className="h-8 w-8"
              >
                <Icon className="h-4 w-4" />
              </Button>
            );
          })}
        </div>
      )}

      {/* Expanded state - full tabs */}
      {isOpen && (
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as TabId)}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="w-full justify-start px-3 pt-3 bg-transparent gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex-1 gap-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="products" className="m-0 p-3 h-full">
              <ProductsTab />
            </TabsContent>

            <TabsContent value="templates" className="m-0 p-3 h-full">
              <TemplatesTab />
            </TabsContent>

            <TabsContent value="brand" className="m-0 p-3 h-full">
              <BrandAssetsTab />
            </TabsContent>

            <TabsContent value="scenarios" className="m-0 p-3 h-full">
              <ScenariosTab />
            </TabsContent>

            <TabsContent value="patterns" className="m-0 p-3 h-full">
              <PatternsTab />
            </TabsContent>
          </div>
        </Tabs>
      )}
    </div>
  );
}
