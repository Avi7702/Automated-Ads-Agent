/* eslint-disable no-console */
import 'dotenv/config';
import { db } from '../db';
import { installationScenarios, products, users } from '@shared/schema';
import { eq, ilike } from 'drizzle-orm';

/**
 * Installation Scenarios Seed for NDS (Next Day Steel)
 *
 * Populates installation scenarios that explain HOW products are installed.
 * This context-maximization prevents LLM hallucination by providing
 * verified installation knowledge.
 *
 * Scenarios answer: "How is this product installed on site?"
 *
 * Usage:
 *   POST /api/admin/seed-installation-scenarios
 */

// Scenario Types
const SCENARIO_TYPES = {
  APPLICATION: 'application', // How product is applied/used
  ROOM_TYPE: 'room_type', // Installation by room/area
  BEFORE_AFTER: 'before_after', // Before/after transformation
} as const;

// Room Types for targeting
const ROOM_TYPES = {
  FOUNDATION: 'foundation',
  SLAB: 'ground-floor-slab',
  SUSPENDED: 'suspended-slab',
  WALL: 'retaining-wall',
  COLUMN: 'column',
  BEAM: 'beam',
  DRIVEWAY: 'driveway',
  GARAGE: 'garage',
  COMMERCIAL: 'commercial-floor',
  INDUSTRIAL: 'industrial-floor',
} as const;

// Style Tags
const STYLE_TAGS = {
  RESIDENTIAL: 'residential',
  COMMERCIAL: 'commercial',
  INDUSTRIAL: 'industrial',
  DIY: 'diy-friendly',
  PROFESSIONAL: 'professional-only',
  GROUNDWORKS: 'groundworks',
} as const;

/**
 * Installation Scenarios for NDS Steel Reinforcement Products
 *
 * Each scenario includes:
 * - What product category it applies to
 * - Step-by-step installation guide
 * - Required accessories
 * - Reference image descriptions
 */
