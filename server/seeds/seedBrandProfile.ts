/* eslint-disable no-console */
import 'dotenv/config';
import { brandProfiles, users } from '@shared/schema';
import { db } from '../db';
import { eq } from 'drizzle-orm';

export async function seedBrandProfile() {
  console.log('🌱 Seeding NDS Brand Profile...');

  // 1. Get the primary user (for now, assume first user or specific email if needed)
  // In a real app we'd map this to the specific logged-in user, but for single-tenant agency:
  const users = await helpers.getUsers();
  if (users.length === 0) {
    console.log('⚠️ No users found. Skipping Brand Profile seed. Create a user first.');
    return;
  }
  const userId = users[0]!.id;

  // 2. Define NDS Brand Data (LLM-Optimized - Compiled from 13 Agent Analyses)
  // Source: docs/NDS-BRAND-PROFILE-COMPLETE.md
  const ndsProfile = {
    userId: userId,
    brandName: 'Next Day Steel',
    industry: 'Construction Materials & Steel Reinforcement',
    brandValues: [
      'Speed & Reliability - Order by 1pm, delivered next day',
      'Problem-Solving Attitude - Solutions-focused, not problems-focused',
      'Inclusivity - DIY to Enterprise, no minimum orders, equal service',
      'Practical & Direct - Clear, specific, no fluff',
      'Customer-First - Time-respectful, helpful, never rushed',
      'Professional Competence - Knowledgeable without being corporate',
      'Honesty - Confident about capabilities, honest about limitations',
    ],
    targetAudience: {
      demographics: 'SME Contractors, Groundworkers, DIY Homeowners, Procurement Officers, Maintenance Managers',
      psychographics:
        'Values speed over bureaucracy, needs certainty, practical-minded, time-poor, weather-dependent schedules',
      painPoints: [
        'Material shortages causing project delays',
        'Unreliable delivery windows before pour day',
        "Suppliers who won't serve small orders",
        'Complex ordering processes',
        'Lack of technical support',
        'Emergency/gap-fill needs',
      ],
      personas: [
        'SME Contractor (Gary) - 35-55, small company owner, values reliability',
        'DIY/Homeowner (Sarah) - 30-60, wants trade-quality at fair prices',
        'Groundworker (Dave) - 25-45, tight schedules, gap-fill needs',
        'Procurement Officer (James) - 30-50, process-driven, needs documentation',
        'Maintenance Manager (Michelle) - 35-55, reactive needs, emergency situations',
      ],
    },
    preferredStyles: [
      'Industrial - Construction site context, real materials',
      'Site-Realistic - Actual installation photos, workers on site',
      'Clean Lines - Uncluttered, professional layouts',
      'High Clarity - Sharp focus, good lighting',
      'Technical Accuracy - Correct terminology, proper specs',
    ],
    colorPreferences: [
      'Orange #FF6B35 - Safety, CTAs, urgency',
      'Silver/Grey #7A7A7A - Steel, product imagery',
      'Black #1A1A1A - Headlines, body text',
      'White #FFFFFF - Backgrounds, readability',
    ],
    voice: {
      summary:
        'Professional, helpful, and knowledgeable steel supplier voice. We speak with confident expertise but remain approachable and never condescending. Solutions-focused, time-respectful, building trust through specific commitments.',
      principles: [
        'Professional Helper - Competent without being corporate, solutions-focused',
        'Approachable Expert - Friendly but not casual, industry-aware',
        'Reliable Partner - Makes specific promises, follows through',
      ],
      wordsToUse: [
        'Next Day',
        'Guaranteed',
        'Reliable',
        'On-site',
        'Solution',
        'Reinforcement',
        'Mesh',
        'Rebar',
        'CARES-approved',
        'BS4449 certified',
        'We can',
        'We will',
        'We deliver',
        'By [specific time]',
      ],
      wordsToAvoid: [
        'Maybe',
        'Try to',
        'Usually',
        'Hopefully',
        'Probably',
        'Bespoke (use Custom)',
        'Artisanal',
        'Luxury',
        'ASAP',
        'To be honest',
        'Sorry to bother you',
        'Obviously',
      ],
      sentencePatterns: [
        "I can arrange... (not 'I'll try to arrange')",
        "We deliver next-day to... (not 'We usually deliver')",
        'Let me take your requirements now so...',
        "I'll WhatsApp you our details so you can reply when convenient",
      ],
      forbiddenPatterns: [
        'Never recommend products - defer to structural engineers',
        'Never give engineering advice or specifications',
        'Never promise Saturday delivery',
        'Never claim same-day universally (only London depot)',
      ],
    },
    industryTerminology: {
      products: ['T8-T40 rebar', 'A142/A193/A252/A393 mesh', 'Spacers', 'Tie wire', 'Couplers'],
      standards: ['BS4449', 'BS4483', 'BS8666', 'CARES certified'],
      terms: ['Shape codes', 'Stirrups', 'Kickers', 'Cover', 'Lap', 'Cut-to-length'],
    },
    platformGuidelines: {
      linkedin: 'Professional authority, technical accuracy, 1300-2000 chars, 3-5 hashtags',
      instagram: 'Behind-the-scenes, authentic, 138-150 chars, 8-11 hashtags',
      facebook: 'Community-focused, friendly, 40-80 chars, 1-2 hashtags',
    },
    updatedAt: new Date(),
  };

  // 3. Upsert into DB
  try {
    const existing = await db.select().from(brandProfiles).where(eq(brandProfiles.userId, userId));

    if (existing.length > 0) {
      console.log('🔄 Updating existing Brand Profile...');
      await db.update(brandProfiles).set(ndsProfile).where(eq(brandProfiles.userId, userId));
    } else {
      console.log('✨ Creating new Brand Profile...');
      await db.insert(brandProfiles).values(ndsProfile);
    }

    console.log('✅ NDS Brand Profile seeded successfully!');
  } catch (err) {
    console.error('❌ Failed to seed Brand Profile:', err);
  }
}

// Helper to get users without importing whole storage (circular dependency risk)
const helpers = {
  getUsers: async () => {
    return await db.select().from(users).limit(1);
  },
};

// CLI execution disabled - this check doesn't work correctly when bundled with esbuild
// The bundled file becomes the "main module" so this would run on every server start
// To seed manually, use: POST /api/admin/seed-brand
