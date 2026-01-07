# Phase 7: API Key Management Feature

## Overview

Allow users to manage API keys for external services directly from the UI instead of requiring Railway environment variable changes.

**Target URL**: `/settings/api-keys`
**Production**: `https://automated-ads-agent-production.up.railway.app/settings/api-keys`

---

## Security Architecture (2025-2026 Best Practices)

### Encryption
- **Algorithm**: AES-256-GCM (authenticated encryption)
- **Master Key**: `API_KEY_ENCRYPTION_KEY` environment variable (32 bytes)
- **IV**: Unique 12-byte IV per encryption (stored with ciphertext)
- **Auth Tag**: 16 bytes, stored with ciphertext

### Key Resolution Pattern
```
User Request → Check user's custom key in DB → If exists, decrypt and use
                                             → If not, fall back to ENV var
```

### Display Security
- **Never** return full key after initial save
- Display only masked version: `sk-...abc123` (first 3 + last 6 chars)
- Full key only visible during initial entry

---

## Database Schema

### Table: `userApiKeys`
```sql
CREATE TABLE user_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service VARCHAR(50) NOT NULL,  -- 'gemini', 'cloudinary', 'firecrawl', 'redis'
  encrypted_key TEXT NOT NULL,   -- AES-256-GCM encrypted
  iv TEXT NOT NULL,              -- Base64 encoded IV
  auth_tag TEXT NOT NULL,        -- Base64 encoded auth tag
  key_preview VARCHAR(20),       -- 'sk-...abc123' for display
  is_valid BOOLEAN DEFAULT true,
  last_validated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, service)
);
```

### Table: `apiKeyAuditLog`
```sql
CREATE TABLE api_key_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  service VARCHAR(50) NOT NULL,
  action VARCHAR(20) NOT NULL,  -- 'create', 'update', 'delete', 'validate', 'use'
  ip_address VARCHAR(45),
  user_agent TEXT,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Services

### 1. Encryption Service (`server/services/encryptionService.ts`)

```typescript
interface EncryptedData {
  ciphertext: string;  // Base64
  iv: string;          // Base64
  authTag: string;     // Base64
}

export function encryptApiKey(plaintext: string): EncryptedData;
export function decryptApiKey(encrypted: EncryptedData): string;
export function generateKeyPreview(key: string): string;
```

### 2. API Key Validation Service (`server/services/apiKeyValidationService.ts`)

Per-service validation:

| Service | Validation Method |
|---------|-------------------|
| Gemini | `GET /v1beta/models` with key |
| Cloudinary | `GET /v1_1/{cloud}/resources/image` |
| Firecrawl | `GET /health` with API key header |
| Redis | `PING` command |

```typescript
export async function validateApiKey(service: string, key: string): Promise<{
  valid: boolean;
  error?: string;
  details?: any;
}>;
```

### 3. API Key Storage (`server/storage.ts` additions)

```typescript
// CRUD operations
getUserApiKey(userId: string, service: string): Promise<UserApiKey | null>
getAllUserApiKeys(userId: string): Promise<UserApiKey[]>
saveUserApiKey(userId: string, service: string, encryptedData: EncryptedData): Promise<UserApiKey>
deleteUserApiKey(userId: string, service: string): Promise<void>

// Resolution (with fallback)
resolveApiKey(userId: string, service: string): Promise<string | null>

