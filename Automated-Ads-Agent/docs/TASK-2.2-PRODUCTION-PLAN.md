# Task 2.2 Gemini Integration - Full Production Plan

## Executive Summary

**Current State:** 60% complete - Core bugs prevent features from working
**Target State:** 100% production ready
**Estimated Changes:** ~150 lines modified/added

---

## Part 1: Critical Bugs (Features Currently Broken)

### Bug 1: Reference Images Not Sent to API

**Problem Location:** `server/services/geminiService.ts` line 71

**Current Code (BROKEN):**
```typescript
// Reference images are added to userParts array...
for (const refImage of options.referenceImages) {
  userParts.push({
    inlineData: { mimeType: 'image/png', data: refImage }
  });
}

// ...but then IGNORED! Only text prompt is sent:
const result = await model.generateContent(enhancedPrompt);  // STRING ONLY!
```

**Impact:** User uploads reference images → they're thrown away → generation ignores them

**Fix:**
```typescript
// Send full contents array with text + images
const result = await model.generateContent({
  contents: [{ role: 'user', parts: userParts }]
});
```

**Test to Verify Fix Works:**
```typescript
it('actually sends reference images to API', async () => {
  const prompt = 'Generate similar';
  const options = { referenceImages: ['base64img1', 'base64img2'] };

  await geminiService.generateImage(prompt, options);

  // Verify generateContent was called with images, not just string
  expect(mockGenerateContent).toHaveBeenCalledWith({
    contents: [{
      role: 'user',
      parts: expect.arrayContaining([
        expect.objectContaining({ text: prompt }),
        expect.objectContaining({ inlineData: expect.any(Object) })
      ])
    }]
  });
});
```

---

### Bug 2: Multi-Turn Editing Ignores History

**Problem Location:** `server/services/geminiService.ts` line 116

**Current Code (BROKEN):**
```typescript
async continueConversation(history: ConversationMessage[], editPrompt: string) {
  // History is received but...
  const newHistory = [...history, { role: 'user', parts: [{ text: editPrompt }] }];

  // ...IGNORED! Only editPrompt sent, no context:
  const result = await model.generateContent(editPrompt);  // NO HISTORY!
}
```

**Impact:** "Make it more blue" has no idea what "it" is → random result

**Fix (using chat session):**
```typescript
async continueConversation(history: ConversationMessage[], editPrompt: string) {
  const model = this.genAI.getGenerativeModel({ model: this.modelName });

  // Start chat with existing history
  const chat = model.startChat({
    history: history.map(msg => ({
      role: msg.role,
      parts: msg.parts
    }))
  });

  // Send edit prompt WITH context
  const result = await chat.sendMessage(editPrompt);
  // ...
}
```

**Test to Verify Fix Works:**
```typescript
it('uses history in API call via chat session', async () => {
  const history = [
    { role: 'user' as const, parts: [{ text: 'Create sunset' }] },
    { role: 'model' as const, parts: [{ inlineData: { mimeType: 'image/png', data: 'img' } }] }
  ];

  await geminiService.continueConversation(history, 'Make it purple');

  // Verify startChat was called with history
  expect(mockStartChat).toHaveBeenCalledWith({
    history: expect.arrayContaining([
      expect.objectContaining({ role: 'user' }),
      expect.objectContaining({ role: 'model' })
    ])
  });
});
```

---

## Part 2: Production Hardening

### 2.1 Timeout Protection

**Problem:** API call can hang forever if Gemini is slow/down

**Current:** No timeout

**Fix:**
```typescript
private readonly API_TIMEOUT_MS = 60000; // 60 seconds

private async withTimeout<T>(promise: Promise<T>, timeoutMs: number = this.API_TIMEOUT_MS): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new GeminiTimeoutError('API request timed out')), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]);
}

// Usage:
const result = await this.withTimeout(model.generateContent(...));
```

**Edge Cases Handled:**
- Slow network → times out after 60s
- Gemini service degraded → fails fast
- Large image generation → configurable timeout

---

### 2.2 Retry Logic for Transient Failures

**Problem:** Network blips cause user-facing errors

