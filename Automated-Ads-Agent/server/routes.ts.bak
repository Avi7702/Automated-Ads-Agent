import { Router, Request, Response } from 'express';
import {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser
} from './services/authService';
import { requireAuth } from './middleware/auth';
import { validate } from './middleware/validate';
import { registerSchema, loginSchema, productSchema } from './validation/schemas';
import { storage } from './storage';
import { expensiveLimiter, editLimiter, loginLimiter } from './middleware/rateLimit';

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

router.post('/api/transform', expensiveLimiter, requireAuth, async (req: Request, res: Response) => {
  // Placeholder for image transformation
  res.json({ message: 'Transform initiated' });
});

router.post('/api/generations/:id/edit', editLimiter, requireAuth, async (req: Request, res: Response) => {
  // Placeholder for generation edit
  res.json({ message: 'Generation edit initiated' });
});

router.delete('/api/generations/:id', requireAuth, async (req: Request, res: Response) => {
  // Placeholder for generation deletion
  res.json({ message: 'Generation deleted' });
});

// Health check (public)
router.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
