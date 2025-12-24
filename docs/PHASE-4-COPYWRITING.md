# Phase 4: Copywriting & Complete Ad Generation

## Overview
Add AI-powered copywriting to generate complete advertisement packages (image + headline + body copy + CTA + caption + hashtags).

## Database Schema Changes

### New Table: `adCopy`

```typescript
// Add to shared/schema.ts
export const adCopy = pgTable('ad_copy', {
  id: serial('id').primaryKey(),
  generationId: integer('generation_id').notNull().references(() => generations.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id),

  // Copy fields
  headline: text('headline').notNull(),
  bodyText: text('body_text').notNull(),
  cta: text('cta').notNull(),
  caption: text('caption').notNull(),
  hashtags: text('hashtags').array().notNull(),

  // Context
  platform: varchar('platform', { length: 50 }).notNull(), // instagram, linkedin, twitter, facebook
  tone: varchar('tone', { length: 50 }).notNull(), // professional, casual, fun, luxury, minimal
  industry: varchar('industry', { length: 100 }), // optional product industry

  // Metadata
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type AdCopy = typeof adCopy.$inferSelect;
export type InsertAdCopy = typeof adCopy.$inferInsert;
```

### Migration File

```bash
# Create migration
npx drizzle-kit generate:pg --schema=./shared/schema.ts
npx drizzle-kit push:pg
```

---

## Task Breakdown

### Task 4.1: Database Schema
**File:** `shared/schema.ts`
- Add `adCopy` table definition
- Add type exports
- Run migration

**Acceptance Criteria:**
- Table created in PostgreSQL
- Foreign keys working (generationId → generations, userId → users)
- Can insert/query adCopy records

---

### Task 4.2: Copywriting Service
**File:** `server/services/copywritingService.ts`

```typescript
import { GoogleGenAI } from '@google/genai';

interface CopyGenerationRequest {
  productName?: string;
  productDescription?: string;
  prompt: string; // Original image generation prompt
  platform: 'instagram' | 'linkedin' | 'twitter' | 'facebook';
  tone: 'professional' | 'casual' | 'fun' | 'luxury' | 'minimal';
  industry?: string;
}

interface GeneratedCopy {
  headline: string;
  bodyText: string;
  cta: string;
  caption: string;
  hashtags: string[];
}

export class CopywritingService {
  private genai: GoogleGenAI;

  constructor() {
    this.genai = new GoogleGenAI({
      apiKey: process.env.GOOGLE_API_KEY!,
    });
  }

  async generateCopy(request: CopyGenerationRequest): Promise<GeneratedCopy> {
    const model = this.genai.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
    });

    const prompt = this.buildPrompt(request);
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return this.parseCopyResponse(text);
  }

  private buildPrompt(request: CopyGenerationRequest): string {
    const platformGuidelines = this.getPlatformGuidelines(request.platform);
    const toneGuidelines = this.getToneGuidelines(request.tone);

    return `You are an expert copywriter creating advertisement copy for ${request.platform}.

Product/Scene: ${request.prompt}
${request.productName ? `Product Name: ${request.productName}` : ''}
${request.productDescription ? `Description: ${request.productDescription}` : ''}
${request.industry ? `Industry: ${request.industry}` : ''}

Platform: ${request.platform}
${platformGuidelines}

Tone: ${request.tone}
${toneGuidelines}

Generate the following in JSON format:
{
  "headline": "Attention-grabbing headline (max 60 characters)",
  "bodyText": "Persuasive body copy (2-3 sentences, max 150 words)",
  "cta": "Clear call-to-action (max 30 characters)",
  "caption": "Social media caption optimized for ${request.platform} (max ${this.getCaptionLimit(request.platform)} characters)",
  "hashtags": ["5-8", "relevant", "hashtags", "without", "#", "symbol"]
}

