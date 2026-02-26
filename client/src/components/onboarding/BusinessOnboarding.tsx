/**
 * BusinessOnboarding — Multi-step wizard for first-time business setup
 *
 * 7 steps:
 * 1. Welcome
 * 2. Industry & Niche
 * 3. Differentiator
 * 4. Target Customer
 * 5. Product Ranking
 * 6. Content Themes
 * 7. Review & Confirm
 *
 * Runs as a full-screen overlay when onboarding is not complete.
 */

import { useState, useCallback, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSaveBusinessIntelligence, useBulkSetPriorities } from '@/hooks/useBusinessIntelligence';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Building2,
  Target,
  Users,
  Layers,
  Palette,
  CheckCircle,
  X,
  Plus,
  Loader2,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types & Constants                                                  */
/* ------------------------------------------------------------------ */

interface OnboardingData {
  industry: string;
  niche: string;
  differentiator: string;
  customerType: 'B2B' | 'B2C' | 'both';
  demographics: string;
  painPoints: string[];
  decisionFactors: string[];
  productTiers: Record<string, string>; // productId -> tier
  contentThemes: string[];
}

const INDUSTRIES = [
  'Construction',
  'Technology',
  'Retail',
  'Healthcare',
  'Finance',
  'Education',
  'Food & Beverage',
  'Manufacturing',
  'Real Estate',
  'Other',
];

const SUGGESTED_THEMES = [
  'Product tutorials',
  'Industry news',
  'Behind the scenes',
  'Customer stories',
  'Tips & tricks',
  'How-to guides',
  'Team spotlights',
  'Case studies',
];

const TIER_OPTIONS = ['flagship', 'core', 'supporting', 'new'] as const;

const TIER_COLORS: Record<string, string> = {
  flagship: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  core: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  supporting: 'bg-green-500/10 text-green-500 border-green-500/30',
  new: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
};

