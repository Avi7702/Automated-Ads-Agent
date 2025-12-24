# Template Library - Architecture & Data Flow

## Component Hierarchy

```
App.tsx
  └── Router
      └── /templates route
          └── Templates.tsx (Page)
              └── TemplateLibrary.tsx (Container)
                  ├── Search Input
                  ├── Category Filters
                  ├── Global Toggle
                  └── Grid
                      └── TemplateCard.tsx (Item) [repeating]
                          ├── Preview Image
                          ├── Category Badge
                          ├── Title & Description
                          └── Hover Overlay
                              ├── Full Description
                              ├── Tags
                              ├── Metadata (lighting, environment)
                              └── Global Indicator
```

## Data Flow

### 1. Initial Load

```
User navigates to /templates
       ↓
Templates.tsx renders
       ↓
TemplateLibrary.tsx mounts
       ↓
useQuery hook triggers
       ↓
GET /api/templates?category=all
       ↓
React Query caches response
       ↓
templates[] state updates
       ↓
Grid renders TemplateCard components
```

### 2. Search Flow

```
User types in search input
       ↓
setSearchQuery("cozy")
       ↓
filteredTemplates recalculates (client-side)
       ↓
Grid re-renders with filtered results
       ↓
No API call (instant feedback)
```

### 3. Category Filter Flow

```
User clicks "Lifestyle" tab
       ↓
setSelectedCategory("lifestyle")
       ↓
useQuery re-triggers with new queryKey
       ↓
GET /api/templates?category=lifestyle
       ↓
React Query caches new response
       ↓
templates[] updates
       ↓
Grid re-renders with category results
```

### 4. Template Selection Flow

```
User clicks TemplateCard
       ↓
onSelect callback fires
       ↓
handleSelectTemplate(template)
       ↓
setSelectedTemplate(template) in parent
       ↓
TemplateCard re-renders with isSelected=true
       ↓
Visual state updates (checkmark, border color)
```

## State Management

### Local State (useState)

```typescript
// Templates.tsx
const [selectedTemplate, setSelectedTemplate] = useState<AdSceneTemplate | null>(null);

// TemplateLibrary.tsx
const [searchQuery, setSearchQuery] = useState("");
const [selectedCategory, setSelectedCategory] = useState("all");
const [isGlobalOnly, setIsGlobalOnly] = useState(false);
```

### Server State (React Query)

```typescript
// TemplateLibrary.tsx
const { data: templates, isLoading, error, refetch, isRefetching } = useQuery({
  queryKey: ["templates", selectedCategory, isGlobalOnly],
  queryFn: async () => {
    const params = new URLSearchParams();
    if (selectedCategory !== "all") params.set("category", selectedCategory);
    if (isGlobalOnly) params.set("isGlobal", "true");
    const res = await fetch(`/api/templates?${params}`);
    return res.json();
  },
});
```

### Query Cache Strategy

```
Query Key: ["templates", "all", false]
           ↓
Cache Entry 1: All templates, global & user
           ↓
Cache TTL: 5 minutes (default)
           ↓
Stale-While-Revalidate: Yes

Query Key: ["templates", "lifestyle", false]
           ↓
Cache Entry 2: Lifestyle templates
           ↓
Independent cache (separate from Entry 1)
```

## Component Props Flow

### TemplateLibrary Props

```typescript
interface TemplateLibraryProps {
  onSelectTemplate?: (template: AdSceneTemplate) => void;  // ← Callback from parent
  selectedTemplateId?: string;                             // ← Selected state from parent
  className?: string;                                      // ← Optional styling
}
```

**Usage:**
```tsx
<TemplateLibrary
  onSelectTemplate={handleTemplateSelect}  // → Calls parent function
  selectedTemplateId={selectedTemplate?.id} // → Passes down selected ID
/>
```

### TemplateCard Props

```typescript
interface TemplateCardProps {
  template: AdSceneTemplate;                         // ← Template data
  onSelect?: (template: AdSceneTemplate) => void;    // ← Click handler
  isSelected?: boolean;                              // ← Selection state
}
```

**Usage:**
```tsx
<TemplateCard
  template={template}              // → Template object
  onSelect={handleSelectTemplate}  // → Parent's select handler
  isSelected={selectedTemplateId === template.id}  // → Boolean check
/>
```

## API Integration

### Endpoint: GET /api/templates