**Fix:**
```typescript
private readonly MAX_RETRIES = 3;
private readonly RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff

private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry auth errors or validation errors
      if (this.isNonRetryableError(error)) {
        throw error;
      }

      // Wait before retry (exponential backoff)
      if (attempt < this.MAX_RETRIES - 1) {
        await this.sleep(this.RETRY_DELAYS[attempt]);
      }
    }
  }

  throw lastError!;
}

private isNonRetryableError(error: any): boolean {
  const nonRetryableCodes = [401, 403, 400]; // Auth, forbidden, bad request
  return nonRetryableCodes.includes(error?.status);
}
```

**Edge Cases Handled:**
- Network timeout → retry 3x with backoff
- Rate limit (429) → retry with backoff
- Auth error (401) → fail immediately (no retry)
- Bad request (400) → fail immediately

---

### 2.3 Custom Error Types

**Problem:** All errors look the same to the caller

**Fix:**
```typescript
// server/services/geminiErrors.ts

export class GeminiError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'GeminiError';
  }
}

export class GeminiTimeoutError extends GeminiError {
  constructor(message = 'Gemini API request timed out') {
    super(message, 'TIMEOUT');
  }
}

export class GeminiRateLimitError extends GeminiError {
  constructor(public readonly retryAfter?: number) {
    super('Gemini API rate limit exceeded', 'RATE_LIMIT');
  }
}

export class GeminiAuthError extends GeminiError {
  constructor() {
    super('Invalid or missing Gemini API key', 'AUTH_ERROR');
  }
}

export class GeminiContentError extends GeminiError {
  constructor(message = 'No image data in response') {
    super(message, 'NO_CONTENT');
  }
}
```

**Benefits:**
- Route handlers can return appropriate HTTP codes
- Logging can categorize errors
- Retry logic knows what to retry

---

### 2.4 Configurable Model Version

**Problem:** Hardcoded model can't be upgraded without code change

**Current:**
```typescript
private modelName = 'gemini-2.0-flash-exp';
```

**Fix:**
```typescript
private readonly modelName: string;

constructor() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiAuthError();
  }
  this.genAI = new GoogleGenerativeAI(apiKey);
  this.modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp';
}
```

**Also update .env.example:**
```
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.0-flash-exp
```

---

### 2.5 Response Validation

**Problem:** Blind trust that response has expected structure

**Fix:**
```typescript
private extractImageFromResponse(response: any): string {
  const candidate = response.candidates?.[0];

  if (!candidate) {
    throw new GeminiContentError('No candidates in response');
  }

  if (candidate.finishReason === 'SAFETY') {
    throw new GeminiContentError('Content blocked by safety filter');
  }

  if (candidate.finishReason === 'RECITATION') {
    throw new GeminiContentError('Content blocked due to recitation');
  }

  const parts = candidate.content?.parts;
  if (!parts || parts.length === 0) {
    throw new GeminiContentError('No parts in response');
  }

  // Find image part
  const imagePart = parts.find((p: any) => p.inlineData?.data);
  if (!imagePart) {
    throw new GeminiContentError('No image data in response');
  }

  return imagePart.inlineData.data;
}
```

**Edge Cases Handled:**
- Safety filter blocked content
- Recitation filter blocked content
- Empty response
- Response with text only (no image)
- Malformed response structure

---

### 2.6 Input Sanitization

**Problem:** Passing potentially harmful prompts to API

**Fix:**
```typescript
private sanitizePrompt(prompt: string): string {
  // Remove excessive whitespace
  let sanitized = prompt.trim().replace(/\s+/g, ' ');

  // Limit length (API has its own limits, but fail early)
  if (sanitized.length > 2000) {
    sanitized = sanitized.substring(0, 2000);
  }

  return sanitized;
}

private validateReferenceImages(images: string[]): void {
  if (images.length > 5) {
    throw new GeminiError('Maximum 5 reference images allowed', 'VALIDATION');
  }

  for (const img of images) {
    // Basic base64 validation
    if (!img || img.length < 100) {
      throw new GeminiError('Invalid reference image data', 'VALIDATION');
    }
  }
}
```

---

## Part 3: Full Implementation Code

