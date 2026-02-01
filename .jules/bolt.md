# Bolt's Performance Journal ⚡

## 2026-02-01 - [Optimization: Database-level Array Filtering]
**Learning:** Found several places where the application fetched all records for a user and filtered them in-memory using JavaScript `.filter()`. This is an O(n) operation in the application layer that scales poorly as the database grows. In-memory filtering also increases network payload size and memory usage in the Node.js process.
**Action:** Use PostgreSQL array operators (`&&` for overlap, `@>` for containment) and dynamic `WHERE` clauses in Drizzle ORM to perform filtering at the database level. This ensures the database only returns the necessary records, leveraging indexes where available and reducing overhead.
