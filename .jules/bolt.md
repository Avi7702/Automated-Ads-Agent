# Bolt's Performance Journal

## 2025-05-15 - [Database Aggregation and Array Optimization]
**Learning:** Found multiple instances where large datasets were fetched from PostgreSQL into Node.js memory only to be filtered or aggregated using JavaScript (`.filter()`, `.some()`, `.reduce()`). This creates significant memory pressure and unnecessary data transfer.
**Action:** Always favor database-level filtering (e.g., using PostgreSQL array overlap `&&` or `arrayContains`) and aggregations (`GROUP BY`, `COUNT`) over in-memory processing. Use Drizzle's `sql` fragments when high-performance SQL operators are required.
