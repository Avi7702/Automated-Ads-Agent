/**
 * Quick schema validation test for Phase 0.5 Product Knowledge
 */

import {
  insertProductSchema,
  insertInstallationScenarioSchema,
  insertProductRelationshipSchema,
  insertBrandImageSchema,
} from '../shared/schema';

let passed = 0;
let failed = 0;

function test(name: string, result: boolean) {
  if (result) {
    console.log(`✓ ${name}`);
    passed++;
  } else {
    console.log(`✗ ${name}`);
    failed++;
  }
}

console.log('\n=== Enhanced Products Schema Tests ===\n');

// Test 1: Product with all new fields
test('Product with description, features, benefits, tags, sku',
  insertProductSchema.safeParse({
    name: 'Oak Engineered Flooring',
    cloudinaryUrl: 'https://res.cloudinary.com/test/image.jpg',
    cloudinaryPublicId: 'products/oak-flooring',
    description: 'Premium 5-inch wide oak engineered flooring.',
    features: { width: '5 inches', thickness: '5/8 inch' },
    benefits: ['Durable', 'Easy to maintain'],
    specifications: { boxCoverage: '20 sq ft' },
    tags: ['oak', 'engineered'],
    sku: 'OEF-NAT-5',
  }).success
);

// Test 2: Product with only required fields (backward compatibility)
test('Product with only required fields (backward compat)',
  insertProductSchema.safeParse({
    name: 'Basic Product',
    cloudinaryUrl: 'https://res.cloudinary.com/test/image.jpg',
    cloudinaryPublicId: 'products/basic',
  }).success
);

console.log('\n=== Installation Scenarios Schema Tests ===\n');

// Test 3: Valid installation scenario
test('Valid installation scenario with required fields',
  insertInstallationScenarioSchema.safeParse({
    userId: 'user-123',
    title: 'Modern Living Room',
    description: 'Contemporary living space with oak flooring',
    scenarioType: 'room_type',
  }).success
);

// Test 4: Scenario with all fields
test('Installation scenario with all optional fields',
  insertInstallationScenarioSchema.safeParse({
    userId: 'user-123',
    title: 'Modern Living Room',
    description: 'Contemporary living space',
    scenarioType: 'room_type',
    primaryProductId: 'prod-123',
    secondaryProductIds: ['prod-456'],
    referenceImages: [{ cloudinaryUrl: 'https://example.com/img.jpg', publicId: 'img', caption: 'Test' }],
    installationSteps: ['Step 1', 'Step 2'],
    requiredAccessories: ['Underlayment'],
    roomTypes: ['living room'],
    styleTags: ['modern'],
    isActive: true,
  }).success
);

// Test 5: Valid scenario types
['room_type', 'application', 'before_after'].forEach(type => {
  test(`scenarioType: ${type} accepted`,
    insertInstallationScenarioSchema.safeParse({
      userId: 'user-123',
      title: 'Test',
      description: 'Test',
      scenarioType: type,
    }).success
  );
});

// Test 6: Invalid scenario type rejected
test('Invalid scenarioType rejected',
  !insertInstallationScenarioSchema.safeParse({
    userId: 'user-123',
    title: 'Test',
    description: 'Test',
    scenarioType: 'invalid_type',
  }).success
);

console.log('\n=== Product Relationships Schema Tests ===\n');

// Test 7: Valid relationship
test('Valid product relationship',
  insertProductRelationshipSchema.safeParse({
    userId: 'user-123',
    sourceProductId: 'prod-123',
    targetProductId: 'prod-456',
    relationshipType: 'pairs_with',
    description: 'Recommended underlayment',
  }).success
);

// Test 8: All relationship types
['pairs_with', 'requires', 'replaces', 'matches', 'completes', 'upgrades'].forEach(type => {
  test(`relationshipType: ${type} accepted`,
    insertProductRelationshipSchema.safeParse({
      userId: 'user-123',
      sourceProductId: 'prod-123',
      targetProductId: 'prod-456',
      relationshipType: type,
    }).success
  );
});

// Test 9: Invalid relationship type rejected
test('Invalid relationshipType rejected',
  !insertProductRelationshipSchema.safeParse({
    userId: 'user-123',
    sourceProductId: 'prod-123',
    targetProductId: 'prod-456',
    relationshipType: 'invalid_type',
  }).success
);

console.log('\n=== Brand Images Schema Tests ===\n');

// Test 10: Valid brand image
test('Valid brand image with required fields',
  insertBrandImageSchema.safeParse({
    userId: 'user-123',
    cloudinaryUrl: 'https://res.cloudinary.com/test/image.jpg',
    cloudinaryPublicId: 'brand-images/hero',
    category: 'product_hero',
  }).success
);

// Test 11: Brand image with all fields
test('Brand image with all optional fields',
  insertBrandImageSchema.safeParse({
    userId: 'user-123',
    cloudinaryUrl: 'https://res.cloudinary.com/test/image.jpg',
    cloudinaryPublicId: 'brand-images/hero',
    category: 'product_hero',
    tags: ['modern', 'living room'],
    description: 'Hero shot of product',
    productIds: ['prod-123', 'prod-456'],
    suggestedUse: ['hero', 'social_media'],
    aspectRatio: '16:9',
  }).success
);

// Test 12: All image categories
['historical_ad', 'product_hero', 'installation', 'detail', 'lifestyle', 'comparison'].forEach(cat => {
  test(`category: ${cat} accepted`,
    insertBrandImageSchema.safeParse({
      userId: 'user-123',
      cloudinaryUrl: 'https://res.cloudinary.com/test/image.jpg',
      cloudinaryPublicId: 'brand-images/test',
      category: cat,
    }).success
  );
});

// Test 13: Invalid category rejected
test('Invalid category rejected',
  !insertBrandImageSchema.safeParse({
    userId: 'user-123',
    cloudinaryUrl: 'https://res.cloudinary.com/test/image.jpg',
    cloudinaryPublicId: 'brand-images/test',
    category: 'invalid_category',
  }).success
);

console.log('\n========================================');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('========================================\n');

if (failed > 0) {
  process.exit(1);
}
