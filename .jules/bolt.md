# Bolt's Performance Journal ⚡

## 2025-05-15 - [Database-Level Filtering for Arrays]
**Learning:** Found several places where the application was fetching all user records and filtering them in-memory using JavaScript `.filter()`. In a PostgreSQL environment with Drizzle ORM, this is a significant anti-pattern that leads to high memory usage and unnecessary data transfer.
**Action:** Always use database-level operators for array fields. Use `arrayContains` for inclusion and `sql` fragments with the `&&` operator for overlap. This ensures the database does the heavy lifting and returns only the necessary rows.
