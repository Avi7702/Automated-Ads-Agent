## 2026-02-22 - [Database-side Aggregation]

**Learning:** In-memory filtering and aggregation are recurring anti-patterns in this codebase. Offloading these to PostgreSQL using `groupBy`, `count`, and array operators (`&&`) significantly reduces memory footprint and data transfer.
**Action:** Always check repository methods for `.filter()` or manual count loops after a `db.select()` and refactor them to use SQL-level operations.

## 2026-02-24 - [Atomic UPSERT for Counters]

**Learning:** The "select-then-update" pattern for counters (like API quota metrics) is a major performance bottleneck, doubling database round-trips and introducing race conditions.
**Action:** Use PostgreSQL `ON CONFLICT DO UPDATE` (UPSERT) with `sql` fragments to increment counters atomically in a single round-trip.

## 2026-02-20 - [Database-level Filtering vs In-memory]

**Learning:** Found a major performance anti-pattern where multiple repositories were fetching entire tables and filtering them in Node.js memory. This causes O(n) memory and CPU usage that could be O(1) or O(log n) with proper database indexes.
**Action:** Always favor PostgreSQL array operators (`&&`, `array_contains`) and Drizzle `where` clauses over JavaScript `.filter()`. Ensure frequently queried array columns have GIN indexes.
