// @ts-nocheck
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/components/ui/button';
import { RefreshCw, X } from 'lucide-react';

/**
 * PWA Update Prompt — Shows a banner when a new version is available.
 * Uses vite-plugin-pwa's registerType: 'prompt' pattern.
 */
export function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, r) {
      // Check for updates every hour
      if (r) {
        setInterval(() => {
          r.update();
        }, 60 * 60 * 1000);
      }
    },
  });

  if (!needRefresh) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg border border-border bg-background/95 backdrop-blur-sm p-4 shadow-lg max-w-sm"
      role="alert"
      aria-live="assertive"
    >
      <RefreshCw className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">New version available</p>
        <p className="text-xs text-muted-foreground">Click reload to update.</p>
      </div>
      <div className="flex gap-2 shrink-0">
        <Button
          size="sm"
          onClick={() => updateServiceWorker(true)}
          aria-label="Reload to update"
        >
          Reload
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setNeedRefresh(false)}
          aria-label="Dismiss update notification"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
