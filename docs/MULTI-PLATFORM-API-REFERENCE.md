# Multi-Platform Posting API Reference

Quick reference for all services, functions, and types.

---

## Platform Specifications Service

**File:** `server/services/platformSpecsService.ts`

### Functions

#### `getPlatformSpecs(platform: string): PlatformSpecs | undefined`
Get complete specifications for a platform.

```typescript
const specs = getPlatformSpecs('instagram');
// Returns: { platform, displayName, caption, hashtags, image, video, features }
```

#### `getAvailablePlatforms(): string[]`
Get all supported platform identifiers.

```typescript
const platforms = getAvailablePlatforms();
// Returns: ['linkedin', 'instagram', 'facebook', 'twitter', ...]
```

#### `isPlatformSupported(platform: string): boolean`
Check if a platform is supported.

```typescript
const isSupported = isPlatformSupported('instagram');
// Returns: true
```

#### `getRecommendedAspectRatio(platform: string)`
Get recommended aspect ratio for a platform.

```typescript
const aspectRatio = getRecommendedAspectRatio('instagram');
// Returns: { name: 'Portrait', ratio: '3:4', width: 1080, height: 1440, recommended: true }
```

#### `getAspectRatios(platform: string)`
Get all aspect ratios for a platform.

```typescript
const ratios = getAspectRatios('instagram');
// Returns: Array of aspect ratio objects
```

### Types

```typescript
interface PlatformSpecs {
  platform: string;
  displayName: string;
  caption: {
    minLength: number;
    maxLength: number;
    recommended: number;
    truncationPoint?: number;
    notes?: string;
  };
  hashtags: {
    min: number;
    max: number;
    recommended: number;
    position: 'inline' | 'end' | 'both' | 'none';
    requiresSymbol: boolean;
    notes?: string;
  };
  image: {
    formats: string[];
    maxSizeMB: number;
    minWidth: number;
    minHeight: number;
    aspectRatios: Array<{
      name: string;
      ratio: string;
      width: number;
      height: number;
      recommended: boolean;
      notes?: string;
    }>;
  };
  video?: {
    formats: string[];
    maxSizeMB: number;
    maxDurationSeconds: number;
    minDurationSeconds: number;
    aspectRatios?: string[];
  };
  features: {
    supportsCarousel: boolean;
    supportsStories: boolean;
    supportsReels: boolean;
    supportsPolls: boolean;
    supportsLinks: boolean;
    linkPosition?: 'caption' | 'firstComment' | 'bio' | 'anywhere';
    supportsEmojis: boolean;
    professionalPlatform: boolean;
  };
  limits?: {
    maxImagesPerPost?: number;
    maxHashtagsTotal?: number;
    maxMentions?: number;
  };
}
```

---

## Content Formatter Service

**File:** `server/services/contentFormatterService.ts`

### Functions

#### `formatContentForPlatform(caption, hashtags, platform, contentType?): Promise<FormattedContent>`
Format content for a specific platform.

```typescript
const formatted = await formatContentForPlatform(
  'My caption with link https://example.com',
  ['Marketing', 'Business'],
  'instagram'
);

// Returns FormattedContent object
```

#### `formatContentForMultiplePlatforms(caption, hashtags, platforms): Promise<Record<string, FormattedContent>>`
Format content for multiple platforms in parallel.

```typescript
const results = await formatContentForMultiplePlatforms(
  'My caption',
  ['Marketing'],
  ['instagram', 'linkedin', 'twitter']
);

// Returns: { instagram: {...}, linkedin: {...}, twitter: {...} }
```

#### `generateCaptionSuggestions(originalCaption, platform): string[]`
Generate optimized caption suggestions.

```typescript
const suggestions = generateCaptionSuggestions(longCaption, 'twitter');
// Returns: ['Original caption', 'Truncated to recommended', 'Truncated to "See more"']
```

### Types

