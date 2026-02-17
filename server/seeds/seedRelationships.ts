/* eslint-disable no-console */
import 'dotenv/config';
import { db } from '../db';
import { productRelationships } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Product Relationships Seed for NDS (Next Day Steel)
 *
 * Defines how products relate to each other:
 * - pairs_with: Products commonly used together
 * - requires: Products that MUST be used together
 * - completes: Products that complete a kit/system
 * - upgrades: Heavy-duty version of another product
 * - matches: Products with matching aesthetics/style
 *
 * This context tells the AI: "What products go with this?"
 *
 * Usage:
 *   POST /api/admin/seed-relationships
 */

// Relationship Types
const RELATIONSHIP_TYPES = {
  PAIRS_WITH: 'pairs_with', // Commonly used together
  REQUIRES: 'requires', // Must be used together
  COMPLETES: 'completes', // Part of a kit/system
  UPGRADES: 'upgrades', // Heavy-duty version
  MATCHES: 'matches', // Matching style/aesthetics
  REPLACES: 'replaces', // Can substitute for
} as const;

/**
 * Product Relationships Data
 *
 * Uses SKU to reference products (populated by seedProducts.ts)
 * Relationships are defined from source -> target
 */
const PRODUCT_RELATIONSHIPS = [
  // Rebar + Spacers (REQUIRED relationships)
  {
    sourceSku: 'NDS-T8-6M',
    targetSku: 'NDS-SPACER-25-100',
    type: RELATIONSHIP_TYPES.REQUIRES,
    description: '25mm spacers required to maintain concrete cover',
    isRequired: true,
  },
  {
    sourceSku: 'NDS-T10-6M',
    targetSku: 'NDS-SPACER-25-100',
    type: RELATIONSHIP_TYPES.REQUIRES,
    description: 'Spacers essential for correct cover on T10 bars',
    isRequired: true,
  },
  {
    sourceSku: 'NDS-T12-6M',
    targetSku: 'NDS-SPACER-40-100',
    type: RELATIONSHIP_TYPES.REQUIRES,
    description: '40mm spacers for standard external cover',
    isRequired: true,
  },
  {
    sourceSku: 'NDS-T16-6M',
    targetSku: 'NDS-SPACER-40-100',
    type: RELATIONSHIP_TYPES.REQUIRES,
    description: '40mm spacers for structural applications',
    isRequired: true,
  },
  {
    sourceSku: 'NDS-T20-6M',
    targetSku: 'NDS-SPACER-50-100',
    type: RELATIONSHIP_TYPES.REQUIRES,
    description: '50mm spacers for heavy-duty applications',
    isRequired: true,
  },
  {
    sourceSku: 'NDS-T25-6M',
    targetSku: 'NDS-SPACER-50-100',
    type: RELATIONSHIP_TYPES.REQUIRES,
    description: 'Maximum cover for commercial applications',
    isRequired: true,
  },

  // Rebar + Tie Wire (REQUIRED)
  {
    sourceSku: 'NDS-T8-6M',
    targetSku: 'NDS-TIEWIRE-20KG',
    type: RELATIONSHIP_TYPES.REQUIRES,
    description: 'Tie wire essential for binding rebar intersections',
    isRequired: true,
  },
  {
    sourceSku: 'NDS-T10-6M',
    targetSku: 'NDS-TIEWIRE-20KG',
    type: RELATIONSHIP_TYPES.REQUIRES,
    description: 'Required for secure binding of rebar cage',
    isRequired: true,
  },
  {
    sourceSku: 'NDS-T12-6M',
    targetSku: 'NDS-TIEWIRE-20KG',
    type: RELATIONSHIP_TYPES.REQUIRES,
    description: 'Essential for tying all rebar intersections',
    isRequired: true,
  },
  {
    sourceSku: 'NDS-T16-6M',
    targetSku: 'NDS-TIEWIRE-20KG',
    type: RELATIONSHIP_TYPES.REQUIRES,
    description: 'Heavy-duty binding for structural cages',
    isRequired: true,
  },
  {
    sourceSku: 'NDS-T20-6M',
    targetSku: 'NDS-TIEWIRE-20KG',
    type: RELATIONSHIP_TYPES.REQUIRES,
    description: 'Secure binding for major reinforcement',
    isRequired: true,
  },

  // Rebar Upgrades (light to heavy)
  {
    sourceSku: 'NDS-T8-6M',
    targetSku: 'NDS-T10-6M',
    type: RELATIONSHIP_TYPES.UPGRADES,
    description: 'T10 provides higher tensile capacity than T8',
    isRequired: false,
  },
  {
    sourceSku: 'NDS-T10-6M',
    targetSku: 'NDS-T12-6M',
    type: RELATIONSHIP_TYPES.UPGRADES,
    description: 'T12 for heavier structural requirements',
    isRequired: false,
  },
  {
    sourceSku: 'NDS-T12-6M',
    targetSku: 'NDS-T16-6M',
    type: RELATIONSHIP_TYPES.UPGRADES,
    description: 'T16 for commercial/heavy-duty applications',
    isRequired: false,
  },
  {
    sourceSku: 'NDS-T16-6M',
    targetSku: 'NDS-T20-6M',
    type: RELATIONSHIP_TYPES.UPGRADES,
    description: 'T20 for major structural elements',
    isRequired: false,
  },
  {
    sourceSku: 'NDS-T20-6M',
    targetSku: 'NDS-T25-6M',
    type: RELATIONSHIP_TYPES.UPGRADES,
    description: 'T25 for commercial/industrial grade',
    isRequired: false,
  },
  {
    sourceSku: 'NDS-T25-6M',
    targetSku: 'NDS-T32-6M',
    type: RELATIONSHIP_TYPES.UPGRADES,
    description: 'T32 for heavy commercial construction',
    isRequired: false,
  },
  {
    sourceSku: 'NDS-T32-6M',
    targetSku: 'NDS-T40-6M',
    type: RELATIONSHIP_TYPES.UPGRADES,
    description: 'T40 for maximum strength applications',
    isRequired: false,
  },

  // Mesh + Chair Spacers (REQUIRED)
  {
    sourceSku: 'NDS-A142-SHEET',
    targetSku: 'NDS-CHAIR-HD-50',
    type: RELATIONSHIP_TYPES.REQUIRES,
    description: 'Chair spacers support mesh at correct height in slab',
    isRequired: true,
  },
  {
    sourceSku: 'NDS-A193-SHEET',
    targetSku: 'NDS-CHAIR-HD-50',
    type: RELATIONSHIP_TYPES.REQUIRES,
    description: 'Chairs essential for mesh positioning',
    isRequired: true,
  },
  {
    sourceSku: 'NDS-A252-SHEET',
    targetSku: 'NDS-CHAIR-HD-50',
    type: RELATIONSHIP_TYPES.REQUIRES,
    description: 'Heavy-duty chairs for heavier mesh',
    isRequired: true,
  },
  {
    sourceSku: 'NDS-A393-SHEET',
    targetSku: 'NDS-CHAIR-HD-50',
    type: RELATIONSHIP_TYPES.REQUIRES,
    description: 'Industrial chairs for A393 mesh support',
    isRequired: true,
  },

  // Mesh + Mesh Clips (REQUIRED)
  {
    sourceSku: 'NDS-A142-SHEET',
    targetSku: 'NDS-MESHCLIP-200',
    type: RELATIONSHIP_TYPES.REQUIRES,
    description: 'Clips secure mesh sheet overlaps',
    isRequired: true,
  },
  {
    sourceSku: 'NDS-A193-SHEET',
    targetSku: 'NDS-MESHCLIP-200',
    type: RELATIONSHIP_TYPES.REQUIRES,
    description: 'Essential for connecting mesh sheets',
    isRequired: true,
  },
  {
    sourceSku: 'NDS-A252-SHEET',
    targetSku: 'NDS-MESHCLIP-200',
    type: RELATIONSHIP_TYPES.REQUIRES,
    description: 'Secure overlaps for heavy-duty mesh',
    isRequired: true,
  },
  {
    sourceSku: 'NDS-A393-SHEET',
    targetSku: 'NDS-MESHCLIP-200',
    type: RELATIONSHIP_TYPES.REQUIRES,
    description: 'Industrial grade clip connections',
    isRequired: true,
  },

  // Mesh Upgrades (light to heavy)
  {
    sourceSku: 'NDS-A142-SHEET',
    targetSku: 'NDS-A193-SHEET',
    type: RELATIONSHIP_TYPES.UPGRADES,
    description: 'A193 provides more steel area than A142',
    isRequired: false,
  },
  {
    sourceSku: 'NDS-A193-SHEET',
    targetSku: 'NDS-A252-SHEET',
    type: RELATIONSHIP_TYPES.UPGRADES,
    description: 'A252 for heavier loading requirements',
    isRequired: false,
  },
  {
    sourceSku: 'NDS-A252-SHEET',
    targetSku: 'NDS-A393-SHEET',
    type: RELATIONSHIP_TYPES.UPGRADES,
    description: 'A393 for industrial/heavy commercial',
    isRequired: false,
  },

  // Rebar + Couplers (PAIRS_WITH)
  {
    sourceSku: 'NDS-T12-6M',
    targetSku: 'NDS-COUPLER-T12-10',
    type: RELATIONSHIP_TYPES.PAIRS_WITH,
    description: 'Mechanical splice alternative to lap joints',
    isRequired: false,
  },
  {
    sourceSku: 'NDS-T16-6M',
    targetSku: 'NDS-COUPLER-T16-10',
    type: RELATIONSHIP_TYPES.PAIRS_WITH,
    description: 'Reduces steel usage vs traditional laps',
    isRequired: false,
  },

  // Spacer + Spacer (COMPLETES - different cover options)
  {
    sourceSku: 'NDS-SPACER-25-100',
    targetSku: 'NDS-SPACER-40-100',
    type: RELATIONSHIP_TYPES.COMPLETES,
    description: 'Different covers for internal vs external work',
    isRequired: false,
  },
  {
    sourceSku: 'NDS-SPACER-40-100',
    targetSku: 'NDS-SPACER-50-100',
    type: RELATIONSHIP_TYPES.COMPLETES,
    description: 'Full range of cover options',
    isRequired: false,
  },
  {
    sourceSku: 'NDS-SPACER-25-100',
    targetSku: 'NDS-CHAIR-HD-50',
    type: RELATIONSHIP_TYPES.COMPLETES,
    description: 'Clip spacers + chairs for complete positioning system',
    isRequired: false,
  },

  // Common Pairings (PAIRS_WITH)
  {
    sourceSku: 'NDS-T10-6M',
    targetSku: 'NDS-A193-SHEET',
    type: RELATIONSHIP_TYPES.PAIRS_WITH,
    description: 'T10 starter bars often paired with A193 slab mesh',
    isRequired: false,
  },
  {
    sourceSku: 'NDS-T12-6M',
    targetSku: 'NDS-A252-SHEET',
    type: RELATIONSHIP_TYPES.PAIRS_WITH,
    description: 'Common pairing for commercial foundations',
    isRequired: false,
  },
  {
    sourceSku: 'NDS-T16-6M',
    targetSku: 'NDS-A393-SHEET',
    type: RELATIONSHIP_TYPES.PAIRS_WITH,
    description: 'Heavy-duty rebar with industrial mesh',
    isRequired: false,
  },
];