const INSTALLATION_SCENARIOS = [
  // Foundation Scenarios
  {
    title: 'Domestic Foundation Strip Footing - Rebar Installation',
    description:
      'Standard rebar installation for domestic strip foundations. T10/T12 bars placed in excavated trench with correct cover maintained using spacers.',
    scenarioType: SCENARIO_TYPES.APPLICATION,
    productCategory: 'rebar',
    installationSteps: [
      "Excavate trench to engineer's specification (typically 450mm wide x 600mm deep)",
      'Compact trench bottom and add 50mm blinding concrete',
      'Position bottom bars (typically T10) on 50mm spacers',
      'Place distribution bars at 200-300mm centers',
      'Tie all intersections with tie wire',
      'Install starter bars for walls if required',
      'Check cover is maintained - minimum 40mm bottom, 75mm sides',
      'Have reinforcement inspected before concrete pour',
    ],
    requiredAccessories: ['Concrete spacers - 50mm cover', 'Tie wire 1.6mm', 'Chair spacers for multiple layers'],
    roomTypes: [ROOM_TYPES.FOUNDATION],
    styleTags: [STYLE_TAGS.RESIDENTIAL, STYLE_TAGS.GROUNDWORKS],
    referenceImageDescription:
      'Shows excavated trench with T10 rebar placed on spacers, tie wire connections visible, ready for inspection before pour.',
  },
  {
    title: 'Commercial Foundation Raft - Heavy Rebar Installation',
    description:
      'Large-scale raft foundation installation using T16-T25 rebar in both directions. Two-layer reinforcement with proper spacing maintained throughout.',
    scenarioType: SCENARIO_TYPES.APPLICATION,
    productCategory: 'rebar',
    installationSteps: [
      "Prepare sub-base and install membrane as per engineer's specification",
      'Mark out grid pattern for bottom layer reinforcement',
      'Position T16/T20 bottom bars on 75mm spacers at designed centers',
      'Install perpendicular distribution bars',
      'Tie all intersections securely',
      'Install chair spacers to support top layer',
      'Position top layer reinforcement on chairs',
      'Install edge reinforcement and trimming bars',
      'Install any required U-bars or link reinforcement',
      'Final check of cover and spacing before pour',
    ],
    requiredAccessories: [
      'Heavy-duty chair spacers',
      'Concrete spacers - 75mm',
      'Tie wire 1.6mm',
      'Rebar couplers if splicing required',
    ],
    roomTypes: [ROOM_TYPES.FOUNDATION, ROOM_TYPES.COMMERCIAL],
    styleTags: [STYLE_TAGS.COMMERCIAL, STYLE_TAGS.PROFESSIONAL],
    referenceImageDescription:
      'Large raft foundation with two layers of heavy rebar, chair spacers visible supporting top layer, workers tying reinforcement cage.',
  },

  // Ground Floor Slab Scenarios
  {
    title: 'Domestic Ground Floor Slab - A193 Mesh Installation',
    description:
      'Standard mesh reinforcement for domestic ground floor slabs. A193 mesh positioned in top third of slab with correct overlap and spacer support.',
    scenarioType: SCENARIO_TYPES.APPLICATION,
    productCategory: 'mesh',
    installationSteps: [
      'Prepare sub-base with compacted hardcore and sand blinding',
      'Install DPM membrane with 150mm overlaps',
      'Lay insulation if required',
      'Position chair spacers at 500-600mm centers',
      'Lay A193 mesh sheets on spacers',
      'Ensure 200mm minimum overlap between sheets',
      'Secure overlaps with mesh clips',
      'Trim edges as required - allow 40mm cover to edges',
      'Install slab edge reinforcement if required',
      'Check mesh is in top third of slab depth',
    ],
    requiredAccessories: ['Chair spacers', 'Mesh clips - universal', 'Edge protection where required'],
    roomTypes: [ROOM_TYPES.SLAB, ROOM_TYPES.GARAGE],
    styleTags: [STYLE_TAGS.RESIDENTIAL, STYLE_TAGS.DIY],
    referenceImageDescription:
      'Ground floor with DPM visible, A193 mesh sheets laid on chair spacers, 200mm overlaps visible, mesh clips securing joints.',
  },
  {
    title: 'Driveway Slab - A252 Mesh for Vehicle Loading',
    description:
      'Heavy-duty mesh installation for driveways subject to vehicle loading. A252 or A393 mesh with increased depth for load distribution.',
    scenarioType: SCENARIO_TYPES.APPLICATION,
    productCategory: 'mesh',
    installationSteps: [
      'Excavate to required depth (typically 150mm slab on 150mm sub-base)',
      'Install compacted MOT Type 1 sub-base',
      'Add blinding sand layer',
      'Position heavy-duty chair spacers',
      'Lay A252 or A393 mesh on spacers',
      'Overlap sheets by minimum 250mm',
      'Secure with mesh clips at all overlaps',
      'Install edge formwork at correct levels',
      'Add reinforcement at edges and corners',
      'Position expansion joints at changes of direction',
    ],
    requiredAccessories: ['Heavy-duty chair spacers', 'Mesh clips', 'Expansion joint material', 'Edge reinforcement'],
    roomTypes: [ROOM_TYPES.DRIVEWAY, ROOM_TYPES.GARAGE],
    styleTags: [STYLE_TAGS.RESIDENTIAL, STYLE_TAGS.GROUNDWORKS],
    referenceImageDescription:
      'Driveway excavation with sub-base visible, A252 mesh on heavy-duty spacers, formwork around edges, ready for concrete pour.',
  },

  // Commercial Floor Scenarios
  {
    title: 'Industrial Floor Slab - A393 Mesh Double Layer',
    description:
      'Heavy-duty industrial floor installation with A393 mesh. Double layer reinforcement for forklift traffic and heavy point loads.',
    scenarioType: SCENARIO_TYPES.APPLICATION,
    productCategory: 'mesh',
    installationSteps: [
      'Design review - confirm slab thickness and reinforcement requirements',
      "Prepare sub-base to engineer's specification",
      'Install vapour barrier with sealed joints',
      'Position bottom layer spacers (50mm minimum cover)',
      'Lay bottom A393 mesh layer',
      'Install chair spacers for top layer',
      'Lay top A393 mesh layer',
      'Install edge and joint reinforcement',
      'Position dowel sleeves for joints',
      'Install any required cast-in items',
      'Final inspection before pour',
    ],
    requiredAccessories: [
      'Spacers - 50mm cover',
      'Heavy-duty chair spacers',
      'Mesh clips',
      'Dowel systems',
      'Edge protection',
    ],
    roomTypes: [ROOM_TYPES.INDUSTRIAL, ROOM_TYPES.COMMERCIAL],
    styleTags: [STYLE_TAGS.INDUSTRIAL, STYLE_TAGS.PROFESSIONAL],
    referenceImageDescription:
      'Large industrial floor under construction, double layer A393 mesh visible, dowel systems at joints, workers in PPE.',
  },

  // Wall Scenarios
  {
    title: 'Retaining Wall - Rebar Cage Assembly',
    description:
      'Reinforced concrete retaining wall installation. Vertical and horizontal rebar tied into cage with wall face shuttering.',
    scenarioType: SCENARIO_TYPES.APPLICATION,
    productCategory: 'rebar',
    installationSteps: [
      'Install kicker concrete with starter bars from foundation',
      'Position vertical main bars - lap with starter bars (40 diameters minimum)',
      'Install horizontal distribution bars at designed spacing',
      'Tie all intersections securely',
      'Install wall ties if cavity construction',
      'Add U-bars at top of wall',
      'Check vertical alignment',
      'Install spacer wheels for consistent cover',
      'Fix formwork to one face',
      'Final cover check before closing shuttering',
    ],
    requiredAccessories: ['Tie wire', 'Spacer wheels', 'Chair spacers', 'Coupler if required'],
    roomTypes: [ROOM_TYPES.WALL],
    styleTags: [STYLE_TAGS.RESIDENTIAL, STYLE_TAGS.GROUNDWORKS],
    referenceImageDescription:
      'Retaining wall reinforcement cage visible, vertical bars lapped to starters, horizontal bars tied, formwork visible one side.',
  },

  // Beam and Column Scenarios
  {
    title: 'Reinforced Concrete Column - Rebar Cage',
    description:
      'Column reinforcement cage assembly with main bars and link stirrups. Typically T16-T25 main bars with T10 links.',
    scenarioType: SCENARIO_TYPES.APPLICATION,
    productCategory: 'rebar',
    installationSteps: [
      'Review bar bending schedule and shape codes',
      'Assemble prefabricated links in correct spacing',
      'Insert main vertical bars through links',
      'Tie links to main bars - alternate links',
      'Check link spacing matches schedule',
      'Lift cage into position over starter bars',
      'Lap main bars to starters (40 diameters minimum)',
      'Secure cage to prevent movement',
      'Install spacer wheels for cover',
      'Fix column formwork',
    ],
    requiredAccessories: ['Tie wire', 'Spacer wheels', 'Lifting equipment for cage'],
    roomTypes: [ROOM_TYPES.COLUMN],
    styleTags: [STYLE_TAGS.COMMERCIAL, STYLE_TAGS.PROFESSIONAL],
    referenceImageDescription:
      'Column rebar cage being assembled, T20 main bars visible, T10 links at regular spacing, cage ready for lifting into position.',
  },
  {
    title: 'Reinforced Concrete Beam - Rebar Installation',
    description:
      'Beam reinforcement installation with tension bars bottom, compression bars top, and shear links throughout.',
    scenarioType: SCENARIO_TYPES.APPLICATION,
    productCategory: 'rebar',
    installationSteps: [
      'Install beam soffit formwork',
      'Position bottom bars on spacers',
      'Install shear links along beam length - closer spacing near supports',
      'Position top compression bars',
      'Tie all bars to links securely',
      'Install any additional link reinforcement at supports',
      'Add side face bars if beam depth exceeds 750mm',
      'Check cover at all faces',
      'Install beam side formwork',
      'Final inspection before pour',
    ],
    requiredAccessories: ['Tie wire', 'Spacers - 40mm cover', 'Chair spacers'],
    roomTypes: [ROOM_TYPES.BEAM],
    styleTags: [STYLE_TAGS.COMMERCIAL, STYLE_TAGS.PROFESSIONAL],
    referenceImageDescription:
      'Beam formwork with rebar cage visible, bottom tension bars, link stirrups, top bars, correct spacing visible throughout.',
  },

  // Suspended Slab Scenarios
  {
    title: 'Suspended Floor Slab - Two-Way Reinforcement',
    description:
      'Suspended reinforced concrete slab with two-way spanning reinforcement. Bottom bars in both directions plus top bars over supports.',
    scenarioType: SCENARIO_TYPES.APPLICATION,
    productCategory: 'rebar',
    installationSteps: [
      'Complete propping and formwork installation',
      'Position bottom bars in primary span direction on spacers',
      'Install perpendicular bottom bars on top of primary bars',
      'Install chair spacers for top reinforcement',
      'Position top bars over columns and supports',
      'Add additional top bars at openings and edges',
      'Install edge reinforcement and U-bars',
      'Tie all intersections',
      'Check cover at all points - minimum 25mm internal, 40mm external',
      'Final inspection and sign-off before pour',
    ],
    requiredAccessories: ['Spacers - 25mm cover', 'Chair spacers - various heights', 'Tie wire', 'U-bars for edges'],
    roomTypes: [ROOM_TYPES.SUSPENDED],
    styleTags: [STYLE_TAGS.COMMERCIAL, STYLE_TAGS.PROFESSIONAL],
    referenceImageDescription:
      'Suspended slab formwork with two-layer reinforcement, bottom bars crossed, chair spacers supporting top bars, workers checking levels.',
  },

  // Spacer Application Scenarios
  {
    title: 'Correct Cover Maintenance with Spacers',
    description:
      'Proper spacer installation to maintain concrete cover. Different spacer types for different applications - clips, chairs, and wheels.',
    scenarioType: SCENARIO_TYPES.APPLICATION,
    productCategory: 'spacers',
    installationSteps: [
      'Determine required cover from drawings (typically 25-75mm)',
      'Select appropriate spacer type - clips for horizontal bars, chairs for mesh support, wheels for vertical',
      'Space spacers at maximum 500-600mm centers',
      'Ensure spacers are on firm base (not soft ground or membrane)',
      'Use additional spacers at heavy reinforcement concentrations',
      'Check cover after reinforcement is complete',
      'Add extra spacers if reinforcement has sagged or moved',
      'Maintain cover at all external faces especially',
    ],
    requiredAccessories: ['Clip-on spacers', 'Chair spacers', 'Spacer wheels', 'Heavy-duty spacers for commercial'],
    roomTypes: [ROOM_TYPES.FOUNDATION, ROOM_TYPES.SLAB, ROOM_TYPES.WALL],
    styleTags: [STYLE_TAGS.DIY, STYLE_TAGS.PROFESSIONAL, STYLE_TAGS.GROUNDWORKS],
    referenceImageDescription:
      'Close-up of spacer installation showing clip-on spacer on rebar, chair spacer supporting mesh, correct cover visible against formwork.',
  },
];