```typescript
interface FormattedContent {
  caption: string;
  hashtags: string[];
  characterCount: number;
  hashtagCount: number;
  warnings: string[];
  errors: string[];
  isValid: boolean;
  imageRequirements?: {
    aspectRatio: string;
    minWidth: number;
    minHeight: number;
    formats: string[];
    maxSizeMB: number;
  };
  platform: string;
  truncated: boolean;
  emojiCount: number;
  linkHandling?: {
    linksDetected: number;
    linksRemoved: number;
    message?: string;
  };
}

type ContentType = 'feed' | 'story' | 'reel' | 'short' | 'video';
```

---

## Image Sizing Service

**File:** `server/services/imageSizingService.ts`

### Functions

#### `resizeImageForPlatform(sourceImageUrl, options): Promise<SizedImage>`
Resize image for a specific platform.

```typescript
const sized = await resizeImageForPlatform(
  'https://res.cloudinary.com/demo/image/upload/sample.jpg',
  {
    platform: 'instagram',
    aspectRatio: '4:5',  // Optional
    format: 'jpg',        // Optional
    quality: 'auto:best', // Optional
    crop: 'fill',         // Optional
  }
);

// Returns SizedImage object with URL and metadata
```

#### `generatePlatformImages(sourceImageUrl, platforms, options?): Promise<Record<string, SizedImage>>`
Generate images for multiple platforms in parallel.

```typescript
const images = await generatePlatformImages(
  'https://res.cloudinary.com/demo/image/upload/sample.jpg',
  ['instagram', 'linkedin', 'twitter']
);

// Returns: { instagram: {...}, linkedin: {...}, twitter: {...} }
```

#### `generateAllAspectRatios(sourceImageUrl, platform): Promise<SizedImage[]>`
Generate all aspect ratio variations for a platform.

```typescript
const variations = await generateAllAspectRatios(sourceImageUrl, 'instagram');
// Returns: Array of SizedImage objects (square, portrait, landscape, etc.)
```

#### `validateImageForPlatform(width, height, fileSizeMB, format, platform)`
Validate image against platform requirements.

```typescript
const validation = validateImageForPlatform(1080, 1350, 2.5, 'jpg', 'instagram');
// Returns: { isValid: true, errors: [], warnings: [] }
```

#### `extractPublicId(cloudinaryUrl): string`
Extract public ID from Cloudinary URL.

```typescript
const publicId = extractPublicId('https://res.cloudinary.com/.../sample.jpg');
// Returns: 'sample'
```

#### `buildCloudinaryUrl(publicId, transformations): string`
Build Cloudinary URL with transformations.

```typescript
const url = buildCloudinaryUrl('sample', 'w_1080,h_1080,c_fill');
// Returns: 'https://res.cloudinary.com/.../w_1080,h_1080,c_fill/sample'
```

#### `getTransformationPreset(useCase): string`
Get preset transformation string.

```typescript
const transform = getTransformationPreset('thumbnail');
// Returns: 'w_150,h_150,c_thumb,f_jpg,q_auto:low'
// Use cases: 'thumbnail' | 'preview' | 'full' | 'optimized'
```

#### `createResponsiveSrcSet(publicId, widths?): string`
Create responsive srcset for web.

```typescript
const srcset = createResponsiveSrcSet('sample', [320, 640, 1024]);
// Returns: 'https://...w_320... 320w, https://...w_640... 640w, ...'
```

### Types

```typescript
interface ImageSizingOptions {
  platform: string;
  contentType?: 'feed' | 'story' | 'reel' | 'short';
  aspectRatio?: string;
  format?: 'jpg' | 'png' | 'webp';
  quality?: 'auto' | 'auto:best' | 'auto:good' | 'auto:low' | number;
  crop?: 'fill' | 'scale' | 'fit' | 'pad' | 'thumb';
}

interface SizedImage {
  url: string;
  width: number;
  height: number;
  format: string;
  estimatedSizeKB: number;
  cloudinaryTransform: string;
  aspectRatio: string;
  platform: string;
  contentType?: string;
}
```

---

## n8n Posting Service

**File:** `server/services/n8nPostingService.ts`

### Functions

