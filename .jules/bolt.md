## 2026-02-23 - Database-side Aggregation Optimization
**Learning:** Found an anti-pattern where the application was fetching all content planner posts for a week and counting them by category in memory. This is inefficient for large datasets and increases memory pressure.
**Action:** Use PostgreSQL `GROUP BY` and `COUNT` to perform aggregations at the database level. This reduces the data transfer to the application to just a few rows.

## 2026-02-23 - Safety Directive and Scope Management
**Learning:** Running `npm install` can sometimes corrupt the lockfile by removing essential dependencies if the environment has conflicts. Also, bundling multiple repository optimizations into one PR can be rejected even if they are all performance-related.
**Action:** Always verify the lockfile after `npm install` and restore it if unrequested regressions are found. Stick strictly to ONE small performance improvement per task to ensure a focused and reviewable change.