// Audit logging
logApiKeyAction(entry: ApiKeyAuditEntry): Promise<void>
```

---

## API Endpoints

### `GET /api/settings/api-keys`
Returns list of configured services with status (not the actual keys).

**Response:**
```json
{
  "keys": [
    {
      "service": "gemini",
      "configured": true,
      "source": "user",  // or "environment"
      "keyPreview": "AIza...xyz789",
      "isValid": true,
      "lastValidated": "2025-01-05T10:30:00Z"
    },
    {
      "service": "cloudinary",
      "configured": true,
      "source": "environment",
      "keyPreview": null,
      "isValid": null,
      "lastValidated": null
    }
  ]
}
```

### `POST /api/settings/api-keys/:service`
Save or update an API key for a service.

**Request:**
```json
{
  "apiKey": "AIzaSy..."
}
```

**Flow:**
1. Validate format (basic regex per service)
2. Test API call to validate key works
3. Encrypt with AES-256-GCM
4. Save to database
5. Log audit entry
6. Return masked preview

**Response (success):**
```json
{
  "success": true,
  "keyPreview": "AIza...xyz789",
  "message": "Gemini API key saved successfully"
}
```

**Response (validation failure):**
```json
{
  "success": false,
  "error": "API key validation failed",
  "details": "Invalid API key - received 401 from Gemini API",
  "solution": "Check your key at https://aistudio.google.com/apikey"
}
```

### `DELETE /api/settings/api-keys/:service`
Remove user's custom key (will fall back to environment variable).

### `POST /api/settings/api-keys/:service/validate`
Re-validate an existing key without updating it.

---

## UI Components

### Page: `client/src/pages/ApiKeySettings.tsx`
- Route: `/settings/api-keys`
- Protected route (requires auth)

### Components:
1. **ApiKeySettingsPage** - Main container
2. **ApiKeyCard** - Per-service card showing status
3. **ApiKeyForm** - Modal/dialog for entering new key
4. **ApiKeyStatus** - Badge showing valid/invalid/pending

### UI States:
- **Not configured**: Gray badge, "Using default" or "Not configured"
- **User configured + valid**: Green badge, masked preview
- **User configured + invalid**: Red badge, "Key invalid" + retry button
- **Validating**: Spinner, "Testing key..."

---

## Edge Cases to Handle

1. **Master encryption key rotation**: Migration script to re-encrypt all keys
2. **Invalid key detection**: Background job to periodically validate stored keys
3. **Rate limit during validation**: Exponential backoff, clear error message
4. **Service-specific key formats**: Regex validation before API test
5. **Partial service outage**: Distinguish between bad key vs service down
6. **Key with extra whitespace**: Auto-trim before validation
7. **Concurrent key updates**: Database-level UNIQUE constraint
8. **Audit log retention**: 90-day retention, configurable
9. **Environment fallback messaging**: Clear UI showing "Using environment key"
10. **Key permissions check**: Validate key has required scopes (Cloudinary admin vs upload)

---

## Implementation Order (Sub-Agent Assignments)

### Phase 7.1: Database Schema
**Agent**: Schema Agent
**Files**: `shared/schema.ts`, migration
**Deliverables**:
- `userApiKeys` table
- `apiKeyAuditLog` table
- TypeScript types

### Phase 7.2: Encryption Service
**Agent**: Security Agent
**Files**: `server/services/encryptionService.ts`
**Deliverables**:
- AES-256-GCM encrypt/decrypt functions
- Key preview generator
- Unit tests

### Phase 7.3: Storage Layer
**Agent**: Storage Agent
**Files**: `server/storage.ts`
**Deliverables**:
- CRUD operations for userApiKeys
- resolveApiKey with fallback
- Audit logging functions

### Phase 7.4: Validation Service
**Agent**: Validation Agent
**Files**: `server/services/apiKeyValidationService.ts`
**Deliverables**:
- Per-service validators (Gemini, Cloudinary, Firecrawl, Redis)
- Format validation regexes
- Integration tests

### Phase 7.5: API Routes
**Agent**: Routes Agent
**Files**: `server/routes.ts`
**Deliverables**:
- GET /api/settings/api-keys
- POST /api/settings/api-keys/:service
- DELETE /api/settings/api-keys/:service
- POST /api/settings/api-keys/:service/validate

### Phase 7.6: Frontend UI
**Agent**: UI Agent
**Files**:
- `client/src/pages/ApiKeySettings.tsx`
- `client/src/components/settings/ApiKeyCard.tsx`
- `client/src/components/settings/ApiKeyForm.tsx`
**Deliverables**:
- Settings page
- Service cards with status
- Add/Edit/Delete key modals
- Real-time validation feedback

---

## Security Checklist

- [ ] Master key stored in environment only (never in code)
- [ ] Keys encrypted at rest with AES-256-GCM
- [ ] Unique IV per encryption
- [ ] Auth tag verification on decrypt
- [ ] Keys never logged (even in debug mode)
- [ ] Keys never returned in API responses after save
- [ ] Audit log for all key operations
- [ ] Rate limiting on key validation endpoint
- [ ] HTTPS only (enforced by Railway)
- [ ] Session-based auth required for all endpoints

---

## Error Messages with Solutions

| Error | Solution |
|-------|----------|
| "Invalid API key format" | "Gemini keys start with 'AIza'. Check your key at https://aistudio.google.com/apikey" |
| "API key validation failed (401)" | "Key is invalid or revoked. Generate a new key at [service URL]" |
| "API key validation failed (403)" | "Key lacks required permissions. Enable [specific API] in Google Cloud Console" |
| "API key validation failed (429)" | "Rate limited during validation. Key may be valid - try again in 60 seconds" |
| "Service unavailable" | "Could not reach [service]. Key saved but not validated - will retry automatically" |
| "Encryption failed" | "Internal error. Contact support." |

---

## Integration with Quota Dashboard

After implementation, the `/usage` quota dashboard should:
1. Show which key source is being used (user vs environment)
2. Link to settings page when quota issues detected
3. Display key health status

---

## Testing Requirements

1. **Unit tests**: Encryption/decryption, key preview generation
2. **Integration tests**: Full flow from API to database
3. **Validation tests**: Mock each service's API response
4. **Security tests**: Ensure keys never appear in logs/responses
5. **Fallback tests**: Verify env var fallback when no user key

---

## Environment Variables Required

```env
# New - required for this feature
API_KEY_ENCRYPTION_KEY=<32-byte-random-string>

# Existing - become fallbacks
GEMINI_API_KEY=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
FIRECRAWL_API_KEY=...
REDIS_URL=...
```

Generate encryption key:
```bash
openssl rand -base64 32
```

---

## Timeline Estimate

Not providing time estimates per project guidelines. Implementation order above reflects dependencies.
