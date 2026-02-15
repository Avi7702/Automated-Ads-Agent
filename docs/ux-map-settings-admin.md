# UX Map: Settings, Admin & Auth Pages

> Generated 2026-02-15 by UX Mapping Agent
> Covers: Settings, BrandProfile, ApiKeySettings, Login, QuotaDashboard, SystemMap, not-found, Header (global nav)

---

## P1: Settings (route: `/settings`)

File: `client/src/pages/Settings.tsx`

Container page with left sidebar nav + right content area. Lazy-loads 5 section components.
URL state via `useSettingsSectionUrl()` hook: `/settings?section=brand|knowledge-base|api-keys|strategy|usage`

### S1: Global Header

(See P8 below for full Header mapping)

### S2: Settings Sidebar Navigation

| ID       | Type   | Label/Text                         | Action                             | API Endpoint | Data Sent | Notes                                                  |
| -------- | ------ | ---------------------------------- | ---------------------------------- | ------------ | --------- | ------------------------------------------------------ |
| P1.S2.C1 | Button | "Brand Profile" (icon: User)       | Sets URL `?section=brand`          | None         | -         | Description: "Manage your brand identity and voice"    |
| P1.S2.C2 | Button | "Knowledge Base" (icon: Database)  | Sets URL `?section=knowledge-base` | None         | -         | Description: "Products, scenarios, and brand assets"   |
| P1.S2.C3 | Button | "API Keys" (icon: Key)             | Sets URL `?section=api-keys`       | None         | -         | Description: "Configure external service integrations" |
| P1.S2.C4 | Button | "Strategy" (icon: Target)          | Sets URL `?section=strategy`       | None         | -         | Description: "Content strategy and product priorities" |
| P1.S2.C5 | Button | "Usage & Quotas" (icon: BarChart3) | Sets URL `?section=usage`          | None         | -         | Description: "Monitor API usage and costs"             |

### S3: Brand Profile Content (when `?section=brand`)

Renders `<BrandProfile embedded />` which renders `<BrandProfileDisplay />` (see P2 below).

### S4: Knowledge Base Content (when `?section=knowledge-base`)

Renders `<KnowledgeBaseSection />` (see P1.S4 details below).

### S5: Strategy Content (when `?section=strategy`)

Renders `<StrategySection />` (see P1.S5 details below).

### S6: API Keys Content (when `?section=api-keys`)

Renders `<ApiKeySettings embedded />` (see P3 below).

### S7: Usage & Quotas Content (when `?section=usage`)

Renders `<QuotaDashboard embedded />` (see P5 below).

---

### S4 Detail: KnowledgeBaseSection

File: `client/src/components/settings/KnowledgeBaseSection.tsx`

Fetches data from 4 API endpoints on mount. Displays stat cards and quick-action links.

**Data Queries:**

- `GET /api/products` (products count)
- `GET /api/templates` (templates count)
- `GET /api/brand-images` (brand images count)
- `GET /api/installation-scenarios` (scenarios count)

| ID       | Type          | Label/Text                       | Action                                     | API Endpoint | Data Sent | Notes                |
| -------- | ------------- | -------------------------------- | ------------------------------------------ | ------------ | --------- | -------------------- |
| P1.S4.C1 | Link Card     | "Products" (count)               | Navigate to `/library?tab=products`        | None         | -         | Stat card with count |
| P1.S4.C2 | Link Card     | "Brand Images" (count)           | Navigate to `/library?tab=brand-images`    | None         | -         | Stat card with count |
| P1.S4.C3 | Link Card     | "Installation Scenarios" (count) | Navigate to `/library?tab=scenarios`       | None         | -         | Stat card with count |
| P1.S4.C4 | Link Card     | "Scene Templates" (count)        | Navigate to `/library?tab=scene-templates` | None         | -         | Stat card with count |
| P1.S4.C5 | Button (Link) | "Add Products"                   | Navigate to `/library?tab=products`        | None         | -         | Quick action         |
| P1.S4.C6 | Button (Link) | "Upload Brand Images"            | Navigate to `/library?tab=brand-images`    | None         | -         | Quick action         |
| P1.S4.C7 | Button (Link) | "Create Scenario"                | Navigate to `/library?tab=scenarios`       | None         | -         | Quick action         |

---

### S5 Detail: StrategySection

File: `client/src/components/settings/StrategySection.tsx`

Manages posting frequency, category mix, platforms, posting times, and product priorities.

**Data Queries:**

- `useBusinessIntelligence()` hook (business intelligence config)
- `useProductPriorities()` hook (product priorities)
- `GET /api/products` (product list)

**Mutations:**

- `useSaveBusinessIntelligence()` -> saves biz intel config
- `useBulkSetPriorities()` -> saves product priorities

