/**
 * Content Planner Templates
 *
 * 30 researched templates (5 per category) based on 2026 B2B social media best practices.
 * Each template includes hook formulas, post structures, platform recommendations, and examples
 * specifically tailored for the steel/construction industry (NDS - Next Day Steel).
 *
 * Research Sources: LinkedIn B2B Marketing Guide 2026, Social Media Examiner, HubSpot B2B Research
 */

export interface ContentTemplate {
  id: string;
  category: 'product_showcase' | 'educational' | 'industry_insights' | 'customer_success' | 'company_updates' | 'engagement';
  categoryPercentage: number;
  subType: string;
  title: string;
  description: string;
  hookFormulas: string[];
  postStructure: string;
  bestPlatforms: { platform: string; format: string }[];
  exampleTopics: string[];
  whatToAvoid: string[];
  // 2026 AI-First fields
  productRequirement: 'required' | 'recommended' | 'optional' | 'none';
  minProducts?: number;
  maxProducts?: number;
  imageRequirement: 'required' | 'optional' | 'none';
}

export interface ContentCategory {
  id: string;
  name: string;
  percentage: number;
  description: string;
  weeklyTarget: number; // Based on 20 posts/week
  bestPractices: string[];
  templates: ContentTemplate[];
}

// ============================================
// CATEGORY 1: PRODUCT SHOWCASES (25%)
// ============================================

const productShowcaseTemplates: ContentTemplate[] = [
  {
    id: 'product_specs',
    category: 'product_showcase',
    categoryPercentage: 25,
    subType: 'product_specifications',
    title: 'Product Specifications',
    description: 'Technical details of reinforcement bars, mesh, and other steel products with real-world applications.',
    hookFormulas: [
      '"Most [professionals] waste [X hours/dollars] on [problem]. Here\'s how [product] changed that..."',
      '"[Specific metric] improvement in [timeframe]. This is what happened when [client] switched to [product]..."',
      '"[Old way] vs [New way]. The difference? [Single compelling stat]."',
      '"The spec sheet nobody asked for (but every estimator needs)."'
    ],
    postStructure: `[Hook: The problem or benefit in specific terms]

The solution: [Product name + key spec]

Why it matters:
• [Benefit 1 with number]
• [Benefit 2 with application]
• [Benefit 3 with comparison]

[Real application photo or diagram]

CTA: "DM for spec sheets" or "Link in comments"`,
    bestPlatforms: [
      { platform: 'LinkedIn', format: 'Carousel (6-10 slides) with spec comparisons' },
      { platform: 'Instagram', format: 'Carousel with close-up product shots' }
    ],
    exampleTopics: [
      'The spec sheet nobody asked for (but every estimator needs)',
      '3 specs that matter more than price for rebar',
      'Grade A vs Grade B: When does it actually matter?',
      'Why 5/8" mesh outperforms 1/2" in load-bearing applications'
    ],
    whatToAvoid: [
      'Listing specs without context (the "so what" is missing)',
      'Using jargon without explaining benefits',
      'Generic product photos - use real applications',
      'Being too promotional (80/20 rule: 80% value, 20% promo)'
    ],
    productRequirement: 'required',
    imageRequirement: 'optional'
  },
  {
    id: 'product_applications',
    category: 'product_showcase',
    categoryPercentage: 25,
    subType: 'product_applications',
    title: 'Product Applications',
    description: 'How specific products are used in real construction scenarios.',
    hookFormulas: [
      '"This [product] just held up [impressive load/condition]. Here\'s how:"',
      '"We installed [X units] in [challenging condition]. 6 months later:"',
      '"The contractor said it couldn\'t be done. 3 weeks later:"',
      '"[Common problem] solved. The fix? Not what you\'d expect."'
    ],
    postStructure: `[Visual hook: Before/During/After or action shot]

The challenge: [Specific problem in 1 sentence]

The solution: [Product + how it was applied]

Results:
• [Metric 1]
• [Metric 2]
• [Timeline]

[Project photo with product visible]

"Have a similar challenge? Let's talk."`,
    bestPlatforms: [
      { platform: 'LinkedIn', format: 'Video (30-60 sec) showing installation' },
      { platform: 'Instagram', format: 'Reels with time-lapse or before/after' },
      { platform: 'Facebook', format: 'Photo album with captions' }
    ],
    exampleTopics: [
      'How mesh reinforcement saved this basement from water damage',
      'Rebar installation in sub-zero conditions - what we learned',
      'The 50-story challenge: Why we chose A615 Grade 60',
      'When the soil test came back wrong - our reinforcement pivot'
    ],
    whatToAvoid: [
      'Stock photos instead of real project images',
      'Skipping the "why" - connect application to benefit',
      'Missing the human element (show workers, not just product)',
      'Forgetting to mention timeline and conditions'
    ],
    productRequirement: 'required',
    imageRequirement: 'optional'
  },
  {
    id: 'product_comparisons',
    category: 'product_showcase',
    categoryPercentage: 25,
    subType: 'product_comparisons',
    title: 'Product Comparisons',
    description: 'Side-by-side comparisons of different reinforcement options for informed decisions.',
    hookFormulas: [
      '"[Product A] vs [Product B]: The real difference isn\'t what you think."',
      '"We tested both. Here\'s what the data shows:"',
      '"Stop overpaying. When [cheaper option] is actually better:"',
      '"The [expensive option] myth that\'s costing contractors thousands."'
    ],
    postStructure: `[Hook: Challenge the assumption]

The comparison: [Product A] vs [Product B]

| Criteria | Option A | Option B |
|----------|----------|----------|
| [Spec 1] | [Value]  | [Value]  |
| [Spec 2] | [Value]  | [Value]  |
| [Cost]   | [Value]  | [Value]  |

The verdict: [When to use each]

"Which do you prefer? Comment below."`,
    bestPlatforms: [
      { platform: 'LinkedIn', format: 'Carousel with comparison tables' },
      { platform: 'Twitter', format: 'Thread with specs and conclusion' }
    ],
    exampleTopics: [
      'Welded wire mesh vs. fiber reinforcement: The honest comparison',
      'Epoxy-coated vs. galvanized rebar - when each wins',
      'A706 vs A615: Which rebar for seismic zones?',
      'Pre-fabricated vs. field-bent: Cost analysis breakdown'
    ],
    whatToAvoid: [
      'Being biased without data to back it up',
      'Comparing apples to oranges (unfair matchups)',
      'Forgetting to mention when each option is appropriate',
      'Too many specs without practical takeaways'
    ],
    productRequirement: 'required',
    minProducts: 2,
    imageRequirement: 'optional'
  },
  {
    id: 'new_arrivals',
    category: 'product_showcase',
    categoryPercentage: 25,
    subType: 'new_arrivals',
    title: 'New Arrivals',
    description: 'Announcements of new steel products with focus on problems they solve.',
    hookFormulas: [
      '"This took 18 months to develop. Here\'s why."',
      '"You asked. We listened. Introducing:"',
      '"The [problem] that kept us up at night. Our solution:"',
      '"New in stock: The [product] that changes [specific task]."'
    ],
    postStructure: `[Hook: The story behind the product]

Introducing: [Product name]

Why we built it:
• [Problem 1 it solves]
• [Problem 2 it solves]
• [Gap in market it fills]

Key features:
• [Feature → Benefit]
• [Feature → Benefit]
• [Feature → Benefit]

[Launch pricing or availability]

"First 50 orders get [bonus]. Link in comments."`,
    bestPlatforms: [
      { platform: 'LinkedIn', format: 'Video announcement with product demo' },
      { platform: 'Instagram', format: 'Carousel with features + launch offer' },
      { platform: 'Facebook', format: 'Live Q&A about new product' }
    ],
    exampleTopics: [
      'Introducing: Our new quick-ship rebar program (48-hour delivery)',
      'New in stock: Pre-cut mesh panels for residential slabs',
      'Just launched: Digital inventory tracking for contractors',
      'Now available: Custom bar bending with 3-day turnaround'
    ],
    whatToAvoid: [
      'Launching without explaining the "why"',
      'Focusing on features instead of benefits',
      'Missing the urgency or exclusivity angle',
      'No clear CTA or next step'
    ],
    productRequirement: 'required',
    imageRequirement: 'optional'
  },
  {
    id: 'product_benefits',
    category: 'product_showcase',
    categoryPercentage: 25,
    subType: 'product_benefits',
    title: 'Product Benefits',
    description: 'Highlighting strength, durability, and compliance features of products.',
    hookFormulas: [
      '"[X]% stronger. [Y]% lighter. Same price."',
      '"The hidden cost of [cheap alternative] nobody talks about."',
      '"This one change saved our client $[amount] per project."',
      '"Compliance isn\'t optional. Here\'s what [product] guarantees."'
    ],
    postStructure: `[Hook: The benefit in numbers]

The product: [Name]

The benefits that matter:
1. [Benefit + proof point]
2. [Benefit + proof point]
3. [Benefit + proof point]

Real result: "[Quote from customer or case study metric]"

[Photo of product in successful application]

"Ready to see the difference? [CTA]"`,
    bestPlatforms: [
      { platform: 'LinkedIn', format: 'Text post with strong benefit hook' },
      { platform: 'Twitter', format: 'Concise benefit statement + proof' }
    ],
    exampleTopics: [
      'Why our rebar passes inspection first time, every time',
      'The durability test: 10 years of salt exposure, zero corrosion',
      'Compliance made simple: Our mill certs explained',
      'How proper reinforcement adds 40 years to structure lifespan'
    ],
    whatToAvoid: [
      'Vague claims without numbers or proof',
      'Benefits that sound like features',
      'Missing the customer perspective',
      'Ignoring compliance and certification angles'
    ],
    productRequirement: 'required',
    imageRequirement: 'optional'
  }
];