IMPORTANT:
- Make it compelling and conversion-focused
- Match the ${request.tone} tone exactly
- Follow ${request.platform} best practices
- Return ONLY valid JSON, no markdown or explanation`;
  }

  private getPlatformGuidelines(platform: string): string {
    const guidelines = {
      instagram: '- Visual-first platform\n- Casual, authentic tone\n- Use emojis sparingly\n- Caption: engaging storytelling',
      linkedin: '- Professional network\n- Business-focused\n- No emojis\n- Thought leadership angle',
      twitter: '- Concise and punchy\n- News-worthy angle\n- Hashtags max 2-3\n- Direct and clear',
      facebook: '- Community-focused\n- Conversational\n- Encourage engagement\n- Longer captions OK',
    };
    return guidelines[platform as keyof typeof guidelines] || '';
  }

  private getToneGuidelines(tone: string): string {
    const guidelines = {
      professional: 'Authoritative, trustworthy, industry expert voice',
      casual: 'Friendly, approachable, conversational, relatable',
      fun: 'Playful, energetic, enthusiastic, light-hearted',
      luxury: 'Sophisticated, exclusive, premium, aspirational',
      minimal: 'Clean, concise, understated, no fluff',
    };
    return guidelines[tone as keyof typeof guidelines] || '';
  }

  private getCaptionLimit(platform: string): number {
    const limits = {
      instagram: 2200,
      linkedin: 3000,
      twitter: 280,
      facebook: 63206,
    };
    return limits[platform as keyof typeof limits] || 500;
  }

  private parseCopyResponse(text: string): GeneratedCopy {
    // Remove markdown code blocks if present
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    try {
      const parsed = JSON.parse(cleaned);

      // Validate required fields
      if (!parsed.headline || !parsed.bodyText || !parsed.cta || !parsed.caption || !Array.isArray(parsed.hashtags)) {
        throw new Error('Missing required fields in generated copy');
      }

      // Add # to hashtags if not present
      const hashtags = parsed.hashtags.map((tag: string) =>
        tag.startsWith('#') ? tag : `#${tag}`
      );

      return {
        headline: parsed.headline,
        bodyText: parsed.bodyText,
        cta: parsed.cta,
        caption: parsed.caption,
        hashtags: hashtags,
      };
    } catch (error) {
      throw new Error(`Failed to parse generated copy: ${error}`);
    }
  }
}

export const copywritingService = new CopywritingService();
```

**Acceptance Criteria:**
- Service generates copy using Gemini 2.0 Flash
- Handles all 4 platforms (Instagram, LinkedIn, Twitter, Facebook)
- Handles all 5 tones (professional, casual, fun, luxury, minimal)
- Returns properly formatted JSON
- Validates output structure

---

### Task 4.3: Storage Layer
**File:** `server/storage.ts`

Add these methods:

```typescript
async saveCopy(copy: InsertAdCopy): Promise<AdCopy> {
  const [saved] = await this.db.insert(adCopy).values(copy).returning();
  return saved;
}

async getCopyByGenerationId(generationId: number): Promise<AdCopy[]> {
  return this.db.select().from(adCopy).where(eq(adCopy.generationId, generationId));
}

async getCopyById(id: number): Promise<AdCopy | undefined> {
  const [copy] = await this.db.select().from(adCopy).where(eq(adCopy.id, id));
  return copy;
}

async deleteCopy(id: number): Promise<void> {
  await this.db.delete(adCopy).where(eq(adCopy.id, id));
}
```

---

### Task 4.4: Validation Schemas
**File:** `server/validation/schemas.ts`

```typescript
export const generateCopySchema = z.object({
  generationId: z.number().int().positive(),
  platform: z.enum(['instagram', 'linkedin', 'twitter', 'facebook']),
  tone: z.enum(['professional', 'casual', 'fun', 'luxury', 'minimal']),
  industry: z.string().max(100).optional(),
});

export type GenerateCopyInput = z.infer<typeof generateCopySchema>;
```

---

### Task 4.5: API Endpoint
**File:** `server/routes.ts`

```typescript
import { copywritingService } from './services/copywritingService';
import { generateCopySchema } from './validation/schemas';
import { validate } from './middleware/validate';