#### `postToN8n(platform, content, imageUrl, userId, scheduledPostId, options?): Promise<N8nPostResult>`
Post content to n8n webhook for a single platform.

```typescript
const result = await postToN8n(
  'instagram',
  formattedContent,
  imageUrl,
  'user_123',
  'post_456',
  {
    videoUrl: 'https://...',     // Optional
    generationId: 'gen_789',     // Optional
    templateId: 'template_012',  // Optional
    scheduledFor: new Date(),    // Optional
    callbackUrl: 'https://...',  // Optional
  }
);

// Returns: { success: true, workflowExecutionId: 'exec_abc', webhookUrl: '...' }
```

#### `postToMultiplePlatforms(platforms, formattedContent, platformImages, userId, baseScheduledPostId, options?): Promise<Record<string, N8nPostResult>>`
Post to multiple platforms in parallel.

```typescript
const results = await postToMultiplePlatforms(
  ['instagram', 'linkedin'],
  { instagram: formattedInstagram, linkedin: formattedLinkedIn },
  { instagram: imgUrl1, linkedin: imgUrl2 },
  'user_123',
  'post_456',
  {
    generationId: 'gen_789',
    scheduledFor: new Date(),
    callbackUrl: 'https://...',
  }
);

// Returns: { instagram: {...}, linkedin: {...} }
```

#### `handleN8nCallback(data): Promise<void>`
Handle callback from n8n after posting.

```typescript
await handleN8nCallback({
  scheduledPostId: 'post_456_instagram',
  success: true,
  platformPostId: '123456789',
  platformPostUrl: 'https://instagram.com/p/ABC',
  postedAt: '2026-01-25T10:00:00Z',
});
```

#### `getPostStatus(workflowExecutionId): Promise<{status, error?, finishedAt?}>`
Check workflow execution status.

```typescript
const status = await getPostStatus('exec_abc123');
// Returns: { status: 'success', finishedAt: '2026-01-25T10:05:32Z' }
// Status: 'running' | 'success' | 'error' | 'waiting' | 'unknown'
```

#### `validateN8nConfig(): {isValid, errors, warnings}`
Validate n8n environment configuration.

```typescript
const validation = validateN8nConfig();
// Returns: { isValid: true, errors: [], warnings: [] }
```

### Types

```typescript
interface N8nPostPayload {
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
  formatting?: {
    characterCount: number;
    hashtagCount: number;
    truncated: boolean;
    warnings: string[];
  };
  callbackUrl?: string;
}

interface N8nCallbackData {
  scheduledPostId: string;
  success: boolean;
  platformPostId?: string;
  platformPostUrl?: string;
  error?: string;
  errorCode?: string;
  postedAt?: string;
  metadata?: Record<string, any>;
}

interface N8nPostResult {
  success: boolean;
  workflowExecutionId?: string;
  error?: string;
  webhookUrl: string;
}
```

---

## Platform Identifiers

Use these exact strings when calling functions:

| Platform | Identifier | Notes |
|----------|------------|-------|
| LinkedIn Personal | `linkedin` | Personal profile posts |
| LinkedIn Company | `linkedin-company` | Company page posts |
| Instagram Feed | `instagram` | Regular feed posts |
| Instagram Story | `instagram-story` | 24-hour stories |
| Instagram Reel | `instagram-reel` | Short-form video |
| Facebook Personal | `facebook` | Personal profile |
| Facebook Page | `facebook-page` | Business pages |
| Twitter/X | `twitter` | Standard posts |
| TikTok | `tiktok` | Video posts |
| YouTube Regular | `youtube` | Standard videos |
| YouTube Shorts | `youtube-shorts` | Short-form vertical video |
| Pinterest | `pinterest` | Pins |

---

## Common Workflows

### Workflow 1: Single Platform Post

```typescript
// 1. Get platform specs
const specs = getPlatformSpecs('instagram');

// 2. Format content
const formatted = await formatContentForPlatform(caption, hashtags, 'instagram');

// 3. Generate image
const sized = await resizeImageForPlatform(imageUrl, { platform: 'instagram' });

// 4. Post to n8n
const result = await postToN8n('instagram', formatted, sized.url, userId, postId);
```

