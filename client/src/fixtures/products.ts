/**
 * Product Test Fixtures
 *
 * Comprehensive mock product data for testing.
 * Covers various categories, enrichment statuses, and edge cases.
 *
 * @file client/src/fixtures/products.ts
 */

import type { Product } from '../../../shared/schema';

// Base date for consistent timestamps in tests
const BASE_DATE = new Date('2026-01-01T00:00:00Z');

/**
 * Helper to create dates relative to BASE_DATE
 */
function daysAgo(days: number): Date {
  const date = new Date(BASE_DATE);
  date.setDate(date.getDate() - days);
  return date;
}

/**
 * Full mock products array with 12 realistic products
 * Covers: drainage, waterproofing, flooring, concrete accessories, tools
 */
export const mockProducts: Product[] = [
  // === DRAINAGE PRODUCTS ===
  {
    id: 'prod-drain-001',
    name: 'NDS EZ-Drain Pre-Constructed French Drain',
    cloudinaryUrl: 'https://res.cloudinary.com/demo/image/upload/v1/products/nds-ez-drain.jpg',
    cloudinaryPublicId: 'products/nds-ez-drain',
    category: 'drainage',
    description: 'Pre-constructed French drain system with gravel-free technology. Installs in minutes, not hours.',
    features: {
      length: '10 feet',
      diameter: '6 inches',
      flowRate: '40 GPM',
      installation: ['trench', 'direct-bury'],
    },
    benefits: [
      'No gravel required',
      'Lightweight and easy to handle',
      'Resists root intrusion',
      'UV stabilized for long life',
    ],
    specifications: {
      weight: '15 lbs',
      material: 'HDPE',
      warranty: '25 years',
    },
    tags: ['french-drain', 'gravel-free', 'residential', 'commercial'],
    sku: 'NDS-EZD-10FT',
    enrichmentStatus: 'complete',
    enrichmentDraft: null,
    enrichmentVerifiedAt: daysAgo(30),
    enrichmentSource: 'ai_vision',
    createdAt: daysAgo(90),
  },
  {
    id: 'prod-drain-002',
    name: 'Channel Drain with Galvanized Steel Grate',
    cloudinaryUrl: 'https://res.cloudinary.com/demo/image/upload/v1/products/channel-drain-steel.jpg',
    cloudinaryPublicId: 'products/channel-drain-steel',
    category: 'drainage',
    description: 'Heavy-duty channel drain for driveways and high-traffic areas.',
    features: {
      length: '39.4 inches',
      width: '5.5 inches',
      loadClass: 'Class C',
      grateStyle: 'slotted',
    },
    benefits: [
      'Handles heavy vehicle loads',
      'Corrosion-resistant grate',
      'Easy snap-together installation',
      'ADA compliant',
    ],
    specifications: {
      flowCapacity: '25 GPM',
      material: 'Polypropylene body',
      grateFinish: 'Galvanized steel',
    },
    tags: ['channel-drain', 'driveway', 'commercial', 'heavy-duty'],
    sku: 'CD-GALV-39',
    enrichmentStatus: 'complete',
    enrichmentDraft: null,
    enrichmentVerifiedAt: daysAgo(15),
    enrichmentSource: 'user_manual',
    createdAt: daysAgo(60),
  },

  // === WATERPROOFING PRODUCTS ===
  {
    id: 'prod-wp-001',
    name: 'Poly-Wall BlueSkin VP160 Self-Adhered Membrane',
    cloudinaryUrl: 'https://res.cloudinary.com/demo/image/upload/v1/products/blueskin-vp160.jpg',
    cloudinaryPublicId: 'products/blueskin-vp160',
    category: 'waterproofing',
    description: 'Premium self-adhered vapor permeable air and water barrier membrane.',
    features: {
      rollSize: '4 ft x 75 ft',
      thickness: '40 mil',
      application: ['foundation', 'above-grade', 'below-grade'],
      temperature: '-20F to 140F',
    },
    benefits: [
      'Self-healing around fasteners',
      'Vapor permeable design',
      'Cold weather application',
      'No primer required on most substrates',
    ],
    specifications: {
      coverage: '300 sq ft per roll',
      adhesion: 'SBS modified bitumen',
      vapor: '16 perms',
    },
    tags: ['membrane', 'self-adhered', 'foundation', 'vapor-barrier'],
    sku: 'PW-BS-VP160',
    enrichmentStatus: 'complete',
    enrichmentDraft: null,
    enrichmentVerifiedAt: daysAgo(7),
    enrichmentSource: 'ai_search',
    createdAt: daysAgo(45),
  },
  {
    id: 'prod-wp-002',
    name: 'Liquid Rubber Foundation Sealant',
    cloudinaryUrl: 'https://res.cloudinary.com/demo/image/upload/v1/products/liquid-rubber-sealant.jpg',
    cloudinaryPublicId: 'products/liquid-rubber-sealant',
    category: 'waterproofing',
    description: 'Water-based liquid rubber coating for basement and foundation waterproofing.',
    features: {
      container: '5 gallon',
      coverage: '60-80 sq ft per gallon',
      dryTime: '4-6 hours between coats',
      coats: 'Minimum 2 recommended',
    },
    benefits: [
      'Eco-friendly water-based formula',
      'Seals cracks up to 1/8 inch',
      'Paintable after curing',
      'Safe for interior use',
    ],
    specifications: {
      VOC: 'Less than 50 g/L',
      elongation: '900%',
      tensile: '350 PSI',
    },
    tags: ['liquid-rubber', 'foundation', 'basement', 'eco-friendly'],
    sku: 'LR-FOUND-5G',
    enrichmentStatus: 'draft',
    enrichmentDraft: {
      description: 'AI-suggested description pending review',
      benefits: ['Flexible seal', 'Easy application'],
    },
    enrichmentVerifiedAt: null,
    enrichmentSource: 'ai_vision',
    createdAt: daysAgo(10),
  },

  // === FLOORING PRODUCTS ===
  {
    id: 'prod-floor-001',
    name: 'Premium Engineered Oak Hardwood - Natural',
    cloudinaryUrl: 'https://res.cloudinary.com/demo/image/upload/v1/products/engineered-oak-natural.jpg',
    cloudinaryPublicId: 'products/engineered-oak-natural',
    category: 'flooring',
    description: 'Wide plank engineered hardwood with genuine oak wear layer.',
    features: {
      width: '7 inches',
      length: '48 inches',
      thickness: '5/8 inch',
      wearLayer: '3mm solid oak',
      installation: ['glue-down', 'nail-down', 'float'],
    },
    benefits: [
      'Works with radiant heat',
      'Dimensional stability',
      'Real wood beauty',
      'Refinishable up to 2 times',
    ],
    specifications: {
      boxCoverage: '20 sq ft',
      planksPerBox: 8,
      janka: '1290',
      finish: 'UV-cured polyurethane',
    },
    tags: ['engineered', 'oak', 'hardwood', 'wide-plank', 'natural'],
    sku: 'ENG-OAK-NAT-7',
    enrichmentStatus: 'complete',
    enrichmentDraft: null,
    enrichmentVerifiedAt: daysAgo(20),
    enrichmentSource: 'imported',
    createdAt: daysAgo(120),
  },
  {
    id: 'prod-floor-002',
    name: 'Porcelain Tile 24x24 - Carrara Marble Look',
    cloudinaryUrl: 'https://res.cloudinary.com/demo/image/upload/v1/products/porcelain-carrara.jpg',
    cloudinaryPublicId: 'products/porcelain-carrara',
    category: 'flooring',
    description: 'Large format porcelain tile with realistic Carrara marble appearance.',
    features: {
      size: '24 x 24 inches',
      thickness: '10mm',
      rectified: true,
      application: ['floor', 'wall', 'shower'],
    },
    benefits: [
      'Frost resistant',
      'Low maintenance',
      'Scratch resistant',
      'Realistic veining pattern',
    ],
    specifications: {
      PEI: '4',
      waterAbsorption: '<0.5%',
      coefficient: '0.50 DCOF',
      shade: 'V3 - Moderate Variation',
    },
    tags: ['porcelain', 'tile', 'marble-look', 'large-format'],
    sku: 'POR-CARR-24',
    enrichmentStatus: 'pending',
    enrichmentDraft: null,
    enrichmentVerifiedAt: null,
    enrichmentSource: null,
    createdAt: daysAgo(5),
  },

  // === CONCRETE ACCESSORIES ===
  {
    id: 'prod-conc-001',
    name: '#4 Rebar Chair Spacers (100 Pack)',
    cloudinaryUrl: 'https://res.cloudinary.com/demo/image/upload/v1/products/rebar-chairs.jpg',
    cloudinaryPublicId: 'products/rebar-chairs',
    category: 'concrete',
    description: 'Heavy-duty plastic rebar support chairs for proper concrete coverage.',
    features: {
      height: '3 inches',
      capacity: 'Up to #8 rebar',
      material: 'High-impact plastic',
      pack: '100 pieces',
    },
    benefits: [
      'Ensures proper rebar clearance',
      'Stable on various surfaces',
      'UV resistant',
      'Reusable',
    ],
    specifications: {
      loadCapacity: '500 lbs',
      baseDiameter: '3 inches',
    },
    tags: ['rebar', 'spacers', 'concrete', 'reinforcement'],
    sku: 'RBC-3IN-100',
    enrichmentStatus: 'verified',
    enrichmentDraft: null,
    enrichmentVerifiedAt: daysAgo(3),
    enrichmentSource: 'ai_vision',
    createdAt: daysAgo(75),
  },
  {
    id: 'prod-conc-002',
    name: 'Welded Wire Mesh 6x6 W1.4/W1.4',
    cloudinaryUrl: 'https://res.cloudinary.com/demo/image/upload/v1/products/wire-mesh.jpg',
    cloudinaryPublicId: 'products/wire-mesh',
    category: 'concrete',
    description: 'Standard concrete reinforcement mesh for slabs and footings.',
    features: {
      sheetSize: '5 ft x 10 ft',
      gridSpacing: '6 x 6 inches',
      wireGauge: 'W1.4/W1.4',
    },
    benefits: [
      'Controls shrinkage cracking',
      'Easy to cut and handle',
      'Cost-effective reinforcement',
    ],
    specifications: {
      steelArea: '0.028 sq in/ft',
      yield: '65,000 PSI',
    },
    tags: ['mesh', 'wire', 'reinforcement', 'concrete'],
    sku: 'WWM-6X6-W14',
    enrichmentStatus: 'complete',
    enrichmentDraft: null,
    enrichmentVerifiedAt: daysAgo(40),
    enrichmentSource: 'user_manual',
    createdAt: daysAgo(100),
  },

  // === TOOLS ===
  {
    id: 'prod-tool-001',
    name: 'Power Tile Cutter 7" Wet Saw',
    cloudinaryUrl: 'https://res.cloudinary.com/demo/image/upload/v1/products/tile-wet-saw.jpg',
    cloudinaryPublicId: 'products/tile-wet-saw',
    category: 'tools',
    description: 'Compact wet tile saw for precise ceramic and porcelain cuts.',
    features: {
      bladeSize: '7 inches',
      maxCut: '14 inches diagonal',
      motor: '1.5 HP',
      waterPump: 'Recirculating',
    },
    benefits: [
      'Portable design',
      'Clean dust-free cuts',
      'Adjustable rip fence',
      'Miter capability to 45 degrees',
    ],
    specifications: {
      bladeSpeeed: '3600 RPM',
      voltage: '120V',
      weight: '35 lbs',
    },
    tags: ['tile-saw', 'wet-saw', 'cutting', 'tools'],
    sku: 'WS-TILE-7IN',
    enrichmentStatus: 'draft',
    enrichmentDraft: {
      description: 'Pending verification',
    },
    enrichmentVerifiedAt: null,
    enrichmentSource: 'ai_vision',
    createdAt: daysAgo(8),
  },
  {
    id: 'prod-tool-002',
    name: 'Mixing Paddle for Thinset - 18" Spiral',
    cloudinaryUrl: 'https://res.cloudinary.com/demo/image/upload/v1/products/mixing-paddle.jpg',
    cloudinaryPublicId: 'products/mixing-paddle',
    category: 'tools',
    description: 'Professional spiral mixing paddle for thinset, grout, and mortar.',
    features: {
      length: '18 inches',
      diameter: '3.5 inches',
      shank: '5/8-11 thread',
      material: 'Zinc-plated steel',
    },
    benefits: [
      'Even mixing without air pockets',
      'Compatible with most drills',
      'Easy to clean',
    ],
    specifications: {
      recommendedDrill: '1/2" min',
      maxBucket: '5 gallon',
    },
    tags: ['mixing', 'paddle', 'thinset', 'mortar', 'tools'],
    sku: 'MIX-PAD-18SP',
    enrichmentStatus: 'pending',
    enrichmentDraft: null,
    enrichmentVerifiedAt: null,
    enrichmentSource: null,
    createdAt: daysAgo(2),
  },

  // === EDGE CASES ===
  {
    id: 'prod-edge-001',
    name: 'Product With Missing Data',
    cloudinaryUrl: 'https://res.cloudinary.com/demo/image/upload/v1/products/placeholder.jpg',
    cloudinaryPublicId: 'products/placeholder',
    category: null,
    description: null,
    features: null,
    benefits: null,
    specifications: null,
    tags: [],
    sku: null,
    enrichmentStatus: 'pending',
    enrichmentDraft: null,
    enrichmentVerifiedAt: null,
    enrichmentSource: null,
    createdAt: daysAgo(1),
  },
  {
    id: 'prod-edge-002',
    name: 'Product With Failed Enrichment',
    cloudinaryUrl: 'https://res.cloudinary.com/demo/image/upload/v1/products/failed-product.jpg',
    cloudinaryPublicId: 'products/failed-product',
    category: 'other',
    description: 'This product failed enrichment processing.',
    features: null,
    benefits: null,
    specifications: null,
    tags: ['failed', 'retry'],
    sku: 'FAIL-001',
    enrichmentStatus: 'pending',
    enrichmentDraft: {
      error: 'Vision analysis failed: Rate limit exceeded',
      attemptCount: 3,
    },
    enrichmentVerifiedAt: null,
    enrichmentSource: 'ai_vision',
    createdAt: daysAgo(14),
  },
];

