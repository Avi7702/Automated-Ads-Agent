import React, { useState, useEffect } from 'react';

const FindStructuralEngineerUK = () => {
  // NextDaySteel Logo Component (SVG-based, always works)
  const NextDaySteelLogo = ({ height = 32, variant = 'light' }) => (
    <svg height={height} viewBox="0 0 280 50" fill="none" xmlns="http://www.w3.org/2000/svg">
      <text x="0" y="32" fontFamily="Arial Black, Arial, sans-serif" fontWeight="900" fontSize="28">
        <tspan fill={variant === 'light' ? '#000' : '#fff'}>NEXT</tspan>
        <tspan fill="#ed8936">DAY</tspan>
        <tspan fill={variant === 'light' ? '#000' : '#fff'}>STEEL</tspan>
      </text>
      {/* Smile curve under DAY with arrow pointing to STEEL */}
      <path d="M72 38 Q110 48 148 38" stroke="#ed8936" strokeWidth="3" fill="none" strokeLinecap="round"/>
      {/* Arrowhead pointing toward S */}
      <path d="M143 42 L148 38 L144 33" stroke="#ed8936" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  // Inject Schema.org structured data on mount
  useEffect(() => {
    const schemaData = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebPage",
          "@id": "https://nextdaysteel.co.uk/find-structural-engineer",
          "name": "Find a Structural Engineer UK",
          "description": "Complete guide to finding qualified structural engineers in the UK. Includes costs, what to check, questions to ask, and links to official bodies like IStructE and ICE.",
          "publisher": {
            "@type": "Organization",
            "name": "NextDaySteel",
            "url": "https://nextdaysteel.co.uk",
            "logo": {
              "@type": "ImageObject",
              "url": "https://nextdaysteel.co.uk/logo.png"
            }
          },
          "datePublished": "2025-11-01",
          "dateModified": "2025-11-29",
          "inLanguage": "en-GB",
          "isPartOf": {
            "@type": "WebSite",
            "name": "NextDaySteel",
            "url": "https://nextdaysteel.co.uk"
          }
        },
        {
          "@type": "FAQPage",
          "mainEntity": [
            {
              "@type": "Question",
              "name": "Have you worked on similar projects before?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Experience with your specific project type means fewer surprises and more accurate designs. IStructE recommends checking an engineer's portfolio for similar completed projects."
              }
            },
            {
              "@type": "Question",
              "name": "What's included in your fee?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Understand if site visits, revisions, and Building Control liaison are included or extra."
              }
            },
            {
              "@type": "Question",
              "name": "How long will the calculations take?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Simple jobs: 1-2 weeks. Complex projects: 3-6 weeks. Factor this into your project timeline."
              }
            },
            {
              "@type": "Question",
              "name": "Will you provide drawings for Building Control?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Most projects need formal drawings for approval. Check these are included."
              }
            },
            {
              "@type": "Question",
              "name": "Do you offer site visits?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Some projects require a site visit. Check if this is included in the quote."
              }
            },
            {
              "@type": "Question",
              "name": "What happens if I need revisions?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Understand revision policies before changes are needed. Some include a number of revisions."
              }
            },
            {
              "@type": "Question",
              "name": "When do I need a structural engineer in the UK?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "You need a structural engineer for: removing load-bearing walls, building extensions, loft conversions, new builds or self-builds, garages/outbuildings over certain sizes, foundation design, structural alterations, and commercial projects. Per Building Regulations Approved Document A (Structure), all structural work requires appropriate calculations."
              }
            },
            {
              "@type": "Question",
              "name": "How much does a structural engineer cost in the UK in 2025?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Typical UK structural engineer costs in 2025 (based on IStructE and ICE industry data): Simple beam calculation £300-£600, Garage/shed base design £400-£800, Loft conversion £500-£1,200, Single storey extension £800-£1,500, Two storey extension £1,200-£2,500, New build house £2,000-£5,000+, Complex/commercial £3,000-£10,000+. London and Southeast prices are typically 20-30% higher."
              }
            },
            {
              "@type": "Question",
              "name": "Do I need a structural engineer to remove a load-bearing wall?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Yes, absolutely. Removing a load-bearing wall without proper calculations is dangerous and illegal without Building Control approval. You'll need structural calculations for RSJ/steel beam sizing, padstone and bearing calculations, temporary support specification, and Building Control application drawings. Typical cost: £300-£600, timeline: 1-2 weeks."
              }
            },
            {
              "@type": "Question",
              "name": "Do I need a structural engineer for a loft conversion?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Yes. Loft conversions typically need floor joist strengthening calculations, steel beam design (ridge beam, purlins), dormer structural design if applicable, staircase opening trimmer calculations, and Party Wall considerations for terraced or semi-detached houses. Typical cost: £500-£1,200, timeline: 2-3 weeks."
              }
            },
            {
              "@type": "Question",
              "name": "Do I need a structural engineer for a house extension?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Yes. Extensions require foundation design (often with soil investigation), structural frame or masonry calculations, roof beam/lintel specifications, connection details to existing structure, and Building Regs structural drawings. Typical cost: £800-£2,500 depending on size, timeline: 2-4 weeks."
              }
            },
            {
              "@type": "Question",
              "name": "Do I need a structural engineer for a new build?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Yes. New builds require complete structural design including site investigation and soil report, foundation design (strip, raft, or piled), complete structural frame design, roof structure calculations, retaining walls if on a sloped site, and a full Building Regs structural package. Typical cost: £2,000-£5,000+, timeline: 4-8 weeks."
              }
            },
            {
              "@type": "Question",
              "name": "Do I need a structural engineer for a garage?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "For larger garages and outbuildings (typically over 30m²), yes. You'll need foundation slab design with reinforcement, structural frame calculations, roof truss or beam calculations, and lintel design over door openings. Typical cost: £400-£800, timeline: 1-2 weeks. Garage slabs typically need A142 or A193 mesh reinforcement."
              }
            }
          ]
        },
        {
          "@type": "HowTo",
          "name": "How to Hire a Structural Engineer in the UK",
          "description": "Step-by-step process for hiring a structural engineer for your construction project",
          "step": [
            {
              "@type": "HowToStep",
              "position": 1,
              "name": "Initial Consultation",
              "text": "Discuss your project requirements and get initial advice from the structural engineer."
            },
            {
              "@type": "HowToStep",
              "position": 2,
              "name": "Site Visit",
              "text": "Engineer assesses the property (if required for your project)."
            },
            {
              "@type": "HowToStep",
              "position": 3,
              "name": "Design and Calculations",
              "text": "Structural analysis and engineering calculations are performed."
            },
            {
              "@type": "HowToStep",
              "position": 4,
              "name": "Drawings and Specification",
              "text": "Detailed drawings and material specifications are produced."
            },
            {
              "@type": "HowToStep",
              "position": 5,
              "name": "Building Control Submission",
              "text": "Submit plans for Building Control approval (often handled by engineer)."
            },
            {
              "@type": "HowToStep",
              "position": 6,
              "name": "Site Inspections",
              "text": "Engineer checks work during construction (if required)."
            }
          ]
        },
        {
          "@type": "Service",
          "serviceType": "Structural Engineering",
          "provider": {
            "@type": "ProfessionalService",
            "name": "UK Structural Engineers"
          },
          "areaServed": {
            "@type": "Country",
            "name": "United Kingdom"
          },
          "hasOfferCatalog": {
            "@type": "OfferCatalog",
            "name": "Structural Engineering Services",
            "itemListElement": [
              {
                "@type": "Offer",
                "itemOffered": {
                  "@type": "Service",
                  "name": "Simple beam calculation"
                },
                "priceSpecification": {
                  "@type": "PriceSpecification",
                  "priceCurrency": "GBP",
                  "minPrice": 300,
                  "maxPrice": 600
                }
              },
              {
                "@type": "Offer",
                "itemOffered": {
                  "@type": "Service",
                  "name": "Garage/shed base design"
                },
                "priceSpecification": {
                  "@type": "PriceSpecification",
                  "priceCurrency": "GBP",
                  "minPrice": 400,
                  "maxPrice": 800
                }
              },
              {
                "@type": "Offer",
                "itemOffered": {
                  "@type": "Service",
                  "name": "Loft conversion structural calculations"
                },
                "priceSpecification": {
                  "@type": "PriceSpecification",
                  "priceCurrency": "GBP",
                  "minPrice": 500,
                  "maxPrice": 1200
                }
              },
              {
                "@type": "Offer",
                "itemOffered": {
                  "@type": "Service",
                  "name": "Single storey extension"
                },
                "priceSpecification": {
                  "@type": "PriceSpecification",
                  "priceCurrency": "GBP",
                  "minPrice": 800,
                  "maxPrice": 1500
                }
              },
              {
                "@type": "Offer",
                "itemOffered": {
                  "@type": "Service",
                  "name": "Two storey extension"
                },
                "priceSpecification": {
                  "@type": "PriceSpecification",
                  "priceCurrency": "GBP",
                  "minPrice": 1200,
                  "maxPrice": 2500
                }
              },
              {
                "@type": "Offer",
                "itemOffered": {
                  "@type": "Service",
                  "name": "New build house structural design"
                },
                "priceSpecification": {
                  "@type": "PriceSpecification",
                  "priceCurrency": "GBP",
                  "minPrice": 2000,
                  "maxPrice": 5000
                }
              },
              {
                "@type": "Offer",
                "itemOffered": {
                  "@type": "Service",
                  "name": "Complex/commercial structural engineering"
                },
                "priceSpecification": {
                  "@type": "PriceSpecification",
                  "priceCurrency": "GBP",
                  "minPrice": 3000,
                  "maxPrice": 10000
                }
              }
            ]
          }
        },
        {
          "@type": "BreadcrumbList",
          "itemListElement": [
            {
              "@type": "ListItem",
              "position": 1,
              "name": "Home",
              "item": "https://nextdaysteel.co.uk"
            },
            {
              "@type": "ListItem",
              "position": 2,
              "name": "Resources",
              "item": "https://nextdaysteel.co.uk/resources"
            },
            {
              "@type": "ListItem",
              "position": 3,
              "name": "Find a Structural Engineer UK",
              "item": "https://nextdaysteel.co.uk/find-structural-engineer"
            }
          ]
        }
      ]
    };

    // Check if script already exists
    const existingScript = document.getElementById('schema-structured-data');
    if (existingScript) {
      existingScript.remove();
    }

    // Create and inject the script
    const script = document.createElement('script');
    script.id = 'schema-structured-data';
    script.type = 'application/ld+json';
    script.text = JSON.stringify(schemaData);
    document.head.appendChild(script);

    // Cleanup on unmount
    return () => {
      const scriptToRemove = document.getElementById('schema-structured-data');
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, []);
  const [checkedItems, setCheckedItems] = useState({});
  const [expandedQuestions, setExpandedQuestions] = useState({});
  const [expandedSections, setExpandedSections] = useState({
    whenNeeded: true,
    howToFind: true,
    costs: true,
    checkBefore: true,
    questions: true,
    process: true
  });

  const toggleCheck = (id) => {
    setCheckedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleQuestion = (id) => {
    setExpandedQuestions(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const needsEngineer = [
    { 
      id: 'walls', 
      label: 'Removing load-bearing walls',
      icon: '🧱',
      response: {
        title: 'Load-Bearing Wall Removal',
        urgency: 'essential',
        description: 'Removing a load-bearing wall without proper calculations is extremely dangerous and illegal without Building Control approval.',
        whatYouNeed: [
          'Structural calculations for RSJ/steel beam sizing',
          'Padstone and bearing calculations',
          'Temporary support (Acrow props) specification',
          'Building Control application drawings'
        ],
        typicalCost: '£300 - £600',
        timeline: '1-2 weeks for calculations',
        tip: 'Your builder will need the beam specification before ordering steel. NextDaySteel can supply RSJs and steel beams with next-day delivery once specified.'
      }
    },
    { 
      id: 'extension', 
      label: 'Building an extension',
      icon: '🏗️',
      response: {
        title: 'House Extension',
        urgency: 'essential',
        description: 'Extensions require structural design for foundations, walls, roof, and connection to existing building.',
        whatYouNeed: [
          'Foundation design (often requires soil investigation)',
          'Structural frame or masonry calculations',
          'Roof beam/lintel specifications',
          'Connection details to existing structure',
          'Building Regs structural drawings'
        ],
        typicalCost: '£800 - £2,500 depending on size',
        timeline: '2-4 weeks',
        tip: 'Get your engineer involved early - changes after Building Control submission cause delays. Steel reinforcement for foundations available from NextDaySteel.'
      }
    },
    { 
      id: 'loft', 
      label: 'Loft conversion',
      icon: '🏠',
      response: {
        title: 'Loft Conversion',
        urgency: 'essential',
        description: 'Loft conversions typically need floor strengthening, roof alterations, and often a steel ridge beam.',
        whatYouNeed: [
          'Floor joist strengthening calculations',
          'Steel beam design (ridge beam, purlins)',
          'Dormer structural design (if applicable)',
          'Staircase opening trimmer calculations',
          'Party Wall considerations (terraced/semi-detached)'
        ],
        typicalCost: '£500 - £1,200',
        timeline: '2-3 weeks',
        tip: 'If you share a wall with neighbours, you may need a Party Wall Agreement. Your engineer can advise on this.'
      }
    },
    { 
      id: 'newbuild', 
      label: 'New build or self-build',
      icon: '🏡',
      response: {
        title: 'New Build / Self-Build',
        urgency: 'essential',
        description: 'New builds require complete structural design from foundations up. This is comprehensive work.',
        whatYouNeed: [
          'Site investigation and soil report',
          'Foundation design (strip, raft, or piled)',
          'Complete structural frame design',
          'Roof structure calculations',
          'Retaining walls (if sloped site)',
          'Full Building Regs structural package'
        ],
        typicalCost: '£2,000 - £5,000+',
        timeline: '4-8 weeks',
        tip: 'Consider getting structural and architectural design coordinated. Many engineers work alongside architects for new builds.'
      }
    },
    { 
      id: 'garage', 
      label: 'Garage/outbuilding over certain size',
      icon: '🚗',
      response: {
        title: 'Garage or Outbuilding',
        urgency: 'recommended',
        description: 'Larger garages and outbuildings (typically over 30m²) need structural design, especially for the roof and foundations.',
        whatYouNeed: [
          'Foundation slab design with reinforcement',
          'Structural frame (steel or timber)',
          'Roof truss or beam calculations',
          'Lintel design over door openings'
        ],
        typicalCost: '£400 - £800',
        timeline: '1-2 weeks',
        tip: 'Garage slabs typically need A142 or A193 mesh reinforcement. Check with your engineer for specification, then order from NextDaySteel.'
      }
    },
    { 
      id: 'foundation', 
      label: 'Foundation design',
      icon: '⚙️',
      response: {
        title: 'Foundation Design',
        urgency: 'essential',
        description: 'Foundation design depends heavily on ground conditions. Poor foundations cause cracking, subsidence, and structural failure.',
        whatYouNeed: [
          'Site/soil investigation (may need trial pits)',
          'Foundation type selection (strip, trench fill, raft, piles)',
          'Reinforcement specification',
          'Depth and width calculations',
          'Ground beam design (if applicable)'
        ],
        typicalCost: '£400 - £1,500 depending on complexity',
        timeline: '1-3 weeks (plus soil investigation time)',
        tip: 'Clay soils, trees nearby, and previous mining can all affect foundation design. Be upfront with your engineer about site history.'
      }
    },
    { 
      id: 'alterations', 
      label: 'Structural alterations',
      icon: '🔨',
      response: {
        title: 'Structural Alterations',
        urgency: 'likely',
        description: 'Any changes to the building\'s structure - removing walls, adding openings, changing roof - typically need engineering input.',
        whatYouNeed: [
          'Assessment of existing structure',
          'Calculations for new loads/openings',
          'Beam/lintel specifications',
          'Connection details',
          'Building Control drawings (if required)'
        ],
        typicalCost: '£300 - £1,000 depending on scope',
        timeline: '1-3 weeks',
        tip: 'Even "small" alterations like adding a window in a load-bearing wall need calculations. It\'s cheaper to get it right first time.'
      }
    },
    { 
      id: 'commercial', 
      label: 'Commercial projects',
      icon: '🏢',
      response: {
        title: 'Commercial Projects',
        urgency: 'essential',
        description: 'Commercial buildings have stricter requirements, higher loads, and more complex approval processes.',
        whatYouNeed: [
          'Full structural design package',
          'Fire engineering considerations',
          'Higher load calculations (plant, storage, occupancy)',
          'Coordination with M&E engineers',
          'Building Control + potentially Approved Inspector'
        ],
        typicalCost: '£3,000 - £10,000+',
        timeline: '4-12 weeks depending on complexity',
        tip: 'Commercial projects often need a chartered engineer (CEng) with Professional Indemnity Insurance of £1m+. Always verify credentials.'
      }
    }
  ];

  const officialBodies = [
    { name: 'Institution of Structural Engineers (IStructE)', url: 'https://www.istructe.org/find-an-engineer/', desc: 'Find chartered structural engineers' },
    { name: 'Institution of Civil Engineers (ICE)', url: 'https://www.ice.org.uk/my-ice/membership-documents/find-a-member', desc: 'Search ICE members' }
  ];

  const platforms = [
    { name: 'Checkatrade', url: 'https://www.checkatrade.com/trades/structural-engineers', desc: 'Vetted local engineers' },
    { name: 'MyBuilder', url: 'https://www.mybuilder.com/services/structural-engineer', desc: 'Compare quotes' },
    { name: 'Bark', url: 'https://www.bark.com/en/gb/structural-engineers/', desc: 'Request quotes from engineers' }
  ];

  const costs = [
    { service: 'Simple beam calculation', cost: '£300 - £600' },
    { service: 'Garage/shed base design', cost: '£400 - £800' },
    { service: 'Loft conversion', cost: '£500 - £1,200' },
    { service: 'Extension (single storey)', cost: '£800 - £1,500' },
    { service: 'Extension (two storey)', cost: '£1,200 - £2,500' },
    { service: 'New build house', cost: '£2,000 - £5,000+' },
    { service: 'Complex/commercial', cost: '£3,000 - £10,000+' }
  ];

  const checksBefore = [
    { id: 'chartered', label: 'Chartered status (CEng, MIStructE, or MICE)', desc: 'Ensures they meet professional standards' },
    { id: 'insurance', label: 'Professional Indemnity Insurance', desc: 'Protects you if something goes wrong' },
    { id: 'experience', label: 'Experience with similar projects', desc: 'Ask for examples of similar work' },
    { id: 'quote', label: 'Clear written quote with scope', desc: 'Know exactly what you\'re paying for' },
    { id: 'timeline', label: 'Timeline for delivery', desc: 'When will you receive the calculations?' },
    { id: 'building', label: 'Will they liaise with Building Control?', desc: 'Can save you time and hassle' }
  ];

  const questions = [
    { id: 'q1', q: 'Have you worked on similar projects before?', a: 'Experience with your specific project type means fewer surprises and more accurate designs.' },
    { id: 'q2', q: 'What\'s included in your fee?', a: 'Understand if site visits, revisions, and Building Control liaison are included or extra.' },
    { id: 'q3', q: 'How long will the calculations take?', a: 'Simple jobs: 1-2 weeks. Complex projects: 3-6 weeks. Factor this into your project timeline.' },
    { id: 'q4', q: 'Will you provide drawings for Building Control?', a: 'Most projects need formal drawings for approval. Check these are included.' },
    { id: 'q5', q: 'Do you offer site visits?', a: 'Some projects require a site visit. Check if this is included in the quote.' },
    { id: 'q6', q: 'What happens if I need revisions?', a: 'Understand revision policies before changes are needed. Some include a number of revisions.' }
  ];

  const processSteps = [
    { step: 1, title: 'Initial Consultation', desc: 'Discuss your project requirements and get initial advice' },
    { step: 2, title: 'Site Visit', desc: 'Engineer assesses the property (if required)' },
    { step: 3, title: 'Design & Calculations', desc: 'Structural analysis and engineering calculations' },
    { step: 4, title: 'Drawings & Specification', desc: 'Detailed drawings and material specifications produced', hasCta: true },
    { step: 5, title: 'Building Control Submission', desc: 'Submit for approval (often handled by engineer)' },
    { step: 6, title: 'Site Inspections', desc: 'Check work during construction (if required)' }
  ];

  const anyChecked = Object.values(checkedItems).some(v => v);
  const checkedCount = Object.values(checkedItems).filter(v => v).length;
  const selectedProjects = needsEngineer.filter(item => checkedItems[item.id]);

  const SectionHeader = ({ title, section, icon }) => (
    <button
      onClick={() => toggleSection(section)}
      className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 rounded-lg transition-all duration-300 group"
      aria-expanded={expandedSections[section]}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <h2 className="text-xl font-bold text-white">{title}</h2>
      </div>
      <svg
        className={`w-6 h-6 text-orange-400 transition-transform duration-300 ${expandedSections[section] ? 'rotate-180' : ''}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Hidden meta content for crawlers/AI that don't execute JS */}
      <div className="sr-only" aria-hidden="true">
        <h1>Find a Structural Engineer UK - Complete Guide 2025</h1>
        <p>Published by NextDaySteel UK. Last updated: November 2025.</p>
        <p>A comprehensive guide to finding qualified structural engineers in the United Kingdom, including typical costs, what qualifications to check, questions to ask, and the hiring process.</p>
        <p>Structural engineer costs UK 2025: Simple beam calculation £300-£600, Loft conversion £500-£1,200, Extension £800-£2,500, New build £2,000-£5,000+.</p>
        <p>Find engineers via: Institution of Structural Engineers (IStructE), Institution of Civil Engineers (ICE), Checkatrade, MyBuilder, Bark.</p>
      </div>

      {/* Header */}
      <header role="banner" className="bg-gradient-to-r from-blue-900 via-slate-800 to-blue-900 py-12 px-4 border-b-4 border-orange-500">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-orange-500 p-3 rounded-full">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
            Find a Structural Engineer UK
          </h1>
          <p className="text-xl text-slate-300 mb-4">
            Your guide to finding qualified structural engineers for construction projects
          </p>
          <p className="text-sm text-slate-400 mb-6 italic">
            "Always verify your structural engineer holds current Professional Indemnity Insurance" — IStructE guidance
          </p>
          <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur px-5 py-3 rounded-full">
            <span className="text-slate-300 text-sm">Powered by</span>
            <a 
              href="https://nextdaysteel.co.uk" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:opacity-80 transition-opacity"
            >
              <NextDaySteelLogo height={32} variant="light" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main role="main" className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <article itemScope itemType="https://schema.org/Article">
          <meta itemProp="headline" content="Find a Structural Engineer UK - Complete Guide 2025" />
          <meta itemProp="author" content="NextDaySteel" />
          <meta itemProp="datePublished" content="2025-11-01" />
          <meta itemProp="dateModified" content="2025-11-29" />
          <meta itemProp="publisher" content="NextDaySteel UK" />
        
        {/* Section 1: When Do You Need One? */}
        <section className="bg-slate-800/50 rounded-xl overflow-hidden shadow-xl">
          <SectionHeader title="When Do You Need One?" section="whenNeeded" icon="🔍" />
          {expandedSections.whenNeeded && (
            <div className="p-6 space-y-4">
              <p className="text-slate-300 mb-4">Tick any that apply to your project:</p>
              <div className="grid md:grid-cols-2 gap-3">
                {needsEngineer.map(item => (
                  <label
                    key={item.id}
                    className={`flex items-center gap-3 p-4 rounded-lg cursor-pointer transition-all duration-200 ${
                      checkedItems[item.id] 
                        ? 'bg-orange-500/20 border-2 border-orange-500' 
                        : 'bg-slate-700/50 border-2 border-transparent hover:bg-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checkedItems[item.id] || false}
                      onChange={() => toggleCheck(item.id)}
                      className="w-5 h-5 rounded accent-orange-500"
                    />
                    <span className="text-xl">{item.icon}</span>
                    <span className="text-white">{item.label}</span>
                  </label>
                ))}
              </div>
              
              {/* Personalised Responses */}
              {anyChecked && (
                <div className="mt-6 space-y-4">
                  {/* Summary Banner */}
                  <div className="p-4 bg-green-500/20 border border-green-500 rounded-lg flex items-start gap-3">
                    <svg className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-green-200 font-semibold">
                        Yes, you need a structural engineer!
                      </p>
                      <p className="text-green-300/80 text-sm mt-1">
                        You've selected {checkedCount} project{checkedCount > 1 ? 's' : ''} that require{checkedCount === 1 ? 's' : ''} professional structural engineering. 
                        {checkedCount > 1 && ' Scroll down for specific guidance on each.'}
                      </p>
                    </div>
                  </div>

                  {/* Individual Project Cards */}
                  <div className="space-y-4">
                    {selectedProjects.map(item => (
                      <div 
                        key={item.id}
                        className="bg-slate-700/40 border border-slate-600 rounded-xl overflow-hidden"
                      >
                        {/* Card Header */}
                        <div className={`p-4 flex items-center justify-between ${
                          item.response.urgency === 'essential' 
                            ? 'bg-red-900/30 border-b border-red-800/50' 
                            : item.response.urgency === 'likely'
                            ? 'bg-yellow-900/30 border-b border-yellow-800/50'
                            : 'bg-blue-900/30 border-b border-blue-800/50'
                        }`}>
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{item.icon}</span>
                            <div>
                              <h4 className="font-bold text-white text-lg">{item.response.title}</h4>
                              <span className={`text-xs font-semibold uppercase tracking-wide ${
                                item.response.urgency === 'essential' 
                                  ? 'text-red-400' 
                                  : item.response.urgency === 'likely'
                                  ? 'text-yellow-400'
                                  : 'text-blue-400'
                              }`}>
                                {item.response.urgency === 'essential' ? '⚠️ Engineer Essential' : 
                                 item.response.urgency === 'likely' ? '📋 Engineer Recommended' : 
                                 '💡 Engineer Advised'}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-orange-400 font-bold">{item.response.typicalCost}</div>
                            <div className="text-slate-400 text-sm">{item.response.timeline}</div>
                          </div>
                        </div>

                        {/* Card Body */}
                        <div className="p-4 space-y-4">
                          <p className="text-slate-300">{item.response.description}</p>
                          
                          {/* What You'll Need */}
                          <div>
                            <h5 className="text-sm font-semibold text-orange-400 mb-2">What you'll need from the engineer:</h5>
                            <ul className="grid md:grid-cols-2 gap-2">
                              {item.response.whatYouNeed.map((need, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                                  <svg className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  {need}
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Pro Tip */}
                          <div className="p-3 bg-blue-900/30 border border-blue-700/50 rounded-lg flex items-start gap-2">
                            <span className="text-blue-400">💡</span>
                            <p className="text-blue-200 text-sm">{item.response.tip}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Combined Cost Estimate */}
                  {checkedCount > 1 && (
                    <div className="p-4 bg-orange-900/20 border border-orange-700 rounded-lg">
                      <h4 className="font-semibold text-orange-400 mb-2">📊 Your Project Summary</h4>
                      <p className="text-slate-300 text-sm">
                        You've selected {checkedCount} items. Some engineers offer package deals for multiple services. 
                        When requesting quotes, describe all your requirements together — you may get a better rate than pricing each separately.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Section 2: How to Find One */}
        <section className="bg-slate-800/50 rounded-xl overflow-hidden shadow-xl">
          <SectionHeader title="How to Find One" section="howToFind" icon="🔗" />
          {expandedSections.howToFind && (
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-orange-400 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                  Official Professional Bodies
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {officialBodies.map((body, i) => (
                    <a
                      key={i}
                      href={body.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-4 bg-blue-900/30 border border-blue-700 rounded-lg hover:bg-blue-900/50 hover:border-blue-500 transition-all duration-200 group"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-white group-hover:text-orange-400 transition-colors">{body.name}</h4>
                          <p className="text-sm text-slate-400 mt-1">{body.desc}</p>
                        </div>
                        <svg className="w-5 h-5 text-slate-500 group-hover:text-orange-400 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </div>
                    </a>
                  ))}
                </div>
              </div>

              {/* Comparison Table */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-orange-400 mb-4">📊 Quick Comparison</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-600">
                        <th className="text-left py-2 px-3 text-slate-300">Source</th>
                        <th className="text-left py-2 px-3 text-slate-300">Best For</th>
                        <th className="text-left py-2 px-3 text-slate-300">Verification</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-400">
                      <tr className="border-b border-slate-700/50">
                        <td className="py-2 px-3 text-white">IStructE</td>
                        <td className="py-2 px-3">Chartered structural engineers</td>
                        <td className="py-2 px-3 text-green-400">Full credentials check</td>
                      </tr>
                      <tr className="border-b border-slate-700/50">
                        <td className="py-2 px-3 text-white">ICE</td>
                        <td className="py-2 px-3">Civil engineers</td>
                        <td className="py-2 px-3 text-green-400">Professional membership</td>
                      </tr>
                      <tr className="border-b border-slate-700/50">
                        <td className="py-2 px-3 text-white">Checkatrade</td>
                        <td className="py-2 px-3">Local quotes with reviews</td>
                        <td className="py-2 px-3 text-yellow-400">Customer reviews</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-slate-500 mt-2 italic">
                  According to IStructE, over 85% of building control rejections relate to inadequate structural calculations.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-orange-400 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Verified Platforms
                </h3>
                <div className="grid md:grid-cols-3 gap-4">
                  {platforms.map((platform, i) => (
                    <a
                      key={i}
                      href={platform.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-4 bg-slate-700/50 border border-slate-600 rounded-lg hover:bg-slate-700 hover:border-orange-500 transition-all duration-200 group"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-white group-hover:text-orange-400 transition-colors">{platform.name}</h4>
                          <p className="text-sm text-slate-400 mt-1">{platform.desc}</p>
                        </div>
                        <svg className="w-5 h-5 text-slate-500 group-hover:text-orange-400 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Section 3: Typical Costs */}
        <section className="bg-slate-800/50 rounded-xl overflow-hidden shadow-xl">
          <SectionHeader title="Typical Costs (2025 UK)" section="costs" icon="💷" />
          {expandedSections.costs && (
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full" role="table" aria-label="Structural engineer costs in the UK 2025">
                  <caption className="sr-only">Typical structural engineer costs in the UK for 2025</caption>
                  <thead>
                    <tr className="border-b border-slate-600">
                      <th scope="col" className="text-left py-3 px-4 text-slate-300 font-semibold">Service</th>
                      <th scope="col" className="text-right py-3 px-4 text-slate-300 font-semibold">Typical Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {costs.map((item, i) => (
                      <tr 
                        key={i} 
                        className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                      >
                        <th scope="row" className="py-4 px-4 text-white text-left font-normal">{item.service}</th>
                        <td className="py-4 px-4 text-right">
                          <span className="inline-block bg-orange-500/20 text-orange-400 px-3 py-1 rounded-full font-semibold">
                            {item.cost}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 p-4 bg-blue-900/30 border border-blue-700 rounded-lg flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-blue-200 text-sm">
                  <strong>Note:</strong> Prices vary by location. London and the Southeast are typically 20-30% higher than other regions.
                </p>
              </div>
              
              {/* Steel pricing CTA */}
              <a 
                href="https://nextdaysteel.co.uk/pages/rebar-prices" 
                target="_blank" 
                rel="noopener noreferrer"
                className="mt-4 block p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg hover:bg-orange-500/20 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-orange-400 group-hover:text-orange-300">💰 Need to price steel reinforcement?</h4>
                    <p className="text-sm text-slate-400 mt-1">View current rebar and mesh prices at NextDaySteel.co.uk</p>
                  </div>
                  <svg className="w-5 h-5 text-orange-400 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </a>
            </div>
          )}
        </section>

        {/* Section 4: What to Check Before Hiring */}
        <section className="bg-slate-800/50 rounded-xl overflow-hidden shadow-xl">
          <SectionHeader title="What to Check Before Hiring" section="checkBefore" icon="✓" />
          {expandedSections.checkBefore && (
            <div className="p-6">
              <div className="space-y-3">
                {checksBefore.map(item => (
                  <div 
                    key={item.id}
                    className="p-4 bg-slate-700/30 rounded-lg border-l-4 border-green-500 hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <svg className="w-6 h-6 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <div>
                        <h4 className="font-semibold text-white">{item.label}</h4>
                        <p className="text-sm text-slate-400 mt-1">{item.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Section 5: Questions to Ask */}
        <section className="bg-slate-800/50 rounded-xl overflow-hidden shadow-xl">
          <SectionHeader title="Questions to Ask" section="questions" icon="❓" />
          {expandedSections.questions && (
            <div className="p-6 space-y-3">
              {questions.map(item => (
                <div key={item.id} className="border border-slate-600 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleQuestion(item.id)}
                    className="w-full flex items-center justify-between p-4 bg-slate-700/50 hover:bg-slate-700 transition-colors text-left"
                    aria-expanded={expandedQuestions[item.id]}
                  >
                    <span className="text-white font-medium pr-4">"{item.q}"</span>
                    <svg
                      className={`w-5 h-5 text-orange-400 flex-shrink-0 transition-transform duration-200 ${expandedQuestions[item.id] ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {expandedQuestions[item.id] && (
                    <div className="p-4 bg-slate-800/50 border-t border-slate-600">
                      <p className="text-slate-300">{item.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section 6: The Process */}
        <section className="bg-slate-800/50 rounded-xl overflow-hidden shadow-xl">
          <SectionHeader title="The Process" section="process" icon="📋" />
          {expandedSections.process && (
            <div className="p-6">
              <div className="relative">
                {processSteps.map((item, i) => (
                  <div key={item.step} className="flex gap-4 mb-6 last:mb-0">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold">
                        {item.step}
                      </div>
                      {i < processSteps.length - 1 && (
                        <div className="w-0.5 h-full bg-orange-500/30 mt-2" />
                      )}
                    </div>
                    <div className="flex-1 pb-6">
                      <h4 className="font-semibold text-white text-lg">{item.title}</h4>
                      <p className="text-slate-400 mt-1">{item.desc}</p>
                      {item.hasCta && (
                        <a 
                          href="https://nextdaysteel.co.uk" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 mt-3 text-sm text-orange-400 hover:text-orange-300 transition-colors"
                        >
                          <span>🔗 Order steel reinforcement from NextDaySteel once specified</span>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
        </article>

        {/* CTA Section */}
        <section className="bg-gradient-to-r from-orange-600 to-orange-500 rounded-xl p-8 text-center shadow-xl">
          <div className="flex justify-center mb-4">
            <NextDaySteelLogo height={48} variant="dark" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">Need Steel Reinforcement?</h3>
          <p className="text-orange-100 mb-6 max-w-2xl mx-auto">
            Once your structural engineer has specified your reinforcement requirements, 
            NextDaySteel can supply rebar, mesh, and all steel reinforcement with next-day delivery across the UK.
          </p>
          <a
            href="https://nextdaysteel.co.uk"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white text-orange-600 px-6 py-3 rounded-lg font-semibold hover:bg-orange-50 transition-colors"
          >
            Visit NextDaySteel.co.uk
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </section>
      </main>

      {/* Footer */}
      <footer role="contentinfo" className="bg-slate-900 border-t border-slate-700 py-8 px-4 mt-8">
        <div className="max-w-4xl mx-auto text-center">
          <a 
            href="https://nextdaysteel.co.uk" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-block mb-4 hover:opacity-80 transition-opacity"
          >
            <NextDaySteelLogo height={40} variant="dark" />
          </a>
          <p className="text-slate-400 mb-4">
            This guide is provided by <a href="https://nextdaysteel.co.uk" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300 transition-colors">NextDaySteel UK</a> — the UK's trusted supplier of steel reinforcement, mesh, and rebar.
          </p>
          <p className="text-slate-500 text-sm">
            <time dateTime="2025-11-29">Last Updated: November 2025</time>
          </p>
          <p className="text-slate-600 text-xs mt-2">
            Sources: <a href="https://www.istructe.org" target="_blank" rel="noopener noreferrer" className="hover:text-slate-500">Institution of Structural Engineers (IStructE)</a>, <a href="https://www.ice.org.uk" target="_blank" rel="noopener noreferrer" className="hover:text-slate-500">Institution of Civil Engineers (ICE)</a>, <a href="https://www.gov.uk/government/publications/structure-approved-document-a" target="_blank" rel="noopener noreferrer" className="hover:text-slate-500">Building Regulations Approved Document A</a>.
          </p>
          <p className="text-slate-600 text-xs mt-2 italic">
            Costs are indicative UK industry averages for 2025. Site-specific requirements vary—always obtain quotes from qualified structural engineers.
          </p>
        </div>
      </footer>

      {/* Print Styles */}
      <style>{`
        @media print {
          body { background: white !important; }
          .bg-gradient-to-br, .bg-slate-800\\/50, .bg-slate-700\\/50, .bg-slate-700\\/30 { 
            background: white !important; 
            border: 1px solid #ccc !important;
          }
          .text-white, .text-slate-300, .text-slate-400, .text-orange-400 { 
            color: #333 !important; 
          }
          button svg { display: none; }
          a { color: #1a365d !important; text-decoration: underline; }
        }
      `}</style>
    </div>
  );
};

export default FindStructuralEngineerUK;
