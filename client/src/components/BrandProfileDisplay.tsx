// @ts-nocheck
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  Briefcase,
  Heart,
  Palette,
  MessageSquare,
  Users,
  BookOpen,
  Globe,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  PenLine,
  Plus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { BrandProfileForm } from "@/components/BrandProfileForm";
import type { BrandProfile } from "@shared/types/ideaBank";

interface BrandProfileDisplayProps {
  className?: string;
}

// Section wrapper component with consistent styling
function Section({
  title,
  icon: Icon,
  children,
  isEmpty = false,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  isEmpty?: boolean;
}) {
  if (isEmpty) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
      </div>
      <div className="pl-6">{children}</div>
    </motion.div>
  );
}

// Badge list component for displaying arrays of strings
function BadgeList({
  items,
  variant = "secondary",
  emptyMessage,
}: {
  items: string[] | null | undefined;
  variant?: "default" | "secondary" | "destructive" | "outline";
  emptyMessage?: string;
}) {
  if (!items || items.length === 0) {
    return emptyMessage ? (
      <span className="text-sm text-muted-foreground italic">{emptyMessage}</span>
    ) : null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, index) => (
        <Badge key={index} variant={variant}>
          {item}
        </Badge>
      ))}
    </div>
  );
}


// Key-value pair display for objects
function ObjectDisplay({
  data,
  emptyMessage,
}: {
  data: Record<string, unknown> | null | undefined;
  emptyMessage?: string;
}) {
  if (!data || Object.keys(data).length === 0) {
    return emptyMessage ? (
      <span className="text-sm text-muted-foreground italic">{emptyMessage}</span>
    ) : null;
  }

  return (
    <div className="space-y-2">
      {Object.entries(data).map(([key, value]) => (
        <div key={key} className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {key.replace(/([A-Z])/g, " $1").trim()}
          </span>
          <span className="text-sm text-foreground/80">
            {typeof value === "string"
              ? value
              : Array.isArray(value)
              ? value.join(", ")
              : JSON.stringify(value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function BrandProfileDisplay({ className }: BrandProfileDisplayProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<BrandProfile | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/brand-profile", {
        credentials: "include",
      });

      if (response.status === 404) {
        setProfile(null);
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to load brand profile");
      }

      const data: BrandProfile = await response.json();
      setProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center justify-center py-12 rounded-2xl border border-border bg-card/30",
          className
        )}
      >
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading brand profile...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className={cn(
          "flex items-center justify-center py-12 rounded-2xl border border-destructive/30 bg-destructive/5",
          className
        )}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertCircle className="w-8 h-8 text-destructive" />
          <div>
            <p className="text-sm font-medium text-destructive">Error loading profile</p>
            <p className="text-xs text-muted-foreground mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // No profile state
  if (!profile) {
    return (
      <>
        <div
          className={cn(
            "flex items-center justify-center py-12 rounded-2xl border border-border bg-card/30",
            className
          )}
        >
          <div className="flex flex-col items-center gap-4 text-center">
            <Building2 className="w-10 h-10 text-muted-foreground/50" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">No brand profile found</p>
              <p className="text-xs text-muted-foreground mt-1">
                Create a brand profile to personalize your ad generation experience.
              </p>
            </div>
            <Button onClick={() => setIsFormOpen(true)} className="mt-2">
              <Plus className="w-4 h-4 mr-2" />
              Create Brand Profile
            </Button>
          </div>
        </div>
        <BrandProfileForm
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          existingProfile={null}
          onSave={fetchProfile}
        />
      </>
    );
  }

  const hasVoice = profile.voice && (
    profile.voice.summary ||
    (profile.voice.principles && profile.voice.principles.length > 0) ||
    (profile.voice.wordsToUse && profile.voice.wordsToUse.length > 0) ||
    (profile.voice.wordsToAvoid && profile.voice.wordsToAvoid.length > 0)
  );

  const hasTargetAudience = profile.targetAudience && (
    profile.targetAudience.demographics ||
    profile.targetAudience.psychographics ||
    (profile.targetAudience.painPoints && profile.targetAudience.painPoints.length > 0) ||
    (profile.targetAudience.personas && profile.targetAudience.personas.length > 0)
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-2xl border border-border bg-card/30 backdrop-blur-sm overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="p-6 bg-gradient-to-br from-primary/5 to-purple-500/5 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {profile.brandName || "Untitled Brand"}
              </h2>
              {profile.industry && (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5" />
                  {profile.industry}
                </p>
              )}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setIsFormOpen(true)}>
            <PenLine className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Brand Values */}
        <Section
          title="Brand Values"
          icon={Heart}
          isEmpty={!profile.brandValues || profile.brandValues.length === 0}
        >
          <BadgeList items={profile.brandValues} variant="secondary" />
        </Section>

        {(profile.brandValues && profile.brandValues.length > 0) &&
          ((profile.preferredStyles && profile.preferredStyles.length > 0) ||
            (profile.colorPreferences && profile.colorPreferences.length > 0)) && (
          <Separator />
        )}

        {/* Visual Style */}
        {((profile.preferredStyles && profile.preferredStyles.length > 0) ||
          (profile.colorPreferences && profile.colorPreferences.length > 0)) && (
          <Section title="Visual Style" icon={Palette}>
            <div className="space-y-4">
              {profile.preferredStyles && profile.preferredStyles.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Preferred Styles
                  </span>
                  <BadgeList items={profile.preferredStyles} variant="outline" />
                </div>
              )}
              {profile.colorPreferences && profile.colorPreferences.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Color Preferences
                  </span>
                  <BadgeList items={profile.colorPreferences} variant="outline" />
                </div>
              )}
            </div>
          </Section>
        )}

        {((profile.preferredStyles && profile.preferredStyles.length > 0) ||
          (profile.colorPreferences && profile.colorPreferences.length > 0)) &&
          hasVoice && <Separator />}

        {/* Voice & Tone */}
        {hasVoice && (
          <Section title="Voice & Tone" icon={MessageSquare}>
            <div className="space-y-4">
              {profile.voice?.summary && (
                <div className="space-y-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Summary
                  </span>
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    {profile.voice.summary}
                  </p>
                </div>
              )}
              {profile.voice?.principles && profile.voice.principles.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Principles
                  </span>
                  <BadgeList items={profile.voice.principles} variant="secondary" />
                </div>
              )}
              {profile.voice?.wordsToUse && profile.voice.wordsToUse.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                    Words to Use
                  </span>
                  <BadgeList items={profile.voice.wordsToUse} variant="outline" />
                </div>
              )}
              {profile.voice?.wordsToAvoid && profile.voice.wordsToAvoid.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                    Words to Avoid
                  </span>
                  <BadgeList items={profile.voice.wordsToAvoid} variant="destructive" />
                </div>
              )}
            </div>
          </Section>
        )}

        {hasVoice && hasTargetAudience && <Separator />}

        {/* Target Audience */}
        {hasTargetAudience && (
          <Section title="Target Audience" icon={Users}>
            <div className="space-y-4">
              {profile.targetAudience?.demographics && (
                <div className="space-y-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Demographics
                  </span>
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    {profile.targetAudience.demographics}
                  </p>
                </div>
              )}
              {profile.targetAudience?.psychographics && (
                <div className="space-y-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Psychographics
                  </span>
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    {profile.targetAudience.psychographics}
                  </p>
                </div>
              )}
              {profile.targetAudience?.painPoints &&
                profile.targetAudience.painPoints.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Pain Points
                    </span>
                    <ul className="space-y-1">
                      {profile.targetAudience.painPoints.map((point, index) => (
                        <li
                          key={index}
                          className="text-sm text-foreground/80 flex items-start gap-2"
                        >
                          <span className="text-primary mt-1.5 text-xs">&#x2022;</span>
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              {profile.targetAudience?.personas &&
                profile.targetAudience.personas.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Personas
                    </span>
                    <BadgeList items={profile.targetAudience.personas} variant="outline" />
                  </div>
                )}
            </div>
          </Section>
        )}

        {hasTargetAudience && profile.industryTerminology && <Separator />}

        {/* Industry Terminology */}
        {profile.industryTerminology && (
          <Section title="Industry Terminology" icon={BookOpen}>
            <ObjectDisplay data={profile.industryTerminology as Record<string, unknown>} />
          </Section>
        )}

        {profile.industryTerminology && profile.platformGuidelines && <Separator />}

        {/* Platform Guidelines */}
        {profile.platformGuidelines && (
          <Section title="Platform Guidelines" icon={Globe}>
            <ObjectDisplay data={profile.platformGuidelines as Record<string, unknown>} />
          </Section>
        )}
      </div>

      {/* Edit Form */}
      <BrandProfileForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        existingProfile={profile}
        onSave={fetchProfile}
      />
    </motion.div>
  );
}
