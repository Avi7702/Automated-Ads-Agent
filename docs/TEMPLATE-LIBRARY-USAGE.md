# Template Library - Quick Start Guide

## Overview

The Template Library provides a browsable interface for discovering and selecting scene templates for ad generation. This guide shows you how to use and integrate the components.

## Accessing the Template Library

### Option 1: Standalone Page

Navigate to `/templates` in your browser:

```
http://localhost:5000/templates
```

Or click the "Templates" link in the main navigation header.

### Option 2: Component Integration

Import and use the `TemplateLibrary` component anywhere in your app:

```tsx
import { TemplateLibrary } from "@/components/TemplateLibrary";
import type { AdSceneTemplate } from "@shared/schema";

function MyComponent() {
  const [selectedTemplate, setSelectedTemplate] = useState<AdSceneTemplate | null>(null);

  const handleTemplateSelect = (template: AdSceneTemplate) => {
    setSelectedTemplate(template);
    console.log("Selected template:", template);
    // Do something with the template...
  };

  return (
    <TemplateLibrary
      onSelectTemplate={handleTemplateSelect}
      selectedTemplateId={selectedTemplate?.id}
    />
  );
}
```

## Component Props

### TemplateLibrary

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `onSelectTemplate` | `(template: AdSceneTemplate) => void` | No | Callback when a template is selected |
| `selectedTemplateId` | `string` | No | ID of currently selected template (for visual state) |
| `className` | `string` | No | Additional CSS classes |

### TemplateCard

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `template` | `AdSceneTemplate` | Yes | Template data to display |
| `onSelect` | `(template: AdSceneTemplate) => void` | No | Callback when card is clicked |
| `isSelected` | `boolean` | No | Whether this card is selected |

## Features

### 1. Search

Type in the search bar to filter templates by:
- Title
- Description
- Tags
- Category

Example: Search "cozy" to find all cozy/warm templates.

### 2. Category Filtering

Click category tabs to filter:
- **All Templates** - Show everything
- **Lifestyle** - Home, living, everyday scenes
- **Professional** - Office, business, corporate
- **Outdoor** - Nature, outdoor, exterior
- **Luxury** - High-end, premium, upscale
- **Seasonal** - Holiday, seasonal themes

### 3. Global Templates Filter

Toggle "Show Global Only" to filter templates that are:
- Created by admins
- Available to all users
- Pre-vetted and production-ready

### 4. Template Selection

Click any template card to select it. Selected templates show:
- Checkmark indicator in top-right
- Primary border color
- Slight scale animation

### 5. Hover Details

Hover over any template to see:
- Full description
- All tags
- Lighting style
- Environment type
- Global status

## Template Data Structure

```typescript
interface AdSceneTemplate {
  id: string;
  title: string;
  description: string | null;

  // Images
  previewImageUrl: string;
  previewPublicId: string;
  referenceImages: { url: string; publicId: string }[] | null;

  // Categorization
  category: string; // lifestyle, professional, outdoor, luxury, seasonal
  tags: string[] | null;

  // Platform/Aspect Ratio hints
  platformHints: string[] | null; // instagram, linkedin, facebook, twitter, tiktok
  aspectRatioHints: string[] | null; // 1:1, 9:16, 16:9, 4:5

  // Prompt Engineering
  promptBlueprint: string; // e.g., "{{product}} in a cozy living room..."
  placementHints: { position: string; scale: string } | null;
  lightingStyle: string | null; // natural, studio, dramatic, soft

  // Metadata
  intent: string | null; // showcase, installation, before-after, scale-demo
  environment: string | null; // indoor, outdoor, studio, worksite
  mood: string | null; // luxury, cozy, industrial, minimal, vibrant
  bestForProductTypes: string[] | null; // flooring, furniture, decor, etc.

  // Access
  isGlobal: boolean;
  createdBy: string | null;
  createdAt: string;
}
```

## Integration Examples

### Example 1: Use Template in Generation

```tsx
import { TemplateLibrary } from "@/components/TemplateLibrary";
import type { AdSceneTemplate } from "@shared/schema";

function GeneratePage() {
  const [template, setTemplate] = useState<AdSceneTemplate | null>(null);
  const [prompt, setPrompt] = useState("");

  const handleSelectTemplate = (template: AdSceneTemplate) => {
    setTemplate(template);

    // Auto-fill prompt with template blueprint
    const productName = "My Product";
    const filledPrompt = template.promptBlueprint.replace("{{product}}", productName);
    setPrompt(filledPrompt);
  };

  const handleGenerate = async () => {
    if (!template) return;

    const formData = new FormData();
    formData.append("prompt", prompt);

    // Add template metadata for backend processing
    formData.append("templateId", template.id);
    formData.append("lightingStyle", template.lightingStyle || "natural");

    // ... rest of generation logic
  };

  return (
    <div>
      <h2>Select a Template</h2>
      <TemplateLibrary onSelectTemplate={handleSelectTemplate} />

      {template && (
        <div>
          <h3>Prompt Preview</h3>
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          <button onClick={handleGenerate}>Generate</button>
        </div>
      )}
    </div>
  );
}
```

### Example 2: Template Recommendations

