# Multi-Platform Social Media Posting Services

Complete system for formatting, optimizing, and posting content to multiple social media platforms via n8n automation.

## Overview

Four comprehensive services work together to handle end-to-end multi-platform posting:

1. **Platform Specifications Service** - Platform-specific requirements and limits
2. **Content Formatter Service** - Format captions and hashtags per platform
3. **Image Sizing Service** - Resize images with Cloudinary transformations
4. **n8n Posting Service** - Post to n8n webhooks for automation

## Installation & Setup

### 1. Environment Configuration

Add to `.env`:

```bash
# n8n Integration (Multi-Platform Posting)
N8N_BASE_URL=https://your-n8n-instance.com
N8N_API_KEY=your-n8n-api-key-here  # Optional, for status checking

# Cloudinary (Already configured)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### 2. n8n Webhook Setup

Create webhooks in n8n for each platform:

- `POST /webhook/post/linkedin`
- `POST /webhook/post/instagram`
- `POST /webhook/post/facebook`
- `POST /webhook/post/twitter`
- `POST /webhook/post/tiktok`
- `POST /webhook/post/youtube-shorts`
- `POST /webhook/post/pinterest`

Each webhook receives:

```typescript
{
  platform: string;
  userId: string;
  content: {
    caption: string;
    hashtags: string[];
    imageUrl?: string;
    videoUrl?: string;
  };
  metadata: {
    scheduledPostId: string;
    generationId?: string;
    templateId?: string;
    scheduledFor?: string;
  };
  formatting: {
    characterCount: number;
    hashtagCount: number;
    truncated: boolean;
    warnings: string[];
  };
  callbackUrl?: string;
}
```

### 3. Import Services

```typescript
import {
  getPlatformSpecs,
  getAvailablePlatforms,
} from './services/platformSpecsService';

import {
  formatContentForPlatform,
  formatContentForMultiplePlatforms,
} from './services/contentFormatterService';

import {
  generatePlatformImages,
  resizeImageForPlatform,
} from './services/imageSizingService';

import {
  postToN8n,
  postToMultiplePlatforms,
} from './services/n8nPostingService';
```

---

## Service 1: Platform Specifications

**File:** `server/services/platformSpecsService.ts`

### Platforms Supported (January 2026 Specs)

- **LinkedIn** (Personal + Company Pages)
- **Instagram** (Feed + Stories + Reels)
- **Facebook** (Personal + Business Pages)
- **Twitter/X**
- **TikTok**
- **YouTube** (Shorts + Regular Videos)
- **Pinterest**

### Usage

```typescript
// Get all available platforms
const platforms = getAvailablePlatforms();
// Returns: ['linkedin', 'instagram', 'facebook', 'twitter', ...]

// Check if platform is supported
const isSupported = isPlatformSupported('instagram');
// Returns: true

// Get platform specifications
const specs = getPlatformSpecs('instagram');
// Returns full PlatformSpecs object with:
// - caption limits (min, max, recommended, truncation point)
// - hashtag limits (min, max, recommended, position)
// - image specs (formats, sizes, aspect ratios)
// - video specs (formats, sizes, duration)
// - features (carousel, stories, reels, links, etc.)

// Get recommended aspect ratio
const aspectRatio = getRecommendedAspectRatio('instagram');
// Returns: { name: 'Portrait (New 2026)', ratio: '3:4', width: 1080, height: 1440, ... }
```

### Platform Specs Overview

| Platform | Caption Limit | Hashtag Limit | Recommended Aspect Ratio | Image Max Size |
|----------|---------------|---------------|--------------------------|----------------|
| Instagram | 2,200 | 30 | 3:4 (1080x1440) | 8MB |
| LinkedIn | 3,000 | 30 | 1.91:1 (1200x627) | 8MB |
| Facebook | 63,206 | 30 | 1.91:1 (1200x630) | 30MB |
| Twitter/X | 280 | 2 | 16:9 (1600x900) | 5MB |
| TikTok | 4,000 | 10 | 9:16 (1080x1920) | 287MB |
| YouTube Shorts | 100 (title) | 15 | 9:16 (1080x1920) | 256MB |
| Pinterest | 500 | 20 | 2:3 (1000x1500) | 20MB |

### Data Sources

All specifications sourced from official platform documentation as of January 2026:

- [LinkedIn Post Character Limits 2026](https://socialrails.com/blog/linkedin-post-character-limits)
- [Instagram Character Limit Guide](https://www.outfy.com/blog/instagram-character-limit/)
- [Facebook Post Sizes 2026](https://recurpost.com/blog/facebook-post-sizes/)
- [Twitter Character Limits](https://socialrails.com/blog/twitter-character-limits-guide)
- [TikTok Media Guidelines](https://cloudcampaignsupport.zendesk.com/hc/en-us/articles/42274647925267)
- [YouTube Shorts Specifications](https://postfa.st/sizes/youtube/shorts)
- [Pinterest Pin Size Guide](https://socialrails.com/blog/pinterest-pin-size-dimensions-guide)

---

## Service 2: Content Formatter

**File:** `server/services/contentFormatterService.ts`

### Features

1. **Character Limit Validation** - Truncates with smart word-boundary detection
2. **Hashtag Formatting** - Adds/removes `#` symbol based on platform
3. **Link Handling** - Removes links for platforms that don't support them
4. **Emoji Optimization** - Limits emojis for professional platforms (LinkedIn)
5. **Line Break Optimization** - Removes excessive breaks, platform-specific formatting
6. **Platform-Specific Warnings** - "See more" truncation points, recommendations

