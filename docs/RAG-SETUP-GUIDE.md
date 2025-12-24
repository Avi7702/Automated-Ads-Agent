# RAG-Enhanced Copywriting Setup Guide

## Overview

The Automated Ads Agent now includes a **RAG (Retrieval Augmented Generation)** system powered by Google's File Search Tool. This allows the AI copywriter to learn from your:

- Past successful NDS ad campaigns
- Brand guidelines and style guides
- Product catalogs
- Competitor research
- Performance data

## How It Works

```
1. Upload Reference Materials
   └─> Google File Search automatically:
       - Chunks documents into optimal segments
       - Creates vector embeddings
       - Indexes for fast semantic search

2. User Requests Ad Copy
   └─> System automatically:
       - Searches knowledge base for relevant examples
       - Retrieves matching patterns (hooks, CTAs, tone)
       - Injects context into AI prompt

3. AI Generates Copy
   └─> Gemini uses:
       - Your uploaded examples as inspiration
       - Platform-specific best practices
       - Brand voice from guidelines
       - RESULT: Contextual, high-quality copy
```

## Quick Start

### Step 1: Initialize the System

```bash
# Call this endpoint once to set up the File Search Store
curl -X POST http://localhost:3000/api/file-search/seed \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_SESSION_COOKIE"
```

This creates the directory structure:
```
reference-materials/
├── brand_guidelines/    # Brand voice, tone, style guides
├── ad_examples/         # Successful NDS ads (PDF, DOCX, TXT)
├── product_catalog/     # Product descriptions, specs
├── competitor_research/ # Competitor ad analysis
├── performance_data/    # What worked/didn't work
└── general/             # Miscellaneous reference docs
```

### Step 2: Upload Your NDS Ad Examples

**Option A: Upload Single File via API**

```bash
curl -X POST http://localhost:3000/api/file-search/upload \
  -H "Cookie: session=YOUR_SESSION_COOKIE" \
  -F "file=@path/to/nds-ad-examples.pdf" \
  -F "category=ad_examples" \
  -F "description=NDS running shoes campaign 2024"
```

**Option B: Upload Directory**

1. Place all your files in `reference-materials/ad_examples/`
2. Call the bulk upload endpoint:

```bash
curl -X POST http://localhost:3000/api/file-search/upload-directory \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_SESSION_COOKIE" \
  -d '{
    "directoryPath": "./reference-materials/ad_examples",
    "category": "ad_examples",
    "description": "NDS successful ad campaigns"
  }'
```

### Step 3: Generate Copy with RAG

Now when you generate copy, the system automatically retrieves relevant context:

```bash
curl -X POST http://localhost:3000/api/copy/generate \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_SESSION_COOKIE" \
  -d '{
    "productName": "TrailRunner Pro",
    "productDescription": "Lightweight trail running shoes",
    "platform": "instagram",
    "tone": "energetic",
    "variations": 3
  }'
```

The AI will:
1. Search your uploaded NDS examples for similar shoe ads
2. Find successful Instagram patterns
3. Extract proven hooks and CTAs
4. Generate copy inspired by what worked before

## Supported File Formats

| Category | Formats |
|----------|---------|
| Documents | PDF, DOCX, DOC, TXT, MD |
| Spreadsheets | XLSX, XLS, CSV |
| Presentations | PPTX |
| Code/Config | JSON, XML, YAML |
| Max Size | 100 MB per file |

## File Categories Explained

### 1. `brand_guidelines`
Upload brand style guides, voice & tone documents, visual identity guides.

**Example:**
- `nds-brand-guidelines-2025.pdf`
- `tone-of-voice-guide.docx`
- `do-dont-messaging.md`

### 2. `ad_examples`
Upload successful ad campaigns, winning copy variations, high-performing posts.

**Example:**
- `instagram-shoe-campaign-q4-2024.pdf`
- `linkedin-b2b-ads-high-ctr.docx`
- `facebook-holiday-campaign.txt`

### 3. `product_catalog`
Upload product descriptions, specifications, benefits documentation.

**Example:**
- `nds-product-catalog-2025.xlsx`
- `shoe-tech-specs.pdf`
- `product-benefits-matrix.csv`

### 4. `competitor_research`
Upload competitor ad analysis, market research, industry trends.