```tsx
import { TemplateLibrary } from "@/components/TemplateLibrary";
import { useQuery } from "@tanstack/react-query";

function ProductPage({ productId }: { productId: string }) {
  const { data: product } = useQuery({
    queryKey: ["product", productId],
    queryFn: () => fetch(`/api/products/${productId}`).then(r => r.json()),
  });

  const { data: templates } = useQuery({
    queryKey: ["templates", product?.category],
    queryFn: () =>
      fetch(`/api/templates?category=${product?.category}`).then(r => r.json()),
    enabled: !!product,
  });

  return (
    <div>
      <h2>Recommended Templates for {product?.name}</h2>
      <p>Based on category: {product?.category}</p>

      <TemplateLibrary onSelectTemplate={(t) => {
        // Navigate to generation with template + product
        window.location.href = `/generate?templateId=${t.id}&productId=${productId}`;
      }} />
    </div>
  );
}
```

### Example 3: Template Comparison

```tsx
function TemplateComparison() {
  const [selectedTemplates, setSelectedTemplates] = useState<AdSceneTemplate[]>([]);

  const handleToggleTemplate = (template: AdSceneTemplate) => {
    setSelectedTemplates(prev => {
      const exists = prev.some(t => t.id === template.id);
      if (exists) {
        return prev.filter(t => t.id !== template.id);
      } else {
        // Limit to 3 for comparison
        if (prev.length >= 3) return prev;
        return [...prev, template];
      }
    });
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        {selectedTemplates.map(t => (
          <div key={t.id} className="border p-4 rounded">
            <img src={t.previewImageUrl} alt={t.title} />
            <h4>{t.title}</h4>
            <p>{t.description}</p>
          </div>
        ))}
      </div>

      <TemplateLibrary
        onSelectTemplate={handleToggleTemplate}
      />
    </div>
  );
}
```

## Styling Customization

The components use Tailwind CSS and follow the existing design system. You can customize:

### Override Category Colors

Edit `TemplateCard.tsx`:

```tsx
const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    lifestyle: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    // Add your custom categories here
    mycategory: "bg-red-500/20 text-red-300 border-red-500/30",
  };
  return colors[category] || "bg-gray-500/20 text-gray-300 border-gray-500/30";
};
```

### Add Custom Filters

Edit `TemplateLibrary.tsx`:

```tsx
// Add new filter state
const [lightingFilter, setLightingFilter] = useState<string>("all");

// Add to filteredTemplates logic
const filteredTemplates = templates.filter((template) => {
  if (lightingFilter !== "all" && template.lightingStyle !== lightingFilter) {
    return false;
  }
  // ... existing filters
  return true;
});

// Add filter UI
<select value={lightingFilter} onChange={(e) => setLightingFilter(e.target.value)}>
  <option value="all">All Lighting</option>
  <option value="natural">Natural</option>
  <option value="studio">Studio</option>
  <option value="dramatic">Dramatic</option>
</select>
```

## Testing

### Manual Testing

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to http://localhost:5000/templates

3. Test features:
   - [ ] Search for "cozy"
   - [ ] Filter by "Lifestyle" category
   - [ ] Toggle "Global Templates Only"
   - [ ] Click a template to select it
   - [ ] Hover over templates to see details
   - [ ] Click "Refresh" button
   - [ ] Clear all filters

### Automated Testing

Use the `data-testid` attributes for E2E testing:

```typescript
// Example with Playwright
await page.goto('/templates');
await page.getByTestId('input-search-templates').fill('cozy');
await page.getByTestId('button-category-lifestyle').click();
await page.getByTestId('template-card-abc123').click();
```

## Troubleshooting

### Templates Not Loading

**Issue**: Empty state shows "No templates found"

**Solutions**:
1. Check API endpoint: `GET /api/templates`
2. Verify database has templates in `ad_scene_templates` table
3. Check browser console for errors
4. Verify authentication (templates endpoint requires auth)

### Images Not Displaying

**Issue**: Broken image icons

**Solutions**:
1. Verify Cloudinary URLs are valid
2. Check CORS settings for image domain
3. Inspect network tab for 404s on images

### Search Not Working

**Issue**: Search doesn't filter templates

**Solutions**:
1. Check that `searchQuery` state updates on input
2. Verify filter logic in `filteredTemplates`
3. Ensure template data has searchable fields (title, description, tags)

### Categories Not Showing

**Issue**: Category tabs missing or not filtering

**Solutions**:
1. Verify templates have `category` field populated
2. Check API response includes `category`
3. Ensure category filter logic matches template categories exactly

## Performance Tips

### Large Template Libraries (100+ templates)

1. **Implement Pagination**:
   ```tsx
   const [page, setPage] = useState(1);
   const templatesPerPage = 20;
   const paginatedTemplates = filteredTemplates.slice(
     (page - 1) * templatesPerPage,
     page * templatesPerPage
   );
   ```

2. **Virtual Scrolling**:
   Use `react-window` or `react-virtual` for very large lists

3. **Server-Side Search**:
   Switch to `GET /api/templates/search?q=<query>` for complex searches

4. **Image Optimization**:
   Use Cloudinary transformations for thumbnail sizes:
   ```tsx
   const thumbnailUrl = template.previewImageUrl.replace(
     '/upload/',
     '/upload/w_400,h_500,c_fill/'
   );
   ```

## Next Steps

1. **Integrate with Generation Flow**: Use selected template in product generation
2. **Add Template Analytics**: Track which templates are most popular
3. **Create Template Admin Panel**: Allow admins to create/edit templates
4. **Implement Favorites**: Let users save favorite templates
5. **Add Template Recommendations**: AI-powered suggestions based on products

---

**Need Help?** Check the main documentation in `docs/PHASE-5-TEMPLATE-LIBRARY-UI.md`
