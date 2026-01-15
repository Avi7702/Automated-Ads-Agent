# Theme Fix Patterns - Quick Reference

This document shows specific "before/after" patterns for fixing hardcoded colors.

---

## Pattern 1: Text Colors

### ❌ WRONG - Hardcoded Colors
```tsx
// Always white text - invisible in light mode
<p className="text-white">Description</p>
<span className="text-white/70">Subtitle</span>
<h3 className="text-gray-900">Title</h3>

// White icon
<Loader2 className="w-6 h-6 text-white animate-spin" />
```

### ✅ CORRECT - Semantic Tokens
```tsx
// Adapts to theme
<p className="text-foreground">Description</p>
<span className="text-muted-foreground">Subtitle</span>
<h3 className="text-foreground">Title</h3>

// Icon adapts
<Loader2 className="w-6 h-6 text-foreground animate-spin" />
```

---

## Pattern 2: Backgrounds

### ❌ WRONG - Hardcoded Backgrounds
```tsx
// Always black - breaks light mode
<div className="bg-black">Result</div>
<div className="bg-gray-50">Page</div>
<div className="bg-white rounded-lg">Card</div>

// Black overlays
<div className="absolute inset-0 bg-black/60">
  <span className="text-white">Hover text</span>
</div>
```

### ✅ CORRECT - Semantic Backgrounds
```tsx
// Adapts to theme
<div className="bg-card">Result</div>
<div className="bg-background">Page</div>
<div className="bg-card rounded-lg">Card</div>

// Semantic overlays
<div className="absolute inset-0 bg-background/90 backdrop-blur-sm">
  <span className="text-foreground">Hover text</span>
</div>
```

---

## Pattern 3: Borders

### ❌ WRONG - Hardcoded Borders
```tsx
// White/black borders
<input className="border border-white/30" />
<div className="border border-gray-200" />
```

### ✅ CORRECT - Semantic Borders
```tsx
// Theme-aware borders
<input className="border border-border" />
<div className="border border-border" />

// Or for more subtle:
<input className="border border-foreground/20" />
```

---

## Pattern 4: Modal/Dialog Overlays

### ❌ WRONG - Black Backdrop
```tsx
// Always black - too dark in light mode context
<div className="fixed inset-0 z-50 bg-black/80">
  <div className="bg-white rounded-lg">
    Dialog content
  </div>
</div>
```

### ✅ CORRECT - Semantic Backdrop
```tsx
// Adapts to theme - lighter in light mode
<div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
  <div className="bg-card rounded-lg">
    Dialog content
  </div>
</div>
```

---

## Pattern 5: Status Badges (Semantic Colors)

### ✅ ACCEPTABLE - Semantic Status Colors
```tsx
// These are okay for status (green=good, red=bad, yellow=warning)
// But should have dark variants for text readability
const statusConfig = {
  healthy: {
    className: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30"
  },
  warning: {
    className: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30"
  },
  error: {
    className: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30"
  }
};
```

**Key Points:**
- Background can stay colored (semantic meaning)
- Text MUST have dark variants (`dark:text-green-400`)
- Border opacity should allow theme background to show through

---

## Pattern 6: Category Badges (Decorative Colors)

### ❌ WRONG - No Dark Variants
```tsx
const categoryColors = {
  product: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  testimonial: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
};
```

### ✅ CORRECT - With Dark Variants
```tsx
const categoryColors = {
  product: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30",
  testimonial: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
};
```

### ✅ BETTER - Use Theme Tokens
```tsx
const categoryColors = {
  product: "bg-primary/10 text-primary border-primary/30",
  testimonial: "bg-secondary/10 text-secondary-foreground border-secondary/30",
};
```

---

## Pattern 7: Hover States

### ❌ WRONG - Hardcoded Hover
```tsx
<button className="text-white hover:text-purple-300">
  Edit
</button>

<div className="hover:bg-[#00000014]">
  Item
</div>
```

### ✅ CORRECT - Semantic Hover
```tsx
<button className="text-foreground hover:text-primary">
  Edit
</button>

<div className="hover:bg-muted">
  Item
</div>
```

