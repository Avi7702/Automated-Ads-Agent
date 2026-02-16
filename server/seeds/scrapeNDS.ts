/* eslint-disable no-console */
import "dotenv/config";
import { scrapeNDSWebsite, getAvailableCategories } from "../services/ndsWebsiteScraper";

async function main() {
  console.log("Starting NDS Website Scraper...\n");

  // Check API key
  if (!process.env.FIRECRAWL_API_KEY) {
    console.error("ERROR: FIRECRAWL_API_KEY not found in environment");
    process.exit(1);
  }
  console.log("✓ Firecrawl API key configured");

  // Check Cloudinary (optional)
  if (process.env.CLOUDINARY_CLOUD_NAME) {
    console.log("✓ Cloudinary configured - images will be uploaded");
  } else {
    console.log("⚠ Cloudinary not configured - using source image URLs");
  }

  // Show categories
  const categories = getAvailableCategories();
  console.log("\nCategories to scrape:");
  categories.forEach(c => console.log(`  - ${c.displayName} (${c.name})`));

  // Run scraper
  console.log("\n" + "=".repeat(60));
  const results = await scrapeNDSWebsite();

  console.log("\n\nFinal Results:", JSON.stringify(results, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
