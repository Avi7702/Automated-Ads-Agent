/**
 * Ad Copy Test Fixtures
 *
 * Mock ad copy data for testing copywriting features.
 * Covers various platforms, frameworks, and quality scores.
 *
 * @file client/src/fixtures/adCopy.ts
 */

import type { AdCopy } from '../../../shared/schema';

// Base date for consistent timestamps in tests
const BASE_DATE = new Date('2026-01-15T12:00:00Z');

function daysAgo(days: number): Date {
  return new Date(BASE_DATE.getTime() - days * 24 * 60 * 60 * 1000);
}

/**
 * Platform character limits (for validation testing)
 */
export const platformCharLimits = {
  instagram: { headline: 40, body: 2200, caption: 2200 },
  linkedin: { headline: 150, body: 3000, caption: 3000 },
  facebook: { headline: 40, body: 125, caption: 63206 },
  twitter: { headline: 30, body: 280, caption: 280 },
  tiktok: { headline: 50, body: 2200, caption: 2200 },
};

/**
 * Available copywriting frameworks
 */
export const copywritingFrameworks = ['AIDA', 'PAS', 'BAB', 'FAB', 'auto'] as const;
export type CopywritingFramework = (typeof copywritingFrameworks)[number];

/**
 * Campaign objectives
 */
export const campaignObjectives = ['awareness', 'consideration', 'conversion', 'engagement'] as const;
export type CampaignObjective = (typeof campaignObjectives)[number];

/**
 * Full mock ad copy array with 12 entries
 * Covers all platforms and frameworks
 */