/**
 * Seed product relationships
 */
export async function seedProductRelationships() {
  console.log('🌱 Seeding NDS Product Relationships...');

  // Get first user (single-tenant for now)
  const user = await db.query.users.findFirst();
  if (!user) {
    console.log('⚠️ No users found. Create a user first.');
    return { created: 0, skipped: 0, errors: 0 };
  }

  // Build SKU to product ID map
  const allProducts = await db.query.products.findMany();
  const skuToId = new Map<string, string>();
  for (const p of allProducts) {
    if (p.sku) {
      skuToId.set(p.sku, p.id);
    }
  }

  if (skuToId.size === 0) {
    console.log('⚠️ No products with SKUs found. Run seedProducts.ts first.');
    return { created: 0, skipped: 0, errors: 0 };
  }

  console.log(`📦 Found ${skuToId.size} products with SKUs`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const rel of PRODUCT_RELATIONSHIPS) {
    try {
      const sourceId = skuToId.get(rel.sourceSku);
      const targetId = skuToId.get(rel.targetSku);

      if (!sourceId) {
        console.log(`  ⏭️  Skipped: Source ${rel.sourceSku} not found`);
        skipped++;
        continue;
      }
      if (!targetId) {
        console.log(`  ⏭️  Skipped: Target ${rel.targetSku} not found`);
        skipped++;
        continue;
      }

      // Check if relationship already exists
      const existing = await db.query.productRelationships.findFirst({
        where: and(
          eq(productRelationships.sourceProductId, sourceId),
          eq(productRelationships.targetProductId, targetId),
          eq(productRelationships.relationshipType, rel.type),
        ),
      });

      if (existing) {
        console.log(`  ⏭️  Skipped (exists): ${rel.sourceSku} -> ${rel.targetSku}`);
        skipped++;
        continue;
      }

      await db.insert(productRelationships).values({
        userId: user.id,
        sourceProductId: sourceId,
        targetProductId: targetId,
        relationshipType: rel.type,
        description: rel.description,
        isRequired: rel.isRequired,
        displayOrder: 0,
      });

      created++;
      console.log(`  ✨ Created: ${rel.sourceSku} --[${rel.type}]--> ${rel.targetSku}`);
    } catch (err) {
      errors++;
      console.error(`  ❌ Failed: ${rel.sourceSku} -> ${rel.targetSku}`, err);
    }
  }

  console.log(`\n✅ Product Relationship seeding complete:`);
  console.log(`   Created: ${created}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Errors: ${errors}`);

  return { created, skipped, errors };
}