| ID        | Type     | Label/Text                       | Action                                               | API Endpoint                                          | Data Sent                                                                                                         | Notes                             |
| --------- | -------- | -------------------------------- | ---------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| P1.S5.C1  | Button   | "3 posts/week"                   | Set posting frequency to 3                           | None (local state)                                    | -                                                                                                                 | One of 3 frequency options        |
| P1.S5.C2  | Button   | "5 posts/week"                   | Set posting frequency to 5                           | None (local state)                                    | -                                                                                                                 | Default selection                 |
| P1.S5.C3  | Button   | "7 posts/week"                   | Set posting frequency to 7                           | None (local state)                                    | -                                                                                                                 | One of 3 frequency options        |
| P1.S5.C4  | Slider   | "Product Showcase"               | Adjust category target % (auto-redistributes others) | None (local state)                                    | -                                                                                                                 | 0-100%, step 5%                   |
| P1.S5.C5  | Slider   | "Educational"                    | Adjust category target %                             | None (local state)                                    | -                                                                                                                 | 0-100%, step 5%                   |
| P1.S5.C6  | Slider   | "Industry Insights"              | Adjust category target %                             | None (local state)                                    | -                                                                                                                 | 0-100%, step 5%                   |
| P1.S5.C7  | Slider   | "Company Updates"                | Adjust category target %                             | None (local state)                                    | -                                                                                                                 | 0-100%, step 5%                   |
| P1.S5.C8  | Slider   | "Engagement"                     | Adjust category target %                             | None (local state)                                    | -                                                                                                                 | 0-100%, step 5%                   |
| P1.S5.C9  | Checkbox | "LinkedIn"                       | Toggle preferred platform                            | None (local state)                                    | -                                                                                                                 | Default checked                   |
| P1.S5.C10 | Checkbox | "Instagram"                      | Toggle preferred platform                            | None (local state)                                    | -                                                                                                                 |                                   |
| P1.S5.C11 | Checkbox | "Facebook"                       | Toggle preferred platform                            | None (local state)                                    | -                                                                                                                 |                                   |
| P1.S5.C12 | Checkbox | "Twitter/X"                      | Toggle preferred platform                            | None (local state)                                    | -                                                                                                                 |                                   |
| P1.S5.C13 | Checkbox | "TikTok"                         | Toggle preferred platform                            | None (local state)                                    | -                                                                                                                 |                                   |
| P1.S5.C14 | Select   | "Mon" time                       | Set posting time for Monday                          | None (local state)                                    | -                                                                                                                 | 48 time options (00:00 - 23:30)   |
| P1.S5.C15 | Select   | "Tue" time                       | Set posting time for Tuesday                         | None (local state)                                    | -                                                                                                                 | Same options                      |
| P1.S5.C16 | Select   | "Wed" time                       | Set posting time for Wednesday                       | None (local state)                                    | -                                                                                                                 | Same options                      |
| P1.S5.C17 | Select   | "Thu" time                       | Set posting time for Thursday                        | None (local state)                                    | -                                                                                                                 | Same options                      |
| P1.S5.C18 | Select   | "Fri" time                       | Set posting time for Friday                          | None (local state)                                    | -                                                                                                                 | Same options                      |
| P1.S5.C19 | Select   | "Sat" time                       | Set posting time for Saturday                        | None (local state)                                    | -                                                                                                                 | Same options                      |
| P1.S5.C20 | Select   | "Sun" time                       | Set posting time for Sunday                          | None (local state)                                    | -                                                                                                                 | Same options                      |
| P1.S5.C21 | Select   | Product Tier (per product row)   | Set product tier: flagship/core/supporting/new       | None (local state)                                    | -                                                                                                                 | One per product in table          |
| P1.S5.C22 | Slider   | Product Weight (per product row) | Set weight 1-10                                      | None (local state)                                    | -                                                                                                                 | One per product in table          |
| P1.S5.C23 | Button   | "Save Strategy"                  | Save all strategy settings                           | `useSaveBusinessIntelligence`, `useBulkSetPriorities` | `{postsPerWeek, categoryTargets, preferredPlatforms, postingTimes}` + `[{productId, revenueTier, revenueWeight}]` | Disabled when not dirty or saving |

---

## P2: BrandProfile (route: `/brand-profile`)

File: `client/src/pages/BrandProfile.tsx`

Standalone page wrapping `BrandProfileDisplay` component. Has `embedded` prop for Settings integration.

### S1: Standalone Navigation

| ID       | Type          | Label/Text                         | Action                           | API Endpoint | Data Sent | Notes                             |
| -------- | ------------- | ---------------------------------- | -------------------------------- | ------------ | --------- | --------------------------------- |
| P2.S1.C1 | Button (Link) | "Back to Studio" (icon: ArrowLeft) | Navigate to `/`                  | None         | -         | Only in standalone mode           |
| P2.S1.C2 | Card (Link)   | "API Keys"                         | Navigate to `/settings/api-keys` | None         | -         | Navigation card with ChevronRight |

### S2: BrandProfileDisplay

File: `client/src/components/BrandProfileDisplay.tsx`

Read-only display of brand profile data. Fetches profile on mount.

**Data Query:** `GET /api/brand-profile` (credentials: include)

