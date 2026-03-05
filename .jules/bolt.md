## 2026-02-22 - [Database-side Aggregation]

**Learning:** In-memory filtering and aggregation are recurring anti-patterns in this codebase. Offloading these to PostgreSQL using `groupBy`, `count`, and array operators (`&&`) significantly reduces memory footprint and data transfer.
**Action:** Always check repository methods for `.filter()` or manual count loops after a `db.select()` and refactor them to use SQL-level operations.

## 2026-02-20 - [Database-level Filtering vs In-memory]

**Learning:** Found a major performance anti-pattern where multiple repositories were fetching entire tables and filtering them in Node.js memory. This causes O(n) memory and CPU usage that could be O(1) or O(log n) with proper database indexes.
**Action:** Always favor PostgreSQL array operators (`&&`, `array_contains`) and Drizzle `where` clauses over JavaScript `.filter()`. Ensure frequently queried array columns have GIN indexes.

## 2026-03-05 - [Atomic UPSERT for Counters]

**Learning:** High-frequency metrics tracking (like API quotas) suffers from race conditions and latency when using the SELECT-then-UPDATE/INSERT pattern. PostgreSQL atomic UPSERT (`onConflictDoUpdate`) reduces round-trips and ensures concurrency safety.
**Action:** For all counter increment operations in the database, use `onConflictDoUpdate` with `sql` increments (e.g., `SET count = table.count + EXCLUDED.count`) instead of in-memory arithmetic.
