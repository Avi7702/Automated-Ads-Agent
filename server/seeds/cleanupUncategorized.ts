/* eslint-disable no-console */
import "dotenv/config";
import { db } from "../db";
import { products } from "@shared/schema";
import { eq, isNull, or } from "drizzle-orm";

/**
 * Cleanup script to remove uncategorized Cloudinary imports
 *
 * These are raw image uploads that have:
 * - File-name based names (no real product names)
 * - No descriptions, features, benefits, specifications
 * - No SKUs or tags
 * - Category is either "uncategorized" or null
 */
async function cleanupUncategorized() {
  console.log("═".repeat(80));
  console.log("  CLEANUP: Removing Uncategorized Cloudinary Imports");
  console.log("═".repeat(80));

  // Find all uncategorized products
  const uncategorized = await db
    .select()
    .from(products)
    .where(
      or(
        eq(products.category, "uncategorized"),
        isNull(products.category)
      )
    );

  console.log(`\nFound ${uncategorized.length} uncategorized products to remove:\n`);

  // Show preview of what will be deleted
  const preview = uncategorized.slice(0, 10);
  for (const p of preview) {
    console.log(`  - ${p.name.substring(0, 60)}${p.name.length > 60 ? "..." : ""}`);
  }
  if (uncategorized.length > 10) {
    console.log(`  ... and ${uncategorized.length - 10} more`);
  }

  if (uncategorized.length === 0) {
    console.log("\n✓ No uncategorized products found. Database is clean!");
    return { deleted: 0 };
  }

  // Delete uncategorized products
  console.log("\n─".repeat(80));
  console.log("Deleting uncategorized products...\n");

  const result = await db
    .delete(products)
    .where(
      or(
        eq(products.category, "uncategorized"),
        isNull(products.category)
      )
    )
    .returning({ id: products.id, name: products.name });

  console.log(`✓ Deleted ${result.length} uncategorized products`);

  // Verify remaining products
  const remaining = await db.select().from(products);
  console.log(`\n─`.repeat(80));
  console.log("VERIFICATION");
  console.log("─".repeat(80));
  console.log(`\nRemaining products in database: ${remaining.length}`);

  // Count by category
  const byCategory = new Map<string, number>();
  remaining.forEach(p => {
    const cat = p.category || "unknown";
    byCategory.set(cat, (byCategory.get(cat) || 0) + 1);
  });

  console.log("\nProducts by category:");
  for (const [cat, count] of Array.from(byCategory.entries()).sort()) {
    console.log(`  ${cat}: ${count} products`);
  }

  console.log("\n" + "═".repeat(80));
  console.log("  CLEANUP COMPLETE");
  console.log("═".repeat(80));

  return { deleted: result.length, remaining: remaining.length };
}

cleanupUncategorized()
  .then((result) => {
    console.log(`\nSummary: Deleted ${result.deleted} products`);
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error during cleanup:", err);
    process.exit(1);
  });