| ID       | Type   | Label/Text                          | Action                       | API Endpoint | Data Sent | Notes                               |
| -------- | ------ | ----------------------------------- | ---------------------------- | ------------ | --------- | ----------------------------------- |
| P2.S2.C1 | Button | "Edit Profile" (icon: PenLine)      | Opens BrandProfileForm sheet | None         | -         | Only visible when profile exists    |
| P2.S2.C2 | Button | "Create Brand Profile" (icon: Plus) | Opens BrandProfileForm sheet | None         | -         | Only visible when no profile exists |

### S3: BrandProfileForm (Sheet / Side Panel)

File: `client/src/components/BrandProfileForm.tsx`

Full brand profile editor in a right-side Sheet. Opened from BrandProfileDisplay.

**Save Mutation:** `PUT /api/brand-profile` (credentials: include, JSON body)

The form uses Accordion sections, each expandable/collapsible:

#### Accordion: Basic Information

| ID       | Type             | Label/Text          | Action                    | API Endpoint       | Data Sent | Notes                                       |
| -------- | ---------------- | ------------------- | ------------------------- | ------------------ | --------- | ------------------------------------------- |
| P2.S3.C1 | AccordionTrigger | "Basic Information" | Toggle section open/close | None               | -         | Default open                                |
| P2.S3.C2 | Input            | "Brand Name"        | Update brandName field    | None (local state) | -         | placeholder: "e.g., Next Day Steel"         |
| P2.S3.C3 | Input            | "Industry"          | Update industry field     | None (local state) | -         | placeholder: "e.g., Construction Materials" |

#### Accordion: Brand Identity

| ID       | Type             | Label/Text       | Action                    | API Endpoint       | Data Sent | Notes                                                                    |
| -------- | ---------------- | ---------------- | ------------------------- | ------------------ | --------- | ------------------------------------------------------------------------ |
| P2.S3.C4 | AccordionTrigger | "Brand Identity" | Toggle section open/close | None               | -         | Default open                                                             |
| P2.S3.C5 | Input + Button   | "Brand Values"   | Add value to array        | None (local state) | -         | ArrayField: type text, press Enter or click + to add. X to remove items. |

#### Accordion: Visual Style

| ID       | Type             | Label/Text         | Action                    | API Endpoint       | Data Sent | Notes      |
| -------- | ---------------- | ------------------ | ------------------------- | ------------------ | --------- | ---------- |
| P2.S3.C6 | AccordionTrigger | "Visual Style"     | Toggle section open/close | None               | -         |            |
| P2.S3.C7 | Input + Button   | "Preferred Styles" | Add style to array        | None (local state) | -         | ArrayField |
| P2.S3.C8 | Input + Button   | "Brand Colors"     | Add color to array        | None (local state) | -         | ArrayField |

#### Accordion: Voice & Tone

| ID        | Type             | Label/Text         | Action                    | API Endpoint       | Data Sent | Notes        |
| --------- | ---------------- | ------------------ | ------------------------- | ------------------ | --------- | ------------ |
| P2.S3.C9  | AccordionTrigger | "Voice & Tone"     | Toggle section open/close | None               | -         | Default open |
| P2.S3.C10 | Textarea         | "Voice Summary"    | Update voice.summary      | None (local state) | -         | 3 rows       |
| P2.S3.C11 | Input + Button   | "Voice Principles" | Add principle to array    | None (local state) | -         | ArrayField   |
| P2.S3.C12 | Input + Button   | "Words to Use"     | Add word to array         | None (local state) | -         | ArrayField   |
| P2.S3.C13 | Input + Button   | "Words to Avoid"   | Add word to array         | None (local state) | -         | ArrayField   |

#### Accordion: Target Audience

| ID        | Type             | Label/Text        | Action                               | API Endpoint       | Data Sent | Notes        |
| --------- | ---------------- | ----------------- | ------------------------------------ | ------------------ | --------- | ------------ |
| P2.S3.C14 | AccordionTrigger | "Target Audience" | Toggle section open/close            | None               | -         | Default open |
| P2.S3.C15 | Textarea         | "Demographics"    | Update targetAudience.demographics   | None (local state) | -         | 2 rows       |
| P2.S3.C16 | Textarea         | "Psychographics"  | Update targetAudience.psychographics | None (local state) | -         | 2 rows       |
| P2.S3.C17 | Input + Button   | "Pain Points"     | Add pain point to array              | None (local state) | -         | ArrayField   |
| P2.S3.C18 | Input + Button   | "Personas"        | Add persona to array                 | None (local state) | -         | ArrayField   |

#### Accordion: Knowledge Base Tags

| ID        | Type             | Label/Text            | Action                    | API Endpoint       | Data Sent | Notes      |
| --------- | ---------------- | --------------------- | ------------------------- | ------------------ | --------- | ---------- |
| P2.S3.C19 | AccordionTrigger | "Knowledge Base Tags" | Toggle section open/close | None               | -         |            |
| P2.S3.C20 | Input + Button   | "KB Tags"             | Add tag to array          | None (local state) | -         | ArrayField |

#### Form Actions

