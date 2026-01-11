# Idea Bank UI - Usage Guide

## Quick Start

The Enhanced Idea Bank UI automatically appears when you select products in the Home page. No configuration needed!

## Basic Usage

### 1. Select Products

```
Home Page → Product Gallery → Click on 1-6 products
```

The Idea Bank panel will automatically appear above the product gallery.

### 2. Review Suggestions

Each suggestion card shows:
- **Mode Badge**: How the suggestion was generated
- **Confidence Score**: AI's confidence (0-100%)
- **Prompt Text**: The actual suggestion you can use
- **Reasoning**: Why this suggestion fits your products
- **Recommendations**: Platform and aspect ratio hints
- **Sources**: Which data sources contributed

### 3. Use a Suggestion

Click the "Use this suggestion" button to populate the prompt input field with that suggestion.

### 4. Customize (Optional)

Edit the populated prompt to fine-tune it for your specific needs.

### 5. Generate

Click "Generate Marketing Content" to create your image.

## Visual Guide

### New Format Display

```
┌─────────────────────────────────────────────────────────────┐
│ ✨ Intelligent Idea Bank                      🔄 Refresh   │
├─────────────────────────────────────────────────────────────┤
│ Analysis Status:                                            │
│ ✓ Vision Analysis  ✓ Knowledge Base  5 Templates  ✗ Web    │
├─────────────────────────────────────────────────────────────┤
│ 6 AI-generated ideas                                        │
│                                                              │
│ ┌──────────────────────────┐  ┌──────────────────────────┐ │
│ │ ⚡ Exact Insert    ● 85% │  │ 💡 Inspiration    ● 72% │ │
│ │                          │  │                          │ │
│ │ Create a professional    │  │ Showcase the product in  │ │
│ │ worksite shot with the   │  │ an active construction   │ │
│ │ product on a concrete    │  │ setting with natural     │ │
│ │ foundation...            │  │ lighting...              │ │
│ │                          │  │                          │ │
│ │ "Based on industrial     │  │ "Perfect for B2B         │ │
│ │  aesthetic match..."     │  │  brands targeting..."    │ │
│ │                          │  │                          │ │
│ │ 📸 Instagram  📐 1:1     │  │ 📸 Facebook  📐 16:9     │ │
│ │ 👁 Vision  🗄 KB  📈 Temp│  │ 👁 Vision  🌐 Web        │ │
│ │                          │  │                          │ │
│ │ [✨ Use this suggestion] │  │ [✨ Use this suggestion] │ │
│ └──────────────────────────┘  └──────────────────────────┘ │
│                                                              │
│ [... 4 more suggestion cards ...]                          │
└─────────────────────────────────────────────────────────────┘
```

### Legacy Mode Display

```
┌─────────────────────────────────────────────────────────────┐
│ ✨ Intelligent Idea Bank  [Legacy Mode]       🔄 Refresh   │
├─────────────────────────────────────────────────────────────┤
│ 4 AI-generated ideas                                        │
│                                                              │
│ ┌──────────────────────────┐  ┌──────────────────────────┐ │
│ │ ⭐ Standard        ● 60% │  │ ⭐ Standard        ● 60% │ │
│ │                          │  │                          │ │
│ │ Modern product           │  │ Elegant showcase with    │ │
│ │ photography with clean   │  │ soft lighting and        │ │
│ │ white background...      │  │ natural elements...      │ │
│ │                          │  │                          │ │
│ │ "Generated from legacy   │  │ "Generated from legacy   │ │
│ │  prompt suggestions"     │  │  prompt suggestions"     │ │
│ │                          │  │                          │ │
│ │ 📈 Templates             │  │ 📈 Templates             │ │
│ │                          │  │                          │ │
│ │ [✨ Use this suggestion] │  │ [✨ Use this suggestion] │ │
│ └──────────────────────────┘  └──────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Mode Explanations

### ⚡ Exact Insert (Green)
**What it means:** This suggestion is ready to use with a specific template.

**Best for:**
- Quick, consistent results
- Brand guidelines compliance
- Proven visual styles

**Example:**
"Place the product on an active construction site with morning light, using the 'Worksite Installation' template"

### 💡 Inspiration (Purple)
**What it means:** Creative starting point based on your product's attributes.

**Best for:**
- Exploring new directions
- Creative campaigns
- Unique content

**Example:**
"Show the product in an unexpected setting like a rooftop garden at sunset"

### ⭐ Standard (Blue)
**What it means:** General suggestion based on product category and best practices.

**Best for:**
- First-time users
- General purpose content
- Safe, reliable results

**Example:**
"Professional product photography with clean background and even lighting"

## Confidence Score Guide

### 🟢 80-100%: High Confidence
- Strong match between product and suggestion
- Backed by multiple data sources
- Template available and tested
- Recommended platform identified

**Action:** Use as-is with minimal editing

### 🟡 60-79%: Medium Confidence
- Good match but may need refinement
- Based on partial analysis
- Template may need customization

**Action:** Review and adjust to your brand

### 🟠 0-59%: Lower Confidence
- Generic suggestion
- Limited product analysis
- Fallback recommendation

**Action:** Use as inspiration, customize heavily

## Source Indicators

### 👁 Vision Analysis (Blue)
Product image was analyzed using AI vision:
- Detected colors, materials, style
- Identified product category
- Extracted visual attributes

### 🗄 Knowledge Base (Purple)
Retrieved from your brand's knowledge base:
- Brand guidelines
- Past successful campaigns
- Industry best practices
- Curated templates

### 🌐 Web Search (Green)
Current trends and inspiration from web:
- Latest design trends
- Seasonal themes
- Competitor analysis

**Note:** Disabled by default (KB-first policy)

### 📈 Template Matching (Orange)
Matched with curated templates:
- Pre-tested compositions
- Platform-optimized layouts
- Proven performance

## Advanced Features

### Multi-Product Suggestions

When you select 2-6 products:
- Each product is analyzed individually
- Suggestions are aggregated and ranked
- Top 6 most confident suggestions shown
- Sources combined across all products

**Example:**
```
Selected: [T12 Rebar, Steel Mesh A393, Spacer Wheels]
Suggestion: "Create a professional worksite scene with all three products
            arranged on a construction site with morning light..."
