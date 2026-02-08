## 2026-02-08 - Optimized Database Aggregation for Weekly Balance
**Learning:** In-memory aggregation of database records in Node.js (fetch all, then loop) is a significant bottleneck as data scales. Shifting this to database-side aggregation using SQL `GROUP BY` and `COUNT` reduces memory usage and network payload size by several orders of magnitude.
**Action:** Always prefer database-side aggregation (e.g., `groupBy` in Drizzle) over JavaScript-side processing for counting or grouping records.
