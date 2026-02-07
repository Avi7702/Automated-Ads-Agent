## 2025-01-26 - [Database Query Optimizations]
**Learning:** Found multiple instances of in-memory filtering and aggregation in `server/storage.ts` that could be offloaded to PostgreSQL. Offloading these reduces payload size between DB and server and improves execution speed.
**Action:** Use PostgreSQL array overlap operator `&&` for array column filtering and `GROUP BY` with `count(*)` for aggregations.