| ID        | Type   | Label/Text                   | Action                     | API Endpoint             | Data Sent                                                                                              | Notes                     |
| --------- | ------ | ---------------------------- | -------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------ | ------------------------- |
| P2.S3.C21 | Button | "Cancel"                     | Close sheet without saving | None                     | -                                                                                                      |                           |
| P2.S3.C22 | Button | "Save Profile" / "Saving..." | Submit brand profile       | `PUT /api/brand-profile` | `{brandName, industry, brandValues, preferredStyles, colorPreferences, voice, targetAudience, kbTags}` | Shows spinner when saving |

---

## P3: ApiKeySettings (route: `/settings/api-keys`)

File: `client/src/pages/ApiKeySettings.tsx`

Manages API keys for 4 services: Gemini, Cloudinary, Firecrawl, Redis.
Has `embedded` prop for Settings page integration.

**Data Queries:**

- `GET /api/settings/api-keys` (list all key statuses)
- `GET /api/settings/n8n` (n8n configuration status)

### S1: Standalone Navigation

| ID       | Type          | Label/Text                           | Action                  | API Endpoint | Data Sent | Notes                   |
| -------- | ------------- | ------------------------------------ | ----------------------- | ------------ | --------- | ----------------------- |
| P3.S1.C1 | Button (Link) | "Back to Settings" (icon: ArrowLeft) | Navigate to `/settings` | None         | -         | Only in standalone mode |

### S2: API Key Cards (one per service: gemini, cloudinary, firecrawl, redis)

Each card rendered by `ApiKeyCard` component.
File: `client/src/components/settings/ApiKeyCard.tsx`

Per-card interactive elements:

| ID       | Type          | Label/Text                                | Action                           | API Endpoint                                     | Data Sent | Notes                                                       |
| -------- | ------------- | ----------------------------------------- | -------------------------------- | ------------------------------------------------ | --------- | ----------------------------------------------------------- |
| P3.S2.C1 | Button        | "Add Key" or "Edit Key"                   | Opens ApiKeyForm dialog          | None                                             | -         | "Add Key" if no custom key, "Edit Key" if custom key exists |
| P3.S2.C2 | Button (icon) | Validate (icon: RefreshCw)                | Validate API key                 | `POST /api/settings/api-keys/{service}/validate` | `{}`      | Only visible when custom key is configured                  |
| P3.S2.C3 | Button (icon) | Delete (icon: Trash2)                     | Opens delete confirmation dialog | None                                             | -         | Only visible when custom key exists                         |
| P3.S2.C4 | Button (icon) | Toggle key preview (icon: Eye/EyeOff)     | Show/hide key preview            | None (local state)                               | -         | Only visible when custom key exists                         |
| P3.S2.C5 | Link          | "View Documentation" (icon: ExternalLink) | Open service docs URL in new tab | None                                             | -         | Links to aistudio.google.com, cloudinary.com, etc.          |
| P3.S2.C6 | Link          | "Generate a new key"                      | Open service docs URL in new tab | None                                             | -         | Only visible when key status is "invalid"                   |

### S3: Delete Confirmation Dialog (per service)

| ID       | Type   | Label/Text   | Action                    | API Endpoint                              | Data Sent | Notes                    |
| -------- | ------ | ------------ | ------------------------- | ----------------------------------------- | --------- | ------------------------ |
| P3.S3.C1 | Button | "Cancel"     | Close dialog              | None                                      | -         | AlertDialogCancel        |
| P3.S3.C2 | Button | "Remove Key" | Delete the custom API key | `DELETE /api/settings/api-keys/{service}` | None      | Destructive button style |

### S4: ApiKeyForm Dialog

File: `client/src/components/settings/ApiKeyForm.tsx`

Dynamic form fields based on service. Opens as a Dialog.

**Save Mutation:** `POST /api/settings/api-keys/{service}`

Fields per service:

- **gemini**: 1 field (API Key)
- **cloudinary**: 3 fields (Cloud Name, API Key, API Secret)
- **firecrawl**: 1 field (API Key)
- **redis**: 1 field (Connection URL)

| ID       | Type              | Label/Text                           | Action                       | API Endpoint                            | Data Sent                               | Notes                                       |
| -------- | ----------------- | ------------------------------------ | ---------------------------- | --------------------------------------- | --------------------------------------- | ------------------------------------------- |
| P3.S4.C1 | Input (per field) | Dynamic label from config            | Update field value           | None (local state)                      | -                                       | Password/text toggle for secret fields      |
| P3.S4.C2 | Button (icon)     | Toggle visibility (icon: Eye/EyeOff) | Show/hide secret field value | None (local state)                      | -                                       | Per secret field                            |
| P3.S4.C3 | Link              | "Get a new key" (icon: ExternalLink) | Open docs URL in new tab     | None                                    | -                                       | Only visible on validation error            |
| P3.S4.C4 | Button            | "Cancel"                             | Close dialog                 | None                                    | -                                       |                                             |
| P3.S4.C5 | Button            | "Save Key" / "Validating..."         | Submit API key               | `POST /api/settings/api-keys/{service}` | `Record<string, string>` (field values) | Client-side format validation before submit |

