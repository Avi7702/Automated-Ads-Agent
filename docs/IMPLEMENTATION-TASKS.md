# Implementation Task Breakdown
## Product Content Studio - Context Engine Upgrade

**Date:** November 30, 2025
**Total Effort:** ~72 hours
**Phases:** 4

---

# PHASE 1: FOUNDATION (16 hours)

## Task 1.1: Rate Limiting Middleware
**Effort:** 4 hours | **Priority:** P0 | **Dependencies:** None

### Description
Implement Express rate limiting to prevent API abuse and cost explosion.

### Files to Create/Modify
- CREATE: `server/middleware/rateLimit.ts`
- MODIFY: `server/app.ts` (add middleware)

### Acceptance Criteria
- [ ] Rate limit: 100 requests per 15 minutes per IP
- [ ] Separate limits for expensive endpoints (`/api/transform`: 20/hr, `/api/generations/:id/edit`: 30/hr)
- [ ] Return proper 429 response with `Retry-After` header
- [ ] Log rate limit hits for monitoring
- [ ] Graceful error message to user

### Implementation Notes
```typescript
// Use express-rate-limit package
import rateLimit from 'express-rate-limit';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests', retryAfter: '15 minutes' }
});

const expensiveLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { error: 'Generation limit reached', retryAfter: '1 hour' }
});
```

### Test Cases
- [ ] Verify 100 requests allowed in 15 min window
- [ ] Verify 101st request returns 429
- [ ] Verify rate limit resets after window
- [ ] Verify `/api/transform` has separate limit

---

## Task 1.2: Production Authentication System
**Effort:** 8 hours | **Priority:** P0 | **Dependencies:** None

### Description
Implement production-grade authentication with secure session management, proper password hashing, and comprehensive security headers.

### Files to Create/Modify
- CREATE: `server/middleware/auth.ts`
- CREATE: `server/services/authService.ts`
- CREATE: `client/src/pages/Login.tsx`
- CREATE: `client/src/pages/Register.tsx`
- CREATE: `client/src/contexts/AuthContext.tsx`
- MODIFY: `server/app.ts` (add session middleware, security headers)
- MODIFY: `server/routes.ts` (protect routes, add auth endpoints)
- MODIFY: `shared/schema.ts` (add users table, add user_id to existing tables)

### Database Schema
```typescript
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 255 }).unique().notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  emailVerified: boolean("email_verified").default(false),
  role: varchar("role", { length: 50 }).default('user'),
  lastLoginAt: timestamp("last_login_at"),
  failedLoginAttempts: integer("failed_login_attempts").default(0),
  lockedUntil: timestamp("locked_until"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address", { length: 45 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

### Acceptance Criteria
- [ ] User registration with email/password
- [ ] Secure password hashing using bcrypt (cost factor 12+)
- [ ] Session stored in PostgreSQL (not memory)
- [ ] CSRF protection enabled
- [ ] Secure cookie settings (httpOnly, sameSite, secure in prod)
- [ ] Account lockout after 5 failed login attempts
- [ ] Protected routes return 401 if not authenticated
- [ ] User ID associated with all user-generated content
- [ ] Login/logout flow with proper session cleanup
- [ ] Session regeneration on login (prevent session fixation)
- [ ] Security headers (helmet middleware)

### Implementation Notes
```typescript
// server/services/authService.ts
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { storage } from '../storage';

const BCRYPT_ROUNDS = 12;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 30;
const SESSION_DURATION_HOURS = 24;

export class AuthService {
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async createSession(userId: string, req: Request): Promise<string> {
    const sessionId = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000);

    await storage.createSession({
      id: sessionId,
      userId,
      expiresAt,
      userAgent: req.headers['user-agent'] || null,
      ipAddress: req.ip,
    });

    return sessionId;
  }

  async validateSession(sessionId: string): Promise<User | null> {
    const session = await storage.getSession(sessionId);
    if (!session || session.expiresAt < new Date()) {
      if (session) await storage.deleteSession(sessionId);
      return null;
    }
    return storage.getUserById(session.userId);
  }

  async handleFailedLogin(userId: string): Promise<void> {
    const user = await storage.getUserById(userId);
    const attempts = (user?.failedLoginAttempts || 0) + 1;

    const updates: any = { failedLoginAttempts: attempts };
    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      updates.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
    }

    await storage.updateUser(userId, updates);
  }

  async isAccountLocked(user: User): Promise<boolean> {
    if (!user.lockedUntil) return false;
    if (user.lockedUntil < new Date()) {
      await storage.updateUser(user.id, { lockedUntil: null, failedLoginAttempts: 0 });
      return false;
    }
    return true;
  }
}