// POST /api/copy/generate
app.post('/api/copy/generate', requireAuth, validate(generateCopySchema), async (req, res) => {
  try {
    const { generationId, platform, tone, industry } = req.body;

    // Get the generation
    const generation = await storage.getGenerationById(generationId);
    if (!generation) {
      return res.status(404).json({ error: 'Generation not found' });
    }

    // Verify ownership
    if (generation.userId !== req.session.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Get product info if available
    let productName: string | undefined;
    let productDescription: string | undefined;

    if (generation.originalImagePaths && generation.originalImagePaths.length > 0) {
      // Try to get product from first image path
      // This is a simplification - you might want to fetch from products table
      productName = 'Product'; // TODO: Get from products table
    }

    // Generate copy
    const generatedCopy = await copywritingService.generateCopy({
      productName,
      productDescription,
      prompt: generation.prompt,
      platform,
      tone,
      industry,
    });

    // Save to database
    const savedCopy = await storage.saveCopy({
      generationId,
      userId: req.session.userId!,
      headline: generatedCopy.headline,
      bodyText: generatedCopy.bodyText,
      cta: generatedCopy.cta,
      caption: generatedCopy.caption,
      hashtags: generatedCopy.hashtags,
      platform,
      tone,
      industry,
    });

    res.json(savedCopy);
  } catch (error) {
    console.error('Copy generation error:', error);
    res.status(500).json({ error: 'Failed to generate copy' });
  }
});

// GET /api/copy/generation/:generationId
app.get('/api/copy/generation/:generationId', requireAuth, async (req, res) => {
  try {
    const generationId = parseInt(req.params.generationId);
    const copies = await storage.getCopyByGenerationId(generationId);

    // Filter by user ownership
    const userCopies = copies.filter(copy => copy.userId === req.session.userId);

    res.json(userCopies);
  } catch (error) {
    console.error('Error fetching copies:', error);
    res.status(500).json({ error: 'Failed to fetch copies' });
  }
});

// DELETE /api/copy/:id
app.delete('/api/copy/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const copy = await storage.getCopyById(id);

    if (!copy) {
      return res.status(404).json({ error: 'Copy not found' });
    }

    if (copy.userId !== req.session.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await storage.deleteCopy(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting copy:', error);
    res.status(500).json({ error: 'Failed to delete copy' });
  }
});
```

---

### Task 4.6: Frontend - Copy Panel Component
**File:** `client/src/components/CopyPanel.tsx`

```typescript
import { useState } from 'react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Loader2, Copy, Download } from 'lucide-react';

interface CopyPanelProps {
  generationId: number;
}

interface AdCopy {
  id: number;
  headline: string;
  bodyText: string;
  cta: string;
  caption: string;
  hashtags: string[];
  platform: string;
  tone: string;
}

export function CopyPanel({ generationId }: CopyPanelProps) {
  const [platform, setPlatform] = useState<string>('instagram');
  const [tone, setTone] = useState<string>('professional');
  const [generating, setGenerating] = useState(false);
  const [copies, setCopies] = useState<AdCopy[]>([]);
  const [selectedCopy, setSelectedCopy] = useState<AdCopy | null>(null);

  const generateCopy = async () => {
    setGenerating(true);
    try {
      const response = await fetch('/api/copy/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generationId, platform, tone }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate copy');
      }

      const newCopy = await response.json();
      setCopies([newCopy, ...copies]);
      setSelectedCopy(newCopy);
    } catch (error) {
      console.error('Error generating copy:', error);
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const downloadCopy = () => {
    if (!selectedCopy) return;

    const content = `HEADLINE
${selectedCopy.headline}

BODY
${selectedCopy.bodyText}

CTA
${selectedCopy.cta}

CAPTION (${selectedCopy.platform})
${selectedCopy.caption}

HASHTAGS
${selectedCopy.hashtags.join(' ')}
`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ad-copy-${selectedCopy.platform}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Generate Ad Copy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Platform</label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="twitter">Twitter</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Tone</label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="fun">Fun</SelectItem>
                  <SelectItem value="luxury">Luxury</SelectItem>
                  <SelectItem value="minimal">Minimal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={generateCopy}
            disabled={generating}
            className="w-full"
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Copy...
              </>
            ) : (
              'Generate Ad Copy'
            )}
          </Button>
        </CardContent>
      </Card>

      {selectedCopy && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Generated Copy</CardTitle>
              <div className="flex gap-2 mt-2">
                <Badge variant="secondary">{selectedCopy.platform}</Badge>
                <Badge variant="outline">{selectedCopy.tone}</Badge>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={downloadCopy}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold">Headline</label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(selectedCopy.headline)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-lg font-bold">{selectedCopy.headline}</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold">Body Text</label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(selectedCopy.bodyText)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm">{selectedCopy.bodyText}</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold">Call to Action</label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(selectedCopy.cta)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="font-medium">{selectedCopy.cta}</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold">Caption</label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(selectedCopy.caption)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <Textarea
                value={selectedCopy.caption}
                readOnly
                className="resize-none"
                rows={3}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold">Hashtags</label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(selectedCopy.hashtags.join(' '))}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedCopy.hashtags.map((tag, i) => (
                  <Badge key={i} variant="secondary">{tag}</Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

---

### Task 4.7: Integrate into GenerationDetail Page
**File:** `client/src/pages/GenerationDetail.tsx`

Add import and include CopyPanel:

```typescript
import { CopyPanel } from '../components/CopyPanel';

// In the component JSX, add a new tab or section:
<div className="mt-8">
  <h2 className="text-2xl font-bold mb-4">Ad Copy</h2>
  <CopyPanel generationId={generation.id} />
</div>
```

---

### Task 4.8: Tests
**File:** `server/__tests__/copywriting.test.ts`

```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';
import { copywritingService } from '../services/copywritingService';

describe('CopywritingService', () => {
  describe('generateCopy', () => {
    it('should generate copy for Instagram professional tone', async () => {
      const result = await copywritingService.generateCopy({
        prompt: 'Premium concrete patio in modern backyard',
        platform: 'instagram',
        tone: 'professional',
      });

      expect(result).toHaveProperty('headline');
      expect(result).toHaveProperty('bodyText');
      expect(result).toHaveProperty('cta');
      expect(result).toHaveProperty('caption');
      expect(result).toHaveProperty('hashtags');
      expect(Array.isArray(result.hashtags)).toBe(true);
      expect(result.hashtags.length).toBeGreaterThanOrEqual(5);
    }, 30000);

    it('should generate copy for LinkedIn luxury tone', async () => {
      const result = await copywritingService.generateCopy({
        prompt: 'High-end office renovation',
        platform: 'linkedin',
        tone: 'luxury',
      });

      expect(result.headline.length).toBeLessThanOrEqual(60);
      expect(result.cta.length).toBeLessThanOrEqual(30);
    }, 30000);

    it('should format hashtags with # symbol', async () => {
      const result = await copywritingService.generateCopy({
        prompt: 'Modern kitchen design',
        platform: 'instagram',
        tone: 'casual',
      });

      result.hashtags.forEach(tag => {
        expect(tag).toMatch(/^#/);
      });
    }, 30000);
  });
});
```

---

## Implementation Order

1. ✅ **Database Schema** (Task 4.1) - Foundation
2. ✅ **Validation Schemas** (Task 4.4) - Input validation
3. ✅ **Copywriting Service** (Task 4.2) - Core AI logic
4. ✅ **Storage Layer** (Task 4.3) - Database operations
5. ✅ **API Endpoint** (Task 4.5) - Backend API
6. ✅ **Frontend Component** (Task 4.6) - UI for copy generation
7. ✅ **Integration** (Task 4.7) - Add to GenerationDetail page
8. ✅ **Tests** (Task 4.8) - Verify everything works

## Estimated Time
- Backend (Tasks 4.1-4.5): **~12 hours**
- Frontend (Tasks 4.6-4.7): **~8 hours**
- Testing (Task 4.8): **~4 hours**

**Total: ~24 hours** of focused development

## Success Criteria

When complete, users should be able to:
1. Generate an image
2. Click "Generate Ad Copy" button
3. Select platform (Instagram, LinkedIn, etc.)
4. Select tone (Professional, Casual, etc.)
5. Get complete ad package:
   - ✅ Headline
   - ✅ Body text
   - ✅ CTA
   - ✅ Caption
   - ✅ 5-8 hashtags
6. Copy individual elements to clipboard
7. Download complete copy as text file
8. View multiple copy variations per image