### 3.1 New File: `server/services/geminiErrors.ts`

```typescript
export class GeminiError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'GeminiError';
  }
}

export class GeminiTimeoutError extends GeminiError {
  constructor(message = 'Gemini API request timed out') {
    super(message, 'TIMEOUT');
  }
}

export class GeminiRateLimitError extends GeminiError {
  constructor(public readonly retryAfter?: number) {
    super('Gemini API rate limit exceeded', 'RATE_LIMIT');
  }
}

export class GeminiAuthError extends GeminiError {
  constructor() {
    super('Invalid or missing Gemini API key', 'AUTH_ERROR');
  }
}

export class GeminiContentError extends GeminiError {
  constructor(message = 'No image data in response') {
    super(message, 'NO_CONTENT');
  }
}
```

### 3.2 Updated: `server/services/geminiService.ts`

```typescript
import { GoogleGenerativeAI, ChatSession } from '@google/generative-ai';
import {
  GeminiError,
  GeminiTimeoutError,
  GeminiRateLimitError,
  GeminiAuthError,
  GeminiContentError
} from './geminiErrors';

export interface ConversationMessage {
  role: 'user' | 'model';
  parts: {
    text?: string;
    inlineData?: {
      mimeType: string;
      data: string;
    };
  }[];
}

export interface GenerateResult {
  imageBase64: string;
  conversationHistory: ConversationMessage[];
  model: string;
}

export interface GenerateOptions {
  referenceImages?: string[];
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
}

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private readonly modelName: string;
  private readonly API_TIMEOUT_MS = 60000;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAYS = [1000, 2000, 4000];

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new GeminiAuthError();
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp';
  }

  async generateImage(prompt: string, options?: GenerateOptions): Promise<GenerateResult> {
    // Validate and sanitize input
    const sanitizedPrompt = this.sanitizePrompt(prompt);
    if (options?.referenceImages) {
      this.validateReferenceImages(options.referenceImages);
    }

    const model = this.genAI.getGenerativeModel({ model: this.modelName });

    // Build user message parts
    const userParts: ConversationMessage['parts'] = [];

    // Add prompt with optional aspect ratio
    let enhancedPrompt = sanitizedPrompt;
    if (options?.aspectRatio) {
      enhancedPrompt = `${sanitizedPrompt} [Aspect ratio: ${options.aspectRatio}]`;
    }
    userParts.push({ text: enhancedPrompt });

    // Add reference images
    if (options?.referenceImages && options.referenceImages.length > 0) {
      for (const refImage of options.referenceImages) {
        userParts.push({
          inlineData: {
            mimeType: 'image/png',
            data: refImage
          }
        });
      }
    }

    // Create conversation history
    const conversationHistory: ConversationMessage[] = [
      { role: 'user', parts: userParts }
    ];

    // Generate content with retry and timeout
    const result = await this.withRetry(async () => {
      return this.withTimeout(
        model.generateContent({
          contents: [{ role: 'user', parts: userParts }]
        })
      );
    });

    // Extract and validate image
    const imageData = this.extractImageFromResponse(result.response);

    // Add model response to history
    conversationHistory.push({
      role: 'model',
      parts: [{
        inlineData: {
          mimeType: 'image/png',
          data: imageData
        }
      }]
    });

    return {
      imageBase64: imageData,
      conversationHistory,
      model: this.modelName
    };
  }

  async continueConversation(
    history: ConversationMessage[],
    editPrompt: string
  ): Promise<GenerateResult> {
    const sanitizedPrompt = this.sanitizePrompt(editPrompt);
    const model = this.genAI.getGenerativeModel({ model: this.modelName });

    // Start chat with existing history
    const chat = model.startChat({
      history: history.map(msg => ({
        role: msg.role,
        parts: msg.parts
      }))
    });

    // Send edit prompt with retry and timeout
    const result = await this.withRetry(async () => {
      return this.withTimeout(chat.sendMessage(sanitizedPrompt));
    });

    // Extract and validate image
    const imageData = this.extractImageFromResponse(result.response);

    // Build new history
    const newHistory: ConversationMessage[] = [
      ...history,
      { role: 'user', parts: [{ text: sanitizedPrompt }] },
      {
        role: 'model',
        parts: [{
          inlineData: {
            mimeType: 'image/png',
            data: imageData
          }
        }]
      }
    ];

    return {
      imageBase64: imageData,
      conversationHistory: newHistory,
      model: this.modelName
    };
  }

  // --- Private Helpers ---

  private async withTimeout<T>(promise: Promise<T>): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new GeminiTimeoutError()), this.API_TIMEOUT_MS);
    });
    return Promise.race([promise, timeoutPromise]);
  }

  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error = new Error('Unknown error');

    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        if (this.isNonRetryableError(error)) {
          throw this.wrapError(error);
        }

        if (attempt < this.MAX_RETRIES - 1) {
          await this.sleep(this.RETRY_DELAYS[attempt]);
        }
      }
    }

    throw this.wrapError(lastError);
  }

  private isNonRetryableError(error: any): boolean {
    const status = error?.status || error?.code;
    return [401, 403, 400].includes(status);
  }

  private wrapError(error: any): GeminiError {
    if (error instanceof GeminiError) {
      return error;
    }

    const status = error?.status || error?.code;

    if (status === 401 || status === 403) {
      return new GeminiAuthError();
    }
    if (status === 429) {
      return new GeminiRateLimitError(error?.retryAfter);
    }

    return new GeminiError(error?.message || 'Gemini API error', 'API_ERROR');
  }

  private extractImageFromResponse(response: any): string {
    const candidate = response.candidates?.[0];

    if (!candidate) {
      throw new GeminiContentError('No candidates in response');
    }

    if (candidate.finishReason === 'SAFETY') {
      throw new GeminiContentError('Content blocked by safety filter');
    }

    if (candidate.finishReason === 'RECITATION') {
      throw new GeminiContentError('Content blocked due to recitation');
    }

    const parts = candidate.content?.parts;
    if (!parts || parts.length === 0) {
      throw new GeminiContentError('No parts in response');
    }

    const imagePart = parts.find((p: any) => p.inlineData?.data);
    if (!imagePart) {
      throw new GeminiContentError('No image data in response');
    }

    return imagePart.inlineData.data;
  }

  private sanitizePrompt(prompt: string): string {
    let sanitized = prompt.trim().replace(/\s+/g, ' ');
    if (sanitized.length > 2000) {
      sanitized = sanitized.substring(0, 2000);
    }
    return sanitized;
  }

  private validateReferenceImages(images: string[]): void {
    if (images.length > 5) {
      throw new GeminiError('Maximum 5 reference images allowed', 'VALIDATION');
    }
    for (const img of images) {
      if (!img || img.length < 100) {
        throw new GeminiError('Invalid reference image data', 'VALIDATION');
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

---

## Part 4: Test Updates

### 4.1 New Tests to Add

```typescript
// Add to server/__tests__/geminiService.test.ts

