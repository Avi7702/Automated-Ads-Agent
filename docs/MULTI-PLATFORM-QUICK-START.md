# Multi-Platform Posting - Quick Start Guide

Get started with multi-platform social media posting in 5 minutes.

---

## Prerequisites

- Node.js 18+ (for native fetch API)
- Cloudinary account (for image transformations)
- n8n instance (for posting automation)

---

## Step 1: Environment Setup (2 minutes)

### Add to `.env`

```bash
# Cloudinary (required for image transformations)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# n8n (required for posting)
N8N_BASE_URL=https://your-n8n-instance.com
N8N_API_KEY=your-n8n-api-key  # Optional
```

### Get Cloudinary Credentials

1. Sign up at [cloudinary.com](https://cloudinary.com)
2. Dashboard → Account Details
3. Copy Cloud Name, API Key, API Secret

### Get n8n Instance

**Option A: Cloud (Easiest)**
1. Sign up at [n8n.cloud](https://n8n.cloud)
2. Get webhook URL: `https://your-instance.app.n8n.cloud`

**Option B: Self-Hosted**
1. `docker run -it --rm --name n8n -p 5678:5678 n8nio/n8n`
2. Access at `http://localhost:5678`

---

## Step 2: n8n Workflow Setup (3 minutes)

### Create Basic Workflow (Instagram Example)

1. **Add Webhook Node**
   - Type: Webhook
   - Path: `post/instagram`
   - Method: POST

2. **Add Instagram Node**
   - Type: Instagram (requires Instagram Business credentials)
   - Operation: Post
   - Caption: `{{$json.content.caption}}`
   - Image URL: `{{$json.content.imageUrl}}`

3. **Add HTTP Request Node (Optional Callback)**
   - URL: `{{$json.callbackUrl}}`
   - Method: POST
   - Body:
     ```json
     {
       "scheduledPostId": "{{$json.metadata.scheduledPostId}}",
       "success": true,
       "platformPostId": "{{$node['Instagram'].json.id}}",
       "platformPostUrl": "https://instagram.com/p/{{$node['Instagram'].json.shortcode}}"
     }
     ```

4. **Activate Workflow**

5. **Test Webhook**
   ```bash
   curl -X POST https://your-n8n-instance.com/webhook/post/instagram \
     -H "Content-Type: application/json" \
     -d '{"content":{"caption":"Test","imageUrl":"https://example.com/image.jpg"}}'
   ```

### Duplicate for Other Platforms

Copy workflow, change webhook path to:
- `/webhook/post/linkedin`
- `/webhook/post/twitter`
- `/webhook/post/facebook`
- etc.

---

## Step 3: Use in Code (1 minute)

### Import Services

```typescript
import {
  formatContentForMultiplePlatforms,
  generatePlatformImages,
  postToMultiplePlatforms,
} from './services';
```

### Post to Multiple Platforms

```typescript
async function postToSocialMedia() {
  // Define content
  const caption = 'Exciting announcement! 🎉 Check it out.';
  const hashtags = ['News', 'Announcement', 'Business'];
  const imageUrl = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
  const platforms = ['instagram', 'linkedin', 'twitter'];

  // Step 1: Format content for each platform
  const formattedContent = await formatContentForMultiplePlatforms(
    caption,
    hashtags,
    platforms
  );

  // Step 2: Generate platform-optimized images
  const platformImages = await generatePlatformImages(imageUrl, platforms);
  const imageUrls = Object.fromEntries(
    Object.entries(platformImages).map(([p, img]) => [p, img.url])
  );

  // Step 3: Post to n8n
  const results = await postToMultiplePlatforms(
    platforms,
    formattedContent,
    imageUrls,
    'user_123',
    'post_456',
    {
      scheduledFor: new Date(),
      callbackUrl: 'https://api.example.com/n8n/callback',
    }
  );

  // Step 4: Check results
  for (const [platform, result] of Object.entries(results)) {
    if (result.success) {
      console.log(`✅ ${platform}: Success`);
    } else {
      console.error(`❌ ${platform}: ${result.error}`);
    }
  }
}
```

---

## Complete Working Example

```typescript
import {
  getPlatformSpecs,
  formatContentForPlatform,
  resizeImageForPlatform,
  postToN8n,
} from './services';

// Single platform example
async function postToInstagram() {
  try {
    // 1. Get specs (optional, for validation)
    const specs = getPlatformSpecs('instagram');
    console.log(`Instagram caption limit: ${specs?.caption.maxLength}`);

    // 2. Format content
    const formatted = await formatContentForPlatform(
      'Check out our new product! 🚀 https://example.com',
      ['ProductLaunch', 'Innovation', 'Tech'],
      'instagram'
    );

    // Check for errors
    if (!formatted.isValid) {
      console.error('Formatting errors:', formatted.errors);
      return;
    }

    // Show warnings
    if (formatted.warnings.length > 0) {
      console.warn('Warnings:', formatted.warnings);
    }

    // 3. Generate image
    const sized = await resizeImageForPlatform(
      'https://res.cloudinary.com/demo/image/upload/sample.jpg',
      { platform: 'instagram' }
    );

    console.log(`Image: ${sized.width}x${sized.height}px (${sized.format})`);

    // 4. Post to n8n
    const result = await postToN8n(
      'instagram',
      formatted,
      sized.url,
      'user_123',
      'post_456'
    );

    if (result.success) {
      console.log('✅ Posted to Instagram via n8n');
      console.log(`Execution ID: ${result.workflowExecutionId}`);
    } else {
      console.error('❌ Failed:', result.error);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

// Run it
postToInstagram();
```

---

## Verify Setup

### 1. Check Services Load

```bash
node --loader tsx
> const services = require('./server/services/platformSpecsService.ts');
> console.log(services.getAvailablePlatforms());
# Should output: ['linkedin', 'instagram', 'facebook', ...]
```

### 2. Test Cloudinary

```bash
node --loader tsx
> const { buildCloudinaryUrl } = require('./server/services/imageSizingService.ts');
> console.log(buildCloudinaryUrl('sample', 'w_500,h_500'));
# Should output: https://res.cloudinary.com/your-cloud/...
```

### 3. Test n8n Config

```bash
node --loader tsx
> const { validateN8nConfig } = require('./server/services/n8nPostingService.ts');
> console.log(validateN8nConfig());
# Should output: { isValid: true, errors: [], warnings: [] }
```

---

## Run Examples

```bash
# All 8 examples
npx tsx server/examples/multiPlatformPostingExample.ts

# Specific examples
node --loader tsx
> const examples = require('./server/examples/multiPlatformPostingExample.ts');
> await examples.example1_listPlatforms();
> await examples.example3_formatSinglePlatform();
> await examples.example7_completeWorkflow();
```

---

## Common Patterns

### Pattern 1: Format + Validate

```typescript
const formatted = await formatContentForPlatform(caption, hashtags, 'instagram');

if (!formatted.isValid) {
  return { error: 'Invalid content', details: formatted.errors };
}

if (formatted.warnings.length > 0) {
  console.warn('Content warnings:', formatted.warnings);
}
```

### Pattern 2: Multi-Platform with Error Handling

```typescript
const platforms = ['instagram', 'linkedin', 'twitter'];

const results = await postToMultiplePlatforms(
  platforms,
  formattedContent,
  imageUrls,
  userId,
  postId
);

const successful = Object.entries(results)
  .filter(([_, r]) => r.success)
  .map(([p, _]) => p);

const failed = Object.entries(results)
  .filter(([_, r]) => !r.success)
  .map(([p, r]) => ({ platform: p, error: r.error }));

console.log(`Posted to ${successful.length}/${platforms.length} platforms`);

if (failed.length > 0) {
  console.error('Failed platforms:', failed);
}
```

### Pattern 3: Image Validation Before Upload

```typescript
const validation = validateImageForPlatform(
  imageWidth,
  imageHeight,
  fileSizeMB,
  format,
  'instagram'
);

if (!validation.isValid) {
  return {
    error: 'Image does not meet platform requirements',
    details: validation.errors,
  };
}

// Proceed with resize
const sized = await resizeImageForPlatform(imageUrl, { platform: 'instagram' });
```

---

## Express API Example

```typescript
import express from 'express';
import {
  formatContentForMultiplePlatforms,
  generatePlatformImages,
  postToMultiplePlatforms,
  handleN8nCallback,
} from './services';

const app = express();
app.use(express.json());

// POST /api/social-media/post
app.post('/api/social-media/post', async (req, res) => {
  try {
    const { caption, hashtags, imageUrl, platforms, userId } = req.body;

    // Validate
    if (!caption || !platforms || !userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Format content
    const formattedContent = await formatContentForMultiplePlatforms(
      caption,
      hashtags || [],
      platforms
    );

    // Check for errors
    const hasErrors = Object.values(formattedContent).some(c => !c.isValid);
    if (hasErrors) {
      return res.status(400).json({
        error: 'Content formatting failed',
        details: Object.entries(formattedContent)
          .filter(([_, c]) => !c.isValid)
          .map(([platform, c]) => ({ platform, errors: c.errors })),
      });
    }

    // Generate images
    const platformImages = await generatePlatformImages(imageUrl, platforms);
    const imageUrls = Object.fromEntries(
      Object.entries(platformImages).map(([p, img]) => [p, img.url])
    );

    // Post to n8n
    const scheduledPostId = `post_${Date.now()}`;
    const postResults = await postToMultiplePlatforms(
      platforms,
      formattedContent,
      imageUrls,
      userId,
      scheduledPostId,
      {
        callbackUrl: `${process.env.API_BASE_URL}/api/n8n/callback`,
      }
    );

    return res.json({
      scheduledPostId,
      results: postResults,
    });

  } catch (error) {
    console.error('Post error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/n8n/callback
app.post('/api/n8n/callback', async (req, res) => {
  try {
    await handleN8nCallback(req.body);
    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Callback error:', error);
    res.status(500).json({ error: 'Callback processing failed' });
  }
});

app.listen(3000, () => console.log('Server running on port 3000'));
```

---

## Troubleshooting

### Issue: "Platform not supported"

```typescript
// Check available platforms
import { getAvailablePlatforms } from './services/platformSpecsService';
console.log(getAvailablePlatforms());

// Use exact identifier
await formatContentForPlatform(caption, hashtags, 'instagram'); // ✅ Correct
await formatContentForPlatform(caption, hashtags, 'Instagram'); // ❌ Wrong (case-sensitive)
```

### Issue: "CLOUDINARY_CLOUD_NAME not configured"

```bash
# Check .env file exists
ls .env

# Check variable is set
node -e "require('dotenv').config(); console.log(process.env.CLOUDINARY_CLOUD_NAME)"

# Restart server after adding env variables
```

### Issue: "Webhook returned 404"

```bash
# Test webhook directly
curl -X POST https://your-n8n-instance.com/webhook/post/instagram \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Check n8n workflow:
# 1. Workflow is active (not disabled)
# 2. Webhook path matches: /post/instagram
# 3. Method is POST
```

### Issue: Images not loading

```typescript
// Test Cloudinary URL directly in browser
const { buildCloudinaryUrl } = require('./services/imageSizingService');
const url = buildCloudinaryUrl('sample', 'w_500,h_500');
console.log(url);
// Open URL in browser to verify image loads
```

---

## Next Steps

1. **Read Full Documentation**
   - `docs/MULTI-PLATFORM-POSTING-SERVICES.md` - Complete guide
   - `docs/MULTI-PLATFORM-API-REFERENCE.md` - API reference

2. **Run Examples**
   - `npx tsx server/examples/multiPlatformPostingExample.ts`

3. **Set Up n8n Workflows**
   - Create workflows for each platform
   - Configure platform API credentials
   - Test webhooks

4. **Integrate into Application**
   - Add API endpoints
   - Connect to frontend
   - Implement database storage

5. **Add Features**
   - Scheduling system
   - Analytics tracking
   - A/B testing
   - Video support

---

## Support

- **Examples:** `server/examples/multiPlatformPostingExample.ts`
- **Full Guide:** `docs/MULTI-PLATFORM-POSTING-SERVICES.md`
- **API Reference:** `docs/MULTI-PLATFORM-API-REFERENCE.md`
- **Summary:** `docs/MULTI-PLATFORM-IMPLEMENTATION-SUMMARY.md`

---

**You're all set! Start posting to social media in production.**

---

**Last Updated:** January 25, 2026
