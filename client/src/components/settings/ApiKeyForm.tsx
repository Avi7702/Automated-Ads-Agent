import { useState, useEffect } from "react";
import {
  Sparkles,
  Cloud,
  Flame,
  Database,
  Loader2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Service configuration with validation patterns
const SERVICE_CONFIG: Record<
  string,
  {
    displayName: string;
    icon: React.ElementType;
    docsUrl: string;
    placeholder: string;
    pattern: RegExp;
    formatHint: string;
    fields: Array<{
      name: string;
      label: string;
      placeholder: string;
      pattern?: RegExp;
      formatHint?: string;
    }>;
  }
> = {
  gemini: {
    displayName: "Google Gemini",
    icon: Sparkles,
    docsUrl: "https://aistudio.google.com/apikey",
    placeholder: "AIza...",
    pattern: /^AIza[a-zA-Z0-9_-]{35}$/,
    formatHint: "Gemini API keys start with 'AIza' and are 39 characters long",
    fields: [
      {
        name: "apiKey",
        label: "API Key",
        placeholder: "AIzaSy...",
        pattern: /^AIza[a-zA-Z0-9_-]{35}$/,
        formatHint: "Starts with 'AIza', 39 characters total",
      },
    ],
  },
  cloudinary: {
    displayName: "Cloudinary",
    icon: Cloud,
    docsUrl: "https://cloudinary.com/console",
    placeholder: "",
    pattern: /^.+$/,
    formatHint: "",
    fields: [
      {
        name: "cloudName",
        label: "Cloud Name",
        placeholder: "your-cloud-name",
        formatHint: "Found in your Cloudinary dashboard",
      },
      {
        name: "apiKey",
        label: "API Key",
        placeholder: "123456789012345",
        pattern: /^\d{15}$/,
        formatHint: "15-digit number",
      },
      {
        name: "apiSecret",
        label: "API Secret",
        placeholder: "your-api-secret",
        formatHint: "Keep this secret!",
      },
    ],
  },
  firecrawl: {
    displayName: "Firecrawl",
    icon: Flame,
    docsUrl: "https://firecrawl.dev/app/api-keys",
    placeholder: "fc-...",
    pattern: /^fc-[a-zA-Z0-9_-]{20,}$/,
    formatHint: "Firecrawl API keys start with 'fc-'",
    fields: [
      {
        name: "apiKey",
        label: "API Key",
        placeholder: "fc-...",
        pattern: /^fc-[a-zA-Z0-9_-]{20,}$/,
        formatHint: "Starts with 'fc-'",
      },
    ],
  },
  redis: {
    displayName: "Redis",
    icon: Database,
    docsUrl: "https://redis.io/docs",
    placeholder: "redis://...",
    pattern: /^redis(s)?:\/\/.+/,
    formatHint: "Redis connection URL format",
    fields: [
      {
        name: "apiKey",
        label: "Connection URL",
        placeholder: "redis://default:password@host:6379",
        pattern: /^redis(s)?:\/\/.+/,
        formatHint: "Format: redis://user:password@host:port",
      },
    ],
  },
};

interface ApiKeyFormProps {
  isOpen: boolean;
  onClose: () => void;
  service: string | null;
  existingKey?: string | null;
  onSave: (service: string, data: Record<string, string>) => Promise<void>;
  isSaving?: boolean;
  validationError?: string | null;
  validationSuccess?: boolean;
}

export function ApiKeyForm({
  isOpen,
  onClose,
  service,
  existingKey,
  onSave,
  isSaving = false,
  validationError,
  validationSuccess,
}: ApiKeyFormProps) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [formatErrors, setFormatErrors] = useState<Record<string, string>>({});

  // Reset form when dialog opens/closes or service changes
  useEffect(() => {
    if (isOpen && service) {
      const config = SERVICE_CONFIG[service];
      const initial: Record<string, string> = {};
      config?.fields.forEach((field) => {
        initial[field.name] = "";
      });
      setFormData(initial);
      setShowPasswords({});
      setFormatErrors({});
    }
  }, [isOpen, service]);

  if (!service) return null;
  const config = SERVICE_CONFIG[service];
  if (!config) return null;

  const Icon = config.icon;

  const handleFieldChange = (fieldName: string, value: string) => {
    // Trim whitespace
    const trimmedValue = value.trim();
    setFormData((prev) => ({ ...prev, [fieldName]: trimmedValue }));

    // Clear format error when typing
    if (formatErrors[fieldName]) {
      setFormatErrors((prev) => ({ ...prev, [fieldName]: "" }));
    }
  };

  const validateFormat = (): boolean => {
    const errors: Record<string, string> = {};
    let isValid = true;

    config.fields.forEach((field) => {
      const value = formData[field.name]?.trim() || "";
      if (!value) {
        errors[field.name] = "This field is required";
        isValid = false;
      } else if (field.pattern && !field.pattern.test(value)) {
        errors[field.name] = field.formatHint || "Invalid format";
        isValid = false;
      }
    });

    setFormatErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateFormat()) {
      return;
    }

    await onSave(service, formData);
  };

  const togglePasswordVisibility = (fieldName: string) => {
    setShowPasswords((prev) => ({ ...prev, [fieldName]: !prev[fieldName] }));
  };

  const isSecretField = (fieldName: string) => {
    return fieldName.toLowerCase().includes("secret") ||
           fieldName.toLowerCase().includes("key") ||
           fieldName.toLowerCase().includes("password") ||
           fieldName === "apiKey";
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle>
                {existingKey ? "Update" : "Add"} {config.displayName} API Key
              </DialogTitle>
              <DialogDescription>
                {existingKey
                  ? "Enter a new API key to replace the existing one."
                  : "Add your API key to use your own quota."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Dynamic Fields */}
          {config.fields.map((field) => (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={field.name}>{field.label}</Label>
              <div className="relative">
                <Input
                  id={field.name}
                  type={
                    isSecretField(field.name) && !showPasswords[field.name]
                      ? "password"
                      : "text"
                  }
                  value={formData[field.name] || ""}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  className={cn(
                    "pr-10",
                    formatErrors[field.name] && "border-destructive"
                  )}
                  autoComplete="off"
                  spellCheck="false"
                />
                {isSecretField(field.name) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10"
                    onClick={() => togglePasswordVisibility(field.name)}
                  >
                    {showPasswords[field.name] ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                )}
              </div>
              {formatErrors[field.name] && (
                <p className="text-xs text-destructive">
                  {formatErrors[field.name]}
                </p>
              )}
              {field.formatHint && !formatErrors[field.name] && (
                <p className="text-xs text-muted-foreground">
                  {field.formatHint}
                </p>
              )}
            </div>
          ))}

          {/* Validation Error */}
          {validationError && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Validation Failed</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>{validationError}</p>
                <a
                  href={config.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm underline hover:no-underline"
                >
                  Get a new key
                  <ExternalLink className="w-3 h-3" />
                </a>
              </AlertDescription>
            </Alert>
          )}

          {/* Validation Success */}
          {validationSuccess && (
            <Alert className="border-green-500/50 bg-green-500/10">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertTitle className="text-green-500">Key Validated</AlertTitle>
              <AlertDescription>
                Your API key has been validated and saved successfully.
              </AlertDescription>
            </Alert>
          )}

          {/* Info */}
          <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
            <p>
              Your API key will be encrypted and stored securely. You can
              remove it at any time to revert to the default system key.
            </p>
          </div>
        </form>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Validating...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Save Key
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ApiKeyForm;
