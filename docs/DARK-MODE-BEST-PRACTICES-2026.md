# Light/Dark Mode Implementation - Best Practices 2026

## Executive Summary

This document outlines production-ready best practices for implementing light/dark mode in modern web applications based on 2026 standards. It covers CSS approaches, accessibility requirements, component patterns, mobile considerations, and common pitfalls.

**Key Takeaways:**
- Use CSS custom properties (CSS variables) with HSL color values
- Implement the `color-scheme` CSS property for browser UI integration
- Support system preferences via `prefers-color-scheme` with manual override
- Maintain WCAG 2.1 contrast ratios (4.5:1 for text, 3:1 for UI components)
- Prevent FOUC (Flash of Unstyled Content) with inline scripts
- Use semantic color tokens, not literal color names

---

## 1. Modern CSS Approaches (2025-2026)

### 1.1 CSS Custom Properties with HSL

**Why HSL over RGB/Hex?**
- Easier to adjust lightness for dark mode
- Better semantic separation of hue, saturation, and lightness
- Enables programmatic color manipulation

```css
/* ✅ CORRECT: HSL-based semantic tokens */
:root {
  --background: 0 0% 100%;           /* white */
  --foreground: 240 10% 3.9%;        /* near-black */
  --primary: 252 100% 60%;           /* violet */
  --muted: 240 4.8% 95.9%;           /* light gray */
  --border: 240 5.9% 90%;            /* border gray */
}

.dark {
  --background: 240 10% 3.9%;        /* near-black */
  --foreground: 0 0% 98%;            /* near-white */
  --primary: 252 100% 78%;           /* lighter violet */
  --muted: 240 3.7% 15.9%;           /* dark gray */
  --border: 240 3.7% 15.9%;          /* darker border */
}

/* Usage: Convert HSL to actual color */
body {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
}
```

**Antipattern (DO NOT USE):**
```css
/* ❌ WRONG: Hardcoded colors */
.button {
  background: #3b82f6;  /* Not theme-aware */
  color: white;
}
```

---

### 1.2 The `color-scheme` CSS Property

**Critical for browser integration** - tells the browser which color schemes your site supports.

```css
/* Declare support for both light and dark */
:root {
  color-scheme: light dark;
}
```

**What it does:**
- Adjusts browser UI (scrollbars, form controls, spellcheck underlines)
- Sets default canvas color
- Enables native dark mode for `<input>`, `<select>`, `<textarea>`
- Required for proper `light-dark()` function support

**HTML Meta Tag (Recommended):**
Place in `<head>` BEFORE stylesheets to prevent flash:
```html
<meta name="color-scheme" content="light dark">
```

---

### 1.3 The `prefers-color-scheme` Media Query

Detects user's OS/browser theme preference:

```css
/* Default to light mode */
:root {
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
}

/* Override for dark mode preference */
@media (prefers-color-scheme: dark) {
  :root {
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;
  }
}
```

**Browser Support:** Baseline since January 2020 (widely available)

---

### 1.4 The `light-dark()` CSS Function (2026)

Modern shorthand for theme-aware colors:

```css
:root {
  color-scheme: light dark;
}

.element {
  /* Syntax: light-dark(light-value, dark-value) */
  color: light-dark(#000, #fff);
  background: light-dark(#fff, #1a1a1a);
}
```

**Browser Support:** Baseline since January 2024

**When to use:**
- Simple two-value color swaps
- Inline styles that need theme awareness

**When NOT to use:**
- Complex design systems (use CSS variables instead)
- Need for intermediate theme values

---

## 2. Modern Framework Approaches

### 2.1 React + Tailwind CSS (Recommended Pattern)

**Installation:**
```bash
npm install next-themes
```

