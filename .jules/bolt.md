## 2026-02-20 - [Database-level Filtering vs In-memory]
**Learning:** Found a major performance anti-pattern where multiple repositories were fetching entire tables and filtering them in Node.js memory. This causes O(n) memory and CPU usage that could be O(1) or O(log n) with proper database indexes.
**Action:** Always favor PostgreSQL array operators (`&&`, `array_contains`) and Drizzle `where` clauses over JavaScript `.filter()`. Ensure frequently queried array columns have GIN indexes.