// ============================================
// CATEGORY 2: EDUCATIONAL CONTENT (30%)
// ============================================

const educationalTemplates: ContentTemplate[] = [
  {
    id: 'construction_best_practices',
    category: 'educational',
    categoryPercentage: 30,
    subType: 'construction_best_practices',
    title: 'Construction Best Practices',
    description: 'Proper installation and usage techniques that position you as the expert.',
    hookFormulas: [
      '"Stop doing [common mistake]. Do this instead:"',
      '"This mistake costs contractors $[amount] every year."',
      '"[X] years in [industry]. Here\'s what I wish I knew on day 1:"',
      '"The [job role] hack nobody talks about:"'
    ],
    postStructure: `[Hook: The problem or benefit in specific terms]

The tip itself - actionable and specific

Why it works / the logic behind it

Quick story or example of it in action

CTA: "Save this" or "Share your own tip"`,
    bestPlatforms: [
      { platform: 'LinkedIn', format: 'Carousels (6-10 slides) - 596% more engagement than text' },
      { platform: 'Instagram', format: 'Reels with quick tips (30 sec)' },
      { platform: 'Facebook', format: 'Video tutorials (2-3 min)' }
    ],
    exampleTopics: [
      'The pre-pour checklist every concrete contractor needs',
      '5 joint preparation mistakes that lead to callbacks',
      'Why your steel connections fail inspection (and how to fix it)',
      'Steel rusting in storage? Check your stacking first.'
    ],
    whatToAvoid: [
      'Jargon without explanation',
      'Being too generic ("Quality matters" vs specific advice)',
      'Missing the "so what" - connect facts to practical implications',
      'Corporate tone - write like a colleague, not marketing'
    ],
    productRequirement: 'optional',
    imageRequirement: 'optional'
  },
  {
    id: 'industry_standards',
    category: 'educational',
    categoryPercentage: 30,
    subType: 'industry_standards',
    title: 'Industry Standards',
    description: 'Updates on building codes, compliance requirements, and certifications.',
    hookFormulas: [
      '"New [code] changed. Most contractors aren\'t ready."',
      '"[X]% of [professionals] don\'t know this about [standard]."',
      '"The compliance loophole that\'s about to close."',
      '"AISC just updated [section]. Here\'s what changed:"'
    ],
    postStructure: `[Hook: The change or update]

What changed:
• [Point 1]
• [Point 2]
• [Point 3]

What it means for you:
[Practical implication in 2-3 sentences]

Deadline: [If applicable]

Action step: [What to do now]

"Questions? Drop them below."`,
    bestPlatforms: [
      { platform: 'LinkedIn', format: 'Text posts with bullet points' },
      { platform: 'Twitter', format: 'Thread breaking down changes' }
    ],
    exampleTopics: [
      'AISC 360-22 changes: What estimators need to know',
      'IBC 2024 updates affecting steel connections',
      'New seismic requirements for West Coast projects',
      'AWS D1.1 certification: Common failures and how to avoid them'
    ],
    whatToAvoid: [
      'Copying official documents verbatim',
      'Missing practical implications',
      'Forgetting deadlines and timelines',
      'Not providing actionable next steps'
    ],
    productRequirement: 'optional',
    imageRequirement: 'optional'
  },
  {
    id: 'technical_guides',
    category: 'educational',
    categoryPercentage: 30,
    subType: 'technical_guides',
    title: 'Technical Guides',
    description: 'Step-by-step instructions for reinforcement installation and processes.',
    hookFormulas: [
      '"The complete guide to [process]. Bookmark this."',
      '"How to [task] in [X] steps (with photos)."',
      '"The [process] checklist I use on every project."',
      '"[Task] done wrong costs $[X]. Here\'s how to do it right:"'
    ],
    postStructure: `[Hook: The value of getting this right]

Step 1: [Action + why]
Step 2: [Action + why]
Step 3: [Action + why]
Step 4: [Action + why]
Step 5: [Action + why]

Pro tip: [Expert insight]

Common mistake: [What to avoid]

"Save this for your next project."`,
    bestPlatforms: [
      { platform: 'LinkedIn', format: 'Carousel with step-by-step photos' },
      { platform: 'Instagram', format: 'Carousel or saved Reels series' },
      { platform: 'YouTube', format: 'How-to video (5-10 min)' }
    ],
    exampleTopics: [
      'How to read a mill test report (without the confusion)',
      'Rebar splice length calculation: Step-by-step guide',
      'Proper bar support placement for slab-on-grade',
      'Wire tying techniques for efficient installation'
    ],
    whatToAvoid: [
      'Skipping steps that seem obvious',
      'No visuals or diagrams',
      'Assuming too much prior knowledge',
      'Not mentioning safety considerations'
    ],
    productRequirement: 'optional',
    imageRequirement: 'optional'
  },
  {
    id: 'material_science',
    category: 'educational',
    categoryPercentage: 30,
    subType: 'material_science',
    title: 'Material Science',
    description: 'Information about steel properties, engineering principles, and material behavior.',
    hookFormulas: [
      '"What happens to steel in [condition] (and why ratings matter)."',
      '"The science behind [property] - explained simply."',
      '"Why [material behavior] matters for your project."',
      '"[X]% of contractors don\'t understand this about steel. Do you?"'
    ],
    postStructure: `[Hook: The "why should I care" angle]

The science: [Concept in simple terms]

Why it matters:
[Practical application 1]
[Practical application 2]

Real example: [Case where this knowledge prevented a problem]

[Diagram or visual explanation]

"Did you know this? Comment below."`,
    bestPlatforms: [
      { platform: 'LinkedIn', format: 'Text with infographic or diagram' },
      { platform: 'Instagram', format: 'Carousel with educational graphics' }
    ],
    exampleTopics: [
      'What happens to steel in fire (and why ratings matter)',
      'Galvanic corrosion: When two metals shouldn\'t touch',
      'Yield strength vs tensile strength - the practical difference',
      'How temperature affects rebar during winter pours'
    ],
    whatToAvoid: [
      'Too academic without practical application',
      'Overly technical language',
      'Missing real-world relevance',
      'No visual aids for complex concepts'
    ],
    productRequirement: 'optional',
    imageRequirement: 'optional'
  },
  {
    id: 'safety_protocols',
    category: 'educational',
    categoryPercentage: 30,
    subType: 'safety_protocols',
    title: 'Safety Protocols',
    description: 'Best practices for handling, storing, and installing steel products safely.',
    hookFormulas: [
      '"This safety shortcut cost a contractor $[amount]. Don\'t repeat it."',
      '"The OSHA violation I see on [X]% of sites:"',
      '"[Injury type] are preventable. Here\'s how:"',
      '"Your steel storage might be a hazard. Check these [X] things:"'
    ],
    postStructure: `[Hook: The risk or consequence]

The hazard: [What can go wrong]

Prevention steps:
1. [Action]
2. [Action]
3. [Action]

Required PPE: [List]

OSHA reference: [If applicable]

"Share with your crew. Safety first."`,
    bestPlatforms: [
      { platform: 'LinkedIn', format: 'Text post with checklist' },
      { platform: 'Facebook', format: 'Video demonstration' },
      { platform: 'Instagram', format: 'Quick safety tip Reels' }
    ],
    exampleTopics: [
      'Proper rebar cap usage: The $50 item that prevents $50K injuries',
      'Steel bundle handling: Weight limits and rigging requirements',
      'Hot weather steel handling: Avoiding burns and heat stress',
      'Crane load calculations for steel delivery'
    ],
    whatToAvoid: [
      'Being preachy or condescending',
      'Ignoring practical site constraints',
      'Missing OSHA or regulatory references',
      'Stock photos instead of real site examples'
    ],
    productRequirement: 'optional',
    imageRequirement: 'optional'
  }
];

