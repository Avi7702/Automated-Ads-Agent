## 2026-02-14 - In-memory Filtering Anti-pattern
**Learning:** Several repository methods (e.g., in `templateRepository.ts` and `planningRepository.ts`) were fetching all records for a user and filtering them in-memory using JavaScript `.filter()`. This leads to increased data transfer and high memory usage as the dataset grows.
**Action:** Always favor database-level filtering using Drizzle's `where()` clause and operators like `eq()` or `arrayContains()`. Use SQL aggregation (`groupBy`, `count`) instead of manual JS counting.
