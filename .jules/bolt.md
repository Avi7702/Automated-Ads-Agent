## 2026-02-16 - [Optimize array overlap queries in knowledge repository]
**Learning:** Found a performance bottleneck where `getBrandImagesForProducts` was fetching all user images into memory and filtering them in JavaScript. This is an anti-pattern for scalability. Also identified missing GIN indexes for array columns used in overlap queries.
**Action:** Favor database-level filtering using PostgreSQL's `&&` operator with Drizzle's `sql` fragments for array overlaps, and ensure corresponding GIN indexes are defined in the schema to support efficient querying.
