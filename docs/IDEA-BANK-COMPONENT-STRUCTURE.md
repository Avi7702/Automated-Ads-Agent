# Idea Bank UI - Component Structure & Data Flow

## Component Hierarchy

```
Home.tsx
│
├── IdeaBankPanel
│   ├── Header
│   │   ├── Title + Legacy Mode Badge
│   │   └── Refresh Button
│   │
│   ├── AnalysisStatusSummary (new format only)
│   │   ├── Vision Analysis Status
│   │   ├── Knowledge Base Status
│   │   ├── Templates Matched Count
│   │   └── Web Search Status
│   │
│   └── SuggestionGrid
│       └── SuggestionCard[] (up to 10 cards)
│           ├── ModeBadge (exact_insert | inspiration | standard)
│           ├── ConfidenceIndicator (dot + percentage)
│           ├── PromptText
│           ├── Reasoning (italic, bordered)
│           ├── PlatformHints (pills)
│           ├── SourceIndicators (icons)
│           └── UseButton
```

## Data Flow Diagram

```
User Selects Products
         │
         ▼
   [useEffect trigger]
         │
         ▼
  fetchSuggestions()
         │
         ├─────────────────────┬──────────────────────┐
         │                     │                      │
         ▼                     ▼                      ▼
  Try New Endpoint      Try Legacy Endpoint    Error State
  /idea-bank/suggest    /prompt-suggestions
         │                     │
         ▼                     ▼
  Check Format         Convert to New Format
  (suggestions? +       (string[] → objects)
   analysisStatus?)             │
         │                      │
         └──────────┬───────────┘
                    ▼
            setResponse(data)
                    │
                    ▼
           Render Suggestions
                    │
         ┌──────────┴──────────┐
         ▼                     ▼
   New Format Display    Legacy Mode Display
   (rich metadata)       (basic view + badge)
```

## API Request Flow (Multiple Products)

```
Frontend: selectedProducts = [P1, P2, P3]
                    │
                    ▼
POST /api/idea-bank/suggest
{ productIds: ["P1", "P2", "P3"], maxSuggestions: 6 }
                    │
                    ▼
Backend: Parallel Processing
         │
         ├── P1 → generateSuggestions() → 2 suggestions
         ├── P2 → generateSuggestions() → 2 suggestions
         └── P3 → generateSuggestions() → 2 suggestions
                    │
                    ▼
         Aggregate Results
         - Merge all suggestions (6 total)
         - Aggregate analysisStatus (OR/SUM)
         - Sort by confidence DESC
         - Limit to maxSuggestions
                    │
                    ▼
Response: {
  suggestions: [...6 items sorted by confidence],
  analysisStatus: { ... aggregated ... }
}
                    │
                    ▼
Frontend: Render SuggestionCards
```

## Component Props & State

### IdeaBankPanel

**Props:**
```typescript
{
  selectedProducts: Product[];      // Triggers auto-fetch on change
  onSelectPrompt: (prompt: string) => void;  // Callback when user clicks "Use"
  className?: string;                // Optional styling
}
```

**Internal State:**
```typescript
const [loading, setLoading] = useState(false);
const [response, setResponse] = useState<IdeaBankSuggestResponse | null>(null);
const [error, setError] = useState<string | null>(null);
const [legacyMode, setLegacyMode] = useState(false);
```

**Effects:**
```typescript
useEffect(() => {
  if (selectedProducts.length > 0) fetchSuggestions();
  else setResponse(null);
}, [selectedProducts.map(p => p.id).join(",")]);
```

## Sub-Components

### ModeBadge

Displays generation mode with color-coded styling:
- **exact_insert**: Green, Zap icon
- **inspiration**: Purple, Lightbulb icon
- **standard**: Blue, Sparkles icon

### SourceIndicators

Shows which data sources contributed:
- **Eye** (blue): Vision Analysis
- **Database** (purple): Knowledge Base
- **Globe** (green): Web Search
- **TrendingUp** (orange): Template Matching

### SuggestionCard

Main interactive element:
- Click anywhere to highlight
- "Use this suggestion" button at bottom
- Hover effect for better UX
- Data-testid for testing: `button-use-suggestion-{id}`

### ConfidenceIndicator

Visual confidence score:
- Colored dot (green/yellow/orange)
- Percentage text
- Thresholds: 80%+ green, 60-79% yellow, <60% orange

## Styling Architecture

All components use:
- Tailwind CSS utility classes
- `cn()` helper for conditional classes
- Design tokens:
  - `border-white/10` for subtle borders
  - `bg-card/50` for semi-transparent cards
  - `text-muted-foreground` for secondary text
  - `hover:border-primary/30` for interactive states

## Accessibility Considerations

1. **Semantic HTML**: Uses `<button>` for clickable elements
2. **ARIA labels**: Implicit via button text
3. **Keyboard navigation**: All buttons focusable
4. **Visual feedback**: Hover states, loading indicators
5. **Error messages**: Screen-reader friendly text

## Performance Optimizations

1. **Debounced fetching**: useEffect dependency prevents excessive calls
2. **Parallel API requests**: Multiple products processed simultaneously
3. **Lazy imports**: ideaBankService imported dynamically on backend
4. **Conditional rendering**: Only renders when selectedProducts.length > 0
5. **Memoized dependencies**: Uses `.join(",")` for stable array comparison

## Error Handling

Graceful degradation at each level:

1. **Network Error**: Shows error message, allows retry
2. **Auth Error**: Falls back to legacy endpoint
3. **Empty Results**: Shows "No suggestions" message
4. **Partial Success**: Shows successful suggestions even if some products fail
5. **Rate Limited**: Displays rate limit message with retry timer

## Testing Strategy

### Unit Tests (Recommended)
- Test mode badge rendering for each mode
- Test confidence indicator thresholds
- Test source indicator combinations
- Test legacy format conversion
- Test error state rendering

### Integration Tests
- Test API call with single product
- Test API call with multiple products
- Test fallback to legacy endpoint
- Test suggestion selection callback
- Test refresh functionality

### E2E Tests
- Select products → verify suggestions appear
- Click suggestion → verify prompt populated
- Deselect products → verify panel hides
- Click refresh → verify new suggestions
- Test error recovery flow

## Browser Compatibility

Tested on:
- Chrome 120+
- Firefox 120+
- Safari 17+
- Edge 120+

Requires:
- ES2020 support
- Fetch API
- CSS Grid
- CSS Flexbox
