## 2026-02-15 - [Database-side Filtering in Repositories]
**Learning:** In-memory filtering (using JS `.filter()`) in repository methods is a common performance anti-pattern that leads to increased I/O, network overhead, and memory consumption. Drizzle ORM provides idiomatic operators like `arrayContains` for PostgreSQL array columns that should be used instead.
**Action:** Always favor database-level filtering using `where()` clauses and appropriate operators over fetching all records and filtering in application code.

## 2026-02-15 - [Mocking Drizzle with Vitest]
**Learning:** When mocking Drizzle's chained methods (e.g., `db.select().from().where()`), use `vi.hoisted` to declare mock functions before the `vi.mock` call. This prevents `ReferenceError: Cannot access 'mock' before initialization` during hoisting.
**Action:** Use `vi.hoisted` for all mock functions needed within a `vi.mock` factory in Vitest tests.