// ============================================
// CATEGORY 3: INDUSTRY INSIGHTS (15%)
// ============================================

const industryInsightsTemplates: ContentTemplate[] = [
  {
    id: 'market_trends',
    category: 'industry_insights',
    categoryPercentage: 15,
    subType: 'market_trends',
    title: 'Market Trends',
    description: 'Construction industry forecasts, steel prices, and supply chain developments.',
    hookFormulas: [
      '"Everyone in steel says [common belief]. Here\'s why that\'s costing you money:"',
      '"We analyzed 47 projects last quarter. One finding shocked our team:"',
      '"Steel prices in Q1 2026: What our purchasing data reveals."',
      '"3 years ago, our lead times were 12 weeks. Today they\'re 4. Here\'s what changed:"'
    ],
    postStructure: `[Hook: The insight or data point]

What we're seeing:
• [Trend 1 + data]
• [Trend 2 + data]
• [Trend 3 + data]

What this means for you:
[Practical implication]

Our take: [Your perspective]

"What are you seeing in your market? Comment below."`,
    bestPlatforms: [
      { platform: 'LinkedIn', format: 'Text post with data visualization' },
      { platform: 'Twitter', format: 'Thread with key stats' }
    ],
    exampleTopics: [
      'Steel prices in Q1 2026: What our purchasing data reveals',
      '3 supply chain shifts every steel contractor needs to know',
      'Infrastructure spending impact: Where the work is headed',
      'Labor shortage solutions: What\'s actually working in 2026'
    ],
    whatToAvoid: [
      'Unverified predictions',
      'Doom-and-gloom without solutions',
      'Missing the "so what" for readers',
      'Outdated data (always cite recent sources)'
    ],
    productRequirement: 'optional',
    imageRequirement: 'optional'
  },
  {
    id: 'case_studies',
    category: 'industry_insights',
    categoryPercentage: 15,
    subType: 'case_studies',
    title: 'Case Studies',
    description: 'Examples of successful building projects with lessons learned.',
    hookFormulas: [
      '"I made a $200K mistake on a project. Here\'s what I wish someone told me:"',
      '"How [Project Name] went from 6 months behind to on-time delivery."',
      '"The [project type] that changed how we approach [aspect]."',
      '"[X] tons of steel. [Y] days. [Z] challenges. Here\'s how we did it:"'
    ],
    postStructure: `[Hook: The challenge or result]

Project: [Name/Type]
Location: [City/Region]
Scope: [Key metrics]

The challenge:
[2-3 sentences on what made this difficult]

The solution:
[What was done differently]

Results:
• [Metric 1]
• [Metric 2]
• [Lesson learned]

[Project photo]

"Similar challenges? Let's connect."`,
    bestPlatforms: [
      { platform: 'LinkedIn', format: 'Carousel with project photos' },
      { platform: 'Facebook', format: 'Photo album with story' }
    ],
    exampleTopics: [
      'How a hospital expansion stayed on schedule despite supply chain chaos',
      'The stadium project that redefined our prefab capabilities',
      'When the design changed 3 weeks before erection - how we adapted',
      'A 50,000 sq ft warehouse in 6 weeks: The coordination story'
    ],
    whatToAvoid: [
      'Confidential client information without permission',
      'Taking all the credit (acknowledge partners)',
      'Skipping the challenges (too good to be true)',
      'Missing specific metrics and results'
    ],
    productRequirement: 'optional',
    imageRequirement: 'optional'
  },
  {
    id: 'research_findings',
    category: 'industry_insights',
    categoryPercentage: 15,
    subType: 'research_findings',
    title: 'Research Findings',
    description: 'New developments in construction technology and materials.',
    hookFormulas: [
      '"New research just dropped on [topic]. The key finding:"',
      '"The university study that\'s changing how we think about [aspect]."',
      '"[X] years of data. [Y] projects analyzed. Here\'s what we learned:"',
      '"The [technology/method] that\'s outperforming traditional approaches:"'
    ],
    postStructure: `[Hook: The key finding]

The research:
Source: [University/Organization]
Sample: [Size/Scope]

Key findings:
1. [Finding 1]
2. [Finding 2]
3. [Finding 3]

Practical application:
[How this affects your work]

Link to full study: [If available]

"Thoughts? I'm curious what you think."`,
    bestPlatforms: [
      { platform: 'LinkedIn', format: 'Text post with study summary' },
      { platform: 'Twitter', format: 'Thread breaking down findings' }
    ],
    exampleTopics: [
      'New concrete-steel bond research: What it means for lap splices',
      'Corrosion study: 20-year results from coastal structures',
      'BIM adoption rates: Where the industry is headed',
      'Prefabrication efficiency: The latest benchmarking data'
    ],
    whatToAvoid: [
      'Misrepresenting research conclusions',
      'Academic jargon without translation',
      'Missing the practical "so what"',
      'Not citing sources properly'
    ],
    productRequirement: 'optional',
    imageRequirement: 'optional'
  },
  {
    id: 'industry_events',
    category: 'industry_insights',
    categoryPercentage: 15,
    subType: 'industry_events',
    title: 'Industry Events',
    description: 'Construction shows, conferences, exhibitions, and networking opportunities.',
    hookFormulas: [
      '"Heading to [Event Name]? Here\'s what I\'m watching for:"',
      '"The top 3 takeaways from [Event Name]:"',
      '"[Event] wrap-up: What you missed (and what matters)."',
      '"Who else is at [Event]? Let\'s connect:"'
    ],
    postStructure: `[Pre-event: What to watch for]
or
[Post-event: Key takeaways]

Event: [Name]
Dates: [When]
Location: [Where]

What we're excited about:
• [Topic/Speaker 1]
• [Topic/Speaker 2]
• [Topic/Speaker 3]

[Post-event: What surprised us]

"See you there" or "What did you learn?"`,
    bestPlatforms: [
      { platform: 'LinkedIn', format: 'Live posts during event' },
      { platform: 'Twitter', format: 'Real-time updates with event hashtag' },
      { platform: 'Instagram', format: 'Stories from the floor' }
    ],
    exampleTopics: [
      'NASCC Steel Conference 2026: What we\'re watching',
      'World of Concrete takeaways: 5 trends that matter',
      'ACI Convention highlights: New standards on the horizon',
      'CONEXPO-CON/AGG: The equipment innovations worth seeing'
    ],
    whatToAvoid: [
      'Pure promotional content',
      'Missing hashtags for discoverability',
      'Not engaging with other attendees\' posts',
      'Forgetting to follow up on connections'
    ],
    productRequirement: 'optional',
    imageRequirement: 'optional'
  },
  {
    id: 'regulatory_updates',
    category: 'industry_insights',
    categoryPercentage: 15,
    subType: 'regulatory_updates',
    title: 'Regulatory Updates',
    description: 'Changes in building regulations, codes, and compliance requirements.',
    hookFormulas: [
      '"New regulation alert: [Change] takes effect [Date]."',
      '"The compliance change that affects [X]% of projects:"',
      '"[Regulation] update: What inspectors are now looking for."',
      '"Don\'t get caught off guard. [Change] is coming [When]:"'
    ],
    postStructure: `[Hook: The change and urgency]

What's changing:
[Clear summary in 2-3 sentences]

Effective date: [When]

Who's affected:
• [Group 1]
• [Group 2]
• [Group 3]

Action items:
1. [What to do now]
2. [What to prepare]
3. [Resources available]

"Questions about compliance? Drop them below."`,
    bestPlatforms: [
      { platform: 'LinkedIn', format: 'Text post with clear timeline' },
      { platform: 'Twitter', format: 'Concise alert with link to details' }
    ],
    exampleTopics: [
      'New AISC code changes: A practical guide for fabricators',
      'EPA stormwater regulations: Impact on construction sites',
      'Buy America requirements: What steel suppliers need to know',
      'Local building code updates: Regional compliance changes'
    ],
    whatToAvoid: [
      'Vague or incomplete information',
      'Missing effective dates',
      'No actionable guidance',
      'Scaring without providing solutions'
    ],
    productRequirement: 'optional',
    imageRequirement: 'optional'
  }
];