### S5: n8n Automation Configuration

| ID       | Type   | Label/Text                             | Action             | API Endpoint             | Data Sent           | Notes                                                         |
| -------- | ------ | -------------------------------------- | ------------------ | ------------------------ | ------------------- | ------------------------------------------------------------- |
| P3.S5.C1 | Input  | "n8n Instance URL"                     | Update n8n baseUrl | None (local state)       | -                   | type: url, placeholder: "https://your-instance.app.n8n.cloud" |
| P3.S5.C2 | Input  | "n8n API Key" (Optional)               | Update n8n apiKey  | None (local state)       | -                   | type: password                                                |
| P3.S5.C3 | Button | "Save n8n Configuration" / "Saving..." | Save n8n config    | `POST /api/settings/n8n` | `{baseUrl, apiKey}` | Disabled when baseUrl empty or saving                         |

---

## P4: Login (route: `/login`)

File: `client/src/pages/Login.tsx`

Authentication page with email/password form and Google OAuth.

### S1: Login Form

| ID       | Type            | Label/Text                            | Action                     | API Endpoint                       | Data Sent           | Notes                                                            |
| -------- | --------------- | ------------------------------------- | -------------------------- | ---------------------------------- | ------------------- | ---------------------------------------------------------------- |
| P4.S1.C1 | Input           | "Email"                               | Update email state         | None (local state)                 | -                   | type: email, required, autoFocus, placeholder: "you@company.com" |
| P4.S1.C2 | Input           | "Password"                            | Update password state      | None (local state)                 | -                   | type: password/text (toggleable), required                       |
| P4.S1.C3 | Button (icon)   | Show/Hide password (icon: Eye/EyeOff) | Toggle password visibility | None (local state)                 | -                   | aria-label: "Show password" / "Hide password"                    |
| P4.S1.C4 | Button (submit) | "Sign In" / "Signing in..."           | Submit login form          | `useAuth().login(email, password)` | `{email, password}` | Disabled when loading or fields empty. Shows spinner.            |

### S2: OAuth

| ID       | Type          | Label/Text                          | Action                   | API Endpoint                                | Data Sent | Notes            |
| -------- | ------------- | ----------------------------------- | ------------------------ | ------------------------------------------- | --------- | ---------------- |
| P4.S2.C1 | Link (Button) | "Sign in with Google" (Google icon) | Navigate to Google OAuth | `GET /api/auth/google` (full page redirect) | -         | Opens OAuth flow |

---

## P5: QuotaDashboard (route: `/usage`)

File: `client/src/pages/QuotaDashboard.tsx` -> `client/src/components/quota/QuotaDashboard.tsx`

Monitoring dashboard with 4 tabs. Has `embedded` prop for Settings integration.

### S1: Top-Level Tabs

| ID       | Type        | Label/Text                       | Action               | API Endpoint | Data Sent | Notes          |
| -------- | ----------- | -------------------------------- | -------------------- | ------------ | --------- | -------------- |
| P5.S1.C1 | TabsTrigger | "API Quota" (icon: Activity)     | Show quota tab       | None         | -         | Default active |
| P5.S1.C2 | TabsTrigger | "System Health" (icon: Server)   | Show health tab      | None         | -         |                |
| P5.S1.C3 | TabsTrigger | "Performance" (icon: TrendingUp) | Show performance tab | None         | -         |                |
| P5.S1.C4 | TabsTrigger | "Errors" (icon: AlertTriangle)   | Show errors tab      | None         | -         |                |

### S2: API Quota Tab (QuotaDashboardContent)

File: `client/src/components/quota/QuotaDashboardContent.tsx`

**Data Queries (auto-refreshing):**

- `GET /api/quota/status` (every 10s)
- `GET /api/quota/history?windowType={minute|hour|day}` (every 30s)
- `GET /api/quota/breakdown?period={today|week|month}` (every 60s)

Displays: QuotaStatusCard (RPM, RPD, Tokens), CostCard, UsageChart, UsageBreakdown, GoogleSyncStatus.

| ID       | Type    | Label/Text                    | Action                                     | API Endpoint | Data Sent | Notes                              |
| -------- | ------- | ----------------------------- | ------------------------------------------ | ------------ | --------- | ---------------------------------- |
| P5.S2.C1 | Display | QuotaStatusCard x3 + CostCard | Read-only status cards                     | Auto-fetched | -         | RPM, RPD, Tokens/Day, Cost summary |
| P5.S2.C2 | Display | RateLimitCountdown            | Countdown timer (auto-refetch on complete) | None         | -         | Only visible when rate limited     |

#### UsageChart sub-component

File: `client/src/components/quota/UsageChart.tsx`

| ID       | Type   | Label/Text                   | Action                       | API Endpoint                            | Data Sent | Notes             |
| -------- | ------ | ---------------------------- | ---------------------------- | --------------------------------------- | --------- | ----------------- |
| P5.S2.C3 | Select | Window type: Minute/Hour/Day | Change time window for chart | `GET /api/quota/history?windowType=...` | -         | Triggers re-fetch |
| P5.S2.C4 | Select | Metric: Requests/Tokens/Cost | Change displayed metric      | None (local state)                      | -         | Local toggle only |