const TOTAL_STEPS = 7;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface BusinessOnboardingProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function BusinessOnboarding({ onComplete, onSkip }: BusinessOnboardingProps) {
  const queryClient = useQueryClient();

  // Mutations
  const saveBiz = useSaveBusinessIntelligence();
  const savePriorities = useBulkSetPriorities();

  // Products for step 5
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await fetch('/api/products', { credentials: 'include' });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : data?.products || [];
    },
  });

  // Step state
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>({
    industry: '',
    niche: '',
    differentiator: '',
    customerType: 'B2B',
    demographics: '',
    painPoints: [],
    decisionFactors: [],
    productTiers: {},
    contentThemes: [],
  });

  // Temp inputs for multi-value fields
  const [painPointInput, setPainPointInput] = useState('');
  const [factorInput, setFactorInput] = useState('');
  const [themeInput, setThemeInput] = useState('');

  const [isSaving, setIsSaving] = useState(false);

  // Helpers
  const updateData = useCallback(<K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const addToList = useCallback((key: 'painPoints' | 'decisionFactors' | 'contentThemes', value: string) => {
    if (!value.trim()) return;
    setData((prev) => ({
      ...prev,
      [key]: [...prev[key], value.trim()],
    }));
  }, []);

  const removeFromList = useCallback((key: 'painPoints' | 'decisionFactors' | 'contentThemes', index: number) => {
    setData((prev) => ({
      ...prev,
      [key]: prev[key].filter((_, i) => i !== index),
    }));
  }, []);

  const handleKeyDown = useCallback(
    (
      e: KeyboardEvent<HTMLInputElement>,
      key: 'painPoints' | 'decisionFactors' | 'contentThemes',
      inputValue: string,
      setInputValue: (v: string) => void,
    ) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (inputValue.trim()) {
          addToList(key, inputValue);
          setInputValue('');
        }
      }
    },
    [addToList],
  );

  const canProceed = useCallback(() => {
    switch (step) {
      case 1:
        return true; // Welcome
      case 2:
        return data.industry.length > 0;
      case 3:
        return data.differentiator.length > 0;
      case 4:
        return data.customerType.length > 0;
      case 5:
        return true; // Product ranking optional
      case 6:
        return true; // Themes optional
      case 7:
        return true; // Review
      default:
        return true;
    }
  }, [step, data]);

  // Save all data
  const handleComplete = async () => {
    setIsSaving(true);
    try {
      // Save business intelligence
      await saveBiz.mutateAsync({
        industry: data.industry,
        niche: data.niche || null,
        differentiator: data.differentiator || null,
        targetCustomer: {
          type: data.customerType,
          demographics: data.demographics,
          painPoints: data.painPoints,
          decisionFactors: data.decisionFactors,
        },
        contentThemes: data.contentThemes,
        onboardingComplete: true,
      });

      // Save product tiers if any
      if (Object.keys(data.productTiers).length > 0) {
        const bulkData = Object.entries(data.productTiers).map(([productId, tier]) => ({
          productId,
          revenueTier: tier,
          revenueWeight: tier === 'flagship' ? 8 : tier === 'core' ? 5 : tier === 'supporting' ? 3 : 2,
        }));
        await savePriorities.mutateAsync(bulkData);
      }

      queryClient.invalidateQueries({ queryKey: ['intelligence'] });

      toast.success('Setup complete', {
        description: 'Your business profile has been saved. The AI will use this to create better content.',
      });

      onComplete();
    } catch (err) {
      toast.error('Failed to save', {
        description: err instanceof Error ? err.message : 'Something went wrong',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const progressPercent = Math.round((step / TOTAL_STEPS) * 100);

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <Card className="w-full max-w-2xl mx-auto border border-border shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">
              Step {step} of {TOTAL_STEPS}
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={onSkip} className="text-xs text-muted-foreground">
            Skip for now
          </Button>
        </div>

        <div className="px-6 pb-2">
          <Progress value={progressPercent} className="h-1.5" />
        </div>

        {/* Content */}
        <div className="px-6 py-6 min-h-[320px]">
          {step === 1 && <StepWelcome />}
          {step === 2 && (
            <StepIndustry
              industry={data.industry}
              niche={data.niche}
              onIndustryChange={(v) => updateData('industry', v)}
              onNicheChange={(v) => updateData('niche', v)}
            />
          )}
          {step === 3 && (
            <StepDifferentiator value={data.differentiator} onChange={(v) => updateData('differentiator', v)} />
          )}
          {step === 4 && (
            <StepTargetCustomer
              customerType={data.customerType}
              demographics={data.demographics}
              painPoints={data.painPoints}
              decisionFactors={data.decisionFactors}
              painPointInput={painPointInput}
              factorInput={factorInput}
              onCustomerTypeChange={(v) => updateData('customerType', v)}
              onDemographicsChange={(v) => updateData('demographics', v)}
              onAddPainPoint={(v) => {
                addToList('painPoints', v);
                setPainPointInput('');
              }}
              onRemovePainPoint={(i) => removeFromList('painPoints', i)}
              onAddFactor={(v) => {
                addToList('decisionFactors', v);
                setFactorInput('');
              }}
              onRemoveFactor={(i) => removeFromList('decisionFactors', i)}
              onPainPointInputChange={setPainPointInput}
              onFactorInputChange={setFactorInput}
              onPainPointKeyDown={(e) => handleKeyDown(e, 'painPoints', painPointInput, setPainPointInput)}
              onFactorKeyDown={(e) => handleKeyDown(e, 'decisionFactors', factorInput, setFactorInput)}
            />
          )}
          {step === 5 && (
            <StepProductRanking
              products={products}
              productTiers={data.productTiers}
              onTierChange={(productId, tier) => {
                updateData('productTiers', {
                  ...data.productTiers,
                  [productId]: tier,
                });
              }}
            />
          )}
          {step === 6 && (
            <StepContentThemes
              themes={data.contentThemes}
              themeInput={themeInput}
              onThemeInputChange={setThemeInput}
              onAdd={(v) => {
                addToList('contentThemes', v);
                setThemeInput('');
              }}
              onRemove={(i) => removeFromList('contentThemes', i)}
              onKeyDown={(e) => handleKeyDown(e, 'contentThemes', themeInput, setThemeInput)}
            />
          )}
          {step === 7 && <StepReview data={data} products={products} onEditStep={setStep} />}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 pb-6 pt-2 border-t border-border">
          <Button variant="outline" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>

          {step < TOTAL_STEPS ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canProceed()}>
              Next
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleComplete} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              Complete Setup
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step Sub-components                                                */
/* ------------------------------------------------------------------ */

function StepWelcome() {
  return (
    <div className="text-center space-y-4 py-8">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
        <Sparkles className="w-8 h-8 text-primary" />
      </div>
      <h2 className="text-2xl font-bold">Let's set up your content strategy</h2>
      <p className="text-muted-foreground max-w-md mx-auto">
        Answer a few questions about your business so the AI can generate better, more relevant content for your
        products and audience.
      </p>
      <p className="text-xs text-muted-foreground">Takes about 2 minutes</p>
    </div>
  );
}

function StepIndustry({
  industry,
  niche,
  onIndustryChange,
  onNicheChange,
}: {
  industry: string;
  niche: string;
  onIndustryChange: (v: string) => void;
  onNicheChange: (v: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
          <Building2 className="w-5 h-5 text-blue-500" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Industry & Niche</h2>
          <p className="text-sm text-muted-foreground">What industry does your business operate in?</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Industry</Label>
          <Select value={industry} onValueChange={onIndustryChange}>
            <SelectTrigger>
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

        <div className="space-y-2">
          <Label>Niche (optional)</Label>
          <Input
            placeholder="e.g., Residential flooring installation"
            value={niche}
            onChange={(e) => onNicheChange(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">A specific focus area within your industry</p>
        </div>
      </div>
    </div>
  );
}

function StepDifferentiator({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
          <Target className="w-5 h-5 text-amber-500" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">What makes you different?</h2>
          <p className="text-sm text-muted-foreground">This helps the AI highlight your competitive advantages</p>
        </div>
      </div>

      <Textarea
        placeholder="e.g., We're the only supplier in the region that offers same-day delivery on all flooring products, with a 25-year warranty that no competitor can match..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={5}
        className="resize-none"
      />
      <p className="text-xs text-muted-foreground">
        Think about: unique services, pricing advantages, expertise, customer experience, guarantees
      </p>
    </div>
  );
}

function StepTargetCustomer({
  customerType,
  demographics,
  painPoints,
  decisionFactors,
  painPointInput,
  factorInput,
  onCustomerTypeChange,
  onDemographicsChange,
  onAddPainPoint,
  onRemovePainPoint,
  onAddFactor,
  onRemoveFactor,
  onPainPointInputChange,
  onFactorInputChange,
  onPainPointKeyDown,
  onFactorKeyDown,
}: {
  customerType: string;
  demographics: string;
  painPoints: string[];
  decisionFactors: string[];
  painPointInput: string;
  factorInput: string;
  onCustomerTypeChange: (v: 'B2B' | 'B2C' | 'both') => void;
  onDemographicsChange: (v: string) => void;
  onAddPainPoint: (v: string) => void;
  onRemovePainPoint: (i: number) => void;
  onAddFactor: (v: string) => void;
  onRemoveFactor: (i: number) => void;
  onPainPointInputChange: (v: string) => void;
  onFactorInputChange: (v: string) => void;
  onPainPointKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  onFactorKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
          <Users className="w-5 h-5 text-green-500" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Target Customer</h2>
          <p className="text-sm text-muted-foreground">Who are you trying to reach?</p>
        </div>
      </div>

      {/* B2B / B2C toggle */}
      <div className="space-y-2">
        <Label>Customer Type</Label>
        <div className="flex gap-2">
          {(['B2B', 'B2C', 'both'] as const).map((type) => (
            <Button
              key={type}
              variant={customerType === type ? 'default' : 'outline'}
              size="sm"
              onClick={() => onCustomerTypeChange(type)}
            >
              {type === 'both' ? 'Both' : type}
            </Button>
          ))}
        </div>
      </div>

      {/* Demographics */}
      <div className="space-y-2">
        <Label>Demographics</Label>
        <Input
          placeholder="e.g., Small business owners aged 30-55, construction companies"
          value={demographics}
          onChange={(e) => onDemographicsChange(e.target.value)}
        />
      </div>

      {/* Pain Points */}
      <div className="space-y-2">
        <Label>Pain Points</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Type a pain point and press Enter"
            value={painPointInput}
            onChange={(e) => onPainPointInputChange(e.target.value)}
            onKeyDown={onPainPointKeyDown}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddPainPoint(painPointInput)}
            disabled={!painPointInput.trim()}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {painPoints.map((point, i) => (
            <Badge key={i} variant="secondary" className="gap-1 pr-1">
              {point}
              <button onClick={() => onRemovePainPoint(i)} className="ml-1 hover:text-destructive">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>

      {/* Decision Factors */}
      <div className="space-y-2">
        <Label>Decision Factors</Label>
        <div className="flex gap-2">
          <Input
            placeholder="What influences their buying decisions?"
            value={factorInput}
            onChange={(e) => onFactorInputChange(e.target.value)}
            onKeyDown={onFactorKeyDown}
          />
          <Button variant="outline" size="sm" onClick={() => onAddFactor(factorInput)} disabled={!factorInput.trim()}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {decisionFactors.map((factor, i) => (
            <Badge key={i} variant="secondary" className="gap-1 pr-1">
              {factor}
              <button onClick={() => onRemoveFactor(i)} className="ml-1 hover:text-destructive">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepProductRanking({
  products,
  productTiers,
  onTierChange,
}: {
  products: Array<{ id: string; name: string }>;
  productTiers: Record<string, string>;
  onTierChange: (productId: string, tier: string) => void;
}) {
  if (products.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <Layers className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Product Ranking</h2>
            <p className="text-sm text-muted-foreground">Prioritize which products to feature most</p>
          </div>
        </div>
        <div className="py-8 text-center text-muted-foreground">
          <p>No products found. You can add products later in the Library.</p>
          <p className="text-xs mt-2">Click Next to continue.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
          <Layers className="w-5 h-5 text-purple-500" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Product Ranking</h2>
          <p className="text-sm text-muted-foreground">Assign a tier to each product</p>
        </div>
      </div>

      <div className="text-xs text-muted-foreground space-y-1">
        <p>
          <strong>Flagship</strong> — Premium, high-revenue products (featured most often)
        </p>
        <p>
          <strong>Core</strong> — Steady sellers, regular rotation
        </p>
        <p>
          <strong>Supporting</strong> — Complementary products, less frequent
        </p>
        <p>
          <strong>New</strong> — Recently added, introductory promotion
        </p>
      </div>

      <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
        {products.map((product) => (
          <div
            key={product.id}
            className="flex items-center justify-between gap-4 px-3 py-2.5 rounded-lg border border-border bg-card"
          >
            <span className="text-sm font-medium truncate flex-1">{product.name}</span>
            <Select value={productTiers[product.id] || 'core'} onValueChange={(val) => onTierChange(product.id, val)}>
              <SelectTrigger className="h-7 text-xs w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIER_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t}>
                    <Badge variant="outline" className={`text-xs ${TIER_COLORS[t]}`}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </Badge>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepContentThemes({
  themes,
  themeInput,
  onThemeInputChange,
  onAdd,
  onRemove,
  onKeyDown,
}: {
  themes: string[];
  themeInput: string;
  onThemeInputChange: (v: string) => void;
  onAdd: (v: string) => void;
  onRemove: (i: number) => void;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center">
          <Palette className="w-5 h-5 text-pink-500" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Content Themes</h2>
          <p className="text-sm text-muted-foreground">What topics should your content cover?</p>
        </div>
      </div>

      {/* Suggested themes */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Suggested themes (click to add)</Label>
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTED_THEMES.filter((t) => !themes.includes(t)).map((theme) => (
            <Badge
              key={theme}
              variant="outline"
              className="cursor-pointer hover:bg-primary/10 hover:border-primary/30 transition-colors"
              onClick={() => onAdd(theme)}
            >
              <Plus className="w-3 h-3 mr-1" />
              {theme}
            </Badge>
          ))}
        </div>
      </div>

      {/* Custom input */}
      <div className="space-y-2">
        <Label>Add custom theme</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Type a theme and press Enter"
            value={themeInput}
            onChange={(e) => onThemeInputChange(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <Button variant="outline" size="sm" onClick={() => onAdd(themeInput)} disabled={!themeInput.trim()}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Selected themes */}
      {themes.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Selected themes ({themes.length})</Label>
          <div className="flex flex-wrap gap-1.5">
            {themes.map((theme, i) => (
              <Badge key={i} variant="secondary" className="gap-1 pr-1">
                {theme}
                <button onClick={() => onRemove(i)} className="ml-1 hover:text-destructive">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StepReview({
  data,
  products,
  onEditStep,
}: {
  data: OnboardingData;
  products: Array<{ id: string; name: string }>;
  onEditStep: (step: number) => void;
}) {
  const getProductName = (id: string) => {
    const p = products.find((prod) => prod.id === id);
    return p ? p.name : id;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
          <CheckCircle className="w-5 h-5 text-green-500" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Review & Confirm</h2>
          <p className="text-sm text-muted-foreground">Review your setup before saving</p>
        </div>
      </div>

      <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
        {/* Industry */}
        <ReviewRow
          label="Industry"
          value={`${data.industry}${data.niche ? ` / ${data.niche}` : ''}`}
          onEdit={() => onEditStep(2)}
        />

        {/* Differentiator */}
        <ReviewRow
          label="Differentiator"
          value={data.differentiator || 'Not set'}
          onEdit={() => onEditStep(3)}
          truncate
        />

        {/* Customer */}
        <ReviewRow label="Customer Type" value={data.customerType} onEdit={() => onEditStep(4)} />

        {data.painPoints.length > 0 && (
          <ReviewRow label="Pain Points" value={data.painPoints.join(', ')} onEdit={() => onEditStep(4)} truncate />
        )}

        {/* Products */}
        {Object.keys(data.productTiers).length > 0 && (
          <ReviewRow
            label="Product Tiers"
            value={Object.entries(data.productTiers)
              .map(([id, tier]) => `${getProductName(id)}: ${tier}`)
              .join(', ')}
            onEdit={() => onEditStep(5)}
            truncate
          />
        )}

        {/* Themes */}
        {data.contentThemes.length > 0 && (
          <ReviewRow
            label="Content Themes"
            value={data.contentThemes.join(', ')}
            onEdit={() => onEditStep(6)}
            truncate
          />
        )}
      </div>
    </div>
  );
}

function ReviewRow({
  label,
  value,
  onEdit,
  truncate,
}: {
  label: string;
  value: string;
  onEdit: () => void;
  truncate?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border bg-muted/30">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className={`text-sm mt-0.5 ${truncate ? 'line-clamp-2' : ''}`}>{value}</p>
      </div>
      <Button variant="ghost" size="sm" onClick={onEdit} className="text-xs shrink-0">
        Edit
      </Button>
    </div>
  );
}