// ============================================
// CATEGORY 4: CUSTOMER SUCCESS (10%)
// ============================================

const customerSuccessTemplates: ContentTemplate[] = [
  {
    id: 'project_spotlights',
    category: 'customer_success',
    categoryPercentage: 10,
    subType: 'project_spotlights',
    title: 'Project Spotlights',
    description: 'Featuring completed projects using NDS products with customer as the hero.',
    hookFormulas: [
      '"When [Customer] came to us, they had [problem]. 6 months later:"',
      '"[Customer] needed to cut costs by 30% without sacrificing quality. Here\'s how:"',
      '"Day 1 vs Day 90. Same site. Same budget. Different approach."',
      '"[X] tons of steel. [Y] days. Zero delays. Here\'s the story:"'
    ],
    postStructure: `[Hook: The transformation or result]

Project: [Name/Type]
Customer: [Company - with permission]
Challenge: [What they faced]

The approach:
• [What was done]
• [Key decisions]
• [Our role]

Results:
• [Metric 1]
• [Metric 2]
• [Timeline]

[Quote from customer]

[Project photo - completion shot]

"Congratulations to the [Customer] team!"`,
    bestPlatforms: [
      { platform: 'LinkedIn', format: 'Carousel (Photo → Challenge → Approach → Results → Quote → CTA)' },
      { platform: 'Facebook', format: 'Photo album with story' },
      { platform: 'Instagram', format: 'Before/after carousel' }
    ],
    exampleTopics: [
      'How [Customer] built a 50,000 sq ft warehouse in 6 weeks',
      '[Customer] on why they\'ve used us for 15 consecutive projects',
      'The hospital expansion that beat schedule by 3 weeks',
      'When the design changed 3 weeks before erection - how [Customer] adapted'
    ],
    whatToAvoid: [
      'Making it about you instead of the customer',
      'Sharing without explicit permission',
      'Missing specific metrics and results',
      'Forgetting to tag and credit the customer'
    ],
    productRequirement: 'required',
    imageRequirement: 'optional'
  },
  {
    id: 'testimonials',
    category: 'customer_success',
    categoryPercentage: 10,
    subType: 'testimonials',
    title: 'Testimonials',
    description: 'Customer reviews and feedback with context and credibility.',
    hookFormulas: [
      '"[Customer] was skeptical about [solution]. Then they saw the results:"',
      '"In their own words: Why [Customer] switched to us."',
      '"\'[Strong quote from customer]\' - Here\'s the story behind it:"',
      '"We asked [Customer] for honest feedback. They said:"'
    ],
    postStructure: `[Strong quote in quotation marks]

— [Name], [Title], [Company]

The backstory:
[2-3 sentences on context]

What changed:
• [Before state]
• [After state]
• [Key metric]

[Photo of customer or project]

"Thank you, [Name], for trusting us with [project type]."`,
    bestPlatforms: [
      { platform: 'LinkedIn', format: 'Quote card + backstory' },
      { platform: 'Instagram', format: 'Testimonial quote graphic' },
      { platform: 'Facebook', format: 'Video testimonial (1-2 min)' }
    ],
    exampleTopics: [
      'Why [Customer] calls us first for every project',
      'The feedback that made us rethink our delivery process',
      'From skeptic to advocate: [Customer]\'s experience',
      '5 years, 50 projects: [Customer] shares their perspective'
    ],
    whatToAvoid: [
      'Fake or exaggerated testimonials',
      'Vague praise without specifics',
      'Missing context or backstory',
      'Not getting written permission'
    ],
    productRequirement: 'recommended',
    imageRequirement: 'optional'
  },
  {
    id: 'challenges_solved',
    category: 'customer_success',
    categoryPercentage: 10,
    subType: 'challenges_solved',
    title: 'Challenges Solved',
    description: 'How NDS products resolved specific customer issues.',
    hookFormulas: [
      '"The problem: [X]. The solution: Not what you\'d expect."',
      '"[Customer] tried [X] solutions before finding what worked:"',
      '"This challenge would have cost [Customer] $[amount]. Here\'s how we helped:"',
      '"When [unexpected problem] happened, [Customer] needed answers fast:"'
    ],
    postStructure: `[Hook: The challenge]

The situation:
[What the customer was facing - 2-3 sentences]

What didn't work:
• [Previous attempt 1]
• [Previous attempt 2]

The solution:
[What we provided and why it worked]

Result:
• [Outcome 1]
• [Outcome 2]
• [Customer quote]

"Facing a similar challenge? Let's talk."`,
    bestPlatforms: [
      { platform: 'LinkedIn', format: 'Problem-solution narrative' },
      { platform: 'Facebook', format: 'Storytelling post' }
    ],
    exampleTopics: [
      'When the spec changed mid-project: How we pivoted in 48 hours',
      'The delivery nightmare we turned into a same-day solution',
      'Custom fabrication request that seemed impossible - until it wasn\'t',
      'How we helped [Customer] meet an impossible deadline'
    ],
    whatToAvoid: [
      'Overselling your role',
      'Making problems sound too easy',
      'Missing the customer\'s perspective',
      'Not showing the human side of challenges'
    ],
    productRequirement: 'recommended',
    imageRequirement: 'optional'
  },
  {
    id: 'before_after',
    category: 'customer_success',
    categoryPercentage: 10,
    subType: 'before_after',
    title: 'Before/After',
    description: 'Visual comparisons of projects showing transformation.',
    hookFormulas: [
      '"Before: [Problem]. After: [Solution]. [Timeframe]."',
      '"[X] weeks. [Y] tons of steel. The transformation:"',
      '"What [effort/investment] looks like when it\'s done right:"',
      '"Same site. Same budget. Different result."'
    ],
    postStructure: `[Side-by-side or swipe images]

Before: [State/Problem - 1 sentence]
After: [State/Result - 1 sentence]

The project:
• Location: [Where]
• Timeline: [How long]
• Scope: [Key metrics]

What made the difference:
[2-3 sentences on approach]

[Customer quote if available]

"Swipe to see the transformation →"`,
    bestPlatforms: [
      { platform: 'Instagram', format: 'Swipe carousel or Reels' },
      { platform: 'LinkedIn', format: 'Side-by-side image post' },
      { platform: 'Facebook', format: 'Photo comparison album' }
    ],
    exampleTopics: [
      'Parking garage renovation: Before the reinforcement upgrade',
      'Foundation repair: From cracked to solid in 2 weeks',
      'Warehouse expansion: Empty lot to finished structure',
      'Bridge deck rehabilitation: The transformation'
    ],
    whatToAvoid: [
      'Poor quality photos',
      'Missing the "during" story',
      'No context on timeline or scope',
      'Forgetting to show the human effort involved'
    ],
    productRequirement: 'required',
    imageRequirement: 'required'
  },
  {
    id: 'client_interviews',
    category: 'customer_success',
    categoryPercentage: 10,
    subType: 'client_interviews',
    title: 'Client Interviews',
    description: 'Q&A sessions with satisfied customers sharing their experience.',
    hookFormulas: [
      '"We sat down with [Customer] to talk about [topic]. Here\'s what they said:"',
      '"3 questions with [Customer]: Lessons from [project]."',
      '"[Customer] shares what they look for in a steel supplier:"',
      '"Behind the project: A conversation with [Customer]."'
    ],
    postStructure: `[Introduction: Who and context]

Q: [Question 1]
A: "[Customer answer]"

Q: [Question 2]
A: "[Customer answer]"

Q: [Question 3]
A: "[Customer answer]"

[Closing insight or summary]

Thank you to [Customer] for sharing their perspective!

[Photo of customer or their project]`,
    bestPlatforms: [
      { platform: 'LinkedIn', format: 'Text Q&A or video interview' },
      { platform: 'YouTube', format: 'Full interview video (5-10 min)' },
      { platform: 'Instagram', format: 'Reels with interview clips' }
    ],
    exampleTopics: [
      '5 minutes with [Customer]: Their approach to supplier relationships',
      '[Customer] on what they wish more suppliers understood',
      'Project Manager insights: Coordination lessons from [project]',
      'The GC perspective: What matters beyond price'
    ],
    whatToAvoid: [
      'Scripted or fake-sounding answers',
      'Only asking softball questions',
      'Missing follow-up on interesting points',
      'Not preparing questions in advance'
    ],
    productRequirement: 'recommended',
    imageRequirement: 'optional'
  }
];