#### UsageBreakdown sub-component

File: `client/src/components/quota/UsageBreakdown.tsx`

| ID       | Type   | Label/Text               | Action                  | API Endpoint                          | Data Sent | Notes             |
| -------- | ------ | ------------------------ | ----------------------- | ------------------------------------- | --------- | ----------------- |
| P5.S2.C5 | Select | Period: Today/Week/Month | Change breakdown period | `GET /api/quota/breakdown?period=...` | -         | Triggers re-fetch |

#### GoogleSyncStatus sub-component

File: `client/src/components/quota/GoogleSyncStatus.tsx`

**Data Queries:**

- `GET /api/quota/google/status` (every 30s)
- `GET /api/quota/google/history?limit=5` (on demand)

| ID       | Type          | Label/Text                                  | Action                           | API Endpoint                                       | Data Sent | Notes                                                                     |
| -------- | ------------- | ------------------------------------------- | -------------------------------- | -------------------------------------------------- | --------- | ------------------------------------------------------------------------- |
| P5.S2.C6 | Button (icon) | Toggle sync history (icon: History)         | Show/hide sync history list      | Lazy loads `GET /api/quota/google/history?limit=5` | -         |                                                                           |
| P5.S2.C7 | Button        | "Sync Now" / "Syncing..." (icon: RefreshCw) | Trigger manual Google Cloud sync | `POST /api/quota/google/sync`                      | None      | Invalidates quota-status, google-sync-status, google-sync-history queries |

### S3: System Health Tab

File: `client/src/components/monitoring/SystemHealthTab.tsx`

**Data Query:** `GET /api/monitoring/health` (every 10s)

| ID       | Type    | Label/Text                 | Action            | API Endpoint | Data Sent | Notes                                    |
| -------- | ------- | -------------------------- | ----------------- | ------------ | --------- | ---------------------------------------- |
| P5.S3.C1 | Display | Overall System Health card | Read-only status  | Auto-fetched | -         | Shows healthy/degraded/unhealthy badge   |
| P5.S3.C2 | Display | Database (PostgreSQL) card | Read-only metrics | Auto-fetched | -         | Connections, query time, waiting clients |
| P5.S3.C3 | Display | Redis (Session Store) card | Read-only status  | Auto-fetched | -         | Connected/disconnected, latency          |

No user-interactive elements on this tab (display-only, auto-refreshing).

### S4: Performance Tab

File: `client/src/components/monitoring/PerformanceTab.tsx`

**Data Query:** `GET /api/monitoring/performance` (every 10s)

| ID       | Type    | Label/Text                                                         | Action          | API Endpoint | Data Sent | Notes                                                            |
| -------- | ------- | ------------------------------------------------------------------ | --------------- | ------------ | --------- | ---------------------------------------------------------------- |
| P5.S4.C1 | Display | Summary cards (Total Endpoints, Total Requests, Avg Response Time) | Read-only       | Auto-fetched | -         |                                                                  |
| P5.S4.C2 | Display | Endpoints table (top 20 by request count)                          | Read-only table | Auto-fetched | -         | Columns: Endpoint, Method, Requests, Error Rate, Avg/Max Latency |

No user-interactive elements on this tab (display-only, auto-refreshing).

### S5: Error Tracking Tab

File: `client/src/components/monitoring/ErrorTrackingTab.tsx`

**Data Query:** `GET /api/monitoring/errors` (every 10s)

| ID       | Type                    | Label/Text                                                         | Action                        | API Endpoint       | Data Sent | Notes                                 |
| -------- | ----------------------- | ------------------------------------------------------------------ | ----------------------------- | ------------------ | --------- | ------------------------------------- |
| P5.S5.C1 | Display                 | Summary cards (Total Errors, Last 5 Min, Last Hour, Unique Errors) | Read-only                     | Auto-fetched       | -         |                                       |
| P5.S5.C2 | Button (icon per error) | Expand/Collapse (icon: ChevronDown/ChevronUp)                      | Toggle stack trace visibility | None (local state) | -         | Only shown when error has stack trace |

---

## P6: SystemMap (route: `/system-map`)

File: `client/src/pages/SystemMap.tsx`

Interactive system architecture visualization using React Flow (`@xyflow/react`).
Full-viewport canvas with nodes representing UI pages, API endpoints, orchestrators, AI tools, RAG services, and infrastructure.

### S1: React Flow Canvas

| ID       | Type     | Label/Text                           | Action                                          | API Endpoint | Data Sent | Notes                            |
| -------- | -------- | ------------------------------------ | ----------------------------------------------- | ------------ | --------- | -------------------------------- |
| P6.S1.C1 | Canvas   | ReactFlow                            | Pan (drag), Zoom (scroll), Select nodes (click) | None         | -         | 50+ nodes, 40+ edges             |
| P6.S1.C2 | Controls | Zoom In/Out/Fit (ReactFlow Controls) | Built-in zoom controls                          | None         | -         | Bottom-left corner               |
| P6.S1.C3 | MiniMap  | MiniMap                              | Click to navigate                               | None         | -         | Bottom-right corner, color-coded |