// === FILTERED SUBSETS ===

/** Products in drainage category */
export const drainageProducts = mockProducts.filter(
  (p) => p.category === 'drainage'
);

/** Products in waterproofing category */
export const waterproofingProducts = mockProducts.filter(
  (p) => p.category === 'waterproofing'
);

/** Products in flooring category */
export const flooringProducts = mockProducts.filter(
  (p) => p.category === 'flooring'
);

/** Products in concrete category */
export const concreteProducts = mockProducts.filter(
  (p) => p.category === 'concrete'
);

/** Products in tools category */
export const toolProducts = mockProducts.filter(
  (p) => p.category === 'tools'
);

/** Products with pending enrichment status */
export const pendingProducts = mockProducts.filter(
  (p) => p.enrichmentStatus === 'pending'
);

/** Products with draft enrichment status */
export const draftProducts = mockProducts.filter(
  (p) => p.enrichmentStatus === 'draft'
);

/** Products with complete enrichment status */
export const completeProducts = mockProducts.filter(
  (p) => p.enrichmentStatus === 'complete'
);

/** Products with verified enrichment status */
export const verifiedProducts = mockProducts.filter(
  (p) => p.enrichmentStatus === 'verified'
);

/** Products created in the last 7 days */
export const recentProducts = mockProducts.filter(
  (p) => p.createdAt >= daysAgo(7)
);

