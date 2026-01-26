import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, KeyRound, ShieldCheck, Info, Webhook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Header } from "@/components/layout/Header";
import { ApiKeyCard, type ApiKeyInfo } from "@/components/settings/ApiKeyCard";
import { ApiKeyForm } from "@/components/settings/ApiKeyForm";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { SUPPORTED_SERVICES } from "@/lib/apiKeyConfig";

interface ApiKeysResponse {
  keys: ApiKeyInfo[];
}

interface ApiKeySettingsProps {
  embedded?: boolean;
}

export default function ApiKeySettings({ embedded = false }: ApiKeySettingsProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Form state
  const [editingService, setEditingService] = useState<string | null>(null);
  const [validatingService, setValidatingService] = useState<string | null>(null);
  const [deletingService, setDeletingService] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);

  // n8n Configuration state (Phase 8.1)
  const [n8nConfig, setN8nConfig] = useState({ baseUrl: '', apiKey: '' });
  const [savingN8n, setSavingN8n] = useState(false);

  // Fetch all API keys status
  const {
    data: keysData,
    isLoading,
    error,
  } = useQuery<ApiKeysResponse>({
    queryKey: ["/api/settings/api-keys"],
    refetchOnWindowFocus: true,
  });

  // Fetch n8n configuration (Phase 8.1)
  const { data: n8nData } = useQuery({
    queryKey: ["/api/settings/n8n"],
    refetchOnWindowFocus: true,
    onSuccess: (data: any) => {
      if (data?.configured) {
        setN8nConfig({
          baseUrl: data.baseUrl || '',
          apiKey: '', // Never populate from API for security
        });
      }
    },
  });

  // Save API key mutation
  const saveMutation = useMutation({
    mutationFn: async ({
      service,
      data,
    }: {
      service: string;
      data: Record<string, string>;
    }) => {
      const response = await apiRequest(
        "POST",
        `/api/settings/api-keys/${service}`,
        data
      );
      return response.json();
    },
    onSuccess: (data, variables) => {
      setFormSuccess(true);
      setFormError(null);
      queryClient.invalidateQueries({ queryKey: ["/api/settings/api-keys"] });
      toast({
        title: "API Key Saved",
        description: `Your ${variables.service} API key has been saved and validated.`,
      });
      // Close dialog after a brief delay to show success
      setTimeout(() => {
        setEditingService(null);
        setFormSuccess(false);
      }, 1500);
    },
    onError: (error: Error) => {
      setFormError(error.message);
      setFormSuccess(false);
    },
  });

  // Validate API key mutation
  const validateMutation = useMutation({
    mutationFn: async (service: string) => {
      setValidatingService(service);
      const response = await apiRequest(
        "POST",
        `/api/settings/api-keys/${service}/validate`,
        {}
      );
      return response.json();
    },
    onSuccess: (data, service) => {
      setValidatingService(null);
      queryClient.invalidateQueries({ queryKey: ["/api/settings/api-keys"] });
      if (data.isValid) {
        toast({
          title: "Key Valid",
          description: `Your ${service} API key is working correctly.`,
        });
      } else {
        toast({
          title: "Key Invalid",
          description: data.error || `Your ${service} API key is no longer valid.`,
          variant: "destructive",
        });
      }
    },
    onError: (error: Error, service) => {
      setValidatingService(null);
      toast({
        title: "Validation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete API key mutation
  const deleteMutation = useMutation({
    mutationFn: async (service: string) => {
      setDeletingService(service);
      const response = await apiRequest(
        "DELETE",
        `/api/settings/api-keys/${service}`
      );
      return response.json();
    },
    onSuccess: (data, service) => {
      setDeletingService(null);
      queryClient.invalidateQueries({ queryKey: ["/api/settings/api-keys"] });
      toast({
        title: "Key Removed",
        description: `Your custom ${service} API key has been removed.`,
      });
    },
    onError: (error: Error, service) => {
      setDeletingService(null);
      toast({
        title: "Deletion Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEdit = (service: string) => {
    setFormError(null);
    setFormSuccess(false);
    setEditingService(service);
  };

  const handleSave = async (service: string, data: Record<string, string>) => {
    setFormError(null);
    setFormSuccess(false);
    await saveMutation.mutateAsync({ service, data });
  };

  const handleCloseForm = () => {
    setEditingService(null);
    setFormError(null);
    setFormSuccess(false);
  };

  // Handle n8n configuration save (Phase 8.1)
  const saveN8nConfig = async () => {
    if (!n8nConfig.baseUrl) {
      toast({
        title: "Validation Error",
        description: "n8n instance URL is required",
        variant: "destructive",
      });
      return;
    }

    setSavingN8n(true);
    try {
      const response = await apiRequest("POST", "/api/settings/n8n", n8nConfig);
      const data = await response.json();

      if (data.success) {
        toast({
          title: "n8n Configuration Saved",
          description: "Your n8n configuration has been saved securely",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/settings/n8n"] });
        setN8nConfig({ ...n8nConfig, apiKey: '' }); // Clear API key field after save
      } else {
        throw new Error(data.error || "Failed to save n8n configuration");
      }
    } catch (error: any) {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save n8n configuration",
        variant: "destructive",
      });
    } finally {
      setSavingN8n(false);
    }
  };

  // Build keys map for easy lookup
  const keysMap = new Map<string, ApiKeyInfo>();
  keysData?.keys.forEach((key) => keysMap.set(key.service, key));

  // Create default key info for services not returned by API
  const getKeyInfo = (service: string): ApiKeyInfo => {
    return (
      keysMap.get(service) || {
        service,
        configured: false,
        source: null,
        keyPreview: null,
        isValid: null,
        lastValidated: null,
      }
    );
  };

  const editingKeyInfo = editingService ? getKeyInfo(editingService) : null;

  // Content shared between embedded and standalone modes
  const content = (
    <>
      {/* Security Notice */}
      <Alert className="mb-8">
        <ShieldCheck className="h-4 w-4" />
        <AlertTitle>Security</AlertTitle>
        <AlertDescription>
          Your API keys are encrypted with AES-256-GCM before storage. Keys
          are never logged or exposed in API responses after saving.
        </AlertDescription>
      </Alert>

        {/* Error State */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <Info className="h-4 w-4" />
            <AlertTitle>Error Loading Keys</AlertTitle>
            <AlertDescription>
              {error instanceof Error
                ? error.message
                : "Failed to load API keys. Please try again."}
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="grid gap-4 md:grid-cols-2">
            {SUPPORTED_SERVICES.map((service) => (
              <div key={service} className="rounded-xl border bg-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </div>
        )}

        {/* API Key Cards */}
        {!isLoading && !error && (
          <div className="grid gap-4 lg:grid-cols-2">
            {SUPPORTED_SERVICES.map((service) => (
              <ApiKeyCard
                key={service}
                keyInfo={getKeyInfo(service)}
                onEdit={() => handleEdit(service)}
                onDelete={() => deleteMutation.mutate(service)}
                onValidate={() => validateMutation.mutate(service)}
                isValidating={validatingService === service}
                isDeleting={deletingService === service}
              />
            ))}
          </div>
        )}

      {/* n8n Configuration - Phase 8.1 */}
      <div className="mt-8 p-6 rounded-xl border bg-card">
        <div className="flex items-center gap-2 mb-4">
          <Webhook className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">n8n Automation</h2>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Configure your n8n instance for multi-platform social media posting.
          OAuth credentials are managed within n8n.
        </p>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1.5">n8n Instance URL</label>
            <Input
              type="url"
              placeholder="https://your-instance.app.n8n.cloud"
              value={n8nConfig.baseUrl}
              onChange={(e) => setN8nConfig({ ...n8nConfig, baseUrl: e.target.value })}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Your n8n cloud or self-hosted instance URL
            </p>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1.5">
              n8n API Key
              <span className="text-xs text-muted-foreground ml-2">(Optional)</span>
            </label>
            <Input
              type="password"
              placeholder="n8n_api_xyz123..."
              value={n8nConfig.apiKey}
              onChange={(e) => setN8nConfig({ ...n8nConfig, apiKey: e.target.value })}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Optional: For authenticated webhook calls
            </p>
          </div>

          <Button
            onClick={saveN8nConfig}
            disabled={!n8nConfig.baseUrl || savingN8n}
          >
            {savingN8n ? 'Saving...' : 'Save n8n Configuration'}
          </Button>

          {n8nData?.configured && (
            <Alert>
              <Info className="w-4 h-4" />
              <AlertDescription>
                <strong>Currently configured:</strong> {n8nData.baseUrl}
                {n8nData.hasApiKey && <span className="ml-2">• API key saved</span>}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <Alert className="mt-4">
          <ShieldCheck className="w-4 h-4" />
          <AlertDescription>
            <strong>Security:</strong> Your n8n API key is encrypted with AES-256-GCM
            and stored securely in the vault. It's never exposed in API responses.
          </AlertDescription>
        </Alert>
      </div>

      {/* Info Section */}
      <div className="mt-12 p-6 rounded-xl border bg-card/50">
        <h2 className="font-semibold mb-3">How It Works</h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">1.</span>
            <span>
              <strong className="text-foreground">Default keys</strong> are
              shared across all users with rate limits.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">2.</span>
            <span>
              <strong className="text-foreground">Custom keys</strong> give
              you dedicated quota and are billed to your account.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">3.</span>
            <span>
              <strong className="text-foreground">Remove</strong> a custom
              key anytime to revert to the default.
            </span>
          </li>
        </ul>
      </div>

      {/* Edit Form Dialog */}
      <ApiKeyForm
        isOpen={editingService !== null}
        onClose={handleCloseForm}
        service={editingService}
        existingKey={editingKeyInfo?.keyPreview}
        onSave={handleSave}
        isSaving={saveMutation.isPending}
        validationError={formError}
        validationSuccess={formSuccess}
      />
    </>
  );

  // Embedded mode - just render content
  if (embedded) {
    return content;
  }

  // Standalone mode - full page layout
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-primary font-sans overflow-hidden relative">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 blur-[120px] rounded-full" />
      </div>

      <Header currentPage="settings" />

      <main className="container max-w-4xl mx-auto px-6 pt-24 pb-20 relative z-10">
        {/* Back Button */}
        <div className="mb-6">
          <Link href="/settings">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Settings
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <KeyRound className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground">API Key Settings</h1>
        </div>
        <p className="text-muted-foreground mb-8">
          Manage your API keys for external services. Custom keys use your own
          quota and billing.
        </p>

        {content}
      </main>
    </div>
  );
}