describe('Production Hardening', () => {
  describe('Reference Images Bug Fix', () => {
    it('sends reference images in contents array, not just prompt string', async () => {
      const options = { referenceImages: ['base64img1', 'base64img2'] };

      await geminiService.generateImage('test', options);

      expect(mockGenerateContent).toHaveBeenCalledWith({
        contents: [{
          role: 'user',
          parts: expect.arrayContaining([
            expect.objectContaining({ text: expect.any(String) }),
            expect.objectContaining({ inlineData: { mimeType: 'image/png', data: 'base64img1' } }),
            expect.objectContaining({ inlineData: { mimeType: 'image/png', data: 'base64img2' } })
          ])
        }]
      });
    });
  });

  describe('Multi-Turn Bug Fix', () => {
    it('uses startChat with history for continueConversation', async () => {
      const history = [
        { role: 'user' as const, parts: [{ text: 'Create image' }] },
        { role: 'model' as const, parts: [{ inlineData: { mimeType: 'image/png', data: 'img' } }] }
      ];

      await geminiService.continueConversation(history, 'Edit it');

      expect(mockStartChat).toHaveBeenCalledWith({
        history: expect.arrayContaining([
          expect.objectContaining({ role: 'user' }),
          expect.objectContaining({ role: 'model' })
        ])
      });
    });
  });

  describe('Timeout Protection', () => {
    it('times out after 60 seconds', async () => {
      mockGenerateContent.mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 70000))
      );

      await expect(geminiService.generateImage('test'))
        .rejects.toThrow('timed out');
    });
  });

  describe('Retry Logic', () => {
    it('retries on network errors', async () => {
      mockGenerateContent
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(successResponse);

      const result = await geminiService.generateImage('test');

      expect(result.imageBase64).toBeDefined();
      expect(mockGenerateContent).toHaveBeenCalledTimes(3);
    });

    it('does not retry auth errors', async () => {
      mockGenerateContent.mockRejectedValueOnce({ status: 401 });

      await expect(geminiService.generateImage('test'))
        .rejects.toThrow('Invalid or missing Gemini API key');
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Types', () => {
    it('throws GeminiContentError when safety filter blocks', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        response: {
          candidates: [{ finishReason: 'SAFETY', content: { parts: [] } }]
        }
      });

      await expect(geminiService.generateImage('test'))
        .rejects.toThrow('safety filter');
    });

    it('throws GeminiRateLimitError on 429', async () => {
      mockGenerateContent.mockRejectedValue({ status: 429 });

      await expect(geminiService.generateImage('test'))
        .rejects.toThrow('rate limit');
    });
  });

  describe('Input Validation', () => {
    it('rejects more than 5 reference images', async () => {
      const options = { referenceImages: ['1','2','3','4','5','6'] };

      await expect(geminiService.generateImage('test', options))
        .rejects.toThrow('Maximum 5 reference images');
    });

    it('sanitizes prompt whitespace', async () => {
      await geminiService.generateImage('  test   prompt  ');

      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          contents: [{
            role: 'user',
            parts: [{ text: 'test prompt' }]
          }]
        })
      );
    });
  });
});
```

---

## Part 5: Edge Cases Checklist

| Edge Case | Handled By |
|-----------|------------|
| API key missing | Constructor throws GeminiAuthError |
| API key invalid | withRetry doesn't retry 401, throws GeminiAuthError |
| API timeout | withTimeout throws GeminiTimeoutError after 60s |
| Network error | withRetry retries 3x with exponential backoff |
| Rate limit (429) | withRetry retries, then throws GeminiRateLimitError |
| Safety filter blocked | extractImageFromResponse throws GeminiContentError |
| Recitation blocked | extractImageFromResponse throws GeminiContentError |
| Empty response | extractImageFromResponse throws GeminiContentError |
| No image in response | extractImageFromResponse throws GeminiContentError |
| Reference images > 5 | validateReferenceImages throws GeminiError |
| Invalid reference image | validateReferenceImages throws GeminiError |
| Prompt too long | sanitizePrompt truncates to 2000 chars |
| Whitespace prompt | sanitizePrompt normalizes whitespace |
| Reference images not sent | FIXED - now in contents array |
| History ignored in edit | FIXED - now uses startChat |

---

## Part 6: Files Changed Summary

| File | Action | Lines |
|------|--------|-------|
| `server/services/geminiErrors.ts` | CREATE | ~35 |
| `server/services/geminiService.ts` | REPLACE | ~180 |
| `server/__tests__/geminiService.test.ts` | UPDATE | +80 |
| `.env.example` | UPDATE | +1 |

---

## Part 7: Acceptance Criteria

- [ ] Reference images actually sent to Gemini API
- [ ] Multi-turn editing uses chat history
- [ ] Timeout after 60 seconds
- [ ] Retry 3x on transient failures
- [ ] No retry on auth/validation errors
- [ ] Custom error types for different failure modes
- [ ] Model version configurable via env var
- [ ] Safety filter responses handled gracefully
- [ ] Input validated before API call
- [ ] All existing tests still pass
- [ ] New tests verify bug fixes

---

## Sources

- [Gemini API Image Generation](https://ai.google.dev/gemini-api/docs/image-generation)
- [@google/generative-ai NPM](https://www.npmjs.com/package/@google/generative-ai)
- [Google Gen AI TypeScript Guide](https://apidog.com/blog/how-to-use-the-google-gen-ai/)
