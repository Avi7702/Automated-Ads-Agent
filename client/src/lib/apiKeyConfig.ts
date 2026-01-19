import { Sparkles, Cloud, Flame, Database, type LucideIcon } from "lucide-react";

export interface ServiceConfig {
  displayName: string;
  icon: LucideIcon;
  docsUrl: string;
  description: string;
  placeholder?: string;
  pattern?: RegExp;
  formatHint?: string;
  fields: Array<{
    name: string;
    label: string;
    placeholder: string;
    pattern?: RegExp;
    formatHint?: string;
  }>;
}

export const SERVICE_CONFIG: Record<string, ServiceConfig> = {
  gemini: {
    displayName: "Google Gemini",
    icon: Sparkles,
    docsUrl: "https://aistudio.google.com/apikey",
    description: "AI image generation and analysis",
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
    description: "Image storage and transformation",
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
    description: "Web scraping for product data",
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
    description: "Caching and rate limiting",
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

export const SUPPORTED_SERVICES = ["gemini", "cloudinary", "firecrawl", "redis"] as const;
export type SupportedService = typeof SUPPORTED_SERVICES[number];