// ============================================
// CATEGORY 5: COMPANY UPDATES (10%)
// ============================================

const companyUpdatesTemplates: ContentTemplate[] = [
  {
    id: 'team_highlights',
    category: 'company_updates',
    categoryPercentage: 10,
    subType: 'team_highlights',
    title: 'Team Highlights',
    description: 'Introducing NDS staff and experts to humanize the brand.',
    hookFormulas: [
      '"Meet [Name], who [specific achievement]."',
      '"[X] years ago, [Name] started in [role]. Today..."',
      '"The person behind your orders: [Name]\'s story."',
      '"Why [Name] chose steel (and stayed for [X] years):"'
    ],
    postStructure: `[Hook: Introduction with specific detail]

Meet [Name]:
• Role: [What they do]
• Years with us: [Tenure]
• Fun fact: [Personal detail]

In their words:
"[Quote about their work or the industry]"

What they're known for:
[2-3 sentences on their contribution]

[Photo - candid or at work]

"Say hi in the comments! [Name] will respond."`,
    bestPlatforms: [
      { platform: 'LinkedIn', format: 'Employee spotlight with photo' },
      { platform: 'Instagram', format: 'Stories takeover or Reels' },
      { platform: 'Facebook', format: 'Team member feature' }
    ],
    exampleTopics: [
      'Meet our warehouse lead: 15 years of morning shifts',
      'The driver who knows every jobsite in [City]',
      'From intern to estimator: [Name]\'s journey',
      'Multi-generational steel: Father and son on our team'
    ],
    whatToAvoid: [
      'Corporate headshots without personality',
      'Generic descriptions that could be anyone',
      'Missing the human story',
      'Not getting employee permission'
    ],
    productRequirement: 'optional',
    imageRequirement: 'optional'
  },
  {
    id: 'company_news',
    category: 'company_updates',
    categoryPercentage: 10,
    subType: 'company_news',
    title: 'Company News',
    description: 'Developments at Next Day Steel including expansions and improvements.',
    hookFormulas: [
      '"Big news: We\'re [announcement]. Here\'s what it means for you:"',
      '"[X] months in the making. Today we announce:"',
      '"You asked for [improvement]. We delivered:"',
      '"The investment that\'s changing how we serve you:"'
    ],
    postStructure: `[Hook: The announcement]

What's happening:
[2-3 sentences on the news]

Why we did this:
• [Reason 1 - customer benefit]
• [Reason 2 - customer benefit]
• [Reason 3 - customer benefit]

What this means for you:
[Practical implications]

Timeline: [When it takes effect]

"Questions? Drop them below."`,
    bestPlatforms: [
      { platform: 'LinkedIn', format: 'Announcement post with details' },
      { platform: 'Twitter', format: 'Concise announcement with thread' },
      { platform: 'Facebook', format: 'News update with photos' }
    ],
    exampleTopics: [
      'Expanding our warehouse: 50% more inventory capacity',
      'New delivery routes: Now serving [Region]',
      'Technology upgrade: Real-time inventory tracking goes live',
      'Partnership announcement: Teaming up with [Partner]'
    ],
    whatToAvoid: [
      'Internal jargon that customers don\'t care about',
      'Announcements without customer benefit',
      'Missing the "why should I care" angle',
      'Too corporate or press-release style'
    ],
    productRequirement: 'optional',
    imageRequirement: 'optional'
  },
  {
    id: 'behind_the_scenes',
    category: 'company_updates',
    categoryPercentage: 10,
    subType: 'behind_the_scenes',
    title: 'Behind-the-Scenes',
    description: 'Warehouse operations, delivery processes, and daily work.',
    hookFormulas: [
      '"Ever wonder what happens before [delivery/product]?"',
      '"5 AM in our warehouse. Here\'s what you don\'t see:"',
      '"The process behind your [product/service]:"',
      '"[X] steps before [product] reaches your site:"'
    ],
    postStructure: `[Hook: Peek behind the curtain]

What you're seeing:
[Description of the process/moment]

Why it matters:
[How this affects quality/service]

Fun fact:
[Interesting detail about the process]

[Video or photo series - real, not staged]

"Questions about how we [process]? Ask below!"`,
    bestPlatforms: [
      { platform: 'Instagram', format: 'Reels or Stories' },
      { platform: 'TikTok', format: 'Day-in-the-life or process video' },
      { platform: 'LinkedIn', format: 'Video with professional context' }
    ],
    exampleTopics: [
      '5 AM warehouse startup routine',
      'How we cut custom rebar lengths (with zero waste)',
      'The bundle that weighs 2 tons - how we move it',
      'Quality check: What happens before steel leaves our yard'
    ],
    whatToAvoid: [
      'Staged or overly polished content (authentic wins)',
      'Missing safety gear in industrial settings',
      'Boring processes without storytelling',
      'Revealing proprietary or sensitive operations'
    ],
    productRequirement: 'optional',
    imageRequirement: 'optional'
  },
  {
    id: 'corporate_responsibility',
    category: 'company_updates',
    categoryPercentage: 10,
    subType: 'corporate_responsibility',
    title: 'Corporate Responsibility',
    description: 'Sustainability initiatives, community involvement, and values.',
    hookFormulas: [
      '"[X]% of our steel is recycled. Here\'s why that matters:"',
      '"The community project our team volunteered for:"',
      '"Sustainability isn\'t a buzzword. Here\'s what we\'re actually doing:"',
      '"This year, we [initiative]. The impact:"'
    ],
    postStructure: `[Hook: The initiative or impact]

What we did:
[Description of initiative]

The numbers:
• [Metric 1]
• [Metric 2]
• [Metric 3]

Why this matters:
[Connection to broader impact]

What's next:
[Future plans]

[Photo of team or initiative]

"Want to get involved? [CTA]"`,
    bestPlatforms: [
      { platform: 'LinkedIn', format: 'Impact story with metrics' },
      { platform: 'Instagram', format: 'Community photo series' },
      { platform: 'Facebook', format: 'Community engagement post' }
    ],
    exampleTopics: [
      'Our recycling program: 1M pounds diverted from landfills',
      'Building homes: Our partnership with Habitat for Humanity',
      'Reducing emissions: Our fleet upgrade to cleaner trucks',
      'Supporting trade education: Scholarship program announcement'
    ],
    whatToAvoid: [
      'Greenwashing or exaggerated claims',
      'One-time events positioned as ongoing programs',
      'Missing specific numbers and impact',
      'Self-congratulatory tone'
    ],
    productRequirement: 'none',
    imageRequirement: 'optional'
  },
  {
    id: 'milestones_achievements',
    category: 'company_updates',
    categoryPercentage: 10,
    subType: 'milestones_achievements',
    title: 'Milestones & Achievements',
    description: 'Company anniversaries, awards, and recognition.',
    hookFormulas: [
      '"[Number] [years/projects]. Here\'s what it took."',
      '"We just received [Award]. Thank you."',
      '"[X] years ago, we [started/launched]. Today:"',
      '"The milestone we never expected to reach:"'
    ],
    postStructure: `[Hook: The achievement]

The milestone: [What was achieved]

How we got here:
• [Key moment 1]
• [Key moment 2]
• [Key moment 3]

Thank you to:
[Acknowledge team, customers, partners]

What this means:
[Reflection or future commitment]

[Celebration photo or timeline graphic]

"Here's to the next [X]. Thank you for being part of our journey."`,
    bestPlatforms: [
      { platform: 'LinkedIn', format: 'Milestone announcement' },
      { platform: 'Instagram', format: 'Timeline carousel' },
      { platform: 'Facebook', format: 'Anniversary celebration' }
    ],
    exampleTopics: [
      '25 years in steel: Lessons from a quarter century',
      'Safety milestone: 1,000 days without incident',
      'Award: Best Steel Supplier - [Region]',
      '10,000th delivery: A look back at our journey'
    ],
    whatToAvoid: [
      'Bragging without gratitude',
      'Forgetting to thank customers and team',
      'Vague milestones without context',
      'Missing the human story behind numbers'
    ],
    productRequirement: 'optional',
    imageRequirement: 'optional'
  }
];

