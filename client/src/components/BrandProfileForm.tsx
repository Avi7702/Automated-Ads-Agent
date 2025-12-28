// @ts-nocheck
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  ChevronUp,
  X,
  Save,
  Loader2,
  CheckCircle2,
  Plus,
  Trash2,
  Building2
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { BrandProfile, BrandVoice, TargetAudience } from "@shared/types/ideaBank";

// Industry options
const INDUSTRIES = [
  "Technology",
  "E-commerce",
  "Fashion & Apparel",
  "Food & Beverage",
  "Health & Wellness",
  "Beauty & Cosmetics",
  "Home & Garden",
  "Sports & Fitness",
  "Travel & Hospitality",
  "Education",
  "Finance",
  "Real Estate",
  "Automotive",
  "Entertainment",
  "Other"
];

// Brand values options
const BRAND_VALUES_OPTIONS = [
  "eco-friendly",
  "luxury",
  "accessible",
  "innovative",
  "traditional",
  "premium",
  "affordable",
  "sustainable",
  "ethical",
  "modern",
  "classic",
  "bold",
  "minimalist",
  "playful",
  "professional"
];

// Style options
const STYLE_OPTIONS = [
  "modern",
  "rustic",
  "minimalist",
  "bold",
  "elegant",
  "playful",
  "professional",
  "vintage"
];

// Color preferences options
const COLOR_PREFERENCES_OPTIONS = [
  "neutral",
  "vibrant",
  "earth-tones",
  "pastels",
  "monochrome",
  "warm",
  "cool"
];

interface SaveStatus {
  state: "idle" | "saving" | "saved" | "error";
  message?: string;
}

