// Global test setup - runs before each test file
// Set environment variables that modules need at load time
process.env.GEMINI_API_KEY = 'test-api-key';
process.env.NODE_ENV = 'test';
