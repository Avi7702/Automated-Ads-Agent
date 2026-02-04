## 2026-02-04 - Database-side Array Filtering & Aggregation
**Learning:** In-memory filtering (O(n)) of large datasets fetched from the database is a common performance anti-pattern. Leveraging PostgreSQL-specific operators like `&&` (overlap) and database-side aggregation (`GROUP BY`) significantly reduces payload size, bandwidth, and memory pressure on the application server.
**Action:** Always check for `.filter()` or manual counting loops after a database fetch and refactor them into the query's `WHERE` or `SELECT` clauses whenever possible.
