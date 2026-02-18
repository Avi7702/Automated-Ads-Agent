## 2026-02-18 - Database-level Aggregation and Filtering
**Learning:** In-memory aggregation and filtering are significant performance bottlenecks in this codebase. Moving these operations to the database using SQL `groupBy`, `count`, and the array overlap operator (`&&`) drastically reduces data transfer and memory usage. Additionally, array columns require GIN indexes for these operators to be efficient.

**Action:** Always favor database-side processing over loading records into memory for filtering or aggregation. When adding array-based filters, ensure corresponding GIN indexes are defined in `shared/schema.ts`.

## 2026-02-18 - Lockfile Regression Awareness
**Learning:** Running `npm install` in the container environment can introduce massive, unrelated regressions in `package-lock.json` if the environment is not perfectly synced with the original lockfile.

**Action:** Always verify `package-lock.json` before committing. If large regressions are detected, restore the original lockfile using `restore_file` before final submission.