/** Products with missing/null data (edge cases) */
export const edgeCaseProducts = mockProducts.filter(
  (p) => p.id.startsWith('prod-edge')
);

// === FACTORY FUNCTIONS ===

/**
 * Creates a new product with custom overrides
 * Useful for creating specific test scenarios
 */
export function createMockProduct(overrides: Partial<Product> = {}): Product {
  const id = overrides.id || `prod-test-${Date.now()}`;
  return {
    id,
    name: `Test Product ${id}`,
    cloudinaryUrl: `https://res.cloudinary.com/demo/image/upload/v1/products/${id}.jpg`,
    cloudinaryPublicId: `products/${id}`,
    category: 'drainage',
    description: 'A test product for unit testing',
    features: { test: true },
    benefits: ['Test benefit 1', 'Test benefit 2'],
    specifications: { weight: '1 lb' },
    tags: ['test'],
    sku: `TEST-${id}`,
    enrichmentStatus: 'pending',
    enrichmentDraft: null,
    enrichmentVerifiedAt: null,
    enrichmentSource: null,
    createdAt: new Date(),
    ...overrides,
  };
}

/**
 * Creates an array of products with sequential IDs
 */
export function createMockProducts(
  count: number,
  overrides: Partial<Product> = {}
): Product[] {
  return Array.from({ length: count }, (_, i) =>
    createMockProduct({
      id: `prod-bulk-${i + 1}`,
      name: `Bulk Product ${i + 1}`,
      ...overrides,
    })
  );
}

// === SINGLE PRODUCT EXPORTS (for convenience) ===

/** A single complete drainage product */
export const singleDrainageProduct = mockProducts[0];

/** A single complete waterproofing product */
export const singleWaterproofingProduct = mockProducts[2];

/** A single flooring product */
export const singleFlooringProduct = mockProducts[4];

/** A single product with pending enrichment */
export const singlePendingProduct = mockProducts[5];

/** A single product with draft enrichment */
export const singleDraftProduct = mockProducts[3];

/** A single product with missing data (edge case) */
export const singleEdgeCaseProduct = mockProducts[10];
