# Brand Profile UI Component

## Overview
The Brand Profile UI is a comprehensive settings panel that allows users to create and manage their brand identity profile. This profile is used to personalize AI-generated content across the platform.

## Components

### Main Files
- **`client/src/components/BrandProfileForm.tsx`** - The main form component
- **`client/src/pages/BrandProfile.tsx`** - The page wrapper for the form
- **Route:** `/brand-profile`

## Features

### 1. Brand Information
- **Brand Name** - Text input for company/brand name
- **Industry** - Dropdown with 15+ industry options

### 2. Brand Values (Multi-select)
Checkbox-based selection for brand characteristics:
- eco-friendly, luxury, accessible, innovative, traditional
- premium, affordable, sustainable, ethical, modern
- classic, bold, minimalist, playful, professional

### 3. Target Audience (Collapsible Section)
- **Demographics** - Textarea for age, location, profession details
- **Psychographics** - Textarea for values, interests, lifestyle
- **Pain Points** - Tag input with add/remove functionality

### 4. Visual Preferences
- **Preferred Styles** - Checkbox group (modern, rustic, minimalist, bold, elegant, playful, professional, vintage)
- **Color Preferences** - Checkbox group (neutral, vibrant, earth-tones, pastels, monochrome, warm, cool)

### 5. Brand Voice (Collapsible Section)
Three tag input fields with add/remove:
- **Voice Principles** - Core voice characteristics
- **Words to Use** - Preferred vocabulary
- **Words to Avoid** - Words that don't match brand voice

### 6. Knowledge Base Tags
Tag input for categorizing brand information for retrieval

## UI/UX Features

### Auto-Save Status
- Visual feedback with three states: saving, saved, error
- Success message displays for 2 seconds
- Toast notifications for all actions

### Empty State Handling
- Gracefully handles 404 (no profile exists)
- Shows empty form ready for creation
- Updates header text based on profile existence

### Loading States
- Loading spinner during initial data fetch
- Disabled save button during save operation
- Visual feedback for all async operations

### Delete Functionality
- Confirmation dialog before deletion
- Complete form state reset after deletion
- Toast notification on success

### Collapsible Sections
- Target Audience section can expand/collapse
- Brand Voice section can expand/collapse
- Chevron icons indicate state

### Tag Management
- Press Enter or click Plus button to add tags
- Click X icon on badge to remove tags
- Color-coded badges (destructive for "words to avoid")
- Visual feedback for all actions

## API Integration

### Endpoints Used
- **GET `/api/brand-profile`** - Load existing profile (handles 404)
- **PUT `/api/brand-profile`** - Create or update profile
- **DELETE `/api/brand-profile`** - Delete profile (with confirmation)

### Data Structure
```typescript
{
  brandName?: string;
  industry?: string;
  brandValues?: string[];
  targetAudience?: {
    demographics?: string;
    psychographics?: string;
    painPoints?: string[];
  };
  preferredStyles?: string[];
  colorPreferences?: string[];
  voice?: {
    principles: string[];
    wordsToUse?: string[];
    wordsToAvoid?: string[];
  };
  kbTags?: string[];
}
```

## Design System

### Components Used
- Input, Textarea, Label, Button (ui/shadcn)
- Badge, Checkbox, Select (ui/shadcn)
- Collapsible (Radix UI)
- Toast notifications (useToast hook)
- Framer Motion for animations

### Styling
- Follows existing app design patterns
- Card-based layout with backdrop blur
- Gradient backgrounds matching Home page
- Consistent header with navigation

## Navigation

### Header Links
All pages now have "Brand" link in navigation:
- Generate (Home)
- Library
- Prompts
- Gallery
- **Brand** (new)

### Breadcrumb
- "Back to Home" button on Brand Profile page
- Consistent with other pages' navigation patterns

## Testing Checklist

- [ ] Create new brand profile from empty state
- [ ] Load existing profile successfully
- [ ] Update profile fields and save
- [ ] Add/remove tags in all tag inputs
- [ ] Toggle checkboxes for values, styles, colors
- [ ] Expand/collapse target audience section
- [ ] Expand/collapse brand voice section
- [ ] Delete profile with confirmation
- [ ] Verify toast notifications appear
- [ ] Check save status indicators work
- [ ] Test keyboard navigation (Enter to add tags)
- [ ] Verify 404 handling for non-existent profile

## Future Enhancements

Potential improvements:
1. Auto-save on field change (debounced)
2. Profile completeness indicator/progress bar
3. Profile preview/summary panel
4. Multiple brand profiles (switching)
5. Import/export profile data
6. Profile templates by industry
7. AI suggestions for voice principles
8. Brand color picker with palette
9. Logo upload integration
10. Profile usage statistics

## Usage Example

```typescript
// In a page component
import { BrandProfileForm } from "@/components/BrandProfileForm";

export default function BrandProfile() {
  return (
    <div>
      <BrandProfileForm />
    </div>
  );
}
```

## Accessibility

- All form fields have associated labels
- Keyboard navigation supported
- ARIA labels for interactive elements
- Color contrast follows WCAG guidelines
- Focus states visible on all interactive elements
