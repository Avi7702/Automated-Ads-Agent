# n8n Integration Guide

**Phase 8.1 Social Media Integration**
**Last Updated:** January 26, 2026

---

## Overview

This application uses **n8n** to manage OAuth authentication and social media posting instead of handling OAuth flows directly. This architecture provides:

- **Security:** OAuth tokens are managed by n8n, not stored in your app database
- **Simplicity:** No custom OAuth implementation to maintain
- **Reliability:** n8n handles automatic token refresh
- **Extensibility:** Easy to add new platforms via n8n nodes

---

## Architecture

```
Your App → Content Formatting → n8n Webhook → n8n Workflow → Social Platform API
         ↓                                                    ↓
         Format content for platform                         Post to LinkedIn/Instagram/etc.
         Generate platform images                            ↓
         ↓                                                    ↓
         ← n8n Callback ← n8n Workflow ← Posting Result ←───┘
         ↓
         Update database with result
```

---

## Setup Instructions

### Part 1: Configure OAuth Credentials in n8n

#### LinkedIn

1. **Create LinkedIn App:**
   - Go to https://www.linkedin.com/developers/apps
   - Click "Create app"
   - Fill in app details (name, logo, privacy policy URL)
   - Under "Products," select "Share on LinkedIn" and "Sign In with LinkedIn"
   - Copy your **Client ID** and **Client Secret**

2. **Add Credential in n8n:**
   - Go to n8n → Settings → Credentials → Add Credential
   - Select "LinkedIn OAuth2 API"
   - Enter Client ID and Client Secret
   - Redirect URL: `https://your-n8n-instance.com/rest/oauth2-credential/callback`
   - Click "Connect my account"
   - Authorize the application in LinkedIn popup
   - Save credential

#### Instagram (via Facebook Graph API)

1. **Create Facebook App:**
   - Go to https://developers.facebook.com/apps
   - Click "Create App" → "Business" type
   - Add "Instagram Graph API" product
   - Under Settings → Basic, copy **App ID** and **App Secret**

2. **Convert Instagram to Business Account:**
   - Instagram personal accounts CANNOT use the API
   - Go to Instagram app → Settings → Account → Switch to Professional Account
   - Choose "Business" or "Creator"
   - Link to a Facebook Page

3. **Add Credential in n8n:**
   - Go to n8n → Settings → Credentials → Add Credential
   - Select "Facebook Graph API"
   - Enter App ID and App Secret
   - Scopes: `instagram_basic,instagram_content_publish,pages_read_engagement`
   - Click "Connect my account"
   - Authorize in Facebook popup
   - Save credential

#### Facebook

1. **Use same Facebook App from Instagram setup**

2. **Add Credential in n8n:**
   - Select "Facebook Graph API"
   - Scopes: `pages_manage_posts,pages_read_engagement`

#### Twitter/X

1. **Create Twitter App:**
   - Go to https://developer.twitter.com/en/portal/dashboard
   - Create a project and app
   - Under "User authentication settings," enable OAuth 2.0
   - Copy **Client ID** and **Client Secret**

2. **Add Credential in n8n:**
   - Select "Twitter OAuth2 API"
   - Enter credentials
   - Scopes: `tweet.read,tweet.write,users.read`

---

### Part 2: Create n8n Posting Workflows

#### Example: LinkedIn Posting Workflow

**Nodes:**

1. **Webhook Trigger**
   - Path: `/webhook/post/linkedin`
   - Method: POST
   - Response Mode: "When Last Node Finishes"
   - Authentication: None (use API key validation in workflow)

2. **Function Node: Validate Payload**
   ```javascript
   // Validate required fields
   const { content, metadata } = $input.item.json.body;

   if (!content || !content.caption || !metadata || !metadata.scheduledPostId) {
     throw new Error('Missing required fields');
   }

   return { json: $input.item.json };
   ```

3. **LinkedIn Node**
   - Credential: Your LinkedIn OAuth2 credential
   - Resource: "Post"
   - Operation: "Create"
   - Text: `{{ $json.body.content.caption }}`
   - Visibility: "PUBLIC"
   - Media URL: `{{ $json.body.content.imageUrl }}`
   - Commentary: `{{ $json.body.content.caption }}`