### Usage

#### Format for Single Platform

```typescript
const caption = 'Exciting news! Check out our new product 🚀 https://example.com';
const hashtags = ['ProductLaunch', 'Innovation', 'Startup'];

const formatted = await formatContentForPlatform(
  caption,
  hashtags,
  'instagram'
);

console.log(formatted);
// {
//   caption: "Exciting news! Check out our new product 🚀\n\nLink in bio",
//   hashtags: ['#ProductLaunch', '#Innovation', '#Startup'],
//   characterCount: 125,
//   hashtagCount: 3,
//   warnings: ['Links not clickable in captions. Add "Link in bio" message instead.'],
//   errors: [],
//   isValid: true,
//   platform: 'instagram',
//   truncated: false,
//   emojiCount: 1,
//   linkHandling: {
//     linksDetected: 1,
//     linksRemoved: 1,
//     message: 'Links not clickable in captions...'
//   },
//   imageRequirements: {
//     aspectRatio: '3:4',
//     minWidth: 320,
//     minHeight: 320,
//     formats: ['jpg', 'png'],
//     maxSizeMB: 8
//   }
// }
```

#### Format for Multiple Platforms

```typescript
const caption = 'Big announcement coming soon! 🎉';
const hashtags = ['News', 'Announcement'];
const platforms = ['instagram', 'linkedin', 'twitter'];

const results = await formatContentForMultiplePlatforms(
  caption,
  hashtags,
  platforms
);

// Returns: { instagram: {...}, linkedin: {...}, twitter: {...} }
```

#### Generate Caption Suggestions

```typescript
const longCaption = 'This is a very long caption that might need truncation...';
const suggestions = generateCaptionSuggestions(longCaption, 'twitter');

// Returns array of suggestions:
// [
//   'This is a very long caption that might need truncation...',  // Original
//   'This is a very long caption that might need...',              // Truncated to recommended
//   'This is a very long caption...',                              // Truncated to "See more"
// ]
```

### Platform-Specific Behavior

#### LinkedIn (Professional)
- Removes excessive emojis (max 3)
- Keeps links clickable in caption
- Uses `#` for hashtags
- Warns about 210-char "See more" cutoff

#### Instagram
- Moves links to "Link in bio" message
- Keeps all emojis
- Uses `#` for hashtags
- Warns about 125-char truncation

#### Twitter/X
- Compacts line breaks to save characters
- Max 2 hashtags recommended
- Links count toward 280-char limit
- Uses `#` for hashtags

#### TikTok
- Removes all links (not clickable)
- Keeps emojis
- Max 10 hashtags
- New 4,000 char limit (2026)

---

## Service 3: Image Sizing

**File:** `server/services/imageSizingService.ts`

### Features

1. **Aspect Ratio Conversion** - Crop/resize to platform requirements
2. **Format Optimization** - Convert PNG → JPEG for Instagram
3. **Quality Optimization** - Auto-compress with Cloudinary `q_auto`
4. **Batch Generation** - Create all platform variants in parallel
5. **Cloudinary Integration** - On-the-fly transformations (no storage needed)
6. **File Size Estimation** - Predict compressed size
7. **Validation** - Check if image meets platform requirements

### Usage

#### Resize for Single Platform

