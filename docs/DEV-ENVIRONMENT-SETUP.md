# Development Environment Setup - RAG System Implementation

## Overview

This document outlines the complete development environment setup needed for implementing the RAG-enhanced copywriting system, including Claude Code plugins, MCP servers, and development tools.

---

## Required Claude Code Plugins

### 1. **code-review** (Already Enabled ✅)
- **Purpose:** Multi-agent PR review with confidence scoring
- **Usage:** `/code-review` after implementing RAG fixes
- **Why needed:** Validate SDK migration, error handling, and RAG integration quality

### 2. **commit-commands** (Already Enabled ✅)
- **Purpose:** Streamlined git commit workflow
- **Usage:** `/commit` after each phase
- **Why needed:** Quick commits during rapid ASAP implementation

### 3. **pr-review-toolkit** (Already Enabled ✅)
- **Purpose:** Enhanced PR review capabilities
- **Usage:** `/review-pr [PR#]` before merging RAG changes
- **Why needed:** Ensure RAG implementation meets quality standards

### 4. **security-guidance** (Already Enabled ✅)
- **Purpose:** PreToolUse hook monitoring security patterns
- **Why needed:**
  - File upload security (validate file types, prevent malicious PDFs)
  - API key exposure prevention
  - Competitor ad scraping safety

---

## Required MCP Servers

### 1. **Puppeteer MCP** (Already Configured ✅)

**Why needed:**
- Scrape competitor ads from Instagram/LinkedIn/Facebook
- Automated screenshot capture for ad collection
- Navigate Facebook Ad Library programmatically

**Current capabilities:**
- `puppeteer_navigate` - Visit competitor pages
- `puppeteer_screenshot` - Capture ad visuals + text
- `puppeteer_click` - Interact with ad libraries
- `puppeteer_fill` - Search for brands in ad databases

**Example usage for competitor ad collection:**
```typescript
// Navigate to Nike Instagram
await puppeteer_navigate({ url: 'https://instagram.com/nike' });

// Screenshot top post
await puppeteer_screenshot({
  name: 'nike-instagram-post-1',
  selector: 'article'
});

// Navigate to Facebook Ad Library
await puppeteer_navigate({
  url: 'https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&q=Nike'
});
```

### 2. **Filesystem MCP** (Recommended - NEW)

**Why needed:**
- Manage reference-materials directory structure
- Bulk file operations for competitor ad PDFs
- Cleanup temporary files after upload

**Installation:**
```json
// .claude/mcp.json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "./reference-materials"]
    }
  }
}
```

**Use cases:**
- Create subdirectories for each platform
- List PDFs before bulk upload
- Organize competitor ads by brand/platform

### 3. **Memory MCP** (Recommended - NEW)

**Why needed:**
- Track competitor ad collection progress
- Remember which brands/platforms collected
- Store competitor ad metadata across sessions

**Installation:**
```json
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    }
  }
}
```

**Use cases:**
```typescript
// Track collection progress
await memory.store({
  key: "competitor-ads-progress",
  value: {
    nike_instagram: 5,
    adidas_instagram: 5,
    nike_linkedin: 3,
    // ... etc
  }
});
```

### 4. **Brave Search MCP** (Optional)

**Why needed:**
- Find competitor ad examples online
- Search for "Nike Instagram ads 2025"
- Discover high-performing competitor campaigns

**Installation:**
```json
{
  "mcpServers": {
    "brave-search": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-brave-search"],
      "env": {
        "BRAVE_API_KEY": "YOUR_KEY"
      }
    }
  }
}
```

### 5. **Google Drive MCP** (Optional)

**Why needed:**
- Store collected competitor ads in Google Drive
- Share reference materials with team
- Backup RAG knowledge base

**Installation:**
```json
{
  "mcpServers": {
    "google-drive": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-gdrive"]
    }
  }
}
```

---

## Recommended VS Code Extensions

### 1. **REST Client**
- **Purpose:** Test File Search API endpoints
- **Install:** `ext install humao.rest-client`
- **Usage:** Create `.http` files for API testing

**Example:** `test-file-search.http`
```http
### Initialize File Search Store
POST http://localhost:3000/api/file-search/initialize
Content-Type: application/json

### Upload single file
POST http://localhost:3000/api/file-search/upload
Content-Type: multipart/form-data; boundary=boundary

--boundary
Content-Disposition: form-data; name="file"; filename="nike-ad.pdf"
Content-Type: application/pdf

< ./competitor-ads/nike-instagram-trail-2025.pdf
--boundary
Content-Disposition: form-data; name="category"

ad_examples
--boundary--
```

### 2. **Thunder Client** (Alternative to Postman)
- **Purpose:** API testing GUI
- **Install:** `ext install rangav.vscode-thunder-client`
- **Why:** Lightweight, built into VS Code

