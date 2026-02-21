## 2025-05-22 - Optimized Array Queries with GIN Indexes
**Learning:** In-memory filtering of PostgreSQL array columns (e.g., using `.filter()` in JS) is an anti-pattern that leads to excessive data transfer and high memory usage. Native PostgreSQL array overlap operators (`&&`) combined with GIN indexes provide a massive performance boost for these types of queries.
**Action:** Always favor database-side filtering for array columns and ensure corresponding GIN indexes are defined in the schema to avoid sequential scans.
