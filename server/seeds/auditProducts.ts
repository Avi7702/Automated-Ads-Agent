import "dotenv/config";
import { db } from "../db";
import { products, installationScenarios, productRelationships, brandImages } from "@shared/schema";

async function auditProducts() {
  console.log("═".repeat(100));
  console.log("  PRODUCT INVENTORY AUDIT - NDS Knowledge Base");
  console.log("═".repeat(100));

  // Get all products
  const allProducts = await db.select().from(products);
  console.log(`\nTotal Products in Database: ${allProducts.length}\n`);

  // Get all relationships
  const relationships = await db.select().from(productRelationships);
  const relCountByProduct = new Map<string, number>();
  relationships.forEach(r => {
    relCountByProduct.set(r.sourceProductId, (relCountByProduct.get(r.sourceProductId) || 0) + 1);
  });

  // Get all scenarios
  const scenarios = await db.select().from(installationScenarios);
  const scenarioByProduct = new Map<string, number>();
  scenarios.forEach(s => {
    if (s.primaryProductId) {
      scenarioByProduct.set(s.primaryProductId, (scenarioByProduct.get(s.primaryProductId) || 0) + 1);
    }
  });

  // Get brand images
  const images = await db.select().from(brandImages);

  // Print header
  console.log("─".repeat(100));
  console.log("PRODUCT COMPLETENESS TABLE");
  console.log("─".repeat(100));
  console.log("");
  console.log("Legend: ✓ = Has data, ✗ = Missing, # = Count");
  console.log("");

  // Group by category
  const byCategory = new Map<string, typeof allProducts>();
  allProducts.forEach(p => {
    const cat = p.category || "uncategorized";
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(p);
  });

  // Stats tracking
  let totalComplete = 0;
  let totalMissing = 0;

  for (const [category, prods] of byCategory) {
    console.log(`\n### ${category.toUpperCase()} (${prods.length} products)`);
    console.log("─".repeat(100));
    console.log("Name".padEnd(35) + " | Desc | Feat | Bene | Spec | Tags | SKU  | Enrich   | Rels | Scen");
    console.log("─".repeat(100));

    for (const p of prods) {
      const checks = {
        desc: p.description ? "✓" : "✗",
        feat: p.features ? "✓" : "✗",
        bene: (p.benefits && p.benefits.length > 0) ? "✓" : "✗",
        spec: p.specifications ? "✓" : "✗",
        tags: (p.tags && p.tags.length > 0) ? "✓" : "✗",
        sku: p.sku ? "✓" : "✗",
      };

      const isComplete = Object.values(checks).every(v => v === "✓");
      if (isComplete) totalComplete++;
      else totalMissing++;

      const enrichStatus = (p.enrichmentStatus || "pending").padEnd(8);
      const relCount = (relCountByProduct.get(p.id) || 0).toString().padStart(2);
      const scenCount = (scenarioByProduct.get(p.id) || 0).toString().padStart(2);

      const name = p.name.substring(0, 33).padEnd(35);
      console.log(`${name} |  ${checks.desc}   |  ${checks.feat}   |  ${checks.bene}   |  ${checks.spec}   |  ${checks.tags}   |  ${checks.sku}   | ${enrichStatus} |  ${relCount}  |  ${scenCount}`);
    }
  }

  // Summary statistics
  console.log("\n" + "═".repeat(100));
  console.log("SUMMARY STATISTICS");
  console.log("═".repeat(100));

  const stats = {
    total: allProducts.length,
    withDesc: allProducts.filter(p => p.description).length,
    withFeat: allProducts.filter(p => p.features).length,
    withBene: allProducts.filter(p => p.benefits && p.benefits.length > 0).length,
    withSpec: allProducts.filter(p => p.specifications).length,
    withTags: allProducts.filter(p => p.tags && p.tags.length > 0).length,
    withSku: allProducts.filter(p => p.sku).length,
    enrichComplete: allProducts.filter(p => p.enrichmentStatus === "complete").length,
    enrichPending: allProducts.filter(p => !p.enrichmentStatus || p.enrichmentStatus === "pending").length,
  };

  const pct = (n: number) => Math.round(n / stats.total * 100);

  console.log(`
| Metric                | Count | Percentage | Status      |
|-----------------------|-------|------------|-------------|
| Total Products        | ${stats.total.toString().padStart(5)} |    100%    |             |
| With Description      | ${stats.withDesc.toString().padStart(5)} |    ${pct(stats.withDesc).toString().padStart(3)}%    | ${stats.withDesc === stats.total ? "✓ Complete" : "⚠ Gaps"} |
| With Features         | ${stats.withFeat.toString().padStart(5)} |    ${pct(stats.withFeat).toString().padStart(3)}%    | ${stats.withFeat === stats.total ? "✓ Complete" : "⚠ Gaps"} |
| With Benefits         | ${stats.withBene.toString().padStart(5)} |    ${pct(stats.withBene).toString().padStart(3)}%    | ${stats.withBene === stats.total ? "✓ Complete" : "⚠ Gaps"} |
| With Specifications   | ${stats.withSpec.toString().padStart(5)} |    ${pct(stats.withSpec).toString().padStart(3)}%    | ${stats.withSpec === stats.total ? "✓ Complete" : "⚠ Gaps"} |
| With Tags             | ${stats.withTags.toString().padStart(5)} |    ${pct(stats.withTags).toString().padStart(3)}%    | ${stats.withTags === stats.total ? "✓ Complete" : "⚠ Gaps"} |
| With SKU              | ${stats.withSku.toString().padStart(5)} |    ${pct(stats.withSku).toString().padStart(3)}%    | ${stats.withSku === stats.total ? "✓ Complete" : "⚠ Gaps"} |
| Enrichment Complete   | ${stats.enrichComplete.toString().padStart(5)} |    ${pct(stats.enrichComplete).toString().padStart(3)}%    | ${stats.enrichComplete === stats.total ? "✓ Complete" : "⚠ Gaps"} |
| Enrichment Pending    | ${stats.enrichPending.toString().padStart(5)} |    ${pct(stats.enrichPending).toString().padStart(3)}%    | ${stats.enrichPending === 0 ? "✓ None" : "⚠ Action needed"} |
`);

  console.log("─".repeat(100));
  console.log("RELATED DATA");
  console.log("─".repeat(100));
  console.log(`
| Data Type              | Count | Coverage                              |
|------------------------|-------|---------------------------------------|
| Product Relationships  | ${relationships.length.toString().padStart(5)} | ${relCountByProduct.size} products have relationships |
| Installation Scenarios | ${scenarios.length.toString().padStart(5)} | ${scenarioByProduct.size} products have scenarios |
| Brand Images           | ${images.length.toString().padStart(5)} | Available for reference |
`);

  // Requirements table
  console.log("═".repeat(100));
  console.log("REQUIREMENTS: What Each Product SHOULD Have");
  console.log("═".repeat(100));
  console.log(`
| Field           | Required | Purpose                                                    |
|-----------------|----------|------------------------------------------------------------|
| name            | YES      | Product display name                                       |
| cloudinaryUrl   | YES      | Product image URL                                          |
| category        | YES      | For filtering and RAG matching (rebar/mesh/spacers/etc)    |
| description     | YES      | What the product IS and how it's used (for LLM context)    |
| features        | YES      | Key attributes as JSON (diameter, length, grade, etc)      |
| benefits        | YES      | Array of selling points (for copywriting)                  |
| specifications  | YES      | Technical specs as JSON (weight, tensile strength, etc)    |
| tags            | YES      | Search tags for RAG retrieval                              |
| sku             | YES      | Unique product code for relationship mapping               |
| enrichmentStatus| AUTO     | Tracks data quality (pending/draft/verified/complete)      |

RELATED DATA REQUIREMENTS:
| Relationship Type     | Required Per Product | Purpose                              |
|-----------------------|---------------------|--------------------------------------|
| Product Relationships | 1-5 relationships   | What accessories/related products    |
| Installation Scenario | 1+ scenario         | How to install (prevents hallucination) |
`);

  // Products needing attention
  const needsWork = allProducts.filter(p =>
    !p.description || !p.features || !p.benefits || !p.specifications || !p.tags || !p.sku
  );

  if (needsWork.length > 0) {
    console.log("═".repeat(100));
    console.log(`PRODUCTS NEEDING ENRICHMENT: ${needsWork.length} products`);
    console.log("═".repeat(100));
    for (const p of needsWork.slice(0, 20)) {
      const missing = [];
      if (!p.description) missing.push("description");
      if (!p.features) missing.push("features");
      if (!p.benefits || p.benefits.length === 0) missing.push("benefits");
      if (!p.specifications) missing.push("specifications");
      if (!p.tags || p.tags.length === 0) missing.push("tags");
      if (!p.sku) missing.push("sku");
      console.log(`  - ${p.name.substring(0, 40).padEnd(42)} Missing: ${missing.join(", ")}`);
    }
    if (needsWork.length > 20) {
      console.log(`  ... and ${needsWork.length - 20} more`);
    }
  }

  console.log("\n" + "═".repeat(100));
}

auditProducts()
  .then(() => process.exit(0))
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
