# Context Engine Specification
## Product Content Studio - Personalized AI System

**Date:** November 30, 2025
**Status:** Proposed
**Priority:** HIGH - This is the differentiating feature

---

# EXECUTIVE SUMMARY

The Context Engine transforms the app from a **generic image generator** into a **learning system** that understands each user's business, preferences, and success patterns.

| Aspect | Current (Generic) | With Context Engine |
|--------|-------------------|---------------------|
| Suggestions | "cozy coffee setup" | "construction site with dramatic lighting" |
| Prompt building | Static template | Dynamic based on user history |
| Learning | None | Improves with every generation |
| Personalization | Zero | Fully personalized |
| Industry awareness | None | Knows user's business |

---

# PART 1: DATABASE SCHEMA

## New Tables

### 1. `user_profiles` - Business Context

```sql
CREATE TABLE user_profiles (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Business Identity
  business_name VARCHAR(255),
  industry VARCHAR(100) NOT NULL,           -- "construction", "retail", "food", "fashion", "tech"
  industry_subcategory VARCHAR(100),        -- "steel manufacturing", "outdoor furniture"
  target_audience VARCHAR(100),             -- "B2B", "B2C", "both"
  audience_description TEXT,                -- "contractors, builders, architects"

  -- Brand Style Preferences
  brand_style VARCHAR(50),                  -- "premium", "rugged", "minimal", "playful", "professional"
  preferred_mood VARCHAR(50),               -- "dramatic", "natural", "warm", "cool", "vibrant"
  color_preferences TEXT[],                 -- ["earth tones", "industrial grays", "warm oranges"]
  avoid_elements TEXT[],                    -- ["cartoons", "text overlays", "people faces"]

  -- Platform Preferences
  primary_platforms TEXT[],                 -- ["linkedin", "instagram", "website"]
  default_aspect_ratio VARCHAR(20),         -- "1:1", "16:9", "4:5"

  -- Onboarding Status
  onboarding_completed BOOLEAN DEFAULT FALSE,
  onboarding_step INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2. `generation_analytics` - Learning from Usage

```sql
CREATE TABLE generation_analytics (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id VARCHAR(36) REFERENCES generations(id) ON DELETE CASCADE,
  user_id VARCHAR(36) REFERENCES user_profiles(id),

  -- Success Signals
  was_downloaded BOOLEAN DEFAULT FALSE,
  download_count INTEGER DEFAULT 0,
  was_shared BOOLEAN DEFAULT FALSE,
  was_favorited BOOLEAN DEFAULT FALSE,

  -- Refinement Signals
  was_edited BOOLEAN DEFAULT FALSE,
  edit_count INTEGER DEFAULT 0,
  time_to_first_edit INTEGER,               -- seconds until first edit (null = no edit)
  final_satisfaction VARCHAR(20),           -- "used_as_is", "edited_once", "edited_multiple", "abandoned"

  -- Extracted Insights
  detected_scene VARCHAR(100),              -- "outdoor", "studio", "urban", "industrial"
  detected_mood VARCHAR(100),               -- "dramatic", "soft", "vibrant"
  detected_lighting VARCHAR(100),           -- "natural", "golden_hour", "studio", "dramatic"
  prompt_keywords TEXT[],                   -- ["construction", "premium", "worksite"]

  -- Quality Score (computed)
  success_score DECIMAL(3,2),               -- 0.00 to 1.00, based on signals

  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_analytics_user ON generation_analytics(user_id);
CREATE INDEX idx_analytics_success ON generation_analytics(success_score DESC);
```

### 3. `idea_bank` - User's Saved Ideas & Inspiration

```sql
CREATE TABLE idea_bank (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(36) REFERENCES user_profiles(id),

  -- Idea Content
  title VARCHAR(255),
  idea_text TEXT NOT NULL,
  category VARCHAR(100),                    -- "lifestyle", "product_shot", "seasonal", "campaign"
  tags TEXT[],

  -- Source Tracking
  source VARCHAR(50) NOT NULL,              -- "user_created", "ai_suggested", "from_generation", "imported"
  source_generation_id VARCHAR(36),         -- If derived from a generation

  -- Usage Tracking
  times_used INTEGER DEFAULT 0,
  last_used_at TIMESTAMP,
  is_favorite BOOLEAN DEFAULT FALSE,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ideas_user ON idea_bank(user_id);
CREATE INDEX idx_ideas_favorite ON idea_bank(user_id, is_favorite);
```

### 4. `prompt_patterns` - What Works for This User

```sql
CREATE TABLE prompt_patterns (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(36) REFERENCES user_profiles(id),

  -- Pattern Definition
  pattern_type VARCHAR(50) NOT NULL,        -- "keyword", "style", "scene", "lighting"
  pattern_value VARCHAR(255) NOT NULL,      -- "dramatic shadows", "outdoor", "golden hour"

  -- Performance Metrics
  usage_count INTEGER DEFAULT 1,
  success_count INTEGER DEFAULT 0,          -- How many led to downloads
  avg_success_score DECIMAL(3,2),

  -- Computed Recommendation Score
  recommendation_weight DECIMAL(3,2),       -- Higher = suggest more often

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_patterns_user ON prompt_patterns(user_id);
CREATE INDEX idx_patterns_weight ON prompt_patterns(user_id, recommendation_weight DESC);
```

---

## Schema Updates to Existing Tables

### Update `generations` table

```sql
ALTER TABLE generations ADD COLUMN user_id VARCHAR(36) REFERENCES user_profiles(id);
ALTER TABLE generations ADD COLUMN detected_intent JSONB;
ALTER TABLE generations ADD COLUMN prompt_source VARCHAR(50); -- "user_typed", "suggestion", "idea_bank", "quick_edit"
```

### Update `products` table

```sql
ALTER TABLE products ADD COLUMN user_id VARCHAR(36) REFERENCES user_profiles(id);
ALTER TABLE products ADD COLUMN auto_detected_type VARCHAR(100); -- AI-detected product type
ALTER TABLE products ADD COLUMN usage_count INTEGER DEFAULT 0;
```

---

## Drizzle Schema (TypeScript)

```typescript
// shared/schema.ts additions

export const userProfiles = pgTable("user_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  // Business Identity
  businessName: varchar("business_name", { length: 255 }),
  industry: varchar("industry", { length: 100 }).notNull(),
  industrySubcategory: varchar("industry_subcategory", { length: 100 }),
  targetAudience: varchar("target_audience", { length: 100 }),
  audienceDescription: text("audience_description"),

  // Brand Style
  brandStyle: varchar("brand_style", { length: 50 }),
  preferredMood: varchar("preferred_mood", { length: 50 }),
  colorPreferences: text("color_preferences").array(),
  avoidElements: text("avoid_elements").array(),

  // Platform Preferences
  primaryPlatforms: text("primary_platforms").array(),
  defaultAspectRatio: varchar("default_aspect_ratio", { length: 20 }),

  // Onboarding
  onboardingCompleted: boolean("onboarding_completed").default(false),
  onboardingStep: integer("onboarding_step").default(0),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const generationAnalytics = pgTable("generation_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  generationId: varchar("generation_id").references(() => generations.id),
  userId: varchar("user_id").references(() => userProfiles.id),

  // Success Signals
  wasDownloaded: boolean("was_downloaded").default(false),
  downloadCount: integer("download_count").default(0),
  wasShared: boolean("was_shared").default(false),
  wasFavorited: boolean("was_favorited").default(false),

  // Refinement Signals
  wasEdited: boolean("was_edited").default(false),
  editCount: integer("edit_count").default(0),
  finalSatisfaction: varchar("final_satisfaction", { length: 20 }),

  // Extracted Insights
  detectedScene: varchar("detected_scene", { length: 100 }),
  detectedMood: varchar("detected_mood", { length: 100 }),
  detectedLighting: varchar("detected_lighting", { length: 100 }),
  promptKeywords: text("prompt_keywords").array(),

  // Quality Score
  successScore: decimal("success_score", { precision: 3, scale: 2 }),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const ideaBank = pgTable("idea_bank", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => userProfiles.id),

  title: varchar("title", { length: 255 }),
  ideaText: text("idea_text").notNull(),
  category: varchar("category", { length: 100 }),
  tags: text("tags").array(),

  source: varchar("source", { length: 50 }).notNull(),
  sourceGenerationId: varchar("source_generation_id"),

  timesUsed: integer("times_used").default(0),
  lastUsedAt: timestamp("last_used_at"),
  isFavorite: boolean("is_favorite").default(false),
  isActive: boolean("is_active").default(true),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const promptPatterns = pgTable("prompt_patterns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => userProfiles.id),

  patternType: varchar("pattern_type", { length: 50 }).notNull(),
  patternValue: varchar("pattern_value", { length: 255 }).notNull(),

  usageCount: integer("usage_count").default(1),
  successCount: integer("success_count").default(0),
  avgSuccessScore: decimal("avg_success_score", { precision: 3, scale: 2 }),
  recommendationWeight: decimal("recommendation_weight", { precision: 3, scale: 2 }),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

---

# PART 2: API ENDPOINTS

## User Profile Endpoints

### `POST /api/profile` - Create/Update Profile

```typescript
app.post('/api/profile', async (req, res) => {
  const {
    businessName,
    industry,
    industrySubcategory,
    targetAudience,
    audienceDescription,
    brandStyle,
    preferredMood,
    colorPreferences,
    avoidElements,
    primaryPlatforms,
    defaultAspectRatio
  } = req.body;

  // Validate required fields
  if (!industry) {
    return res.status(400).json({ error: "Industry is required" });
  }

  const profile = await storage.upsertUserProfile({
    businessName,
    industry,
    industrySubcategory,
    targetAudience,
    audienceDescription,
    brandStyle,
    preferredMood,
    colorPreferences,
    avoidElements,
    primaryPlatforms,
    defaultAspectRatio,
    onboardingCompleted: true,
    updatedAt: new Date()
  });

  res.json(profile);
});
```

### `GET /api/profile` - Get Current Profile

```typescript
app.get('/api/profile', async (req, res) => {
  const profile = await storage.getUserProfile();

  if (!profile) {
    return res.json({
      exists: false,
      needsOnboarding: true
    });
  }

  res.json({
    exists: true,
    profile,
    needsOnboarding: !profile.onboardingCompleted
  });
});
```

---

## Context Engine Endpoints

### `POST /api/context/suggestions` - Smart Personalized Suggestions

```typescript
app.post('/api/context/suggestions', async (req, res) => {
  const { productIds, customContext } = req.body;

  // 1. Get user profile
  const profile = await storage.getUserProfile();

  // 2. Get selected products
  const products = await storage.getProductsByIds(productIds);

  // 3. Get user's successful patterns
  const patterns = await storage.getTopPatterns({
    limit: 10,
    minSuccessScore: 0.7
  });

  // 4. Get recent successful generations
  const successfulGens = await storage.getSuccessfulGenerations({
    limit: 5,
    minDownloads: 1
  });

  // 5. Get user's saved ideas (favorites first)
  const savedIdeas = await storage.getIdeas({
    limit: 5,
    favoritesFirst: true
  });

  // 6. Build context-aware prompt for Gemini
  const contextPrompt = buildContextPrompt({
    profile,
    products,
    patterns,
    successfulGens,
    savedIdeas,
    customContext
  });

  // 7. Generate personalized suggestions
  const result = await genai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: contextPrompt,
  });

  const suggestions = parseGeminiSuggestions(result.text);

  res.json({
    suggestions,
    context: {
      industry: profile?.industry,
      topPatterns: patterns.slice(0, 3).map(p => p.patternValue),
      basedOnSuccessful: successfulGens.length
    }
  });
});
```

### `POST /api/context/enhance-prompt` - Smart Prompt Enhancement

```typescript
app.post('/api/context/enhance-prompt', async (req, res) => {
  const { rawPrompt, productIds, platform } = req.body;

  // 1. Get all context
  const profile = await storage.getUserProfile();
  const products = await storage.getProductsByIds(productIds);
  const patterns = await storage.getTopPatterns({ limit: 5 });

  // 2. Detect intent from raw prompt
  const intent = detectIntent(rawPrompt);

  // 3. Build enhanced prompt using context + intent
  const enhancedPrompt = await buildEnhancedPrompt({
    rawPrompt,
    intent,
    profile,
    products,
    patterns,
    platform
  });

  res.json({
    original: rawPrompt,
    enhanced: enhancedPrompt,
    detectedIntent: intent,
    appliedContext: {
      industry: profile?.industry,
      brandStyle: profile?.brandStyle,
      patternsApplied: patterns.map(p => p.patternValue)
    }
  });
});
```

---

## Analytics Endpoints

### `POST /api/analytics/track` - Track Generation Usage

```typescript
app.post('/api/analytics/track', async (req, res) => {
  const {
    generationId,
    event,  // "download", "share", "favorite", "edit"
    metadata
  } = req.body;

  const generation = await storage.getGenerationById(generationId);
  if (!generation) {
    return res.status(404).json({ error: "Generation not found" });
  }

  // Get or create analytics record
  let analytics = await storage.getAnalytics(generationId);

  if (!analytics) {
    // First tracking event - extract insights from generation
    const insights = await extractInsights(generation);

    analytics = await storage.createAnalytics({
      generationId,
      ...insights
    });
  }

  // Update based on event
  switch (event) {
    case 'download':
      analytics = await storage.updateAnalytics(generationId, {
        wasDownloaded: true,
        downloadCount: analytics.downloadCount + 1
      });
      break;
    case 'favorite':
      analytics = await storage.updateAnalytics(generationId, {
        wasFavorited: true
      });
      break;
    case 'edit':
      analytics = await storage.updateAnalytics(generationId, {
        wasEdited: true,
        editCount: analytics.editCount + 1
      });
      break;
  }

  // Recalculate success score
  const successScore = calculateSuccessScore(analytics);
  await storage.updateAnalytics(generationId, { successScore });

  // Update pattern weights based on this signal
  if (successScore > 0.7 && analytics.promptKeywords) {
    await updatePatternWeights(analytics.promptKeywords, successScore);
  }

  res.json({ success: true, analytics });
});
```

### `GET /api/analytics/insights` - Get User Insights

```typescript
app.get('/api/analytics/insights', async (req, res) => {
  // What's working for this user
  const topPatterns = await storage.getTopPatterns({ limit: 10 });

  // Success rate over time
  const successRate = await storage.getSuccessRate({ days: 30 });

  // Most successful generation types
  const topScenes = await storage.getTopByField('detectedScene', { limit: 5 });
  const topMoods = await storage.getTopByField('detectedMood', { limit: 5 });

  // Usage stats
  const stats = await storage.getUsageStats();

  res.json({
    insights: {
      whatWorks: topPatterns.map(p => ({
        pattern: p.patternValue,
        successRate: p.avgSuccessScore,
        timesUsed: p.usageCount
      })),
      topScenes,
      topMoods,
      successRate
    },
    stats: {
      totalGenerations: stats.total,
      totalDownloads: stats.downloads,
      avgEditsPerGeneration: stats.avgEdits,
      favoriteCount: stats.favorites
    }
  });
});
```

---

## Idea Bank Endpoints

### `GET /api/ideas` - Get User's Ideas

```typescript
app.get('/api/ideas', async (req, res) => {
  const { category, favoritesOnly, limit = 20 } = req.query;

  const ideas = await storage.getIdeas({
    category,
    favoritesOnly: favoritesOnly === 'true',
    limit: parseInt(limit),
    orderBy: 'lastUsedAt'
  });

  res.json(ideas);
});
```

### `POST /api/ideas` - Save New Idea

```typescript
app.post('/api/ideas', async (req, res) => {
  const { title, ideaText, category, tags, source, sourceGenerationId } = req.body;

  if (!ideaText) {
    return res.status(400).json({ error: "Idea text is required" });
  }

  const idea = await storage.saveIdea({
    title,
    ideaText,
    category,
    tags,
    source: source || 'user_created',
    sourceGenerationId
  });

  res.json(idea);
});
```

### `POST /api/ideas/:id/use` - Use an Idea (Track Usage)

```typescript
app.post('/api/ideas/:id/use', async (req, res) => {
  const { id } = req.params;

  const idea = await storage.getIdeaById(id);
  if (!idea) {
    return res.status(404).json({ error: "Idea not found" });
  }

  await storage.updateIdea(id, {
    timesUsed: idea.timesUsed + 1,
    lastUsedAt: new Date()
  });

  res.json({ success: true });
});
```

### `POST /api/ideas/generate` - AI-Generate Ideas Based on Context

```typescript
app.post('/api/ideas/generate', async (req, res) => {
  const { count = 5, category, productIds } = req.body;

  const profile = await storage.getUserProfile();
  const patterns = await storage.getTopPatterns({ limit: 5 });
  const products = productIds ? await storage.getProductsByIds(productIds) : [];

  const prompt = `Generate ${count} creative marketing image ideas for a ${profile?.industry || 'business'} company.

Business context:
- Industry: ${profile?.industry || 'general'}
- Brand style: ${profile?.brandStyle || 'professional'}
- Target audience: ${profile?.targetAudience || 'general'}
${products.length > 0 ? `- Products: ${products.map(p => p.name).join(', ')}` : ''}

What works for them (based on history):
${patterns.map(p => `- ${p.patternValue}`).join('\n')}

${category ? `Category focus: ${category}` : ''}

Return a JSON array of ideas, each with:
- title: short catchy name
- idea: detailed description (2-3 sentences)
- category: lifestyle/product_shot/seasonal/campaign
- tags: array of relevant keywords

Return ONLY valid JSON array.`;

  const result = await genai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  const ideas = JSON.parse(result.text || '[]');

  // Save generated ideas to idea bank
  for (const idea of ideas) {
    await storage.saveIdea({
      title: idea.title,
      ideaText: idea.idea,
      category: idea.category,
      tags: idea.tags,
      source: 'ai_suggested'
    });
  }

  res.json(ideas);
});
```

---

# PART 3: CONTEXT ENGINE CORE LOGIC

## File: `server/services/contextEngine.ts`

```typescript
import { storage } from '../storage';
import { GoogleGenAI } from '@google/genai';

interface UserContext {
  profile: UserProfile | null;
  patterns: PromptPattern[];
  successfulGenerations: Generation[];
  savedIdeas: Idea[];
  productInsights: ProductInsight[];
}

interface DetectedIntent {
  contentType: string;      // "lifestyle", "installation", "before_after", etc.
  scene: string;            // "outdoor", "studio", "urban", etc.
  mood: string;             // "premium", "warm", "dramatic", etc.
  platform: string | null;  // "instagram", "linkedin", etc.
  confidence: number;       // 0-1
}

// Gather all context for a user
export async function gatherContext(): Promise<UserContext> {
  const [profile, patterns, successfulGens, ideas] = await Promise.all([
    storage.getUserProfile(),
    storage.getTopPatterns({ limit: 10, minSuccessScore: 0.6 }),
    storage.getSuccessfulGenerations({ limit: 10 }),
    storage.getIdeas({ limit: 10, favoritesFirst: true })
  ]);

  // Analyze product library
  const products = await storage.getProducts();
  const productInsights = analyzeProductLibrary(products);

  return {
    profile,
    patterns,
    successfulGenerations: successfulGens,
    savedIdeas: ideas,
    productInsights
  };
}

// Detect intent from user's raw prompt
export function detectIntent(rawPrompt: string): DetectedIntent {
  const t = rawPrompt.toLowerCase();

  // Content Type Detection
  let contentType = 'lifestyle'; // default
  if (t.match(/together|combined|installed|connected|assembled/)) contentType = 'installation';
  else if (t.match(/before.*after|transformation|result|vs\b/)) contentType = 'before_after';
  else if (t.match(/how big|size|scale|compared|next to/)) contentType = 'scale_demo';
  else if (t.match(/christmas|summer|holiday|spring|winter|easter|seasonal/)) contentType = 'seasonal';
  else if (t.match(/problem|solves|without|broken|fixed/)) contentType = 'problem_solution';
  else if (t.match(/all products|range|collection|family|lineup/)) contentType = 'product_family';
  else if (t.match(/in use|action|using|being used|working/)) contentType = 'action_shot';
  else if (t.match(/premium|lifestyle|aspirational|amazing|luxury/)) contentType = 'lifestyle';

  // Scene Detection
  let scene = 'studio'; // default
  if (t.match(/outdoor|garden|park|nature|forest/)) scene = 'outdoor';
  else if (t.match(/home|kitchen|living|bedroom|interior/)) scene = 'domestic';
  else if (t.match(/office|workspace|desk|corporate/)) scene = 'office';
  else if (t.match(/construction|worksite|building|industrial/)) scene = 'industrial';
  else if (t.match(/street|urban|city|downtown/)) scene = 'urban';
  else if (t.match(/studio|clean|minimal|white/)) scene = 'studio';

  // Mood Detection
  let mood = 'professional'; // default
  if (t.match(/premium|luxury|elegant|sophisticated/)) mood = 'premium';
  else if (t.match(/cozy|warm|inviting|homey/)) mood = 'warm';
  else if (t.match(/fun|vibrant|energetic|bold/)) mood = 'vibrant';
  else if (t.match(/minimal|clean|simple/)) mood = 'minimal';
  else if (t.match(/dramatic|epic|impressive/)) mood = 'dramatic';
  else if (t.match(/authentic|real|natural/)) mood = 'natural';

  // Platform Detection
  let platform: string | null = null;
  if (t.match(/instagram|insta|ig\b/)) platform = 'instagram';
  else if (t.match(/linkedin/)) platform = 'linkedin';
  else if (t.match(/facebook|fb\b/)) platform = 'facebook';
  else if (t.match(/twitter|x\b|tweet/)) platform = 'twitter';

  // Confidence based on how many matches
  const matchCount = [contentType !== 'lifestyle', scene !== 'studio', mood !== 'professional', platform !== null].filter(Boolean).length;
  const confidence = Math.min(0.5 + (matchCount * 0.15), 1.0);

  return { contentType, scene, mood, platform, confidence };
}

// Build enhanced prompt using all context
export async function buildEnhancedPrompt(params: {
  rawPrompt: string;
  intent: DetectedIntent;
  products: Product[];
  context: UserContext;
  platform?: string;
}): Promise<string> {
  const { rawPrompt, intent, products, context, platform } = params;
  const { profile, patterns, successfulGenerations } = context;

  // Extract successful prompt snippets
  const successfulSnippets = successfulGenerations
    .slice(0, 3)
    .map(g => g.prompt)
    .join(' | ');

  // Build industry-specific guidelines
  const industryGuidelines = getIndustryGuidelines(profile?.industry);

  // Build the enhanced prompt
  let enhanced = `Transform ${products.length > 1 ? 'these products' : 'this product'} based on: ${rawPrompt}

CONTEXT:
- Industry: ${profile?.industry || 'general business'}
- Brand Style: ${profile?.brandStyle || 'professional'}
- Target Audience: ${profile?.targetAudience || 'general'}

DETECTED INTENT:
- Content Type: ${intent.contentType}
- Scene: ${intent.scene}
- Mood: ${intent.mood}
${intent.platform ? `- Platform: ${intent.platform}` : ''}

STYLE GUIDELINES (based on what works for this user):
${patterns.slice(0, 5).map(p => `- ${p.patternValue}`).join('\n')}

${industryGuidelines}

REQUIREMENTS:
- Keep product(s) as the hero/focus
- Maintain professional photography quality
- Match the ${intent.mood} mood with appropriate lighting
- Ensure product is clearly visible and recognizable
${profile?.avoidElements?.length ? `- AVOID: ${profile.avoidElements.join(', ')}` : ''}
- Do not add text or watermarks`;

  return enhanced;
}

// Industry-specific guidelines
function getIndustryGuidelines(industry?: string): string {
  const guidelines: Record<string, string> = {
    construction: `
INDUSTRY-SPECIFIC (Construction):
- Show products in realistic worksite contexts
- Include appropriate PPE if showing workers
- Emphasize durability and professional quality
- Authentic industrial environments work best`,

    food: `
INDUSTRY-SPECIFIC (Food & Beverage):
- Emphasize freshness and appetizing presentation
- Natural lighting works best
- Show texture and quality of ingredients
- Lifestyle context (kitchen, dining) adds appeal`,

    fashion: `
INDUSTRY-SPECIFIC (Fashion):
- Focus on fabric texture and drape
- Lifestyle/aspirational contexts work well
- Consider seasonal relevance
- Clean backgrounds for product focus`,

    tech: `
INDUSTRY-SPECIFIC (Technology):
- Clean, minimal backgrounds
- Show product in use context
- Emphasize sleek design and innovation
- Professional workspace settings work well`,

    retail: `
INDUSTRY-SPECIFIC (Retail):
- Lifestyle context sells better than plain product shots
- Show scale and size clearly
- Multiple angles/uses can be helpful
- Seasonal styling for campaigns`
  };

  return guidelines[industry || ''] || `
GENERAL GUIDELINES:
- Professional quality imagery
- Clear product visibility
- Appropriate context for product type
- Clean, non-distracting backgrounds`;
}

// Calculate success score from analytics signals
export function calculateSuccessScore(analytics: GenerationAnalytics): number {
  let score = 0.5; // Base score

  // Positive signals
  if (analytics.wasDownloaded) score += 0.2;
  if (analytics.downloadCount > 1) score += 0.1;
  if (analytics.wasFavorited) score += 0.15;
  if (analytics.wasShared) score += 0.1;

  // Negative signals
  if (analytics.wasEdited && analytics.editCount > 2) score -= 0.1;
  if (analytics.finalSatisfaction === 'abandoned') score -= 0.3;

  // Clamp between 0 and 1
  return Math.max(0, Math.min(1, score));
}

// Extract keywords/patterns from a prompt
export function extractPromptKeywords(prompt: string): string[] {
  const keywords: string[] = [];
  const t = prompt.toLowerCase();

  // Scene keywords
  const scenes = ['outdoor', 'indoor', 'studio', 'urban', 'nature', 'office', 'home', 'industrial', 'construction'];
  scenes.forEach(s => { if (t.includes(s)) keywords.push(s); });

  // Mood keywords
  const moods = ['premium', 'luxury', 'warm', 'cool', 'dramatic', 'soft', 'vibrant', 'minimal', 'elegant'];
  moods.forEach(m => { if (t.includes(m)) keywords.push(m); });

  // Lighting keywords
  const lighting = ['golden hour', 'natural light', 'dramatic lighting', 'soft lighting', 'studio lighting'];
  lighting.forEach(l => { if (t.includes(l)) keywords.push(l); });

  // Style keywords
  const styles = ['lifestyle', 'product shot', 'flat lay', 'action shot', 'in use'];
  styles.forEach(s => { if (t.includes(s)) keywords.push(s); });

  return [...new Set(keywords)]; // Remove duplicates
}

// Update pattern weights based on success
export async function updatePatternWeights(
  keywords: string[],
  successScore: number
): Promise<void> {
  for (const keyword of keywords) {
    const existing = await storage.getPatternByValue(keyword);

    if (existing) {
      // Update existing pattern
      const newAvg = (existing.avgSuccessScore * existing.usageCount + successScore) / (existing.usageCount + 1);
      await storage.updatePattern(existing.id, {
        usageCount: existing.usageCount + 1,
        successCount: successScore > 0.7 ? existing.successCount + 1 : existing.successCount,
        avgSuccessScore: newAvg,
        recommendationWeight: calculateRecommendationWeight(newAvg, existing.usageCount + 1),
        updatedAt: new Date()
      });
    } else {
      // Create new pattern
      await storage.createPattern({
        patternType: categorizeKeyword(keyword),
        patternValue: keyword,
        usageCount: 1,
        successCount: successScore > 0.7 ? 1 : 0,
        avgSuccessScore: successScore,
        recommendationWeight: successScore * 0.5 // Low weight for new patterns
      });
    }
  }
}

function calculateRecommendationWeight(avgScore: number, usageCount: number): number {
  // Balance between success rate and usage frequency
  // Patterns that work consistently AND are used often get highest weight
  const frequencyBonus = Math.min(usageCount / 20, 0.3); // Max 0.3 bonus for usage
  return Math.min(avgScore + frequencyBonus, 1.0);
}

function categorizeKeyword(keyword: string): string {
  if (['outdoor', 'indoor', 'studio', 'urban', 'nature', 'office', 'home', 'industrial'].includes(keyword)) {
    return 'scene';
  }
  if (['premium', 'luxury', 'warm', 'cool', 'dramatic', 'soft', 'vibrant', 'minimal'].includes(keyword)) {
    return 'mood';
  }
  if (keyword.includes('light')) {
    return 'lighting';
  }
  return 'style';
}
```

---

# PART 4: FRONTEND COMPONENTS

## 1. Onboarding Flow (`client/src/pages/Onboarding.tsx`)

```tsx
import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';

const INDUSTRIES = [
  { id: 'construction', label: 'Construction & Building', icon: '🏗️' },
  { id: 'retail', label: 'Retail & E-commerce', icon: '🛍️' },
  { id: 'food', label: 'Food & Beverage', icon: '🍕' },
  { id: 'fashion', label: 'Fashion & Apparel', icon: '👔' },
  { id: 'tech', label: 'Technology', icon: '💻' },
  { id: 'home', label: 'Home & Garden', icon: '🏠' },
  { id: 'health', label: 'Health & Beauty', icon: '💄' },
  { id: 'automotive', label: 'Automotive', icon: '🚗' },
  { id: 'other', label: 'Other', icon: '📦' },
];

const BRAND_STYLES = [
  { id: 'premium', label: 'Premium & Luxury', description: 'Elegant, sophisticated, high-end' },
  { id: 'professional', label: 'Professional', description: 'Clean, trustworthy, corporate' },
  { id: 'rugged', label: 'Rugged & Industrial', description: 'Tough, durable, hardworking' },
  { id: 'minimal', label: 'Minimal & Modern', description: 'Simple, clean, contemporary' },
  { id: 'warm', label: 'Warm & Friendly', description: 'Inviting, approachable, cozy' },
  { id: 'vibrant', label: 'Bold & Vibrant', description: 'Energetic, colorful, exciting' },
];

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'website', label: 'Website' },
  { id: 'twitter', label: 'Twitter/X' },
  { id: 'email', label: 'Email Marketing' },
];

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState({
    businessName: '',
    industry: '',
    targetAudience: '',
    brandStyle: '',
    primaryPlatforms: [] as string[],
  });
  const [saving, setSaving] = useState(false);

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const handleFinish = async () => {
    setSaving(true);
    try {
      await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });
      setLocation('/');
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const togglePlatform = (id: string) => {
    setProfile(p => ({
      ...p,
      primaryPlatforms: p.primaryPlatforms.includes(id)
        ? p.primaryPlatforms.filter(x => x !== id)
        : [...p.primaryPlatforms, id]
    }));
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-xl w-full space-y-8">
        {/* Progress */}
        <div className="flex gap-2">
          {[1, 2, 3, 4].map(s => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full ${s <= step ? 'bg-primary' : 'bg-muted'}`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Business Name & Industry */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h1 className="text-2xl font-bold">Let's personalize your experience</h1>
                <p className="text-muted-foreground mt-2">
                  Tell us about your business so we can generate better content for you.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Business Name (optional)</label>
                  <Input
                    value={profile.businessName}
                    onChange={e => setProfile(p => ({ ...p, businessName: e.target.value }))}
                    placeholder="Acme Construction"
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">What industry are you in?</label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {INDUSTRIES.map(ind => (
                      <button
                        key={ind.id}
                        onClick={() => setProfile(p => ({ ...p, industry: ind.id }))}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          profile.industry === ind.id
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <span className="text-xl">{ind.icon}</span>
                        <p className="text-sm mt-1">{ind.label}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <Button
                onClick={handleNext}
                disabled={!profile.industry}
                className="w-full"
              >
                Continue
              </Button>
            </motion.div>
          )}

          {/* Step 2: Target Audience */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h1 className="text-2xl font-bold">Who's your audience?</h1>
                <p className="text-muted-foreground mt-2">
                  This helps us create content that speaks to them.
                </p>
              </div>

              <div className="space-y-4">
                {['B2B (Businesses)', 'B2C (Consumers)', 'Both'].map(option => (
                  <button
                    key={option}
                    onClick={() => setProfile(p => ({ ...p, targetAudience: option }))}
                    className={`w-full p-4 rounded-lg border text-left transition-all ${
                      profile.targetAudience === option
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <p className="font-medium">{option}</p>
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={handleBack}>Back</Button>
                <Button
                  onClick={handleNext}
                  disabled={!profile.targetAudience}
                  className="flex-1"
                >
                  Continue
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Brand Style */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h1 className="text-2xl font-bold">What's your brand style?</h1>
                <p className="text-muted-foreground mt-2">
                  We'll match our suggestions to your aesthetic.
                </p>
              </div>

              <div className="space-y-2">
                {BRAND_STYLES.map(style => (
                  <button
                    key={style.id}
                    onClick={() => setProfile(p => ({ ...p, brandStyle: style.id }))}
                    className={`w-full p-4 rounded-lg border text-left transition-all ${
                      profile.brandStyle === style.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <p className="font-medium">{style.label}</p>
                    <p className="text-sm text-muted-foreground">{style.description}</p>
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={handleBack}>Back</Button>
                <Button
                  onClick={handleNext}
                  disabled={!profile.brandStyle}
                  className="flex-1"
                >
                  Continue
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Platforms */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h1 className="text-2xl font-bold">Where do you share content?</h1>
                <p className="text-muted-foreground mt-2">
                  Select all that apply. We'll optimize images for these platforms.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {PLATFORMS.map(platform => (
                  <button
                    key={platform.id}
                    onClick={() => togglePlatform(platform.id)}
                    className={`p-4 rounded-lg border text-left transition-all ${
                      profile.primaryPlatforms.includes(platform.id)
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <p className="font-medium">{platform.label}</p>
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={handleBack}>Back</Button>
                <Button
                  onClick={handleFinish}
                  disabled={saving}
                  className="flex-1"
                >
                  {saving ? 'Saving...' : 'Get Started'}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
```

## 2. Idea Bank Component (`client/src/components/IdeaBank.tsx`)

```tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Lightbulb, Plus, Star, Trash2, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Idea {
  id: string;
  title?: string;
  ideaText: string;
  category: string;
  tags: string[];
  isFavorite: boolean;
  timesUsed: number;
  source: string;
}

interface IdeaBankProps {
  onSelectIdea: (idea: string) => void;
  productIds?: string[];
}

export function IdeaBank({ onSelectIdea, productIds = [] }: IdeaBankProps) {
  const [newIdea, setNewIdea] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const queryClient = useQueryClient();

  // Fetch ideas
  const { data: ideas = [], isLoading } = useQuery<Idea[]>({
    queryKey: ['ideas'],
    queryFn: async () => {
      const res = await fetch('/api/ideas');
      return res.json();
    }
  });

  // Add idea
  const addIdea = useMutation({
    mutationFn: async (ideaText: string) => {
      const res = await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideaText, source: 'user_created' })
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
      setNewIdea('');
      setShowAddForm(false);
    }
  });

  // Generate AI ideas
  const generateIdeas = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/ideas/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 4, productIds })
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
    }
  });

  // Use idea
  const useIdea = async (idea: Idea) => {
    await fetch(`/api/ideas/${idea.id}/use`, { method: 'POST' });
    onSelectIdea(idea.ideaText);
  };

  // Toggle favorite
  const toggleFavorite = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/ideas/${id}/favorite`, { method: 'POST' });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
    }
  });

  const favorites = ideas.filter(i => i.isFavorite);
  const recent = ideas.filter(i => !i.isFavorite).slice(0, 6);

  return (
    <div className="border rounded-2xl p-4 bg-card/50 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Idea Bank</h3>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => generateIdeas.mutate()}
            disabled={generateIdeas.isPending}
          >
            <Sparkles className={`w-4 h-4 mr-1 ${generateIdeas.isPending ? 'animate-spin' : ''}`} />
            Generate Ideas
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Add new idea form */}
      {showAddForm && (
        <div className="flex gap-2">
          <Input
            value={newIdea}
            onChange={e => setNewIdea(e.target.value)}
            placeholder="Add your own idea..."
            className="flex-1"
          />
          <Button
            size="sm"
            onClick={() => addIdea.mutate(newIdea)}
            disabled={!newIdea.trim() || addIdea.isPending}
          >
            Save
          </Button>
        </div>
      )}

      {/* Favorites */}
      {favorites.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Favorites</p>
          <div className="space-y-1">
            {favorites.map(idea => (
              <IdeaRow
                key={idea.id}
                idea={idea}
                onUse={() => useIdea(idea)}
                onToggleFavorite={() => toggleFavorite.mutate(idea.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Recent/All Ideas */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">
          {favorites.length > 0 ? 'More Ideas' : 'Your Ideas'}
        </p>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : recent.length > 0 ? (
          <div className="space-y-1">
            {recent.map(idea => (
              <IdeaRow
                key={idea.id}
                idea={idea}
                onUse={() => useIdea(idea)}
                onToggleFavorite={() => toggleFavorite.mutate(idea.id)}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No ideas yet. Add your own or generate some!
          </p>
        )}
      </div>
    </div>
  );
}

function IdeaRow({
  idea,
  onUse,
  onToggleFavorite
}: {
  idea: Idea;
  onUse: () => void;
  onToggleFavorite: () => void;
}) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 group">
      <button
        onClick={onToggleFavorite}
        className="text-muted-foreground hover:text-yellow-500"
      >
        <Star className={`w-4 h-4 ${idea.isFavorite ? 'fill-yellow-500 text-yellow-500' : ''}`} />
      </button>
      <button
        onClick={onUse}
        className="flex-1 text-left text-sm truncate hover:text-primary"
      >
        {idea.ideaText}
      </button>
      <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100">
        Used {idea.timesUsed}x
      </span>
    </div>
  );
}
```

---

# PART 5: EFFORT COMPARISON

## Option 1: Generic V3 Features (Without Context Engine)

| Feature | Effort | Value |
|---------|--------|-------|
| Intent Detection (basic) | 8 hrs | Medium |
| Dynamic Prompt Templates | 8 hrs | Medium |
| Caption/Hashtag Generation | 4 hrs | Low |
| Clarification Flow | 4 hrs | Medium |
| Rate Limiting | 4 hrs | High |
| Session Management | 4 hrs | Medium |
| **TOTAL** | **32 hrs** | |

**Result:** Better than current, but still generic. Everyone gets the same suggestions.

---

## Option 2: Context Engine (Full Personalization)

| Component | Effort | Value |
|-----------|--------|-------|
| **Database Schema** | | |
| - User profiles table | 2 hrs | High |
| - Generation analytics table | 2 hrs | High |
| - Idea bank table | 2 hrs | High |
| - Prompt patterns table | 2 hrs | High |
| - Schema updates to existing | 1 hr | - |
| **Backend Services** | | |
| - Context gathering service | 4 hrs | High |
| - Intent detection engine | 6 hrs | High |
| - Smart prompt builder | 6 hrs | High |
| - Analytics tracking | 4 hrs | Medium |
| - Pattern learning system | 6 hrs | High |
| **API Endpoints** | | |
| - Profile CRUD | 2 hrs | Medium |
| - Context suggestions | 3 hrs | High |
| - Prompt enhancement | 3 hrs | High |
| - Analytics tracking | 2 hrs | Medium |
| - Idea bank CRUD | 3 hrs | Medium |
| - AI idea generation | 2 hrs | Medium |
| **Frontend** | | |
| - Onboarding flow | 6 hrs | High |
| - Idea Bank component | 4 hrs | Medium |
| - Analytics dashboard | 4 hrs | Low |
| - Enhanced suggestions UI | 3 hrs | Medium |
| - Profile settings page | 3 hrs | Low |
| **TOTAL** | **70 hrs** | |

**Result:** Truly personalized. System learns and improves. Major differentiator.

---

## Option 3: Hybrid (Context Engine Core + Select V3)

| Component | Effort | Priority |
|-----------|--------|----------|
| **Phase 1: Foundation** | | |
| User profiles + onboarding | 8 hrs | P0 |
| Basic analytics tracking | 4 hrs | P0 |
| Rate limiting | 4 hrs | P0 |
| **Phase 2: Intelligence** | | |
| Context-aware suggestions | 8 hrs | P1 |
| Intent detection | 6 hrs | P1 |
| Smart prompt builder | 6 hrs | P1 |
| **Phase 3: Learning** | | |
| Pattern tracking | 6 hrs | P1 |
| Success scoring | 4 hrs | P1 |
| Idea bank | 6 hrs | P2 |
| **Phase 4: Polish** | | |
| Clarification flow | 4 hrs | P2 |
| Caption generation | 4 hrs | P2 |
| Analytics dashboard | 4 hrs | P3 |
| **TOTAL** | **64 hrs** | |

---

## Comparison Summary

| Approach | Effort | Personalization | Learning | Differentiation |
|----------|--------|-----------------|----------|-----------------|
| Generic V3 | 32 hrs | None | None | Low |
| Full Context Engine | 70 hrs | Full | Yes | High |
| Hybrid (Recommended) | 64 hrs | High | Yes | High |

---

# RECOMMENDATION

## Go with Hybrid Approach

**Why:**
1. Gets core personalization (user profile, context-aware suggestions) in Phase 1
2. Adds learning system in Phase 2 (becomes smarter over time)
3. Skips low-value V3 features (basic intent badges already exist)
4. 64 hours delivers 90% of the value of full 70-hour approach

**Key Differentiators This Enables:**
- "The system knows I'm in construction and suggests worksite shots"
- "It learned that I like dramatic lighting and now always includes it"
- "My idea bank saves my best prompts for reuse"
- "The more I use it, the better it gets"

**This is what turns a tool into a product.**

---

*Spec complete. Ready for implementation.*