```typescript
const sourceImageUrl = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';

const sized = await resizeImageForPlatform(sourceImageUrl, {
  platform: 'instagram',
  aspectRatio: '4:5',  // Optional, uses recommended if not specified
  format: 'jpg',        // Optional, auto-selects optimal format
  quality: 'auto:best', // Optional, default is auto:best
  crop: 'fill',         // Optional, default is fill (crop to exact size)
});

console.log(sized);
// {
//   url: 'https://res.cloudinary.com/.../w_1080,h_1350,c_fill,f_jpg,q_auto:best/sample.jpg',
//   width: 1080,
//   height: 1350,
//   format: 'jpg',
//   estimatedSizeKB: 245,
//   cloudinaryTransform: 'w_1080,h_1350,c_fill,f_jpg,q_auto:best,dpr_auto',
//   aspectRatio: '4:5',
//   platform: 'instagram'
// }
```

#### Generate for Multiple Platforms

```typescript
const sourceImageUrl = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
const platforms = ['instagram', 'linkedin', 'twitter', 'pinterest'];

const images = await generatePlatformImages(sourceImageUrl, platforms);

console.log(images);
// {
//   instagram: { url: '...', width: 1080, height: 1440, ... },
//   linkedin: { url: '...', width: 1200, height: 627, ... },
//   twitter: { url: '...', width: 1600, height: 900, ... },
//   pinterest: { url: '...', width: 1000, height: 1500, ... }
// }
```

#### Validate Image

```typescript
const validation = validateImageForPlatform(
  1080,    // width
  1350,    // height
  2.5,     // file size in MB
  'jpg',   // format
  'instagram'
);

console.log(validation);
// {
//   isValid: true,
//   errors: [],
//   warnings: []
// }
```

#### Generate All Aspect Ratios

```typescript
// Generate all supported aspect ratios for A/B testing
const variations = await generateAllAspectRatios(sourceImageUrl, 'instagram');

// Returns array with square (1:1), portrait (4:5), portrait (3:4), landscape (1.91:1)
```

### Cloudinary Transformations

The service generates Cloudinary URLs with transformation parameters:

- `w_1080` - Width
- `h_1080` - Height
- `c_fill` - Crop mode (fill, scale, fit, pad, thumb)
- `f_jpg` - Format (jpg, png, webp, auto)
- `q_auto:best` - Quality (auto:best, auto:good, auto:low, or 1-100)
- `dpr_auto` - Device pixel ratio (Retina displays)

**Example URL:**
```
https://res.cloudinary.com/your-cloud/image/upload/w_1080,h_1350,c_fill,f_jpg,q_auto:best,dpr_auto/sample.jpg
```

### Helper Functions

```typescript
// Extract public ID from Cloudinary URL
const publicId = extractPublicId('https://res.cloudinary.com/.../sample.jpg');
// Returns: 'sample'

// Build custom transformation URL
const url = buildCloudinaryUrl('sample', 'w_500,h_500,c_thumb');

// Get preset transformations
const thumbTransform = getTransformationPreset('thumbnail');
// Returns: 'w_150,h_150,c_thumb,f_jpg,q_auto:low'

// Create responsive srcset
const srcset = createResponsiveSrcSet('sample', [320, 640, 1024, 1920]);
// Returns: 'https://...w_320... 320w, https://...w_640... 640w, ...'
```

---

## Service 4: n8n Posting

**File:** `server/services/n8nPostingService.ts`

### Features

1. **Webhook Posting** - POST to n8n webhooks per platform
2. **Batch Posting** - Post to multiple platforms in parallel
3. **Callback Handling** - Receive post status from n8n
4. **Status Checking** - Query n8n API for workflow execution status
5. **Error Handling** - Comprehensive error logging and retry support
6. **Configuration Validation** - Check n8n setup before posting

### Usage

#### Post to Single Platform

```typescript
const result = await postToN8n(
  'instagram',         // platform
  formattedContent,    // from contentFormatterService
  imageUrl,            // from imageSizingService
  'user_123',          // userId
  'post_456',          // scheduledPostId
  {
    generationId: 'gen_789',
    scheduledFor: new Date('2026-02-01T10:00:00Z'),
    callbackUrl: 'https://api.example.com/n8n/callback'
  }
);

console.log(result);
// {
//   success: true,
//   workflowExecutionId: 'exec_abc123',
//   webhookUrl: 'https://n8n.example.com/webhook/post/instagram'
// }
```

#### Post to Multiple Platforms

