## 2026-02-17 - In-memory aggregation vs Database aggregation
**Learning:** Found an anti-pattern where the application was fetching all records for a week and aggregating them in-memory using a JavaScript loop. This increases payload size, memory usage, and CPU cycles on the application server.
**Action:** Use SQL `GROUP BY` and `COUNT(*)` to offload aggregation to the database, which is highly optimized for this purpose and returns significantly less data.

## 2026-02-17 - Unexpected package-lock.json regressions
**Learning:** Running `npm install` in some environments can cause massive, unrelated rollbacks or changes in `package-lock.json` if the local environment is out of sync or uses a different npm version.
**Action:** Always verify `package-lock.json` after running install commands and use `restore_file` to revert any unrequested changes before submitting.