### 3. **Markdown All in One**
- **Purpose:** Edit RAG documentation
- **Install:** `ext install yzhang.markdown-all-in-one`
- **Why:** Preview docs while writing

### 4. **PDF Viewer**
- **Purpose:** Preview competitor ad PDFs in VS Code
- **Install:** `ext install tomoki1207.pdf`
- **Why:** Quick review of collected ads

---

## Development Tools Setup

### 1. **Competitor Ad Scraping Tools**

**Facebook Ad Library Scraper:**
```bash
npm install --save-dev puppeteer
```

**Create scraper script:** `scripts/scrape-competitor-ads.ts`
```typescript
import puppeteer from 'puppeteer';

async function scrapeFacebookAdLibrary(brand: string) {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  // Navigate to Facebook Ad Library
  await page.goto(`https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&q=${brand}`);

  // Wait for ads to load
  await page.waitForSelector('[data-testid="ad-card"]');

  // Extract ad text
  const ads = await page.$$eval('[data-testid="ad-card"]', (elements) => {
    return elements.slice(0, 5).map(el => ({
      text: el.textContent,
      // ... extract more data
    }));
  });

  await browser.close();
  return ads;
}
```

### 2. **PDF Generation from Screenshots**

**Install html-pdf or puppeteer-pdf:**
```bash
npm install --save-dev puppeteer
```

**Convert screenshot + text to PDF:**
```typescript
import puppeteer from 'puppeteer';

async function createAdPDF(adData: {
  brand: string;
  platform: string;
  text: string;
  imageUrl: string;
}) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Generate HTML with ad content
  await page.setContent(`
    <h1>${adData.brand} - ${adData.platform}</h1>
    <img src="${adData.imageUrl}" />
    <p>${adData.text}</p>
  `);

  // Save as PDF
  await page.pdf({
    path: `./competitor-ads/${adData.brand}-${adData.platform}.pdf`,
    format: 'A4'
  });

  await browser.close();
}
```

### 3. **Bulk File Upload Script**

**Create:** `scripts/bulk-upload-ads.ts`
```typescript
import fs from 'fs/promises';
import path from 'path';

async function bulkUploadCompetitorAds() {
  const adsDir = './competitor-ads';
  const files = await fs.readdir(adsDir);

  for (const file of files) {
    if (file.endsWith('.pdf')) {
      const response = await fetch('http://localhost:3000/api/file-search/upload', {
        method: 'POST',
        body: createFormData(path.join(adsDir, file))
      });

      console.log(`✅ Uploaded: ${file}`);
    }
  }
}
```

### 4. **RAG Testing Script**

**Create:** `scripts/test-rag-generation.ts`
```typescript
async function testRAGGeneration() {
  // Generate copy WITHOUT RAG (baseline)
  const withoutRAG = await fetch('http://localhost:3000/api/copy/generate', {
    method: 'POST',
    body: JSON.stringify({
      productName: 'Trail Runner Pro',
      platform: 'instagram',
      variations: 1
    })
  });

  // Upload competitor ads
  await seedFileSearchStore();

  // Generate copy WITH RAG (enhanced)
  const withRAG = await fetch('http://localhost:3000/api/copy/generate', {
    method: 'POST',
    body: JSON.stringify({
      productName: 'Trail Runner Pro',
      platform: 'instagram',
      variations: 1
    })
  });

  // Compare quality
  console.log('Without RAG:', withoutRAG.copy.bodyText);
  console.log('With RAG:', withRAG.copy.bodyText);
}
```

---

## Environment Variables to Add

**Update `.env`:**
```bash
# Gemini API (already set)
GEMINI_API_KEY=AIzaSyDQ63zIo1JeOYWzinc077npETNwB-evHcI
GOOGLE_API_KEY=AIzaSyDQ63zIo1JeOYWzinc077npETNwB-evHcI  # Fallback

# File Search Configuration
FILESEARCH_CHUNK_SIZE=500
FILESEARCH_CHUNK_OVERLAP=50
FILESEARCH_STORE_NAME=nds-copywriting-rag

# Competitor Ad Scraping (optional)
FACEBOOK_EMAIL=your-email@example.com  # For Ad Library login
FACEBOOK_PASSWORD=your-password        # Use with caution!

# Optional MCP API Keys
BRAVE_API_KEY=your-brave-api-key      # For Brave Search MCP
```

---

## Package Dependencies to Install

### Core Dependencies (Already Installed ✅)
```json
{
  "@google/genai": "^1.30.0"
}
```

### Additional Dependencies Needed

**For competitor ad scraping:**
```bash
npm install --save-dev puppeteer
npm install --save-dev @types/puppeteer
```

**For PDF generation:**
```bash
npm install --save-dev pdf-lib
npm install html-pdf-node  # Alternative
```

