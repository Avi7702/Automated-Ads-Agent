
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "./db";

// For simple prototyping/dev, we use db push behavior by syncing schema
// But since drizzle-kit push is a CLI command, for programmatic usage in prod
// we often use 'migrate' if we have migrations folder.
// However, since this project used 'db:push', we might lack migration files.
// Let's check if we can run specific SQL or if we should use 'drizzle-kit push' via exec.

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function pushSchema() {
    try {
        console.log("[db] Pushing schema to database...");
        // We use drizzle-kit push command with --force to skip interactive confirmation.
        // This requires drizzle.config.ts to be present and correct.
        const { stdout, stderr } = await execAsync("npx drizzle-kit push --force", {
            timeout: 60000, // 60 second timeout
        });
        console.log("[db] Schema push output:", stdout);
        if (stderr) console.error("[db] Schema push stderr:", stderr);
        console.log("[db] Schema push completed successfully");
    } catch (error) {
        console.error("[db] Failed to push schema:", error);
        // Don't exit process, let app try to start, might be partial failure or just no changes
    }
}