### Workflow 2: Multi-Platform Post

```typescript
const platforms = ['instagram', 'linkedin', 'twitter'];

// 1. Format content for all platforms
const formattedContent = await formatContentForMultiplePlatforms(
  caption,
  hashtags,
  platforms
);

// 2. Generate images for all platforms
const platformImages = await generatePlatformImages(imageUrl, platforms);
const imageUrls = Object.fromEntries(
  Object.entries(platformImages).map(([p, img]) => [p, img.url])
);

// 3. Post to all platforms
const results = await postToMultiplePlatforms(
  platforms,
  formattedContent,
  imageUrls,
  userId,
  postId
);
```

### Workflow 3: Content Validation

```typescript
// Validate content
const formatted = await formatContentForPlatform(caption, hashtags, 'instagram');

if (!formatted.isValid) {
  console.error('Content errors:', formatted.errors);
  return;
}

if (formatted.warnings.length > 0) {
  console.warn('Content warnings:', formatted.warnings);
}

// Validate image
const validation = validateImageForPlatform(width, height, sizeMB, format, 'instagram');

if (!validation.isValid) {
  console.error('Image errors:', validation.errors);
  return;
}
```

---

## Environment Variables

Required:

```bash
# Cloudinary (for image transformations)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# n8n (for posting automation)
N8N_BASE_URL=https://your-n8n-instance.com
```

Optional:

```bash
# n8n API key (for status checking)
N8N_API_KEY=your-n8n-api-key
```

---

## Error Handling

All services return structured errors/warnings:

```typescript
// Content Formatter
interface FormattedContent {
  isValid: boolean;
  errors: string[];     // Fatal errors (invalid platform, etc.)
  warnings: string[];   // Non-fatal issues (truncation, link removal, etc.)
}

// Image Sizing
interface ImageValidation {
  isValid: boolean;
  errors: string[];     // Fatal errors (size limit, format, etc.)
  warnings: string[];   // Non-fatal issues (aspect ratio mismatch, etc.)
}

// n8n Posting
interface N8nPostResult {
  success: boolean;
  error?: string;       // Error message if failed
}
```

---

## Logging

All services use structured logging with Pino:

```typescript
import { logger } from '../lib/logger';

logger.info({ platform, userId }, 'Posting to n8n webhook');
logger.warn({ platform }, 'Platform specifications not found');
logger.error({ error, platform }, 'Content formatting failed');
```

Logs include:
- Timestamps (ISO 8601)
- Service context
- Operation metadata
- Duration metrics
- Error details

---

## Testing

Run examples:

```bash
# All examples
npx tsx server/examples/multiPlatformPostingExample.ts

# Individual example
node --loader tsx
> const { example3_formatSinglePlatform } = require('./server/examples/multiPlatformPostingExample.ts');
> await example3_formatSinglePlatform();
```

---

## Performance

- **Parallel Processing**: All batch operations use `Promise.all()`
- **No Local Storage**: Images transformed via Cloudinary URL
- **CDN Caching**: Cloudinary caches transformed images at edge
- **Streaming**: Large payloads use streaming where possible
- **Retry Logic**: Built-in retry for n8n webhooks (3 attempts)

---

## Limits

| Operation | Limit | Notes |
|-----------|-------|-------|
| Platforms per batch | 10 | Recommended, no hard limit |
| Image size | 30MB | Platform-dependent |
| Caption length | 63,206 chars | Facebook max |
| Hashtags | 30 | Instagram/LinkedIn max |
| Cloudinary transforms | Unlimited | URL-based, no storage |

---

## Support

- **Examples**: `server/examples/multiPlatformPostingExample.ts`
- **Docs**: `docs/MULTI-PLATFORM-POSTING-SERVICES.md`
- **Source Code**: All services have comprehensive JSDoc comments

---

**Last Updated:** January 25, 2026