**Request:**
```http
GET /api/templates?category=lifestyle&isGlobal=true
Authorization: Bearer <session-cookie>
```

**Response:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Cozy Living Room",
    "description": "Warm, inviting lifestyle shot",
    "previewImageUrl": "https://res.cloudinary.com/.../preview.jpg",
    "previewPublicId": "templates/cozy-living-room",
    "referenceImages": [
      {
        "url": "https://res.cloudinary.com/.../ref1.jpg",
        "publicId": "templates/cozy-living-room-ref1"
      }
    ],
    "category": "lifestyle",
    "tags": ["cozy", "warm", "residential", "natural-light"],
    "platformHints": ["instagram", "facebook"],
    "aspectRatioHints": ["1:1", "4:5"],
    "promptBlueprint": "{{product}} placed naturally in a cozy living room with soft afternoon light streaming through windows, warm earth tones, plush textiles, and inviting atmosphere",
    "placementHints": {
      "position": "center",
      "scale": "medium"
    },
    "lightingStyle": "natural",
    "intent": "showcase",
    "environment": "indoor",
    "mood": "cozy",
    "bestForProductTypes": ["furniture", "decor", "textiles"],
    "isGlobal": true,
    "createdBy": null,
    "createdAt": "2025-12-01T10:30:00.000Z"
  }
]
```

## Styling Architecture

### Tailwind Utility Classes

```tsx
// Component structure with styling
<div className="space-y-6">                        // ← Container spacing
  <div className="relative">                       // ← Search container
    <Input className="pl-10" />                    // ← Input with icon spacing
  </div>

  <div className="flex gap-2 flex-wrap">           // ← Filter tabs
    <button className={cn(                         // ← Dynamic classes
      "px-4 py-2 rounded-lg",                      // ← Base styles
      isActive
        ? "bg-primary text-primary-foreground"     // ← Active state
        : "bg-card text-muted-foreground"          // ← Inactive state
    )} />
  </div>

  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
    // ← Responsive grid
    <TemplateCard />                               // ← Grid items
  </div>
</div>
```

### CSS Custom Properties (from theme)

```css
--background: #23252f;
--foreground: #ffffff;
--primary: (theme primary color);
--muted-foreground: (dimmed text);
--border: rgba(255, 255, 255, 0.1);
--card: (card background);
```

### Animation System (Framer Motion)

```tsx
// Grid item entrance animation
<motion.div
  initial={{ opacity: 0, scale: 0.9 }}    // ← Start state
  animate={{ opacity: 1, scale: 1 }}      // ← End state
  exit={{ opacity: 0, scale: 0.9 }}       // ← Exit state
  transition={{ duration: 0.2 }}          // ← Timing
>
  <TemplateCard />
</motion.div>
```

## Performance Optimizations

### 1. React Query Caching

```typescript
// Automatic caching
queryKey: ["templates", category, isGlobal]
         ↓
Cache stores result for 5 minutes
         ↓
Subsequent requests return cached data instantly
         ↓
Background refetch if stale
```

### 2. Client-Side Filtering

```typescript
// No API call for search
const filteredTemplates = templates.filter(template =>
  template.title.toLowerCase().includes(searchQuery.toLowerCase())
);
// → Runs in <16ms for 100 templates
```

### 3. CSS Transform Animations

```css
/* Instead of animating width/height (expensive) */
.card:hover {
  transform: scale(1.02);  /* ← GPU-accelerated */
}

/* Instead of animating margin (causes layout) */
.card {
  transition: transform 0.2s;  /* ← Smooth 60fps */
}
```

### 4. Image Lazy Loading

```tsx
<img
  src={template.previewImageUrl}
  alt={template.title}
  loading="lazy"  // ← Browser-native lazy loading
  className="w-full h-full object-cover"
/>
```

## Error Handling

### API Error Flow

```
Fetch /api/templates fails
       ↓
React Query catches error
       ↓
error state is set
       ↓
Error UI renders
       ↓
User clicks "Try Again"
       ↓
refetch() is called
       ↓
New fetch attempt
```

### Error States Handled

1. **Network Error**: "Failed to fetch templates"
2. **Authentication Error**: Redirects to login (handled by middleware)
3. **Empty Response**: "No templates found"
4. **Invalid Category**: Falls back to "all"

## Type Safety

### TypeScript Interfaces

```typescript
// From shared/schema.ts
export type AdSceneTemplate = typeof adSceneTemplates.$inferSelect;