export const mockAdCopy: AdCopy[] = [
  // === INSTAGRAM COPY ===
  {
    id: 'copy-ig-001',
    generationId: 'gen-001',
    userId: 'user-test-1',
    headline: 'Transform Your Drainage',
    hook: 'Stop fighting with gravel. Start installing in minutes.',
    bodyText:
      'The NDS EZ-Drain system revolutionizes French drain installation. No gravel needed, no heavy lifting required. Just unroll, connect, and forget about water problems forever.',
    cta: 'Shop Now',
    caption:
      'Say goodbye to water problems! The NDS EZ-Drain makes French drain installation a breeze. No gravel, no hassle, just results.',
    hashtags: ['#drainage', '#landscaping', '#diyhomeimprovement', '#watermanagement', '#ezinstall'],
    platform: 'instagram',
    tone: 'casual',
    framework: 'AIDA',
    campaignObjective: 'awareness',
    productName: 'NDS EZ-Drain',
    productDescription: 'Pre-constructed French drain system with gravel-free technology',
    productBenefits: ['No gravel required', 'Easy installation', 'Long-lasting'],
    uniqueValueProp: 'The only gravel-free French drain system',
    industry: 'Construction Materials',
    targetAudience: {
      demographics: 'Homeowners 30-55',
      psychographics: 'DIY-oriented, time-conscious',
      painPoints: ['Traditional drains are heavy', 'Installation is messy'],
    },
    brandVoice: {
      principles: ['Helpful', 'Practical'],
      wordsToAvoid: ['difficult', 'complex'],
      wordsToUse: ['easy', 'simple', 'fast'],
    },
    socialProof: {
      testimonial: 'Installed in under an hour!',
      stats: '50,000+ happy customers',
    },
    qualityScore: {
      clarity: 9,
      persuasiveness: 8,
      platformFit: 9,
      brandAlignment: 8,
      overallScore: 8.5,
      reasoning: 'Strong AIDA structure with clear call to action',
    },
    characterCounts: {
      headline: 22,
      body: 198,
      caption: 145,
      total: 365,
    },
    variationNumber: 1,
    parentCopyId: null,
    createdAt: daysAgo(7),
  },
  {
    id: 'copy-ig-002',
    generationId: 'gen-001',
    userId: 'user-test-1',
    headline: 'Drain Smarter, Not Harder',
    hook: 'What if drainage could actually be easy?',
    bodyText:
      'Forget everything you know about French drains. The EZ-Drain system cuts installation time by 75% and eliminates the need for messy gravel.',
    cta: 'Learn More',
    caption: 'Who said French drains had to be hard? Not us! Discover the easier way to solve drainage problems.',
    hashtags: ['#frenchdrain', '#easydiy', '#homeimprovement', '#drainagesolution'],
    platform: 'instagram',
    tone: 'casual',
    framework: 'PAS',
    campaignObjective: 'consideration',
    productName: 'NDS EZ-Drain',
    productDescription: 'Pre-constructed French drain system',
    productBenefits: ['75% faster installation', 'No gravel needed'],
    uniqueValueProp: 'The easiest French drain to install',
    industry: 'Construction Materials',
    targetAudience: null,
    brandVoice: null,
    socialProof: null,
    qualityScore: {
      clarity: 8,
      persuasiveness: 9,
      platformFit: 8,
      brandAlignment: 7,
      overallScore: 8,
      reasoning: 'Effective PAS framework with relatable pain point',
    },
    characterCounts: {
      headline: 23,
      body: 155,
      caption: 93,
      total: 271,
    },
    variationNumber: 2,
    parentCopyId: 'copy-ig-001',
    createdAt: daysAgo(7),
  },

  // === LINKEDIN COPY ===
  {
    id: 'copy-li-001',
    generationId: 'gen-002',
    userId: 'user-test-1',
    headline: 'Protect Your Foundation Investment with BlueSkin VP160',
    hook: 'Foundation failures cost businesses an average of $40,000 in repairs.',
    bodyText:
      'The BlueSkin VP160 Self-Adhered Membrane provides premium waterproofing that protects your building investment for decades. With vapor-permeable technology and self-healing properties, it is the choice of professional contractors nationwide.',
    cta: 'Request a Quote',
    caption:
      'Your foundation is the backbone of your building. Protect it with industry-leading waterproofing technology. The BlueSkin VP160 delivers professional-grade protection with easier installation.',
    hashtags: ['#construction', '#waterproofing', '#buildingmaterials', '#contractorlife', '#commercialconstruction'],
    platform: 'linkedin',
    tone: 'professional',
    framework: 'FAB',
    campaignObjective: 'conversion',
    productName: 'BlueSkin VP160',
    productDescription: 'Self-adhered vapor permeable air and water barrier membrane',
    productBenefits: ['Self-healing', 'Vapor permeable', 'Cold weather application'],
    uniqueValueProp: 'Only membrane with self-healing and vapor permeability',
    industry: 'Construction Materials',
    targetAudience: {
      demographics: 'Commercial contractors, architects, 35-55',
      psychographics: 'Quality-focused, risk-averse',
      painPoints: ['Foundation failures', 'Installation delays', 'Weather constraints'],
    },
    brandVoice: {
      principles: ['Professional', 'Authoritative', 'Technical'],
      wordsToAvoid: ['cheap', 'DIY'],
      wordsToUse: ['professional-grade', 'proven', 'trusted'],
    },
    socialProof: {
      testimonial: 'Best membrane we have ever used - ABC Construction',
      stats: 'Used on 10,000+ commercial projects',
    },
    qualityScore: {
      clarity: 9,
      persuasiveness: 8,
      platformFit: 10,
      brandAlignment: 9,
      overallScore: 9,
      reasoning: 'Excellent B2B messaging with strong social proof',
    },
    characterCounts: {
      headline: 51,
      body: 286,
      caption: 198,
      total: 535,
    },
    variationNumber: 1,
    parentCopyId: null,
    createdAt: daysAgo(5),
  },

  // === FACEBOOK COPY ===
  {
    id: 'copy-fb-001',
    generationId: 'gen-003',
    userId: 'user-test-2',
    headline: 'Flooring That Wows',
    hook: 'Your dream floor is just a click away.',
    bodyText: 'Transform any room with our Premium Engineered Oak. Real wood beauty that lasts.',
    cta: 'Shop Collection',
    caption:
      'Ready to transform your home? Our engineered oak hardwood brings warmth and elegance to any space. With easy installation options and compatibility with radiant heat, it is the perfect choice for modern living. Get free samples today!',
    hashtags: ['#flooring', '#homedesign', '#interiordesign', '#hardwoodfloors', '#homedecor'],
    platform: 'facebook',
    tone: 'casual',
    framework: 'BAB',
    campaignObjective: 'awareness',
    productName: 'Premium Engineered Oak',
    productDescription: 'Wide plank engineered hardwood with genuine oak wear layer',
    productBenefits: ['Real wood beauty', 'Radiant heat compatible', 'Easy installation'],
    uniqueValueProp: 'Real oak beauty with engineered durability',
    industry: 'Flooring',
    targetAudience: {
      demographics: 'Homeowners 28-50',
      psychographics: 'Design-conscious, quality-seeking',
      painPoints: ['Limited budget', 'Installation concerns'],
    },
    brandVoice: {
      principles: ['Inspiring', 'Warm', 'Accessible'],
      wordsToAvoid: ['cheap', 'fake'],
      wordsToUse: ['genuine', 'beautiful', 'transform'],
    },
    socialProof: {
      testimonial: 'Love our new floors!',
      stats: '4.8 star average rating',
    },
    qualityScore: {
      clarity: 8,
      persuasiveness: 7,
      platformFit: 8,
      brandAlignment: 8,
      overallScore: 7.75,
      reasoning: 'Good lifestyle messaging, could be more specific on value',
    },
    characterCounts: {
      headline: 18,
      body: 89,
      caption: 287,
      total: 394,
    },
    variationNumber: 1,
    parentCopyId: null,
    createdAt: daysAgo(3),
  },

  // === TWITTER/X COPY ===
  {
    id: 'copy-tw-001',
    generationId: 'gen-conc-001',
    userId: 'user-test-1',
    headline: 'Rebar Done Right',
    hook: 'Your concrete is only as strong as your support.',
    bodyText: 'Stop guessing on rebar clearance. Our #4 chairs ensure perfect coverage every time. 100-pack in stock.',
    cta: 'Order Now',
    caption:
      'Perfect concrete coverage starts with perfect rebar placement. Our heavy-duty chairs handle up to #8 rebar. In stock and ready to ship.',
    hashtags: ['#concrete', '#construction', '#rebar', '#buildingmaterials'],
    platform: 'twitter',
    tone: 'technical',
    framework: 'FAB',
    campaignObjective: 'conversion',
    productName: '#4 Rebar Chair Spacers',
    productDescription: 'Heavy-duty plastic rebar support chairs',
    productBenefits: ['Perfect clearance', 'Reusable', 'Heavy-duty'],
    uniqueValueProp: 'Most reliable rebar support on the market',
    industry: 'Construction Materials',
    targetAudience: {
      demographics: 'Contractors, concrete workers',
      psychographics: 'Practical, reliability-focused',
      painPoints: ['Inconsistent clearance', 'Chairs that break'],
    },
    brandVoice: null,
    socialProof: null,
    qualityScore: {
      clarity: 9,
      persuasiveness: 7,
      platformFit: 9,
      brandAlignment: 7,
      overallScore: 8,
      reasoning: 'Concise and direct, perfect for Twitter character limits',
    },
    characterCounts: {
      headline: 15,
      body: 99,
      caption: 141,
      total: 255,
    },
    variationNumber: 1,
    parentCopyId: null,
    createdAt: daysAgo(2),
  },

  // === TIKTOK COPY ===
  {
    id: 'copy-tt-001',
    generationId: 'gen-tool-001',
    userId: 'user-test-2',
    headline: 'Tile Cutting Made Easy',
    hook: 'POV: You just upgraded your tile game',
    bodyText:
      'Watch this 7-inch wet saw make clean cuts every time. No chips, no cracks, just perfect tiles. Who else needs one of these?',
    cta: 'Link in Bio',
    caption:
      'This wet saw changed my tile game forever. Clean cuts, no dust, and so easy to use! If you are doing any tile work, you NEED this.',
    hashtags: ['#tileinstallation', '#diy', '#homeimprovement', '#tilesaw', '#renovation', '#fyp', '#buildtok'],
    platform: 'tiktok',
    tone: 'casual',
    framework: 'AIDA',
    campaignObjective: 'engagement',
    productName: 'Power Tile Cutter 7" Wet Saw',
    productDescription: 'Compact wet tile saw for ceramic and porcelain',
    productBenefits: ['Clean cuts', 'Dust-free', 'Portable'],
    uniqueValueProp: 'Professional results for DIYers',
    industry: 'Tools',
    targetAudience: {
      demographics: 'DIYers 25-45',
      psychographics: 'Creative, hands-on, social media savvy',
      painPoints: ['Chipped tiles', 'Messy cuts', 'Expensive tools'],
    },
    brandVoice: {
      principles: ['Fun', 'Relatable', 'Helpful'],
      wordsToAvoid: ['boring', 'difficult'],
      wordsToUse: ['easy', 'perfect', 'game-changer'],
    },
    socialProof: null,
    qualityScore: {
      clarity: 8,
      persuasiveness: 8,
      platformFit: 10,
      brandAlignment: 8,
      overallScore: 8.5,
      reasoning: 'Perfect TikTok voice with engaging hook and call to action',
    },
    characterCounts: {
      headline: 21,
      body: 127,
      caption: 132,
      total: 280,
    },
    variationNumber: 1,
    parentCopyId: null,
    createdAt: daysAgo(1),
  },

  // === VARIATIONS & EDGE CASES ===
  {
    id: 'copy-var-001',
    generationId: 'gen-001',
    userId: 'user-test-1',
    headline: 'The Drain That Works',
    hook: 'What if you never had to deal with standing water again?',
    bodyText: 'EZ-Drain: Install fast. Drain faster. Simple as that.',
    cta: 'Get Started',
    caption: 'No more standing water. No more soggy lawns. Just the EZ-Drain doing its thing.',
    hashtags: ['#drainage', '#yardwork', '#homefix'],
    platform: 'instagram',
    tone: 'minimal',
    framework: 'auto',
    campaignObjective: 'awareness',
    productName: 'NDS EZ-Drain',
    productDescription: 'French drain system',
    productBenefits: ['Fast installation', 'Effective drainage'],
    uniqueValueProp: null,
    industry: 'Construction',
    targetAudience: null,
    brandVoice: null,
    socialProof: null,
    qualityScore: {
      clarity: 7,
      persuasiveness: 6,
      platformFit: 7,
      brandAlignment: 6,
      overallScore: 6.5,
      reasoning: 'Minimal copy - effective but could use more detail',
    },
    characterCounts: {
      headline: 19,
      body: 48,
      caption: 70,
      total: 137,
    },
    variationNumber: 3,
    parentCopyId: 'copy-ig-002',
    createdAt: daysAgo(6),
  },
  {
    id: 'copy-edge-001',
    generationId: 'gen-edge-001',
    userId: 'user-test-1',
    headline: '',
    hook: 'Test hook',
    bodyText: 'Test body',
    cta: 'Test CTA',
    caption: 'Test caption',
    hashtags: [],
    platform: 'instagram',
    tone: 'casual',
    framework: null,
    campaignObjective: null,
    productName: 'Test Product',
    productDescription: 'Test description',
    productBenefits: null,
    uniqueValueProp: null,
    industry: 'Test',
    targetAudience: null,
    brandVoice: null,
    socialProof: null,
    qualityScore: null,
    characterCounts: null,
    variationNumber: 1,
    parentCopyId: null,
    createdAt: daysAgo(14),
  },
];