4. **HTTP Request Node: Success Callback**
   - Method: POST
   - URL: `https://your-app.com/api/n8n/callback`
   - Headers: `Content-Type: application/json`
   - Body:
     ```json
     {
       "scheduledPostId": "{{ $json.body.metadata.scheduledPostId }}",
       "platform": "linkedin",
       "success": true,
       "platformPostId": "{{ $node['LinkedIn'].json.id }}",
       "platformPostUrl": "https://www.linkedin.com/feed/update/{{ $node['LinkedIn'].json.id }}",
       "executionId": "{{ $execution.id }}"
     }
     ```

5. **Error Trigger + HTTP Request Node: Failure Callback**
   - Method: POST
   - URL: `https://your-app.com/api/n8n/callback`
   - Body:
     ```json
     {
       "scheduledPostId": "{{ $json.body.metadata.scheduledPostId }}",
       "platform": "linkedin",
       "success": false,
       "error": "{{ $node['LinkedIn'].error.message }}",
       "executionId": "{{ $execution.id }}"
     }
     ```

6. **Save and Activate Workflow**

---

#### Example: Instagram Posting Workflow

**Important Notes:**
- Instagram requires images to be publicly accessible URLs
- Videos must be in MP4 format, 9:16 aspect ratio
- Captions limited to 2,200 characters

**Nodes:**

1. **Webhook Trigger** (same as LinkedIn)

2. **Function Node: Validate Instagram Requirements**
   ```javascript
   const { content } = $input.item.json.body;

   // Instagram-specific validation
   if (content.caption.length > 2200) {
     throw new Error('Caption exceeds 2,200 character limit');
   }

   if (!content.imageUrl || !content.imageUrl.startsWith('http')) {
     throw new Error('Image URL must be publicly accessible');
   }

   return { json: $input.item.json };
   ```

3. **Instagram Node**
   - Credential: Facebook Graph API credential
   - Resource: "Media"
   - Operation: "Create"
   - Instagram Account ID: (your business account ID)
   - Image URL: `{{ $json.body.content.imageUrl }}`
   - Caption: `{{ $json.body.content.caption }}`

4. **HTTP Request Node: Callback** (same structure as LinkedIn)

---

### Part 3: Sync Accounts to Your App

**Option A: Manual Sync (Recommended)**

1. User configures OAuth in n8n (one-time setup per platform)
2. User clicks "Sync Accounts from n8n" in your app UI
3. Your app calls n8n API to discover connected credentials
4. Your app stores references in `social_connections` table

**API Endpoint:** `POST /api/social/sync-accounts`

**Payload:**
```json
{
  "platform": "linkedin",
  "n8nCredentialId": "cr_123abc",
  "platformUserId": "urn:li:person:abc123",
  "platformUsername": "john-doe",
  "accountType": "personal"
}
```

**Option B: Automatic Discovery (Future Enhancement)**

Query n8n API to list all credentials and auto-sync:

```bash
curl -X GET https://n8n-instance.com/api/v1/credentials \
  -H "X-N8N-API-KEY: your-api-key"
```

---

## Content Formatting Flow

### Step 1: Generate Content in Your App

User generates content via AI or manual input in Approval Queue (Phase 8.0).

### Step 2: Format for Each Platform

Your app's `contentFormatterService.ts` validates content against platform specs:

```typescript
import { formatContentForPlatform } from './services/contentFormatterService';

const formatted = await formatContentForPlatform(
  caption,
  hashtags,
  'linkedin',
  'feed'
);

// Returns:
// {
//   caption: "Formatted caption with #hashtags",
//   hashtags: ["Business", "News"],
//   warnings: [],
//   errors: [],
//   metadata: { characterCount: 245, hashtagCount: 2 }
// }
```

### Step 3: Generate Platform-Specific Images

Your app's `imageSizingService.ts` creates optimized images via Cloudinary:

```typescript
import { generatePlatformImages } from './services/imageSizingService';

const images = await generatePlatformImages(
  originalImageUrl,
  ['linkedin', 'instagram']
);

// Returns:
// {
//   linkedin: {
//     url: "https://res.cloudinary.com/.../w_1200,h_627,c_fill/image.jpg",
//     width: 1200,
//     height: 627,
//     format: "jpg"
//   },
//   instagram: {
//     url: "https://res.cloudinary.com/.../w_1080,h_1080,c_fill/image.jpg",
//     width: 1080,
//     height: 1080,
//     format: "jpg"
//   }
// }
```