/**
 * Seed installation scenarios
 */
export async function seedInstallationScenarios() {
  console.log('🌱 Seeding NDS Installation Scenarios...');

  // Get first user (single-tenant for now)
  const [user] = await db.select().from(users).limit(1);
  if (!user) {
    console.log('⚠️ No users found. Create a user first.');
    return { created: 0, updated: 0, errors: 0 };
  }

  let created = 0;
  let updated = 0;
  let errors = 0;

  for (const scenario of INSTALLATION_SCENARIOS) {
    try {
      // Check if scenario exists by title
      const [existing] = await db.select().from(installationScenarios).where(eq(installationScenarios.title, scenario.title)).limit(1);

      // Try to find primary product by category
      const [primaryProduct] = await db.select().from(products).where(ilike(products.category, scenario.productCategory)).limit(1);

      const scenarioRecord = {
        userId: user.id,
        title: scenario.title,
        description: scenario.description,
        scenarioType: scenario.scenarioType,
        primaryProductId: primaryProduct?.id || null,
        installationSteps: scenario.installationSteps,
        requiredAccessories: scenario.requiredAccessories,
        roomTypes: scenario.roomTypes,
        styleTags: scenario.styleTags,
        referenceImages: scenario.referenceImageDescription ? [{ caption: scenario.referenceImageDescription }] : null,
        isActive: true,
      };

      if (existing) {
        await db.update(installationScenarios).set(scenarioRecord).where(eq(installationScenarios.id, existing.id));
        updated++;
        console.log(`  🔄 Updated: ${scenario.title}`);
      } else {
        await db.insert(installationScenarios).values(scenarioRecord);
        created++;
        console.log(`  ✨ Created: ${scenario.title}`);
      }
    } catch (err) {
      errors++;
      console.error(`  ❌ Failed: ${scenario.title}`, err);
    }
  }

  console.log(`\n✅ Installation Scenario seeding complete:`);
  console.log(`   Created: ${created}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Errors: ${errors}`);

  return { created, updated, errors };
}
