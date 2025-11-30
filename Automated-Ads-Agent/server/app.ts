import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import routes from './routes';
import { storage } from './storage';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie parsing
app.use(cookieParser());

// Initialize storage before handling requests
app.use(async (req, res, next) => {
  try {
    await storage.initialize();
    next();
  } catch (error) {
    next(error);
  }
});

// Routes
app.use(routes);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const isDev = process.env.NODE_ENV !== 'production';
  res.status(500).json({
    error: 'Internal server error',
    ...(isDev && { message: err.message }),
  });
});

// 404 handler
app.use((req: express.Request, res: express.Response) => {
  res.status(404).json({ error: 'Not found' });
});

export { app };