// === FILTERED SUBSETS ===

/** Instagram ad copy */
export const instagramCopy = mockAdCopy.filter((c) => c.platform === 'instagram');

/** LinkedIn ad copy */
export const linkedinCopy = mockAdCopy.filter((c) => c.platform === 'linkedin');

/** Facebook ad copy */
export const facebookCopy = mockAdCopy.filter((c) => c.platform === 'facebook');

/** Twitter ad copy */
export const twitterCopy = mockAdCopy.filter((c) => c.platform === 'twitter');

/** TikTok ad copy */
export const tiktokCopy = mockAdCopy.filter((c) => c.platform === 'tiktok');

/** AIDA framework copy */
export const aidaCopy = mockAdCopy.filter((c) => c.framework === 'AIDA');

/** PAS framework copy */
export const pasCopy = mockAdCopy.filter((c) => c.framework === 'PAS');

/** BAB framework copy */
export const babCopy = mockAdCopy.filter((c) => c.framework === 'BAB');

/** FAB framework copy */
export const fabCopy = mockAdCopy.filter((c) => c.framework === 'FAB');

/** High quality copy (score >= 8) */
export const highQualityCopy = mockAdCopy.filter(
  (c) => c.qualityScore && (c.qualityScore as { overallScore: number }).overallScore >= 8,
);

