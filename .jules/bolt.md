## 2026-01-26 - Initial Performance Audit
**Learning:** The codebase has several repository methods that perform in-memory filtering and aggregation, which is inefficient as the dataset grows. Specifically, `searchPerformingAdTemplates` fetches all user templates before filtering in JavaScript.
**Action:** Optimize these methods by moving logic to the database level using Drizzle ORM's SQL operators.