---

## Pattern 8: Icon Colors

### ❌ WRONG - Hardcoded Icon Colors
```tsx
<Eye className="w-4 h-4 text-blue-500" />
<Database className="w-4 h-4 text-purple-500" />
<Globe className="w-4 h-4 text-green-500" />
```

### ✅ CORRECT - For Decorative Icons
```tsx
// If color is meaningful (e.g., source type indicators), keep but add dark variants
<Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
<Database className="w-4 h-4 text-purple-600 dark:text-purple-400" />
<Globe className="w-4 h-4 text-green-600 dark:text-green-400" />
```

### ✅ BETTER - For UI Icons
```tsx
// If color is not semantically meaningful, use theme
<Eye className="w-4 h-4 text-muted-foreground" />
<Database className="w-4 h-4 text-muted-foreground" />
<Globe className="w-4 h-4 text-muted-foreground" />
```

---

## Pattern 9: Gradient Accents

### ❌ WRONG - Hardcoded Gradient
```tsx
<div className="bg-gradient-to-br from-purple-500 to-pink-500">
  Logo
</div>
```

### ✅ ACCEPTABLE - Brand Gradient
```tsx
// Okay if it's part of brand identity
// But consider making it more subtle in light mode
<div className="bg-gradient-to-br from-purple-500 to-pink-500 dark:from-purple-400 dark:to-pink-400">
  Logo
</div>
```

### ✅ BETTER - Theme-Aware Gradient
```tsx
<div className="bg-gradient-to-br from-primary to-secondary">
  Logo
</div>
```

---

## Pattern 10: Ambient Blur Backgrounds

### ❌ WRONG - Hardcoded Color
```tsx
<div className="fixed inset-0 pointer-events-none">
  <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-500/5 blur-[120px]" />
  <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-500/5 blur-[120px]" />
</div>
```

### ✅ CORRECT - Theme Colors
```tsx
<div className="fixed inset-0 pointer-events-none">
  <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/5 blur-[120px]" />
  <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-primary/3 blur-[120px]" />
</div>
```

---

## Complete Component Example

### ❌ WRONG - Hardcoded Upload Card
```tsx
<div className="relative group">
  <img src={upload.url} className="w-full h-full object-cover" />

  {/* Hover overlay - BROKEN */}
  <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100">
    <p className="text-white text-xs">{upload.description}</p>
    <button className="text-purple-300 hover:text-white">
      <Pencil className="w-3 h-3" />
      Edit
    </button>
  </div>

  {/* Edit mode - BROKEN */}
  {isEditing && (
    <div className="absolute inset-0 bg-black/80">
      <textarea
        className="text-white bg-white/10 border border-white/30"
        value={value}
      />
      <button className="bg-primary text-white">Save</button>
      <button className="bg-white/20 text-white">Cancel</button>
    </div>
  )}
</div>
```

### ✅ CORRECT - Theme-Aware Upload Card
```tsx
<div className="relative group">
  <img src={upload.url} className="w-full h-full object-cover" />

  {/* Hover overlay - WORKS */}
  <div className="absolute inset-0 bg-background/90 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
    <p className="text-foreground text-xs">{upload.description}</p>
    <button className="text-muted-foreground hover:text-primary transition-colors">
      <Pencil className="w-3 h-3" />
      Edit
    </button>
  </div>

  {/* Edit mode - WORKS */}
  {isEditing && (
    <div className="absolute inset-0 bg-background/95 backdrop-blur">
      <textarea
        className="text-foreground bg-muted border border-border focus:border-primary"
        value={value}
      />
      <button className="bg-primary text-primary-foreground">Save</button>
      <button className="bg-secondary text-secondary-foreground">Cancel</button>
    </div>
  )}
</div>
```

---

## Available Theme Tokens (from index.css)

### Text Colors
- `text-foreground` - Primary text color
- `text-muted-foreground` - Secondary/subdued text
- `text-primary` - Brand primary (links, highlights)
- `text-secondary-foreground` - Secondary text on secondary backgrounds
- `text-destructive` - Error/danger text
- `text-card-foreground` - Text on card backgrounds