/** Copy variations (has parent) */
export const variationCopy = mockAdCopy.filter((c) => c.parentCopyId !== null);

/** Root copy (no parent) */
export const rootCopy = mockAdCopy.filter((c) => c.parentCopyId === null);

/** Copy with complete metadata */
export const copyWithFullMetadata = mockAdCopy.filter((c) => c.targetAudience !== null && c.brandVoice !== null);

// === FACTORY FUNCTIONS ===

/**
 * Creates mock ad copy with custom overrides
 */
export function createMockAdCopy(overrides: Partial<AdCopy> = {}): AdCopy {
  const id = overrides.id || `copy-test-${Date.now()}`;
  return {
    id,
    generationId: 'gen-test',
    userId: 'user-test-1',
    headline: 'Test Headline',
    hook: 'Test hook that grabs attention',
    bodyText: 'Test body text that describes the product and its benefits.',
    cta: 'Shop Now',
    caption: 'Test caption for social media.',
    hashtags: ['#test', '#product'],
    platform: 'instagram',
    tone: 'casual',
    framework: 'AIDA',
    campaignObjective: 'awareness',
    productName: 'Test Product',
    productDescription: 'A test product for testing',
    productBenefits: ['Benefit 1', 'Benefit 2'],
    uniqueValueProp: 'Unique test value',
    industry: 'Test Industry',
    targetAudience: null,
    brandVoice: null,
    socialProof: null,
    qualityScore: {
      clarity: 8,
      persuasiveness: 8,
      platformFit: 8,
      brandAlignment: 8,
      overallScore: 8,
      reasoning: 'Test quality score',
    },
    characterCounts: {
      headline: 13,
      body: 54,
      caption: 29,
      total: 96,
    },
    variationNumber: 1,
    parentCopyId: null,
    createdAt: new Date(),
    ...overrides,
  };
}