### Step 4: Send to n8n Webhooks

Your app's `n8nPostingService.ts` triggers n8n workflows:

```typescript
import { postToN8n } from './services/n8nPostingService';

const result = await postToN8n(
  'linkedin',
  formatted,
  images.linkedin.url,
  userId,
  scheduledPostId
);

// n8n receives:
// {
//   platform: "linkedin",
//   userId: "user_123",
//   content: {
//     caption: "Exciting news! 🎉...",
//     imageUrl: "https://res.cloudinary.com/.../image.jpg"
//   },
//   metadata: {
//     scheduledPostId: "post_789",
//     generationId: "gen_456"
//   }
// }
```

### Step 5: n8n Posts to Platform

n8n workflow executes LinkedIn node, which posts to LinkedIn API.

### Step 6: n8n Sends Callback

n8n HTTP Request node sends result back to your app:

```json
{
  "scheduledPostId": "post_789",
  "platform": "linkedin",
  "success": true,
  "platformPostId": "urn:li:share:7156789",
  "platformPostUrl": "https://linkedin.com/feed/update/urn:li:share:7156789",
  "executionId": "n8n_exec_123"
}
```

### Step 7: Your App Updates Database

`POST /api/n8n/callback` route updates `scheduledPosts` table:

```typescript
await storage.updateScheduledPost(scheduledPostId, {
  status: 'published',
  publishedAt: new Date(),
  platformPostId: 'urn:li:share:7156789',
  platformPostUrl: 'https://linkedin.com/...'
});
```

### Step 8: User Sees Success

UI shows toast notification: "✅ Posted to LinkedIn successfully!"

---

## API Reference

### Your App → n8n

#### POST to n8n Webhook

**Endpoint:** `https://n8n-instance.com/webhook/post/{platform}`

**Platforms:** `linkedin`, `instagram`, `facebook`, `twitter`, `tiktok`, `youtube`, `pinterest`

**Request Body:**
```json
{
  "platform": "linkedin",
  "userId": "user_123",
  "content": {
    "caption": "Post caption with #hashtags",
    "imageUrl": "https://res.cloudinary.com/.../image.jpg",
    "videoUrl": null
  },
  "metadata": {
    "scheduledPostId": "post_789",
    "generationId": "gen_456",
    "timestamp": "2026-01-26T10:30:00Z"
  },
  "formatting": {
    "characterCount": 245,
    "hashtagCount": 2,
    "warnings": []
  }
}
```

**Response:**
```json
{
  "success": true,
  "executionId": "n8n_exec_123",
  "message": "Workflow triggered successfully"
}
```

---

### n8n → Your App

#### POST /api/n8n/callback

**Purpose:** Receive posting results from n8n workflows

**Request Body (Success):**
```json
{
  "scheduledPostId": "post_789",
  "platform": "linkedin",
  "success": true,
  "platformPostId": "urn:li:share:7156789",
  "platformPostUrl": "https://linkedin.com/feed/update/urn:li:share:7156789",
  "executionId": "n8n_exec_123"
}
```

**Request Body (Failure):**
```json
{
  "scheduledPostId": "post_789",
  "platform": "linkedin",
  "success": false,
  "error": "Token expired - please re-authorize LinkedIn in n8n",
  "executionId": "n8n_exec_124"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Callback processed successfully"
}
```

---

#### POST /api/social/sync-accounts

**Purpose:** Sync account reference from n8n to your app

**Request Body:**
```json
{
  "platform": "linkedin",
  "n8nCredentialId": "cr_123abc",
  "platformUserId": "urn:li:person:abc123",
  "platformUsername": "john-doe",
  "accountType": "personal",
  "tokenExpiresAt": "2026-12-31T23:59:59Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "conn_xyz789",
    "userId": "user_123",
    "platform": "linkedin",
    "platformUsername": "john-doe",
    "status": "active",
    "connectedAt": "2026-01-26T10:30:00Z"
  },
  "message": "linkedin account synced successfully"
}
```

---

## Platform-Specific Requirements

### LinkedIn

- **Character Limit:** 3,000 (recommended 150-250)
- **Hashtags:** Max 30, recommended 3-5
- **Images:** JPG/PNG, max 5MB, 1200x627px recommended
- **Videos:** MP4, max 200MB, 75KB-200MB recommended
- **API Scope:** `w_member_social`, `r_liteprofile`

