## 2026-02-23 - [Database-level User Filtering]

**Learning:** Found critical paths (data export and Brand DNA analysis) fetching hundreds of records globally and filtering by `userId` in Node.js. This causes O(N) data transfer and memory usage, and incorrectly scopes data if the global fetch limit is hit before finding user records.
**Action:** Implement specific `getByUserId` methods in repositories to offload filtering to PostgreSQL. Never use global list fetches followed by manual `.filter((x) => x.userId === id)`.

## 2026-02-22 - [Database-side Aggregation]

**Learning:** In-memory filtering and aggregation are recurring anti-patterns in this codebase. Offloading these to PostgreSQL using `groupBy`, `count`, and array operators (`&&`) significantly reduces memory footprint and data transfer.
**Action:** Always check repository methods for `.filter()` or manual count loops after a `db.select()` and refactor them to use SQL-level operations.

## 2026-02-20 - [Database-level Filtering vs In-memory]

**Learning:** Found a major performance anti-pattern where multiple repositories were fetching entire tables and filtering them in Node.js memory. This causes O(n) memory and CPU usage that could be O(1) or O(log n) with proper database indexes.
**Action:** Always favor PostgreSQL array operators (`&&`, `array_contains`) and Drizzle `where` clauses over JavaScript `.filter()`. Ensure frequently queried array columns have GIN indexes.