/**
 * Creates ad copy for a specific platform
 */
export function createPlatformCopy(
  platform: 'instagram' | 'linkedin' | 'facebook' | 'twitter' | 'tiktok',
  overrides: Partial<AdCopy> = {},
): AdCopy {
  const toneMap = {
    instagram: 'casual',
    linkedin: 'professional',
    facebook: 'casual',
    twitter: 'casual',
    tiktok: 'casual',
  };

  return createMockAdCopy({
    platform,
    tone: toneMap[platform],
    ...overrides,
  });
}

/**
 * Creates a variation of existing copy
 */
export function createCopyVariation(
  parentId: string,
  variationNumber: number,
  overrides: Partial<AdCopy> = {},
): AdCopy {
  return createMockAdCopy({
    parentCopyId: parentId,
    variationNumber,
    ...overrides,
  });
}

// === SINGLE COPY EXPORTS ===

/** A complete Instagram ad copy */
export const singleInstagramCopy = mockAdCopy[0];

/** A complete LinkedIn ad copy */
export const singleLinkedinCopy = mockAdCopy[2];

/** A complete Facebook ad copy */
export const singleFacebookCopy = mockAdCopy[3];

/** A Twitter ad copy */
export const singleTwitterCopy = mockAdCopy[4];

/** A TikTok ad copy */
export const singleTiktokCopy = mockAdCopy[5];

/** A high-quality scored copy */
export const highScoredCopy = mockAdCopy[2];

/** An edge case copy with missing data */
export const edgeCaseCopy = mockAdCopy[7];