### S2: Info Panels (non-interactive)

| ID       | Type  | Label/Text                       | Action       | API Endpoint | Data Sent | Notes         |
| -------- | ----- | -------------------------------- | ------------ | ------------ | --------- | ------------- |
| P6.S2.C1 | Panel | Title: "System Architecture Map" | Display only | None         | -         | Top center    |
| P6.S2.C2 | Panel | Legend (6 categories)            | Display only | None         | -         | Top left      |
| P6.S2.C3 | Panel | System Stats (counts)            | Display only | None         | -         | Top right     |
| P6.S2.C4 | Panel | Instructions                     | Display only | None         | -         | Bottom center |

---

## P7: Not Found / 404 (route: any unmatched)

File: `client/src/pages/not-found.tsx`

Static error page. No interactive elements.

| ID  | Type    | Label/Text           | Action | API Endpoint | Data Sent | Notes                                     |
| --- | ------- | -------------------- | ------ | ------------ | --------- | ----------------------------------------- |
| -   | Display | "404 Page Not Found" | None   | None         | -         | Static text + icon. No links, no buttons. |

---

## P8: Global Header (Navigation Bar)

File: `client/src/components/layout/Header.tsx`

Sticky header present on all pages (except Login and SystemMap). Contains logo, main nav, theme toggle, user info, and logout.

### S1: Desktop Navigation

| ID       | Type | Label/Text                           | Action                  | API Endpoint | Data Sent | Notes                          |
| -------- | ---- | ------------------------------------ | ----------------------- | ------------ | --------- | ------------------------------ |
| P8.S1.C1 | Link | Logo "V3" + "Product Content Studio" | Navigate to `/`         | None         | -         | Brand mark, always visible     |
| P8.S1.C2 | Link | "Studio"                             | Navigate to `/`         | None         | -         | Active when on studio routes   |
| P8.S1.C3 | Link | "Gallery"                            | Navigate to `/gallery`  | None         | -         | Active when on gallery routes  |
| P8.S1.C4 | Link | "Pipeline"                           | Navigate to `/pipeline` | None         | -         | Active when on pipeline routes |
| P8.S1.C5 | Link | "Library"                            | Navigate to `/library`  | None         | -         | Active when on library routes  |
| P8.S1.C6 | Link | "Settings"                           | Navigate to `/settings` | None         | -         | Active when on settings routes |

### S2: Actions (Right Side)

| ID       | Type                  | Label/Text                    | Action           | API Endpoint         | Data Sent | Notes                                               |
| -------- | --------------------- | ----------------------------- | ---------------- | -------------------- | --------- | --------------------------------------------------- |
| P8.S2.C1 | DropdownMenu (Button) | Theme Toggle (icon: Sun/Moon) | Opens theme menu | None                 | -         | See ThemeToggle below                               |
| P8.S2.C2 | Display               | User email                    | Display only     | None                 | -         | Only when user is logged in                         |
| P8.S2.C3 | Button                | Logout (icon: LogOut)         | Sign out user    | `useAuth().logout()` | None      | Only when user is logged in. aria-label: "Sign out" |

### S3: Theme Toggle Dropdown

File: `client/src/components/ThemeToggle.tsx`

| ID       | Type             | Label/Text          | Action              | API Endpoint       | Data Sent | Notes |
| -------- | ---------------- | ------------------- | ------------------- | ------------------ | --------- | ----- |
| P8.S3.C1 | DropdownMenuItem | "Light" (icon: Sun) | Set theme to light  | None (next-themes) | -         |       |
| P8.S3.C2 | DropdownMenuItem | "Dark" (icon: Moon) | Set theme to dark   | None (next-themes) | -         |       |
| P8.S3.C3 | DropdownMenuItem | "System"            | Set theme to system | None (next-themes) | -         |       |

### S4: Mobile Navigation (Sheet Drawer)

| ID       | Type   | Label/Text                  | Action                                | API Endpoint | Data Sent | Notes                                                                  |
| -------- | ------ | --------------------------- | ------------------------------------- | ------------ | --------- | ---------------------------------------------------------------------- |
| P8.S4.C1 | Button | Hamburger menu (icon: Menu) | Open mobile nav sheet                 | None         | -         | Only visible on mobile (md:hidden), aria-label: "Open navigation menu" |
| P8.S4.C2 | Link   | "Studio"                    | Navigate to `/` + close sheet         | None         | -         | Same 5 nav items as desktop                                            |
| P8.S4.C3 | Link   | "Gallery"                   | Navigate to `/gallery` + close sheet  | None         | -         |                                                                        |
| P8.S4.C4 | Link   | "Pipeline"                  | Navigate to `/pipeline` + close sheet | None         | -         |                                                                        |
| P8.S4.C5 | Link   | "Library"                   | Navigate to `/library` + close sheet  | None         | -         |                                                                        |
| P8.S4.C6 | Link   | "Settings"                  | Navigate to `/settings` + close sheet | None         | -         |                                                                        |