// ============================================
// CATEGORY 6: ENGAGEMENT CONTENT (10%)
// ============================================

const engagementTemplates: ContentTemplate[] = [
  {
    id: 'questions_polls',
    category: 'engagement',
    categoryPercentage: 10,
    subType: 'questions_polls',
    title: 'Questions & Polls',
    description: 'Engaging the community in discussion through polls and questions.',
    hookFormulas: [
      '"[Industry debate topic]: Where do you stand?"',
      '"What\'s your [preference/method] for [common task]?"',
      '"Hot take: [controversial opinion]. Agree or disagree?"',
      '"Quick poll: How do you handle [situation]?"'
    ],
    postStructure: `[Hook: The question or debate]

Context:
[Why this matters - 1-2 sentences]

The options:
🅰️ [Option A]
🅱️ [Option B]
🅲️ [Option C]
🅳️ [Option D]

My take: [Your position - optional]

"Vote and share your reasoning in the comments!"`,
    bestPlatforms: [
      { platform: 'LinkedIn', format: 'Native poll (6-12% engagement rate)' },
      { platform: 'Twitter', format: 'Poll with discussion prompt' },
      { platform: 'Instagram', format: 'Stories poll sticker' }
    ],
    exampleTopics: [
      'Galvanized vs. painted for outdoor applications: Your preference?',
      'What\'s your biggest challenge with steel deliveries?',
      'Tie wire vs. rebar clips: What does your crew prefer?',
      'Early morning delivery or afternoon? What works better for your site?'
    ],
    whatToAvoid: [
      'Engagement bait without substance',
      'Controversial topics that alienate',
      'Polls more than twice per month (LinkedIn algorithm)',
      'Not following up on poll results'
    ],
    productRequirement: 'none',
    imageRequirement: 'none'
  },
  {
    id: 'quizzes',
    category: 'engagement',
    categoryPercentage: 10,
    subType: 'quizzes',
    title: 'Quizzes',
    description: 'Testing construction and steel knowledge in a fun format.',
    hookFormulas: [
      '"Can you identify this? [Image]"',
      '"Quiz time: What\'s wrong with this installation?"',
      '"Only [X]% of contractors get this right:"',
      '"Test your steel knowledge: 5 quick questions."'
    ],
    postStructure: `[Hook: The challenge]

[Image or question]

Options:
A) [Choice]
B) [Choice]
C) [Choice]
D) [Choice]

Hint: [Optional clue]

Answer reveal: [Tomorrow / in comments / swipe]

"Drop your guess below! 👇"`,
    bestPlatforms: [
      { platform: 'Instagram', format: 'Quiz sticker or carousel reveal' },
      { platform: 'LinkedIn', format: 'Image-based quiz post' },
      { platform: 'Facebook', format: 'Comment to reveal answer' }
    ],
    exampleTopics: [
      'Identify this beam profile (image quiz)',
      'Spot the code violation in this photo',
      'What grade of steel is this? (Hint: Look at the markings)',
      'Name that connection: Structural steel quiz'
    ],
    whatToAvoid: [
      'Questions too easy or too hard',
      'Missing the answer reveal',
      'Not engaging with guesses in comments',
      'Obscure topics that only experts know'
    ],
    productRequirement: 'none',
    imageRequirement: 'optional'
  },
  {
    id: 'industry_challenges',
    category: 'engagement',
    categoryPercentage: 10,
    subType: 'industry_challenges',
    title: 'Industry Challenges',
    description: 'Addressing common problems and inviting solutions.',
    hookFormulas: [
      '"The challenge every [job role] faces: [Problem]. How do you handle it?"',
      '"This problem costs the industry $[X] annually. What\'s the fix?"',
      '"Unpopular opinion: [Perspective on common challenge]."',
      '"What\'s the hardest part of [task]? Let\'s discuss."'
    ],
    postStructure: `[Hook: The challenge]

The problem:
[2-3 sentences describing the issue]

What we see:
• [Observation 1]
• [Observation 2]
• [Observation 3]

One approach that works:
[Your suggestion]

"What's worked for you? Share in the comments."`,
    bestPlatforms: [
      { platform: 'LinkedIn', format: 'Discussion prompt' },
      { platform: 'Twitter', format: 'Thread with community input' }
    ],
    exampleTopics: [
      'The scheduling challenge: Coordinating steel delivery with concrete pours',
      'Finding skilled ironworkers: What\'s actually working?',
      'The estimating bottleneck: How to quote faster without errors',
      'Weather delays: How do you protect steel on site?'
    ],
    whatToAvoid: [
      'Complaining without offering solutions',
      'Blaming customers or partners',
      'Challenges too niche to resonate',
      'Not engaging with community responses'
    ],
    productRequirement: 'none',
    imageRequirement: 'none'
  },
  {
    id: 'tips_tricks',
    category: 'engagement',
    categoryPercentage: 10,
    subType: 'tips_tricks',
    title: 'Tips & Tricks',
    description: 'Quick advice for contractors and construction professionals.',
    hookFormulas: [
      '"One tip that saved us [time/money/problems]:"',
      '"The [X]-second trick for [common task]:"',
      '"Nobody taught me this in school: [Tip]."',
      '"Quick tip: [Actionable advice]."'
    ],
    postStructure: `[Hook: The benefit]

The tip:
[One clear, actionable piece of advice]

Why it works:
[1-2 sentences explaining the logic]

Example:
[Quick real-world application]

Bonus tip:
[Related advice - optional]

"What's your best tip for [related topic]?"`,
    bestPlatforms: [
      { platform: 'LinkedIn', format: 'Short text post' },
      { platform: 'Instagram', format: 'Quick tip Reels (15-30 sec)' },
      { platform: 'Twitter', format: 'Concise tip tweet' }
    ],
    exampleTopics: [
      'Steel rusting in storage? Check your stacking first.',
      'The marker color that inspectors actually notice',
      'Quick splice length estimation: The thumb rule that works',
      'How to read bar markings without a cheat sheet'
    ],
    whatToAvoid: [
      'Tips too obvious to be helpful',
      'Unsafe shortcuts',
      'Tips that require expensive tools',
      'Too many tips in one post (keep it focused)'
    ],
    productRequirement: 'none',
    imageRequirement: 'optional'
  },
  {
    id: 'faq_responses',
    category: 'engagement',
    categoryPercentage: 10,
    subType: 'faq_responses',
    title: 'FAQ Responses',
    description: 'Answering common customer questions publicly.',
    hookFormulas: [
      '"The question we get asked most: [Question]"',
      '"You asked: [Question]. Here\'s our answer:"',
      '"FAQ Friday: [Topic]"',
      '"\'Why can\'t you just [common request]?\' Here\'s why:"'
    ],
    postStructure: `[Hook: The question]

The question:
"[Actual question from customers]"

Short answer:
[1-2 sentences]

Full explanation:
[Detailed response with context]

What this means for you:
[Practical takeaway]

"Have a question? Drop it below for next week's FAQ!"`,
    bestPlatforms: [
      { platform: 'LinkedIn', format: 'FAQ post or series' },
      { platform: 'Instagram', format: 'Stories Q&A or FAQ highlight' },
      { platform: 'Facebook', format: 'FAQ post with comments' }
    ],
    exampleTopics: [
      'Why do lead times vary? (The honest answer)',
      'Can you cut to custom lengths? Here\'s what\'s possible.',
      'Why do prices change weekly? Market dynamics explained.',
      'What\'s the difference between mill cert and test report?'
    ],
    whatToAvoid: [
      'Dismissive or defensive answers',
      'Jargon that doesn\'t answer the question',
      'Avoiding difficult questions',
      'Not inviting follow-up questions'
    ],
    productRequirement: 'none',
    imageRequirement: 'none'
  }
];

