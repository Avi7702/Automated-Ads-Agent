import { storage } from '../storage';

beforeAll(async () => {
  // Initialize test database connection
  await storage.initialize();
});

beforeEach(async () => {
  // Clear test data before each test
  await storage.clearAllData();
});

afterAll(async () => {
  // Clean up database connection
  await storage.close();
});