**Example:**
- `nike-instagram-analysis.pdf`
- `athletic-footwear-trends-2025.docx`

### 5. `performance_data`
Upload A/B test results, campaign performance reports, engagement data.

**Example:**
- `q4-campaign-results.xlsx`
- `best-performing-hooks-2024.csv`
- `cta-effectiveness-report.pdf`

## API Endpoints Reference

### Initialize File Search Store
```
POST /api/file-search/initialize
```
Creates the File Search Store if it doesn't exist.

**Response:**
```json
{
  "success": true,
  "store": {
    "name": "fileSearchStores/...",
    "displayName": "nds-copywriting-rag"
  }
}
```

### Upload Single File
```
POST /api/file-search/upload
```

**Form Data:**
- `file`: File to upload (required)
- `category`: File category (required)
- `description`: File description (optional)
- `metadata`: JSON metadata (optional)

**Response:**
```json
{
  "success": true,
  "file": {
    "fileName": "nds-ads.pdf",
    "fileId": "files/...",
    "category": "ad_examples",
    "uploadedAt": "2025-12-24T..."
  }
}
```

### Upload Directory
```
POST /api/file-search/upload-directory
```

**Body:**
```json
{
  "directoryPath": "./reference-materials/ad_examples",
  "category": "ad_examples",
  "description": "NDS ad examples"
}
```

**Response:**
```json
{
  "success": true,
  "files": [...],
  "count": 15
}
```

### List Files
```
GET /api/file-search/files?category=ad_examples
```

**Response:**
```json
{
  "success": true,
  "files": [
    {
      "name": "files/...",
      "displayName": "nds-ads.pdf",
      "metadata": {...}
    }
  ],
  "count": 15
}
```

### Delete File
```
DELETE /api/file-search/files/:fileId
```

**Response:**
```json
{
  "success": true
}
```

## Pricing

| Component | Cost |
|-----------|------|
| **Storage** | FREE |
| **Indexing** | $0.15 per 1M tokens (one-time when uploading) |
| **Query-time embeddings** | FREE |
| **Retrieved context** | Charged as regular input tokens |

**Example:** Upload 100 pages (≈50K tokens) = $0.0075 (less than a penny!)

## Best Practices

### 1. Organize by Category
Keep files organized by category for faster retrieval:
```
✅ GOOD: ad_examples/instagram-shoes.pdf
❌ BAD: general/everything-mixed.pdf
```

### 2. Use Descriptive Filenames
```
✅ GOOD: nike-instagram-campaign-q4-2024-high-ctr.pdf
❌ BAD: document.pdf
```

### 3. Update Regularly
- Add new successful campaigns monthly
- Remove outdated examples
- Track what works in performance_data/

### 4. Metadata for Advanced Filtering
```javascript
metadata: {
  "year": 2024,
  "platform": "instagram",
  "campaign_type": "product_launch",
  "ctr": "3.2%"
}
```

### 5. Start Small, Scale Up
1. Upload 5-10 best examples first
2. Test copy generation quality
3. Add more based on what gaps you see

## Troubleshooting

### "Failed to initialize File Search Store"
- Check GEMINI_API_KEY is set in .env
- Ensure File Search API is enabled for your Google Cloud project

### "File upload failed"
- Check file size (max 100 MB)
- Verify file format is supported
- Ensure file isn't corrupted

### "No context retrieved"
- File Search Store may be empty - upload files first
- Query may be too vague - be specific
- Files may not match query semantically

## Advanced: Manual File Search Query

Test what context the AI would retrieve:

```bash
curl -X POST http://localhost:3000/api/file-search/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Instagram ad for running shoes with energetic tone",
    "category": "ad_examples",
    "maxResults": 3
  }'
```

## Next Steps

1. ✅ Initialize the system: `POST /api/file-search/seed`
2. ✅ Upload NDS ad examples to `reference-materials/ad_examples/`
3. ✅ Upload brand guidelines to `reference-materials/brand_guidelines/`
4. ✅ Test copy generation with RAG-enhanced prompts
5. ✅ Monitor quality improvements in generated copy
6. ✅ Iterate: Add more examples based on what's missing

---

**Questions?** Check the [File Search API Docs](https://ai.google.dev/gemini-api/docs/file-search)
