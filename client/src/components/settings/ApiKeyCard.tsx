import { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Settings2,
  Trash2,
  RefreshCw,
  ExternalLink,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SERVICE_CONFIG } from "@/lib/apiKeyConfig";

export type ApiKeyStatus = "using_default" | "custom" | "invalid" | "not_configured";

export interface ApiKeyInfo {
  service: string;
  configured: boolean;
  source: "user" | "environment" | null;
  keyPreview: string | null;
  isValid: boolean | null;
  lastValidated: string | null;
}

interface ApiKeyCardProps {
  keyInfo: ApiKeyInfo;
  onEdit: () => void;
  onDelete: () => void;
  onValidate: () => void;
  isValidating?: boolean;
  isDeleting?: boolean;
}

function getStatus(keyInfo: ApiKeyInfo): ApiKeyStatus {
  if (!keyInfo.configured) {
    return "not_configured";
  }
  if (keyInfo.source === "environment") {
    return "using_default";
  }
  if (keyInfo.isValid === false) {
    return "invalid";
  }
  return "custom";
}

function getStatusBadge(status: ApiKeyStatus) {
  switch (status) {
    case "using_default":
      return (
        <Badge variant="secondary" className="gap-1">
          <Settings2 className="w-3 h-3" />
          Using Default
        </Badge>
      );
    case "custom":
      return (
        <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-700">
          <CheckCircle2 className="w-3 h-3" />
          Custom Key
        </Badge>
      );
    case "invalid":
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="w-3 h-3" />
          Invalid Key
        </Badge>
      );
    case "not_configured":
      return (
        <Badge variant="outline" className="gap-1 text-muted-foreground">
          <AlertCircle className="w-3 h-3" />
          Not Configured
        </Badge>
      );
  }
}

export function ApiKeyCard({
  keyInfo,
  onEdit,
  onDelete,
  onValidate,
  isValidating = false,
  isDeleting = false,
}: ApiKeyCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showKeyPreview, setShowKeyPreview] = useState(false);

  const config = SERVICE_CONFIG[keyInfo.service];
  if (!config) return null;

  const status = getStatus(keyInfo);
  const Icon = config.icon;
  const hasCustomKey = keyInfo.source === "user";
  const canDelete = hasCustomKey;
  const canValidate = hasCustomKey && keyInfo.configured;

  const handleDelete = () => {
    setShowDeleteConfirm(false);
    onDelete();
  };

  return (
    <>
      <Card
        className={cn(
          "transition-all duration-200",
          status === "invalid" && "border-destructive/50"
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "p-2 rounded-lg",
                  status === "custom" && "bg-green-500/10",
                  status === "using_default" && "bg-muted",
                  status === "invalid" && "bg-destructive/10",
                  status === "not_configured" && "bg-muted"
                )}
              >
                <Icon
                  className={cn(
                    "w-5 h-5",
                    status === "custom" && "text-green-500",
                    status === "using_default" && "text-muted-foreground",
                    status === "invalid" && "text-destructive",
                    status === "not_configured" && "text-muted-foreground"
                  )}
                />
              </div>
              <div>
                <CardTitle className="text-base">{config.displayName}</CardTitle>
                <CardDescription className="text-xs">
                  {config.description}
                </CardDescription>
              </div>
            </div>
            {getStatusBadge(status)}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Key Preview */}
          {keyInfo.keyPreview && hasCustomKey && (
            <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50 font-mono text-sm">
              <span className="text-muted-foreground">
                {showKeyPreview
                  ? keyInfo.keyPreview
                  : keyInfo.keyPreview.length > 8
                    ? `${keyInfo.keyPreview.slice(0, 4)}${"•".repeat(8)}${keyInfo.keyPreview.slice(-4)}`
                    : "••••••••••••"}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 ml-auto"
                onClick={() => setShowKeyPreview(!showKeyPreview)}
              >
                {showKeyPreview ? (
                  <EyeOff className="w-3 h-3" />
                ) : (
                  <Eye className="w-3 h-3" />
                )}
              </Button>
            </div>
          )}

          {/* Last Validated */}
          {keyInfo.lastValidated && hasCustomKey && (
            <p className="text-xs text-muted-foreground">
              Last validated:{" "}
              {new Date(keyInfo.lastValidated).toLocaleString()}
            </p>
          )}

          {/* Invalid Key Warning */}
          {status === "invalid" && (
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive">
                This API key is invalid or has been revoked.{" "}
                <a
                  href={config.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:no-underline"
                >
                  Generate a new key
                </a>
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2">
            <Button
              variant={hasCustomKey ? "outline" : "default"}
              size="sm"
              onClick={onEdit}
              className="flex-1"
            >
              {hasCustomKey ? "Edit Key" : "Add Key"}
            </Button>

            {canValidate && (
              <Button
                variant="outline"
                size="sm"
                onClick={onValidate}
                disabled={isValidating}
                aria-label={`Validate ${config.displayName} API key`}
              >
                {isValidating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </Button>
            )}

            {canDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isDeleting}
                className="text-destructive hover:text-destructive"
                aria-label={`Delete ${config.displayName} API key`}
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </Button>
            )}
          </div>

          {/* Docs Link */}
          <a
            href={config.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            View Documentation
          </a>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Custom API Key?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove your custom {config.displayName} API key. The
              system will fall back to using the default environment key if
              available.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default ApiKeyCard;