### Instagram

- **Character Limit:** 2,200
- **Hashtags:** Max 30, recommended 5-10
- **Images:** JPG only, 1080x1080px (square) or 1080x1350px (portrait)
- **Videos:** MP4, 9:16 aspect ratio (vertical), max 60 seconds
- **Requirement:** Business or Creator account only
- **API:** Facebook Graph API

### Facebook

- **Character Limit:** 63,206 (recommended <500)
- **Hashtags:** Supported but less effective than Instagram
- **Images:** JPG/PNG, 1200x630px recommended
- **Videos:** MP4, max 1GB

### Twitter/X

- **Character Limit:** 280 (4,000 for Twitter Blue)
- **Hashtags:** Recommended 1-2
- **Images:** JPG/PNG/GIF, max 5MB, 1200x675px recommended
- **Videos:** MP4, max 512MB, 2:20 max length

### TikTok

- **Character Limit:** 2,200
- **Hashtags:** Recommended 3-5
- **Videos Only:** MP4, 9:16 vertical, 15s-10min
- **Requirement:** Business account

### YouTube

- **Title:** Max 100 characters
- **Description:** Max 5,000 characters
- **Videos Only:** MP4/MOV, max 256GB
- **Thumbnails:** JPG/PNG, 1280x720px

### Pinterest

- **Character Limit:** 500 (description)
- **Images:** JPG/PNG, 1000x1500px recommended (2:3 ratio)
- **Videos:** MP4, max 2GB

---

## Error Handling

### Common Errors

#### 1. Token Expired

**Error:** "Token expired - please re-authorize LinkedIn in n8n"

**Solution:**
- Go to n8n → Credentials → Select LinkedIn credential → Click "Reconnect"
- n8n will automatically refresh tokens, but expired credentials need manual re-auth

#### 2. Invalid Image URL

**Error:** "Image URL must be publicly accessible"

**Solution:**
- Ensure Cloudinary URLs are public (not signed URLs)
- Check firewall/CORS settings

#### 3. Character Limit Exceeded

**Error:** "Caption exceeds 2,200 character limit"

**Solution:**
- Use `contentFormatterService` to validate before posting
- Truncate caption with "... (read more)" link

#### 4. n8n Webhook Timeout

**Error:** "Workflow did not respond within 30 seconds"

**Solution:**
- Check n8n workflow execution logs
- Verify webhook is active
- Increase timeout in n8n settings

---

## Troubleshooting

### Issue: Account not appearing after sync

**Diagnosis:**
1. Check n8n credentials are connected: n8n → Credentials → Check OAuth status
2. Verify `POST /api/social/sync-accounts` was called with correct payload
3. Check database: `SELECT * FROM social_connections WHERE platform = 'linkedin'`

**Fix:**
- Click "Sync Accounts from n8n" button again
- Verify n8nCredentialId matches the credential ID in n8n

---

### Issue: Post fails with "Invalid credentials"

**Diagnosis:**
1. Check n8n workflow execution logs
2. Verify OAuth credential in n8n is still connected
3. Check platform API status (e.g., LinkedIn API down)

**Fix:**
- Reconnect credential in n8n
- Test credential by running workflow manually in n8n

---

### Issue: Callback never received

**Diagnosis:**
1. Check n8n workflow has HTTP Request callback node
2. Verify callback URL is correct: `https://your-app.com/api/n8n/callback`
3. Check firewall allows n8n → your app communication

**Fix:**
- Add HTTP Request node to n8n workflow
- Ensure callback URL is publicly accessible
- Check network logs in n8n

---

## Testing Checklist

### Setup Testing

- [ ] OAuth configured in n8n for LinkedIn
- [ ] OAuth configured in n8n for Instagram
- [ ] n8n posting workflow created for LinkedIn
- [ ] n8n posting workflow created for Instagram
- [ ] Webhooks activated in n8n
- [ ] Accounts synced to your app

### End-to-End Testing

- [ ] Generate content in your app
- [ ] Approve content in approval queue
- [ ] Click "Post to LinkedIn"
- [ ] n8n receives webhook (check n8n executions)
- [ ] n8n posts to LinkedIn (check LinkedIn feed)
- [ ] n8n sends callback to your app (check network logs)
- [ ] Your app updates database (check `scheduledPosts` table)
- [ ] UI shows success toast

