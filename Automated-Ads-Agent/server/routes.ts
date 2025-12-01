import { Router, Request, Response } from 'express';
import {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser
} from './services/authService';
import { requireAuth } from './middleware/auth';
import { validate } from './middleware/validate';
import { registerSchema, loginSchema, productSchema, transformSchema, editSchema } from './validation/schemas';
import { storage } from './storage';
import { expensiveLimiter, editLimiter, loginLimiter } from './middleware/rateLimit';
import { GeminiService } from './services/geminiService';
import { imageStorageService } from './services/imageStorage';
import {
  GeminiAuthError,
  GeminiRateLimitError,
  GeminiContentError,
  GeminiTimeoutError
} from './services/geminiErrors';

const router = Router();

// Cookie options for setting cookies
const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
});

// Cookie options for clearing (without maxAge to avoid deprecation warning)
const getClearCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
});

// Auth routes
router.post('/api/auth/register', validate(registerSchema), async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const result = await registerUser(email, password);

  if (!result.success) {
    res.status(result.statusCode || 400).json({ error: result.error });
    return;
  }

  res.status(201).json({ user: result.user });
});

router.post('/api/auth/login', loginLimiter, validate(loginSchema), async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const result = await loginUser(email, password);

  if (!result.success) {
    res.status(result.statusCode || 401).json({ error: result.error });
    return;
  }

  res.cookie('sessionId', result.sessionId!, getCookieOptions());
  res.json({ user: result.user });
});

router.post('/api/auth/logout', async (req: Request, res: Response) => {
  const sessionId = req.cookies?.sessionId;

  if (sessionId) {
    await logoutUser(sessionId);
  }

  res.clearCookie('sessionId', getClearCookieOptions());
  res.json({ message: 'Logged out successfully' });
});

router.get('/api/auth/me', requireAuth, async (req: Request, res: Response) => {
  const result = await getCurrentUser(req.sessionId!);

  if (!result.success) {
    res.status(result.statusCode || 401).json({ error: result.error });
    return;
  }

  res.json({ user: result.user });
});

// Protected routes (examples for testing)
router.post('/api/products', requireAuth, validate(productSchema), async (req: Request, res: Response) => {
  const { name, description } = req.body;

  const product = await storage.createProduct(req.user!.id, name, description);
  res.status(201).json({ product });
});

router.delete('/api/products', requireAuth, async (req: Request, res: Response) => {
  await storage.deleteAllProducts(req.user!.id);
  res.json({ message: 'All products deleted' });
});

router.delete('/api/products/:id', requireAuth, async (req: Request, res: Response) => {
  // Placeholder - would implement full product deletion
  res.json({ message: 'Product deleted' });
});

router.post('/api/transform', expensiveLimiter, requireAuth, validate(transformSchema), async (req: Request, res: Response) => {
  try {
    const { prompt, referenceImages, aspectRatio } = req.body;
    const userId = req.user!.id;

    // Initialize services
    await imageStorageService.initialize();
    const geminiService = new GeminiService();

    // Generate image with Gemini
    const result = await geminiService.generateImage(prompt, {
      referenceImages,
      aspectRatio: aspectRatio || '1:1'
    });

    // Save generation to storage
    const savedGeneration = await imageStorageService.saveGeneration({
      userId,
      prompt,
      imageBase64: result.imageBase64,
      conversationHistory: result.conversationHistory,
      model: result.model,
      aspectRatio: aspectRatio || '1:1'
    });

    res.status(201).json({
      success: true,
      generationId: savedGeneration.id,
      imageUrl: savedGeneration.imageUrl,
      canEdit: true
    });
  } catch (error) {
    // Handle specific Gemini errors - check multiple ways for Jest mock compatibility
    const err = error as { code?: string; name?: string; message?: string };
    const errorName = err?.name || '';
    const errorCode = err?.code || '';
    const errorMessage = err?.message || '';

    // Auth errors
    if (error instanceof GeminiAuthError ||
        errorCode === 'AUTH_ERROR' ||
        errorName === 'GeminiAuthError' ||
        errorMessage.includes('API key')) {
      res.status(500).json({ error: 'Image generation service unavailable' });
      return;
    }

    // Rate limit errors
    if (error instanceof GeminiRateLimitError ||
        errorCode === 'RATE_LIMIT' ||
        errorName === 'GeminiRateLimitError' ||
        errorMessage.includes('rate limit')) {
      res.status(429).json({ error: 'Too many requests' });
      return;
    }

    // Content errors (safety filter, no image, etc)
    if (error instanceof GeminiContentError ||
        errorCode === 'NO_CONTENT' ||
        errorName === 'GeminiContentError' ||
        errorMessage.includes('No image data') ||
        errorMessage.includes('safety filter')) {
      res.status(400).json({ error: 'Could not generate image' });
      return;
    }

    // Timeout errors
    if (error instanceof GeminiTimeoutError ||
        errorCode === 'TIMEOUT' ||
        errorName === 'GeminiTimeoutError' ||
        errorMessage.includes('timed out')) {
      res.status(504).json({ error: 'Request timeout' });
      return;
    }

    // Handle storage errors
    if (errorMessage.includes('Database')) {
      res.status(500).json({ error: 'Failed to save image' });
      return;
    }

    // Generic error fallback
    res.status(500).json({ error: 'Failed to save image' });
  }
});

