import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, KeyRound, ShieldCheck, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Header } from "@/components/layout/Header";
import { ApiKeyCard, type ApiKeyInfo } from "@/components/settings/ApiKeyCard";
import { ApiKeyForm } from "@/components/settings/ApiKeyForm";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Supported services in display order
const SERVICES = ["gemini", "cloudinary", "firecrawl", "redis"];

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

  // Fetch all API keys status
  const {
    data: keysData,
    isLoading,
    error,
  } = useQuery<ApiKeysResponse>({
    queryKey: ["/api/settings/api-keys"],
    refetchOnWindowFocus: true,
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
            {SERVICES.map((service) => (
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
          <div className="grid gap-4 md:grid-cols-2">
            {SERVICES.map((service) => (
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
