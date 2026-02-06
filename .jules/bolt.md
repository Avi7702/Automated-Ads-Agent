## 2025-05-22 - Optimizing Database Queries in Drizzle ORM

**Learning:** Fetching large datasets and filtering or aggregating them in application memory (Node.js) is a major performance bottleneck. Using PostgreSQL-specific operators like `&&` for array overlap and database-side aggregation with `GROUP BY` and `count(*)` significantly reduces network overhead, memory usage, and CPU load on the application server.

**Action:** Always favor database-level filtering and aggregation. For array columns in Drizzle/PostgreSQL, use `sql`${column} && ARRAY[${sql.join(arr.map(id => sql`${id}`), sql`, `)}]::text[]`` for overlap checks. Use `.groupBy()` and `sql<number>`count(*)::int`` for counting records by category.