router.post('/api/generations/:id/edit', editLimiter, requireAuth, validate(editSchema), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { prompt } = req.body;
    const userId = req.user!.id;

    await imageStorageService.initialize();

    // Get existing generation and verify ownership
    const existingGeneration = await imageStorageService.getGeneration(id);
    if (!existingGeneration) {
      res.status(404).json({ error: 'Generation not found' });
      return;
    }

    if (existingGeneration.userId !== userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    // Continue conversation with Gemini
    const geminiService = new GeminiService();
    const result = await geminiService.continueConversation(
      existingGeneration.conversationHistory,
      prompt
    );

    // Create new generation linked to parent using saveEdit
    const newGeneration = await imageStorageService.saveEdit(
      id,
      prompt,
      {
        userId,
        prompt: `${existingGeneration.prompt} [EDIT: ${prompt}]`,
        imageBase64: result.imageBase64,
        conversationHistory: result.conversationHistory,
        model: result.model,
        aspectRatio: existingGeneration.aspectRatio,
      }
    );

    // Return new format with parentId
    res.status(201).json({
      success: true,
      generationId: newGeneration.id,
      imageUrl: newGeneration.imageUrl,
      parentId: id,
      canEdit: true
    });
  } catch (error) {
    // Same error handling pattern as /api/transform
    const err = error as { code?: string; name?: string; message?: string };
    const errorName = err?.name || '';
    const errorCode = err?.code || '';
    const errorMessage = err?.message || '';

    if (error instanceof GeminiAuthError ||
        errorCode === 'AUTH_ERROR' ||
        errorName === 'GeminiAuthError' ||
        errorMessage.includes('API key')) {
      res.status(500).json({ error: 'Image generation service unavailable' });
      return;
    }

    if (error instanceof GeminiRateLimitError ||
        errorCode === 'RATE_LIMIT' ||
        errorName === 'GeminiRateLimitError' ||
        errorMessage.includes('rate limit')) {
      res.status(429).json({ error: 'Too many requests' });
      return;
    }

    if (error instanceof GeminiContentError ||
        errorCode === 'NO_CONTENT' ||
        errorName === 'GeminiContentError' ||
        errorMessage.includes('No image data') ||
        errorMessage.includes('safety filter')) {
      res.status(400).json({ error: 'Could not generate image' });
      return;
    }

    if (error instanceof GeminiTimeoutError ||
        errorCode === 'TIMEOUT' ||
        errorName === 'GeminiTimeoutError' ||
        errorMessage.includes('timed out')) {
      res.status(504).json({ error: 'Request timeout' });
      return;
    }

    if (errorMessage === 'Generation not found') {
      res.status(404).json({ error: 'Generation not found' });
      return;
    }

    res.status(500).json({ error: 'Failed to edit generation' });
  }
});

router.delete('/api/generations/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    await imageStorageService.initialize();

    // Verify generation exists and user owns it
    const generation = await imageStorageService.getGeneration(id);
    if (!generation) {
      res.status(404).json({ error: 'Generation not found' });
      return;
    }

    if (generation.userId !== userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    // Delete generation (file + DB record)
    await imageStorageService.deleteGeneration(id);

    res.json({ message: 'Generation deleted successfully' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Generation not found') {
      res.status(404).json({ error: 'Generation not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to delete generation' });
  }
});

// GET list must come before GET :id to avoid matching "generations" as an id
router.get('/api/generations', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    await imageStorageService.initialize();
    const generations = await imageStorageService.getUserGenerations(userId, limit);

    res.json({
      generations: generations.map(g => ({
        id: g.id,
        prompt: g.prompt,
        imageUrl: g.imageUrl,
        model: g.model,
        aspectRatio: g.aspectRatio,
        createdAt: g.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve generations' });
  }
});

router.get('/api/generations/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    await imageStorageService.initialize();

    const generation = await imageStorageService.getGeneration(id);

    if (!generation) {
      res.status(404).json({ error: 'Generation not found' });
      return;
    }

    if (generation.userId !== userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    res.json({
      id: generation.id,
      prompt: generation.prompt,
      imageUrl: generation.imageUrl,
      model: generation.model,
      aspectRatio: generation.aspectRatio,
      createdAt: generation.createdAt
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve generation' });
  }
});

// Health check (public)
router.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