// ============================================
// COMPILED CATEGORIES WITH FULL DATA
// ============================================

export const contentCategories: ContentCategory[] = [
  {
    id: 'product_showcase',
    name: 'Product Showcases',
    percentage: 25,
    description: 'Technical product details, applications, comparisons, and benefit highlights.',
    weeklyTarget: 5, // 25% of ~20 posts/week
    bestPractices: [
      'Show benefits, not just specs - focus on pain points solved',
      'Humanize with real people (engineers, installers, customers)',
      '80/20 rule - only 20% promotional, 80% valuable content',
      'Video-first is mandatory for 2026 engagement'
    ],
    templates: productShowcaseTemplates
  },
  {
    id: 'educational',
    name: 'Educational Content',
    percentage: 30,
    description: 'Best practices, standards, guides, material science, and safety protocols.',
    weeklyTarget: 6, // 30% of ~20 posts/week
    bestPractices: [
      'Carousels dominate - 596% more engagement than text-only',
      'One idea per slide/section - don\'t overload',
      'Specificity wins - concrete details get 3-4x reach',
      'Educate before you sell'
    ],
    templates: educationalTemplates
  },
  {
    id: 'industry_insights',
    name: 'Industry Insights',
    percentage: 15,
    description: 'Market trends, case studies, research findings, events, and regulations.',
    weeklyTarget: 3, // 15% of ~20 posts/week
    bestPractices: [
      'Lead with human expertise, not corporate voice',
      'Authenticity over production value - lo-fi gets 2x comments',
      'Framework-driven content wins - memorable mental models',
      'Answer Engine Optimization (AEO) - structure for AI discovery'
    ],
    templates: industryInsightsTemplates
  },
  {
    id: 'customer_success',
    name: 'Customer Success',
    percentage: 10,
    description: 'Project spotlights, testimonials, challenges solved, and client interviews.',
    weeklyTarget: 2, // 10% of ~20 posts/week
    bestPractices: [
      'Make the customer the hero, not your company',
      'Show, don\'t tell - visual proof beats claims',
      'Quantify everything - specific metrics are 3x more believable',
      '93% of B2B buyers consider testimonials important'
    ],
    templates: customerSuccessTemplates
  },
  {
    id: 'company_updates',
    name: 'Company Updates',
    percentage: 10,
    description: 'Team highlights, news, behind-the-scenes, and milestones.',
    weeklyTarget: 2, // 10% of ~20 posts/week
    bestPractices: [
      'Authenticity is #1 employer branding trend for 2026',
      'Employee advocacy outperforms brand posts',
      '86% of job seekers research company culture',
      'Real warehouse lighting beats staged photoshoots'
    ],
    templates: companyUpdatesTemplates
  },
  {
    id: 'engagement',
    name: 'Engagement Content',
    percentage: 10,
    description: 'Questions, polls, quizzes, tips, and FAQ responses.',
    weeklyTarget: 2, // 10% of ~20 posts/week
    bestPractices: [
      'LinkedIn polls achieve 6-12% engagement (highest of any format)',
      'Use polls sparingly - about twice a month',
      'Comments carry 8x more weight than likes in algorithm',
      'Engagement bait is detected and down-ranked'
    ],
    templates: engagementTemplates
  }
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get all templates flat
 */
export function getAllTemplates(): ContentTemplate[] {
  return contentCategories.flatMap(cat => cat.templates);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(categoryId: string): ContentTemplate[] {
  const category = contentCategories.find(c => c.id === categoryId);
  return category?.templates ?? [];
}

/**
 * Get a specific template by ID
 */
export function getTemplateById(templateId: string): ContentTemplate | undefined {
  return getAllTemplates().find(t => t.id === templateId);
}

/**
 * Calculate weekly balance based on posts
 */
export function calculateWeeklyBalance(posts: { category: string }[]): Record<string, { current: number; target: number; percentage: number }> {
  const balance: Record<string, { current: number; target: number; percentage: number }> = {};

  for (const category of contentCategories) {
    const current = posts.filter(p => p.category === category.id).length;
    balance[category.id] = {
      current,
      target: category.weeklyTarget,
      percentage: category.weeklyTarget > 0 ? Math.round((current / category.weeklyTarget) * 100) : 0
    };
  }

  return balance;
}

/**
 * Suggest next post category based on current balance
 * Returns the most underserved category
 */
export function suggestNextCategory(posts: { category: string }[]): ContentCategory {
  const balance = calculateWeeklyBalance(posts);

  let lowestPercentage = Infinity;
  let suggestedCategory = contentCategories[0];

  for (const category of contentCategories) {
    const categoryBalance = balance[category.id];
    if (categoryBalance.percentage < lowestPercentage) {
      lowestPercentage = categoryBalance.percentage;
      suggestedCategory = category;
    }
  }

  return suggestedCategory;
}

/**
 * Get a random template from a category
 */
export function getRandomTemplate(categoryId: string): ContentTemplate | undefined {
  const templates = getTemplatesByCategory(categoryId);
  if (templates.length === 0) return undefined;
  return templates[Math.floor(Math.random() * templates.length)];
}
