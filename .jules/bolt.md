# Bolt's Performance Journal ⚡

## 2025-05-15 - [Database-side Filtering and Aggregation]
**Learning:** In-memory filtering (e.g., `allRecords.filter(...)`) and manual aggregation (loops in JS) are significant performance anti-patterns in this codebase, especially as data grows. PostgreSQL's array overlap operator `&&` and native `GROUP BY` are far more efficient.
**Action:** Always favor database-level filtering using Drizzle's `sql` fragments or `arrayContains` for array columns, and use `groupBy` with `count(*)` for aggregations. Add GIN indexes to any array column that will be used for filtering.
