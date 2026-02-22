import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { SocialConnection } from '@/types/social';
import { Unplug, AlertTriangle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface ConnectedAccountCardProps {
  readonly account: SocialConnection;
  readonly onDisconnect: (id: string) => Promise<void>;
  readonly onRefreshToken: (id: string) => Promise<void>;
}

export function ConnectedAccountCard({ account, onDisconnect, onRefreshToken }: ConnectedAccountCardProps) {
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await onDisconnect(account.id);
    } finally {
      setIsDisconnecting(false);
      setShowDisconnectDialog(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefreshToken(account.id);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Platform-specific styling
  const platformConfig: Record<
    string,
    { icon: React.ElementType | null; iconColor: string; bgColor: string; borderColor: string; label: string }
  > = {
    linkedin: {
      icon: LucideIcons.LinkedinIcon,
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-800',
      label: 'LinkedIn',
    },
    instagram: {
      icon: LucideIcons.InstagramIcon,
      iconColor: 'text-pink-600',
      bgColor: 'bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20',
      borderColor: 'border-pink-200 dark:border-pink-800',
      label: 'Instagram',
    },
    facebook: {
      icon: null,
      iconColor: 'text-blue-700',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-800',
      label: 'Facebook',
    },
    twitter: {
      icon: null,
      iconColor: 'text-sky-500',
      bgColor: 'bg-sky-50 dark:bg-sky-900/20',
      borderColor: 'border-sky-200 dark:border-sky-800',
      label: 'Twitter/X',
    },
    tiktok: {
      icon: null,
      iconColor: 'text-black dark:text-white',
      bgColor: 'bg-gray-50 dark:bg-gray-900/20',
      borderColor: 'border-gray-200 dark:border-gray-800',
      label: 'TikTok',
    },
    youtube: {
      icon: null,
      iconColor: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-200 dark:border-red-800',
      label: 'YouTube',
    },
    pinterest: {
      icon: null,
      iconColor: 'text-red-700',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-200 dark:border-red-800',
      label: 'Pinterest',
    },
  };

  // Text fallbacks for platforms without lucide-react icons
  const platformEmoji: Record<string, string> = {
    facebook: '📘',
    twitter: '𝕏',
    tiktok: '🎵',
    youtube: '▶',
    pinterest: '📌',
  };

  const config = platformConfig[account.platform] ?? platformConfig['linkedin'];
  const Icon = config?.icon ?? null;
  const emoji = platformEmoji[account.platform];

  // Compute status from existing fields
  const computeStatus = (): 'active' | 'error' | 'inactive' | 'expiring' => {
    if (!account.isActive) return 'inactive';

    // Check for recent errors (within 24h)
    if (account.lastErrorAt) {
      const errorAge = Date.now() - new Date(account.lastErrorAt).getTime();
      if (errorAge < 24 * 60 * 60 * 1000) return 'error';
    }

    // Check token expiration
    const expiresAt = new Date(account.tokenExpiresAt);
    const daysUntilExpiry = Math.floor((expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000));

    if (daysUntilExpiry < 0) return 'error'; // Expired
    if (daysUntilExpiry <= 7) return 'expiring'; // Warning state

    return 'active';
  };

  const status = computeStatus();

  return (
    <>
      <Card className={`${config?.borderColor ?? ''} border-2`}>
        <CardContent className={`p-6 ${config?.bgColor ?? ''}`}>
          <div className="flex flex-col gap-4">
            {/* Header with icon and platform */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white dark:bg-gray-800 shadow-sm">
                  {Icon ? (
                    <Icon className={`w-6 h-6 ${config?.iconColor ?? ''}`} />
                  ) : (
                    <span className={`text-xl font-bold ${config?.iconColor ?? ''}`}>{emoji}</span>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{config?.label ?? account.platform}</h3>
                  <p className="text-sm text-muted-foreground">
                    {account.platformUsername ?? account.platformUserId ?? 'Unknown Account'}
                  </p>
                </div>
              </div>

              {/* Status badge */}
              <div>
                {status === 'active' ? (
                  <Badge variant="outline" className="gap-1 border-green-500 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="w-3 h-3" />
                    Active
                  </Badge>
                ) : status === 'expiring' ? (
                  <Badge variant="outline" className="gap-1 border-orange-500 text-orange-600 dark:text-orange-400">
                    <AlertTriangle className="w-3 h-3" />
                    Token Expiring Soon
                  </Badge>
                ) : status === 'error' ? (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Error
                  </Badge>
                ) : (
                  <Badge variant="outline">Inactive</Badge>
                )}
              </div>
            </div>

            {/* Account details */}
            <div className="space-y-2 text-sm">
              {account.accountType && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Account Type:</span>
                  <Badge variant="secondary" className="capitalize">
                    {account.accountType}
                  </Badge>
                </div>
              )}

              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Connected:</span>
                <span className="font-medium">{format(parseISO(account.connectedAt), 'MMM d, yyyy')}</span>
              </div>

              {account.lastUsedAt && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Last Used:</span>
                  <span className="font-medium">{format(parseISO(account.lastUsedAt), 'MMM d, yyyy h:mm a')}</span>
                </div>
              )}

              {account.lastErrorAt && account.lastErrorMessage && (
                <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200 dark:border-red-800">
                  <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">
                      Last Error ({format(parseISO(account.lastErrorAt), 'MMM d, h:mm a')}):
                    </p>
                    <p className="text-sm text-red-600 dark:text-red-400">{account.lastErrorMessage}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing || isDisconnecting}
                className="gap-2"
              >
                {isRefreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {isRefreshing ? 'Refreshing...' : 'Refresh Token'}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDisconnectDialog(true)}
                disabled={isDisconnecting || isRefreshing}
                className="gap-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              >
                <Unplug className="w-4 h-4" />
                Disconnect
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Disconnect confirmation dialog */}
      <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect {config?.label ?? account.platform} Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the reference to your {config?.label ?? account.platform} account{' '}
              {account.platformUsername && `(@${account.platformUsername})`} from this application.
              <br />
              <br />
              Scheduled posts using this account will fail until you reconnect.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDisconnecting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDisconnecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Disconnecting...
                </>
              ) : (
                'Disconnect'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