### Background Colors
- `bg-background` - Main page background
- `bg-card` - Card/panel backgrounds
- `bg-muted` - Subtle backgrounds (hover states)
- `bg-primary` - Primary brand color
- `bg-secondary` - Secondary brand color
- `bg-accent` - Accent highlights
- `bg-destructive` - Error/danger backgrounds
- `bg-popover` - Dropdown/tooltip backgrounds

### Border Colors
- `border-border` - Default borders
- `border-input` - Input field borders
- `border-primary` - Primary brand borders
- `border-destructive` - Error borders

### Special Colors
- `ring-ring` - Focus ring color
- `bg-sidebar` - Sidebar background
- `text-sidebar-foreground` - Sidebar text

---

## Dark Variant Syntax

For colors that MUST be different in dark mode:

```tsx
// Text gets lighter in dark mode
<span className="text-blue-700 dark:text-blue-400">Category</span>

// Background gets darker in dark mode
<div className="bg-blue-50 dark:bg-blue-950">Panel</div>

// Multiple properties
<div className="bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100">
  Badge
</div>
```

**Rule of thumb:**
- Light mode: Use 600-900 for text, 50-200 for backgrounds
- Dark mode: Use 300-500 for text, 800-950 for backgrounds

---

## Testing Checklist

After making changes, test:

1. **Theme Toggle**
   - [ ] Click theme toggle in header
   - [ ] Verify all text is readable
   - [ ] Verify all backgrounds have proper contrast
   - [ ] Check hover states in both modes

2. **Page-by-Page**
   - [ ] Studio (Home) - upload zone, result preview
   - [ ] Gallery - image cards
   - [ ] Templates - template cards
   - [ ] Learn from Winners - pattern cards
   - [ ] Product Library - product cards
   - [ ] Settings pages
   - [ ] 404 page

3. **Components**
   - [ ] Upload overlays (hover, edit mode)
   - [ ] Modal/dialog backdrops
   - [ ] Badges (status, category)
   - [ ] Buttons (all variants)
   - [ ] Cards (all types)

4. **Interactions**
   - [ ] Hover states
   - [ ] Focus states
   - [ ] Active/pressed states
   - [ ] Loading states
   - [ ] Error states

---

## Find & Replace Guide

Use these regex patterns in your IDE:

### 1. Find Hardcoded White Text
```regex
text-white(?!\/)
```
Replace with: `text-foreground`

### 2. Find Black Backgrounds
```regex
bg-black(?!\/)
```
Replace with: `bg-card` or `bg-background`

### 3. Find White Backgrounds
```regex
bg-white(?!\/)
```
Replace with: `bg-card` or `bg-background`

### 4. Find Gray Text
```regex
text-gray-\d+
```
Review each case:
- Primary text → `text-foreground`
- Secondary text → `text-muted-foreground`

### 5. Find Gray Backgrounds
```regex
bg-gray-\d+
```
Review each case:
- Page background → `bg-background`
- Card background → `bg-card`
- Subtle hover → `bg-muted`

---

## When to Keep Hardcoded Colors

**DO keep hardcoded colors when:**

1. **Brand Identity**
   - LinkedIn blue (`#0A66C2`) in LinkedIn preview
   - Company logo gradients
   - Marketing hero sections

2. **Semantic Status Colors** (with dark variants)
   - Green for success/healthy
   - Red for error/critical
   - Yellow for warning
   - Blue for info

3. **Chart/Data Visualization**
   - Graph colors that need consistency
   - But consider: provide light/dark palettes

4. **External Content**
   - User-uploaded images
   - Third-party embeds

**DO NOT keep hardcoded colors for:**
- UI text (paragraphs, labels, headings)
- Backgrounds (cards, pages, modals)
- Borders (inputs, cards, dividers)
- Icons (unless semantically meaningful)
- Hover states
- Focus indicators

---

**Generated by:** Claude Code
**Date:** 2026-01-14
**Purpose:** Quick reference for fixing theme issues