```typescript
const platforms = ['instagram', 'linkedin', 'facebook'];
const formattedContent = { /* from formatContentForMultiplePlatforms */ };
const platformImages = { /* from generatePlatformImages */ };

const results = await postToMultiplePlatforms(
  platforms,
  formattedContent,
  platformImages,
  'user_123',
  'post_456',
  {
    generationId: 'gen_789',
    scheduledFor: new Date(),
    callbackUrl: 'https://api.example.com/n8n/callback'
  }
);

console.log(results);
// {
//   instagram: { success: true, workflowExecutionId: '...' },
//   linkedin: { success: true, workflowExecutionId: '...' },
//   facebook: { success: false, error: 'Webhook timeout' }
// }
```

#### Handle n8n Callback

```typescript
// In your API endpoint: POST /api/n8n/callback
app.post('/api/n8n/callback', async (req, res) => {
  const callbackData = req.body as N8nCallbackData;

  await handleN8nCallback(callbackData);

  res.json({ status: 'ok' });
});

// Callback data structure:
// {
//   scheduledPostId: 'post_456_instagram',
//   success: true,
//   platformPostId: '123456789',
//   platformPostUrl: 'https://instagram.com/p/ABC123',
//   postedAt: '2026-01-25T10:00:00Z'
// }
```

#### Check Post Status

```typescript
const status = await getPostStatus('exec_abc123');

console.log(status);
// {
//   status: 'success',  // 'running' | 'success' | 'error' | 'waiting' | 'unknown'
//   finishedAt: '2026-01-25T10:05:32Z'
// }
```

#### Validate Configuration

```typescript
const validation = validateN8nConfig();

if (!validation.isValid) {
  console.error('n8n not configured:');
  validation.errors.forEach(e => console.error(`  - ${e}`));
}

if (validation.warnings.length > 0) {
  console.warn('n8n warnings:');
  validation.warnings.forEach(w => console.warn(`  - ${w}`));
}
```

---

## Complete End-to-End Example

```typescript
import {
  getPlatformSpecs,
  formatContentForMultiplePlatforms,
  generatePlatformImages,
  postToMultiplePlatforms,
} from './services';

async function postToSocialMedia() {
  // Step 1: Define content
  const caption = 'Exciting product launch today! 🚀';
  const hashtags = ['ProductLaunch', 'Innovation', 'Tech'];
  const sourceImageUrl = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
  const platforms = ['instagram', 'linkedin', 'twitter'];

  // Step 2: Format content for each platform
  const formattedContent = await formatContentForMultiplePlatforms(
    caption,
    hashtags,
    platforms
  );

  // Step 3: Generate platform-optimized images
  const platformImages = await generatePlatformImages(sourceImageUrl, platforms);
  const imageUrls = Object.fromEntries(
    Object.entries(platformImages).map(([platform, img]) => [platform, img.url])
  );

  // Step 4: Post to n8n webhooks
  const postResults = await postToMultiplePlatforms(
    platforms,
    formattedContent,
    imageUrls,
    'user_123',
    'post_456',
    {
      generationId: 'gen_789',
      scheduledFor: new Date(),
      callbackUrl: 'https://api.example.com/n8n/callback',
    }
  );

  // Step 5: Check results
  for (const [platform, result] of Object.entries(postResults)) {
    if (result.success) {
      console.log(`✅ ${platform}: Posted successfully (ID: ${result.workflowExecutionId})`);
    } else {
      console.error(`❌ ${platform}: Failed - ${result.error}`);
    }
  }
}
```

See `server/examples/multiPlatformPostingExample.ts` for 8 complete runnable examples.

---

## API Endpoint Integration

### Example Express Route

```typescript
import express from 'express';
import {
  formatContentForMultiplePlatforms,
  generatePlatformImages,
  postToMultiplePlatforms,
} from './services';

const router = express.Router();

router.post('/api/social-media/post', async (req, res) => {
  try {
    const { caption, hashtags, imageUrl, platforms, userId, scheduledFor } = req.body;

    // Validate input
    if (!caption || !platforms || !userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Format content
    const formattedContent = await formatContentForMultiplePlatforms(
      caption,
      hashtags || [],
      platforms
    );

    // Check for formatting errors
    const hasErrors = Object.values(formattedContent).some(c => !c.isValid);
    if (hasErrors) {
      const errors = Object.entries(formattedContent)
        .filter(([_, c]) => !c.isValid)
        .map(([platform, c]) => ({ platform, errors: c.errors }));

      return res.status(400).json({ error: 'Content formatting failed', details: errors });
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
        scheduledFor: scheduledFor ? new Date(scheduledFor) : new Date(),
        callbackUrl: `${process.env.API_BASE_URL}/api/n8n/callback`,
      }
    );

    // Return results
    return res.json({
      scheduledPostId,
      results: postResults,
      formattedContent,
      platformImages,
    });

  } catch (error) {
    console.error('Post error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Callback endpoint for n8n
router.post('/api/n8n/callback', async (req, res) => {
  try {
    await handleN8nCallback(req.body);
    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Callback error:', error);
    res.status(500).json({ error: 'Callback processing failed' });
  }
});

export default router;
```

