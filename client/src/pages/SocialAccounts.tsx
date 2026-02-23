import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ConnectedAccountCard } from '@/components/social/ConnectedAccountCard';
import { toast } from 'sonner';
import type { SocialConnection } from '@/types/social';
import { RefreshCw, Link as LinkIcon, LinkedinIcon } from 'lucide-react';

interface SocialAccountsProps {
  readonly embedded?: boolean;
}

// Platform connect card config
interface PlatformConfig {
  readonly key: string;
  readonly label: string;
  readonly icon: React.ElementType | null;
  readonly iconColor: string;
  readonly bgColor: string;
  readonly borderColor: string;
  readonly available: boolean;
}

const PLATFORM_CONFIGS: PlatformConfig[] = [
  {
    key: 'linkedin',
    label: 'LinkedIn',
    icon: LinkedinIcon,
    iconColor: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    available: true,
  },
  {
    key: 'twitter',
    label: 'Twitter / X',
    icon: null, // No Twitter icon in lucide-react; use text fallback
    iconColor: 'text-sky-500',
    bgColor: 'bg-sky-50 dark:bg-sky-900/20',
    borderColor: 'border-sky-200 dark:border-sky-800',
    available: true,
  },
  {
    key: 'instagram',
    label: 'Instagram',
    icon: null,
    iconColor: 'text-pink-600',
    bgColor: 'bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20',
    borderColor: 'border-pink-200 dark:border-pink-800',
    available: false,
  },
  {
    key: 'facebook',
    label: 'Facebook',
    icon: null,
    iconColor: 'text-blue-700',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-300 dark:border-blue-700',
    available: false,
  },
];

// Text fallbacks for platforms without lucide-react icons
const PLATFORM_EMOJI: Record<string, string> = {
  twitter: '𝕏',
  instagram: '📷',
  facebook: '📘',
};

export default function SocialAccounts({ embedded = false }: SocialAccountsProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<SocialConnection[]>([]);

  // Fetch connected accounts
  const fetchAccounts = async (showToast = false) => {
    try {
      setLoading(true);

      const response = await fetch('/api/social/accounts', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch social accounts');
      }

      const data = await response.json();
      setAccounts(data.accounts || []);

      if (showToast) {
        toast.success('Accounts Refreshed', {
          description: 'Successfully refreshed your social media accounts.',
        });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load social accounts';
      toast.error('Error', {
        description: message,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load + check for ?connected= URL param
  useEffect(() => {
    const params = new URLSearchParams(globalThis.location.search);
    const connectedPlatform = params.get('connected');
    if (connectedPlatform) {
      const platformLabel = PLATFORM_CONFIGS.find((p) => p.key === connectedPlatform)?.label ?? connectedPlatform;
      toast.success('Account Connected', {
        description: `${platformLabel} account connected successfully.`,
      });
      // Strip ?connected= from the URL without triggering a reload
      const cleanUrl = globalThis.location.pathname + globalThis.location.hash;
      globalThis.history.replaceState(null, '', cleanUrl);
    }
    void fetchAccounts();
  }, []);

  // Handle refresh all button
  const handleRefreshAll = async () => {
    setRefreshing(true);
    await fetchAccounts(true);
  };

  // Disconnect account
  const handleDisconnect = async (accountId: string) => {
    try {
      const response = await fetch(`/api/social/accounts/${accountId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to disconnect account');
      }

      toast.success('Account Disconnected', {
        description: 'Social media account has been disconnected.',
      });

      await fetchAccounts();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to disconnect account';
      toast.error('Disconnect Failed', {
        description: message,
      });
    }
  };

  // Refresh a single account token
  const handleRefreshToken = async (accountId: string) => {
    try {
      const response = await fetch(`/api/social/accounts/${accountId}/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to refresh token');
      }

      toast.success('Token Refreshed', {
        description: 'Account token refreshed successfully.',
      });

      await fetchAccounts();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to refresh token';
      toast.error('Refresh Failed', {
        description: message,
      });
    }
  };

  // Initiate OAuth connect flow
  const handleConnect = async (platform: string) => {
    setConnecting(platform);
    try {
      const response = await fetch(`/api/social/oauth/${platform}/authorize`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to start ${platform} OAuth`);
      }

      const data = await response.json();
      if (!data.authUrl) {
        throw new Error('No authorization URL returned from server');
      }

      // Redirect user to the OAuth provider
      globalThis.location.href = data.authUrl;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : `Failed to connect ${platform}`;
      toast.error('Connection Failed', {
        description: message,
      });
      setConnecting(null);
    }
  };

  return (
    <div className={embedded ? '' : 'min-h-screen bg-background'}>
      {!embedded && <Header currentPage="settings" />}

      <main className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Page header */}
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">Social Media Accounts</h1>
              <p className="text-muted-foreground mt-1">
                Connect your social media accounts to publish content directly from this app.
              </p>
            </div>
            <Button
              onClick={handleRefreshAll}
              variant="outline"
              size="sm"
              disabled={loading || refreshing}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>

        {/* Loading state */}
        {loading ? (
          <output className="space-y-4 block" aria-live="polite" aria-busy="true" aria-label="Loading social accounts">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-32 w-full" />
          </output>
        ) : (
          <div className="space-y-8">
            {/* Connect a Social Account */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Connect a Social Account</CardTitle>
                <CardDescription>
                  Authorize this app to post on your behalf. You can connect multiple accounts.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {PLATFORM_CONFIGS.map((platform) => {
                    const Icon = platform.icon;
                    const emoji = PLATFORM_EMOJI[platform.key];
                    const isConnecting = connecting === platform.key;

                    return (
                      <div
                        key={platform.key}
                        className={`rounded-lg border-2 p-4 flex flex-col items-center gap-3 ${platform.borderColor} ${platform.bgColor}`}
                      >
                        {/* Platform icon */}
                        <div className="p-2 rounded-lg bg-white dark:bg-gray-800 shadow-sm">
                          {Icon ? (
                            <Icon className={`w-6 h-6 ${platform.iconColor}`} />
                          ) : (
                            <span className={`text-xl font-bold ${platform.iconColor}`}>{emoji}</span>
                          )}
                        </div>

                        <span className="font-medium text-sm text-center">{platform.label}</span>

                        {platform.available ? (
                          <Button
                            size="sm"
                            className="w-full"
                            disabled={isConnecting}
                            onClick={() => handleConnect(platform.key)}
                          >
                            {isConnecting ? (
                              <>
                                <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                                Connecting...
                              </>
                            ) : (
                              `Connect ${platform.label}`
                            )}
                          </Button>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            Coming Soon
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Connected Accounts */}
            {accounts.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <LinkIcon className="w-5 h-5" />
                  Connected Accounts ({accounts.length})
                </h2>

                {accounts.map((account) => (
                  <ConnectedAccountCard
                    key={account.id}
                    account={account}
                    onDisconnect={handleDisconnect}
                    onRefreshToken={handleRefreshToken}
                  />
                ))}
              </div>
            )}

            {/* Empty state — only shown when no accounts */}
            {accounts.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="p-3 rounded-full bg-muted inline-flex mb-4">
                    <LinkIcon className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No Connected Accounts</h3>
                  <p className="text-muted-foreground">
                    Use the connect buttons above to link your social media accounts.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
