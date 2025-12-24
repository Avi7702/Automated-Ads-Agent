// Global test setup - runs before each test file
// Set environment variables that modules need at load time
process.env.GEMINI_API_KEY = 'test-api-key';
process.env.NODE_ENV = 'test';
// Database URL for tests - uses docker-compose PostgreSQL
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/automated_ads';
