/**
 * Generation Test Fixtures
 *
 * Mock generation data for testing image generation workflows.
 * Covers various statuses, edit chains, and edge cases.
 *
 * @file client/src/fixtures/generations.ts
 */

import type { Generation } from '../../../shared/schema';

// Base date for consistent timestamps in tests
const BASE_DATE = new Date('2026-01-15T12:00:00Z');

/**
 * Helper to create dates relative to BASE_DATE
 */
function hoursAgo(hours: number): Date {
  return new Date(BASE_DATE.getTime() - hours * 60 * 60 * 1000);
}

function daysAgo(days: number): Date {
  return new Date(BASE_DATE.getTime() - days * 24 * 60 * 60 * 1000);
}

/**
 * Full mock generations array with 15 generations
 * Includes: completed, pending, processing, failed, edit chains
 */
export const mockGenerations: Generation[] = [
  // === COMPLETED GENERATIONS (STANDALONE) ===
  {
    id: 'gen-001',
    userId: 'user-test-1',
    prompt: 'Professional product photograph of NDS EZ-Drain on white background with soft studio lighting',
    originalImagePaths: ['products/nds-ez-drain.jpg'],
    generatedImagePath: 'generations/gen-001-output.jpg',
    imagePath: '/uploads/generations/gen-001-output.jpg',
    resolution: '2K',
    model: 'gemini-3-pro-image',
    aspectRatio: '1:1',
    status: 'completed',
    conversationHistory: [
      { role: 'user', content: 'Create a product hero shot' },
      { role: 'assistant', content: 'Generated professional product photograph' },
    ],
    parentGenerationId: null,
    editPrompt: null,
    editCount: 0,
    createdAt: daysAgo(7),
    updatedAt: daysAgo(7),
  },
  {
    id: 'gen-002',
    userId: 'user-test-1',
    prompt: 'Show BlueSkin waterproofing membrane being installed on foundation wall',
    originalImagePaths: ['products/blueskin-vp160.jpg'],
    generatedImagePath: 'generations/gen-002-output.jpg',
    imagePath: '/uploads/generations/gen-002-output.jpg',
    resolution: '2K',
    model: 'gemini-3-pro-image',
    aspectRatio: '16:9',
    status: 'completed',
    conversationHistory: null,
    parentGenerationId: null,
    editPrompt: null,
    editCount: 0,
    createdAt: daysAgo(5),
    updatedAt: daysAgo(5),
  },
  {
    id: 'gen-003',
    userId: 'user-test-2',
    prompt: 'Engineered oak flooring in modern living room with natural light',
    originalImagePaths: ['products/engineered-oak-natural.jpg'],
    generatedImagePath: 'generations/gen-003-output.jpg',
    imagePath: '/uploads/generations/gen-003-output.jpg',
    resolution: '4K',
    model: 'gemini-3-pro-image',
    aspectRatio: '4:5',
    status: 'completed',
    conversationHistory: null,
    parentGenerationId: null,
    editPrompt: null,
    editCount: 0,
    createdAt: daysAgo(3),
    updatedAt: daysAgo(3),
  },

  // === EDIT CHAIN (PARENT -> CHILD -> GRANDCHILD) ===
  {
    id: 'gen-edit-parent',
    userId: 'user-test-1',
    prompt: 'Channel drain on driveway with car approaching',
    originalImagePaths: ['products/channel-drain-steel.jpg'],
    generatedImagePath: 'generations/gen-edit-parent-output.jpg',
    imagePath: '/uploads/generations/gen-edit-parent-output.jpg',
    resolution: '2K',
    model: 'gemini-3-pro-image',
    aspectRatio: '16:9',
    status: 'completed',
    conversationHistory: null,
    parentGenerationId: null,
    editPrompt: null,
    editCount: 0,
    createdAt: daysAgo(10),
    updatedAt: daysAgo(10),
  },
  {
    id: 'gen-edit-child',
    userId: 'user-test-1',
    prompt: 'Channel drain on driveway with car approaching',
    originalImagePaths: ['products/channel-drain-steel.jpg', 'generations/gen-edit-parent-output.jpg'],
    generatedImagePath: 'generations/gen-edit-child-output.jpg',
    imagePath: '/uploads/generations/gen-edit-child-output.jpg',
    resolution: '2K',
    model: 'gemini-3-pro-image',
    aspectRatio: '16:9',
    status: 'completed',
    conversationHistory: [
      { role: 'user', content: 'Make the car a red sports car instead' },
      { role: 'assistant', content: 'Updated the vehicle to a red sports car' },
    ],
    parentGenerationId: 'gen-edit-parent',
    editPrompt: 'Make the car a red sports car instead',
    editCount: 1,
    createdAt: daysAgo(9),
    updatedAt: daysAgo(9),
  },
  {
    id: 'gen-edit-grandchild',
    userId: 'user-test-1',
    prompt: 'Channel drain on driveway with car approaching',
    originalImagePaths: ['products/channel-drain-steel.jpg', 'generations/gen-edit-child-output.jpg'],
    generatedImagePath: 'generations/gen-edit-grandchild-output.jpg',
    imagePath: '/uploads/generations/gen-edit-grandchild-output.jpg',
    resolution: '2K',
    model: 'gemini-3-pro-image',
    aspectRatio: '16:9',
    status: 'completed',
    conversationHistory: [
      { role: 'user', content: 'Make the car a red sports car instead' },
      { role: 'assistant', content: 'Updated the vehicle to a red sports car' },
      { role: 'user', content: 'Add rain and puddles for dramatic effect' },
      { role: 'assistant', content: 'Added rain and water puddles to the scene' },
    ],
    parentGenerationId: 'gen-edit-child',
    editPrompt: 'Add rain and puddles for dramatic effect',
    editCount: 2,
    createdAt: daysAgo(8),
    updatedAt: daysAgo(8),
  },

  // === PENDING GENERATIONS ===
  {
    id: 'gen-pending-001',
    userId: 'user-test-1',
    prompt: 'Rebar chairs supporting reinforcement in concrete pour',
    originalImagePaths: ['products/rebar-chairs.jpg'],
    generatedImagePath: '',
    imagePath: null,
    resolution: '2K',
    model: 'gemini-3-pro-image',
    aspectRatio: '1:1',
    status: 'pending',
    conversationHistory: null,
    parentGenerationId: null,
    editPrompt: null,
    editCount: 0,
    createdAt: hoursAgo(1),
    updatedAt: hoursAgo(1),
  },
  {
    id: 'gen-pending-002',
    userId: 'user-test-2',
    prompt: 'Wire mesh installation in commercial slab',
    originalImagePaths: ['products/wire-mesh.jpg'],
    generatedImagePath: '',
    imagePath: null,
    resolution: '4K',
    model: 'gemini-3-pro-image',
    aspectRatio: '16:9',
    status: 'pending',
    conversationHistory: null,
    parentGenerationId: null,
    editPrompt: null,
    editCount: 0,
    createdAt: hoursAgo(0.5),
    updatedAt: hoursAgo(0.5),
  },

  // === PROCESSING GENERATIONS ===
  {
    id: 'gen-processing-001',
    userId: 'user-test-1',
    prompt: 'Tile wet saw cutting porcelain with water spray',
    originalImagePaths: ['products/tile-wet-saw.jpg'],
    generatedImagePath: '',
    imagePath: null,
    resolution: '2K',
    model: 'gemini-3-pro-image',
    aspectRatio: '1:1',
    status: 'processing',
    conversationHistory: null,
    parentGenerationId: null,
    editPrompt: null,
    editCount: 0,
    createdAt: hoursAgo(0.25),
    updatedAt: hoursAgo(0.1),
  },

  // === FAILED GENERATIONS ===
  {
    id: 'gen-failed-001',
    userId: 'user-test-1',
    prompt: 'Liquid rubber sealant application on basement wall',
    originalImagePaths: ['products/liquid-rubber-sealant.jpg'],
    generatedImagePath: '',
    imagePath: null,
    resolution: '2K',
    model: 'gemini-3-pro-image',
    aspectRatio: '9:16',
    status: 'failed',
    conversationHistory: [
      { role: 'system', content: 'Error: Rate limit exceeded. Please try again later.' },
    ],
    parentGenerationId: null,
    editPrompt: null,
    editCount: 0,
    createdAt: hoursAgo(2),
    updatedAt: hoursAgo(2),
  },
  {
    id: 'gen-failed-002',
    userId: 'user-test-2',
    prompt: 'Underground drainage cutaway showing soil layers',
    originalImagePaths: ['products/nds-ez-drain.jpg'],
    generatedImagePath: '',
    imagePath: null,
    resolution: '2K',
    model: 'gemini-3-pro-image',
    aspectRatio: '16:9',
    status: 'failed',
    conversationHistory: [
      { role: 'system', content: 'Error: Content policy violation detected.' },
    ],
    parentGenerationId: null,
    editPrompt: null,
    editCount: 0,
    createdAt: hoursAgo(5),
    updatedAt: hoursAgo(5),
  },

  // === EDGE CASES ===
  {
    id: 'gen-edge-001',
    userId: null, // Anonymous generation (legacy support)
    prompt: 'Test generation without user',
    originalImagePaths: ['test.jpg'],
    generatedImagePath: 'generations/gen-edge-001-output.jpg',
    imagePath: '/uploads/generations/gen-edge-001-output.jpg',
    resolution: '1K',
    model: null,
    aspectRatio: '1:1',
    status: 'completed',
    conversationHistory: null,
    parentGenerationId: null,
    editPrompt: null,
    editCount: 0,
    createdAt: daysAgo(30),
    updatedAt: daysAgo(30),
  },
  {
    id: 'gen-edge-002',
    userId: 'user-test-1',
    prompt: 'Generation with multiple input images',
    originalImagePaths: [
      'products/nds-ez-drain.jpg',
      'products/channel-drain-steel.jpg',
      'products/blueskin-vp160.jpg',
    ],
    generatedImagePath: 'generations/gen-edge-002-output.jpg',
    imagePath: '/uploads/generations/gen-edge-002-output.jpg',
    resolution: '4K',
    model: 'gemini-3-pro-image',
    aspectRatio: '1:1',
    status: 'completed',
    conversationHistory: null,
    parentGenerationId: null,
    editPrompt: null,
    editCount: 0,
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
  },
  {
    id: 'gen-edge-003',
    userId: 'user-test-1',
    prompt: 'Very long prompt that tests the limits of prompt handling in the system. This prompt contains extensive details about the desired image including specific lighting requirements, exact positioning of elements, detailed background descriptions, color specifications using hex codes, and multiple reference points for the AI to consider when generating the final output.',
    originalImagePaths: ['products/mixing-paddle.jpg'],
    generatedImagePath: 'generations/gen-edge-003-output.jpg',
    imagePath: '/uploads/generations/gen-edge-003-output.jpg',
    resolution: '2K',
    model: 'gemini-3-pro-image',
    aspectRatio: '1:1',
    status: 'completed',
    conversationHistory: null,
    parentGenerationId: null,
    editPrompt: null,
    editCount: 0,
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
];

// === FILTERED SUBSETS ===

/** All completed generations */
export const completedGenerations = mockGenerations.filter(
  (g) => g.status === 'completed'
);

/** All pending generations */
export const pendingGenerations = mockGenerations.filter(
  (g) => g.status === 'pending'
);

/** All processing generations */
export const processingGenerations = mockGenerations.filter(
  (g) => g.status === 'processing'
);

/** All failed generations */
export const failedGenerations = mockGenerations.filter(
  (g) => g.status === 'failed'
);

/** Generations that are edits (have parent) */
export const editGenerations = mockGenerations.filter(
  (g) => g.parentGenerationId !== null
);

/** Root generations (no parent) */
export const rootGenerations = mockGenerations.filter(
  (g) => g.parentGenerationId === null
);

/** Generations by user-test-1 */
export const userTest1Generations = mockGenerations.filter(
  (g) => g.userId === 'user-test-1'
);

/** Generations by user-test-2 */
export const userTest2Generations = mockGenerations.filter(
  (g) => g.userId === 'user-test-2'
);

/** Generations with 4K resolution */
export const highResGenerations = mockGenerations.filter(
  (g) => g.resolution === '4K'
);

/** Generations from the last 24 hours */
export const recentGenerations = mockGenerations.filter(
  (g) => g.createdAt >= hoursAgo(24)
);

/** Edge case generations */
export const edgeCaseGenerations = mockGenerations.filter(
  (g) => g.id.startsWith('gen-edge')
);

// === EDIT CHAIN HELPERS ===

/** The complete edit chain (parent -> child -> grandchild) */
export const editChain = {
  parent: mockGenerations.find((g) => g.id === 'gen-edit-parent')!,
  child: mockGenerations.find((g) => g.id === 'gen-edit-child')!,
  grandchild: mockGenerations.find((g) => g.id === 'gen-edit-grandchild')!,
};

/**
 * Get the edit history for a generation
 * Returns array from oldest ancestor to the given generation
 */
export function getEditHistory(generationId: string): Generation[] {
  const history: Generation[] = [];
  let current = mockGenerations.find((g) => g.id === generationId);

  while (current) {
    history.unshift(current);
    if (current.parentGenerationId) {
      current = mockGenerations.find((g) => g.id === current!.parentGenerationId);
    } else {
      current = undefined;
    }
  }

  return history;
}

/**
 * Get all children (direct descendants) of a generation
 */
export function getChildren(generationId: string): Generation[] {
  return mockGenerations.filter((g) => g.parentGenerationId === generationId);
}

/**
 * Get all descendants of a generation (recursive)
 */
export function getAllDescendants(generationId: string): Generation[] {
  const descendants: Generation[] = [];
  const children = getChildren(generationId);

  for (const child of children) {
    descendants.push(child);
    descendants.push(...getAllDescendants(child.id));
  }

  return descendants;
}

// === FACTORY FUNCTIONS ===

/**
 * Creates a new generation with custom overrides
 */
export function createMockGeneration(
  overrides: Partial<Generation> = {}
): Generation {
  const id = overrides.id || `gen-test-${Date.now()}`;
  const now = new Date();
  return {
    id,
    userId: 'user-test-1',
    prompt: 'Test generation prompt',
    originalImagePaths: ['test-input.jpg'],
    generatedImagePath: `generations/${id}-output.jpg`,
    imagePath: `/uploads/generations/${id}-output.jpg`,
    resolution: '2K',
    model: 'gemini-3-pro-image',
    aspectRatio: '1:1',
    status: 'completed',
    conversationHistory: null,
    parentGenerationId: null,
    editPrompt: null,
    editCount: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Creates an edit generation linked to a parent
 */
export function createMockEdit(
  parentId: string,
  editPrompt: string,
  overrides: Partial<Generation> = {}
): Generation {
  const parent = mockGenerations.find((g) => g.id === parentId);
  const editCount = (parent?.editCount || 0) + 1;

  return createMockGeneration({
    parentGenerationId: parentId,
    editPrompt,
    editCount,
    originalImagePaths: parent
      ? [...parent.originalImagePaths, parent.generatedImagePath]
      : ['test.jpg'],
    conversationHistory: parent?.conversationHistory
      ? [
          ...parent.conversationHistory,
          { role: 'user', content: editPrompt },
          { role: 'assistant', content: 'Applied edit' },
        ]
      : [
          { role: 'user', content: editPrompt },
          { role: 'assistant', content: 'Applied edit' },
        ],
    ...overrides,
  });
}

/**
 * Creates a pending generation
 */
export function createPendingGeneration(
  overrides: Partial<Generation> = {}
): Generation {
  return createMockGeneration({
    status: 'pending',
    generatedImagePath: '',
    imagePath: null,
    ...overrides,
  });
}

/**
 * Creates a failed generation with error message
 */
export function createFailedGeneration(
  errorMessage: string,
  overrides: Partial<Generation> = {}
): Generation {
  return createMockGeneration({
    status: 'failed',
    generatedImagePath: '',
    imagePath: null,
    conversationHistory: [{ role: 'system', content: `Error: ${errorMessage}` }],
    ...overrides,
  });
}

// === SINGLE GENERATION EXPORTS ===

/** A single completed generation */
export const singleCompletedGeneration = mockGenerations[0];

/** A single pending generation */
export const singlePendingGeneration = mockGenerations[6];

/** A single processing generation */
export const singleProcessingGeneration = mockGenerations[8];

/** A single failed generation */
export const singleFailedGeneration = mockGenerations[9];

/** A generation with edit history */
export const generationWithEditHistory = mockGenerations[5]; // grandchild
