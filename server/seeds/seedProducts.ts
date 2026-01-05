import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";
import { db } from "../db";
import { products } from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * Product Seed for NDS (Next Day Steel)
 *
 * This seed populates the products table with steel reinforcement products.
 *
 * Run modes:
 * 1. FROM_CLOUDINARY - Lists existing images in Cloudinary and creates records
 * 2. SAMPLE_DATA - Uses predefined sample data (for development/testing)
 *
 * Usage:
 *   POST /api/admin/seed-products
 *   OR
 *   npx ts-node server/seeds/seedProducts.ts
 */

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// NDS Product Categories
const CATEGORIES = {
  REBAR: "rebar",
  MESH: "mesh",
  SPACERS: "spacers",
  ACCESSORIES: "accessories",
} as const;

// Sample product data for NDS (Next Day Steel)
// Based on brand profile: T8-T40 rebar, A142/A193/A252/A393 mesh, Spacers, Tie wire, Couplers
const SAMPLE_PRODUCTS = [
  // Rebar Products
  {
    name: "T8 Rebar Bar - 6m Length",
    category: CATEGORIES.REBAR,
    description: "8mm diameter high-tensile steel reinforcement bar. CARES-certified to BS4449. Ideal for light structural work and slabs.",
    features: {
      diameter: "8mm",
      length: "6m",
      grade: "B500B",
      certification: "CARES certified",
      standard: "BS4449",
    },
    benefits: ["CARES certified for quality assurance", "Next-day delivery available", "No minimum order", "Cut-to-length service available"],
    specifications: {
      weight: "3.0 kg/bar",
      tensileStrength: "500 N/mm²",
      bendability: "Standard bending ratios apply",
    },
    tags: ["rebar", "T8", "reinforcement", "steel", "structural", "slab"],
    sku: "NDS-T8-6M",
  },
  {
    name: "T10 Rebar Bar - 6m Length",
    category: CATEGORIES.REBAR,
    description: "10mm diameter high-tensile steel reinforcement bar. CARES-certified to BS4449. Popular choice for foundations and walls.",
    features: {
      diameter: "10mm",
      length: "6m",
      grade: "B500B",
      certification: "CARES certified",
      standard: "BS4449",
    },
    benefits: ["Most popular size for general construction", "CARES certified", "Next-day delivery", "Easy to handle on site"],
    specifications: {
      weight: "4.7 kg/bar",
      tensileStrength: "500 N/mm²",
    },
    tags: ["rebar", "T10", "reinforcement", "steel", "foundation", "wall"],
    sku: "NDS-T10-6M",
  },
  {
    name: "T12 Rebar Bar - 6m Length",
    category: CATEGORIES.REBAR,
    description: "12mm diameter high-tensile steel reinforcement bar. CARES-certified to BS4449. Common in beam and column reinforcement.",
    features: {
      diameter: "12mm",
      length: "6m",
      grade: "B500B",
      certification: "CARES certified",
      standard: "BS4449",
    },
    benefits: ["Structural strength for beams and columns", "CARES certified", "Next-day delivery available"],
    specifications: {
      weight: "6.7 kg/bar",
      tensileStrength: "500 N/mm²",
    },
    tags: ["rebar", "T12", "reinforcement", "steel", "beam", "column"],
    sku: "NDS-T12-6M",
  },
  {
    name: "T16 Rebar Bar - 6m Length",
    category: CATEGORIES.REBAR,
    description: "16mm diameter high-tensile steel reinforcement bar. CARES-certified to BS4449. Heavy-duty structural reinforcement.",
    features: {
      diameter: "16mm",
      length: "6m",
      grade: "B500B",
      certification: "CARES certified",
      standard: "BS4449",
    },
    benefits: ["Heavy-duty structural applications", "CARES certified quality", "Cut and bent to schedule available"],
    specifications: {
      weight: "11.9 kg/bar",
      tensileStrength: "500 N/mm²",
    },
    tags: ["rebar", "T16", "reinforcement", "steel", "heavy-duty", "structural"],
    sku: "NDS-T16-6M",
  },
  {
    name: "T20 Rebar Bar - 6m Length",
    category: CATEGORIES.REBAR,
    description: "20mm diameter high-tensile steel reinforcement bar. CARES-certified to BS4449. For major structural elements.",
    features: {
      diameter: "20mm",
      length: "6m",
      grade: "B500B",
      certification: "CARES certified",
      standard: "BS4449",
    },
    benefits: ["Major structural reinforcement", "CARES certified", "Schedule bending service"],
    specifications: {
      weight: "18.5 kg/bar",
      tensileStrength: "500 N/mm²",
    },
    tags: ["rebar", "T20", "reinforcement", "steel", "major-structural"],
    sku: "NDS-T20-6M",
  },
  {
    name: "T25 Rebar Bar - 6m Length",
    category: CATEGORIES.REBAR,
    description: "25mm diameter high-tensile steel reinforcement bar. CARES-certified to BS4449. Commercial and industrial applications.",
    features: {
      diameter: "25mm",
      length: "6m",
      grade: "B500B",
      certification: "CARES certified",
      standard: "BS4449",
    },
    benefits: ["Commercial/industrial grade", "CARES certified", "Professional delivery service"],
    specifications: {
      weight: "28.9 kg/bar",
      tensileStrength: "500 N/mm²",
    },
    tags: ["rebar", "T25", "reinforcement", "steel", "commercial", "industrial"],
    sku: "NDS-T25-6M",
  },
  {
    name: "T32 Rebar Bar - 6m Length",
    category: CATEGORIES.REBAR,
    description: "32mm diameter high-tensile steel reinforcement bar. CARES-certified to BS4449. Heavy commercial construction.",
    features: {
      diameter: "32mm",
      length: "6m",
      grade: "B500B",
      certification: "CARES certified",
      standard: "BS4449",
    },
    benefits: ["Heavy commercial applications", "CARES certified", "Technical support available"],
    specifications: {
      weight: "47.4 kg/bar",
      tensileStrength: "500 N/mm²",
    },
    tags: ["rebar", "T32", "reinforcement", "steel", "heavy-commercial"],
    sku: "NDS-T32-6M",
  },
  {
    name: "T40 Rebar Bar - 6m Length",
    category: CATEGORIES.REBAR,
    description: "40mm diameter high-tensile steel reinforcement bar. CARES-certified to BS4449. Maximum strength applications.",
    features: {
      diameter: "40mm",
      length: "6m",
      grade: "B500B",
      certification: "CARES certified",
      standard: "BS4449",
    },
    benefits: ["Maximum structural strength", "CARES certified", "Specialist applications"],
    specifications: {
      weight: "74.0 kg/bar",
      tensileStrength: "500 N/mm²",
    },
    tags: ["rebar", "T40", "reinforcement", "steel", "maximum-strength"],
    sku: "NDS-T40-6M",
  },

  // Mesh Products (BS4483 certified)
  {
    name: "A142 Steel Mesh - 4.8m x 2.4m Sheet",
    category: CATEGORIES.MESH,
    description: "Light-duty welded mesh for floor slabs. BS4483 certified. 6mm wires at 200mm spacing. Perfect for domestic and light commercial.",
    features: {
      size: "4.8m x 2.4m",
      wireSize: "6mm",
      spacing: "200mm x 200mm",
      certification: "BS4483 certified",
      designation: "A142",
    },
    benefits: ["Easy to handle", "Ideal for domestic slabs", "BS4483 quality assured", "Next-day delivery"],
    specifications: {
      weight: "16.3 kg/sheet",
      crossSectionalArea: "142 mm²/m",
    },
    tags: ["mesh", "A142", "welded-mesh", "slab", "domestic", "light-duty"],
    sku: "NDS-A142-SHEET",
  },
  {
    name: "A193 Steel Mesh - 4.8m x 2.4m Sheet",
    category: CATEGORIES.MESH,
    description: "Standard welded mesh for general slabs. BS4483 certified. 7mm wires at 200mm spacing. Most popular domestic choice.",
    features: {
      size: "4.8m x 2.4m",
      wireSize: "7mm",
      spacing: "200mm x 200mm",
      certification: "BS4483 certified",
      designation: "A193",
    },
    benefits: ["Most popular mesh size", "General purpose domestic use", "BS4483 certified", "Quick delivery"],
    specifications: {
      weight: "22.2 kg/sheet",
      crossSectionalArea: "193 mm²/m",
    },
    tags: ["mesh", "A193", "welded-mesh", "slab", "general-purpose", "popular"],
    sku: "NDS-A193-SHEET",
  },
  {
    name: "A252 Steel Mesh - 4.8m x 2.4m Sheet",
    category: CATEGORIES.MESH,
    description: "Medium-duty welded mesh for heavier slabs. BS4483 certified. 8mm wires at 200mm spacing. Commercial and industrial use.",
    features: {
      size: "4.8m x 2.4m",
      wireSize: "8mm",
      spacing: "200mm x 200mm",
      certification: "BS4483 certified",
      designation: "A252",
    },
    benefits: ["Medium-duty reinforcement", "Commercial applications", "BS4483 certified", "Reliable delivery"],
    specifications: {
      weight: "29.0 kg/sheet",
      crossSectionalArea: "252 mm²/m",
    },
    tags: ["mesh", "A252", "welded-mesh", "commercial", "medium-duty"],
    sku: "NDS-A252-SHEET",
  },
  {
    name: "A393 Steel Mesh - 4.8m x 2.4m Sheet",
    category: CATEGORIES.MESH,
    description: "Heavy-duty welded mesh for structural slabs. BS4483 certified. 10mm wires at 200mm spacing. Industrial and heavy commercial.",
    features: {
      size: "4.8m x 2.4m",
      wireSize: "10mm",
      spacing: "200mm x 200mm",
      certification: "BS4483 certified",
      designation: "A393",
    },
    benefits: ["Heavy-duty structural reinforcement", "Industrial applications", "BS4483 certified", "Expert support"],
    specifications: {
      weight: "45.3 kg/sheet",
      crossSectionalArea: "393 mm²/m",
    },
    tags: ["mesh", "A393", "welded-mesh", "industrial", "heavy-duty", "structural"],
    sku: "NDS-A393-SHEET",
  },

  // Spacers
  {
    name: "Concrete Spacers - 25mm Cover (Pack of 100)",
    category: CATEGORIES.SPACERS,
    description: "Plastic clip-on spacers for 25mm concrete cover. Fits T8-T16 rebar. Essential for correct reinforcement positioning.",
    features: {
      cover: "25mm",
      compatibility: "T8-T16 rebar",
      quantity: "100 per pack",
      material: "High-impact plastic",
    },
    benefits: ["Easy clip-on installation", "Maintains correct cover", "Reusable", "Weather resistant"],
    specifications: {
      loadCapacity: "Up to 500kg",
      temperature: "-30°C to +60°C",
    },
    tags: ["spacers", "25mm", "cover", "clip-on", "plastic"],
    sku: "NDS-SPACER-25-100",
  },
  {
    name: "Concrete Spacers - 40mm Cover (Pack of 100)",
    category: CATEGORIES.SPACERS,
    description: "Plastic clip-on spacers for 40mm concrete cover. Fits T8-T20 rebar. Standard cover for external applications.",
    features: {
      cover: "40mm",
      compatibility: "T8-T20 rebar",
      quantity: "100 per pack",
      material: "High-impact plastic",
    },
    benefits: ["Standard external cover", "Easy installation", "Durable construction", "Value pack"],
    specifications: {
      loadCapacity: "Up to 500kg",
      temperature: "-30°C to +60°C",
    },
    tags: ["spacers", "40mm", "cover", "external", "standard"],
    sku: "NDS-SPACER-40-100",
  },
  {
    name: "Concrete Spacers - 50mm Cover (Pack of 100)",
    category: CATEGORIES.SPACERS,
    description: "Plastic clip-on spacers for 50mm concrete cover. Fits T10-T25 rebar. For aggressive environments and marine use.",
    features: {
      cover: "50mm",
      compatibility: "T10-T25 rebar",
      quantity: "100 per pack",
      material: "High-impact plastic",
    },
    benefits: ["Maximum protection cover", "Marine/aggressive environments", "Professional grade", "Reliable performance"],
    specifications: {
      loadCapacity: "Up to 600kg",
      temperature: "-30°C to +60°C",
    },
    tags: ["spacers", "50mm", "cover", "marine", "aggressive-environment"],
    sku: "NDS-SPACER-50-100",
  },
  {
    name: "Chair Spacers - Heavy Duty (Pack of 50)",
    category: CATEGORIES.SPACERS,
    description: "Steel chair spacers for top reinforcement support. Supports mesh and rebar at correct height. Various heights available.",
    features: {
      heights: ["50mm", "75mm", "100mm"],
      material: "Galvanized steel",
      quantity: "50 per pack",
      type: "Chair spacer",
    },
    benefits: ["Heavy load support", "Height options available", "Galvanized for durability", "Professional finish"],
    specifications: {
      loadCapacity: "Up to 2000kg per chair",
    },
    tags: ["spacers", "chair", "heavy-duty", "steel", "galvanized", "top-reinforcement"],
    sku: "NDS-CHAIR-HD-50",
  },

  // Accessories
  {
    name: "Tie Wire - 1.6mm Soft Annealed (20kg Coil)",
    category: CATEGORIES.ACCESSORIES,
    description: "Soft annealed tie wire for binding rebar. 1.6mm diameter. Essential for securing reinforcement cages.",
    features: {
      diameter: "1.6mm",
      weight: "20kg coil",
      material: "Soft annealed steel",
      finish: "Black annealed",
    },
    benefits: ["Easy to work with", "Strong binding", "Economical coil size", "Industry standard"],
    specifications: {
      length: "Approx 1000m per coil",
    },
    tags: ["tie-wire", "binding", "annealed", "accessories", "rebar-ties"],
    sku: "NDS-TIEWIRE-20KG",
  },
  {
    name: "Rebar Couplers - T12 Mechanical Splice (Pack of 10)",
    category: CATEGORIES.ACCESSORIES,
    description: "Mechanical rebar couplers for T12 bar splicing. Certified to BS8110. Alternative to lap splices.",
    features: {
      size: "T12",
      type: "Mechanical splice",
      certification: "BS8110 compliant",
      quantity: "10 per pack",
    },
    benefits: ["No lap length required", "Faster installation", "Certified performance", "Reduced steel usage"],
    specifications: {
      tensileCapacity: "Full bar strength",
    },
    tags: ["couplers", "T12", "mechanical-splice", "connection", "certified"],
    sku: "NDS-COUPLER-T12-10",
  },
  {
    name: "Rebar Couplers - T16 Mechanical Splice (Pack of 10)",
    category: CATEGORIES.ACCESSORIES,
    description: "Mechanical rebar couplers for T16 bar splicing. Certified to BS8110. Professional connection solution.",
    features: {
      size: "T16",
      type: "Mechanical splice",
      certification: "BS8110 compliant",
      quantity: "10 per pack",
    },
    benefits: ["Full strength connection", "Space saving", "Certified to BS8110", "Quick installation"],
    specifications: {
      tensileCapacity: "Full bar strength",
    },
    tags: ["couplers", "T16", "mechanical-splice", "connection", "professional"],
    sku: "NDS-COUPLER-T16-10",
  },
  {
    name: "Mesh Clips - Universal (Pack of 200)",
    category: CATEGORIES.ACCESSORIES,
    description: "Universal mesh clips for connecting overlapping mesh sheets. Quick and secure connection.",
    features: {
      type: "Universal clip",
      compatibility: "A142-A393 mesh",
      quantity: "200 per pack",
      material: "Spring steel",
    },
    benefits: ["Quick installation", "Secure connection", "No tools required", "Universal fit"],
    specifications: {
      wireRange: "6mm-10mm wire",
    },
    tags: ["mesh-clips", "connection", "universal", "accessories", "quick-fit"],
    sku: "NDS-MESHCLIP-200",
  },
];