---

## API Endpoint Summary

All endpoints referenced by interactive elements on these pages:

| Endpoint                                    | Method | Used By                               | Purpose                                     |
| ------------------------------------------- | ------ | ------------------------------------- | ------------------------------------------- |
| `/api/brand-profile`                        | GET    | BrandProfileDisplay                   | Fetch brand profile                         |
| `/api/brand-profile`                        | PUT    | BrandProfileForm                      | Save/update brand profile                   |
| `/api/products`                             | GET    | KnowledgeBaseSection, StrategySection | List products                               |
| `/api/templates`                            | GET    | KnowledgeBaseSection                  | List templates                              |
| `/api/brand-images`                         | GET    | KnowledgeBaseSection                  | List brand images                           |
| `/api/installation-scenarios`               | GET    | KnowledgeBaseSection                  | List scenarios                              |
| `/api/settings/api-keys`                    | GET    | ApiKeySettings                        | List all API key statuses                   |
| `/api/settings/api-keys/{service}`          | POST   | ApiKeyForm                            | Save API key                                |
| `/api/settings/api-keys/{service}/validate` | POST   | ApiKeyCard                            | Validate API key                            |
| `/api/settings/api-keys/{service}`          | DELETE | ApiKeyCard                            | Delete API key                              |
| `/api/settings/n8n`                         | GET    | ApiKeySettings                        | Get n8n configuration                       |
| `/api/settings/n8n`                         | POST   | ApiKeySettings                        | Save n8n configuration                      |
| `/api/auth/google`                          | GET    | Login                                 | Google OAuth redirect                       |
| `useAuth().login()`                         | -      | Login                                 | Email/password auth (via AuthContext)       |
| `useAuth().logout()`                        | -      | Header                                | Sign out (via AuthContext)                  |
| `/api/quota/status`                         | GET    | QuotaDashboardContent                 | Quota status (auto-refresh 10s)             |
| `/api/quota/history`                        | GET    | UsageChart                            | Usage history (auto-refresh 30s)            |
| `/api/quota/breakdown`                      | GET    | UsageBreakdown                        | Usage breakdown (auto-refresh 60s)          |
| `/api/quota/google/status`                  | GET    | GoogleSyncStatus                      | Google Cloud sync status (auto-refresh 30s) |
| `/api/quota/google/history`                 | GET    | GoogleSyncStatus                      | Sync history (on-demand)                    |
| `/api/quota/google/sync`                    | POST   | GoogleSyncStatus                      | Trigger manual sync                         |
| `/api/monitoring/health`                    | GET    | SystemHealthTab                       | System health (auto-refresh 10s)            |
| `/api/monitoring/performance`               | GET    | PerformanceTab                        | Performance metrics (auto-refresh 10s)      |
| `/api/monitoring/errors`                    | GET    | ErrorTrackingTab                      | Error tracking (auto-refresh 10s)           |
| `useBusinessIntelligence()`                 | -      | StrategySection                       | Fetch business intelligence config          |
| `useSaveBusinessIntelligence()`             | -      | StrategySection                       | Save business intelligence config           |
| `useProductPriorities()`                    | -      | StrategySection                       | Fetch product priorities                    |
| `useBulkSetPriorities()`                    | -      | StrategySection                       | Save product priorities                     |

---

## Component Hierarchy

```
Settings.tsx
  |-- Header (global)
  |-- Sidebar: 5 nav buttons (brand, knowledge-base, api-keys, strategy, usage)
  |-- Content:
      |-- BrandProfile (embedded) -> BrandProfileDisplay -> BrandProfileForm (Sheet)
      |-- KnowledgeBaseSection (4 stat cards + 3 quick-action links)
      |-- StrategySection (freq buttons, sliders, checkboxes, selects, product table, save button)
      |-- ApiKeySettings (embedded) -> ApiKeyCard[] + ApiKeyForm (Dialog) + n8n config
      |-- QuotaDashboard (embedded) -> Tabs:
          |-- QuotaDashboardContent -> QuotaStatusCard[], CostCard, UsageChart, UsageBreakdown, GoogleSyncStatus
          |-- SystemHealthTab
          |-- PerformanceTab
          |-- ErrorTrackingTab

BrandProfile.tsx (standalone)
  |-- Header (global)
  |-- "Back to Studio" link
  |-- API Keys nav card
  |-- BrandProfileDisplay -> BrandProfileForm (Sheet)

ApiKeySettings.tsx (standalone)
  |-- Header (global)
  |-- "Back to Settings" link
  |-- ApiKeyCard[] + ApiKeyForm (Dialog) + n8n config

Login.tsx
  |-- Email + Password form
  |-- Google OAuth link

QuotaDashboard.tsx (standalone)
  |-- Header (global)
  |-- QuotaDashboard component (same as Settings embedded)

SystemMap.tsx
  |-- ReactFlow full-screen canvas (no Header)

not-found.tsx
  |-- Static 404 card (no Header)
```