**For file upload testing:**
```bash
npm install --save-dev form-data
npm install --save-dev @types/form-data
```

**Update package.json:**
```json
{
  "devDependencies": {
    "puppeteer": "^21.7.0",
    "@types/puppeteer": "^7.0.4",
    "pdf-lib": "^1.17.1",
    "html-pdf-node": "^1.0.8",
    "form-data": "^4.0.0",
    "@types/form-data": "^2.5.0"
  }
}
```

---

## Hookify Rules to Add

**Create:** `.claude/hookify.rag-safety.local.md`
```yaml
---
name: rag-file-upload-safety
trigger: PreToolUse
enabled: true
---

Prevent unsafe file uploads to RAG system:

- BLOCK uploads of executable files (.exe, .sh, .bat)
- BLOCK uploads > 100MB (Google File Search limit)
- WARN if uploading files without metadata
- WARN if API key exposed in file content
- REQUIRE file type validation before upload

If blocked, suggest using proper file validation middleware.
```

**Create:** `.claude/hookify.competitor-scraping.local.md`
```yaml
---
name: competitor-scraping-ethics
trigger: PreToolUse
enabled: true
---

Ensure ethical competitor ad collection:

- WARN if scraping rate > 10 requests/minute
- BLOCK if using credentials without user consent
- REQUIRE respecting robots.txt
- SUGGEST using official ad libraries (Facebook Ad Library)
- REMIND to check terms of service

Competitor research is legal, but be respectful.
```

---

## MCP Configuration File

**Create/Update:** `.claude/mcp.json`
```json
{
  "mcpServers": {
    "puppeteer-global": {
      "command": "npx",
      "args": ["-y", "@puppeteer/mcp-server-puppeteer"]
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "./reference-materials", "./competitor-ads"]
    },
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    },
    "nds-storefront": {
      "command": "npx",
      "args": ["-y", "@ndsllc/mcp-server-nds-storefront"]
    }
  }
}
```

---

## Quick Start Checklist

### Phase 0: Environment Setup (30 minutes)

- [ ] Install recommended VS Code extensions
  ```bash
  code --install-extension humao.rest-client
  code --install-extension rangav.vscode-thunder-client
  code --install-extension yzhang.markdown-all-in-one
  code --install-extension tomoki1207.pdf
  ```

- [ ] Install MCP servers
  ```bash
  # Add to .claude/mcp.json (see above)
  # Restart Claude Code
  ```

- [ ] Install npm dependencies
  ```bash
  npm install --save-dev puppeteer @types/puppeteer pdf-lib html-pdf-node form-data @types/form-data
  ```

- [ ] Create scripts directory
  ```bash
  mkdir -p scripts
  mkdir -p competitor-ads
  mkdir -p reference-materials
  ```

- [ ] Add hookify rules for safety
  ```bash
  # Create .claude/hookify.rag-safety.local.md
  # Create .claude/hookify.competitor-scraping.local.md
  ```

- [ ] Update environment variables
  ```bash
  # Add to .env (see section above)
  ```

### Phase 1: Test Environment (15 minutes)

- [ ] Test Puppeteer MCP
  ```bash
  # In Claude Code
  # Try: puppeteer_navigate({ url: 'https://instagram.com/nike' })
  ```

- [ ] Test File Search API
  ```bash
  curl -X POST http://localhost:3000/api/file-search/seed
  ```

- [ ] Test competitor ad scraping script
  ```bash
  npx tsx scripts/scrape-competitor-ads.ts
  ```

### Phase 2: Ready for Implementation

- [ ] Environment variables configured ✅
- [ ] MCP servers running ✅
- [ ] Claude Code plugins enabled ✅
- [ ] Development scripts created ✅
- [ ] Safety hooks configured ✅

**You're ready to start Day 1 implementation!**

---

## Troubleshooting

### Issue: Puppeteer MCP not working
**Solution:**
```bash
# Ensure Puppeteer MCP server is running
npx @puppeteer/mcp-server-puppeteer --help

# Check MCP logs
# In Claude Code: /mcp logs
```

### Issue: File Search Store initialization fails
**Solution:**
```bash
# Verify GEMINI_API_KEY is set
echo $GEMINI_API_KEY

# Test API key with curl
curl -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=$GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Test"}]}]}'
```

### Issue: Competitor ad PDFs too large (>100MB)
**Solution:**
```bash
# Compress PDFs before upload
npm install --save-dev pdf-lib

# Create compression script
npx tsx scripts/compress-pdfs.ts
```

---

## Next Steps

1. **Complete Phase 0 setup** (30 min)
2. **Run Phase 1 tests** (15 min)
3. **Begin Day 1 implementation** from [playful-watching-gray.md](C:\Users\avibm\.claude\plans\playful-watching-gray.md)

**Total setup time: ~45 minutes**

Then you're ready for the ASAP implementation timeline!
