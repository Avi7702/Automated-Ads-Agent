## 2026-02-22 - [Database-side Aggregation]
**Learning:** In-memory filtering and aggregation are recurring anti-patterns in this codebase. Offloading these to PostgreSQL using `groupBy`, `count`, and array operators (`&&`) significantly reduces memory footprint and data transfer.
**Action:** Always check repository methods for `.filter()` or manual count loops after a `db.select()` and refactor them to use SQL-level operations.