### Error Testing

- [ ] Post with expired token → Error displayed
- [ ] Post with invalid image URL → Error displayed
- [ ] Post with character limit exceeded → Error displayed
- [ ] n8n workflow disabled → Error displayed
- [ ] Network timeout → Graceful handling

---

## Production Deployment

### Checklist

1. **n8n Instance:**
   - [ ] n8n hosted on reliable infrastructure (e.g., Railway, Render, AWS)
   - [ ] n8n secured with API key authentication
   - [ ] n8n SSL/TLS enabled (HTTPS)
   - [ ] n8n backup/restore configured

2. **OAuth Credentials:**
   - [ ] Production OAuth apps created (LinkedIn, Facebook, etc.)
   - [ ] Redirect URLs updated for production n8n instance
   - [ ] Credentials stored securely in n8n

3. **Webhooks:**
   - [ ] Webhook URLs updated to production app domain
   - [ ] Firewall rules allow n8n → app communication
   - [ ] Rate limiting configured on webhooks

4. **Monitoring:**
   - [ ] n8n execution logs monitored
   - [ ] App callback handler logs monitored
   - [ ] Alerts configured for failed workflows

5. **Database:**
   - [ ] `social_connections` table created (via `npm run db:push`)
   - [ ] Indexes created for performance
   - [ ] Backup schedule configured

---

## Security Considerations

### OAuth Tokens

- ✅ **Secured:** Tokens stored in n8n, not in your app database
- ✅ **Encrypted:** n8n encrypts credentials at rest
- ✅ **Auto-Refresh:** n8n handles token refresh automatically

### API Keys

- 🔒 Protect n8n API key (used for querying credentials)
- 🔒 Use environment variables, never hardcode
- 🔒 Rotate API keys periodically

### Webhooks

- 🔒 Validate execution IDs to prevent replay attacks
- 🔒 Use HTTPS for all webhook communication
- 🔒 Consider adding webhook signature verification

### User Data

- 🔒 Only store references (n8nCredentialId), not tokens
- 🔒 Delete social_connections when user deletes account
- 🔒 Comply with GDPR/privacy regulations

---

## n8n Workflow JSON Exports

### LinkedIn Posting Workflow

```json
{
  "name": "LinkedIn Posting Workflow",
  "nodes": [
    {
      "parameters": {
        "path": "post/linkedin",
        "responseMode": "lastNode",
        "options": {}
      },
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [250, 300]
    },
    {
      "parameters": {
        "resource": "post",
        "operation": "create",
        "text": "={{ $json.body.content.caption }}",
        "additionalFields": {
          "visibility": "PUBLIC"
        }
      },
      "name": "LinkedIn",
      "type": "n8n-nodes-base.linkedIn",
      "typeVersion": 1,
      "position": [450, 300],
      "credentials": {
        "linkedInOAuth2Api": {
          "id": "YOUR_CREDENTIAL_ID",
          "name": "LinkedIn account"
        }
      }
    },
    {
      "parameters": {
        "url": "https://your-app.com/api/n8n/callback",
        "options": {},
        "bodyParametersJson": "={{ JSON.stringify({\n  scheduledPostId: $json.body.metadata.scheduledPostId,\n  platform: 'linkedin',\n  success: true,\n  platformPostId: $node['LinkedIn'].json.id,\n  executionId: $execution.id\n}) }}"
      },
      "name": "Success Callback",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [650, 300]
    }
  ],
  "connections": {
    "Webhook": {
      "main": [[{ "node": "LinkedIn", "type": "main", "index": 0 }]]
    },
    "LinkedIn": {
      "main": [[{ "node": "Success Callback", "type": "main", "index": 0 }]]
    }
  }
}
```

---

## Additional Resources

- [n8n Documentation](https://docs.n8n.io/)
- [LinkedIn API Docs](https://learn.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/share-api)
- [Instagram Graph API Docs](https://developers.facebook.com/docs/instagram-api)
- [Twitter API Docs](https://developer.twitter.com/en/docs/twitter-api)
- [Cloudinary Transformations](https://cloudinary.com/documentation/image_transformations)

---

## Support

**Issues:** https://github.com/your-repo/issues
**n8n Community:** https://community.n8n.io/

---

**Generated with Claude Code**