// server/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const sessionId = req.cookies?.sessionId;

  if (!sessionId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const user = await authService.validateSession(sessionId);
  if (!user) {
    res.clearCookie('sessionId');
    return res.status(401).json({ error: 'Session expired' });
  }

  req.user = user;
  next();
}

export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role !== role && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

// server/app.ts additions
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

app.use(helmet());
app.use(cookieParser());

// Secure cookie settings
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
};
```

### API Endpoints
```typescript
POST /api/auth/register
Body: { email: string, password: string }
Response: { user: User, message: string }

POST /api/auth/login
Body: { email: string, password: string }
Response: { user: User } + sets session cookie

POST /api/auth/logout
Response: { message: string } + clears session cookie

GET /api/auth/me
Response: { user: User } or 401

POST /api/auth/refresh
Response: { user: User } + refreshes session
```

### Security Requirements
- [ ] Passwords minimum 8 characters, require complexity
- [ ] No password exposure in logs or responses
- [ ] Rate limit login endpoint (10 attempts per minute)
- [ ] Log all authentication events for audit
- [ ] Session invalidation on password change
- [ ] HTTPS enforced in production

### Test Cases
- [ ] Unauthenticated request to protected route returns 401
- [ ] Valid registration creates user with hashed password
- [ ] Login with correct credentials succeeds
- [ ] Login with wrong password fails and increments attempts
- [ ] Account locks after 5 failed attempts
- [ ] Locked account returns 423 with lockout time
- [ ] Session expires after 24 hours
- [ ] Logout invalidates session server-side
- [ ] Cannot access other users' data

---

## Task 1.3: User Profile Schema & Onboarding
**Effort:** 4 hours | **Priority:** P0 | **Dependencies:** Task 1.2

### Description
Create user profile database table and onboarding UI flow.

### Files to Create/Modify
- MODIFY: `shared/schema.ts` (add userProfiles table)
- CREATE: `client/src/pages/Onboarding.tsx`
- MODIFY: `client/src/App.tsx` (add onboarding route)
- MODIFY: `server/routes.ts` (add profile endpoints)
- MODIFY: `server/storage.ts` (add profile CRUD)

### Database Schema
```typescript
export const userProfiles = pgTable("user_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  // Business Identity
  businessName: varchar("business_name", { length: 255 }),
  industry: varchar("industry", { length: 100 }).notNull(),
  industrySubcategory: varchar("industry_subcategory", { length: 100 }),
  targetAudience: varchar("target_audience", { length: 100 }),

  // Brand Style
  brandStyle: varchar("brand_style", { length: 50 }),
  preferredMood: varchar("preferred_mood", { length: 50 }),
  colorPreferences: text("color_preferences").array(),
  avoidElements: text("avoid_elements").array(),

  // Platform Preferences
  primaryPlatforms: text("primary_platforms").array(),

  // Status
  onboardingCompleted: boolean("onboarding_completed").default(false),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

### API Endpoints
- `GET /api/profile` - Get current user profile
- `POST /api/profile` - Create/update profile
- `GET /api/profile/status` - Check if onboarding needed

### Onboarding UI Flow
1. Step 1: Business name + Industry selection (9 options)
2. Step 2: Target audience (B2B / B2C / Both)
3. Step 3: Brand style selection (6 options)
4. Step 4: Primary platforms (multi-select)

### Acceptance Criteria
- [ ] Database migration runs successfully
- [ ] Profile CRUD endpoints working
- [ ] 4-step onboarding wizard functional
- [ ] Profile saves to database
- [ ] App redirects to onboarding if profile incomplete
- [ ] Skip onboarding option available

### Test Cases
- [ ] New user sees onboarding
- [ ] Completed user skips onboarding
- [ ] Profile data persists correctly
- [ ] All industry options selectable

---

# PHASE 2: CONTEXT INTELLIGENCE (24 hours)

## Task 2.1: Analytics Tracking System
**Effort:** 4 hours | **Priority:** P1 | **Dependencies:** Phase 1

### Description
Track user interactions with generations to learn what works.

### Files to Create/Modify
- MODIFY: `shared/schema.ts` (add generationAnalytics table)
- CREATE: `server/services/analytics.ts`
- MODIFY: `server/routes.ts` (add tracking endpoint)
- MODIFY: `server/storage.ts` (add analytics CRUD)
- MODIFY: `client/src/pages/GenerationDetail.tsx` (track downloads)

### Database Schema
```typescript
export const generationAnalytics = pgTable("generation_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  generationId: varchar("generation_id").references(() => generations.id),
  userId: varchar("user_id").references(() => userProfiles.id),

  // Success Signals
  wasDownloaded: boolean("was_downloaded").default(false),
  downloadCount: integer("download_count").default(0),
  wasFavorited: boolean("was_favorited").default(false),

  // Refinement Signals
  wasEdited: boolean("was_edited").default(false),
  editCount: integer("edit_count").default(0),

  // Extracted Insights
  detectedScene: varchar("detected_scene", { length: 100 }),
  detectedMood: varchar("detected_mood", { length: 100 }),
  promptKeywords: text("prompt_keywords").array(),

  // Computed Score
  successScore: decimal("success_score", { precision: 3, scale: 2 }),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

### API Endpoints
- `POST /api/analytics/track` - Track event (download, favorite, edit)
- `GET /api/analytics/insights` - Get user's success patterns

### Events to Track
- Download (wasDownloaded, downloadCount++)
- Favorite (wasFavorited)
- Edit started (wasEdited, editCount++)
- Share (if implemented)

### Success Score Calculation
```typescript
function calculateSuccessScore(analytics) {
  let score = 0.5;
  if (analytics.wasDownloaded) score += 0.2;
  if (analytics.downloadCount > 1) score += 0.1;
  if (analytics.wasFavorited) score += 0.15;
  if (analytics.wasEdited && analytics.editCount > 2) score -= 0.1;
  return Math.max(0, Math.min(1, score));
}
```

### Acceptance Criteria
- [ ] Analytics record created on first generation view
- [ ] Download tracked and score updated
- [ ] Favorite tracked and score updated
- [ ] Edit count tracked
- [ ] Success score calculated correctly
- [ ] Keywords extracted from prompt

### Test Cases
- [ ] Download increases score
- [ ] Multiple downloads increase score more
- [ ] Excessive edits decrease score
- [ ] Keywords extracted correctly

---

## Task 2.2: Context-Aware Suggestions
**Effort:** 8 hours | **Priority:** P1 | **Dependencies:** Task 2.1

### Description
Replace generic suggestions with personalized ones based on user context.

### Files to Create/Modify
- CREATE: `server/services/contextEngine.ts`
- MODIFY: `server/routes.ts` (new endpoint, modify existing)
- MODIFY: `client/src/pages/Home.tsx` (use new endpoint)

### Context Gathering
```typescript
interface UserContext {
  profile: UserProfile | null;
  topPatterns: PromptPattern[];        // What works for this user
  successfulGenerations: Generation[]; // Recent downloads
  savedIdeas: Idea[];                  // User's idea bank
}

async function gatherContext(userId: string): Promise<UserContext> {
  const [profile, patterns, generations, ideas] = await Promise.all([
    storage.getUserProfile(userId),
    storage.getTopPatterns(userId, { limit: 10, minScore: 0.6 }),
    storage.getSuccessfulGenerations(userId, { limit: 5 }),
    storage.getIdeas(userId, { limit: 5, favoritesFirst: true })
  ]);

  return { profile, topPatterns: patterns, successfulGenerations: generations, savedIdeas: ideas };
}
```

### New Endpoint
```typescript
POST /api/context/suggestions
Body: { productIds: string[], customContext?: string }
Response: {
  suggestions: string[],
  context: {
    industry: string,
    topPatterns: string[],
    basedOnSuccessful: number
  }
}
```

### Prompt Building for Gemini
```typescript
const contextPrompt = `Generate 4 marketing image ideas for a ${profile.industry} business.

Business context:
- Industry: ${profile.industry}
- Brand style: ${profile.brandStyle}
- Target audience: ${profile.targetAudience}
- Products: ${productNames.join(', ')}

What works for them (based on past success):
${patterns.map(p => `- ${p.patternValue}`).join('\n')}

${savedIdeas.length > 0 ? `Their saved ideas for inspiration:\n${savedIdeas.map(i => `- ${i.ideaText}`).join('\n')}` : ''}

Return JSON array of 4 concise scene descriptions (max 15 words each).`;
```

### Acceptance Criteria
- [ ] Endpoint gathers full user context
- [ ] Suggestions reflect user's industry
- [ ] Suggestions incorporate successful patterns
- [ ] Fallback to generic if no history
- [ ] Response includes context metadata

### Test Cases
- [ ] Construction user gets construction suggestions
- [ ] User with "dramatic lighting" pattern gets dramatic suggestions
- [ ] New user gets reasonable generic suggestions
- [ ] Response time under 3 seconds

---

## Task 2.3: Intent Detection & Prompt Builder
**Effort:** 8 hours | **Priority:** P1 | **Dependencies:** Task 2.2

### Description
Detect user intent from prompt and build enhanced prompts using context.

### Files to Create/Modify
- ADD TO: `server/services/contextEngine.ts`
- MODIFY: `server/routes.ts` (`/api/transform` uses enhanced prompt)
- MODIFY: `client/src/components/IntentVisualizer.tsx` (show detected intent)

### Intent Detection
```typescript
interface DetectedIntent {
  contentType: string;   // lifestyle, installation, before_after, scale_demo, seasonal, action_shot
  scene: string;         // outdoor, studio, urban, industrial, domestic
  mood: string;          // premium, warm, dramatic, minimal, vibrant
  platform: string | null;
  confidence: number;
}

function detectIntent(rawPrompt: string): DetectedIntent {
  const t = rawPrompt.toLowerCase();

  // Content Type
  let contentType = 'lifestyle';
  if (t.match(/together|combined|installed|connected/)) contentType = 'installation';
  else if (t.match(/before.*after|transformation|vs\b/)) contentType = 'before_after';
  else if (t.match(/how big|size|scale|compared/)) contentType = 'scale_demo';
  else if (t.match(/christmas|summer|holiday|seasonal/)) contentType = 'seasonal';
  else if (t.match(/in use|action|using|working/)) contentType = 'action_shot';

  // Scene, Mood, Platform detection...

  return { contentType, scene, mood, platform, confidence };
}
```

### Enhanced Prompt Building
```typescript
async function buildEnhancedPrompt(params: {
  rawPrompt: string;
  intent: DetectedIntent;
  products: Product[];
  context: UserContext;
}): Promise<string> {
  const { rawPrompt, intent, products, context } = params;
  const { profile, topPatterns } = context;

  return `Transform ${products.length > 1 ? 'these products' : 'this product'}: ${rawPrompt}

CONTEXT:
- Industry: ${profile?.industry || 'general'}
- Brand Style: ${profile?.brandStyle || 'professional'}

DETECTED INTENT:
- Type: ${intent.contentType}
- Scene: ${intent.scene}
- Mood: ${intent.mood}

STYLE (based on what works for this user):
${topPatterns.slice(0, 3).map(p => `- ${p.patternValue}`).join('\n')}

${getIndustryGuidelines(profile?.industry)}

REQUIREMENTS:
- Keep product as hero
- Professional quality
- ${intent.mood} mood with appropriate lighting
${profile?.avoidElements?.length ? `- AVOID: ${profile.avoidElements.join(', ')}` : ''}
- No text or watermarks`;
}
```

### Industry Guidelines
```typescript
const guidelines = {
  construction: `
INDUSTRY NOTES:
- Show products in realistic worksite contexts
- Include appropriate PPE if workers shown
- Emphasize durability and professional quality`,

  food: `
INDUSTRY NOTES:
- Emphasize freshness and appetizing presentation
- Natural lighting works best
- Show texture and quality`,

  // ... other industries
};
```

### Acceptance Criteria
- [ ] Intent detected from user prompt
- [ ] Enhanced prompt includes user context
- [ ] Industry-specific guidelines applied
- [ ] IntentVisualizer shows detected intent to user
- [ ] `/api/transform` uses enhanced prompt

### Test Cases
- [ ] "show these installed together" → contentType: installation
- [ ] "premium lifestyle" → mood: premium
- [ ] Construction user gets construction guidelines
- [ ] Prompt includes top patterns

---

## Task 2.4: Pattern Learning System
**Effort:** 4 hours | **Priority:** P1 | **Dependencies:** Task 2.1, 2.3

### Description
Track which prompts/keywords lead to success and increase their weight.

### Files to Create/Modify
- MODIFY: `shared/schema.ts` (add promptPatterns table)
- ADD TO: `server/services/contextEngine.ts`
- MODIFY: `server/services/analytics.ts` (update patterns on success)
- MODIFY: `server/storage.ts` (pattern CRUD)

### Database Schema
```typescript
export const promptPatterns = pgTable("prompt_patterns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => userProfiles.id),

  patternType: varchar("pattern_type", { length: 50 }).notNull(), // scene, mood, lighting, style
  patternValue: varchar("pattern_value", { length: 255 }).notNull(),

  usageCount: integer("usage_count").default(1),
  successCount: integer("success_count").default(0),
  avgSuccessScore: decimal("avg_success_score", { precision: 3, scale: 2 }),
  recommendationWeight: decimal("recommendation_weight", { precision: 3, scale: 2 }),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

### Pattern Extraction
```typescript
function extractPromptKeywords(prompt: string): string[] {
  const keywords = [];
  const t = prompt.toLowerCase();

  const scenes = ['outdoor', 'indoor', 'studio', 'urban', 'industrial'];
  const moods = ['premium', 'warm', 'dramatic', 'minimal', 'vibrant'];
  const lighting = ['golden hour', 'natural light', 'dramatic lighting'];

  scenes.forEach(s => { if (t.includes(s)) keywords.push(s); });
  moods.forEach(m => { if (t.includes(m)) keywords.push(m); });
  lighting.forEach(l => { if (t.includes(l)) keywords.push(l); });

  return [...new Set(keywords)];
}
```

### Pattern Weight Update
```typescript
async function updatePatternWeights(userId: string, keywords: string[], successScore: number) {
  for (const keyword of keywords) {
    const existing = await storage.getPatternByValue(userId, keyword);

    if (existing) {
      const newAvg = (existing.avgSuccessScore * existing.usageCount + successScore) / (existing.usageCount + 1);
      await storage.updatePattern(existing.id, {
        usageCount: existing.usageCount + 1,
        successCount: successScore > 0.7 ? existing.successCount + 1 : existing.successCount,
        avgSuccessScore: newAvg,
        recommendationWeight: calculateWeight(newAvg, existing.usageCount + 1)
      });
    } else {
      await storage.createPattern({
        userId,
        patternType: categorizeKeyword(keyword),
        patternValue: keyword,
        avgSuccessScore: successScore,
        recommendationWeight: successScore * 0.5
      });
    }
  }
}
```

### Acceptance Criteria
- [ ] Keywords extracted from prompts on generation
- [ ] Patterns created/updated in database
- [ ] Success score updates pattern weights
- [ ] Top patterns retrieved for suggestions
- [ ] Weights influence recommendation order

### Test Cases
- [ ] First use of keyword creates pattern
- [ ] Successful download increases weight
- [ ] Multiple uses increase weight
- [ ] Top patterns returned in correct order

---

# PHASE 3: USER EXPERIENCE (16 hours)

## Task 3.1: Idea Bank Feature
**Effort:** 6 hours | **Priority:** P2 | **Dependencies:** Phase 2

### Description
Allow users to save, organize, and reuse prompt ideas.

### Files to Create/Modify
- MODIFY: `shared/schema.ts` (add ideaBank table)
- CREATE: `client/src/components/IdeaBank.tsx`
- MODIFY: `server/routes.ts` (idea endpoints)
- MODIFY: `server/storage.ts` (idea CRUD)
- MODIFY: `client/src/pages/Home.tsx` (add IdeaBank component)

### Database Schema
```typescript
export const ideaBank = pgTable("idea_bank", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => userProfiles.id),

  title: varchar("title", { length: 255 }),
  ideaText: text("idea_text").notNull(),
  category: varchar("category", { length: 100 }),
  tags: text("tags").array(),

  source: varchar("source", { length: 50 }).notNull(), // user_created, ai_suggested, from_generation
  sourceGenerationId: varchar("source_generation_id"),

  timesUsed: integer("times_used").default(0),
  lastUsedAt: timestamp("last_used_at"),
  isFavorite: boolean("is_favorite").default(false),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

### API Endpoints
- `GET /api/ideas` - List ideas (with filters)
- `POST /api/ideas` - Create idea
- `POST /api/ideas/:id/use` - Mark as used
- `POST /api/ideas/:id/favorite` - Toggle favorite
- `DELETE /api/ideas/:id` - Delete idea
- `POST /api/ideas/generate` - AI generate ideas based on context

### UI Component Features
- Display favorites at top
- Show usage count
- Quick "use this" button that fills prompt
- Add new idea inline
- Generate AI ideas button
- Category filter

### Acceptance Criteria
- [ ] User can save ideas
- [ ] User can favorite ideas
- [ ] Clicking idea fills prompt input
- [ ] Usage tracked
- [ ] AI can generate personalized ideas
- [ ] Ideas persist across sessions

### Test Cases
- [ ] Save idea works
- [ ] Favorite toggle works
- [ ] Use idea fills prompt
- [ ] Generated ideas are contextual

---

## Task 3.2: Clarification Flow
**Effort:** 4 hours | **Priority:** P2 | **Dependencies:** Task 2.3

### Description
When intent is ambiguous, ask ONE focused question before generating.

### Files to Create/Modify
- CREATE: `client/src/components/ClarificationModal.tsx`
- MODIFY: `server/routes.ts` (add clarification check)
- MODIFY: `client/src/pages/Home.tsx` (integrate modal)

### Clarification Triggers
```typescript
function needsClarification(intent: DetectedIntent): boolean {
  // Trigger if confidence is low
  if (intent.confidence < 0.5) return true;

  // Trigger for vague prompts
  const vaguePatterns = /^(make it|better|nice|good|improve|fix)$/i;
  if (vaguePatterns.test(rawPrompt.trim())) return true;

  return false;
}
```

### Clarification Options
```typescript
const clarificationOptions = [
  { id: 'lifestyle', icon: '🏠', label: 'Lifestyle shot', description: 'In a beautiful setting' },
  { id: 'professional', icon: '👷', label: 'Professional context', description: 'Being used at work' },
  { id: 'product', icon: '📸', label: 'Clean product shot', description: 'Studio-style, focused' },
  { id: 'social', icon: '📱', label: 'Social media ready', description: 'Optimized for posting' },
];
```

### UI Flow
1. User types vague prompt → "make it better"
2. System detects low confidence
3. Modal appears: "What's the main goal?"
4. User selects option
5. System enhances prompt with selection
6. Generation proceeds

### Acceptance Criteria
- [ ] Modal appears for vague prompts
- [ ] Options are clear and helpful
- [ ] Selection enhances the prompt
- [ ] User can dismiss and proceed anyway
- [ ] Only ONE question asked (never multiple)

### Test Cases
- [ ] "make it better" triggers clarification
- [ ] "premium lifestyle in forest" does NOT trigger
- [ ] Selection properly enhances prompt

---

## Task 3.3: Enhanced Suggestions UI
**Effort:** 4 hours | **Priority:** P2 | **Dependencies:** Task 2.2

### Description
Improve the suggestions UI to show context and make them more useful.

### Files to Create/Modify
- MODIFY: `client/src/pages/Home.tsx`
- CREATE: `client/src/components/SmartSuggestions.tsx`

### New UI Features
- Show why suggestion was made ("Based on your construction business...")
- Show which patterns influenced it
- Quick filter by category
- Refresh with different context
- Show confidence/relevance score

### Component Structure
```tsx
<SmartSuggestions
  productIds={selectedProducts.map(p => p.id)}
  onSelect={(suggestion) => setPrompt(suggestion)}
/>

// Displays:
// "Suggestions for your construction business"
// [Based on: dramatic lighting, outdoor settings]
//
// 1. "Professional worksite with steel structures..."  [Use]
// 2. "Industrial warehouse with product display..."   [Use]
// 3. "Construction team using products on site..."    [Use]
// 4. "Dramatic sunset behind product installation..." [Use]
//
// [Refresh] [Different style]
```

### Acceptance Criteria
- [ ] Suggestions show context source
- [ ] Patterns shown as tags
- [ ] Refresh generates new suggestions
- [ ] One-click to use suggestion
- [ ] Loading state while fetching

### Test Cases
- [ ] Context metadata displayed correctly
- [ ] Refresh gets different suggestions
- [ ] Click fills prompt correctly

---

## Task 3.4: Profile Settings Page
**Effort:** 2 hours | **Priority:** P2 | **Dependencies:** Task 1.3

### Description
Allow users to update their profile after initial onboarding.

### Files to Create/Modify
- CREATE: `client/src/pages/Settings.tsx`
- MODIFY: `client/src/App.tsx` (add route)
- MODIFY header nav (add settings link)

### Features
- Edit all profile fields
- Preview how changes affect suggestions
- Reset to defaults option
- View usage statistics

### Acceptance Criteria
- [ ] All profile fields editable
- [ ] Changes save correctly
- [ ] Navigation to settings works
- [ ] Can update industry/style

### Test Cases
- [ ] Edit industry saves
- [ ] Edit brand style saves
- [ ] Navigation works

---

# PHASE 4: POLISH & HARDENING (16 hours)

## Task 4.1: Caption & Hashtag Generation
**Effort:** 4 hours | **Priority:** P3 | **Dependencies:** Phase 2

### Description
Auto-generate captions and hashtags for generated images.

### Files to Create/Modify
- CREATE: `server/services/captionGenerator.ts`
- MODIFY: `server/routes.ts` (add to transform response or new endpoint)
- MODIFY: `client/src/pages/GenerationDetail.tsx` (display captions)

### Caption Generation Logic
```typescript
async function generateCaption(params: {
  prompt: string;
  intent: DetectedIntent;
  profile: UserProfile;
  platform?: string;
}): Promise<{ caption: string; hashtags: string[] }> {
  const { prompt, intent, profile, platform } = params;

  const captionPrompt = `Generate a social media caption for a ${profile.industry} business.

Image description: ${prompt}
Platform: ${platform || 'general'}
Audience: ${profile.targetAudience}
Tone: ${profile.brandStyle}

Requirements:
- Under 150 characters for Twitter, flexible for others
- Professional but engaging
- Include subtle call-to-action if appropriate
- Match the ${intent.mood} mood

Also generate 5-8 relevant hashtags.

Return JSON: { "caption": "...", "hashtags": ["#tag1", "#tag2", ...] }`;

  const result = await genai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: captionPrompt,
  });

  return JSON.parse(result.text);
}
```

### UI Display
- Show caption in copyable text box
- Show hashtags as clickable chips
- Copy all button
- Edit before copying

### Acceptance Criteria
- [ ] Caption generated after image generation
- [ ] Hashtags relevant to industry
- [ ] Copy functionality works
- [ ] Platform-appropriate length

### Test Cases
- [ ] Construction gets construction hashtags
- [ ] Twitter caption under 150 chars
- [ ] Copy button works

---

## Task 4.2: Analytics Dashboard
**Effort:** 4 hours | **Priority:** P3 | **Dependencies:** Task 2.1

### Description
Show users insights about their usage and what works.

### Files to Create/Modify
- CREATE: `client/src/pages/Analytics.tsx`
- MODIFY: `client/src/App.tsx` (add route)
- MODIFY: `server/routes.ts` (add insights endpoint)

### Dashboard Metrics
- Total generations
- Download rate
- Top performing patterns
- Most used scenes/moods
- Success trend over time

### UI Components
- Summary cards (total, downloads, avg score)
- Top patterns list with success rates
- Simple bar chart for scenes/moods
- Recent successful generations

### Acceptance Criteria
- [ ] Dashboard loads with real data
- [ ] Metrics accurate
- [ ] Top patterns displayed
- [ ] Helpful insights shown

### Test Cases
- [ ] Stats calculate correctly
- [ ] Empty state handled
- [ ] Data refreshes

---

## Task 4.3: Comprehensive Testing Suite
**Effort:** 8 hours | **Priority:** P1 | **Dependencies:** All above

### Description
Implement production-grade test suite with unit, integration, and e2e tests to ensure system reliability and prevent regressions.

### Files to Create
- `server/__tests__/auth.test.ts`
- `server/__tests__/contextEngine.test.ts`
- `server/__tests__/analytics.test.ts`
- `server/__tests__/routes.test.ts`
- `server/__tests__/rateLimit.test.ts`
- `client/src/__tests__/IdeaBank.test.tsx`
- `client/src/__tests__/Onboarding.test.tsx`
- `client/src/__tests__/Auth.test.tsx`
- `e2e/auth.spec.ts`
- `e2e/generation.spec.ts`
- `jest.config.ts`
- `playwright.config.ts`

### Test Coverage Targets
- Authentication: 95%
- Intent detection: 100%
- Pattern learning: 90%
- API endpoints: 90%
- Critical UI flows: 80%
- E2E happy paths: 100%

### Test Types
- **Unit tests**: Context engine, auth service, pattern algorithms
- **Integration tests**: API endpoints with database
- **Component tests**: React components with mocked APIs
- **E2E tests**: Full user flows (registration, login, generation)

### Test Framework Setup
```typescript
// jest.config.ts
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/server/__tests__'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/server/__tests__/setup.ts'],
};