**Setup in App Root:**
```tsx
import { ThemeProvider } from "next-themes";

function App() {
  return (
    <ThemeProvider
      attribute="class"        // Uses .dark class on <html>
      defaultTheme="system"    // Respects OS preference by default
      enableSystem             // Allows system theme detection
    >
      {/* Your app */}
    </ThemeProvider>
  );
}
```

**Tailwind Config (Tailwind v4):**
```css
/* app.css */
@import "tailwindcss";

/* Class-based dark mode selector */
@custom-variant dark (&:is(.dark *));
```

**Component Usage:**
```tsx
export function Card() {
  return (
    <div className="bg-white dark:bg-gray-900 text-black dark:text-white">
      <h2 className="text-gray-900 dark:text-gray-100">
        Responsive to theme
      </h2>
    </div>
  );
}
```

---

### 2.2 Theme Toggle Component (Production-Ready)

```tsx
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="mr-2 h-4 w-4" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="mr-2 h-4 w-4" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <span className="mr-2">💻</span>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

**Key Features:**
- Three-way toggle (light/dark/system)
- Animated icon transitions
- Accessible (screen reader support)
- LocalStorage persistence via `next-themes`

---

### 2.3 Preventing FOUC (Flash of Unstyled Content)

**The Problem:** Page loads with wrong theme briefly before JavaScript executes.

**Solution:** Inline script in `<head>` (runs before render):

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="color-scheme" content="light dark">

  <!-- CRITICAL: Run BEFORE CSS loads -->
  <script>
    (function() {
      const theme = localStorage.getItem('theme');
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

      if (theme === 'dark' || (!theme && systemPrefersDark)) {
        document.documentElement.classList.add('dark');
      }
    })();
  </script>

  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <!-- App content -->
</body>
</html>
```

**`next-themes` handles this automatically** - no manual script needed.

---

## 3. Accessibility Standards (WCAG 2.1)

### 3.1 Contrast Ratios

| Element Type | WCAG AA | WCAG AAA | Use Case |
|--------------|---------|----------|----------|
| **Normal text** (16px+) | 4.5:1 | 7:1 | Body copy, labels |
| **Large text** (24px+ or 19px+ bold) | 3:1 | 4.5:1 | Headings, hero text |
| **UI components** | 3:1 | - | Buttons, form borders, icons |
| **Decorative** | - | - | Not actionable/informative |

