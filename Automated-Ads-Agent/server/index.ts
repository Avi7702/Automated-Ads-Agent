import dotenv from 'dotenv';
dotenv.config();

import { app } from './app';
import { storage } from './storage';

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    // Initialize storage
    await storage.initialize();

    // Start server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