// playwright.config.ts
export default {
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:5000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    port: 5000,
    reuseExistingServer: !process.env.CI,
  },
};
```

### Security Test Cases
```typescript
// server/__tests__/auth.test.ts
describe('Authentication Security', () => {
  it('should hash passwords with bcrypt cost factor 12+');
  it('should lock account after 5 failed attempts');
  it('should not expose password hash in responses');
  it('should invalidate session on logout');
  it('should prevent session fixation attacks');
  it('should rate limit login endpoint');
  it('should reject weak passwords');
});
```

### Acceptance Criteria
- [ ] All tests pass in CI pipeline
- [ ] Coverage thresholds enforced
- [ ] Auth flow fully tested
- [ ] Rate limiting tested under load
- [ ] E2E tests cover critical user journeys
- [ ] Test database isolation (no production data)
- [ ] GitHub Actions workflow configured

---

# DEPENDENCY GRAPH

```
Phase 1 (Foundation)
├── 1.1 Rate Limiting ──────────────┐
├── 1.2 Basic Auth ─────────────────┼──→ Phase 2
└── 1.3 User Profile & Onboarding ──┘

Phase 2 (Intelligence)
├── 2.1 Analytics Tracking ─────────┬──→ 2.4 Pattern Learning
├── 2.2 Context-Aware Suggestions ──┤
└── 2.3 Intent Detection & Builder ─┴──→ Phase 3