Confidence: 88% (combines data from all 3 products)
```

### Refresh for New Ideas

Click the refresh button (🔄) to:
- Generate new suggestions
- Get different perspectives
- Try alternative approaches

**Note:** Subject to rate limiting (20 requests/minute)

### Platform Recommendations

Some suggestions include platform hints:
- **Instagram**: 1:1 square format, vibrant colors
- **Facebook**: 16:9 landscape, storytelling focus
- **LinkedIn**: Professional, clean aesthetics
- **TikTok**: 9:16 vertical, dynamic compositions
- **Twitter/X**: 16:9 landscape, text-friendly

## Integration with Other Features

### Works With:
- ✅ Product Library
- ✅ Template System
- ✅ Brand Profile
- ✅ Knowledge Base
- ✅ Vision Analysis

### Enhances:
- Prompt quality
- Creative variety
- Time to first image
- Brand consistency
- Campaign effectiveness

## Troubleshooting

### "No suggestions available"
**Possible causes:**
1. Products not yet analyzed
2. Network connectivity issue
3. Rate limit exceeded

**Solutions:**
- Wait a moment and click refresh
- Check internet connection
- Try again in 1 minute

### "Legacy Mode" badge appears
**What it means:**
- Using older suggestion system
- Limited metadata available
- Basic functionality only

**Solutions:**
- Refresh the page
- Check authentication status
- Contact admin if persistent

### Suggestions seem generic
**Possible causes:**
1. Product images low quality
2. No KB content for category
3. Brand profile incomplete

**Solutions:**
- Upload higher quality images
- Add templates to knowledge base
- Complete brand profile settings

## Best Practices

### Do's ✅
- Review multiple suggestions before choosing
- Customize suggestions to match your brand
- Use high-confidence suggestions for important campaigns
- Combine suggestions for unique results
- Save successful prompts for future use

### Don'ts ❌
- Don't use low-confidence suggestions without review
- Don't ignore platform recommendations
- Don't spam refresh (rate limited)
- Don't expect perfection on first try
- Don't skip the reasoning—it helps you learn

## Privacy & Security

- All suggestions are private to your account
- No data shared between users
- Product analysis cached securely
- Knowledge base queries logged for improvement
- Rate limiting prevents abuse

## Performance Tips

### For Faster Results:
1. Analyze products in advance (batch upload)
2. Build your knowledge base proactively
3. Create brand profile before generating
4. Use templates for recurring needs
5. Cache frequent product combinations

### For Better Quality:
1. Upload high-resolution product images
2. Add detailed product metadata
3. Populate knowledge base with examples
4. Define clear brand voice
5. Use exact insert mode when available

## API Usage (Developers)

### Endpoint
```
POST /api/idea-bank/suggest
```

### Request
```json
{
  "productIds": ["prod-123", "prod-456"],
  "userGoal": "holiday campaign",
  "enableWebSearch": false,
  "maxSuggestions": 6
}
```

### Response
```json
{
  "suggestions": [
    {
      "id": "sug-789",
      "prompt": "Create a festive holiday scene...",
      "mode": "exact_insert",
      "templateIds": ["temp-111"],
      "reasoning": "Holiday theme matches seasonal KB content...",
      "confidence": 0.92,
      "sourcesUsed": {
        "visionAnalysis": true,
        "kbRetrieval": true,
        "webSearch": false,
        "templateMatching": true
      },
      "recommendedPlatform": "Instagram",
      "recommendedAspectRatio": "1:1"
    }
  ],
  "analysisStatus": {
    "visionComplete": true,
    "kbQueried": true,
    "templatesMatched": 3,
    "webSearchUsed": false
  }
}
```

### Rate Limits
- 20 requests per minute per user
- 6 products maximum per request
- 10 suggestions maximum per response

## Feedback & Support

Found a bug or have a suggestion?
- Check docs/PHASE-6-IDEA-BANK-UI.md for technical details
- Review docs/IDEA-BANK-COMPONENT-STRUCTURE.md for architecture
- File an issue with reproduction steps

## What's Next?

Upcoming features:
- [ ] Suggestion history tracking
- [ ] Favorite suggestions
- [ ] Custom suggestion templates
- [ ] A/B testing different suggestions
- [ ] Personalized learning from usage
- [ ] Export suggestions to CSV
- [ ] Batch suggestion generation

---

**Version:** 1.0.0 (Phase 6)
**Last Updated:** December 24, 2025
**Compatibility:** Chrome 120+, Firefox 120+, Safari 17+, Edge 120+