**Testing Tools:**
- Chrome DevTools (Inspect → Contrast)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Contrast Ratio Calculator](https://contrast-ratio.com/)

---

### 3.2 Text Readability Requirements

**Light Mode Best Practices:**
```css
:root {
  --text-primary: 240 10% 3.9%;      /* Near-black (not pure black) */
  --text-secondary: 240 3.8% 46.1%;  /* Medium gray */
  --text-muted: 240 3.8% 64.9%;      /* Light gray (annotations) */
  --bg-primary: 0 0% 100%;           /* White */
}
```

**Dark Mode Best Practices:**
```css
.dark {
  --text-primary: 0 0% 98%;          /* Near-white (not pure white) */
  --text-secondary: 240 5% 64.9%;    /* Medium gray */
  --text-muted: 240 5% 46.1%;        /* Darker gray (annotations) */
  --bg-primary: 240 10% 3.9%;        /* Near-black (not pure black) */
}
```

**Why not pure black/white?**
- Pure white on pure black = eye strain (contrast too high)
- Near-white (98%) on near-black (4%) = more comfortable reading
- Reduces "halo effect" around text

---

### 3.3 Focus States and Interactive Elements

**Requirements:**
- Focus indicators must have 3:1 contrast against background
- Must be visible in both light and dark modes
- Should be distinct from hover states

```css
/* ✅ CORRECT: Accessible focus states */
button {
  outline: 2px solid transparent;
  outline-offset: 2px;
  transition: outline-color 200ms;
}

button:focus-visible {
  outline-color: hsl(var(--ring));  /* High contrast color */
}

/* Light mode ring color */
:root {
  --ring: 252 100% 60%;  /* Violet */
}

/* Dark mode ring color (lighter for contrast) */
.dark {
  --ring: 252 100% 78%;  /* Lighter violet */
}
```

**Antipattern:**
```css
/* ❌ WRONG: Removes focus indicator */
button:focus {
  outline: none;  /* NEVER DO THIS */
}
```

---

### 3.4 Color Blindness Considerations

**Don't rely on color alone:**
```tsx
/* ❌ WRONG: Color-only differentiation */
<div className="bg-green-500">Success</div>
<div className="bg-red-500">Error</div>

/* ✅ CORRECT: Icon + color + text */
<div className="bg-green-500">
  <CheckCircle className="mr-2" />
  <span>Success: Upload complete</span>
</div>
<div className="bg-red-500">
  <XCircle className="mr-2" />
  <span>Error: Upload failed</span>
</div>
```

**Use multiple indicators:**
- Icons
- Text labels
- Patterns/textures
- Position/layout

---

## 4. Component Design Patterns

### 4.1 Semantic Color System

**Design Token Hierarchy:**
```
Background Colors:
├── background (canvas)
├── card (elevated surfaces)
└── popover (floating UI)

Text Colors:
├── foreground (primary text)
├── muted-foreground (secondary text)
└── accent-foreground (highlighted text)

Interactive Colors:
├── primary (main actions)
├── secondary (secondary actions)
├── destructive (dangerous actions)
└── accent (highlights)

Borders & Inputs:
├── border (dividers, outlines)
├── input (form field borders)
└── ring (focus indicators)
```

**Naming Convention:**
- Use semantic names (`primary`, `destructive`) not literal (`blue`, `red`)
- Separate foreground and background (`primary`, `primary-foreground`)
- Maintain consistent relationships across themes

---

### 4.2 Borders and Shadows in Dark Mode

**Light Mode:**
```css
:root {
  --border: 240 5.9% 90%;  /* Visible border */
  --shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.card {
  border: 1px solid hsl(var(--border));
  box-shadow: var(--shadow);
}
```

**Dark Mode:**
```css
.dark {
  --border: 240 3.7% 15.9%;  /* Subtle border */
  --shadow: 0 1px 3px rgba(0, 0, 0, 0.5);  /* Stronger shadow */
}

/* Alternative: Remove borders in dark mode, use background difference */
.dark .card {
  border: none;
  background: hsl(var(--card));  /* Slightly lighter than background */
}
```

**Best Practice:**
- Light mode: Use borders for separation
- Dark mode: Use elevation (background lightness) for separation

---

### 4.3 Interactive States (Hover, Active, Disabled, Focus)

```css
/* Base button */
.button {
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  transition: all 150ms ease;
}

/* Hover state */
.button:hover {
  /* Darken in light mode, lighten in dark mode */
  filter: brightness(0.95);
}

.dark .button:hover {
  filter: brightness(1.1);
}

/* Active state */
.button:active {
  transform: scale(0.98);
}

/* Disabled state */
.button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Focus state (keyboard navigation) */
.button:focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
}
```

**Key Principles:**
- Hover: Subtle brightness change (5-10%)
- Active: Visual feedback (scale, shadow)
- Disabled: Reduced opacity (50%) + cursor change
- Focus: High-contrast outline for keyboard users

---

### 4.4 Form Elements in Both Modes

```css
/* Input fields */
input, textarea, select {
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  border: 1px solid hsl(var(--input));
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
}

input:focus {
  outline: none;
  border-color: hsl(var(--ring));
  box-shadow: 0 0 0 3px hsla(var(--ring) / 0.1);
}

/* Placeholder text */
input::placeholder {
  color: hsl(var(--muted-foreground));
  opacity: 0.6;
}

/* Auto-fill styling (browser default is jarring in dark mode) */
input:-webkit-autofill {
  -webkit-box-shadow: 0 0 0 1000px hsl(var(--background)) inset;
  -webkit-text-fill-color: hsl(var(--foreground));
}
```

**Checkbox/Radio Customization:**
```css
/* Use accent-color for native controls */
input[type="checkbox"],
input[type="radio"] {
  accent-color: hsl(var(--primary));
}
```

---

### 4.5 Icons and Images

**SVG Icons (Recommended):**
```tsx
/* ✅ CORRECT: Theme-aware SVG */
<svg className="text-foreground" width="24" height="24">
  <path fill="currentColor" d="..." />
</svg>
```

**Image Handling:**
```css
/* Reduce image brightness in dark mode (subtle) */
.dark img {
  filter: brightness(0.9);
}

/* For logos/brand images, keep original */
.dark .brand-logo {
  filter: none;
}
```

**Dark Mode Specific Images:**
```tsx
<picture>
  <source srcset="/logo-dark.svg" media="(prefers-color-scheme: dark)" />
  <img src="/logo-light.svg" alt="Logo" />
</picture>
```

---

### 4.6 Chart/Data Visualization Color Palettes

**Accessible Color Palettes (7:1 contrast safe):**
```css
/* Light mode palette */
:root {
  --chart-1: 220 70% 50%;  /* Blue */
  --chart-2: 160 60% 45%;  /* Green */
  --chart-3: 30 80% 55%;   /* Orange */
  --chart-4: 280 65% 60%;  /* Purple */
  --chart-5: 340 75% 55%;  /* Red */
}

/* Dark mode palette (lighter variants) */
.dark {
  --chart-1: 220 70% 70%;  /* Lighter blue */
  --chart-2: 160 60% 65%;  /* Lighter green */
  --chart-3: 30 80% 70%;   /* Lighter orange */
  --chart-4: 280 65% 75%;  /* Lighter purple */
  --chart-5: 340 75% 70%;  /* Lighter red */
}
```

**Best Practices:**
- Use distinct hues (not just lightness variations)
- Test with colorblind simulators
- Add patterns/textures for additional differentiation
- Provide data tables as alternative

---

## 5. Mobile and Responsive Considerations

### 5.1 Touch Target Sizes

**Minimum touch target: 44x44px (iOS) / 48x48px (Android)**

```css
/* ✅ CORRECT: Adequate touch targets */
button {
  min-height: 44px;
  min-width: 44px;
  padding: 0.75rem 1rem;
}

/* Increase on mobile */
@media (max-width: 768px) {
  button {
    min-height: 48px;
    padding: 1rem 1.5rem;
  }
}
```

**Spacing between interactive elements:**
```css
/* Minimum 8px gap between touch targets */
.button-group button + button {
  margin-left: 0.5rem;
}
```

---

### 5.2 Mobile-Specific Dark Mode Patterns

**Bottom navigation bars (common on mobile):**
```css
.mobile-nav {
  background: hsl(var(--card));
  border-top: 1px solid hsl(var(--border));
  /* Safe area for notched phones */
  padding-bottom: env(safe-area-inset-bottom);
}
```

**Pull-to-refresh indicators:**
```css
.refresh-indicator {
  color: hsl(var(--primary));
}
```

---

### 5.3 OLED Battery Optimization

**Pure black backgrounds save battery on OLED screens:**
```css
/* Option 1: Pure black for OLED (aggressive) */
@media (prefers-color-scheme: dark) {
  :root {
    --background: 0 0% 0%;  /* Pure black */
  }
}

/* Option 2: Near-black (better for readability) */
.dark {
  --background: 240 10% 3.9%;  /* Near-black (recommended) */
}
```

**Trade-offs:**
- Pure black (0% lightness): Maximum battery savings, but higher contrast strain
- Near-black (4% lightness): Slight battery savings, better UX
- **Recommendation:** Use near-black (3.9%) for better readability

---

## 6. Common Pitfalls to Avoid

### 6.1 Hardcoded Colors

```css
/* ❌ WRONG: Not theme-aware */
.card {
  background: #ffffff;
  color: #000000;
  border: 1px solid #e5e7eb;
}

/* ✅ CORRECT: Uses semantic tokens */
.card {
  background: hsl(var(--card));
  color: hsl(var(--card-foreground));
  border: 1px solid hsl(var(--border));
}
```

---

### 6.2 Insufficient Contrast

**Testing Process:**
1. Check all text against its background (4.5:1 for body, 3:1 for large)
2. Test UI components (buttons, icons) at 3:1
3. Verify focus indicators at 3:1 against background
4. Test with Chrome DevTools contrast checker

```bash
# Automated accessibility testing
npm install -D @axe-core/playwright
```

---

### 6.3 Missing State Variations

**Incomplete theme coverage:**
```css
/* ❌ WRONG: Only base state */
.button {
  background: hsl(var(--primary));
}

/* ✅ CORRECT: All states covered */
.button {
  background: hsl(var(--primary));
}

.button:hover {
  filter: brightness(1.1);
}

.button:active {
  transform: scale(0.98);
}

.button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.button:focus-visible {
  outline: 2px solid hsl(var(--ring));
}
```

---

### 6.4 Inconsistent Component Behavior

**Problem:** Some components theme-aware, others not
```tsx
/* ❌ WRONG: Inconsistent theming */
<Card className="bg-white text-black">  {/* Hardcoded */}
  <Button className="bg-primary">OK</Button>  {/* Theme-aware */}
</Card>

/* ✅ CORRECT: Consistent theming */
<Card className="bg-card text-card-foreground">
  <Button className="bg-primary text-primary-foreground">OK</Button>
</Card>
```

---

### 6.5 Not Testing Edge Cases

**Critical test cases:**
- [ ] Page loads with system dark mode enabled
- [ ] Page loads with system light mode enabled
- [ ] User manually toggles theme
- [ ] Page refresh preserves user's manual choice
- [ ] LocalStorage cleared (fallback to system)
- [ ] User changes OS theme while page is open
- [ ] Autofill form fields (check styling)
- [ ] Print preview (ensure readable)
- [ ] Screenshots (ensure proper appearance)

---

## 7. Implementation Checklist

### Phase 1: Foundation
- [ ] Add `color-scheme: light dark` to `:root`
- [ ] Add `<meta name="color-scheme" content="light dark">` to HTML
- [ ] Define all color tokens in HSL format
- [ ] Create `.dark` class with dark mode tokens
- [ ] Test contrast ratios (4.5:1 text, 3:1 UI)

### Phase 2: Framework Integration
- [ ] Install `next-themes` (React) or equivalent
- [ ] Wrap app in `<ThemeProvider>`
- [ ] Create `ThemeToggle` component (light/dark/system)
- [ ] Add FOUC prevention (inline script or framework-handled)
- [ ] Implement LocalStorage persistence

### Phase 3: Component Styling
- [ ] Audit all components for hardcoded colors
- [ ] Replace with semantic color tokens
- [ ] Define all interactive states (hover, active, disabled, focus)
- [ ] Test form elements (inputs, selects, checkboxes)
- [ ] Update icons to use `currentColor`

### Phase 4: Accessibility Audit
- [ ] Run automated contrast checks
- [ ] Test keyboard navigation (focus indicators)
- [ ] Test with screen readers
- [ ] Verify colorblind-safe design (not color-only)
- [ ] Check touch target sizes (44px+ mobile)

### Phase 5: Polish
- [ ] Add smooth transitions between themes
- [ ] Optimize for OLED screens (near-black backgrounds)
- [ ] Test on real devices (iOS, Android)
- [ ] Add print stylesheet
- [ ] Document theme system for team

---

## 8. Real-World Example (This Codebase)

Our implementation uses **Tailwind v4** + **next-themes** + **shadcn/ui** pattern:

### `client/src/App.tsx`
```tsx
import { ThemeProvider } from "next-themes";

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      {/* App content */}
    </ThemeProvider>
  );
}
```

### `client/src/index.css`
```css
@import "tailwindcss";

/* Class-based dark mode selector */
@custom-variant dark (&:is(.dark *));

/* Light mode tokens */
:root {
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
  --primary: 252 100% 60%;
  /* ... */
}

/* Dark mode tokens */
.dark {
  --background: 240 10% 3.9%;
  --foreground: 0 0% 98%;
  --primary: 252 100% 78%;
  /* ... */
}
```

### `client/src/components/ThemeToggle.tsx`
```tsx
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { setTheme } = useTheme();
  return (
    <DropdownMenu>
      <DropdownMenuItem onClick={() => setTheme("light")}>Light</DropdownMenuItem>
      <DropdownMenuItem onClick={() => setTheme("dark")}>Dark</DropdownMenuItem>
      <DropdownMenuItem onClick={() => setTheme("system")}>System</DropdownMenuItem>
    </DropdownMenu>
  );
}
```

**Usage in components:**
```tsx
<div className="bg-card text-card-foreground border border-border rounded-lg">
  <h3 className="text-foreground">Theme-aware card</h3>
  <p className="text-muted-foreground">Secondary text</p>
</div>
```

---

## 9. Resources and Tools

### Contrast Checkers
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Contrast Ratio (Lea Verou)](https://contrast-ratio.com/)
- Chrome DevTools (Inspect element → Contrast)

### Color Palette Generators
- [Realtime Colors](https://realtimecolors.com/) - Preview palettes instantly
- [Coolors](https://coolors.co/) - Generate accessible palettes
- [Adobe Color](https://color.adobe.com/create/color-accessibility) - Accessibility checker

### Testing Tools
- [Axe DevTools](https://www.deque.com/axe/devtools/) - Browser extension
- [Lighthouse](https://developers.google.com/web/tools/lighthouse) - Automated audits
- [WAVE](https://wave.webaim.org/) - Accessibility evaluator

### Documentation
- [MDN: prefers-color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme)
- [MDN: color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/color-scheme)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [next-themes GitHub](https://github.com/pacocoursey/next-themes)

---

## 10. Summary - Quick Reference

| Aspect | Light Mode | Dark Mode |
|--------|------------|-----------|
| **Background** | Near-white (100%) | Near-black (3.9%) |
| **Text** | Near-black (3.9%) | Near-white (98%) |
| **Borders** | Visible (90% lightness) | Subtle (15.9% lightness) |
| **Shadows** | Subtle (10% opacity) | Stronger (50% opacity) |
| **Hover brightness** | Darken (95%) | Lighten (110%) |
| **Text contrast** | 4.5:1 minimum | 4.5:1 minimum |
| **UI contrast** | 3:1 minimum | 3:1 minimum |
| **Focus ring** | Dark ring on light | Light ring on dark |

**Modern CSS Stack:**
- `color-scheme: light dark` (browser integration)
- `@media (prefers-color-scheme: dark)` (system preference)
- CSS custom properties with HSL (semantic tokens)
- `next-themes` (React state management)
- Tailwind `dark:` variant (utility classes)

**Accessibility Must-Haves:**
- 4.5:1 contrast for text
- 3:1 contrast for UI components
- Visible focus indicators
- Not color-only indicators
- 44px+ touch targets (mobile)

**Common Mistakes to Avoid:**
- Hardcoded colors (use tokens)
- Pure black/white (use near-black/white)
- Missing state variations (hover, focus, disabled)
- FOUC (use inline script or framework handling)
- Insufficient testing (test on real devices)

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-14 | Initial release - 2026 best practices |

---

**Document Status:** Production-ready
**Last Updated:** January 14, 2026
**Maintained by:** Development Team