// Component props
interface TemplateLibraryProps {
  onSelectTemplate?: (template: AdSceneTemplate) => void;
  selectedTemplateId?: string;
  className?: string;
}

// Filter types
type CategoryValue = "all" | "lifestyle" | "professional" | "outdoor" | "luxury" | "seasonal";
```

### Type Flow

```
Database (PostgreSQL)
       ↓
Drizzle ORM schema (shared/schema.ts)
       ↓
TypeScript types (AdSceneTemplate)
       ↓
API response (typed)
       ↓
React Query (useQuery<AdSceneTemplate[]>)
       ↓
Component props (typed)
       ↓
Render (type-safe)
```

## Testing Strategy

### Unit Tests (Recommended)

```typescript
// TemplateCard.test.tsx
describe("TemplateCard", () => {
  it("renders template title and category", () => {
    const template = mockTemplate();
    render(<TemplateCard template={template} />);
    expect(screen.getByText(template.title)).toBeInTheDocument();
  });

  it("calls onSelect when clicked", () => {
    const onSelect = jest.fn();
    const template = mockTemplate();
    render(<TemplateCard template={template} onSelect={onSelect} />);
    fireEvent.click(screen.getByTestId(`template-card-${template.id}`));
    expect(onSelect).toHaveBeenCalledWith(template);
  });
});
```

### Integration Tests (E2E)

```typescript
// templates.spec.ts (Playwright)
test("filters templates by category", async ({ page }) => {
  await page.goto("/templates");
  await page.getByTestId("button-category-lifestyle").click();

  // Wait for API call
  await page.waitForResponse("/api/templates?category=lifestyle");

  // Verify filtered results
  const cards = await page.getByTestId(/template-card-/).count();
  expect(cards).toBeGreaterThan(0);
});
```

## Security Considerations

### Authentication

```typescript
// All template endpoints require authentication
app.get("/api/templates", requireAuth, async (req, res) => {
  // ← requireAuth middleware checks session
  // ...
});
```

### Access Control

```typescript
// Global templates visible to all users
// User templates visible only to creator
const templates = await storage.getAdSceneTemplates({
  category,
  isGlobal,
  userId: (req.session as any).userId,  // ← Filters by user
});
```

### Input Validation

```typescript
// Query params are validated
const { category, isGlobal } = req.query;

// Category must match enum
if (category && !["lifestyle", "professional", ...].includes(category)) {
  category = "all";  // ← Fallback to safe value
}
```

## Deployment Considerations

### Build Output

```bash
npm run build
       ↓
Vite bundles client/src/
       ↓
Output: dist/
       ↓
Static assets optimized
       ↓
Code splitting enabled
```

### Environment Variables

```env
# No new env vars required for Template Library
# Uses existing:
VITE_API_URL=http://localhost:5000
```

### CDN Integration

```typescript
// Image URLs from Cloudinary (already CDN)
previewImageUrl: "https://res.cloudinary.com/.../image.jpg"
                 ↑
                 Globally distributed CDN
```

## Future Architecture Improvements

### 1. Virtual Scrolling

```typescript
import { useVirtualizer } from "@tanstack/react-virtual";

// For 1000+ templates
const rowVirtualizer = useVirtualizer({
  count: filteredTemplates.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 400, // Card height
});
```

### 2. Server-Side Search

```typescript
// Move search to backend for better performance
const { data } = useQuery({
  queryKey: ["templates", "search", debouncedQuery],
  queryFn: () => fetch(`/api/templates/search?q=${debouncedQuery}`),
  enabled: debouncedQuery.length > 2,
});
```

### 3. Optimistic Updates

```typescript
// Instant UI feedback for user actions
const mutation = useMutation({
  mutationFn: toggleFavorite,
  onMutate: async (templateId) => {
    // Optimistically update UI
    queryClient.setQueryData(["templates"], (old) =>
      old.map(t => t.id === templateId ? { ...t, isFavorite: !t.isFavorite } : t)
    );
  },
});
```

---

## Conclusion

The Template Library architecture follows React best practices with clear separation of concerns:
- **Data fetching**: React Query
- **State management**: React hooks
- **Styling**: Tailwind CSS
- **Type safety**: TypeScript
- **Performance**: Caching + client-side filtering

The architecture is scalable, maintainable, and ready for future enhancements.

---

**Document Version:** 1.0
**Last Updated:** December 24, 2025