export function BrandProfileForm() {
  const { toast } = useToast();

  // Form state
  const [brandName, setBrandName] = useState("");
  const [industry, setIndustry] = useState<string>("");
  const [brandValues, setBrandValues] = useState<string[]>([]);
  const [preferredStyles, setPreferredStyles] = useState<string[]>([]);
  const [colorPreferences, setColorPreferences] = useState<string[]>([]);
  const [kbTags, setKbTags] = useState<string[]>([]);

  // Target audience state
  const [demographics, setDemographics] = useState("");
  const [psychographics, setPsychographics] = useState("");
  const [painPoints, setPainPoints] = useState<string[]>([]);

  // Voice state
  const [voicePrinciples, setVoicePrinciples] = useState<string[]>([]);
  const [wordsToUse, setWordsToUse] = useState<string[]>([]);
  const [wordsToAvoid, setWordsToAvoid] = useState<string[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({ state: "idle" });
  const [targetAudienceOpen, setTargetAudienceOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);

  // Tag input states
  const [painPointInput, setPainPointInput] = useState("");
  const [voicePrincipleInput, setVoicePrincipleInput] = useState("");
  const [wordToUseInput, setWordToUseInput] = useState("");
  const [wordToAvoidInput, setWordToAvoidInput] = useState("");
  const [kbTagInput, setKbTagInput] = useState("");

  // Load brand profile
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/brand-profile");

      if (response.status === 404) {
        setHasProfile(false);
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to load brand profile");
      }

      const profile: BrandProfile = await response.json();
      setHasProfile(true);

      // Populate form with loaded data
      setBrandName(profile.brandName || "");
      setIndustry(profile.industry || "");
      setBrandValues(profile.brandValues || []);
      setPreferredStyles(profile.preferredStyles || []);
      setColorPreferences(profile.colorPreferences || []);
      setKbTags(profile.kbTags || []);

      if (profile.targetAudience) {
        setDemographics(profile.targetAudience.demographics || "");
        setPsychographics(profile.targetAudience.psychographics || "");
        setPainPoints(profile.targetAudience.painPoints || []);
      }

      if (profile.voice) {
        setVoicePrinciples(profile.voice.principles || []);
        setWordsToUse(profile.voice.wordsToUse || []);
        setWordsToAvoid(profile.voice.wordsToAvoid || []);
      }

    } catch (error) {
      toast({
        title: "Error loading profile",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    try {
      setSaveStatus({ state: "saving" });

      const targetAudience: TargetAudience = {
        demographics: demographics || undefined,
        psychographics: psychographics || undefined,
        painPoints: painPoints.length > 0 ? painPoints : undefined
      };

      const voice: BrandVoice = {
        principles: voicePrinciples,
        wordsToUse: wordsToUse.length > 0 ? wordsToUse : undefined,
        wordsToAvoid: wordsToAvoid.length > 0 ? wordsToAvoid : undefined
      };

      const payload = {
        brandName: brandName || undefined,
        industry: industry || undefined,
        brandValues: brandValues.length > 0 ? brandValues : undefined,
        targetAudience: demographics || psychographics || painPoints.length > 0 ? targetAudience : undefined,
        preferredStyles: preferredStyles.length > 0 ? preferredStyles : undefined,
        colorPreferences: colorPreferences.length > 0 ? colorPreferences : undefined,
        voice: voicePrinciples.length > 0 ? voice : undefined,
        kbTags: kbTags.length > 0 ? kbTags : undefined
      };

      const response = await fetch("/api/brand-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("Failed to save brand profile");
      }

      setHasProfile(true);
      setSaveStatus({ state: "saved", message: "Profile saved successfully" });

      toast({
        title: "Profile saved",
        description: "Your brand profile has been updated"
      });

      // Reset status after 2 seconds
      setTimeout(() => {
        setSaveStatus({ state: "idle" });
      }, 2000);

    } catch (error) {
      setSaveStatus({
        state: "error",
        message: error instanceof Error ? error.message : "Unknown error"
      });

      toast({
        title: "Error saving profile",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    }
  };

  const deleteProfile = async () => {
    if (!confirm("Are you sure you want to delete your brand profile? This cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch("/api/brand-profile", {
        method: "DELETE"
      });

      if (!response.ok) {
        throw new Error("Failed to delete brand profile");
      }

      // Reset all form state
      setBrandName("");
      setIndustry("");
      setBrandValues([]);
      setPreferredStyles([]);
      setColorPreferences([]);
      setKbTags([]);
      setDemographics("");
      setPsychographics("");
      setPainPoints([]);
      setVoicePrinciples([]);
      setWordsToUse([]);
      setWordsToAvoid([]);
      setHasProfile(false);

      toast({
        title: "Profile deleted",
        description: "Your brand profile has been removed"
      });

    } catch (error) {
      toast({
        title: "Error deleting profile",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    }
  };

  // Tag management helpers
  const addTag = (value: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    const trimmed = value.trim();
    if (trimmed) {
      setter(prev => [...prev, trimmed]);
    }
  };

  const removeTag = (index: number, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(prev => prev.filter((_, i) => i !== index));
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    value: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    inputSetter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag(value, setter);
      inputSetter("");
    }
  };

  // Multi-select checkbox handlers
  const toggleValue = (value: string, current: string[], setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (current.includes(value)) {
      setter(current.filter(v => v !== value));
    } else {
      setter([...current, value]);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-semibold">Brand Profile</h1>
            <p className="text-sm text-muted-foreground">
              {hasProfile ? "Update your brand identity" : "Create your brand identity"}
            </p>
          </div>
        </div>

        {hasProfile && (
          <Button
            variant="outline"
            size="sm"
            onClick={deleteProfile}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Profile
          </Button>
        )}
      </div>

      {/* Form */}
      <div className="space-y-6 p-6 rounded-2xl border border-white/10 bg-card/30 backdrop-blur-sm">
        {/* Brand Name */}
        <div className="space-y-2">
          <Label htmlFor="brandName">Brand Name</Label>
          <Input
            id="brandName"
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            placeholder="Enter your brand name"
            className="max-w-md"
          />
        </div>

        {/* Industry */}
        <div className="space-y-2">
          <Label htmlFor="industry">Industry</Label>
          <Select value={industry} onValueChange={setIndustry}>
            <SelectTrigger className="max-w-md" id="industry">
              <SelectValue placeholder="Select your industry" />
            </SelectTrigger>
            <SelectContent>
              {INDUSTRIES.map((ind) => (
                <SelectItem key={ind} value={ind}>
                  {ind}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Brand Values */}
        <div className="space-y-3">
          <Label>Brand Values</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {BRAND_VALUES_OPTIONS.map((value) => (
              <div key={value} className="flex items-center space-x-2">
                <Checkbox
                  id={`value-${value}`}
                  checked={brandValues.includes(value)}
                  onCheckedChange={() => toggleValue(value, brandValues, setBrandValues)}
                />
                <label
                  htmlFor={`value-${value}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {value}
                </label>
              </div>
            ))}
          </div>
          {brandValues.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {brandValues.map((value) => (
                <Badge key={value} variant="secondary">
                  {value}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Target Audience - Collapsible */}
        <Collapsible open={targetAudienceOpen} onOpenChange={setTargetAudienceOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-4 rounded-lg border border-white/10 hover:bg-white/5 transition-colors">
            <Label className="cursor-pointer">Target Audience</Label>
            {targetAudienceOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="demographics">Demographics</Label>
              <Textarea
                id="demographics"
                value={demographics}
                onChange={(e) => setDemographics(e.target.value)}
                placeholder="e.g., Women aged 25-40, urban professionals"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="psychographics">Psychographics</Label>
              <Textarea
                id="psychographics"
                value={psychographics}
                onChange={(e) => setPsychographics(e.target.value)}
                placeholder="e.g., Value sustainability, seek premium experiences"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="painPoints">Pain Points</Label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    id="painPoints"
                    value={painPointInput}
                    onChange={(e) => setPainPointInput(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, painPointInput, setPainPoints, setPainPointInput)}
                    placeholder="Add a pain point and press Enter"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      addTag(painPointInput, setPainPoints);
                      setPainPointInput("");
                    }}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {painPoints.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {painPoints.map((point, index) => (
                      <Badge key={index} variant="secondary" className="gap-1">
                        {point}
                        <button
                          onClick={() => removeTag(index, setPainPoints)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Preferred Styles */}
        <div className="space-y-3">
          <Label>Preferred Styles</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {STYLE_OPTIONS.map((style) => (
              <div key={style} className="flex items-center space-x-2">
                <Checkbox
                  id={`style-${style}`}
                  checked={preferredStyles.includes(style)}
                  onCheckedChange={() => toggleValue(style, preferredStyles, setPreferredStyles)}
                />
                <label
                  htmlFor={`style-${style}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {style}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Color Preferences */}
        <div className="space-y-3">
          <Label>Color Preferences</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {COLOR_PREFERENCES_OPTIONS.map((color) => (
              <div key={color} className="flex items-center space-x-2">
                <Checkbox
                  id={`color-${color}`}
                  checked={colorPreferences.includes(color)}
                  onCheckedChange={() => toggleValue(color, colorPreferences, setColorPreferences)}
                />
                <label
                  htmlFor={`color-${color}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {color}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Voice - Collapsible */}
        <Collapsible open={voiceOpen} onOpenChange={setVoiceOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-4 rounded-lg border border-white/10 hover:bg-white/5 transition-colors">
            <Label className="cursor-pointer">Brand Voice</Label>
            {voiceOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4 space-y-4">
            {/* Voice Principles */}
            <div className="space-y-2">
              <Label htmlFor="voicePrinciples">Voice Principles</Label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    id="voicePrinciples"
                    value={voicePrincipleInput}
                    onChange={(e) => setVoicePrincipleInput(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, voicePrincipleInput, setVoicePrinciples, setVoicePrincipleInput)}
                    placeholder="e.g., Professional, Friendly (press Enter)"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      addTag(voicePrincipleInput, setVoicePrinciples);
                      setVoicePrincipleInput("");
                    }}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {voicePrinciples.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {voicePrinciples.map((principle, index) => (
                      <Badge key={index} variant="secondary" className="gap-1">
                        {principle}
                        <button
                          onClick={() => removeTag(index, setVoicePrinciples)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Words to Use */}
            <div className="space-y-2">
              <Label htmlFor="wordsToUse">Words to Use</Label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    id="wordsToUse"
                    value={wordToUseInput}
                    onChange={(e) => setWordToUseInput(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, wordToUseInput, setWordsToUse, setWordToUseInput)}
                    placeholder="Add words that match your brand (press Enter)"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      addTag(wordToUseInput, setWordsToUse);
                      setWordToUseInput("");
                    }}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {wordsToUse.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {wordsToUse.map((word, index) => (
                      <Badge key={index} variant="secondary" className="gap-1">
                        {word}
                        <button
                          onClick={() => removeTag(index, setWordsToUse)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Words to Avoid */}
            <div className="space-y-2">
              <Label htmlFor="wordsToAvoid">Words to Avoid</Label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    id="wordsToAvoid"
                    value={wordToAvoidInput}
                    onChange={(e) => setWordToAvoidInput(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, wordToAvoidInput, setWordsToAvoid, setWordToAvoidInput)}
                    placeholder="Add words to avoid (press Enter)"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      addTag(wordToAvoidInput, setWordsToAvoid);
                      setWordToAvoidInput("");
                    }}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {wordsToAvoid.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {wordsToAvoid.map((word, index) => (
                      <Badge key={index} variant="destructive" className="gap-1">
                        {word}
                        <button
                          onClick={() => removeTag(index, setWordsToAvoid)}
                          className="ml-1 hover:text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Knowledge Base Tags */}
        <div className="space-y-2">
          <Label htmlFor="kbTags">Knowledge Base Tags</Label>
          <p className="text-xs text-muted-foreground">
            Add tags to help categorize and retrieve brand information
          </p>
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                id="kbTags"
                value={kbTagInput}
                onChange={(e) => setKbTagInput(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, kbTagInput, setKbTags, setKbTagInput)}
                placeholder="Add a tag and press Enter"
              />
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  addTag(kbTagInput, setKbTags);
                  setKbTagInput("");
                }}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {kbTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {kbTags.map((tag, index) => (
                  <Badge key={index} variant="outline" className="gap-1">
                    {tag}
                    <button
                      onClick={() => removeTag(index, setKbTags)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-between">
        <AnimatePresence mode="wait">
          {saveStatus.state === "saved" && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-sm text-green-500"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{saveStatus.message}</span>
            </motion.div>
          )}
          {saveStatus.state === "error" && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="text-sm text-destructive"
            >
              {saveStatus.message}
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          onClick={saveProfile}
          disabled={saveStatus.state === "saving"}
          className="ml-auto"
        >
          {saveStatus.state === "saving" ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Profile
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