---

## Testing

Run the comprehensive examples:

```bash
# Run all examples
npx tsx server/examples/multiPlatformPostingExample.ts

# Or run individual examples in Node REPL
node --loader tsx
> const { example3_formatSinglePlatform } = require('./server/examples/multiPlatformPostingExample.ts');
> await example3_formatSinglePlatform();
```

---

## n8n Workflow Setup

### Instagram Webhook Example

1. **Webhook Trigger** - `POST /webhook/post/instagram`
2. **Instagram Node** - Post to Instagram using credentials
3. **HTTP Request** (Optional) - POST callback to API with result

**Workflow JSON:**
```json
{
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "post/instagram",
        "responseMode": "responseNode",
        "options": {}
      }
    },
    {
      "name": "Instagram",
      "type": "n8n-nodes-base.instagram",
      "parameters": {
        "operation": "post",
        "caption": "={{$json.content.caption}}",
        "imageUrl": "={{$json.content.imageUrl}}"
      },
      "credentials": {
        "instagramApi": "instagram_account"
      }
    },
    {
      "name": "Callback",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "={{$json.callbackUrl}}",
        "method": "POST",
        "bodyParameters": {
          "parameters": [
            {
              "name": "scheduledPostId",
              "value": "={{$json.metadata.scheduledPostId}}"
            },
            {
              "name": "success",
              "value": "=true"
            },
            {
              "name": "platformPostId",
              "value": "={{$node['Instagram'].json.id}}"
            }
          ]
        }
      }
    }
  ]
}
```

Duplicate this workflow for each platform (LinkedIn, Twitter, Facebook, etc.).

---

## Error Handling

All services provide comprehensive error handling:

```typescript
// Content Formatter
const formatted = await formatContentForPlatform(caption, hashtags, 'instagram');
if (!formatted.isValid) {
  console.error('Formatting errors:', formatted.errors);
  console.warn('Warnings:', formatted.warnings);
}

// Image Sizing
const validation = validateImageForPlatform(width, height, size, format, platform);
if (!validation.isValid) {
  console.error('Image validation failed:', validation.errors);
}

// n8n Posting
const result = await postToN8n(platform, content, imageUrl, userId, postId);
if (!result.success) {
  console.error('Posting failed:', result.error);
  // Implement retry logic here
}
```

---

## Performance Considerations

1. **Parallel Processing** - All batch operations run in parallel
2. **Cloudinary CDN** - Images transformed on-the-fly, cached at edge
3. **No Local Storage** - All transformations via URL parameters
4. **Rate Limiting** - n8n handles platform rate limits
5. **Logging** - Structured logs with Pino for debugging

---

## Future Enhancements

- [ ] Database integration for `handleN8nCallback` (update scheduled posts)
- [ ] Retry logic for failed posts
- [ ] Scheduling system (post at specific times)
- [ ] Analytics tracking (engagement, reach, impressions)
- [ ] A/B testing for captions and images
- [ ] Carousel post support (multiple images)
- [ ] Video posting support
- [ ] Platform-specific features (Instagram Stories polls, LinkedIn articles, etc.)

---

## Troubleshooting

### "Platform not supported" error
- Check spelling of platform identifier
- Use `getAvailablePlatforms()` to see supported platforms

### "CLOUDINARY_CLOUD_NAME not configured" error
- Add Cloudinary credentials to `.env`
- Verify credentials are correct

### "N8N_BASE_URL not configured" error
- Add n8n base URL to `.env`
- Ensure n8n is running and accessible

### Images not loading in n8n
- Verify Cloudinary public ID is correct
- Check if image URL is publicly accessible
- Test URL directly in browser

### Webhook returning 404
- Verify webhook path matches n8n workflow
- Check n8n workflow is active
- Test webhook with curl: `curl -X POST https://n8n.example.com/webhook/post/instagram`

---

## Support

For questions or issues:
1. Check examples: `server/examples/multiPlatformPostingExample.ts`
2. Review service source code for detailed JSDoc comments
3. Check logs for error details
4. Verify environment configuration

---

**Last Updated:** January 25, 2026

**Services Version:** 1.0.0

**Platform Data Current As Of:** January 2026
