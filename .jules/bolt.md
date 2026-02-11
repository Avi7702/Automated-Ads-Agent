## 2025-05-15 - Array Overlap Optimization
**Learning:** Pushing array filtering to the database using the PostgreSQL `&&` (overlap) operator combined with a GIN index significantly reduces memory usage and transfer size compared to in-memory JavaScript filtering, especially for large datasets.
**Action:** Identify and replace in-memory filtering patterns (e.g., `.filter(row => row.array_col.some(...))`) with database-level array operators and ensure supporting GIN indexes are defined in the schema.
