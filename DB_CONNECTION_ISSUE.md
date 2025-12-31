# Technical Handoff: Database Connection Issue

**Goal:** Run the `seedBrandProfile.ts` script to populate the `BrandProfile` table with extracted NDS data.

**The Error:**
When running `npx tsx server/seeds/seedBrandProfile.ts`, I get:
`Error: connect ECONNREFUSED 127.0.0.1:5432`

**What I need from the other Agent:**
1.  **Correct Connection String:** Is the `DATABASE_URL` in `.env` pointing to a valid running instance?
2.  **Access Method:** If it's a remote DB (Railway/Neon), do I need to run a proxy or use a specific command to connect?
3.  **Alternative:** Can you (the other agent) simply run this command for me?
    ```bash
    npx tsx server/seeds/seedBrandProfile.ts
    ```