Phase 3 (Experience)
├── 3.1 Idea Bank ──────────────────┐
├── 3.2 Clarification Flow ─────────┼──→ Phase 4
├── 3.3 Enhanced Suggestions UI ────┤
└── 3.4 Profile Settings ───────────┘

Phase 4 (Polish)
├── 4.1 Caption Generation
├── 4.2 Analytics Dashboard
└── 4.3 Testing Suite
```

---

# AGENT ASSIGNMENT RECOMMENDATIONS

| Agent | Tasks | Expertise Needed |
|-------|-------|------------------|
| **Backend Agent 1** | 1.1, 1.2, 2.1 | Express, middleware, database |
| **Backend Agent 2** | 2.2, 2.3, 2.4 | AI integration, Gemini, algorithms |
| **Frontend Agent 1** | 1.3, 3.1, 3.4 | React, forms, state management |
| **Frontend Agent 2** | 3.2, 3.3, 4.2 | React, UI/UX, data visualization |
| **Full-Stack Agent** | 4.1, 4.3 | Both + testing |

---

# SPRINT BREAKDOWN (Production-Ready)

## Sprint 1: Security Foundation
- Tasks: 1.1, 1.2, 1.3
- Goal: Production-grade authentication, rate limiting, and user profiles
- Deliverables:
  - [ ] Full auth system with bcrypt, session management, account lockout
  - [ ] Rate limiting protecting all endpoints
  - [ ] User profile schema with onboarding flow
- Demo: Complete registration → login → onboarding → profile view

## Sprint 2: Context Intelligence
- Tasks: 2.1, 2.2, 2.3, 2.4
- Goal: Personalized AI that learns user preferences
- Deliverables:
  - [ ] Analytics tracking with success scoring
  - [ ] Context engine gathering user profile + history + patterns
  - [ ] Intent detection with enhanced prompt building
  - [ ] Pattern learning that improves over time
- Demo: Construction user gets construction-specific suggestions, system learns from downloads

## Sprint 3: User Experience
- Tasks: 3.1, 3.2, 3.3, 3.4
- Goal: Complete polished user experience
- Deliverables:
  - [ ] Idea Bank with favorites, categories, AI generation
  - [ ] Clarification flow for ambiguous prompts
  - [ ] Smart suggestions showing context/patterns
  - [ ] Settings page for profile management
- Demo: Save ideas → reuse them → see why suggestions were made

## Sprint 4: Production Hardening
- Tasks: 4.1, 4.2, 4.3
- Goal: Production-ready with full test coverage
- Deliverables:
  - [ ] Caption/hashtag generation
  - [ ] Analytics dashboard with insights
  - [ ] Comprehensive test suite (unit, integration, e2e)
  - [ ] CI/CD pipeline with coverage gates
- Demo: All tests pass, 80%+ coverage, production deployment checklist complete

---

# PRODUCTION DEPLOYMENT CHECKLIST

Before going live:
- [ ] All tests passing with 80%+ coverage
- [ ] Security audit completed (auth, rate limits, input validation)
- [ ] Session storage in PostgreSQL (not memory)
- [ ] All secrets in environment variables
- [ ] HTTPS enforced
- [ ] Error monitoring configured (Sentry or similar)
- [ ] Database backups configured
- [ ] Rate limit thresholds validated
- [ ] Load testing completed

---

*Task breakdown complete. Production-ready implementation plan.*