/**
 * Create placeholder Cloudinary URLs for sample products
 * In production, these would come from actual Cloudinary images
 */
function getPlaceholderCloudinaryUrl(category: string, sku: string): string {
  // Use a placeholder service or return a default image URL
  // In production, this would be replaced with actual Cloudinary URLs
  const baseUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME || "placeholder"}/image/upload`;
  return `${baseUrl}/v1/product-library/${category}/${sku}.jpg`;
}

function getPlaceholderPublicId(category: string, sku: string): string {
  return `product-library/${category}/${sku}`;
}

/**
 * Seed products from sample data
 */
export async function seedProductsFromSampleData() {
  console.log("🌱 Seeding NDS Products from sample data...");
  console.log(`📦 ${SAMPLE_PRODUCTS.length} products to seed`);

  let created = 0;
  let updated = 0;
  let errors = 0;

  for (const productData of SAMPLE_PRODUCTS) {
    try {
      // Check if product exists by SKU
      const existing = await db.query.products.findFirst({
        where: eq(products.sku, productData.sku!),
      });

      const cloudinaryUrl = getPlaceholderCloudinaryUrl(productData.category, productData.sku!);
      const cloudinaryPublicId = getPlaceholderPublicId(productData.category, productData.sku!);

      const productRecord = {
        name: productData.name,
        cloudinaryUrl,
        cloudinaryPublicId,
        category: productData.category,
        description: productData.description,
        features: productData.features,
        benefits: productData.benefits,
        specifications: productData.specifications,
        tags: productData.tags,
        sku: productData.sku,
        enrichmentStatus: "complete" as const,
        enrichmentSource: "imported" as const,
      };

      if (existing) {
        await db.update(products)
          .set(productRecord)
          .where(eq(products.id, existing.id));
        updated++;
        console.log(`  🔄 Updated: ${productData.name}`);
      } else {
        await db.insert(products).values(productRecord);
        created++;
        console.log(`  ✨ Created: ${productData.name}`);
      }
    } catch (err) {
      errors++;
      console.error(`  ❌ Failed: ${productData.name}`, err);
    }
  }

  console.log(`\n✅ Product seeding complete:`);
  console.log(`   Created: ${created}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Errors: ${errors}`);

  return { created, updated, errors };
}

/**
 * Seed products from Cloudinary folder
 * Reads existing images and creates product records
 */
export async function seedProductsFromCloudinary(folder: string = "product-library") {
  console.log(`🌱 Seeding products from Cloudinary folder: ${folder}`);

  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY) {
    console.error("❌ Cloudinary not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET");
    return { created: 0, updated: 0, errors: 0, skipped: 0 };
  }

  let created = 0;
  let updated = 0;
  let errors = 0;
  let skipped = 0;

  try {
    // List all resources in the folder
    const result = await cloudinary.api.resources({
      type: "upload",
      prefix: folder,
      max_results: 500,
    });

    console.log(`📦 Found ${result.resources.length} images in Cloudinary`);

    for (const resource of result.resources) {
      try {
        // Check if product already exists
        const existing = await db.query.products.findFirst({
          where: eq(products.cloudinaryPublicId, resource.public_id),
        });

        if (existing) {
          skipped++;
          console.log(`  ⏭️  Skipped (exists): ${resource.public_id}`);
          continue;
        }

        // Extract name from public_id (e.g., "product-library/rebar/T10-6m" -> "T10-6m")
        const pathParts = resource.public_id.split("/");
        const fileName = pathParts[pathParts.length - 1];
        const category = pathParts.length > 2 ? pathParts[1] : "uncategorized";

        // Create product record
        await db.insert(products).values({
          name: fileName.replace(/-/g, " ").replace(/_/g, " "),
          cloudinaryUrl: resource.secure_url,
          cloudinaryPublicId: resource.public_id,
          category,
          tags: [category],
          enrichmentStatus: "pending",
        });

        created++;
        console.log(`  ✨ Created: ${fileName} (${category})`);
      } catch (err) {
        errors++;
        console.error(`  ❌ Failed: ${resource.public_id}`, err);
      }
    }
  } catch (err) {
    console.error("❌ Failed to list Cloudinary resources:", err);
    return { created: 0, updated: 0, errors: 1, skipped: 0 };
  }

  console.log(`\n✅ Cloudinary product seeding complete:`);
  console.log(`   Created: ${created}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Errors: ${errors}`);

  return { created, updated, errors, skipped };
}

/**
 * Main seed function - runs both sample data and Cloudinary import
 */
export async function seedProducts(options?: { sampleOnly?: boolean; cloudinaryOnly?: boolean; cloudinaryFolder?: string }) {
  console.log("\n" + "=".repeat(50));
  console.log("NDS PRODUCT SEEDING");
  console.log("=".repeat(50) + "\n");

  const results = {
    sample: { created: 0, updated: 0, errors: 0 },
    cloudinary: { created: 0, updated: 0, errors: 0, skipped: 0 },
  };

  if (!options?.cloudinaryOnly) {
    results.sample = await seedProductsFromSampleData();
  }

  if (!options?.sampleOnly) {
    results.cloudinary = await seedProductsFromCloudinary(options?.cloudinaryFolder);
  }

  return results;
}
