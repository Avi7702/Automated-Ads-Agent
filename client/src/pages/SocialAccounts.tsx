import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';

interface SocialAccountsProps {
  embedded?: boolean;
}
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ConnectedAccountCard } from '@/components/social/ConnectedAccountCard';
import { useToast } from '@/hooks/use-toast';
import { SocialConnection } from '@/types/social';
import { RefreshCw, Link as LinkIcon, AlertCircle, ExternalLink } from 'lucide-react';

export default function SocialAccounts({ embedded = false }: SocialAccountsProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
        toast({
          title: 'Accounts Refreshed',
          description: 'Successfully refreshed your social media accounts.',
          variant: 'default',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load social accounts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchAccounts();
  }, []);

  // Handle refresh button
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

      toast({
        title: 'Account Disconnected',
        description: 'Social media account has been disconnected.',
        variant: 'default',
      });

      // Reload accounts
      await fetchAccounts();
    } catch (error: any) {
      toast({
        title: 'Disconnect Failed',
        description: error.message || 'Failed to disconnect account',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className={embedded ? '' : 'min-h-screen bg-background'}>
      {!embedded && <Header currentPage="settings" />}

      <main className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">Social Media Accounts</h1>
              <p className="text-muted-foreground mt-1">
                Manage your social media accounts connected via n8n for automated posting
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
          <div
            className="space-y-4"
            role="status"
            aria-live="polite"
            aria-busy="true"
            aria-label="Loading social accounts"
          >
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Connected Accounts */}
            {accounts.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <LinkIcon className="w-5 h-5" />
                  Connected Accounts ({accounts.length})
                </h2>

                {/* All Connected Accounts */}
                {accounts.map((account) => (
                  <ConnectedAccountCard key={account.id} account={account} onDisconnect={handleDisconnect} />
                ))}
              </div>
            )}

            {/* Empty state */}
            {accounts.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="p-3 rounded-full bg-muted inline-flex mb-4">
                    <LinkIcon className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No Connected Accounts</h3>
                  <p className="text-muted-foreground mb-6">
                    Configure OAuth in n8n and sync your accounts to start posting content automatically.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* n8n Setup Instructions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Connect Social Media Accounts via n8n</CardTitle>
                <CardDescription>
                  OAuth authentication is managed through n8n for security and ease of use
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Setup instructions */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm">Setup Instructions:</h3>
                    <ol className="list-decimal list-inside space-y-3 text-sm">
                      <li className="pl-2">
                        <span className="font-medium">Configure OAuth in n8n</span>
                        <p className="ml-6 mt-1 text-muted-foreground">
                          Go to n8n → Settings → Credentials → Add Credential, then select the platform you want to
                          connect (LinkedIn, Instagram, Facebook, etc.)
                        </p>
                      </li>
                      <li className="pl-2">
                        <span className="font-medium">Complete OAuth flow</span>
                        <p className="ml-6 mt-1 text-muted-foreground">
                          Click "Connect my account" in n8n and authorize the application
                        </p>
                      </li>
                      <li className="pl-2">
                        <span className="font-medium">Sync accounts to this app</span>
                        <p className="ml-6 mt-1 text-muted-foreground">
                          Accounts will be synced automatically once the integration is complete
                        </p>
                      </li>
                    </ol>
                  </div>

                  {/* Sync button */}
                  <div className="flex gap-3">
                    {/* TODO: Wire to /api/social/sync-accounts when n8n sync is implemented */}
                    <Button variant="outline" className="gap-2" asChild>
                      <a
                        href="https://docs.n8n.io/integrations/builtin/credentials/"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="w-4 h-4" />
                        n8n Documentation
                      </a>
                    </Button>
                  </div>

                  {/* Supported platforms */}
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex gap-3">
                      <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="space-y-2 text-sm">
                        <p className="font-medium text-blue-900 dark:text-blue-100">Supported Platforms:</p>
                        <ul className="list-disc list-inside space-y-1 text-blue-800 dark:text-blue-200">
                          <li>
                            <strong>LinkedIn:</strong> Personal profiles and company pages supported
                          </li>
                          <li>
                            <strong>Instagram:</strong> Business or Creator accounts only (via Facebook Graph API)
                          </li>
                          <li>
                            <strong>Facebook:</strong> Pages and groups
                          </li>
                          <li>
                            <strong>Twitter/X:</strong> Standard and premium API tiers
                          </li>
                          <li>
                            <strong>TikTok:</strong> Business accounts
                          </li>
                          <li>
                            <strong>YouTube:</strong> Channels
                          </li>
                          <li>
                            <strong>Pinterest:</strong> Business accounts
                          </li>
                        </ul>
                        <p className="mt-3 text-blue-800 dark:text-blue-200">
                          <strong>Note:</strong> n8n automatically handles token refresh and expiration, so you don't
                          need to worry about re-authorizing.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
